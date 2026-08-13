import { useMemo, useState } from 'react';
import { Search, Table2, Pencil, Trash2, Eye, X, Save } from 'lucide-react';
import { tournaments, YEARS, type GameType } from '@/data/mock';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Chip } from '@/components/ui/SegmentedControl';
import { formatDate, formatMoneyFull, formatPct } from '@/lib/format';

const GAME_TYPES: GameType[] = ['MTT', 'Spin & Gold', 'Other'];

export function AdminTournaments() {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [detail, setDetail] = useState<typeof tournaments[0] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (year !== 'all' && new Date(t.date).getFullYear() !== parseInt(year)) return false;
      if (gameType !== 'all' && t.gameType !== gameType) return false;
      return true;
    });
  }, [search, year, gameType]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="space-y-6">
      <SectionHeader icon={Table2} title="Tournaments" subtitle={`${filtered.length.toLocaleString()} records in database`} />

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by tournament name..."
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mr-1">Year</span>
            <Chip active={year === 'all'} onClick={() => { setYear('all'); setPage(0); }}>All</Chip>
            {YEARS.map((y) => (
              <Chip key={y} active={year === String(y)} onClick={() => { setYear(String(y)); setPage(0); }}>{y}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mr-1">Type</span>
            <Chip active={gameType === 'all'} onClick={() => { setGameType('all'); setPage(0); }}>All</Chip>
            {GAME_TYPES.map((g) => (
              <Chip key={g} active={gameType === g} onClick={() => { setGameType(g); setPage(0); }}>{g}</Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-6">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-ink-700">
                <th className="table-th">Date</th>
                <th className="table-th">Tournament</th>
                <th className="table-th text-right">Buy-in</th>
                <th className="table-th">Type</th>
                <th className="table-th text-right">Pos / Players</th>
                <th className="table-th text-right">Prize</th>
                <th className="table-th text-right">Profit</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((t) => {
                const profit = t.prize - t.buyIn;
                const positive = profit >= 0;
                return (
                  <tr key={t.id} className="border-b border-ink-750/60 hover:bg-ink-750/40 transition-colors">
                    <td className="table-td text-ink-300">{formatDate(t.date)}</td>
                    <td className="table-td font-medium text-white">{t.name}</td>
                    <td className="table-td text-right tabular-nums">${t.buyIn.toFixed(2)}</td>
                    <td className="table-td">
                      <span className="chip border-ink-700 bg-ink-850 text-ink-200">{t.gameType}</span>
                    </td>
                    <td className="table-td text-right tabular-nums">
                      <span className="text-white">{t.position}</span>
                      <span className="text-ink-400"> / {t.players.toLocaleString()}</span>
                    </td>
                    <td className="table-td text-right tabular-nums">{t.prize > 0 ? `$${t.prize.toFixed(2)}` : <span className="text-ink-400">—</span>}</td>
                    <td className={`table-td text-right tabular-nums font-semibold ${positive ? 'text-brand' : 'text-loss'}`}>
                      {formatMoneyFull(profit, true)}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetail(t)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing(t.id)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-300 hover:text-gold hover:bg-ink-700 transition" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="grid h-7 w-7 place-items-center rounded-lg text-ink-300 hover:text-loss hover:bg-ink-700 transition" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-ink-300 tabular-nums">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline px-3 py-1.5 text-xs disabled:opacity-40">Prev</button>
              <span className="text-xs text-ink-200 tabular-nums">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-outline px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal title="Tournament Details" onClose={() => setDetail(null)}>
          <DetailGrid t={detail} />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title="Edit Tournament" onClose={() => setEditing(null)}>
          <EditForm id={editing} onSave={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-800 p-6 shadow-soft animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailGrid({ t }: { t: typeof tournaments[0] }) {
  const profit = t.prize - t.buyIn;
  const roi = t.buyIn ? (profit / t.buyIn) * 100 : 0;
  const rows = [
    { label: 'Date', value: formatDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' }) },
    { label: 'Tournament', value: t.name },
    { label: 'Buy-in', value: `$${t.buyIn.toFixed(2)}` },
    { label: 'Game Type', value: t.gameType },
    { label: 'Position', value: `${t.position} / ${t.players.toLocaleString()}` },
    { label: 'Prize', value: t.prize > 0 ? `$${t.prize.toFixed(2)}` : '—' },
    { label: 'Profit', value: formatMoneyFull(profit, true), accent: profit >= 0 ? 'text-brand' : 'text-loss' },
    { label: 'ROI', value: t.prize > 0 ? formatPct(roi, true) : '—', accent: profit >= 0 ? 'text-brand' : 'text-loss' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1">{r.label}</div>
          <div className={`text-sm font-medium ${r.accent ?? 'text-white'}`}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function EditForm({ id, onSave }: { id: string; onSave: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Tournament Name</label>
        <input className="input" defaultValue={tournaments.find((t) => t.id === id)?.name ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Buy-in</label>
          <input className="input" type="number" step="0.01" defaultValue={tournaments.find((t) => t.id === id)?.buyIn ?? 0} />
        </div>
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Prize</label>
          <input className="input" type="number" step="0.01" defaultValue={tournaments.find((t) => t.id === id)?.prize ?? 0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Position</label>
          <input className="input" type="number" defaultValue={tournaments.find((t) => t.id === id)?.position ?? 0} />
        </div>
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Players</label>
          <input className="input" type="number" defaultValue={tournaments.find((t) => t.id === id)?.players ?? 0} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onSave} className="btn-outline">Cancel</button>
        <button onClick={onSave} className="btn-primary">
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}
