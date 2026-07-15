import { supabase } from '../lib/supabase';

export type FormaPagamento =
  | 'pix'
  | 'credito'
  | 'debito'
  | 'dinheiro';

export type StatusPedido =
  | 'aguardando-pagamento'
  | 'pago'
  | 'em-producao'
  | 'pronto'
  | 'entregue';

export type DadosPedidoBanco = {
  itens?: unknown[];
  gruposFotos?: unknown[];
  totalPedido?: number;
  [chave: string]: unknown;
};

export type PedidoBanco = {
  id: string;
  codigo: string;
  criado_em: string;
  atualizado_em: string;
  status: StatusPedido;
  forma_pagamento: FormaPagamento;
  status_pagamento: string;
  total_produtos: number;
  total_itens: number;
  total_fotos: number;
  dados: DadosPedidoBanco;
};

export type NovoPedidoBanco = {
  codigo: string;
  status: StatusPedido;
  forma_pagamento: FormaPagamento;
  status_pagamento: string;
  total_produtos: number;
  total_itens: number;
  total_fotos: number;
  dados: DadosPedidoBanco;
};

export async function salvarPedido(
  pedido: NovoPedidoBanco,
): Promise<PedidoBanco> {
  const { data, error } = await supabase
    .from('pedidos')
    .insert(pedido)
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar pedido:', error);

    throw new Error(
      `Não foi possível salvar o pedido: ${error.message}`,
    );
  }

  return data as PedidoBanco;
}

export async function listarPedidos(): Promise<PedidoBanco[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('criado_em', {
      ascending: true,
    });

  if (error) {
    console.error('Erro ao buscar pedidos:', error);

    throw new Error(
      `Não foi possível carregar a fila: ${error.message}`,
    );
  }

  return (data ?? []) as PedidoBanco[];
}

function obterStatusPagamento(
  status: StatusPedido,
): string {
  return status === 'aguardando-pagamento'
    ? 'aguardando-confirmacao'
    : 'confirmado';
}

export async function atualizarStatusPedido(
  id: string,
  status: StatusPedido,
): Promise<PedidoBanco> {
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      status,
      status_pagamento:
        obterStatusPagamento(status),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar pedido:', error);

    throw new Error(
      `Não foi possível atualizar o pedido: ${error.message}`,
    );
  }

  return data as PedidoBanco;
}

export async function removerPedidoBanco(
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao remover pedido:', error);

    throw new Error(
      `Não foi possível remover o pedido: ${error.message}`,
    );
  }
}