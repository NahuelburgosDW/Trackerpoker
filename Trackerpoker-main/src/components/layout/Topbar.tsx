import { Spade } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useRouter } from '@/lib/router';

type Props = {
  onMenu?: () => void;
  variant?: 'public' | 'admin' | 'login';
  publicSlug?: string | null;
};

export function Topbar({ onMenu, variant = 'public', publicSlug }: Props) {
  const { path } = useRouter();
  const { player } = useAppData();

  const pageTitle = (() => {
    if (publicSlug) return `@${publicSlug}`;
    if (path === '/' || path === '/login') return 'Iniciar sesión';
    if (path === '/register') return 'Crear cuenta';
    if (path === '/connect-sheet') return 'Conectar Sheet';
    if (path === '/forgot-password') return 'Recuperar contraseña';
    if (path === '/results') return 'Resultados';
    if (path === '/statistics') return 'Estadísticas';
    if (path === '/hands') return 'Manos clave';
    if (path === '/admin/import') return 'Importar';
    if (path === '/admin/tournaments') return 'Torneos';
    if (path === '/admin/profile') return 'Editar perfil';
    return 'PokerTracker';
  })();

  const subtitle = (() => {
    if (variant === 'login') {
      if (path === '/register') return 'Creá tu perfil de poker';
      if (path === '/connect-sheet') return 'Vinculá tu Google Sheet para continuar';
      if (path === '/forgot-password') return 'Restablecé tu acceso';
      return 'Accedé a tu cuenta';
    }
    if (variant === 'admin') return 'Panel administrativo';
    return 'Perfil público del jugador';
  })();

  const isAdminTheme = variant === 'admin' || variant === 'login';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-700/60 bg-ink-900/80 px-4 backdrop-blur-xl md:px-6">
      {variant !== 'login' && (
        <button
          onClick={onMenu}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-700 text-ink-200 hover:text-white hover:bg-ink-750 md:hidden"
          aria-label="Abrir menú"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <div className={`flex items-center gap-2 ${variant === 'login' ? '' : 'md:hidden'}`}>
        <Spade className={`h-5 w-5 ${isAdminTheme ? 'text-gold' : 'text-brand'}`} />
        <span className="font-display font-semibold text-sm">{pageTitle}</span>
      </div>

      <div className={`${variant === 'login' ? 'flex' : 'hidden md:flex'} items-center`}>
        <div>
          <h1 className="font-display text-sm font-semibold text-ink-100">{pageTitle}</h1>
          <p className="text-2xs text-ink-400">{subtitle}</p>
        </div>
      </div>

      {variant === 'public' && (
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-ink-700 bg-ink-850 py-1.5 pl-1.5 pr-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-ink-950 font-display font-bold text-sm">
              {player.avatarInitials}
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-sm font-semibold">{player.nickname}</div>
              <div className="text-2xs text-ink-300">{player.countryFlag} {player.country}</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
