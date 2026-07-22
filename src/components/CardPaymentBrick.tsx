// src/components/CardPaymentBrick.tsx
//
// Mostra o formulário de cartão pronto do Mercado Pago (número,
// validade, CVV, nome do titular) usando o SDK carregado no
// index.html (window.MercadoPago). Os dados do cartão nunca passam
// pelo seu servidor — o Mercado Pago transforma tudo num "token"
// seguro antes de qualquer coisa chegar no seu código.

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MercadoPago: new (
      publicKey: string,
      opcoes?: { locale?: string },
    ) => {
      bricks: () => {
        create: (
          tipo: string,
          containerId: string,
          settings: unknown,
        ) => Promise<{ unmount?: () => void }>;
      };
    };
  }
}

type DadosCartao = {
  token: string;
  paymentMethodId: string;
  issuerId: string;
  installments: number;
};

type CardFormData = {
  token: string;
  payment_method_id: string;
  issuer_id: string;
  installments: number | string;
};

type Props = {
  valor: number;
  onPagamentoCriado: (dados: DadosCartao) => Promise<void>;
  onErro: (mensagem: string) => void;
};

const CONTAINER_ID = 'cardPaymentBrick_container';

export default function CardPaymentBrick({
  valor,
  onPagamentoCriado,
  onErro,
}: Props) {
  const jaMontadoRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    let controlador: { unmount?: () => void } | null = null;

    async function montarFormulario() {
      if (jaMontadoRef.current) {
        return;
      }

      // O script do Mercado Pago é carregado no index.html. Espera
      // ele ficar disponível (pode levar um instante em wifi ruim).
      let tentativas = 0;
      while (!window.MercadoPago && tentativas < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        tentativas += 1;
      }

      if (cancelado) {
        return;
      }

      if (!window.MercadoPago) {
        onErro(
          'Não foi possível carregar o formulário de cartão. Verifique sua internet e tente novamente.',
        );
        return;
      }

      const publicKey = (import.meta as unknown as {
        env: Record<string, string | undefined>;
      }).env.VITE_MERCADO_PAGO_PUBLIC_KEY;

      if (!publicKey) {
        onErro(
          'Configuração de pagamento por cartão incompleta. Fale com quem cuida do sistema.',
        );
        return;
      }

      const mp = new window.MercadoPago(publicKey, {
        locale: 'pt-BR',
      });

      controlador = await mp.bricks().create(
        'cardPayment',
        CONTAINER_ID,
        {
          initialization: { amount: valor },
          customization: {
            visual: { style: { theme: 'default' } },
          },
          callbacks: {
            onReady: () => undefined,
            onError: (erro: unknown) => {
              console.error(
                'Erro no formulário de cartão:',
                erro,
              );
              onErro(
                'Não foi possível carregar o formulário de cartão.',
              );
            },
            onSubmit: (cardFormData: CardFormData) =>
              onPagamentoCriado({
                token: cardFormData.token,
                paymentMethodId: cardFormData.payment_method_id,
                issuerId: cardFormData.issuer_id,
                installments:
                  Number(cardFormData.installments) || 1,
              }),
          },
        },
      );

      jaMontadoRef.current = true;
    }

    montarFormulario();

    return () => {
      cancelado = true;

      if (controlador?.unmount) {
        controlador.unmount();
      }

      jaMontadoRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return <div id={CONTAINER_ID} />;
}
