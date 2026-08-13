import { useMemo, useState } from 'react';
import { Search, Table2, Pencil, Trash2, Eye, X, Save, Loader2, AlertCircle } from 'lucide-react';
import { type GameType, type Tournament } from '@/domain/types';
import { useAppData } from '@/hooks/useAppData';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Chip } from '@/components/ui/SegmentedControl';
import { formatDate, formatMoneyFull, formatPct } from '@/lib/format';

const GAME_TYPES: GameType[] = ['MTT', 'Spin & Gold', 'Other'];

export function AdminTournaments() {
  const { tournaments, years, deleteTournament } = useAppData();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [detail, setDetail] = useState<Tournament | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tournament | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (year !== 'all' && new Date(t.date).getFullYear() !== parseInt(year)) return false;
      if (gameType !== 'all' && t.gameType !== gameType) return false;
      return true;
    });
  }, [search, year, gameType, tournaments]);

  const handleDelete = async (t: Tournament) => {
    setError('');
    setDeletingId(t.id);
    try {
      await deleteTournament(t.id);
      setConfirmDelete(null);
      if (detail?.id === t.id) setDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar el torneo');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="space-y-6">
      <SectionHeader icon={Table2} title="Torneos" subtitle={`${filtered.length.toLocaleString()} registros`} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-loss/30 bg-loss/5 px-4 py-3 text-sm text-loss">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar por nombre..."
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mr-1">Año</span>
            <Chip active={year === 'all'} onClick={() => { setYear('all'); setPage(0); }}>Todo</Chip>
            {years.map((y) => (
              <Chip key={y} active={year === String(y)} onClick={() => { setYear(String(y)); setPage(0); }}>{y}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mr-1">Tipo</span>
            <Chip active={gameType === 'all'} onClick={() => { setGameType('all'); setPage(0); }}>Todo</Chip>
            {GAME_TYPES.map((g) => (
              <Chip key={g} active={gameType === g} onClick={() => { setGameType(g); setPage(0); }}>{g}</Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        {pageData.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-8">No hay torneos para mostrar</p>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-ink-700">
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Torneo</th>
                  <th className="table-th text-right">Buy-in</th>
                  <th className="table-th">Tipo</th>
                  <th className="table-th text-right">Pos / Jugadores</th>
                  <th className="table-th text-right">Premio</th>
                  <th className="table-th text-right">Profit</th>
                  <th className="table-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((t) => {
                  const profit = t.prize - t.buyIn;
                  const positive = profit >= 0;
                  const busy = deletingId === t.id;
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetail(t)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditing(t.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:text-gold hover:bg-ink-700 transition"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setError(''); setConfirmDelete(t); }}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-loss/30 bg-loss/10 px-2.5 py-1.5 text-2xs font-semibold text-loss hover:bg-loss/20 transition disabled:opacity-50"
                            title="Borrar torneo"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-ink-300 tabular-nums">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} de {filtered.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline px-3 py-1.5 text-xs disabled:opacity-40">Prev</button>
              <span className="text-xs text-ink-200 tabular-nums">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-outline px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <Modal title="Detalle del torneo" onClose={() => setDetail(null)}>
          <DetailGrid t={detail} />
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => { setConfirmDelete(detail); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-sm font-semibold text-loss hover:bg-loss/20 transition"
            >
              <Trash2 className="h-4 w-4" />
              Borrar torneo
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title="Editar torneo" onClose={() => setEditing(null)}>
          <EditForm id={editing} tournaments={tournaments} onSave={() => setEditing(null)} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="¿Borrar torneo?" onClose={() => !deletingId && setConfirmDelete(null)}>
          <p className="text-sm text-ink-200">
            Vas a eliminar <span className="font-semibold text-white">{confirmDelete.name}</span>.
            También se borran las manos clave asociadas. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={Boolean(deletingId)}
              className="btn-outline"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(confirmDelete)}
              disabled={Boolean(deletingId)}
              className="inline-flex items-center gap-2 rounded-xl bg-loss px-4 py-2.5 text-sm font-semibold text-white hover:bg-loss/90 transition disabled:opacity-50"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deletingId ? 'Borrando...' : 'Sí, borrar'}
            </button>
          </div>
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

function DetailGrid({ t }: { t: Tournament }) {
  const profit = t.prize - t.buyIn;
  const roi = t.buyIn ? (profit / t.buyIn) * 100 : 0;
  const rows = [
    { label: 'Fecha', value: formatDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' }) },
    { label: 'Torneo', value: t.name },
    { label: 'Buy-in', value: `$${t.buyIn.toFixed(2)}` },
    { label: 'Tipo', value: t.gameType },
    { label: 'Posición', value: `${t.position} / ${t.players.toLocaleString()}` },
    { label: 'Premio', value: t.prize > 0 ? `$${t.prize.toFixed(2)}` : '—' },
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

function EditForm({ id, tournaments, onSave }: { id: string; tournaments: Tournament[]; onSave: () => void }) {
  const t = tournaments.find((x) => x.id === id);
  return (
    <div className="space-y-4">
      <div>
        <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Nombre</label>
        <input className="input" defaultValue={t?.name ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Buy-in</label>
          <input className="input" type="number" step="0.01" defaultValue={t?.buyIn ?? 0} />
        </div>
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Premio</label>
          <input className="input" type="number" step="0.01" defaultValue={t?.prize ?? 0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Posición</label>
          <input className="input" type="number" defaultValue={t?.position ?? 0} />
        </div>
        <div>
          <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Jugadores</label>
          <input className="input" type="number" defaultValue={t?.players ?? 0} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onSave} className="btn-outline">Cancelar</button>
        <button onClick={onSave} className="btn-primary">
          <Save className="h-4 w-4" />
          Guardar
        </button>
      </div>
    </div>
  );
}
