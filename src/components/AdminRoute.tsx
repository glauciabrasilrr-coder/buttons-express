import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AdminRouteProps = {
  children: ReactNode;
};

function AdminRoute({ children }: AdminRouteProps) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [verificandoSessao, setVerificandoSessao] =
    useState(true);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let componenteAtivo = true;

    const verificarUsuario = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!componenteAtivo) {
          return;
        }

        if (error) {
          console.error(
            'Erro ao verificar o usuário administrativo:',
            error,
          );

          setUsuario(null);
        } else {
          setUsuario(user);
        }
      } catch (erroVerificacao) {
        console.error(
          'Falha inesperada ao verificar o acesso administrativo:',
          erroVerificacao,
        );

        if (componenteAtivo) {
          setUsuario(null);
        }
      } finally {
        if (componenteAtivo) {
          setVerificandoSessao(false);
        }
      }
    };

    void verificarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evento, novaSessao) => {
        if (!componenteAtivo) {
          return;
        }

        if (evento === 'SIGNED_OUT' || !novaSessao) {
          setUsuario(null);
          setVerificandoSessao(false);
          return;
        }

        void supabase.auth
          .getUser()
          .then(({ data, error }) => {
            if (!componenteAtivo) {
              return;
            }

            if (error) {
              console.error(
                'Erro ao confirmar o usuário administrativo:',
                error,
              );

              setUsuario(null);
            } else {
              setUsuario(data.user);
            }

            setVerificandoSessao(false);
          })
          .catch((erroUsuario) => {
            console.error(
              'Falha ao confirmar o usuário administrativo:',
              erroUsuario,
            );

            if (componenteAtivo) {
              setUsuario(null);
              setVerificandoSessao(false);
            }
          });
      },
    );

    return () => {
      componenteAtivo = false;
      subscription.unsubscribe();
    };
  }, []);

  const entrar = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const emailLimpo = email.trim().toLowerCase();

    if (!emailLimpo || !senha) {
      setErro('Digite seu e-mail e sua senha.');
      return;
    }

    setEntrando(true);
    setErro('');

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: emailLimpo,
          password: senha,
        });

      if (error || !data.session) {
        console.error(
          'Erro no login administrativo:',
          error,
        );

        setErro('E-mail ou senha incorretos.');
        setSenha('');
        return;
      }

      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser();

      if (erroUsuario || !user) {
        console.error(
          'Não foi possível confirmar o usuário após o login:',
          erroUsuario,
        );

        await supabase.auth.signOut();

        setUsuario(null);
        setErro(
          'Não foi possível confirmar o acesso. Tente novamente.',
        );
        setSenha('');
        return;
      }

      setUsuario(user);
      setSenha('');
    } catch (erroLogin) {
      console.error(
        'Falha inesperada no login administrativo:',
        erroLogin,
      );

      setErro(
        'Não foi possível entrar no painel. Tente novamente.',
      );
      setSenha('');
    } finally {
      setEntrando(false);
    }
  };

  if (verificandoSessao) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-3 py-6">
        <div className="w-full rounded-[28px] border border-[#E9DDCC] bg-white p-6 text-center shadow-[0_16px_36px_rgba(107,62,20,0.08)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E9DDCC] border-t-[#8F5528]" />

          <p className="mt-4 text-sm font-semibold text-[#7B5A3A]">
            Verificando acesso ao painel...
          </p>
        </div>
      </div>
    );
  }

  if (usuario) {
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
          Entre com o e-mail e a senha cadastrados no
          Supabase.
        </p>

        <label className="mt-5 block text-left">
          <span className="text-xs font-bold text-[#6B3E14]">
            E-mail
          </span>

          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErro('');
            }}
            placeholder="seuemail@exemplo.com"
            disabled={entrando}
            className="mt-2 h-12 w-full rounded-2xl border border-[#DCCAB4] bg-white px-4 text-sm font-semibold text-[#4A2A12] outline-none focus:border-[#8F5528] focus:ring-2 focus:ring-[#8F5528]/10 disabled:opacity-60"
          />
        </label>

        <label className="mt-4 block text-left">
          <span className="text-xs font-bold text-[#6B3E14]">
            Senha
          </span>

          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => {
              setSenha(event.target.value);
              setErro('');
            }}
            disabled={entrando}
            className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-base font-bold text-[#4A2A12] outline-none ${
              erro
                ? 'border-[#C85B4A] ring-2 ring-[#C85B4A]/10'
                : 'border-[#DCCAB4] focus:border-[#8F5528] focus:ring-2 focus:ring-[#8F5528]/10'
            } disabled:opacity-60`}
          />
        </label>

        {erro && (
          <p className="mt-3 rounded-2xl border border-[#E7CFC9] bg-[#FFF5F3] px-4 py-3 text-sm font-semibold text-[#A3483E]">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={
            entrando ||
            email.trim().length === 0 ||
            senha.length === 0
          }
          className="mt-5 h-12 w-full rounded-full bg-[#8F5528] text-sm font-bold text-white transition hover:bg-[#6B3E14] disabled:cursor-not-allowed disabled:bg-[#DDD0C0] disabled:text-[#A7927A]"
        >
          {entrando
            ? 'ENTRANDO...'
            : 'ENTRAR NO PAINEL'}
        </button>
      </form>
    </div>
  );
}

export default AdminRoute;