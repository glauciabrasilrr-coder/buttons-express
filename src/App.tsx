import {
  Routes,
  Route,
} from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import Produtos from './pages/Produtos';
import Fotos from './pages/Fotos';
import Resumo from './pages/Resumo';
import Pagamento from './pages/Pagamento';
import Obrigado from './pages/Obrigado';
import Fila from './pages/Fila';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/produtos" element={<Produtos />} />

        <Route
          path="/fotos"
          element={
            <ProtectedRoute requirePedido redirectTo="/produtos">
              <Fotos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resumo"
          element={
            <ProtectedRoute requirePedido redirectTo="/produtos">
              <Resumo />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pagamento"
          element={
            <ProtectedRoute requirePedido redirectTo="/resumo">
              <Pagamento />
            </ProtectedRoute>
          }
        />

        <Route
          path="/obrigado"
          element={
            <ProtectedRoute requireCodigoPedido redirectTo="/">
              <Obrigado />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fila"
          element={
            <AdminRoute>
              <Fila />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;