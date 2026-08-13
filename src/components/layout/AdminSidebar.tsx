import { LayoutDashboard, Upload, Table2, UserCog, ArrowLeft, Spade } from 'lucide-react';
import { useRouter } from '@/lib/router';

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/import', label: 'Import TXT', icon: Upload },
  { to: '/admin/tournaments', label: 'Tournaments', icon: Table2 },
  { to: '/admin/profile', label: 'Player Profile', icon: UserCog },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { path, navigate } = useRouter();

  const go = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-700/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
          <Spade className="h-5 w-5 text-gold" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold text-[15px] tracking-tight">Admin Panel</div>
          <div className="text-2xs text-ink-300">PokerTracker Control</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = it.to === '/admin' ? path === '/admin' : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <button
              key={it.to}
              onClick={() => go(it.to)}
              className={`nav-link w-full ${active ? 'nav-link-active' : ''}`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-gold' : ''}`} strokeWidth={2} />
              <span>{it.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <button onClick={() => go('/')} className="nav-link w-full">
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
          <span>Back to Profile</span>
        </button>
      </div>
    </div>
  );
}
