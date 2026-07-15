import type { ReactNode } from 'react';
import {
  Navigate,
  useLocation,
} from 'react-router-dom';

type ProtectedRouteProps = {
  children: ReactNode;
  redirectTo: string;
  requirePedido?: boolean;
  requireCodigoPedido?: boolean;
};

const PEDIDO_STORAGE_KEY = 'buttons-express-pedido';

function existePedidoSalvo(): boolean {
  try {
    const salvo = localStorage.getItem(
      PEDIDO_STORAGE_KEY,
    );

    if (!salvo) {
      return false;
    }

    const dados = JSON.parse(salvo);

    return Array.isArray(dados) && dados.length > 0;
  } catch {
    return false;
  }
}

function ProtectedRoute({
  children,
  redirectTo,
  requirePedido = false,
  requireCodigoPedido = false,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (
    requirePedido &&
    !existePedidoSalvo()
  ) {
    return (
      <Navigate
        to={redirectTo}
        replace
      />
    );
  }

  if (requireCodigoPedido) {
    const state = location.state as {
      codigoPedido?: string;
    } | null;

    if (!state?.codigoPedido) {
      return (
        <Navigate
          to={redirectTo}
          replace
        />
      );
    }
  }

  return children;
}

export default ProtectedRoute;