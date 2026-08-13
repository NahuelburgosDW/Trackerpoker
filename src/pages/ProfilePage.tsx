import { useMemo, useState } from 'react';
import {
  Trophy, DollarSign, TrendingUp, Target, Calendar, Coins, Award, Flame,
  BarChart3, PieChart, Activity, History,
} from 'lucide-react';
import {
  tournaments, computeStats, computeBest, cumulativeProfitSeries,
  monthlyProfit, performanceByBuyIn, performanceByGameType, player, YEARS,
} from '@/data/mock';
import { StatCard } from '@/components/ui/StatCard';
import { BestResultCard } from '@/components/ui/BestResultCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TournamentTable } from '@/components/ui/TournamentTable';
import { ProfitChart } from '@/components/charts/ProfitChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { HBarChart } from '@/components/charts/HBarChart';
import { useCountUp, formatMoneyFull, formatPct, formatNumber, formatDate } from '@/lib/format';
import { useRouter } from '@/lib/router';

const RANGES = [
  { label: 'All', value: 'all' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '3M', value: '3m' },
  { label: '1Y', value: '1y' },
];

const DONUT_COLORS = ['#2BE5A0', '#E8B455', '#525C6A'];

export function ProfilePage() {
  const { navigate } = useRouter();
  const [year, setYear] = useState('all');
  const [range, setRange] = useState('all');

  const filtered = useMemo(() => {
    if (year === 'all') return tournaments;
    const y = parseInt(year);
    return tournaments.filter((t) => new Date(t.date).getFullYear() === y);
  }, [year]);

  const rangeFiltered = useMemo(() => {
    if (range === 'all') return filtered;
    const now = new Date('2026-08-13').getTime();
    const days: Record<string, number> = { '7d': 7, '30d': 30, '3m': 90, '1y': 365 };
    const d = days[range];
    if (!d) return filtered;
    const cutoff = now - d * 86400000;
    return filtered.filter((t) => +new Date(t.date) >= cutoff);
  }, [filtered, range]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const best = useMemo(() => computeBest(filtered), [filtered]);
  const series = useMemo(() => cumulativeProfitSeries(rangeFiltered), [rangeFiltered]);
  const monthly = useMemo(() => monthlyProfit(filtered, year === 'all' ? 2026 : parseInt(year)), [filtered, year]);
  const byBuyIn = useMemo(() => performanceByBuyIn(filtered), [filtered]);
  const byType = useMemo(() => performanceByGameType(filtered), [filtered]);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <PlayerHero stats={stats} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tournaments" value={stats.totalTournaments} variant="tournaments" icon={Trophy} />
        <StatCard label="Invested" value={stats.totalInvested} variant="invested" icon={Coins} />
        <StatCard label="Prizes" value={stats.totalPrizes} variant="prizes" icon={DollarSign} />
        <StatCard label="Profit" value={stats.profit} variant="profit" icon={TrendingUp} sub={`${formatPct(stats.roi, true)} ROI`} subPositive={stats.roi >= 0} />
        <StatCard label="ROI" value={stats.roi} variant="roi" icon={Target} />
        <StatCard label="ITM" value={stats.itm} variant="itm" icon={Award} />
      </div>

      {/* Profit chart */}
      <div className="card p-6">
        <SectionHeader
          icon={Activity}
          title="Performance"
          subtitle="Cumulative profit over time"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={[{ label: 'All', value: 'all' }, ...YEARS.map((y) => ({ label: String(y), value: String(y) }))]}
                value={year}
                onChange={setYear}
              />
              <SegmentedControl options={RANGES} value={range} onChange={setRange} />
            </div>
          }
        />
        <ProfitChart data={series} height={340} />
      </div>

      {/* Performance breakdown */}
      <div>
        <SectionHeader icon={BarChart3} title="Performance Breakdown" subtitle="Profit distribution across time, buy-ins and game types" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-ink-100 mb-1">Profit by Month</h3>
            <p className="text-2xs text-ink-300 mb-4">{year === 'all' ? '2026' : year}</p>
            <BarChart data={monthly.map((m) => ({ label: m.label, value: m.value }))} height={260} />
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-ink-100 mb-1">Tournaments by Game Type</h3>
            <p className="text-2xs text-ink-300 mb-6">Distribution</p>
            <DonutChart
              data={byType.map((t, i) => ({ label: t.type, value: t.count, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
              size={180}
            />
          </div>
        </div>
        <div className="card p-6 mt-4">
          <h3 className="text-sm font-semibold text-ink-100 mb-1">ROI by Buy-in</h3>
          <p className="text-2xs text-ink-300 mb-5">Performance across stake levels</p>
          <HBarChart
            data={byBuyIn.map((b) => ({ label: `$${b.buyIn}`, value: b.roi }))}
            formatValue={(v) => formatPct(v, true)}
          />
        </div>
      </div>

      {/* Best results */}
      <div>
        <SectionHeader icon={Flame} title="Best Results" subtitle="Career highlights and personal records" />
        <BestResultCard data={best} />
      </div>

      {/* Recent tournaments */}
      <div className="card p-6">
        <SectionHeader
          icon={History}
          title="Recent Tournaments"
          subtitle="Latest results from the table"
          actions={
            <button onClick={() => navigate('/results')} className="btn-outline group">
              View all
              <TrendingUp className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          }
        />
        <TournamentTable tournaments={filtered.slice(0, 50)} pageSize={6} showViewAll={false} onViewAll={() => navigate('/results')} dense />
      </div>
    </div>
  );
}

function PlayerHero({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const profitAnim = useCountUp(stats.profit);
  const roiAnim = useCountUp(stats.roi);
  const itmAnim = useCountUp(stats.itm);
  const tourAnim = useCountUp(stats.totalTournaments);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-800">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-radial-fade" />
      <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-brand/5 blur-3xl" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: identity */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex-shrink-0">
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-ink-950 font-display text-3xl font-bold shadow-glow">
                {player.avatarInitials}
              </div>
              <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-lg border-2 border-ink-800 bg-ink-700 text-xs">
                {player.countryFlag}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="chip border-brand/30 bg-brand/10 text-brand">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-soft" />
                  Active
                </span>
                <span className="chip border-ink-700 bg-ink-850 text-ink-200">{player.room}</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{player.nickname}</h1>
              <p className="text-ink-200 mt-1">Poker Player · {player.country}</p>
              <p className="text-sm text-ink-300 mt-2">{player.bio}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {player.gameTypes.map((g) => (
                  <span key={g} className="chip border-ink-700 bg-ink-850 text-ink-100">{g}</span>
                ))}
                <span className="chip border-ink-700 bg-ink-850 text-ink-300">
                  <Calendar className="h-3 w-3" />
                  Since {formatDate(player.startedAt, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Right: hero stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <HeroStat label="Tournaments" value={formatNumber(tourAnim)} />
            <HeroStat label="Profit" value={formatMoneyFull(profitAnim, true)} positive={stats.profit >= 0} />
            <HeroStat label="ROI" value={formatPct(roiAnim, true)} positive={stats.roi >= 0} />
            <HeroStat label="ITM" value={formatPct(itmAnim)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-850/60 p-4 backdrop-blur-sm">
      <div className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5">{label}</div>
      <div className={`stat-value text-2xl ${positive === undefined ? 'text-white' : positive ? 'text-brand' : 'text-loss'}`}>
        {value}
      </div>
    </div>
  );
}
