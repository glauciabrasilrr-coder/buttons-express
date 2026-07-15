import { Link, useParams } from 'react-router-dom';

function Pedido() {
  const { pedidoId } = useParams();

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5">
      <Link
        to="/fila"
        className="inline-flex h-11 items-center rounded-full border border-[#8F5528] bg-white px-5 text-sm font-bold text-[#6B3E14]"
      >
        ← VOLTAR PARA A FILA
      </Link>

      <section className="mt-5 rounded-[26px] border border-[#E9DDCC] bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#B59677]">
          Pedido
        </div>

        <h1 className="mt-2 text-3xl font-extrabold text-[#4A2A12]">
          {pedidoId}
        </h1>

        <p className="mt-3 text-sm text-[#7B5A3A]">
          Carregando os dados completos deste pedido...
        </p>
      </section>
    </div>
  );
}

export default Pedido;