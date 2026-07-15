import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import JSZip from 'jszip';
import type { ProductIllustrationType } from '../components/ProductIllustration';
import { formatarMoeda } from '../data/products';
import { supabase } from '../lib/supabase';
import {
  atualizarStatusPedido,
  listarPedidos,
  removerPedidoBanco,
  type FormaPagamento,
  type PedidoBanco,
  type StatusPedido,
} from '../services/pedidos';

type ItemPedido = {
  id: string;
  title: string;
  illustration: ProductIllustrationType;
  categoria: string;
  preco?: number;
  quantidade: number;
};

type FotoPedidoSalva = {
  id: string;
  fileName: string;
  storagePath: string | null;
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

type DadosPedido = {
  itens?: ItemPedido[];
  gruposFotos?: GrupoFotoSalvo[];
  totalPedido?: number;
};

type PedidoFila = {
  id: string;
  codigo: string;
  criadoEm: string;
  atualizadoEm: string;
  status: StatusPedido;
  formaPagamento: FormaPagamento;
  statusPagamento: string;
  itens: ItemPedido[];
  gruposFotos: GrupoFotoSalvo[];
  totalProdutos: number;
  totalItens: number;
  totalFotos: number;
  totalPedido: number;
};

type FotoVisual = {
  id: string;
  fileName: string;
  storagePath: string;
  previewUrl: string;
  produto: string;
  posicao: number;
};

type FotoAmpliada = {
  pedidoId: string;
  indice: number;
} | null;

type FiltroFila =
  | 'todos'
  | 'aguardando-pagamento'
  | 'pago'
  | 'em-producao'
  | 'pronto';

const BUCKET_FOTOS = 'fotos-pedidos';
const URL_ASSINADA_SEGUNDOS = 60 * 60 * 24 * 7;
const INTERVALO_ATUALIZACAO_MS = 3_000;
const DURACAO_DESTAQUE_NOVO_MS = 12_000;
const SOM_STORAGE_KEY = 'buttons-express-som-pedidos';

const nomesPagamento: Record<FormaPagamento, string> = {
  pix: 'Pix',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
};

const nomesStatus: Record<StatusPedido, string> = {
  'aguardando-pagamento': 'Aguardando pagamento',
  pago: 'Pagamentos confirmados',
  'em-producao': 'Produção iniciada',
  pronto: 'Pronto para retirada',
  entregue: 'Entregue',
};

function normalizarPedido(
  pedido: PedidoBanco,
): PedidoFila {
  const dados = pedido.dados as DadosPedido;

  return {
    id: pedido.id,
    codigo: pedido.codigo,
    criadoEm: pedido.criado_em,
    atualizadoEm: pedido.atualizado_em,
    status: pedido.status,
    formaPagamento: pedido.forma_pagamento,
    statusPagamento: pedido.status_pagamento,
    itens: Array.isArray(dados?.itens)
      ? dados.itens
      : [],
    gruposFotos: Array.isArray(dados?.gruposFotos)
      ? dados.gruposFotos.map((grupo) => ({
          ...grupo,
          fotos: Array.isArray(grupo.fotos)
            ? grupo.fotos.map((foto) => ({
                ...foto,
                storagePath: foto.storagePath ?? null,
              }))
            : [],
        }))
      : [],
    totalProdutos: pedido.total_produtos ?? 0,
    totalItens: pedido.total_itens ?? 0,
    totalFotos: pedido.total_fotos ?? 0,
    totalPedido:
      Number(dados?.totalPedido) || 0,
  };
}

function obterProximoStatus(
  status: StatusPedido,
): StatusPedido | null {
  switch (status) {
    case 'aguardando-pagamento':
      return 'pago';

    case 'pago':
      return 'em-producao';

    case 'em-producao':
      return 'pronto';

    case 'pronto':
      return 'entregue';

    case 'entregue':
      return null;
  }
}

function textoBotao(
  status: StatusPedido,
): string {
  switch (status) {
    case 'aguardando-pagamento':
      return 'CONFIRMAR PAGAMENTO';

    case 'pago':
      return 'INICIAR PRODUÇÃO';

    case 'em-producao':
      return 'MARCAR COMO PRONTO';

    case 'pronto':
      return 'MARCAR COMO ENTREGUE';

    case 'entregue':
      return 'PEDIDO ENTREGUE';
  }
}

function estiloStatus(
  status: StatusPedido,
): string {
  switch (status) {
    case 'aguardando-pagamento':
      return 'border-[#E8D2AD] bg-[#FFF7E8] text-[#9A641B]';

    case 'pago':
      return 'border-[#C8DDF3] bg-[#EFF7FF] text-[#28618E]';

    case 'em-producao':
      return 'border-[#D7CCEF] bg-[#F6F1FF] text-[#6848A0]';

    case 'pronto':
      return 'border-[#CDE8D2] bg-[#F1FFF4] text-[#2F7A3E]';

    case 'entregue':
      return 'border-[#DDD8D1] bg-[#F5F3F0] text-[#71675D]';
  }
}

function estiloCard(
  status: StatusPedido,
): string {
  switch (status) {
    case 'aguardando-pagamento':
      return 'border-[#E8D2AD]';

    case 'pago':
      return 'border-[#C8DDF3]';

    case 'em-producao':
      return 'border-[#D7CCEF] ring-2 ring-[#6848A0]/10';

    case 'pronto':
      return 'border-[#B9DEBF] ring-2 ring-[#2F7A3E]/10';

    case 'entregue':
      return 'border-[#DDD8D1] opacity-80';
  }
}

function estiloBotao(
  status: StatusPedido,
): string {
  switch (status) {
    case 'aguardando-pagamento':
      return 'bg-[#B97822] hover:bg-[#965E16]';

    case 'pago':
      return 'bg-[#28618E] hover:bg-[#214F74]';

    case 'em-producao':
      return 'bg-[#6848A0] hover:bg-[#563B85]';

    case 'pronto':
      return 'bg-[#2F7A3E] hover:bg-[#276635]';

    case 'entregue':
      return 'bg-[#71675D]';
  }
}

function formatarData(
  data: string,
): string {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return 'Horário não disponível';
  }

  return valor.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function limparNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function montarNomeDownload(
  codigo: string,
  produto: string,
  posicao: number,
  nomeOriginal: string,
): string {
  const produtoLimpo = limparNomeArquivo(produto);
  const nomeLimpo = limparNomeArquivo(nomeOriginal || 'foto.jpg');

  return `${codigo}-${produtoLimpo}-foto-${posicao}-${nomeLimpo}`;
}

function obterExtensaoArquivo(
  nomeOriginal: string,
  tipoMime?: string,
): string {
  const nomeLimpo = limparNomeArquivo(nomeOriginal || '');

  if (nomeLimpo.includes('.')) {
    const extensao = nomeLimpo.split('.').pop();

    if (extensao) {
      return extensao;
    }
  }

  const subtipo = tipoMime?.split('/')[1]?.toLowerCase();

  if (subtipo === 'jpeg') {
    return 'jpg';
  }

  return subtipo || 'jpg';
}

function limparNomePasta(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return limpo || 'Produto';
}

async function criarUrlAssinada(
  caminho: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrl(
      caminho,
      URL_ASSINADA_SEGUNDOS,
    );

  if (error || !data?.signedUrl) {
    throw error ?? new Error(
      'Não foi possível gerar a visualização da foto.',
    );
  }

  return data.signedUrl;
}

async function baixarArquivo(
  caminho: string,
  nomeDownload: string,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .download(caminho);

  if (error || !data) {
    throw error ?? new Error(
      'Não foi possível baixar a foto.',
    );
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');

  link.href = url;
  link.download = nomeDownload;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function prioridadeStatus(
  status: StatusPedido,
): number {
  switch (status) {
    case 'pronto':
      return 1;

    case 'em-producao':
      return 2;

    case 'pago':
      return 3;

    case 'aguardando-pagamento':
      return 4;

    case 'entregue':
      return 5;
  }
}

function formatarTempoEspera(
  criadoEm: string,
  agora: number,
): string {
  const criado = new Date(criadoEm).getTime();

  if (Number.isNaN(criado)) {
    return 'Tempo indisponível';
  }

  const diferencaMinutos = Math.max(
    0,
    Math.floor((agora - criado) / 60_000),
  );

  if (diferencaMinutos < 1) {
    return 'Recebido agora';
  }

  if (diferencaMinutos < 60) {
    return `Aguardando há ${diferencaMinutos} min`;
  }

  const horas = Math.floor(diferencaMinutos / 60);
  const minutos = diferencaMinutos % 60;

  if (minutos === 0) {
    return `Aguardando há ${horas} h`;
  }

  return `Aguardando há ${horas} h ${minutos} min`;
}

function tocarSomNovoPedido(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const contexto = new AudioContextClass();
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();

    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(
      880,
      contexto.currentTime,
    );

    ganho.gain.setValueAtTime(
      0.0001,
      contexto.currentTime,
    );

    ganho.gain.exponentialRampToValueAtTime(
      0.18,
      contexto.currentTime + 0.02,
    );

    ganho.gain.exponentialRampToValueAtTime(
      0.0001,
      contexto.currentTime + 0.35,
    );

    oscilador.connect(ganho);
    ganho.connect(contexto.destination);

    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.36);

    oscilador.addEventListener('ended', () => {
      void contexto.close();
    });
  } catch (erroSom) {
    console.error(
      'Não foi possível tocar o aviso sonoro:',
      erroSom,
    );
  }
}

function Fila() {
  const primeiraCargaConcluida = useRef(false);
  const carregamentoEmAndamento = useRef(false);
  const idsPedidosConhecidos = useRef<Set<string>>(
    new Set(),
  );
  const somAtivoRef = useRef(false);

  const [pedidos, setPedidos] =
    useState<PedidoFila[]>([]);

  const [fotosPorPedido, setFotosPorPedido] =
    useState<Record<string, FotoVisual[]>>({});

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  const [ultimaAtualizacao, setUltimaAtualizacao] =
    useState<Date | null>(null);

  const [atualizandoAutomaticamente, setAtualizandoAutomaticamente] =
    useState(false);

  const [agora, setAgora] =
    useState(() => Date.now());

  const [pedidosNovos, setPedidosNovos] =
    useState<Set<string>>(new Set());

  const [somAtivo, setSomAtivo] =
    useState(
      () =>
        localStorage.getItem(SOM_STORAGE_KEY) ===
        'true',
    );

  const [filtroFila, setFiltroFila] =
    useState<FiltroFila>('todos');

  const [processandoId, setProcessandoId] =
    useState<string | null>(null);

  const [baixandoId, setBaixandoId] =
    useState<string | null>(null);

  const [limpandoFila, setLimpandoFila] =
    useState(false);

  const [fotoAmpliada, setFotoAmpliada] =
    useState<FotoAmpliada>(null);

  const carregarFotosDosPedidos = async (
    pedidosCarregados: PedidoFila[],
  ) => {
    const resultado: Record<string, FotoVisual[]> = {};

    await Promise.all(
      pedidosCarregados.map(async (pedido) => {
        const fotos: FotoVisual[] = [];

        for (const grupo of pedido.gruposFotos) {
          for (
            let index = 0;
            index < grupo.fotos.length;
            index += 1
          ) {
            const foto = grupo.fotos[index];

            if (!foto.storagePath) {
              continue;
            }

            try {
              const previewUrl =
                await criarUrlAssinada(
                  foto.storagePath,
                );

              fotos.push({
                id: foto.id,
                fileName: foto.fileName,
                storagePath: foto.storagePath,
                previewUrl,
                produto: grupo.title,
                posicao: index + 1,
              });
            } catch (erroFoto) {
              console.error(
                `Erro ao carregar foto ${foto.id}:`,
                erroFoto,
              );
            }
          }
        }

        resultado[pedido.id] = fotos;
      }),
    );

    setFotosPorPedido(resultado);
  };

  const carregarFila = async (
    mostrarCarregamento = false,
  ) => {
    if (carregamentoEmAndamento.current) {
      return;
    }

    carregamentoEmAndamento.current = true;

    if (
      mostrarCarregamento ||
      !primeiraCargaConcluida.current
    ) {
      setCarregando(true);
    } else {
      setAtualizandoAutomaticamente(true);
    }

    setErro(null);

    try {
      const pedidosBanco =
        await listarPedidos();

      const pedidosNormalizados =
        pedidosBanco.map(normalizarPedido);

      if (primeiraCargaConcluida.current) {
        const novosIds = pedidosNormalizados
          .filter(
            (pedido) =>
              !idsPedidosConhecidos.current.has(
                pedido.id,
              ),
          )
          .map((pedido) => pedido.id);

        if (novosIds.length > 0) {
          setPedidosNovos(
            (atuais) =>
              new Set([
                ...atuais,
                ...novosIds,
              ]),
          );

          if (somAtivoRef.current) {
            tocarSomNovoPedido();
          }

          window.setTimeout(() => {
            setPedidosNovos((atuais) => {
              const atualizados = new Set(atuais);

              novosIds.forEach((id) => {
                atualizados.delete(id);
              });

              return atualizados;
            });
          }, DURACAO_DESTAQUE_NOVO_MS);
        }
      }

      idsPedidosConhecidos.current = new Set(
        pedidosNormalizados.map(
          (pedido) => pedido.id,
        ),
      );

      setPedidos(pedidosNormalizados);

      await carregarFotosDosPedidos(
        pedidosNormalizados,
      );

      setUltimaAtualizacao(new Date());
      primeiraCargaConcluida.current = true;
    } catch (erroCarregamento) {
      console.error(
        'Erro ao carregar fila:',
        erroCarregamento,
      );

      setErro(
        'Não foi possível carregar os pedidos do Supabase.',
      );
    } finally {
      setCarregando(false);
      setAtualizandoAutomaticamente(false);
      carregamentoEmAndamento.current = false;
    }
  };

  useEffect(() => {
    void carregarFila(true);

    const intervalo = window.setInterval(() => {
      void carregarFila(false);
    }, INTERVALO_ATUALIZACAO_MS);

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    somAtivoRef.current = somAtivo;

    localStorage.setItem(
      SOM_STORAGE_KEY,
      String(somAtivo),
    );
  }, [somAtivo]);

  useEffect(() => {
    const intervaloRelogio = window.setInterval(() => {
      setAgora(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervaloRelogio);
    };
  }, []);

  useEffect(() => {
    if (!fotoAmpliada) {
      return;
    }

    const fotos =
      fotosPorPedido[fotoAmpliada.pedidoId] ?? [];

    const controlarTeclado = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setFotoAmpliada(null);
        return;
      }

      if (fotos.length === 0) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        setFotoAmpliada((atual) => {
          if (!atual) {
            return null;
          }

          return {
            ...atual,
            indice:
              atual.indice === 0
                ? fotos.length - 1
                : atual.indice - 1,
          };
        });
      }

      if (event.key === 'ArrowRight') {
        setFotoAmpliada((atual) => {
          if (!atual) {
            return null;
          }

          return {
            ...atual,
            indice:
              atual.indice === fotos.length - 1
                ? 0
                : atual.indice + 1,
          };
        });
      }
    };

    window.addEventListener(
      'keydown',
      controlarTeclado,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        controlarTeclado,
      );
    };
  }, [fotoAmpliada, fotosPorPedido]);

  const pedidosOrdenados = useMemo(
    () =>
      [...pedidos].sort(
        (pedidoA, pedidoB) => {
          const prioridadeA =
            prioridadeStatus(
              pedidoA.status,
            );

          const prioridadeB =
            prioridadeStatus(
              pedidoB.status,
            );

          if (prioridadeA !== prioridadeB) {
            return prioridadeA - prioridadeB;
          }

          return (
            new Date(
              pedidoA.criadoEm,
            ).getTime() -
            new Date(
              pedidoB.criadoEm,
            ).getTime()
          );
        },
      ),
    [pedidos],
  );

  const pedidosAtivos = useMemo(
    () =>
      pedidosOrdenados.filter(
        (pedido) =>
          pedido.status !== 'entregue',
      ),
    [pedidosOrdenados],
  );

  const pedidosVisiveis = useMemo(
    () =>
      filtroFila === 'todos'
        ? pedidosAtivos
        : pedidosAtivos.filter(
            (pedido) =>
              pedido.status === filtroFila,
          ),
    [filtroFila, pedidosAtivos],
  );

  const pedidosEntregues = useMemo(
    () =>
      pedidosOrdenados.filter(
        (pedido) =>
          pedido.status === 'entregue',
      ),
    [pedidosOrdenados],
  );

  const aguardandoPagamento =
    pedidos.filter(
      (pedido) =>
        pedido.status ===
        'aguardando-pagamento',
    ).length;

  const pagamentosConfirmadosAtuais =
    pedidos.filter(
      (pedido) =>
        pedido.status === 'pago',
    ).length;

  const emProducaoAtuais =
    pedidos.filter(
      (pedido) =>
        pedido.status === 'em-producao',
    ).length;

  const prontosAtuais =
    pedidos.filter(
      (pedido) =>
        pedido.status === 'pronto',
    ).length;

  const pagamentosConfirmados =
    pedidos.filter(
      (pedido) =>
        pedido.status === 'pago' ||
        pedido.status === 'em-producao' ||
        pedido.status === 'pronto' ||
        pedido.status === 'entregue',
    ).length;

  const producaoIniciada =
    pedidos.filter(
      (pedido) =>
        pedido.status === 'em-producao' ||
        pedido.status === 'pronto' ||
        pedido.status === 'entregue',
    ).length;

  const pedidosProntos =
    pedidos.filter(
      (pedido) =>
        pedido.status === 'pronto' ||
        pedido.status === 'entregue',
    ).length;

  const avancarPedido = async (
    pedido: PedidoFila,
  ) => {
    const proximoStatus =
      obterProximoStatus(pedido.status);

    if (!proximoStatus) {
      return;
    }

    setProcessandoId(pedido.id);
    setErro(null);

    try {
      const pedidoAtualizado =
        await atualizarStatusPedido(
          pedido.id,
          proximoStatus,
        );

      setPedidos((pedidosAtuais) =>
        pedidosAtuais.map(
          (pedidoAtual) =>
            pedidoAtual.id === pedido.id
              ? normalizarPedido(
                  pedidoAtualizado,
                )
              : pedidoAtual,
        ),
      );
    } catch (erroAtualizacao) {
      console.error(
        'Erro ao atualizar status:',
        erroAtualizacao,
      );

      window.alert(
        'Não foi possível atualizar o pedido. Tente novamente.',
      );
    } finally {
      setProcessandoId(null);
    }
  };

  const removerPedido = async (
    pedido: PedidoFila,
  ) => {
    const confirmou = window.confirm(
      `Deseja realmente remover o pedido ${pedido.codigo}?`,
    );

    if (!confirmou) {
      return;
    }

    setProcessandoId(pedido.id);

    try {
      await removerPedidoBanco(
        pedido.id,
      );

      setPedidos((pedidosAtuais) =>
        pedidosAtuais.filter(
          (pedidoAtual) =>
            pedidoAtual.id !== pedido.id,
        ),
      );

      setFotosPorPedido(
        (fotosAtuais) => {
          const atualizadas = {
            ...fotosAtuais,
          };

          delete atualizadas[pedido.id];

          return atualizadas;
        },
      );
    } catch (erroRemocao) {
      console.error(
        'Erro ao remover pedido:',
        erroRemocao,
      );

      window.alert(
        'Não foi possível remover o pedido.',
      );
    } finally {
      setProcessandoId(null);
    }
  };

  const baixarFoto = async (
    pedido: PedidoFila,
    foto: FotoVisual,
  ) => {
    const chave = `${pedido.id}-${foto.id}`;

    setBaixandoId(chave);

    try {
      await baixarArquivo(
        foto.storagePath,
        montarNomeDownload(
          pedido.codigo,
          foto.produto,
          foto.posicao,
          foto.fileName,
        ),
      );
    } catch (erroDownload) {
      console.error(
        'Erro ao baixar foto:',
        erroDownload,
      );

      window.alert(
        'Não foi possível baixar esta foto.',
      );
    } finally {
      setBaixandoId(null);
    }
  };

  const baixarTodasAsFotos = async (
    pedido: PedidoFila,
  ) => {
    const fotos =
      fotosPorPedido[pedido.id] ?? [];

    if (fotos.length === 0) {
      window.alert(
        'Este pedido não possui fotos disponíveis para download.',
      );

      return;
    }

    setBaixandoId(pedido.id);

    try {
      const zip = new JSZip();
      const pastaPedido = zip.folder(pedido.codigo);

      if (!pastaPedido) {
        throw new Error(
          'Não foi possível criar a pasta do pedido no ZIP.',
        );
      }

      const contadoresPorProduto: Record<string, number> = {};

      for (const foto of fotos) {
        const { data, error } = await supabase.storage
          .from(BUCKET_FOTOS)
          .download(foto.storagePath);

        if (error || !data) {
          throw error ?? new Error(
            `Não foi possível baixar ${foto.fileName}.`,
          );
        }

        const nomePastaProduto =
          limparNomePasta(foto.produto);

        const pastaProduto =
          pastaPedido.folder(nomePastaProduto);

        if (!pastaProduto) {
          throw new Error(
            `Não foi possível criar a pasta ${nomePastaProduto}.`,
          );
        }

        contadoresPorProduto[nomePastaProduto] =
          (contadoresPorProduto[nomePastaProduto] ?? 0) + 1;

        const numeroFoto =
          contadoresPorProduto[nomePastaProduto];

        const extensao = obterExtensaoArquivo(
          foto.fileName,
          data.type,
        );

        pastaProduto.file(
          `Foto ${numeroFoto}.${extensao}`,
          data,
        );
      }

      const arquivoZip = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
      });

      const url = URL.createObjectURL(arquivoZip);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${pedido.codigo}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (erroDownload) {
      console.error(
        'Erro ao criar ZIP do pedido:',
        erroDownload,
      );

      window.alert(
        'Não foi possível criar o ZIP com as fotos deste pedido.',
      );
    } finally {
      setBaixandoId(null);
    }
  };

  const fotoAtualAmpliada = useMemo(() => {
    if (!fotoAmpliada) {
      return null;
    }

    const fotos =
      fotosPorPedido[fotoAmpliada.pedidoId] ?? [];

    return fotos[fotoAmpliada.indice] ?? null;
  }, [fotoAmpliada, fotosPorPedido]);

  const quantidadeFotosAmpliadas = useMemo(() => {
    if (!fotoAmpliada) {
      return 0;
    }

    return (
      fotosPorPedido[fotoAmpliada.pedidoId]?.length ??
      0
    );
  }, [fotoAmpliada, fotosPorPedido]);

  const mostrarFotoAnterior = () => {
    if (!fotoAmpliada || quantidadeFotosAmpliadas === 0) {
      return;
    }

    setFotoAmpliada((atual) => {
      if (!atual) {
        return null;
      }

      return {
        ...atual,
        indice:
          atual.indice === 0
            ? quantidadeFotosAmpliadas - 1
            : atual.indice - 1,
      };
    });
  };

  const mostrarProximaFoto = () => {
    if (!fotoAmpliada || quantidadeFotosAmpliadas === 0) {
      return;
    }

    setFotoAmpliada((atual) => {
      if (!atual) {
        return null;
      }

      return {
        ...atual,
        indice:
          atual.indice === quantidadeFotosAmpliadas - 1
            ? 0
            : atual.indice + 1,
      };
    });
  };

  const alternarSom = () => {
    const novoValor = !somAtivo;

    setSomAtivo(novoValor);

    if (novoValor) {
      tocarSomNovoPedido();
    }
  };

  const limparFilaDeTestes = async () => {
    if (pedidos.length === 0) {
      window.alert(
        'A fila já está vazia.',
      );

      return;
    }

    const confirmou = window.confirm(
      `Esta ação apagará os ${pedidos.length} pedidos do banco. Deseja continuar?`,
    );

    if (!confirmou) {
      return;
    }

    const confirmouNovamente =
      window.confirm(
        'Confirme novamente: apagar definitivamente toda a fila?',
      );

    if (!confirmouNovamente) {
      return;
    }

    setLimpandoFila(true);

    try {
      await Promise.all(
        pedidos.map((pedido) =>
          removerPedidoBanco(pedido.id),
        ),
      );

      setPedidos([]);
      setFotosPorPedido({});
    } catch (erroLimpeza) {
      console.error(
        'Erro ao limpar fila:',
        erroLimpeza,
      );

      window.alert(
        'Não foi possível apagar toda a fila.',
      );

      await carregarFila();
    } finally {
      setLimpandoFila(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-2 pb-10 sm:px-5">
      <header className="mb-5 rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-5 shadow-[0_12px_28px_rgba(107,62,20,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#8A5A2B]">
              <span className="h-2 w-2 rounded-full bg-[#E7A29A]" />
              PRODUÇÃO
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#4A2A12] sm:text-3xl">
              Fila de produção
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#7B5A3A]">
              Confirme o pagamento, baixe as fotos e acompanhe cada pedido até a entrega. Pedidos prontos e em produção aparecem primeiro.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D7EBD9] bg-[#F7FFF8] px-3 py-1.5 font-semibold text-[#2F7A3E]">
                <span className={`h-2 w-2 rounded-full ${
                  atualizandoAutomaticamente
                    ? 'animate-pulse bg-[#B97822]'
                    : 'bg-[#2F7A3E]'
                }`} />
                {atualizandoAutomaticamente
                  ? 'Atualizando pedidos...'
                  : 'Atualização automática ativa'}
              </span>

              {ultimaAtualizacao && (
                <span className="text-[#9A8067]">
                  Última atualização:{' '}
                  {ultimaAtualizacao.toLocaleTimeString(
                    'pt-BR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    },
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={
                carregando ||
                atualizandoAutomaticamente ||
                limpandoFila
              }
              onClick={() =>
                void carregarFila(true)
              }
              className="h-11 rounded-full border border-[#8F5528] bg-white px-5 text-sm font-bold text-[#6B3E14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ||
              atualizandoAutomaticamente
                ? 'ATUALIZANDO...'
                : 'ATUALIZAR AGORA'}
            </button>

            <button
              type="button"
              onClick={alternarSom}
              className={`h-11 rounded-full border px-5 text-sm font-bold ${
                somAtivo
                  ? 'border-[#2F7A3E] bg-[#F1FFF4] text-[#2F7A3E]'
                  : 'border-[#D8C4AA] bg-white text-[#8A6B4E]'
              }`}
            >
              {somAtivo
                ? 'SOM ATIVO'
                : 'ATIVAR SOM'}
            </button>

            <button
              type="button"
              disabled={
                carregando ||
                limpandoFila
              }
              onClick={() =>
                void limparFilaDeTestes()
              }
              className="h-11 rounded-full border border-[#C87B70] bg-white px-5 text-sm font-bold text-[#A3483E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {limpandoFila
                ? 'LIMPANDO...'
                : 'LIMPAR FILA DE TESTES'}
            </button>
          </div>
        </div>
      </header>

      {erro && (
        <div className="mb-5 rounded-[20px] border border-[#E7B8B1] bg-[#FFF3F1] p-4 text-sm font-semibold text-[#A3483E]">
          {erro}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-[20px] border border-[#E8D2AD] bg-[#FFFDF9] p-4">
          <div className="text-xs text-[#9A8067]">
            Aguardando pagamento
          </div>

          <div className="mt-1 text-2xl font-bold text-[#9A641B]">
            {aguardandoPagamento}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#C8DDF3] bg-[#FFFDF9] p-4">
          <div className="text-xs text-[#9A8067]">
            Pagamento confirmado
          </div>

          <div className="mt-1 text-2xl font-bold text-[#28618E]">
            {pagamentosConfirmados}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#D7CCEF] bg-[#FFFDF9] p-4">
          <div className="text-xs text-[#9A8067]">
            Em produção
          </div>

          <div className="mt-1 text-2xl font-bold text-[#6848A0]">
            {producaoIniciada}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#CDE8D2] bg-[#FFFDF9] p-4">
          <div className="text-xs text-[#9A8067]">
            Prontos
          </div>

          <div className="mt-1 text-2xl font-bold text-[#2F7A3E]">
            {pedidosProntos}
          </div>
        </div>

        <div className="col-span-2 rounded-[20px] border border-[#E9DDCC] bg-white p-4 sm:col-span-1">
          <div className="text-xs text-[#9A8067]">
            Total na fila
          </div>

          <div className="mt-1 text-2xl font-bold text-[#4A2A12]">
            {pedidosAtivos.length}
          </div>
        </div>
      </div>

      <section className="mb-5 rounded-[22px] border border-[#E9DDCC] bg-white p-3 shadow-[0_8px_20px_rgba(107,62,20,0.04)]">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9A8067]">
          Exibir pedidos
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            {
              id: 'todos' as FiltroFila,
              label: 'Todos',
              quantidade:
                pedidosAtivos.length,
            },
            {
              id: 'aguardando-pagamento' as FiltroFila,
              label: 'Aguardando',
              quantidade:
                aguardandoPagamento,
            },
            {
              id: 'pago' as FiltroFila,
              label: 'Pagamento confirmado',
              quantidade:
                pagamentosConfirmadosAtuais,
            },
            {
              id: 'em-producao' as FiltroFila,
              label: 'Em produção',
              quantidade:
                emProducaoAtuais,
            },
            {
              id: 'pronto' as FiltroFila,
              label: 'Prontos',
              quantidade:
                prontosAtuais,
            },
          ].map((filtro) => (
            <button
              key={filtro.id}
              type="button"
              onClick={() =>
                setFiltroFila(filtro.id)
              }
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                filtroFila === filtro.id
                  ? 'border-[#4A2A12] bg-[#4A2A12] text-white'
                  : 'border-[#E2D3C0] bg-[#FFFDF9] text-[#6B3E14] hover:border-[#8F5528]'
              }`}
            >
              {filtro.label} ({filtro.quantidade})
            </button>
          ))}
        </div>
      </section>

      {carregando ? (
        <div className="rounded-[26px] border border-[#E9DDCC] bg-white p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#E9DDCC] border-t-[#8F5528]" />

          <p className="mt-4 font-bold text-[#4A2A12]">
            Carregando pedidos...
          </p>
        </div>
      ) : pedidosVisiveis.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-[#DFC8AA] bg-white/80 p-10 text-center">
          <div className="text-4xl">
            ✓
          </div>

          <h2 className="mt-3 text-lg font-bold text-[#4A2A12]">
            Nenhum pedido neste filtro
          </h2>

          <p className="mt-2 text-sm text-[#8A6B4E]">
            Escolha outro filtro ou aguarde a chegada de novos pedidos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosVisiveis.map(
            (pedido, index) => {
              const fotosPedido =
                fotosPorPedido[pedido.id] ?? [];

              return (
                <article
                  key={pedido.id}
                  className={`rounded-[24px] border bg-white p-4 shadow-[0_8px_20px_rgba(107,62,20,0.05)] transition-all duration-500 sm:p-5 ${
                    pedidosNovos.has(pedido.id)
                      ? 'ring-4 ring-[#F2C94C]/50 bg-[#FFFBEA]'
                      : ''
                  } ${estiloCard(
                    pedido.status,
                  )}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#4A2A12] px-2.5 py-1 text-[10px] font-bold text-white">
                          FILA {index + 1}
                        </span>

                        {pedidosNovos.has(
                          pedido.id,
                        ) && (
                          <span className="animate-pulse rounded-full bg-[#F2C94C] px-2.5 py-1 text-[10px] font-extrabold text-[#4A2A12]">
                            NOVO PEDIDO
                          </span>
                        )}

                        <h2 className="text-2xl font-extrabold text-[#4A2A12]">
                          {pedido.codigo}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${estiloStatus(
                            pedido.status,
                          )}`}
                        >
                          {
                            nomesStatus[
                              pedido.status
                            ]
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#9A8067]">
                        Recebido em{' '}
                        {formatarData(
                          pedido.criadoEm,
                        )}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#B97822]">
                        {formatarTempoEspera(
                          pedido.criadoEm,
                          agora,
                        )}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#6B3E14]">
                        Pagamento:{' '}
                        {
                          nomesPagamento[
                            pedido.formaPagamento
                          ]
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-[#FFF8F0] px-3 py-2 text-center">
                        <div className="text-[10px] text-[#9A8067]">
                          Produtos
                        </div>

                        <div className="font-bold text-[#4A2A12]">
                          {pedido.totalProdutos}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#FFF8F0] px-3 py-2 text-center">
                        <div className="text-[10px] text-[#9A8067]">
                          Unidades
                        </div>

                        <div className="font-bold text-[#4A2A12]">
                          {pedido.totalItens}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#FFF8F0] px-3 py-2 text-center">
                        <div className="text-[10px] text-[#9A8067]">
                          Fotos
                        </div>

                        <div className="font-bold text-[#4A2A12]">
                          {fotosPedido.length}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#E2C59F] bg-[#FFF8F0] px-3 py-2 text-center">
                        <div className="text-[10px] text-[#9A8067]">
                          Total a cobrar
                        </div>

                        <div className="font-extrabold text-[#6B3E14]">
                          {pedido.totalPedido > 0
                            ? formatarMoeda(
                                pedido.totalPedido,
                              )
                            : 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {pedido.itens.length > 0 ? (
                      pedido.itens.map(
                        (item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border border-[#F2E4D2] bg-[#FFFDF9] px-3 py-2"
                          >
                            <span className="text-sm font-semibold text-[#4A2A12]">
                              {item.title}
                            </span>

                            <div className="text-right">
                              <div className="text-sm font-bold text-[#8F5528]">
                                {item.quantidade} un.
                              </div>

                              {typeof item.preco === 'number' && (
                                <div className="mt-0.5 text-xs font-extrabold text-[#6B3E14]">
                                  {formatarMoeda(
                                    item.preco *
                                      item.quantidade,
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#E9DDCC] bg-[#FFFDF9] px-3 py-3 text-sm text-[#9A8067]">
                        Produtos não encontrados nos dados do pedido.
                      </div>
                    )}
                  </div>

                  <section className="mt-4 rounded-[20px] border border-[#E9DDCC] bg-[#FFFDF9] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#4A2A12]">
                          Fotos para produção
                        </h3>

                        <p className="mt-1 text-xs text-[#8A6B4E]">
                          Clique para ampliar, baixe uma foto ou gere um ZIP organizado para o CorelDRAW.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          fotosPedido.length === 0 ||
                          baixandoId === pedido.id
                        }
                        onClick={() =>
                          void baixarTodasAsFotos(
                            pedido,
                          )
                        }
                        className="h-10 rounded-full bg-[#4A2A12] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {baixandoId === pedido.id
                          ? 'BAIXANDO...'
                          : `BAIXAR ZIP (${fotosPedido.length})`}
                      </button>
                    </div>

                    {fotosPedido.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-[#DFC8AA] bg-white p-4 text-center text-sm text-[#9A8067]">
                        Este pedido não possui caminhos de fotos salvos. Pedidos criados antes da correção do Pagamento não mostrarão imagens aqui.
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {fotosPedido.map((foto) => {
                          const chaveDownload =
                            `${pedido.id}-${foto.id}`;

                          return (
                            <div
                              key={foto.id}
                              className="overflow-hidden rounded-[16px] border border-[#E9DDCC] bg-white"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setFotoAmpliada({
                                    pedidoId: pedido.id,
                                    indice: fotosPedido.findIndex(
                                      (item) => item.id === foto.id,
                                    ),
                                  })
                                }
                                className="block aspect-square w-full overflow-hidden bg-[#F7E9D8]"
                              >
                                <img
                                  src={foto.previewUrl}
                                  alt={foto.fileName}
                                  className="h-full w-full object-cover transition hover:scale-[1.03]"
                                />
                              </button>

                              <div className="p-2">
                                <div className="truncate text-xs font-bold text-[#4A2A12]">
                                  {foto.produto}
                                </div>

                                <div className="mt-0.5 truncate text-[10px] text-[#9A8067]">
                                  {foto.fileName}
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    baixandoId ===
                                    chaveDownload
                                  }
                                  onClick={() =>
                                    void baixarFoto(
                                      pedido,
                                      foto,
                                    )
                                  }
                                  className="mt-2 h-9 w-full rounded-full border border-[#8F5528] bg-white text-[11px] font-bold text-[#6B3E14] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {baixandoId ===
                                  chaveDownload
                                    ? 'BAIXANDO...'
                                    : 'BAIXAR FOTO'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={
                        processandoId ===
                        pedido.id
                      }
                      onClick={() =>
                        void avancarPedido(
                          pedido,
                        )
                      }
                      className={`h-11 flex-1 rounded-full px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${estiloBotao(
                        pedido.status,
                      )}`}
                    >
                      {processandoId ===
                      pedido.id
                        ? 'ATUALIZANDO...'
                        : textoBotao(
                            pedido.status,
                          )}
                    </button>

                    <button
                      type="button"
                      disabled={
                        processandoId ===
                        pedido.id
                      }
                      onClick={() =>
                        void removerPedido(
                          pedido,
                        )
                      }
                      className="h-11 rounded-full border border-[#D8C4AA] bg-white px-5 text-sm font-bold text-[#8A6B4E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      REMOVER
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      {pedidosEntregues.length > 0 && (
        <details className="mt-6 rounded-[22px] border border-[#E9DDCC] bg-white p-4">
          <summary className="cursor-pointer font-bold text-[#4A2A12]">
            Pedidos entregues (
            {pedidosEntregues.length})
          </summary>

          <div className="mt-4 space-y-2">
            {pedidosEntregues.map(
              (pedido) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between rounded-xl bg-[#F7F3EE] p-3"
                >
                  <div>
                    <div className="font-bold text-[#4A2A12]">
                      {pedido.codigo}
                    </div>

                    <div className="text-xs text-[#8A6B4E]">
                      {pedido.totalItens}{' '}
                      unidades ·{' '}
                      {pedido.totalPedido > 0
                        ? formatarMoeda(
                            pedido.totalPedido,
                          )
                        : 'Valor não informado'}{' '}
                      ·{' '}
                      {formatarData(
                        pedido.atualizadoEm,
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      processandoId ===
                      pedido.id
                    }
                    onClick={() =>
                      void removerPedido(
                        pedido,
                      )
                    }
                    className="text-xs font-bold text-[#9A6F50] disabled:opacity-50"
                  >
                    REMOVER
                  </button>
                </div>
              ),
            )}
          </div>
        </details>
      )}

      {fotoAmpliada && fotoAtualAmpliada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada da foto"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() =>
            setFotoAmpliada(null)
          }
        >
          <div
            className="relative max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[24px] bg-white p-3 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={() =>
                setFotoAmpliada(null)
              }
              className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-bold text-[#4A2A12] shadow-lg"
              aria-label="Fechar imagem"
            >
              ×
            </button>

            <div className="relative flex max-h-[76vh] items-center justify-center overflow-hidden rounded-[18px] bg-[#F7F3EE]">
              {quantidadeFotosAmpliadas > 1 && (
                <button
                  type="button"
                  onClick={mostrarFotoAnterior}
                  className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-[#4A2A12] shadow-lg"
                  aria-label="Foto anterior"
                >
                  ‹
                </button>
              )}

              <img
                src={fotoAtualAmpliada.previewUrl}
                alt={fotoAtualAmpliada.fileName}
                className="max-h-[76vh] max-w-full object-contain"
              />

              {quantidadeFotosAmpliadas > 1 && (
                <button
                  type="button"
                  onClick={mostrarProximaFoto}
                  className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-[#4A2A12] shadow-lg"
                  aria-label="Próxima foto"
                >
                  ›
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 px-2 pb-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-bold text-[#4A2A12]">
                  {fotoAtualAmpliada.produto}
                </div>

                <div className="mt-1 text-sm text-[#8A6B4E]">
                  {fotoAtualAmpliada.fileName}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#FFF4E8] px-3 py-1.5 text-xs font-bold text-[#6B3E14]">
                  {fotoAmpliada.indice + 1}/
                  {quantidadeFotosAmpliadas}
                </span>

                <span className="hidden text-xs text-[#9A8067] sm:inline">
                  Use ← → para navegar e Esc para fechar
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fila;