import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { formatDate } from '@/lib/format';
import { SheetShareInstructions } from '@/components/ui/SheetShareInstructions';
import { SERVICE_ACCOUNT_EMAIL } from '@/lib/serviceAccount';

export function DataStatusBar() {
  const { source, error, errorKind, meta, loading, refetch } = useAppData();

  if (loading) return null;

  if (error && errorKind === 'sheet-permission') {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-4 md:px-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-100">
                No agregaste {SERVICE_ACCOUNT_EMAIL} como Editor
              </p>
              <p className="mt-1 text-ink-300">
                Tu Sheet está vinculado, pero falta invitar ese email en Google Sheets → Compartir.
              </p>
            </div>
          </div>
          <button onClick={() => refetch()} className="btn-ghost text-xs py-1 px-2 flex-shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
        <SheetShareInstructions variant="inline" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-loss/20 bg-loss/10 px-4 py-2 text-sm text-loss md:px-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>No se pudo conectar a Google Sheets. {error}</span>
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-xs py-1 px-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  if (source === 'empty') return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand/10 bg-brand/5 px-4 py-1.5 text-2xs text-ink-300 md:px-6">
      <div className="flex items-center gap-1.5">
        <Database className="h-3.5 w-3.5 text-brand" />
        <span>
          Conectado a Google Sheets
          {meta.lastSync && (
            <> · última sync {formatDate(meta.lastSync, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
          )}
        </span>
      </div>
      <button onClick={() => refetch()} className="text-ink-400 hover:text-white transition">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
