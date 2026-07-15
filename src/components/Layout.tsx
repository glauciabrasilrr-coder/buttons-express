import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { useEffect } from 'react';

function Layout() {
  const location = useLocation();
  const paginaFila = location.pathname === '/fila';

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-slate-800">
      <header className="border-b border-amber-200 bg-white/95 backdrop-blur-sm">
        <div
          className={`mx-auto flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3 ${
            paginaFila
              ? 'w-full max-w-[1600px]'
              : 'max-w-6xl'
          }`}
        >
          <Link
            to="/"
            className="flex shrink-0 items-center"
            aria-label="Bem Bolado - Início"
          >
            <img
              src="/assets/brand/logo-oficial.png"
              alt="Bem Bolado Personalizados Criativos"
              className="h-10 w-auto object-contain sm:h-14"
            />
          </Link>

          {paginaFila ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B59677]">
                  Área interna
                </div>

                <div className="text-sm font-bold text-[#4A2A12]">
                  Painel de produção
                </div>
              </div>

              <Link
                to="/"
                className="rounded-full border border-[#E9DDCC] bg-white px-3 py-2 text-xs font-bold text-[#6B3E14] transition hover:bg-[#FFF4E8] sm:px-4 sm:text-sm"
              >
                PORTAL DO CLIENTE
              </Link>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 justify-end">
              <div className="rounded-full border border-[#E9DDCC] bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A5A2B] sm:px-4 sm:text-xs">
                Buttons Express
              </div>
            </div>
          )}
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col ${
          paginaFila
            ? 'max-w-[1600px] px-3 py-5 sm:px-5 lg:px-6'
            : 'max-w-6xl px-2 py-4 sm:px-6 sm:py-8'
        }`}
      >
        {paginaFila ? (
          <Outlet />
        ) : (
          <section className="flex flex-1 items-start justify-center rounded-3xl border border-amber-200 bg-white/70 p-2 shadow-sm sm:items-center sm:p-8">
            <Outlet />
          </section>
        )}
      </main>

      {!paginaFila && (
        <footer className="border-t border-amber-200 bg-white/80 px-4 py-3 text-center text-xs text-[#7B5A3A] sm:px-6 sm:py-4 sm:text-sm">
          Bem Bolado • Personalizados Criativos
        </footer>
      )}
    </div>
  );
}

export default Layout;