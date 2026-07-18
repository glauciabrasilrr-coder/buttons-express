import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductIllustration, {
  type ProductIllustrationType,
} from '../components/ProductIllustration';
import { supabasePublic } from '../lib/supabase';
import {
  PRODUCTS,
  formatarMoeda,
  type ProductId,
} from '../data/products';

type ItemPedido = {
  id: ProductId;
  title: string;
  illustration: ProductIllustrationType;
  categoria: string;
  preco: number;
  quantidade: number;
};

type FotoSlot = {
  id: string;
  fileName: string;
  previewUrl: string | null;
  storagePath: string | null;
  editado: boolean;
  carregando?: boolean;
};

type GrupoFoto = {
  id: string;
  title: string;
  quantidade: number;
  illustration: ProductIllustrationType;
  usarMesmaFoto: boolean;
  fotos: FotoSlot[];
};

type LocationState = {
  itens?: ItemPedido[];
  gruposFotos?: GrupoFoto[];
  totalItens?: number;
  totalFotos?: number;
};

type ConfiguracaoFotos = Record<string, boolean>;

type FotoPersistida = {
  id: string;
  fileName: string;
  storagePath: string;
  editado: boolean;
};

type FotosPersistidas = Record<string, FotoPersistida>;

const PEDIDO_STORAGE_KEY = 'buttons-express-pedido';
const CONFIG_STORAGE_KEY = 'buttons-express-fotos-config';
const FOTOS_STORAGE_KEY = 'buttons-express-fotos-supabase';
const BUCKET_FOTOS = 'fotos-pedidos';
const URL_ASSINADA_SEGUNDOS = 60 * 60 * 24 * 7;

function lerPedidoSalvo(): ItemPedido[] {
  try {
    const salvo = localStorage.getItem(PEDIDO_STORAGE_KEY);

    if (!salvo) {
      return [];
    }

    const dados = JSON.parse(salvo);

    if (!Array.isArray(dados)) {
      return [];
    }

    return dados
      .map((item) => {
        const produto = PRODUCTS.find(
          (produtoAtual) => produtoAtual.id === item.id,
        );

        if (!produto) {
          return null;
        }

        return {
          ...item,
          title: produto.title,
          illustration: produto.illustration,
          categoria: produto.categoria,
          preco: produto.preco,
        };
      })
      .filter((item): item is ItemPedido => item !== null);
  } catch {
    return [];
  }
}

function lerConfiguracaoFotos(): ConfiguracaoFotos {
  try {
    const salvo = localStorage.getItem(CONFIG_STORAGE_KEY);

    if (!salvo) {
      return {};
    }

    const dados = JSON.parse(salvo);

    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}

function lerFotosPersistidas(): FotosPersistidas {
  try {
    const salvo = localStorage.getItem(FOTOS_STORAGE_KEY);

    if (!salvo) {
      return {};
    }

    const dados = JSON.parse(salvo);

    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}

async function criarUrlAssinada(caminho: string): Promise<string> {
  const { data, error } = await supabasePublic.storage
    .from(BUCKET_FOTOS)
    .createSignedUrl(caminho, URL_ASSINADA_SEGUNDOS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Não foi possível gerar a visualização da foto.');
  }

  return data.signedUrl;
}

function criarGruposBase(
  itens: ItemPedido[],
  configuracao: ConfiguracaoFotos,
): GrupoFoto[] {
  return itens.map((item) => ({
    id: item.id,
    title: item.title,
    quantidade: item.quantidade,
    illustration: item.illustration,
    usarMesmaFoto: configuracao[item.id] ?? false,
    fotos: Array.from(
      { length: item.quantidade },
      (_, index) => ({
        id: `${item.id}-${index + 1}`,
        fileName: '',
        previewUrl: null,
        storagePath: null,
        editado: false,
        carregando: true,
      }),
    ),
  }));
}

function Resumo() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;

  const [confirmado, setConfirmado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const itensPedido = useMemo(() => {
    if (state?.itens && state.itens.length > 0) {
      return state.itens;
    }

    return lerPedidoSalvo();
  }, [state]);

  const [gruposFotos, setGruposFotos] = useState<GrupoFoto[]>(() => {
    if (state?.gruposFotos && state.gruposFotos.length > 0) {
      return state.gruposFotos;
    }

    return criarGruposBase(
      itensPedido,
      lerConfiguracaoFotos(),
    );
  });

  useEffect(() => {
    let cancelado = false;

    const carregarFotos = async () => {
      setCarregando(true);

      const configuracao = lerConfiguracaoFotos();
      const fotosPersistidas = lerFotosPersistidas();

      const gruposBase =
        state?.gruposFotos && state.gruposFotos.length > 0
          ? state.gruposFotos
          : criarGruposBase(
              itensPedido,
              configuracao,
            );

      const gruposCarregados = await Promise.all(
        gruposBase.map(async (grupo) => ({
          ...grupo,
          usarMesmaFoto:
            configuracao[grupo.id] ??
            grupo.usarMesmaFoto ??
            false,

          fotos: await Promise.all(
            grupo.fotos.map(async (foto) => {
              const persistida = fotosPersistidas[foto.id];
              const storagePath =
                foto.storagePath ??
                persistida?.storagePath ??
                null;

              const fileName =
                foto.fileName ||
                persistida?.fileName ||
                '';

              const editado =
                foto.editado ??
                persistida?.editado ??
                false;

              if (!storagePath) {
                return {
                  ...foto,
                  fileName,
                  storagePath: null,
                  previewUrl: null,
                  editado,
                  carregando: false,
                };
              }

              try {
                const previewUrl =
                  await criarUrlAssinada(storagePath);

                return {
                  ...foto,
                  fileName,
                  storagePath,
                  previewUrl,
                  editado,
                  carregando: false,
                };
              } catch (erro) {
                console.error(
                  'Erro ao carregar foto do Storage:',
                  erro,
                );

                return {
                  ...foto,
                  fileName,
                  storagePath,
                  previewUrl: null,
                  editado,
                  carregando: false,
                };
              }
            }),
          ),
        })),
      );

      if (!cancelado) {
        setGruposFotos(gruposCarregados);
        setCarregando(false);
      }
    };

    void carregarFotos();

    return () => {
      cancelado = true;
    };
  }, [itensPedido, state]);

  const totalUnidades = useMemo(
    () =>
      itensPedido.reduce(
        (total, item) =>
          total + item.quantidade,
        0,
      ),
    [itensPedido],
  );

  const totalPedido = useMemo(
    () =>
      itensPedido.reduce(
        (total, item) =>
          total + item.preco * item.quantidade,
        0,
      ),
    [itensPedido],
  );

  const totalFotosEsperadas = useMemo(
    () =>
      gruposFotos.reduce(
        (total, grupo) =>
          total + grupo.fotos.length,
        0,
      ),
    [gruposFotos],
  );

  const totalFotosEnviadas = useMemo(
    () =>
      gruposFotos.reduce(
        (total, grupo) =>
          total +
          grupo.fotos.filter(
            (foto) => foto.storagePath,
          ).length,
        0,
      ),
    [gruposFotos],
  );

  const pedidoCompleto =
    totalFotosEsperadas > 0 &&
    totalFotosEnviadas === totalFotosEsperadas;

  const finalizarPedido = () => {
    if (
      !confirmado ||
      !pedidoCompleto ||
      carregando
    ) {
      return;
    }

    navigate('/pagamento', {
      state: {
        itens: itensPedido,
        gruposFotos,
        totalItens: totalUnidades,
        totalFotos: totalFotosEnviadas,
        totalPedido,
      },
    });
  };

  if (itensPedido.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-[#E9DDCC] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto w-16">
          <ProductIllustration productType="order" />
        </div>

        <h1 className="mt-4 text-xl font-bold text-[#4A2A12]">
          Seu pedido está vazio
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#7B5A3A]">
          Volte para a página de produtos e escolha os
          itens que deseja personalizar.
        </p>

        <button
          type="button"
          onClick={() => navigate('/produtos')}
          className="mt-6 h-12 w-full rounded-full bg-[#8F5528] font-bold text-white"
        >
          ESCOLHER PRODUTOS
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-1 pb-28 sm:px-4 lg:pb-8">
      <header className="mb-5 rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-5 shadow-[0_12px_28px_rgba(107,62,20,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#8A5A2B]">
              <span className="h-2 w-2 rounded-full bg-[#E7A29A]" />
              RESUMO
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#4A2A12] sm:text-3xl">
              Confira seu pedido
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B5A3A]">
              Confira os produtos, as quantidades e as
              fotos antes de finalizar.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white bg-white/80 px-3 py-2 text-center shadow-sm">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#B59677]">
              Itens
            </div>

            <div className="mt-1 text-lg font-bold text-[#5B3518]">
              {totalUnidades}
            </div>
          </div>
        </div>
      </header>

      {carregando ? (
        <div className="rounded-[26px] border border-[#E9DDCC] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#E9DDCC] border-t-[#8F5528]" />

          <p className="mt-4 font-bold text-[#4A2A12]">
            Carregando seu pedido...
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <main className="space-y-3">
            {gruposFotos.map((grupo) => {
              const fotosEnviadas =
                grupo.fotos.filter(
                  (foto) => foto.storagePath,
                );

              const completo =
                fotosEnviadas.length ===
                grupo.fotos.length;

              return (
                <section
                  key={grupo.id}
                  className={`rounded-[22px] border bg-white p-3 shadow-[0_7px_18px_rgba(107,62,20,0.05)] ${
                    completo
                      ? 'border-[#D7EBD9]'
                      : 'border-[#E9DDCC]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 shrink-0">
                      <ProductIllustration
                        productType={grupo.illustration}
                        alt={grupo.title}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-bold text-[#4A2A12] sm:text-base">
                            {grupo.title}
                          </h2>

                          <p className="mt-0.5 text-xs text-[#9A8067]">
                            {grupo.quantidade}{' '}
                            {grupo.quantidade === 1
                              ? 'unidade'
                              : 'unidades'}
                          </p>

                          {(() => {
                            const item = itensPedido.find(
                              (itemAtual) =>
                                itemAtual.id === grupo.id,
                            );

                            if (!item) {
                              return null;
                            }

                            return (
                              <div className="mt-1 text-xs leading-5 text-[#7B5A3A]">
                                <div>
                                  {grupo.quantidade} ×{' '}
                                  {formatarMoeda(item.preco)}
                                </div>

                                <div className="font-extrabold text-[#8F5528]">
                                  Subtotal:{' '}
                                  {formatarMoeda(
                                    item.preco *
                                      grupo.quantidade,
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            completo
                              ? 'bg-[#EEF9F0] text-[#2F7A3E]'
                              : 'bg-[#FFF4E8] text-[#8A5A2B]'
                          }`}
                        >
                          {completo
                            ? '✓ Completo'
                            : 'Fotos pendentes'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#7B5A3A]">
                          Fotos
                        </span>

                        <span className="rounded-full bg-[#FFF4E8] px-2 py-0.5 text-[10px] font-bold text-[#8A5A2B]">
                          {fotosEnviadas.length}/
                          {grupo.fotos.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {grupo.fotos.map(
                      (foto, index) => (
                        <div
                          key={foto.id}
                          className="h-12 w-12 overflow-hidden rounded-[12px] border border-[#E9DDCC] bg-[#FFF8F0] sm:h-14 sm:w-14"
                        >
                          {foto.previewUrl ? (
                            <img
                              src={foto.previewUrl}
                              alt={
                                foto.fileName ||
                                `${grupo.title} — Foto ${
                                  index + 1
                                }`
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#B59677]">
                              {index + 1}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>

                  {grupo.usarMesmaFoto &&
                    grupo.quantidade > 1 && (
                      <div className="mt-2 inline-flex rounded-full bg-[#FFF4E8] px-2.5 py-1 text-[10px] font-semibold text-[#8A5A2B]">
                        Mesma foto em todas as unidades
                      </div>
                    )}
                </section>
              );
            })}
          </main>

          <aside>
            <div className="sticky top-5 space-y-3">
              <section className="rounded-[22px] border border-[#D7EBD9] bg-[#F7FFF8] p-4 shadow-[0_8px_20px_rgba(47,122,62,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4F5E7] text-xl font-bold text-[#2F7A3E]">
                    ✓
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#2F7A3E]">
                      Envio de fotos concluído
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-[#53785B]">
                      Todas as fotos necessárias foram enviadas.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-[#E0B16B] bg-[#FFF3DF] p-3 shadow-[0_8px_18px_rgba(185,120,34,0.08)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 shrink-0">
                    <ProductIllustration productType="payment" />
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#8A4E10]">
                      Pagamento obrigatório
                    </h2>

                    <p className="mt-1 text-[11px] font-semibold leading-5 text-[#7B5A3A]">
                      Apresente este pedido no caixa.
                      A produção inicia somente após a
                      confirmação do pagamento.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-[#E9DDCC] bg-[linear-gradient(145deg,#FFFDF9,#FDF3E7)] p-4 shadow-[0_10px_24px_rgba(107,62,20,0.06)]">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#B59677]">
                  Seu pedido
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5">
                    <span className="text-xs text-[#7B5A3A]">
                      Produtos
                    </span>

                    <strong className="text-sm text-[#4A2A12]">
                      {itensPedido.length}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5">
                    <span className="text-xs text-[#7B5A3A]">
                      Unidades
                    </span>

                    <strong className="text-sm text-[#4A2A12]">
                      {totalUnidades}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5">
                    <span className="text-xs text-[#7B5A3A]">
                      Fotos
                    </span>

                    <strong className="text-sm text-[#4A2A12]">
                      {totalFotosEnviadas}/
                      {totalFotosEsperadas}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5">
                    <span className="text-xs text-[#7B5A3A]">
                      Status
                    </span>

                    <strong className="text-xs font-bold text-[#C97920]">
                      ● Aguardando pagamento
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5">
                    <span className="text-xs text-[#7B5A3A]">
                      Pagamento
                    </span>

                    <strong className="text-xs font-bold text-[#A3483E]">
                      Pendente
                    </strong>
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border-2 border-[#8F5528] bg-white p-4 text-center shadow-[0_10px_24px_rgba(107,62,20,0.08)]">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B59677]">
                  Total do pedido
                </div>

                <div className="mt-1 text-3xl font-extrabold text-[#6B3E14]">
                  {formatarMoeda(totalPedido)}
                </div>
              </section>

              <section className="rounded-[20px] border border-[#E9DDCC] bg-white p-3 shadow-[0_8px_20px_rgba(107,62,20,0.05)]">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#F0E1CF] bg-[#FFFDF9] p-3">
                  <input
                    type="checkbox"
                    checked={confirmado}
                    disabled={!pedidoCompleto}
                    onChange={() =>
                      setConfirmado(
                        (valorAtual) =>
                          !valorAtual,
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#8F5528]"
                  />

                  <span className="text-xs leading-5 text-[#5B3518]">
                    Confirmo que conferi os produtos, as
                    quantidades e as fotos do meu
                    pedido.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/fotos', {
                      state: {
                        itens: itensPedido,
                        totalItens: totalUnidades,
                      },
                    })
                  }
                  className="mt-3 h-10 w-full rounded-full border border-[#8F5528] bg-white text-xs font-bold text-[#6B3E14]"
                >
                  VOLTAR PARA AS FOTOS
                </button>

                <button
                  type="button"
                  disabled={
                    !confirmado ||
                    !pedidoCompleto
                  }
                  onClick={finalizarPedido}
                  className={`mt-2 h-11 w-full rounded-full text-xs font-bold ${
                    confirmado &&
                    pedidoCompleto
                      ? 'bg-[#8F5528] text-white shadow-[0_8px_18px_rgba(107,62,20,0.16)]'
                      : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
                  }`}
                >
                  CONTINUAR PARA O PAGAMENTO
                </button>
              </section>
            </div>
          </aside>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8D8C5] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(107,62,20,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#8A5A2B]">
              Total
            </span>

            <span className="text-lg font-extrabold text-[#6B3E14]">
              {formatarMoeda(totalPedido)}
            </span>
          </div>

          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate('/fotos', {
                state: {
                  itens: itensPedido,
                  totalItens: totalUnidades,
                },
              })
            }
            className="h-12 shrink-0 rounded-full border border-[#E9DDCC] bg-white px-4 text-sm font-bold text-[#6B3E14]"
          >
            VOLTAR
          </button>

          <button
            type="button"
            disabled={
              carregando ||
              !confirmado ||
              !pedidoCompleto
            }
            onClick={finalizarPedido}
            className={`h-12 min-w-0 flex-1 rounded-full px-4 text-sm font-bold ${
              !carregando &&
              confirmado &&
              pedidoCompleto
                ? 'bg-[#8F5528] text-white'
                : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
            }`}
          >
            CONTINUAR
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Resumo;