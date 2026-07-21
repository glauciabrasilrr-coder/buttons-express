// src/services/pagamentos.ts
export type RespostaCobranca = {
  paymentId: number;
  status: string;
  pix: {
    qrCode: string;
    qrCodeBase64: string;
  } | null;
};

export async function criarCobrancaPix(
  codigoPedido: string,
  valor: number,
): Promise<RespostaCobranca> {
  const resposta = await fetch('/api/pagamentos/criar-cobranca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigoPedido,
      valor,
      formaPagamento: 'pix',
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível gerar o Pix.');
  }

  return dados as RespostaCobranca;
}

export async function criarCobrancaCartao(
  codigoPedido: string,
  valor: number,
  cardToken: string,
  paymentMethodId: string,
  issuerId: string,
  installments: number,
): Promise<RespostaCobranca> {
  const resposta = await fetch('/api/pagamentos/criar-cobranca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigoPedido,
      valor,
      formaPagamento: 'cartao',
      cardToken,
      paymentMethodId,
      issuerId,
      installments,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível processar o cartão.');
  }

  return dados as RespostaCobranca;
}

export async function consultarStatusPagamento(
  paymentId: number,
): Promise<string> {
  const resposta = await fetch(`/api/pagamentos/status?id=${paymentId}`);
  const dados = await resposta.json();
  return dados.status as string;
}
