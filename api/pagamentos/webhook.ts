import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.status(200).send('ok');
    return;
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    console.error('Webhook sem variáveis de ambiente configuradas.');
    res.status(500).send('erro de configuração');
    return;
  }

  try {
    const paymentId =
      req.body?.data?.id ||
      req.query?.['data.id'] ||
      req.query?.id;

    if (!paymentId) {
      res.status(200).send('sem id, ignorado');
      return;
    }

    const respostaPagamento = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const pagamento = await respostaPagamento.json();

    if (!respostaPagamento.ok) {
      console.error('Não foi possível consultar o pagamento:', pagamento);
      res.status(200).send('erro ao consultar, ignorado');
      return;
    }

    const codigoPedido = pagamento.external_reference;
    const statusPagamento = pagamento.status;

    if (!codigoPedido) {
      res.status(200).send('sem pedido associado');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (statusPagamento === 'approved') {
      const { error } = await supabaseAdmin
        .from('pedidos')
        .update({
          status: 'pago',
          status_pagamento: 'confirmado',
          atualizado_em: new Date().toISOString(),
        })
        .eq('codigo', codigoPedido);

      if (error) {
        console.error('Erro ao atualizar pedido pago:', error);
      }
    } else if (statusPagamento === 'rejected') {
      const { error } = await supabaseAdmin
        .from('pedidos')
        .update({
          status_pagamento: 'recusado',
          atualizado_em: new Date().toISOString(),
        })
        .eq('codigo', codigoPedido);

      if (error) {
        console.error('Erro ao marcar pedido recusado:', error);
      }
    }

    res.status(200).send('ok');
  } catch (erro) {
    console.error('Erro inesperado no webhook:', erro);
    res.status(200).send('erro tratado');
  }
}
