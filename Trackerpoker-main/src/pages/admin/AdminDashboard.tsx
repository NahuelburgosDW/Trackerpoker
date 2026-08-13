import { useMemo } from 'react';
import {
  Upload, CheckCircle2, AlertTriangle, Copy, FileText, Clock,
  Package, XCircle, ArrowRight, Database, Wifi, WifiOff,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useRouter } from '@/lib/router';
import { formatDate } from '@/lib/format';
import { useAppData } from '@/hooks/useAppData';

export function AdminDashboard() {
  const { navigate } = useRouter();
  const { tournaments, importLogs, meta, source, years } = useAppData();

  const lastImport = importLogs[0] ?? null;

  const cards = useMemo(() => {
    const totalNew = importLogs.reduce((s, l) => s + l.newCount, 0);
    const totalDupes = importLogs.reduce((s, l) => s + l.duplicates, 0);
    const totalErrors = importLogs.reduce((s, l) => s + l.errors, 0);

    return [
      { label: 'Torneos totales', value: tournaments.length.toLocaleString(), icon: Package, accent: 'text-white', bg: 'bg-ink-700/60' },
      { label: 'Importados (hist.)', value: totalNew.toLocaleString(), icon: CheckCircle2, accent: 'text-brand', bg: 'bg-brand/10' },
      { label: 'Duplicados', value: totalDupes.toLocaleString(), icon: Copy, accent: 'text-gold', bg: 'bg-gold/10' },
      { label: 'Errores', value: totalErrors.toLocaleString(), icon: XCircle, accent: 'text-loss', bg: 'bg-loss/10' },
    ];
  }, [tournaments, importLogs]);

  const sheetsConnected = source === 'sheets' && meta.connected;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Database}
        title="Dashboard"
        subtitle="Estado de importaciones y base de datos"
        actions={
          <button onClick={() => navigate('/admin/import')} className="btn-primary group">
            <Upload className="h-4 w-4" />
            Importar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="card card-hover p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${c.bg}`}>
                  <Icon className={`h-[18px] w-[18px] ${c.accent}`} strokeWidth={2} />
                </div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-ink-300">{c.label}</span>
              </div>
              <div className={`stat-value text-3xl ${c.accent}`}>{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-100 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-ink-200" />
            Importaciones recientes
          </h3>
          {importLogs.length === 0 ? (
            <p className="text-sm text-ink-300 py-8 text-center">Todavía no hay importaciones registradas.</p>
          ) : (
            <div className="space-y-2">
              {importLogs.slice(0, 8).map((imp) => (
                <div key={imp.id} className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3">
                  <StatusIcon status={imp.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-100 truncate">{imp.fileName}</div>
                    <div className="text-2xs text-ink-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(imp.processedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{imp.found}</div>
                    <div className="text-2xs text-ink-300">encontrados</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink-100 mb-4">Base de datos</h3>
            <div className="space-y-3">
              <Row label="Torneos" value={tournaments.length.toLocaleString()} />
              <Row label="Años" value={years.join(', ') || '—'} />
              <Row label="Fuente" value={source === 'sheets' ? 'Google Sheets' : 'Demo local'} />
              {meta.lastSync && (
                <Row label="Última sync" value={formatDate(meta.lastSync, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} />
              )}
            </div>
          </div>

          {lastImport && (
            <div>
              <h3 className="text-sm font-semibold text-ink-100 mb-4">Última importación</h3>
              <div className="space-y-3">
                <Row label="Archivo" value={lastImport.fileName} />
                <Row label="Encontrados" value={String(lastImport.found)} />
                <Row label="Nuevos" value={String(lastImport.newCount)} valueClass="text-brand" />
                <Row label="Duplicados" value={String(lastImport.duplicates)} valueClass="text-gold" />
                <Row label="Errores" value={String(lastImport.errors)} valueClass="text-loss" />
              </div>
            </div>
          )}

          <div className={`rounded-xl border p-4 ${sheetsConnected ? 'border-brand/20 bg-brand/5' : 'border-gold/20 bg-gold/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              {sheetsConnected ? (
                <Wifi className="h-4 w-4 text-brand" />
              ) : (
                <WifiOff className="h-4 w-4 text-gold" />
              )}
              <span className={`text-sm font-semibold ${sheetsConnected ? 'text-brand' : 'text-gold'}`}>
                Google Sheets {sheetsConnected ? 'conectado' : 'no configurado'}
              </span>
            </div>
            <p className="text-2xs text-ink-300">
              {sheetsConnected
                ? 'Los datos se leen y escriben desde tu spreadsheet.'
                : 'Vinculá tu Google Sheet desde el perfil para sincronizar datos.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle2 className="h-5 w-5 text-brand flex-shrink-0" />;
  if (status === 'partial') return <AlertTriangle className="h-5 w-5 text-gold flex-shrink-0" />;
  return <XCircle className="h-5 w-5 text-loss flex-shrink-0" />;
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-300">{label}</span>
      <span className={`text-sm font-semibold tabular-nums text-right truncate max-w-[160px] ${valueClass ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
