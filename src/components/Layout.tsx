import React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Trees,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Layout: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const path = location.pathname;
  const isNovaReserva = path === '/reservas/nova';

  const obterTituloBreadcrumb = (): string => {
    if (path === '/' || path === '/dashboard') return 'Painel Geral';
    if (path === '/reservas') return 'Gestão de Reservas';
    if (isNovaReserva) return 'Nova Reserva';
    if (path.endsWith('/editar')) return 'Editar Reserva';
    if (path.endsWith('/voucher')) return 'Emissão de Voucher';
    if (path.startsWith('/reservas/')) return 'Detalhes da Reserva';
    return 'Sistema de Reservas';
  };

  const itensNavegacaoMovel = [
    {
      to: '/dashboard',
      rotulo: 'Painel',
      Icone: LayoutDashboard,
      ativo: path === '/' || path === '/dashboard',
    },
    {
      to: '/reservas',
      rotulo: 'Reservas',
      Icone: ListFilter,
      ativo: path.startsWith('/reservas') && !isNovaReserva,
    },
    {
      to: '/reservas/nova',
      rotulo: 'Nova reserva',
      Icone: CalendarPlus,
      ativo: isNovaReserva,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] text-slate-900">
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0F291E] text-slate-100 border-r border-emerald-950">
        <div className="px-6 py-5 border-b border-emerald-900/70 flex items-center gap-3">
          <Trees className="w-6 h-6 text-emerald-400 shrink-0" />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Pousada Pinho Verde
          </span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-800/90 text-white'
                  : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/reservas"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-800/90 text-white'
                  : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
              }`
            }
          >
            <ListFilter className="w-4 h-4 shrink-0" />
            <span>Lista de Reservas</span>
          </NavLink>

          <NavLink
            to="/reservas/nova"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-800/90 text-white'
                  : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
              }`
            }
          >
            <CalendarPlus className="w-4 h-4 shrink-0" />
            <span>Cadastrar Reserva</span>
          </NavLink>
        </nav>

        {user && (
          <div className="p-4 border-t border-emerald-900/70 bg-emerald-950/50">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white truncate">
                {user.nome_completo}
              </p>
              <p className="text-xs text-emerald-200/80 truncate">
                {user.email} · {user.perfil === 'admin' ? 'Administração' : 'Recepção'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-emerald-100 hover:text-white bg-emerald-900/70 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="no-print lg:hidden sticky top-0 z-20 bg-[#0F291E] text-white px-4 pt-[env(safe-area-inset-top)]">
          <div className="h-14 flex items-center justify-between gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <Trees className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[11px] leading-tight text-emerald-200/80 truncate">
                  Pousada Pinho Verde
                </span>
                <span className="block text-sm font-semibold leading-tight truncate">
                  {obterTituloBreadcrumb()}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 text-xs font-medium text-emerald-100 bg-emerald-900/70 active:bg-emerald-800 rounded-lg whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <header className="no-print hidden lg:flex sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-8 py-3.5 items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Link
              to="/dashboard"
              className="font-semibold text-slate-900 hover:text-emerald-800 transition-colors truncate"
            >
              Pousada Pinho Verde
            </Link>
            <span className="text-slate-400" aria-hidden="true">
              /
            </span>
            <span className="text-slate-600 truncate">
              {obterTituloBreadcrumb()}
            </span>
          </div>

          <Link
            to="/reservas/nova"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Nova Reserva</span>
          </Link>
        </header>

        <main className="flex-1 px-4 sm:px-8 pt-5 sm:pt-6 pb-24 lg:pb-6 print:pb-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="no-print hidden lg:flex border-t border-slate-200/80 px-8 py-4 text-xs text-slate-500 items-center justify-between gap-2">
          <span>Pousada Pinho Verde · Sistema de Vouchers e Gestão de Reservas</span>
          <span>Check-in às 15h · Check-out às 12h</span>
        </footer>
      </div>

      <nav
        aria-label="Navegação principal"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-3 max-w-lg mx-auto">
          {itensNavegacaoMovel.map(({ to, rotulo, Icone, ativo }) => (
            <Link
              key={to}
              to={to}
              aria-current={ativo ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${
                ativo ? 'text-emerald-800' : 'text-slate-500 active:text-slate-900'
              }`}
            >
              <span
                className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                  ativo ? 'bg-emerald-100' : ''
                }`}
              >
                <Icone className="w-5 h-5" />
              </span>
              <span>{rotulo}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};
