import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductIllustration, {
  type ProductIllustrationType,
} from '../components/ProductIllustration';
import {
  listarPedidos,
  salvarPedido,
  type FormaPagamento,
} from '../services/pedidos';
import {
  PRODUCTS,
  formatarMoeda,
  type ProductId,
} from '../data/products';
import {
  criarCobrancaPix,
  consultarStatusPagamento,
} from '../services/pagamentos';

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
  totalPedido?: number;
};

type FotoPedidoSalva = {
  id: string;
  fileName: string;
  storagePath: string;
  editado: boolean;
};

type GrupoFotoSalvo = {
  id: string;
  title: string;
  quantidade: number;
  illustration: ProductIllustrationType;
  usarMesmaFoto: boolean;
  fotos: FotoPedidoSalva[];
};

const PEDIDO_STORAGE_KEY = 'buttons-express-pedido';
const CONFIG_STORAGE_KEY = 'buttons-express-fotos-config';
const FOTOS_STORAGE_KEY = 'buttons-express-fotos-supabase';
const RASCUNHO_STORAGE_KEY = 'buttons-express-rascunho-id';
const STORAGE_ANTIGO_KEY = 'buttons-express-fotos';

type FotoPersistida = {
  id: string;
  fileName: string;
  storagePath: string;
  editado: boolean;
};

type FotosPersistidas = Record<string, FotoPersistida>;

type ConfiguracaoFotos = Record<string, boolean>;

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

function lerFotosPersistidas(): FotosPersistidas {
  try {
    const salvo = localStorage.getItem(FOTOS_STORAGE_KEY);

    if (!salvo) {
      return {};
    }

    const dados = JSON.parse(salvo);

    return dados && typeof dados === 'object'
      ? dados
      : {};
  } catch {
    return {};
  }
}

function lerConfiguracaoFotos(): ConfiguracaoFotos {
  try {
    const salvo = localStorage.getItem(CONFIG_STORAGE_KEY);

    if (!salvo) {
      return {};
    }

    const dados = JSON.parse(salvo);

    return dados && typeof dados === 'object'
      ? dados
      : {};
  } catch {
    return {};
  }
}

function limparDadosDoPedidoAtual(): void {
  localStorage.removeItem(PEDIDO_STORAGE_KEY);
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  localStorage.removeItem(FOTOS_STORAGE_KEY);
  localStorage.removeItem(RASCUNHO_STORAGE_KEY);
  localStorage.removeItem(STORAGE_ANTIGO_KEY);
}

function montarGruposComCaminhos(
  gruposRecebidos: GrupoFoto[],
  itens: ItemPedido[],
): GrupoFoto[] {
  const fotosPersistidas = lerFotosPersistidas();
  const configuracao = lerConfiguracaoFotos();

  const gruposBase =
    gruposRecebidos.length > 0
      ? gruposRecebidos
      : itens.map((item) => ({
          id: item.id,
          title: item.title,
          quantidade: item.quantidade,
          illustration: item.illustration,
          usarMesmaFoto:
            configuracao[item.id] ?? false,
          fotos: Array.from(
            { length: item.quantidade },
            (_, index) => ({
              id: `${item.id}-${index + 1}`,
              fileName: '',
              previewUrl: null,
              storagePath: null,
              editado: false,
              carregando: false,
            }),
          ),
        }));

  return gruposBase.map((grupo) => ({
    ...grupo,
    usarMesmaFoto:
      configuracao[grupo.id] ??
      grupo.usarMesmaFoto ??
      false,
    fotos: grupo.fotos.map((foto) => {
      const persistida = fotosPersistidas[foto.id];

      return {
        ...foto,
        fileName:
          foto.fileName ||
          persistida?.fileName ||
          '',
        storagePath:
          foto.storagePath ??
          persistida?.storagePath ??
          null,
        editado:
          foto.editado ??
          persistida?.editado ??
          false,
        carregando: false,
      };
    }),
  }));
}

function prepararGruposParaSalvar(
  grupos: GrupoFoto[],
): GrupoFotoSalvo[] {
  return grupos.map((grupo) => ({
    id: grupo.id,
    title: grupo.title,
    quantidade: grupo.quantidade,
    illustration: grupo.illustration,
    usarMesmaFoto: grupo.usarMesmaFoto,
    fotos: grupo.fotos
      .filter((foto) => Boolean(foto.storagePath))
      .map((foto) => ({
        id: foto.id,
        fileName: foto.fileName,
        storagePath: foto.storagePath as string,
        editado: foto.editado,
      })),
  }));
}

function gerarCodigoPedido(
  codigosExistentes: string[],
): string {
  const maiorNumero = codigosExistentes.reduce(
    (maior, codigo) => {
      const numero = Number(
        codigo.replace(/[^0-9]/g, ''),
      );

      if (!Number.isFinite(numero)) {
        return maior;
      }

      return Math.max(maior, numero);
    },
    0,
  );

  return `BB-${String(maiorNumero + 1).padStart(4, '0')}`;
}

const formasPagamento: {
  id: FormaPagamento;
  titulo: string;
  descricao: string;
  simbolo: string;
}[] = [
  {
    id: 'pix',
    titulo: 'Pix',
    descricao:
      'Faça o pagamento pelo QR Code disponível no caixa.',
    simbolo: '◆',
  },
  {
    id: 'credito',
    titulo: 'Cartão de crédito',
    descricao:
      'Pagamento realizado na maquininha do caixa.',
    simbolo: '▣',
  },
  {
    id: 'debito',
    titulo: 'Cartão de débito',
    descricao:
      'Pagamento realizado na maquininha do caixa.',
    simbolo: '▤',
  },
  {
    id: 'dinheiro',
    titulo: 'Dinheiro',
    descricao:
      'Faça o pagamento diretamente no caixa.',
    simbolo: 'R$',
  },
];

function Pagamento() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;

  const [formaSelecionada, setFormaSelecionada] =
    useState<FormaPagamento | null>(null);

  const [salvandoPedido, setSalvandoPedido] =
    useState(false);

  const [aguardandoPix, setAguardandoPix] =
    useState(false);

  const [pixInfo, setPixInfo] = useState<{
    paymentId: number;
    qrCode: string | null;
    qrCodeBase64: string | null;
  } | null>(null);

  const [pixPedido, setPixPedido] = useState<{
    codigo: string;
    id: string;
  } | null>(null);

  const [erroPix, setErroPix] = useState<
    string | null
  >(null);

  const [codigoPixCopiado, setCodigoPixCopiado] =
    useState(false);

  const itensPedido = useMemo(() => {
    if (state?.itens && state.itens.length > 0) {
      return state.itens;
    }

    return lerPedidoSalvo();
  }, [state]);

  const gruposFotos = useMemo(
    () =>
      montarGruposComCaminhos(
        state?.gruposFotos ?? [],
        itensPedido,
      ),
    [itensPedido, state],
  );

  const totalUnidades = useMemo(
    () =>
      state?.totalItens ??
      itensPedido.reduce(
        (total, item) =>
          total + item.quantidade,
        0,
      ),
    [itensPedido, state],
  );

  const totalFotos = gruposFotos.reduce(
    (total, grupo) =>
      total +
      grupo.fotos.filter(
        (foto) => Boolean(foto.storagePath),
      ).length,
    0,
  );

  const totalFotosEsperadas = gruposFotos.reduce(
    (total, grupo) =>
      total + grupo.fotos.length,
    0,
  );

  const totalPedido = useMemo(
    () =>
      state?.totalPedido ??
      itensPedido.reduce(
        (total, item) =>
          total + item.preco * item.quantidade,
        0,
      ),
    [itensPedido, state],
  );

  const confirmarPagamento = async () => {
    if (!formaSelecionada || salvandoPedido) {
      return;
    }

    if (
      totalFotosEsperadas === 0 ||
      totalFotos !== totalFotosEsperadas
    ) {
      window.alert(
        'As fotos deste pedido não foram salvas corretamente. Volte para a tela de fotos e envie novamente antes de finalizar.',
      );

      navigate('/fotos', {
        state: {
          itens: itensPedido,
          totalItens: totalUnidades,
        },
      });

      return;
    }

    setErroPix(null);
    setSalvandoPedido(true);

    try {
      const pedidosExistentes =
        await listarPedidos();

      const codigoPedido = gerarCodigoPedido(
        pedidosExistentes.map(
          (pedido) => pedido.codigo,
        ),
      );

      const gruposPreparados =
        prepararGruposParaSalvar(gruposFotos);

      const pedidoSalvo = await salvarPedido({
        codigo: codigoPedido,
        status: 'aguardando-pagamento',
        forma_pagamento: formaSelecionada,
        status_pagamento:
          'aguardando-confirmacao',
        total_produtos: itensPedido.length,
        total_itens: totalUnidades,
        total_fotos: totalFotos,
        dados: {
          itens: itensPedido,
          gruposFotos: gruposPreparados,
          totalPedido,
        },
      });

      // Pix: gera a cobrança automática e fica nesta mesma tela
      // aguardando o pagamento cair sozinho (sem navegar ainda).
      if (formaSelecionada === 'pix') {
        try {
          const cobranca = await criarCobrancaPix(
            pedidoSalvo.codigo,
            totalPedido,
          );

          setPixPedido({
            codigo: pedidoSalvo.codigo,
            id: pedidoSalvo.id,
          });

          setPixInfo({
            paymentId: cobranca.paymentId,
            qrCode: cobranca.pix?.qrCode ?? null,
            qrCodeBase64:
              cobranca.pix?.qrCodeBase64 ?? null,
          });

          setAguardandoPix(true);
        } catch (erroPixCobranca) {
          console.error(
            'Erro ao gerar cobrança Pix:',
            erroPixCobranca,
          );

          setErroPix(
            'Não foi possível gerar o Pix agora. O pedido já foi registrado — você pode tentar novamente ou pagar no caixa.',
          );
        }

        setSalvandoPedido(false);
        return;
      }

      // Cartão de crédito/débito e dinheiro seguem como antes:
      // pagamento é feito no caixa e confirmado manualmente.
      limparDadosDoPedidoAtual();

      navigate('/obrigado', {
        state: {
          itens: itensPedido,
          gruposFotos,
          totalItens: totalUnidades,
          totalFotos,
          totalPedido,
          formaPagamento: formaSelecionada,
          statusPagamento:
            'aguardando-confirmacao',
          codigoPedido:
            pedidoSalvo.codigo,
          pedidoId: pedidoSalvo.id,
          statusPedido:
            pedidoSalvo.status,
        },
      });
    } catch (erro) {
      console.error(
        'Erro ao registrar pedido:',
        erro,
      );

      window.alert(
        'Não foi possível registrar o pedido no sistema. Verifique a conexão com a internet e tente novamente.',
      );

      setSalvandoPedido(false);
    }
  };

  // Fica perguntando ao servidor, a cada poucos segundos, se o Pix
  // já caiu. Quando aprovado, segue o mesmo caminho de sempre pra
  // tela de "Obrigado" — só que já confirmado, sem ninguém clicar em nada.
  useEffect(() => {
    if (!aguardandoPix || !pixInfo?.paymentId) {
      return;
    }

    const intervalo = window.setInterval(async () => {
      try {
        const status = await consultarStatusPagamento(
          pixInfo.paymentId,
        );

        if (status === 'approved') {
          window.clearInterval(intervalo);
          limparDadosDoPedidoAtual();

          navigate('/obrigado', {
            state: {
              itens: itensPedido,
              gruposFotos,
              totalItens: totalUnidades,
              totalFotos,
              totalPedido,
              formaPagamento: 'pix',
              statusPagamento: 'confirmado',
              codigoPedido: pixPedido?.codigo,
              pedidoId: pixPedido?.id,
              statusPedido: 'pago',
            },
          });
        } else if (
          status === 'rejected' ||
          status === 'cancelled'
        ) {
          window.clearInterval(intervalo);
          setAguardandoPix(false);
          setErroPix(
            'O pagamento não foi aprovado. Tente novamente ou escolha outra forma de pagamento.',
          );
        }
      } catch (erroConsulta) {
        console.error(
          'Erro ao consultar status do Pix:',
          erroConsulta,
        );
      }
    }, 4000);

    return () => window.clearInterval(intervalo);
  }, [
    aguardandoPix,
    pixInfo,
    pixPedido,
    navigate,
    itensPedido,
    gruposFotos,
    totalUnidades,
    totalFotos,
    totalPedido,
  ]);

  if (aguardandoPix && pixInfo) {
    return (
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-[#E9DDCC] bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#4A2A12]">
          Pague com Pix
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#7B5A3A]">
          Abra o app do seu banco e escaneie o QR Code, ou use o
          código "copia e cola" abaixo. Assim que o pagamento cair,
          seu pedido segue sozinho para a produção.
        </p>

        {pixInfo.qrCodeBase64 && (
          <img
            src={`data:image/png;base64,${pixInfo.qrCodeBase64}`}
            alt="QR Code Pix"
            className="mx-auto mt-5 h-56 w-56 rounded-2xl border border-[#E9DDCC]"
          />
        )}

        {pixInfo.qrCode && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(pixInfo.qrCode ?? '')
                .catch(() => undefined);
              setCodigoPixCopiado(true);
              window.setTimeout(
                () => setCodigoPixCopiado(false),
                2500,
              );
            }}
            className="mt-4 h-11 w-full rounded-full border border-[#8F5528] text-sm font-bold text-[#6B3E14]"
          >
            {codigoPixCopiado
              ? 'CÓDIGO COPIADO!'
              : 'COPIAR CÓDIGO PIX'}
          </button>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#8A5A2B]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8F5528]" />
          Aguardando confirmação do pagamento...
        </div>

        <button
          type="button"
          onClick={() => {
            setAguardandoPix(false);
            setPixInfo(null);
          }}
          className="mt-6 text-xs font-bold text-[#8A5A2B] underline"
        >
          Cancelar e escolher outra forma
        </button>
      </div>
    );
  }

  if (itensPedido.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-[#E9DDCC] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto w-16">
          <ProductIllustration productType="order" />
        </div>

        <h1 className="mt-4 text-xl font-bold text-[#4A2A12]">
          Pedido não encontrado
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#7B5A3A]">
          Volte para a página de produtos e monte o seu pedido.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/produtos')
          }
          className="mt-6 h-12 w-full rounded-full bg-[#8F5528] font-bold text-white"
        >
          ESCOLHER PRODUTOS
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-1 pb-28 sm:px-4 lg:pb-8">
      <header className="mb-5 rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-5 shadow-[0_12px_28px_rgba(107,62,20,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#8A5A2B]">
              <span className="h-2 w-2 rounded-full bg-[#E7A29A]" />
              PAGAMENTO
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#4A2A12] sm:text-3xl">
              Escolha como deseja pagar
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B5A3A]">
              Selecione uma opção e faça o pagamento no caixa.
              Seu pedido entrará em produção após a confirmação.
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

      {erroPix && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {erroPix}
        </div>
      )}

      <section className="mb-5 rounded-[24px] border-2 border-[#8F5528] bg-white p-4 text-center shadow-[0_12px_26px_rgba(107,62,20,0.08)] sm:p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#B59677]">
          Total a pagar
        </div>

        <div className="mt-1 text-4xl font-extrabold tracking-[-0.02em] text-[#6B3E14] sm:text-5xl">
          {formatarMoeda(totalPedido)}
        </div>

        <p className="mt-2 text-xs font-semibold leading-5 text-[#8A5A2B]">
          Pagamento obrigatório no caixa antes do início da produção.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="rounded-[26px] border border-[#E9DDCC] bg-white p-4 shadow-[0_8px_20px_rgba(107,62,20,0.05)] sm:p-5">
          <h2 className="text-lg font-bold text-[#4A2A12]">
            Forma de pagamento
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#8A6B4E]">
            Toque na opção que deseja utilizar.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {formasPagamento.map((forma) => {
              const selecionada =
                formaSelecionada === forma.id;

              return (
                <button
                  key={forma.id}
                  type="button"
                  disabled={salvandoPedido}
                  onClick={() =>
                    setFormaSelecionada(
                      forma.id,
                    )
                  }
                  className={`flex min-h-[118px] items-start gap-3 rounded-[20px] border p-4 text-left transition ${
                    selecionada
                      ? 'border-[#8F5528] bg-[#FFF4E8] ring-2 ring-[#8F5528]/10'
                      : 'border-[#E9DDCC] bg-[#FFFDF9] hover:border-[#CFA77E]'
                  } ${
                    salvandoPedido
                      ? 'cursor-not-allowed opacity-70'
                      : ''
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      selecionada
                        ? 'bg-[#8F5528] text-white'
                        : 'bg-[#F7E9D8] text-[#6B3E14]'
                    }`}
                  >
                    {forma.simbolo}
                  </span>

                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-bold text-[#4A2A12]">
                      {forma.titulo}

                      {selecionada && (
                        <span className="text-[#2F7A3E]">
                          ✓
                        </span>
                      )}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[#8A6B4E]">
                      {forma.descricao}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {formaSelecionada && (
            <div className="mt-5 rounded-[20px] border border-[#D7EBD9] bg-[#F7FFF8] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4F5E7] font-bold text-[#2F7A3E]">
                  ✓
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#2F7A3E]">
                    Forma de pagamento selecionada
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#53785B]">
                    {
                      formasPagamento.find(
                        (forma) =>
                          forma.id ===
                          formaSelecionada,
                      )?.titulo
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside>
          <div className="sticky top-5 space-y-4">
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
                    {totalFotos}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#E2C59F] bg-[#FFF8F0] p-2.5">
                  <span className="text-xs font-bold text-[#7B5A3A]">
                    Total
                  </span>

                  <strong className="text-base font-extrabold text-[#6B3E14]">
                    {formatarMoeda(totalPedido)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rounded-[20px] border border-[#E8D9C3] bg-[#FFF8F0] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 shrink-0">
                  <ProductIllustration productType="payment" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-[#4A2A12]">
                    Pagamento antecipado
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[#7B5A3A]">
                    O pedido só será enviado para produção
                    depois que o pagamento for confirmado no caixa.
                  </p>
                </div>
              </div>
            </section>

            <button
              type="button"
              disabled={salvandoPedido}
              onClick={() =>
                navigate('/resumo', {
                  state,
                })
              }
              className="h-11 w-full rounded-full border border-[#8F5528] bg-white text-sm font-bold text-[#6B3E14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              VOLTAR AO RESUMO
            </button>

            <button
              type="button"
              disabled={
                !formaSelecionada ||
                salvandoPedido
              }
              onClick={confirmarPagamento}
              className={`h-12 w-full rounded-full text-sm font-bold ${
                formaSelecionada &&
                !salvandoPedido
                  ? 'bg-[#8F5528] text-white shadow-[0_8px_18px_rgba(107,62,20,0.16)]'
                  : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
              }`}
            >
              {salvandoPedido
                ? 'REGISTRANDO PEDIDO...'
                : formaSelecionada
                  ? 'CONFIRMAR FORMA DE PAGAMENTO'
                  : 'ESCOLHA UMA OPÇÃO'}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8D8C5] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(107,62,20,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#8A5A2B]">
              Total a pagar
            </span>

            <span className="text-lg font-extrabold text-[#6B3E14]">
              {formatarMoeda(totalPedido)}
            </span>
          </div>

          <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={salvandoPedido}
            onClick={() =>
              navigate('/resumo', {
                state,
              })
            }
            className="h-12 shrink-0 rounded-full border border-[#E9DDCC] bg-white px-4 text-sm font-bold text-[#6B3E14] disabled:cursor-not-allowed disabled:opacity-60"
          >
            VOLTAR
          </button>

          <button
            type="button"
            disabled={
              !formaSelecionada ||
              salvandoPedido
            }
            onClick={confirmarPagamento}
            className={`h-12 min-w-0 flex-1 rounded-full px-4 text-sm font-bold ${
              formaSelecionada &&
              !salvandoPedido
                ? 'bg-[#8F5528] text-white'
                : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
            }`}
          >
            {salvandoPedido
              ? 'REGISTRANDO...'
              : formaSelecionada
                ? 'CONFIRMAR'
                : 'ESCOLHA UMA OPÇÃO'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pagamento;