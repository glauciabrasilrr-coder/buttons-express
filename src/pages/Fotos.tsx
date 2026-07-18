import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductIllustration, {
  type ProductIllustrationType,
} from '../components/ProductIllustration';
import { supabasePublic } from '../lib/supabase';

type ItemPedido = {
  id: string;
  title: string;
  illustration: ProductIllustrationType;
  categoria: string;
  quantidade: number;
};

type FotoSlot = {
  id: string;
  fileName: string;
  previewUrl: string | null;
  storagePath: string | null;
  editado: boolean;
  carregando: boolean;
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
  totalItens?: number;
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
const RASCUNHO_STORAGE_KEY = 'buttons-express-rascunho-id';
const BUCKET_FOTOS = 'fotos-pedidos';
const URL_ASSINADA_SEGUNDOS = 60 * 60 * 24 * 7;

function obterMensagemErro(erro: unknown): string {
  if (erro instanceof Error) {
    return erro.message;
  }

  if (
    erro &&
    typeof erro === 'object' &&
    'message' in erro &&
    typeof erro.message === 'string'
  ) {
    return erro.message;
  }

  try {
    return JSON.stringify(erro);
  } catch {
    return String(erro);
  }
}

function lerPedidoSalvo(): ItemPedido[] {
  try {
    const salvo = localStorage.getItem(PEDIDO_STORAGE_KEY);

    if (!salvo) {
      return [];
    }

    const dados = JSON.parse(salvo);
    return Array.isArray(dados) ? dados : [];
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

function salvarFotosPersistidas(fotos: FotosPersistidas): void {
  localStorage.setItem(FOTOS_STORAGE_KEY, JSON.stringify(fotos));
}

function obterRascunhoId(): string {
  const salvo = localStorage.getItem(RASCUNHO_STORAGE_KEY);

  if (salvo) {
    return salvo;
  }

  const novoId =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `rascunho-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem(RASCUNHO_STORAGE_KEY, novoId);
  return novoId;
}

function limparNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function criarCaminhoFoto(
  rascunhoId: string,
  fotoId: string,
  arquivo: File | Blob,
  nomeArquivo: string,
): string {
  const nomeLimpo = limparNomeArquivo(nomeArquivo || 'imagem');
  const extensaoNome = nomeLimpo.includes('.')
    ? nomeLimpo.split('.').pop()
    : null;
  const extensaoMime = arquivo.type?.split('/')[1]?.replace('jpeg', 'jpg');
  const extensao = extensaoNome || extensaoMime || 'jpg';

  return `${rascunhoId}/${fotoId}-${Date.now()}.${extensao}`;
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

async function enviarFotoStorage(
  caminho: string,
  arquivo: File | Blob,
): Promise<string> {
  const { error } = await supabasePublic.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, arquivo, {
      cacheControl: '3600',
      upsert: false,
      contentType: arquivo.type || undefined,
    });

  if (error) {
    throw error;
  }

  return criarUrlAssinada(caminho);
}

async function removerFotoStorage(caminho: string | null): Promise<void> {
  if (!caminho) {
    return;
  }

  const { error } = await supabasePublic.storage
    .from(BUCKET_FOTOS)
    .remove([caminho]);

  if (error) {
    throw error;
  }
}

async function baixarFotoStorage(caminho: string): Promise<Blob> {
  const { data, error } = await supabasePublic.storage
    .from(BUCKET_FOTOS)
    .download(caminho);

  if (error || !data) {
    throw error ?? new Error('Não foi possível copiar a foto.');
  }

  return data;
}

function criarGrupos(
  itensPedido: ItemPedido[],
  configuracao: ConfiguracaoFotos,
): GrupoFoto[] {
  return itensPedido.map((item) => ({
    id: item.id,
    title: item.title,
    quantidade: item.quantidade,
    illustration: item.illustration,
    usarMesmaFoto: configuracao[item.id] ?? false,
    fotos: Array.from({ length: item.quantidade }, (_, index) => ({
      id: `${item.id}-${index + 1}`,
      fileName: '',
      previewUrl: null,
      storagePath: null,
      editado: false,
      carregando: true,
    })),
  }));
}

function Fotos() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const rascunhoId = useMemo(() => obterRascunhoId(), []);

  const inputFotosRef = useRef<
    Record<string, HTMLInputElement | null>
  >({});

  const abrirSeletorDeFoto = (fotoId: string) => {
    const input = inputFotosRef.current[fotoId];

    if (!input) {
      return;
    }

    input.value = '';
    input.click();
  };

  const itensPedido = useMemo(() => {
    if (state?.itens && state.itens.length > 0) {
      return state.itens;
    }

    return lerPedidoSalvo();
  }, [state]);

  const [grupos, setGrupos] = useState<GrupoFoto[]>(() =>
    criarGrupos(itensPedido, lerConfiguracaoFotos()),
  );

  useEffect(() => {
    let cancelado = false;

    const carregarFotos = async () => {
      const configuracao = lerConfiguracaoFotos();
      const fotosPersistidas = lerFotosPersistidas();
      const gruposBase = criarGrupos(itensPedido, configuracao);

      const gruposCarregados = await Promise.all(
        gruposBase.map(async (grupo) => ({
          ...grupo,
          fotos: await Promise.all(
            grupo.fotos.map(async (foto) => {
              const persistida = fotosPersistidas[foto.id];

              if (!persistida?.storagePath) {
                return { ...foto, carregando: false };
              }

              try {
                const previewUrl = await criarUrlAssinada(
                  persistida.storagePath,
                );

                return {
                  ...foto,
                  fileName: persistida.fileName,
                  previewUrl,
                  storagePath: persistida.storagePath,
                  editado: persistida.editado,
                  carregando: false,
                };
              } catch (erro) {
                console.error('Erro ao carregar foto do Storage:', erro);

                return {
                  ...foto,
                  carregando: false,
                };
              }
            }),
          ),
        })),
      );

      if (!cancelado) {
        setGrupos(gruposCarregados);
      }
    };

    void carregarFotos();

    return () => {
      cancelado = true;
    };
  }, [itensPedido]);

  useEffect(() => {
    const configuracao = grupos.reduce<ConfiguracaoFotos>(
      (resultado, grupo) => {
        resultado[grupo.id] = grupo.usarMesmaFoto;
        return resultado;
      },
      {},
    );

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configuracao));
  }, [grupos]);

  const totalSlots = useMemo(
    () =>
      grupos.reduce(
        (total, grupo) => total + grupo.fotos.length,
        0,
      ),
    [grupos],
  );

  const totalFotos = useMemo(
    () =>
      grupos.reduce(
        (total, grupo) =>
          total +
          grupo.fotos.filter(
            (foto) => foto.storagePath && foto.previewUrl,
          ).length,
        0,
      ),
    [grupos],
  );

  const pedidoCompleto =
    totalSlots > 0 && totalFotos === totalSlots;

  const progresso =
    totalSlots === 0
      ? 0
      : Math.round((totalFotos / totalSlots) * 100);

  const adicionarFoto = async (
    grupoIndex: number,
    fotoIndex: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';

    if (!arquivo) {
      return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      window.alert('A imagem deve ter no máximo 10 MB.');
      return;
    }

    const grupoAtual = grupos[grupoIndex];

    if (!grupoAtual) {
      return;
    }

    const indices = grupoAtual.usarMesmaFoto
      ? grupoAtual.fotos.map((_, index) => index)
      : [fotoIndex];

    setGrupos((gruposAtuais) =>
      gruposAtuais.map((grupo, index) =>
        index === grupoIndex
          ? {
              ...grupo,
              fotos: grupo.fotos.map((foto, posicao) =>
                indices.includes(posicao)
                  ? { ...foto, carregando: true }
                  : foto,
              ),
            }
          : grupo,
      ),
    );

    try {
      const persistidas = lerFotosPersistidas();

      const resultados = await Promise.all(
        indices.map(async (index) => {
          const fotoAtual = grupoAtual.fotos[index];
          const caminhoAnterior = fotoAtual.storagePath;
          const novoCaminho = criarCaminhoFoto(
            rascunhoId,
            fotoAtual.id,
            arquivo,
            arquivo.name,
          );

          const previewUrl = await enviarFotoStorage(
            novoCaminho,
            arquivo,
          );

          if (caminhoAnterior && caminhoAnterior !== novoCaminho) {
            try {
              await removerFotoStorage(caminhoAnterior);
            } catch (erroRemocao) {
              console.warn(
                'A foto antiga não pôde ser removida:',
                erroRemocao,
              );
            }
          }

          persistidas[fotoAtual.id] = {
            id: fotoAtual.id,
            fileName: arquivo.name,
            storagePath: novoCaminho,
            editado: false,
          };

          return {
            index,
            previewUrl,
            storagePath: novoCaminho,
          };
        }),
      );

      salvarFotosPersistidas(persistidas);

      setGrupos((gruposAtuais) =>
        gruposAtuais.map((grupo, index) => {
          if (index !== grupoIndex) {
            return grupo;
          }

          return {
            ...grupo,
            fotos: grupo.fotos.map((foto, posicao) => {
              const resultado = resultados.find(
                (item) => item.index === posicao,
              );

              if (!resultado) {
                return foto;
              }

              return {
                ...foto,
                fileName: arquivo.name,
                previewUrl: resultado.previewUrl,
                storagePath: resultado.storagePath,
                editado: false,
                carregando: false,
              };
            }),
          };
        }),
      );
    } catch (erro) {
      console.error('Erro ao enviar foto ao Supabase Storage:', erro);

      setGrupos((gruposAtuais) =>
        gruposAtuais.map((grupo, index) =>
          index === grupoIndex
            ? {
                ...grupo,
                fotos: grupo.fotos.map((foto, posicao) =>
                  indices.includes(posicao)
                    ? { ...foto, carregando: false }
                    : foto,
                ),
              }
            : grupo,
        ),
      );

      const mensagemErro = obterMensagemErro(erro);

      window.alert(
        `Não foi possível enviar essa imagem para o servidor.\n\nDetalhe técnico: ${mensagemErro}`,
      );
    }
  };

  const removerFoto = async (
    grupoIndex: number,
    fotoIndex: number,
  ) => {
    const fotoAtual = grupos[grupoIndex]?.fotos[fotoIndex];

    if (!fotoAtual) {
      return;
    }

    setGrupos((gruposAtuais) =>
      gruposAtuais.map((grupo, index) =>
        index === grupoIndex
          ? {
              ...grupo,
              fotos: grupo.fotos.map((foto, posicao) =>
                posicao === fotoIndex
                  ? { ...foto, carregando: true }
                  : foto,
              ),
            }
          : grupo,
      ),
    );

    try {
      await removerFotoStorage(fotoAtual.storagePath);

      const persistidas = lerFotosPersistidas();
      delete persistidas[fotoAtual.id];
      salvarFotosPersistidas(persistidas);

      setGrupos((gruposAtuais) =>
        gruposAtuais.map((grupo, index) =>
          index === grupoIndex
            ? {
                ...grupo,
                fotos: grupo.fotos.map((foto, posicao) =>
                  posicao === fotoIndex
                    ? {
                        ...foto,
                        fileName: '',
                        previewUrl: null,
                        storagePath: null,
                        editado: false,
                        carregando: false,
                      }
                    : foto,
                ),
              }
            : grupo,
        ),
      );
    } catch (erro) {
      console.error('Erro ao remover foto do Storage:', erro);
      window.alert('Não foi possível remover essa foto.');

      setGrupos((gruposAtuais) =>
        gruposAtuais.map((grupo, index) =>
          index === grupoIndex
            ? {
                ...grupo,
                fotos: grupo.fotos.map((foto, posicao) =>
                  posicao === fotoIndex
                    ? { ...foto, carregando: false }
                    : foto,
                ),
              }
            : grupo,
        ),
      );
    }
  };

  const removerTodasDoGrupo = async (grupoIndex: number) => {
    const grupoAtual = grupos[grupoIndex];

    if (!grupoAtual) {
      return;
    }

    try {
      const caminhos = grupoAtual.fotos
        .map((foto) => foto.storagePath)
        .filter((caminho): caminho is string => Boolean(caminho));

      if (caminhos.length > 0) {
        const { error } = await supabasePublic.storage
          .from(BUCKET_FOTOS)
          .remove(caminhos);

        if (error) {
          throw error;
        }
      }

      const persistidas = lerFotosPersistidas();
      grupoAtual.fotos.forEach((foto) => {
        delete persistidas[foto.id];
      });
      salvarFotosPersistidas(persistidas);

      setGrupos((gruposAtuais) =>
        gruposAtuais.map((grupo, index) =>
          index === grupoIndex
            ? {
                ...grupo,
                fotos: grupo.fotos.map((foto) => ({
                  ...foto,
                  fileName: '',
                  previewUrl: null,
                  storagePath: null,
                  editado: false,
                  carregando: false,
                })),
              }
            : grupo,
        ),
      );
    } catch (erro) {
      console.error('Erro ao remover fotos do Storage:', erro);
      window.alert('Não foi possível remover todas as fotos.');
    }
  };

  const alternarMesmaFoto = async (grupoIndex: number) => {
    const grupoAtual = grupos[grupoIndex];

    if (!grupoAtual) {
      return;
    }

    const novoValor = !grupoAtual.usarMesmaFoto;
    const primeiraFoto = grupoAtual.fotos.find(
      (foto) => foto.storagePath,
    );

    setGrupos((gruposAtuais) =>
      gruposAtuais.map((grupo, index) =>
        index === grupoIndex
          ? { ...grupo, usarMesmaFoto: novoValor }
          : grupo,
      ),
    );

    if (!novoValor || !primeiraFoto?.storagePath) {
      return;
    }

    try {
      const blob = await baixarFotoStorage(primeiraFoto.storagePath);
      const persistidas = lerFotosPersistidas();

      const resultados = await Promise.all(
        grupoAtual.fotos.map(async (foto, index) => {
          if (foto.id === primeiraFoto.id) {
            return {
              index,
              previewUrl: primeiraFoto.previewUrl,
              storagePath: primeiraFoto.storagePath,
            };
          }

          const novoCaminho = criarCaminhoFoto(
            rascunhoId,
            foto.id,
            blob,
            primeiraFoto.fileName,
          );

          const previewUrl = await enviarFotoStorage(
            novoCaminho,
            blob,
          );

          if (foto.storagePath && foto.storagePath !== novoCaminho) {
            try {
              await removerFotoStorage(foto.storagePath);
            } catch (erroRemocao) {
              console.warn(
                'A foto antiga não pôde ser removida:',
                erroRemocao,
              );
            }
          }

          persistidas[foto.id] = {
            id: foto.id,
            fileName: primeiraFoto.fileName,
            storagePath: novoCaminho,
            editado: primeiraFoto.editado,
          };

          return {
            index,
            previewUrl,
            storagePath: novoCaminho,
          };
        }),
      );

      salvarFotosPersistidas(persistidas);

      setGrupos((gruposAtuais) =>
        gruposAtuais.map((grupo, index) => {
          if (index !== grupoIndex) {
            return grupo;
          }

          return {
            ...grupo,
            fotos: grupo.fotos.map((foto, posicao) => {
              const resultado = resultados.find(
                (item) => item.index === posicao,
              );

              if (!resultado) {
                return foto;
              }

              return {
                ...foto,
                fileName: primeiraFoto.fileName,
                previewUrl: resultado.previewUrl,
                storagePath: resultado.storagePath,
                editado: primeiraFoto.editado,
                carregando: false,
              };
            }),
          };
        }),
      );
    } catch (erro) {
      console.error('Erro ao repetir foto no Storage:', erro);
      window.alert(
        'Não foi possível repetir a foto em todas as unidades.',
      );
    }
  };

  const continuarParaResumo = () => {
    if (!pedidoCompleto) {
      window.alert(
        `Ainda faltam ${totalSlots - totalFotos} foto(s) para completar o pedido.`,
      );
      return;
    }

    navigate('/resumo', {
      state: {
        itens: itensPedido,
        gruposFotos: grupos,
        totalItens: totalSlots,
        totalFotos,
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
          Volte para a página de produtos e escolha os itens que
          deseja personalizar.
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
    <div className="mx-auto w-full max-w-6xl px-1 pb-28 sm:px-4 lg:pb-8">
      <header className="mb-5 rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-5 shadow-[0_12px_28px_rgba(107,62,20,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#8A5A2B]">
              <span className="h-2 w-2 rounded-full bg-[#E7A29A]" />
              FOTOS
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#4A2A12] sm:text-3xl">
              Envie suas fotos
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B5A3A]">
              Envie uma foto para cada unidade do seu pedido.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white bg-white/80 px-3 py-2 text-center shadow-sm">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#B59677]">
              Progresso
            </div>

            <div className="mt-1 text-lg font-bold text-[#5B3518]">
              {totalFotos}/{totalSlots}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#8A5A2B]">
            <span>{progresso}% concluído</span>
            <span>
              {totalSlots - totalFotos === 0
                ? 'Todas as fotos foram enviadas'
                : `Faltam ${totalSlots - totalFotos}`}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#F1DFCA]">
            <div
              className="h-full rounded-full bg-[#8F5528] transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-5">
          {grupos.map((grupo, grupoIndex) => {
            const fotosEnviadas = grupo.fotos.filter(
              (foto) => foto.previewUrl,
            ).length;
            const grupoCompleto =
              fotosEnviadas === grupo.fotos.length;

            return (
              <section
                key={grupo.id}
                className="rounded-[26px] border border-[#E9DDCC] bg-white p-4 shadow-[0_8px_20px_rgba(107,62,20,0.05)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-[58px] shrink-0 sm:w-14">
                      <ProductIllustration
                        productType={grupo.illustration}
                        alt={grupo.title}
                      />
                    </div>

                    <div>
                      <h2 className="text-base font-extrabold text-[#4A2A12] sm:text-lg">
                        {grupo.title}
                      </h2>

                      <p className="mt-0.5 text-xs font-medium text-[#9A8067] sm:mt-1 sm:text-sm">
                        {grupo.quantidade}{' '}
                        {grupo.quantidade === 1
                          ? 'unidade'
                          : 'unidades'}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`self-start rounded-full px-3 py-1 text-xs font-bold ${
                      grupoCompleto
                        ? 'bg-[#EEF9F0] text-[#2F7A3E]'
                        : 'bg-[#FFF4E8] text-[#8A5A2B]'
                    }`}
                  >
                    {fotosEnviadas}/{grupo.fotos.length} fotos
                  </div>
                </div>

                {grupo.quantidade > 1 && (
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E9DDCC] bg-[#FFF9F2] p-3">
                    <input
                      type="checkbox"
                      checked={grupo.usarMesmaFoto}
                      onChange={() => void alternarMesmaFoto(grupoIndex)}
                      className="mt-1 h-4 w-4 accent-[#8F5528]"
                    />

                    <div>
                      <div className="text-sm font-bold text-[#4A2A12]">
                        Usar a mesma foto em todas as unidades
                      </div>

                      <div className="mt-1 text-xs leading-5 text-[#9A8067]">
                        Envie uma única foto e ela será aplicada a
                        todas as {grupo.quantidade} unidades deste
                        produto.
                      </div>
                    </div>
                  </label>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {grupo.fotos.map((foto, fotoIndex) => (
                    <article
                      key={foto.id}
                      className="overflow-hidden rounded-[20px] border border-[#E9DDCC] bg-[#FFFDF9]"
                    >
                      {foto.carregando ? (
                        <div className="flex aspect-square items-center justify-center p-4 text-center">
                          <div>
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E9DDCC] border-t-[#8F5528]" />
                            <div className="mt-3 text-xs font-bold text-[#4A2A12]">
                              Carregando...
                            </div>
                          </div>
                        </div>
                      ) : foto.previewUrl ? (
                        <>
                          <div className="relative aspect-square overflow-hidden bg-[#F7E9D8]">
                            <img
                              src={foto.previewUrl}
                              alt={foto.fileName}
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute left-2 top-2 rounded-full bg-[#6B3E14]/92 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
                              FOTO {fotoIndex + 1}
                            </div>
                          </div>

                          <div className="p-2">
                            <div className="truncate text-xs font-semibold text-[#4A2A12]">
                              {foto.fileName}
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirSeletorDeFoto(foto.id)
                                  }
                                  className="flex h-9 w-full items-center justify-center rounded-full border border-[#E9DDCC] bg-white text-xs font-bold text-[#6B3E14]"
                                >
                                  ALTERAR
                                </button>

                                <input
                                  ref={(elemento) => {
                                    inputFotosRef.current[foto.id] =
                                      elemento;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
                                  onChange={(event) =>
                                    void adicionarFoto(
                                      grupoIndex,
                                      fotoIndex,
                                      event,
                                    )
                                  }
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  void removerFoto(
                                    grupoIndex,
                                    fotoIndex,
                                  )
                                }
                                className="h-9 rounded-full border border-[#E9DDCC] bg-white text-xs font-bold text-[#9A6F50]"
                              >
                                EXCLUIR
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              abrirSeletorDeFoto(foto.id)
                            }
                            className="flex min-h-[168px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden border-2 border-dashed border-[#D9C1A4] bg-[linear-gradient(180deg,#FFFDF9_0%,#FFF7ED_100%)] p-4 text-center transition active:scale-[0.99] hover:border-[#8F5528] hover:bg-[#FFF3E5] sm:aspect-square sm:min-h-0"
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E9DDCC] bg-white shadow-sm">
                              <div className="w-10">
                                <ProductIllustration productType="upload" />
                              </div>
                            </div>

                            <div className="mt-3 text-sm font-extrabold text-[#4A2A12]">
                              Toque para enviar
                            </div>

                            <div className="mt-1 text-xs font-semibold text-[#8A5A2B]">
                              Foto {fotoIndex + 1}
                            </div>

                            <div className="mt-1 text-[10px] text-[#9A8067]">
                              JPG, PNG ou HEIC · até 10 MB
                            </div>
                          </button>

                          <input
                            ref={(elemento) => {
                              inputFotosRef.current[foto.id] =
                                elemento;
                            }}
                            type="file"
                            accept="image/*"
                            className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
                            onChange={(event) =>
                              void adicionarFoto(
                                grupoIndex,
                                fotoIndex,
                                event,
                              )
                            }
                          />
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                {fotosEnviadas > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void removerTodasDoGrupo(grupoIndex)
                    }
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-[#E7CFC9] bg-[#FFF5F3] px-4 text-xs font-bold text-[#A3483E] transition hover:bg-[#FFECE8]"
                  >
                    EXCLUIR TODAS AS FOTOS
                  </button>
                )}
              </section>
            );
          })}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-5 rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(145deg,#FFFDF9,#FDF3E7)] p-5 shadow-[0_10px_24px_rgba(107,62,20,0.06)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#B59677]">
              Resumo
            </div>

            <h2 className="mt-1 text-lg font-bold text-[#4A2A12]">
              Fotos do pedido
            </h2>

            <div className="mt-4 space-y-3">
              {grupos.map((grupo) => {
                const enviadas = grupo.fotos.filter(
                  (foto) => foto.previewUrl,
                ).length;

                return (
                  <div
                    key={grupo.id}
                    className="rounded-2xl border border-[#F0E1CF] bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 shrink-0">
                        <ProductIllustration
                          productType={grupo.illustration}
                          alt={grupo.title}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#4A2A12]">
                          {grupo.title}
                        </div>

                        <div className="mt-1 text-xs text-[#9A8067]">
                          {enviadas}/{grupo.fotos.length} fotos
                        </div>
                      </div>

                      {enviadas === grupo.fotos.length && (
                        <span className="text-sm font-bold text-[#2F7A3E]">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 text-center">
              <div className="text-2xl font-bold text-[#4A2A12]">
                {totalFotos}/{totalSlots}
              </div>

              <div className="mt-1 text-xs text-[#9A8067]">
                fotos enviadas
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/produtos')}
              className="mt-4 h-11 w-full rounded-full border border-[#8F5528] bg-white text-sm font-bold text-[#6B3E14]"
            >
              VOLTAR AOS PRODUTOS
            </button>

            <button
              type="button"
              disabled={!pedidoCompleto}
              onClick={continuarParaResumo}
              className={`mt-3 h-12 w-full rounded-full text-sm font-bold ${
                pedidoCompleto
                  ? 'bg-[#8F5528] text-white'
                  : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
              }`}
            >
              CONTINUAR PARA O RESUMO
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8D8C5] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(107,62,20,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          <div className={`mb-2 text-center text-xs font-bold ${
            pedidoCompleto
              ? 'text-[#2F7A3E]'
              : 'text-[#8A5A2B]'
          }`}>
            {pedidoCompleto
              ? '✓ Envio de fotos concluído'
              : `Faltam ${totalSlots - totalFotos} foto(s)`}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/produtos')}
              className="h-12 shrink-0 rounded-full border border-[#E9DDCC] bg-white px-4 text-sm font-bold text-[#6B3E14]"
            >
              VOLTAR
            </button>

            <button
              type="button"
              disabled={!pedidoCompleto}
              onClick={continuarParaResumo}
              className={`h-12 min-w-0 flex-1 rounded-full px-4 text-sm font-bold ${
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

export default Fotos;