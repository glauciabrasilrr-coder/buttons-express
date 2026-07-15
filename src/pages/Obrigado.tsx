import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductIllustration, {
  type ProductIllustrationType,
} from '../components/ProductIllustration';
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
  storagePath?: string | null;
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

type FormaPagamento = 'pix' | 'credito' | 'debito' | 'dinheiro';

type LocationState = {
  itens?: ItemPedido[];
  gruposFotos?: GrupoFoto[];
  totalItens?: number;
  totalFotos?: number;
  totalPedido?: number;
  formaPagamento?: FormaPagamento;
  statusPagamento?: string;
  codigoPedido?: string;
  pedidoId?: string;
  statusPedido?: string;
};

const PEDIDO_STORAGE_KEY = 'buttons-express-pedido';
const CONFIG_STORAGE_KEY = 'buttons-express-fotos-config';
const FOTOS_STORAGE_KEY = 'buttons-express-fotos-supabase';
const RASCUNHO_STORAGE_KEY = 'buttons-express-rascunho-id';
const STORAGE_ANTIGO_KEY = 'buttons-express-fotos';

const nomesPagamento: Record<FormaPagamento, string> = {
  pix: 'Pix',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
};

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

function limparDadosDoPedidoAtual(): void {
  localStorage.removeItem(PEDIDO_STORAGE_KEY);
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  localStorage.removeItem(FOTOS_STORAGE_KEY);
  localStorage.removeItem(RASCUNHO_STORAGE_KEY);
  localStorage.removeItem(STORAGE_ANTIGO_KEY);
}

function Obrigado() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const itensPedido = useMemo(() => {
    if (state?.itens && state.itens.length > 0) {
      return state.itens;
    }

    return lerPedidoSalvo();
  }, [state]);

  const totalProdutos = itensPedido.length;

  const totalUnidades = useMemo(
    () =>
      state?.totalItens ??
      itensPedido.reduce(
        (total, item) => total + item.quantidade,
        0,
      ),
    [itensPedido, state],
  );

  const totalFotos =
    state?.totalFotos ??
    state?.gruposFotos?.reduce(
      (total, grupo) =>
        total +
        grupo.fotos.filter(
          (foto) => foto.storagePath || foto.previewUrl,
        ).length,
      0,
    ) ??
    0;

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

  const formaPagamento = state?.formaPagamento
    ? nomesPagamento[state.formaPagamento]
    : 'Não informada';

  const codigoPedido = state?.codigoPedido ?? 'Não disponível';

  const iniciarNovoPedido = () => {
    limparDadosDoPedidoAtual();
    navigate('/produtos', { replace: true });
  };

  const voltarAoInicio = () => {
    limparDadosDoPedidoAtual();
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl items-start justify-center px-2 py-3 sm:min-h-[70vh] sm:items-center sm:px-5 sm:py-6 lg:px-8">
      <div className="w-full overflow-hidden rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-4 shadow-[0_16px_36px_rgba(107,62,20,0.08)] sm:rounded-[32px] sm:p-7 lg:p-8">
        <div className="mx-auto grid max-w-4xl items-center gap-4 sm:gap-6 lg:grid-cols-[0.68fr_1.32fr]">
          <div className="hidden items-end justify-center self-end lg:flex">
            <img
              src="/assets/brand/mascote-oficial.png"
              alt="Mascote oficial da Bem Bolado"
              className="max-h-[430px] w-full max-w-[300px] object-contain drop-shadow-[0_18px_25px_rgba(107,62,20,0.14)]"
            />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#EBDDCB] bg-white shadow-[0_10px_24px_rgba(107,62,20,0.07)] sm:h-20 sm:w-20">
              <div className="w-9 sm:w-12">
                <ProductIllustration productType="thanks" />
              </div>
            </div>

            <h1 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.02em] text-[#4A2A12] sm:mt-5 sm:text-[2.2rem]">
              Pedido recebido com sucesso!
            </h1>

            <p className="mt-2 max-w-xl text-[0.88rem] leading-6 text-[#7B5A3A] sm:mt-3 sm:text-[0.95rem] sm:leading-7">
              Guarde o código abaixo. Ele identifica seu pedido e será usado
              para chamar você quando estiver pronto.
            </p>

            <div className="mt-4 w-full rounded-[22px] border-2 border-[#8F5528] bg-white p-4 shadow-[0_10px_24px_rgba(107,62,20,0.08)] sm:mt-5 sm:rounded-[24px] sm:p-5">
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#B59677]">
                Código do pedido
              </div>

              <div className="mt-1 text-[2.55rem] font-extrabold tracking-[0.08em] text-[#6B3E14] sm:mt-2 sm:text-4xl">
                {codigoPedido}
              </div>

              <p className="mt-1 text-[11px] leading-5 text-[#8A6B4E] sm:mt-2 sm:text-xs">
                Apresente este código no caixa e acompanhe a chamada.
              </p>
            </div>

            <div className="mt-3 w-full rounded-[20px] border-2 border-[#8F5528] bg-white px-4 py-3 text-center shadow-[0_8px_18px_rgba(107,62,20,0.08)]">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B59677]">
                Valor do pedido
              </div>

              <div className="mt-1 text-3xl font-extrabold text-[#6B3E14]">
                {formatarMoeda(totalPedido)}
              </div>
            </div>

            <div className="mt-3 w-full rounded-[18px] border-2 border-[#C97920] bg-[#FFF3DF] px-4 py-3 text-left shadow-[0_8px_18px_rgba(185,120,34,0.10)]">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C97920] text-base font-extrabold text-white">
                  !
                </div>

                <div>
                  <p className="text-sm font-extrabold uppercase leading-5 text-[#8A4E10]">
                    Pagamento obrigatório no caixa
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[#7B5A3A]">
                    Apresente o código acima e pague {formatarMoeda(totalPedido)}.
                    O pedido só entra em produção depois da confirmação.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid w-full grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-3">
              <div className="rounded-[18px] border border-[#F2E4D2] bg-white/80 px-3 py-2 sm:rounded-[20px] sm:p-3">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[#B59677]">
                  Produtos
                </div>
                <div className="mt-1 text-[1.1rem] font-semibold text-[#4A2A12]">
                  {totalProdutos}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#F2E4D2] bg-white/80 px-3 py-2 sm:rounded-[20px] sm:p-3">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[#B59677]">
                  Unidades
                </div>
                <div className="mt-1 text-[1.1rem] font-semibold text-[#4A2A12]">
                  {totalUnidades}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#F2E4D2] bg-white/80 px-3 py-2 sm:rounded-[20px] sm:p-3">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[#B59677]">
                  Fotos
                </div>
                <div className="mt-1 text-[1.1rem] font-semibold text-[#4A2A12]">
                  {totalFotos}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#F2E4D2] bg-white/80 px-3 py-2 sm:rounded-[20px] sm:p-3">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[#B59677]">
                  Pagamento
                </div>
                <div className="mt-1 text-sm font-bold text-[#4A2A12]">
                  {formaPagamento}
                </div>
              </div>
            </div>

            <p className="mt-3 text-[0.82rem] leading-5 text-[#8A5A2B] sm:mt-4 sm:text-[0.88rem] sm:leading-6">
              Aguarde ser chamado pelo código do seu pedido.
            </p>

            <div className="mt-3 flex w-full flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={voltarAoInicio}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-[#E9DDCC] bg-white px-5 text-sm font-semibold text-[#6B3E14] sm:h-[48px] sm:text-[0.95rem]"
              >
                Voltar ao início
              </button>

              <button
                type="button"
                onClick={iniciarNovoPedido}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-[#8F5528] to-[#6B3E14] px-5 text-sm font-semibold text-white sm:h-[48px] sm:text-[0.95rem]"
              >
                Novo pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Obrigado;