import { useCountUp, formatMoney, formatPct, formatNumber } from '@/lib/format';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Variant = 'default' | 'profit' | 'roi' | 'itm' | 'tournaments' | 'invested' | 'prizes';

type Props = {
  label: string;
  value: number;
  variant: Variant;
  icon: LucideIcon;
  sub?: string;
  subPositive?: boolean;
};

const formatters: Record<Variant, (n: number) => string> = {
  default: (n) => formatNumber(n),
  tournaments: (n) => formatNumber(n),
  invested: (n) => formatMoney(n),
  prizes: (n) => formatMoney(n),
  profit: (n) => formatMoney(n, true),
  roi: (n) => formatPct(n, true),
  itm: (n) => formatPct(n),
};

const accent: Record<Variant, string> = {
  default: 'text-white',
  tournaments: 'text-white',
  invested: 'text-white',
  prizes: 'text-white',
  profit: 'text-brand',
  roi: 'text-brand',
  itm: 'text-brand',
};

export function StatCard({ label, value, variant, icon: Icon, sub, subPositive }: Props) {
  const animated = useCountUp(value);
  const display = formatters[variant](animated);
  const isProfit = variant === 'profit';
  const positive = value >= 0;

  return (
    <div className="card card-hover p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${isProfit ? (positive ? 'bg-brand/10' : 'bg-loss/10') : 'bg-ink-700/60'}`}>
          <Icon className={`h-4 w-4 ${isProfit ? (positive ? 'text-brand' : 'text-loss') : 'text-ink-200'}`} strokeWidth={2} />
        </div>
      </div>
      <div className={`stat-value text-3xl ${accent[variant]} ${isProfit && !positive ? '!text-loss' : ''}`}>
        {display}
      </div>
      {sub && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-300">
          {subPositive !== undefined && (
            subPositive ? <TrendingUp className="h-3 w-3 text-brand" /> : <TrendingDown className="h-3 w-3 text-loss" />
          )}
          <span className={subPositive === true ? 'text-brand' : subPositive === false ? 'text-loss' : ''}>{sub}</span>
        </div>
      )}
    </div>
  );
}
