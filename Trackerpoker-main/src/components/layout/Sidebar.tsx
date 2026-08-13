import { LayoutDashboard, BarChart3, TrendingUp, Settings, Spade, LogIn, UserPlus, Lock } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth, profilePath } from '@/lib/auth';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { path, navigate } = useRouter();
  const { isAuthenticated, user } = useAuth();

  const go = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  const profileTo = user ? profilePath(user.slug) : '/';

  const profileItems = [
    { to: profileTo, label: 'Perfil', icon: LayoutDashboard, match: (p: string) => p.startsWith('/u/'), privateOnly: false },
    { to: '/results', label: 'Resultados', icon: BarChart3, match: (p: string) => p === '/results', privateOnly: false },
    { to: '/statistics', label: 'Estadísticas', icon: TrendingUp, match: (p: string) => p === '/statistics', privateOnly: false },
    { to: '/hands', label: 'Manos clave', icon: Spade, match: (p: string) => p === '/hands', privateOnly: true },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-700/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
          <Spade className="h-5 w-5 text-brand" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold text-[15px] tracking-tight">PokerTracker</div>
          <div className="text-2xs text-ink-300">Perfil del jugador</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {isAuthenticated ? (
          <>
            {profileItems.map((it) => {
              const active = it.match(path);
              const Icon = it.icon;
              return (
                <button key={it.to} onClick={() => go(it.to)} className={`nav-link w-full ${active ? 'nav-link-active' : ''}`}>
                  <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand' : ''}`} strokeWidth={2} />
                  <span>{it.label}</span>
                  {it.privateOnly && (
                    <Lock className="h-3 w-3 text-ink-400 ml-0.5" strokeWidth={2.5} />
                  )}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
                </button>
              );
            })}

            <div className="my-3 border-t border-ink-700/60" />
            <p className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-ink-400">Mi cuenta</p>
            <button onClick={() => go('/admin')} className={`nav-link w-full ${path.startsWith('/admin') ? 'nav-link-active' : ''}`}>
              <Settings className={`h-[18px] w-[18px] ${path.startsWith('/admin') ? 'text-gold' : ''}`} strokeWidth={2} />
              <span>Administrar</span>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => go('/login')} className="nav-link w-full">
              <LogIn className="h-[18px] w-[18px]" strokeWidth={2} />
              <span>Iniciar sesión</span>
            </button>
            <button onClick={() => go('/')} className="nav-link w-full">
              <UserPlus className="h-[18px] w-[18px]" strokeWidth={2} />
              <span>Crear perfil</span>
            </button>
          </>
        )}
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-xl border border-ink-700/60 bg-ink-850 p-3.5">
          <p className="text-2xs text-ink-300 leading-relaxed">
            {isAuthenticated
              ? `Perfil público: /u/${user?.slug}`
              : 'Perfil público de jugador de poker.'}
          </p>
        </div>
      </div>
    </div>
  );
}
