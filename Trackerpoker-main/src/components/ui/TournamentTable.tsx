import { useMemo, useState } from 'react';
import type { Tournament } from '@/domain/types';
import { formatMoneyFull, formatPct, formatDate } from '@/lib/format';
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowRight } from 'lucide-react';

type SortKey = 'date' | 'name' | 'buyIn' | 'position' | 'players' | 'prize' | 'profit' | 'roi';
type SortDir = 'asc' | 'desc';

type Props = {
  tournaments: Tournament[];
  pageSize?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  dense?: boolean;
};

export function TournamentTable({ tournaments, pageSize = 8, showViewAll, onViewAll, dense }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...tournaments].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'profit') {
        av = a.prize - a.buyIn;
        bv = b.prize - b.buyIn;
      } else if (sortKey === 'roi') {
        av = a.buyIn ? (a.prize - a.buyIn) / a.buyIn : 0;
        bv = b.buyIn ? (b.prize - b.buyIn) / b.buyIn : 0;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [tournaments, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="h-3.5 w-3.5 text-ink-400" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-brand" /> : <ChevronDown className="h-3.5 w-3.5 text-brand" />;
  };

  const cols: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'date', label: 'Date' },
    { key: 'name', label: 'Tournament' },
    { key: 'buyIn', label: 'Buy-in', align: 'right' },
    { key: 'position', label: 'Position' },
    { key: 'players', label: 'Players', align: 'right' },
    { key: 'prize', label: 'Prize', align: 'right' },
    { key: 'profit', label: 'Profit', align: 'right' },
    { key: 'roi', label: 'ROI', align: 'right' },
  ];

  return (
    <div>
      <div className="overflow-x-auto no-scrollbar -mx-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink-700">
              {cols.map((c) => (
                <th key={c.key} className={`table-th ${c.align ? 'text-right' : ''}`}>
                  <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1.5 hover:text-white transition">
                    {c.label}
                    <SortIcon k={c.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((t) => {
              const profit = t.prize - t.buyIn;
              const roi = t.buyIn ? (profit / t.buyIn) * 100 : 0;
              const positive = profit >= 0;
              return (
                <tr key={t.id} className="border-b border-ink-750/60 hover:bg-ink-750/40 transition-colors">
                  <td className="table-td text-ink-300">{formatDate(t.date)}</td>
                  <td className="table-td font-medium text-white">{t.name}</td>
                  <td className="table-td text-right tabular-nums">${t.buyIn.toFixed(2)}</td>
                  <td className="table-td tabular-nums">
                    <span className="text-white">{t.position}</span>
                    <span className="text-ink-400"> / {t.players.toLocaleString()}</span>
                  </td>
                  <td className="table-td text-right tabular-nums text-ink-200">{t.players.toLocaleString()}</td>
                  <td className="table-td text-right tabular-nums">{t.prize > 0 ? `$${t.prize.toFixed(2)}` : <span className="text-ink-400">—</span>}</td>
                  <td className={`table-td text-right tabular-nums font-semibold ${positive ? 'text-brand' : 'text-loss'}`}>
                    {formatMoneyFull(profit, true)}
                  </td>
                  <td className={`table-td text-right tabular-nums font-medium ${positive ? 'text-brand' : 'text-loss'}`}>
                    {t.prize > 0 ? formatPct(roi, true) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1">
        {showViewAll ? (
          <button onClick={onViewAll} className="btn-outline group">
            View all tournaments
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : <span />}

        {!dense && totalPages > 1 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-ink-300 tabular-nums">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length.toLocaleString()}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="grid h-8 w-8 place-items-center rounded-lg border border-ink-700 text-ink-200 hover:text-white hover:border-ink-600 disabled:opacity-40 transition"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="grid h-8 w-8 place-items-center rounded-lg border border-ink-700 text-ink-200 hover:text-white hover:border-ink-600 disabled:opacity-40 transition"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
