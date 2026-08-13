import { useMemo, useState } from 'react';
import {
  TrendingUp, BarChart3, PieChart, Activity, Calendar, Target,
  Trophy, Coins, DollarSign, Award, Layers, Gauge,
} from 'lucide-react';
import {
  tournaments, computeStats, monthlyProfit, performanceByBuyIn,
  performanceByGameType, positionDistribution, tournamentVolume, YEARS,
} from '@/data/mock';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { HBarChart } from '@/components/charts/HBarChart';
import { ProfitChart } from '@/components/charts/ProfitChart';
import { cumulativeProfitSeries } from '@/data/mock';
import { formatMoneyFull, formatPct, formatNumber } from '@/lib/format';

const DONUT_COLORS = ['#2BE5A0', '#E8B455', '#525C6A'];

export function StatisticsPage() {
  const [year, setYear] = useState('2026');

  const filtered = useMemo(() => {
    if (year === 'all') return tournaments;
    return tournaments.filter((t) => new Date(t.date).getFullYear() === parseInt(year));
  }, [year]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const series = useMemo(() => cumulativeProfitSeries(filtered), [filtered]);
  const monthly = useMemo(() => monthlyProfit(filtered, year === 'all' ? 2026 : parseInt(year)), [filtered, year]);
  const byBuyIn = useMemo(() => performanceByBuyIn(filtered), [filtered]);
  const byType = useMemo(() => performanceByGameType(filtered), [filtered]);
  const positions = useMemo(() => positionDistribution(filtered), [filtered]);
  const volume = useMemo(() => tournamentVolume(filtered, year === 'all' ? 2026 : parseInt(year)), [filtered, year]);

  const maxPos = Math.max(...positions.map((p) => p.count));

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={Gauge}
        title="Statistics"
        subtitle="Deep-dive performance analytics"
        actions={
          <SegmentedControl
            options={[{ label: 'All', value: 'all' }, ...YEARS.map((y) => ({ label: String(y), value: String(y) }))]}
            value={year}
            onChange={setYear}
          />
        }
      />

      {/* Overview */}
      <div>
        <h3 className="text-sm font-semibold text-ink-200 uppercase tracking-wider mb-4">Overview</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Tournaments" value={stats.totalTournaments} variant="tournaments" icon={Trophy} />
          <StatCard label="Invested" value={stats.totalInvested} variant="invested" icon={Coins} />
          <StatCard label="Prizes" value={stats.totalPrizes} variant="prizes" icon={DollarSign} />
          <StatCard label="Profit" value={stats.profit} variant="profit" icon={TrendingUp} sub={`${formatPct(stats.roi, true)} ROI`} subPositive={stats.roi >= 0} />
          <StatCard label="ROI" value={stats.roi} variant="roi" icon={Target} />
          <StatCard label="ITM" value={stats.itm} variant="itm" icon={Award} />
        </div>
      </div>

      {/* Monthly performance */}
      <div className="card p-6">
        <SectionHeader icon={Calendar} title="Monthly Performance" subtitle="Profit and volume by month" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-ink-100 mb-3">Profit by Month</h4>
            <BarChart data={monthly.map((m) => ({ label: m.label, value: m.value }))} height={260} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-ink-100 mb-3">Tournament Volume</h4>
            <BarChart data={volume.map((v) => ({ label: v.label, value: v.value }))} height={260} signed={false} />
          </div>
        </div>
      </div>

      {/* Cumulative profit */}
      <div className="card p-6">
        <SectionHeader icon={Activity} title="Cumulative Profit" subtitle="Running total across the selected period" />
        <ProfitChart data={series} height={300} />
      </div>

      {/* Buy-in performance */}
      <div className="card p-6">
        <SectionHeader icon={Layers} title="Performance by Buy-in" subtitle="Profit and ROI across stake levels" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-ink-100 mb-5">Profit by Buy-in</h4>
            <HBarChart
              data={byBuyIn.map((b) => ({ label: `$${b.buyIn}`, value: b.profit }))}
              formatValue={(v) => formatMoneyFull(v, true)}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-ink-100 mb-5">ROI by Buy-in</h4>
            <HBarChart
              data={byBuyIn.map((b) => ({ label: `$${b.buyIn}`, value: b.roi }))}
              formatValue={(v) => formatPct(v, true)}
            />
          </div>
        </div>
      </div>

      {/* Game type + position distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <SectionHeader icon={PieChart} title="Performance by Game Type" />
          <div className="space-y-6">
            <DonutChart
              data={byType.map((t, i) => ({ label: t.type, value: t.count, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
              size={180}
            />
            <div className="space-y-2">
              {byType.map((t) => (
                <div key={t.type} className="flex items-center justify-between rounded-lg border border-ink-700/60 bg-ink-850 px-4 py-3">
                  <span className="text-sm font-medium text-ink-100">{t.type}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-ink-300 tabular-nums">{t.count} played</span>
                    <span className={`font-semibold tabular-nums ${t.profit >= 0 ? 'text-brand' : 'text-loss'}`}>
                      {formatMoneyFull(t.profit, true)}
                    </span>
                    <span className={`tabular-nums w-16 text-right ${t.roi >= 0 ? 'text-brand' : 'text-loss'}`}>
                      {formatPct(t.roi, true)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <SectionHeader icon={BarChart3} title="Position Distribution" subtitle="Finish percentile breakdown" />
          <div className="space-y-3 mt-4">
            {positions.map((p, i) => (
              <div key={p.label} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-ink-100 font-medium">{p.label}</span>
                  <span className="text-sm text-ink-300 tabular-nums">{p.count.toLocaleString()}</span>
                </div>
                <div className="h-2.5 rounded-full bg-ink-850 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(p.count / maxPos) * 100}%`,
                      background: i === 0 ? 'linear-gradient(90deg, #2BE5A0, #16C98A)' : 'linear-gradient(90deg, #2B333E, #3A434F)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
