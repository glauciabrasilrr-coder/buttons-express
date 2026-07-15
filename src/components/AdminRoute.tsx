import {
  type FormEvent,
  type ReactNode,
  useState,
} from 'react';

type AdminRouteProps = {
  children: ReactNode;
};

const SENHA_PAINEL = '220117';
const SESSION_KEY = 'buttons-express-painel-autorizado';

function AdminRoute({ children }: AdminRouteProps) {
  const [autorizado, setAutorizado] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  );
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);

  const entrar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (senha === SENHA_PAINEL) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAutorizado(true);
      setErro(false);
      setSenha('');
      return;
    }

    setErro(true);
    setSenha('');
  };

  if (autorizado) {
    return children;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-3 py-6">
      <form
        onSubmit={entrar}
        className="w-full rounded-[28px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-6 text-center shadow-[0_16px_36px_rgba(107,62,20,0.08)]"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#E9DDCC] bg-white text-2xl shadow-sm">
          🔒
        </div>

        <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B59677]">
          Área interna
        </div>

        <h1 className="mt-2 text-2xl font-bold text-[#4A2A12]">
          Painel de produção
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#7B5A3A]">
          Digite a senha para acessar a fila de pedidos.
        </p>

        <label className="mt-5 block text-left">
          <span className="text-xs font-bold text-[#6B3E14]">
            Senha
          </span>

          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => {
              setSenha(event.target.value.replace(/\D/g, ''));
              setErro(false);
            }}
            maxLength={8}
            autoFocus
            className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-center text-xl font-bold tracking-[0.35em] text-[#4A2A12] outline-none ${
              erro
                ? 'border-[#C85B4A] ring-2 ring-[#C85B4A]/10'
                : 'border-[#DCCAB4] focus:border-[#8F5528] focus:ring-2 focus:ring-[#8F5528]/10'
            }`}
          />
        </label>

        {erro && (
          <p className="mt-3 text-sm font-semibold text-[#A3483E]">
            Senha incorreta. Tente novamente.
          </p>
        )}

        <button
          type="submit"
          disabled={senha.length === 0}
          className="mt-5 h-12 w-full rounded-full bg-[#8F5528] text-sm font-bold text-white transition hover:bg-[#6B3E14] disabled:cursor-not-allowed disabled:bg-[#DDD0C0] disabled:text-[#A7927A]"
        >
          ENTRAR NO PAINEL
        </button>
      </form>
    </div>
  );
}

export default AdminRoute;