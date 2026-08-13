import { useMemo, useState } from 'react';
import {
  Upload, CheckCircle2, AlertTriangle, Copy, FileText, Clock,
  TrendingUp, Package, XCircle, ArrowRight, Database,
} from 'lucide-react';
import { tournaments } from '@/data/mock';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useRouter } from '@/lib/router';
import { formatDate } from '@/lib/format';

export function AdminDashboard() {
  const { navigate } = useRouter();
  const recentImports = useMemo(
    () => [
      { file: 'GG20260813-Tournament-123.txt', date: '2026-08-13T14:22:00Z', status: 'success', found: 25 },
      { file: 'GG20260812-Tournament-082.txt', date: '2026-08-12T18:05:00Z', status: 'success', found: 18 },
      { file: 'GG20260811-Tournament-041.txt', date: '2026-08-11T22:10:00Z', status: 'partial', found: 12 },
      { file: 'GG20260810-Tournament-007.txt', date: '2026-08-10T16:45:00Z', status: 'error', found: 0 },
    ],
    []
  );

  const cards = [
    { label: 'Imported Tournaments', value: '1,245', icon: Package, accent: 'text-white', bg: 'bg-ink-700/60' },
    { label: 'New Tournaments', value: '1,245', icon: TrendingUp, accent: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Duplicates', value: '38', icon: Copy, accent: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Errors', value: '2', icon: XCircle, accent: 'text-loss', bg: 'bg-loss/10' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Database}
        title="Dashboard"
        subtitle="Import status and data overview"
        actions={
          <button onClick={() => navigate('/admin/import')} className="btn-primary group">
            <Upload className="h-4 w-4" />
            Import
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
        {/* Import status */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-100 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-ink-200" />
            Recent Imports
          </h3>
          <div className="space-y-2">
            {recentImports.map((imp, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3">
                <StatusIcon status={imp.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-100 truncate">{imp.file}</div>
                  <div className="text-2xs text-ink-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(imp.date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{imp.found}</div>
                  <div className="text-2xs text-ink-300">found</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last import summary */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Last Import</h3>
          <div className="space-y-3">
            <Row label="Date" value="13 Aug 2026" />
            <Row label="Files processed" value="4" />
            <Row label="Tournaments found" value="25" />
            <Row label="New" value="22" valueClass="text-brand" />
            <Row label="Duplicates" value="3" valueClass="text-gold" />
            <Row label="Errors" value="0" valueClass="text-loss" />
          </div>
          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold text-brand">All systems operational</span>
            </div>
            <p className="text-2xs text-ink-300">Data is up to date. Last sync 2 hours ago.</p>
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-300">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
