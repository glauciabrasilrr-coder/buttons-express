import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-md items-start justify-center sm:min-h-[78vh] sm:items-center">
      <div className="w-full rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] px-4 py-5 shadow-[0_18px_35px_rgba(107,62,20,.08)] sm:rounded-[30px] sm:p-8">
        <div className="flex justify-center">
          <img
            src="/assets/brand/logo-oficial.png"
            alt="Bem Bolado"
            className="h-14 object-contain sm:h-20"
          />
        </div>

        <div className="mt-4 grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2 sm:mx-auto sm:mt-8 sm:w-fit sm:grid-cols-[130px_210px] sm:gap-0">
          <img
            src="/assets/brand/mascote-oficial.png"
            alt="Mascote oficial da Bem Bolado"
            className="w-[98px] max-w-none justify-self-end object-contain sm:w-[138px]"
          />

          <div className="-ml-1 min-w-0 sm:-ml-3 sm:w-[210px]">
            <span className="inline-block rounded-full bg-white px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#8A5A2B] shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.18em]">
              BUTTONS EXPRESS
            </span>

            <h1 className="mt-2 text-[2rem] font-bold leading-none text-[#4A2A12] sm:mt-3 sm:whitespace-nowrap sm:text-4xl">
              Bem-vindo!
            </h1>

            <p className="mt-2 text-[13px] leading-5 text-[#7B5A3A] sm:mt-4 sm:text-sm sm:leading-7">
              Para iniciar seu pedido, siga os três passos abaixo.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5 sm:mt-10 sm:space-y-8">
          <div>
            <h3 className="flex items-center text-base font-bold text-[#4A2A12] sm:text-lg">
              <span className="text-[26px] font-extrabold leading-none sm:text-[30px]">
                1
              </span>

              <span className="mx-[2px] text-[9px] leading-none text-[#E7A29A] sm:text-[10px]">
                ♥
              </span>

              <span className="ml-1">
                Escolha seus produtos
              </span>
            </h3>

            <p className="ml-8 mt-1.5 text-[13px] leading-5 text-[#7B5A3A] sm:ml-9 sm:mt-2 sm:text-sm sm:leading-6">
              Escolha os produtos e informe a quantidade desejada para cada um.
            </p>
          </div>

          <hr className="border-dashed border-[#E7D5BF]" />

          <div>
            <h3 className="flex items-center text-base font-bold text-[#4A2A12] sm:text-lg">
              <span className="text-[26px] font-extrabold leading-none sm:text-[30px]">
                2
              </span>

              <span className="mx-[2px] text-[9px] leading-none text-[#E7A29A] sm:text-[10px]">
                ♥
              </span>

              <span className="ml-1">
                Envie suas fotos
              </span>
            </h3>

            <p className="ml-8 mt-1.5 text-[13px] leading-5 text-[#7B5A3A] sm:ml-9 sm:mt-2 sm:text-sm sm:leading-6">
              Envie uma foto para cada item escolhido.
            </p>
          </div>

          <hr className="border-dashed border-[#E7D5BF]" />

          <div>
            <h3 className="flex items-center text-base font-bold text-[#4A2A12] sm:text-lg">
              <span className="text-[26px] font-extrabold leading-none sm:text-[30px]">
                3
              </span>

              <span className="mx-[2px] text-[9px] leading-none text-[#E7A29A] sm:text-[10px]">
                ♥
              </span>

              <span className="ml-1">
                Faça o pagamento
              </span>
            </h3>

            <p className="ml-8 mt-1.5 text-[13px] leading-5 text-[#7B5A3A] sm:ml-9 sm:mt-2 sm:text-sm sm:leading-6">
              Após a confirmação do pagamento, seu pedido entrará em produção.
              Assim que estiver pronto, nossa equipe chamará você para retirar no
              estande.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/produtos')}
          className="mt-6 h-12 w-full rounded-full bg-[#8F5528] text-base font-bold text-white transition hover:bg-[#6B3E14] sm:mt-10 sm:h-14 sm:text-lg"
        >
          INICIAR PEDIDO
        </button>
      </div>
    </div>
  );
}

export default Home;