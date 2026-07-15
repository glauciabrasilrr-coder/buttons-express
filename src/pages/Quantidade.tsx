import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sugestoes = [1, 2, 5, 10, 20];

function Quantidade() {
  const [quantidade, setQuantidade] = useState(1);
  const navigate = useNavigate();

  const diminuir = () => setQuantidade((valor) => Math.max(1, valor - 1));
  const aumentar = () => setQuantidade((valor) => Math.min(99, valor + 1));

  return (
    <div className="relative mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-6%] top-10 h-40 w-40 rounded-full bg-[#F7E9D8]/70 blur-3xl" />
        <div className="absolute right-[-4%] top-20 h-52 w-52 rounded-full bg-[#F3D7BE]/50 blur-3xl" />
        <span className="absolute left-[16%] top-[20%] text-[1.05rem] text-[#B6895A]/20">✿</span>
        <span className="absolute right-[18%] top-[24%] text-[0.95rem] text-[#B6895A]/20">♡</span>
      </div>

      <div className="mb-6 overflow-hidden rounded-[30px] border border-[#EBDDCB] bg-[linear-gradient(135deg,_#FFFCF7_0%,_#FDF4E8_55%,_#F7E9D7_100%)] p-4 shadow-[0_14px_34px_rgba(107,62,20,0.06)] sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-sm font-medium text-[#8A5A2B] shadow-[0_6px_16px_rgba(107,62,20,0.04)] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#C69763]" />
              <span>Quantidade</span>
            </div>
            <h1 className="mt-2 text-[1.95rem] font-semibold tracking-[-0.02em] text-[#4A2A12] sm:text-[2.2rem]">Quantos você deseja?</h1>
            <p className="mt-1 max-w-xl text-[0.92rem] leading-6 text-[#7B5A3A]">Você pode alterar depois, se necessário.</p>
          </div>

          <div className="rounded-[18px] border border-white/70 bg-white/80 px-3.5 py-2.5 shadow-[0_10px_24px_rgba(107,62,20,0.06)] backdrop-blur-sm">
            <div className="text-[0.64rem] uppercase tracking-[0.28em] text-[#B59677]">Produto</div>
            <div className="mt-0.5 text-[0.9rem] font-semibold text-[#5B3518]">Produto selecionado</div>
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-[#E9DDCC] bg-white p-5 shadow-[0_14px_36px_rgba(107,62,20,0.06)] sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.78rem] uppercase tracking-[0.28em] text-[#B59677]">Seleção</p>
                <h2 className="mt-1 text-[1.08rem] font-semibold text-[#4A2A12]">Quantidade desejada</h2>
              </div>
              <div className="rounded-full border border-[#E9DDCC] bg-[#FFF8F0] px-3 py-1 text-sm font-medium text-[#8A5A2B]">
                {quantidade} un.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={diminuir}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-[20px] border border-[#E9DDCC] bg-white text-[1.45rem] text-[#6B3E14] shadow-[0_4px_12px_rgba(107,62,20,0.05)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#F7E9D8]"
              >
                −
              </button>

              <div className="flex min-w-[180px] items-center justify-center rounded-[24px] border border-[#E9DDCC] bg-[linear-gradient(135deg,_#FFFDF9_0%,_#FDF4E8_100%)] px-6 py-4 text-[2.35rem] font-semibold text-[#4A2A12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                {quantidade}
              </div>

              <button
                type="button"
                onClick={aumentar}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-[20px] border border-[#E9DDCC] bg-white text-[1.45rem] text-[#6B3E14] shadow-[0_4px_12px_rgba(107,62,20,0.05)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#F7E9D8]"
              >
                +
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {sugestoes.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setQuantidade(valor)}
                  className={`rounded-[16px] border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                    quantidade === valor
                      ? 'border-[#6B3E14] bg-[#6B3E14] text-white shadow-[0_6px_12px_rgba(107,62,20,0.14)]'
                      : 'border-[#E9DDCC] bg-[#FFFDF9] text-[#6B3E14] hover:bg-[#F7E9D8]'
                  }`}
                >
                  {valor}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-[#7B5A3A]">Você poderá enviar uma foto diferente para cada unidade.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-[#E9DDCC] bg-[linear-gradient(135deg,_#FFFDF9_0%,_#FDF4E8_100%)] p-5 shadow-[0_10px_24px_rgba(107,62,20,0.05)]">
              <p className="text-[0.78rem] uppercase tracking-[0.28em] text-[#B59677]">Resumo</p>
              <div className="mt-3 rounded-[20px] border border-white/70 bg-white/80 p-4 shadow-[0_8px_20px_rgba(107,62,20,0.04)]">
                <div className="text-sm font-medium text-[#8A5A2B]">Produto escolhido</div>
                <div className="mt-1 text-[1.05rem] font-semibold text-[#4A2A12]">Produto selecionado</div>
                <div className="mt-4 text-sm text-[#7B5A3A]">
                  <span className="font-semibold text-[#5B3518]">Quantidade:</span> {quantidade} unidade{quantidade === 1 ? '' : 's'}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#7B5A3A]">Próxima etapa</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={() => navigate('/produtos')}
                className="flex h-[46px] items-center justify-center rounded-[999px] border border-[#E9DDCC] bg-white px-5 text-[0.95rem] font-semibold text-[#6B3E14] shadow-[0_2px_8px_rgba(107,62,20,0.04)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#F7E9D8]"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={() => navigate('/fotos')}
                className="flex h-[46px] items-center justify-center rounded-[999px] bg-gradient-to-r from-[#8F5528] to-[#6B3E14] px-5 text-[0.95rem] font-semibold text-white shadow-[0_8px_18px_rgba(107,62,20,0.16)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(107,62,20,0.2)]"
              >
                Continuar →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Quantidade;
