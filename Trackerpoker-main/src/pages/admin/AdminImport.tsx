import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, X, Check,
  AlertTriangle, ArrowRight, Copy, Spade,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useRouter } from '@/lib/router';
import { useAppData } from '@/hooks/useAppData';
import {
  parseGgPokerFiles, parsedToTournament, parsedToKeyHand, fileKindLabel, KEY_HAND_BB_THRESHOLD,
  type ParsedGgTournament, type ParsedGgHand, type GgFileKind,
} from '@/services/import/ggPokerParser';
import { DEFAULT_STACK_PCT_THRESHOLD } from '@/services/import/handClassification';
import { formatMoneyFull, formatDate } from '@/lib/format';
import { validateTxtFileClient, tournamentKey, MAX_TXT_FILES, MAX_TOURNAMENTS_PER_IMPORT } from '@/lib/validation';

type FileItem = {
  name: string;
  size: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  content?: string;
  kind?: GgFileKind;
  parsed?: ParsedGgTournament[];
  hands?: ParsedGgHand[];
};

type ImportSummary = {
  found: number;
  newCount: number;
  duplicates: number;
  errors: number;
  handsNew: number;
  handsDup?: number;
  tournaments: ParsedGgTournament[];
};

export function AdminImport() {
  const { navigate } = useRouter();
  const { player, tournaments, upsertTournaments, upsertHands, logImport } = useAppData();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const readFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    setImportError('');
    setSummary(null);

    const incoming = Array.from(fileList);
    const items: FileItem[] = [];
    const currentCount = files.filter((f) => f.status !== 'error').length;
    let acceptedCount = 0;

    for (const file of incoming) {
      const size = `${(file.size / 1024).toFixed(1)} KB`;

      if (!file.name.toLowerCase().endsWith('.txt')) {
        items.push({ name: file.name, size, status: 'error', error: 'Solo se permiten archivos .txt' });
        continue;
      }

      if (currentCount + acceptedCount >= MAX_TXT_FILES) {
        items.push({
          name: file.name,
          size,
          status: 'error',
          error: `Máximo ${MAX_TXT_FILES} archivos por importación`,
        });
        continue;
      }

      const fileErr = validateTxtFileClient(file.name, file.size);
      if (fileErr) {
        items.push({ name: file.name, size, status: 'error', error: fileErr });
        continue;
      }

      const content = await file.text();
      const parsed = parseGgPokerFiles([{ name: file.name, content }]);
      const kind = parsed.kindByFile[file.name] ?? 'unknown';

      if (parsed.tournaments.length === 0 && parsed.hands.length === 0) {
        items.push({
          name: file.name,
          size,
          status: 'error',
          kind,
          error: parsed.errors[0] ?? 'No se detectó torneo en el archivo',
        });
        continue;
      }

      items.push({
        name: file.name,
        size,
        status: 'done',
        kind,
        content,
        parsed: parsed.tournaments,
        hands: parsed.hands,
      });
      acceptedCount++;
    }

    setFiles((prev) => [...prev, ...items]);
  }, [files]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    readFiles(e.dataTransfer.files);
  }, [readFiles]);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setSummary(null);
  };

  const doImport = async () => {
    setImportError('');
    setImporting(true);

    try {
      const ready = files.filter((f) => f.status === 'done' && ((f.parsed?.length ?? 0) > 0 || (f.hands?.length ?? 0) > 0));

      // Resumen → SOLO dashboard (torneos). Historial → SOLO Hands (manos clave).
      const summaryTournaments = ready
        .filter((f) => f.kind === 'tournament_summary')
        .flatMap((f) => f.parsed ?? []);
      const handsParsed = ready
        .filter((f) => f.kind === 'hand_history')
        .flatMap((f) => f.hands ?? []);

      const tournamentsPayload = summaryTournaments.map((p) => parsedToTournament(p, player.id));
      if (tournamentsPayload.length > MAX_TOURNAMENTS_PER_IMPORT) {
        throw new Error(`Máximo ${MAX_TOURNAMENTS_PER_IMPORT} torneos por importación. Sacá algunos archivos e importá en tandas.`);
      }

      const result = tournamentsPayload.length > 0
        ? await upsertTournaments(tournamentsPayload)
        : { found: 0, newCount: 0, duplicates: 0, errors: 0 };

      const handsPayload = handsParsed.map((h) => parsedToKeyHand(h, player.id));
      const handsResult = handsPayload.length > 0
        ? await upsertHands(handsPayload)
        : { found: 0, newCount: 0, duplicates: 0, errors: 0 };

      await logImport({
        fileName: ready.map((f) => f.name).join(', '),
        processedAt: new Date().toISOString(),
        found: summaryTournaments.length + handsParsed.length,
        newCount: result.newCount + handsResult.newCount,
        duplicates: result.duplicates + handsResult.duplicates,
        errors: result.errors + handsResult.errors,
        status: result.errors > 0 || handsResult.errors > 0 ? 'partial' : 'success',
      });

      setSummary({
        found: summaryTournaments.length,
        newCount: result.newCount,
        duplicates: result.duplicates,
        errors: result.errors,
        handsNew: handsResult.newCount,
        handsDup: handsResult.duplicates,
        tournaments: summaryTournaments,
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setSummary(null);
    setImportError('');
  };

  const previewTournaments = files
    .filter((f) => f.kind === 'tournament_summary')
    .flatMap((f) => f.parsed ?? []);
  const existingIds = new Set(tournaments.map((t) => tournamentKey(t.id)));

  const previewRows = previewTournaments.map((t) => {
    const id = `gg-${t.tournamentId}`;
    const isDuplicate = existingIds.has(tournamentKey(id));
    return { ...t, id, isDuplicate };
  });

  const batchSeen = new Set<string>();
  for (const row of previewRows) {
    const key = tournamentKey(row.id);
    if (batchSeen.has(key)) row.isDuplicate = true;
    batchSeen.add(key);
  }

  const newCountPreview = previewRows.filter((r) => !r.isDuplicate).length;
  const duplicateCountPreview = previewRows.length - newCountPreview;
  const handsPreviewCount = files
    .filter((f) => f.kind === 'hand_history')
    .reduce((n, f) => n + (f.hands?.length ?? 0), 0);
  const hasSummaryFiles = files.some((f) => f.status === 'done' && f.kind === 'tournament_summary');
  const hasHhFiles = files.some((f) => f.status === 'done' && f.kind === 'hand_history');
  const canImport = !importing && (newCountPreview > 0 || handsPreviewCount > 0);

  const importButtonLabel = (() => {
    if (importing) return 'Importando...';
    if (newCountPreview > 0 || handsPreviewCount > 0) {
      const parts: string[] = [];
      if (newCountPreview > 0) parts.push(`${newCountPreview} torneo(s)`);
      if (handsPreviewCount > 0) parts.push(`${handsPreviewCount} mano(s) clave`);
      return `Importar ${parts.join(' + ')}`;
    }
    if (hasHhFiles && handsPreviewCount === 0) {
      return `Sin manos clave`;
    }
    if (hasSummaryFiles && newCountPreview === 0) {
      return 'Sin torneos nuevos';
    }
    return 'Importar';
  })();

  const keyHandRule = `≥${KEY_HAND_BB_THRESHOLD} BB o ≥${Math.round(DEFAULT_STACK_PCT_THRESHOLD * 100)}% del stack`;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Upload}
        title="Importar TXT"
        subtitle="Historial de manos → Manos clave · Resumen de torneo → Dashboard"
      />

      {!summary ? (
        <>
          <div className="rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3 text-sm text-ink-300 space-y-1">
            <p>
              <span className="text-ink-100 font-medium">Resumen de torneo</span>
              {' '}(Buy-in, Players, “You finished…”, premio) → <span className="text-ink-100">Dashboard / Torneos</span>.
            </p>
            <p>
              <span className="text-ink-100 font-medium">Historial de manos</span>
              {' '}(Poker Hand # / cartas) → <span className="text-ink-100">Manos clave</span>
              {' '}(≥{KEY_HAND_BB_THRESHOLD} BB o ≥{Math.round(DEFAULT_STACK_PCT_THRESHOLD * 100)}% stack).
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
              dragging ? 'border-brand bg-brand/5 scale-[1.01]' : 'border-ink-600 bg-ink-850 hover:border-ink-500'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              multiple
              className="hidden"
              onChange={(e) => {
                readFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl transition-colors ${dragging ? 'bg-brand/10' : 'bg-ink-700/60'}`}>
              <Upload className={`h-7 w-7 transition-colors ${dragging ? 'text-brand' : 'text-ink-200'}`} strokeWidth={1.8} />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold">
              {dragging ? 'Soltá los archivos acá' : 'Arrastrá TXT de GGPoker acá'}
            </h3>
            <p className="text-sm text-ink-300 mt-1">o hacé click para elegir archivos</p>
            <p className="text-2xs text-ink-400 mt-3">
              Dos tipos: historial de manos (largo, cartas) o resumen (corto, premios/bounty). Hasta {MAX_TXT_FILES} archivos · 5 MB c/u
            </p>
          </div>

          {files.length > 0 && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-semibold text-ink-100">{files.length} archivo(s)</h3>
                <button
                  onClick={doImport}
                  className="btn-primary"
                  disabled={!canImport}
                  title={
                    !canImport && hasHhFiles && handsPreviewCount === 0
                      ? `Este historial no tiene manos clave (${keyHandRule})`
                      : !canImport && hasSummaryFiles
                        ? 'Esos torneos ya están en tu Sheet'
                        : undefined
                  }
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importButtonLabel}
                </button>
              </div>

              {hasHhFiles && handsPreviewCount === 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    El historial se leyó bien, pero no hay manos clave ({keyHandRule}).
                  </span>
                </div>
              )}

              {duplicateCountPreview > 0 && handsPreviewCount === 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {duplicateCountPreview} torneo(s) ya existen en tu Sheet y se omitirán.
                    {newCountPreview === 0 && ' No hay torneos nuevos para importar.'}
                  </span>
                </div>
              )}

              {handsPreviewCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-ink-200">
                  <Spade className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand" />
                  <span>
                    {handsPreviewCount} mano(s) clave ({keyHandRule}) se guardan en Hands con historial.
                  </span>
                </div>
              )}

              {importError && (
                <div className="flex items-center gap-2 text-sm text-loss">
                  <AlertTriangle className="h-4 w-4" />
                  {importError}
                </div>
              )}

              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3 animate-fade-up">
                    <FileIcon status={f.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-100 truncate">{f.name}</div>
                      <div className="text-2xs text-ink-300">
                        {f.size}
                        {f.kind ? ` · ${fileKindLabel(f.kind)}` : ''}
                        {f.hands?.length ? ` · ${f.hands.length} manos clave` : ''}
                        {f.parsed?.some((t) => t.bounty > 0) ? ' · con bounty' : ''}
                      </div>
                      {f.error && <div className="text-2xs text-loss mt-1">{f.error}</div>}
                    </div>
                    <FileStatus status={f.status} />
                    <button onClick={() => removeFile(i)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-ink-700/60">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-900/60 text-2xs uppercase tracking-wider text-ink-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                        <th className="px-4 py-3 text-left">Tipo torneo</th>
                        <th className="px-4 py-3 text-left">Costo</th>
                        <th className="px-4 py-3 text-left">Premio</th>
                        <th className="px-4 py-3 text-left">Ganancia</th>
                        <th className="px-4 py-3 text-left">Última mano</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((t) => (
                        <tr key={t.id} className={`border-t border-ink-700/40 ${t.isDuplicate ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 text-2xs text-ink-300">
                            {fileKindLabel(t.sourceKind)}
                            {t.bounty > 0 ? ` · bounty ${formatMoneyFull(t.bounty)}` : ''}
                          </td>
                          <td className="px-4 py-3">
                            {t.isDuplicate ? (
                              <span className="inline-flex items-center rounded-md bg-gold/10 px-2 py-0.5 text-2xs font-medium text-gold">
                                Duplicado
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-brand/10 px-2 py-0.5 text-2xs font-medium text-brand">
                                Nuevo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink-100">{t.name}</div>
                            <div className="text-2xs text-ink-400">{t.gameVariant}</div>
                          </td>
                          <td className="px-4 py-3">{formatMoneyFull(t.buyIn)}</td>
                          <td className="px-4 py-3">{formatMoneyFull(t.prize)}</td>
                          <td className={`px-4 py-3 font-medium ${t.profit >= 0 ? 'text-brand' : 'text-loss'}`}>
                            {formatMoneyFull(t.profit)}
                          </td>
                          <td className="px-4 py-3 text-2xs text-ink-300">
                            #{t.lastHandId}
                            {t.position > 0 && ` · P${t.position}/${t.players}`}
                          </td>
                          <td className="px-4 py-3 text-ink-300">
                            {formatDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <ImportResult summary={summary} onReset={reset} onViewTournaments={() => navigate('/admin/tournaments')} onViewHands={() => navigate('/hands')} />
      )}
    </div>
  );
}

function FileIcon({ status }: { status: FileItem['status'] }) {
  if (status === 'processing') return <Loader2 className="h-5 w-5 text-gold animate-spin flex-shrink-0" />;
  if (status === 'done') return <CheckCircle2 className="h-5 w-5 text-brand flex-shrink-0" />;
  if (status === 'error') return <XCircle className="h-5 w-5 text-loss flex-shrink-0" />;
  return <FileText className="h-5 w-5 text-ink-300 flex-shrink-0" />;
}

function FileStatus({ status }: { status: FileItem['status'] }) {
  const map = {
    pending: { label: 'Pendiente', class: 'text-ink-300' },
    processing: { label: 'Analizando', class: 'text-gold' },
    done: { label: 'Listo', class: 'text-brand' },
    error: { label: 'Error', class: 'text-loss' },
  };
  const s = map[status];
  return <span className={`text-2xs font-medium ${s.class}`}>{s.label}</span>;
}

function ImportResult({
  summary,
  onReset,
  onViewTournaments,
  onViewHands,
}: {
  summary: ImportSummary;
  onReset: () => void;
  onViewTournaments: () => void;
  onViewHands: () => void;
}) {
  const cards = [
    { label: 'Torneos detectados', value: String(summary.found), icon: FileText, accent: 'text-white', bg: 'bg-ink-700/60' },
    { label: 'Nuevos', value: String(summary.newCount), icon: Check, accent: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Duplicados', value: String(summary.duplicates), icon: Copy, accent: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Manos clave', value: String(summary.handsNew ?? 0), icon: Spade, accent: 'text-gold', bg: 'bg-gold/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-8 text-center animate-fade-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 border border-brand/20">
          <CheckCircle2 className="h-8 w-8 text-brand" />
        </div>
        <h2 className="font-display text-2xl font-semibold mt-5">Importación completada</h2>
        <p className="text-sm text-ink-300 mt-1">
          {summary.newCount > 0 || (summary.handsNew ?? 0) > 0
            ? `${summary.newCount} torneo(s) nuevo(s)${(summary.handsNew ?? 0) > 0 ? ` · ${summary.handsNew} manos clave` : ''}`
            : `Sin cambios nuevos${(summary.handsDup ?? 0) > 0 ? ` · ${summary.handsDup} manos ya estaban` : ''}${summary.duplicates > 0 ? ` · ${summary.duplicates} torneos duplicados` : ''}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${s.bg} mb-3`}>
                <Icon className={`h-5 w-5 ${s.accent}`} strokeWidth={2} />
              </div>
              <div className={`stat-value text-3xl ${s.accent}`}>{s.value}</div>
              <div className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={onViewTournaments} className="btn-primary">
          Ver torneos
          <ArrowRight className="h-4 w-4" />
        </button>
        {(summary.handsNew ?? 0) > 0 && (
          <button onClick={onViewHands} className="btn-outline">
            Ver manos clave
          </button>
        )}
        <button onClick={onReset} className="btn-outline">
          Importar más
        </button>
      </div>
    </div>
  );
}
