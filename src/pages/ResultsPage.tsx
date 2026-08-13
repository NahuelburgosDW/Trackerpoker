import { useMemo, useState } from 'react';
import { Search, Filter, BarChart3, X } from 'lucide-react';
import { tournaments, YEARS, type GameType } from '@/data/mock';
import { TournamentTable } from '@/components/ui/TournamentTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Chip } from '@/components/ui/SegmentedControl';
import { computeStats } from '@/data/mock';
import { formatMoneyFull, formatPct, formatNumber } from '@/lib/format';
import { Trophy, Coins, DollarSign, TrendingUp } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BUY_INS = ['0.50', '1.00', '2.50', '5.40', '10.00', '25.00', '50.00'];
const GAME_TYPES: GameType[] = ['MTT', 'Spin & Gold', 'Other'];
const RESULTS = [
  { label: 'All', value: 'all' },
  { label: 'ITM', value: 'itm' },
  { label: 'Out', value: 'out' },
];

export function ResultsPage() {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [buyIn, setBuyIn] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [result, setResult] = useState('all');

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (year !== 'all' && new Date(t.date).getFullYear() !== parseInt(year)) return false;
      if (month !== 'all' && new Date(t.date).getMonth() !== parseInt(month)) return false;
      if (buyIn !== 'all' && t.buyIn !== parseFloat(buyIn)) return false;
      if (gameType !== 'all' && t.gameType !== gameType) return false;
      if (result === 'itm' && t.prize <= 0) return false;
      if (result === 'out' && t.prize > 0) return false;
      return true;
    });
  }, [search, year, month, buyIn, gameType, result]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const activeFilters = [year, month, buyIn, gameType, result].filter((f) => f !== 'all').length;

  const reset = () => {
    setSearch('');
    setYear('all');
    setMonth('all');
    setBuyIn('all');
    setGameType('all');
    setResult('all');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart3}
        title="Results"
        subtitle={`${filtered.length.toLocaleString()} tournaments found`}
      />

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={Trophy} label="Tournaments" value={formatNumber(stats.totalTournaments)} />
        <MiniStat icon={Coins} label="Invested" value={formatMoneyFull(stats.totalInvested)} />
        <MiniStat icon={DollarSign} label="Prizes" value={formatMoneyFull(stats.totalPrizes)} />
        <MiniStat icon={TrendingUp} label="Profit" value={formatMoneyFull(stats.profit, true)} positive={stats.profit >= 0} />
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tournaments..."
                className="input pl-10"
              />
            </div>
            {activeFilters > 0 && (
              <button onClick={reset} className="btn-ghost text-xs">
                <X className="h-3.5 w-3.5" />
                Clear filters ({activeFilters})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterRow label="Year">
              {['all', ...YEARS.map(String)].map((y) => (
                <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                  {y === 'all' ? 'All' : y}
                </Chip>
              ))}
            </FilterRow>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterRow label="Month">
              <Chip active={month === 'all'} onClick={() => setMonth('all')}>All</Chip>
              {MONTHS.map((m, i) => (
                <Chip key={m} active={month === String(i)} onClick={() => setMonth(String(i))}>{m}</Chip>
              ))}
            </FilterRow>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterRow label="Buy-in">
              <Chip active={buyIn === 'all'} onClick={() => setBuyIn('all')}>All</Chip>
              {BUY_INS.map((b) => (
                <Chip key={b} active={buyIn === b} onClick={() => setBuyIn(b)}>${b}</Chip>
              ))}
            </FilterRow>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterRow label="Type">
              <Chip active={gameType === 'all'} onClick={() => setGameType('all')}>All</Chip>
              {GAME_TYPES.map((g) => (
                <Chip key={g} active={gameType === g} onClick={() => setGameType(g)}>{g}</Chip>
              ))}
            </FilterRow>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterRow label="Result">
              {RESULTS.map((r) => (
                <Chip key={r.value} active={result === r.value} onClick={() => setResult(r.value)}>{r.label}</Chip>
              ))}
            </FilterRow>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-6">
        <TournamentTable tournaments={filtered} pageSize={12} />
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mr-1 flex items-center gap-1">
        <Filter className="h-3 w-3" />
        {label}
      </span>
      {children}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, positive }: { icon: typeof Trophy; label: string; value: string; positive?: boolean }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-700/60">
        <Icon className="h-4 w-4 text-ink-200" strokeWidth={2} />
      </div>
      <div>
        <div className="text-2xs font-semibold uppercase tracking-wider text-ink-300">{label}</div>
        <div className={`stat-value text-lg ${positive === undefined ? 'text-white' : positive ? 'text-brand' : 'text-loss'}`}>{value}</div>
      </div>
    </div>
  );
}
