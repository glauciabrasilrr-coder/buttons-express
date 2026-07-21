import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const paymentId = req.query.id;

  if (!accessToken) {
    res.status(500).json({ erro: 'Access token não configurado.' });
    return;
  }

  if (!paymentId) {
    res.status(400).json({ erro: 'Informe o id do pagamento.' });
    return;
  }

  try {
    const resposta = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      res.status(resposta.status).json({ erro: 'Pagamento não encontrado.' });
      return;
    }

    res.status(200).json({ status: dados.status });
  } catch (erro) {
    console.error('Erro ao consultar status:', erro);
    res.status(500).json({ erro: 'Falha ao consultar status do pagamento.' });
  }
}
