import { LayoutDashboard, BarChart3, TrendingUp, Settings, Spade } from 'lucide-react';
import { useRouter } from '@/lib/router';

const items = [
  { to: '/', label: 'Profile', icon: LayoutDashboard },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/statistics', label: 'Statistics', icon: TrendingUp },
  { to: '/admin', label: 'Admin', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { path, navigate } = useRouter();

  const go = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-700/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
          <Spade className="h-5 w-5 text-brand" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold text-[15px] tracking-tight">PokerTracker</div>
          <div className="text-2xs text-ink-300">Performance Analytics</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = it.to === '/' ? path === '/' : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <button
              key={it.to}
              onClick={() => go(it.to)}
              className={`nav-link w-full ${active ? 'nav-link-active' : ''}`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand' : ''}`} strokeWidth={2} />
              <span>{it.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-xl border border-ink-700/60 bg-ink-850 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-soft" />
            <span className="text-2xs font-medium text-ink-200">Live tracking</span>
          </div>
          <p className="text-2xs text-ink-300 leading-relaxed">
            Connected to GGPoker hand history. Stats update after each import.
          </p>
        </div>
      </div>
    </div>
  );
}
