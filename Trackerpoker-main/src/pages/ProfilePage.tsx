import { useMemo, useState } from 'react';
import {
  Trophy, DollarSign, TrendingUp, Target, Calendar, Coins, Award,
  Activity, History, Medal, Crown, Layers, Wallet,
} from 'lucide-react';
import { computeExtendedStats, computeBest } from '@/domain/stats';
import { useAppData } from '@/hooks/useAppData';
import { StatCard } from '@/components/ui/StatCard';
import { BestResultCard } from '@/components/ui/BestResultCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TournamentTable } from '@/components/ui/TournamentTable';
import { ProfitChart } from '@/components/charts/ProfitChart';
import {
  PERIOD_OPTIONS, CHART_GRANULARITY_OPTIONS,
  filterByPeriod, aggregateProfitSeries,
  type Period, type ChartGranularity,
} from '@/lib/period';
import { useCountUp, formatMoneyFull, formatPct, formatNumber, formatDate } from '@/lib/format';
import { useRouter } from '@/lib/router';
import type { ExtendedStats, Player } from '@/domain/types';

const RECENT_COUNT = 10;

export function ProfilePage() {
  const { navigate } = useRouter();
  const { player, getPlayerTournaments } = useAppData();
  const [period, setPeriod] = useState<Period>('all');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('all');

  const allTournaments = useMemo(() => getPlayerTournaments(player.id), [getPlayerTournaments, player.id]);
  const filtered = useMemo(
    () => filterByPeriod(allTournaments, period),
    [allTournaments, period],
  );

  const stats = useMemo(() => computeExtendedStats(filtered), [filtered]);
  const best = useMemo(() => computeBest(filtered), [filtered]);
  const series = useMemo(
    () => aggregateProfitSeries(filtered, chartGranularity),
    [filtered, chartGranularity],
  );
  const recent = useMemo(() => filtered.slice(0, RECENT_COUNT), [filtered]);

  return (
    <div className="space-y-8">
      <PlayerHero player={player} stats={stats} />

      {/* Period filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-100">Período</h2>
          <p className="text-2xs text-ink-300 mt-0.5">Las estadísticas se actualizan según el filtro</p>
        </div>
        <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </div>

      {/* Main chart — profit acumulado */}
      <div className="card p-6 md:p-8">
        <SectionHeader
          icon={Activity}
          title="Profit acumulado"
          subtitle="Rendimiento a lo largo del tiempo"
          actions={
            <SegmentedControl
              options={CHART_GRANULARITY_OPTIONS}
              value={chartGranularity}
              onChange={setChartGranularity}
            />
          }
        />
        <ProfitChart data={series} height={360} />
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Torneos" value={stats.totalTournaments} variant="tournaments" icon={Trophy} />
        <StatCard label="Invertido" value={stats.totalInvested} variant="invested" icon={Coins} />
        <StatCard label="Ganado" value={stats.totalPrizes} variant="prizes" icon={DollarSign} />
        <StatCard label="Profit" value={stats.profit} variant="profit" icon={TrendingUp} sub={`${formatPct(stats.roi, true)} ROI`} subPositive={stats.roi >= 0} />
        <StatCard label="ROI" value={stats.roi} variant="roi" icon={Target} />
        <StatCard label="ITM" value={stats.itm} variant="itm" icon={Award} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatsGroup title="Resultados" icon={Medal}>
          <StatRow label="MTT" value={formatNumber(stats.mttCount)} />
          <StatRow label="Spin & Gold" value={formatNumber(stats.spinCount)} />
          <StatRow label="ITM %" value={formatPct(stats.itm)} />
          <StatRow label="Final Tables" value={formatNumber(stats.finalTables)} />
          <StatRow label="Top 3" value={formatNumber(stats.top3)} />
          <StatRow label="Victorias" value={formatNumber(stats.wins)} />
        </StatsGroup>

        <StatsGroup title="Dinero & récords" icon={Wallet}>
          <StatRow label="Total invertido" value={formatMoneyFull(stats.totalInvested)} />
          <StatRow label="Total ganado" value={formatMoneyFull(stats.totalPrizes)} />
          <StatRow label="Profit" value={formatMoneyFull(stats.profit, true)} positive={stats.profit >= 0} />
          <StatRow label="ROI" value={formatPct(stats.roi, true)} positive={stats.roi >= 0} />
          <StatRow label="Mejor torneo" value={best.bestFinish.tournament} small />
          <StatRow label="Mayor premio" value={formatMoneyFull(best.biggestPrize.prize)} />
          <StatRow label="Mejor día" value={formatMoneyFull(stats.bestDayProfit, true)} positive={stats.bestDayProfit >= 0} sub={stats.bestDay ? formatDate(stats.bestDay, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined} />
        </StatsGroup>
      </div>

      {/* Best results */}
      <div>
        <SectionHeader icon={Crown} title="Mejor rendimiento" subtitle="Récords personales del período" />
        <BestResultCard data={best} />
      </div>

      {/* Recent tournaments */}
      <div className="card p-6">
        <SectionHeader
          icon={History}
          title="Últimos torneos"
          subtitle={`Últimos ${RECENT_COUNT} resultados`}
          actions={
            <button onClick={() => navigate('/results')} className="btn-outline group">
              Ver todos
              <TrendingUp className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          }
        />
        <TournamentTable tournaments={recent} pageSize={RECENT_COUNT} showViewAll={false} dense />
      </div>
    </div>
  );
}

function PlayerHero({ player, stats }: { player: Player; stats: ExtendedStats }) {
  const profitAnim = useCountUp(stats.profit);
  const roiAnim = useCountUp(stats.roi);
  const tourAnim = useCountUp(stats.totalTournaments);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-800">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-radial-fade" />
      <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-brand/5 blur-3xl" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
              <p className="text-2xs font-semibold uppercase tracking-widest text-brand mb-2">Poker Profile</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="chip border-brand/30 bg-brand/10 text-brand">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-soft" />
                  Activo
                </span>
                <span className="chip border-ink-700 bg-ink-850 text-ink-200">{player.room}</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{player.nickname}</h1>
              <p className="text-ink-200 mt-1">Poker Player · {player.countryFlag} {player.country}</p>
              <p className="text-sm text-ink-300 mt-2 max-w-lg">{player.bio}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {player.gameTypes.map((g) => (
                  <span key={g} className="chip border-ink-700 bg-ink-850 text-ink-100">{g}</span>
                ))}
                <span className="chip border-ink-700 bg-ink-850 text-ink-300">
                  <Calendar className="h-3 w-3" />
                  Desde {formatDate(player.startedAt, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <HeroStat label="Torneos" value={formatNumber(tourAnim)} />
            <HeroStat label="Profit" value={formatMoneyFull(profitAnim, true)} positive={stats.profit >= 0} />
            <HeroStat label="ROI" value={formatPct(roiAnim, true)} positive={stats.roi >= 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-850/60 p-4 backdrop-blur-sm text-center min-w-[100px]">
      <div className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5">{label}</div>
      <div className={`stat-value text-xl md:text-2xl ${positive === undefined ? 'text-white' : positive ? 'text-brand' : 'text-loss'}`}>
        {value}
      </div>
    </div>
  );
}

function StatsGroup({ title, icon: Icon, children }: { title: string; icon: typeof Layers; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-ink-200" />
        <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StatRow({
  label, value, positive, small, sub,
}: {
  label: string;
  value: string;
  positive?: boolean;
  small?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-ink-700/40 last:border-0">
      <span className="text-sm text-ink-300">{label}</span>
      <div className="text-right">
        <span className={`font-semibold tabular-nums ${small ? 'text-sm text-ink-100 max-w-[180px] truncate block' : ''} ${positive === undefined ? 'text-white' : positive ? 'text-brand' : 'text-loss'}`}>
          {value}
        </span>
        {sub && <span className="text-2xs text-ink-400 block">{sub}</span>}
      </div>
    </div>
  );
}
