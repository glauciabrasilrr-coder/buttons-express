import type { VercelRequest, VercelResponse } from '@vercel/node';

const MP_API = 'https://api.mercadopago.com/v1/payments';

type CorpoRequisicao = {
  codigoPedido: string;
  valor: number;
  emailComprador?: string;
  formaPagamento: 'pix' | 'cartao';
  cardToken?: string;
  installments?: number;
  paymentMethodId?: string;
  issuerId?: string;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(500).json({ erro: 'Access token do Mercado Pago não configurado no servidor.' });
    return;
  }

  const corpo = req.body as CorpoRequisicao;

  if (!corpo?.codigoPedido || !corpo?.valor || !corpo?.formaPagamento) {
    res.status(400).json({ erro: 'Dados incompletos para gerar a cobrança.' });
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      transaction_amount: corpo.valor,
      description: `Pedido ${corpo.codigoPedido} - Buttons Express`,
      external_reference: corpo.codigoPedido,
      payer: {
        email: corpo.emailComprador || 'cliente@buttonsexpress.com.br',
      },
    };

    if (corpo.formaPagamento === 'pix') {
      payload.payment_method_id = 'pix';
    } else {
      payload.token = corpo.cardToken;
      payload.installments = corpo.installments ?? 1;
      payload.payment_method_id = corpo.paymentMethodId;
      payload.issuer_id = corpo.issuerId;
    }

    const resposta = await fetch(MP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': `${corpo.codigoPedido}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error('Erro do Mercado Pago:', dados);
      res.status(resposta.status).json({ erro: dados.message || 'Falha ao criar cobrança.' });
      return;
    }

    res.status(200).json({
      paymentId: dados.id,
      status: dados.status,
      pix: dados.point_of_interaction?.transaction_data
        ? {
            qrCode: dados.point_of_interaction.transaction_data.qr_code,
            qrCodeBase64: dados.point_of_interaction.transaction_data.qr_code_base64,
          }
        : null,
    });
  } catch (erro) {
    console.error('Erro inesperado ao criar cobrança:', erro);
    res.status(500).json({ erro: 'Não foi possível processar o pagamento.' });
  }
}
