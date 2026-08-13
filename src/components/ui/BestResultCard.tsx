import { Trophy, DollarSign, TrendingUp, Flame } from 'lucide-react';
import type { BestResults } from '@/data/mock';
import { formatMoneyFull, formatPct, formatDate } from '@/lib/format';

type Props = {
  data: BestResults;
};

export function BestResultCard({ data }: Props) {
  const cards = [
    {
      icon: Trophy,
      label: 'Best Finish',
      value: `${ordinal(data.bestFinish.position)} Place`,
      sub: `${data.bestFinish.tournament}`,
      meta: `${formatDate(data.bestFinish.date)} · ${data.bestFinish.players.toLocaleString()} players`,
      accent: 'text-gold',
      bg: 'bg-gold/10',
    },
    {
      icon: DollarSign,
      label: 'Biggest Prize',
      value: formatMoneyFull(data.biggestPrize.prize),
      sub: data.biggestPrize.tournament,
      meta: formatDate(data.biggestPrize.date),
      accent: 'text-brand',
      bg: 'bg-brand/10',
    },
    {
      icon: TrendingUp,
      label: 'Biggest Profit',
      value: formatMoneyFull(data.biggestProfit.profit, true),
      sub: data.biggestProfit.tournament,
      meta: formatDate(data.biggestProfit.date),
      accent: 'text-brand',
      bg: 'bg-brand/10',
    },
    {
      icon: Flame,
      label: 'Best ROI',
      value: formatPct(data.bestRoi.roi, true),
      sub: data.bestRoi.tournament,
      meta: formatDate(data.bestRoi.date),
      accent: 'text-loss',
      bg: 'bg-loss/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="card card-hover p-5 animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`grid h-9 w-9 place-items-center rounded-xl ${c.bg}`}>
                <Icon className={`h-[18px] w-[18px] ${c.accent}`} strokeWidth={2} />
              </div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300">{c.label}</span>
            </div>
            <div className={`stat-value text-2xl ${c.accent} mb-1`}>{c.value}</div>
            <div className="text-sm text-ink-100 font-medium truncate">{c.sub}</div>
            <div className="text-2xs text-ink-300 mt-1.5">{c.meta}</div>
          </div>
        );
      })}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
