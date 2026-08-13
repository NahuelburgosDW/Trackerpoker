import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, X, Check,
  AlertTriangle, ArrowRight, Copy,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useRouter } from '@/lib/router';

type FileItem = {
  name: string;
  size: string;
  status: 'pending' | 'processing' | 'done' | 'error';
};

export function AdminImport() {
  const { navigate } = useRouter();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [imported, setImported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const items: FileItem[] = Array.from(fileList)
      .filter((f) => f.name.endsWith('.txt'))
      .map((f) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
        status: 'pending' as const,
      }));
    setFiles((prev) => [...prev, ...items]);
    setImported(false);
    items.forEach((_, idx) => {
      setTimeout(() => {
        setFiles((prev) => prev.map((f, i) => (i === prev.length - items.length + idx ? { ...f, status: 'processing' } : f)));
      }, idx * 400);
      setTimeout(() => {
        setFiles((prev) => prev.map((f, i) => (i === prev.length - items.length + idx ? { ...f, status: 'done' } : f)));
      }, idx * 400 + 1200);
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const doImport = () => {
    setImported(true);
  };

  const reset = () => {
    setFiles([]);
    setImported(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={Upload} title="Import TXT" subtitle="Upload GGPoker tournament hand history files" />

      {!imported ? (
        <>
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
              accept=".txt"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl transition-colors ${dragging ? 'bg-brand/10' : 'bg-ink-700/60'}`}>
              <Upload className={`h-7 w-7 transition-colors ${dragging ? 'text-brand' : 'text-ink-200'}`} strokeWidth={1.8} />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold">
              {dragging ? 'Drop files to upload' : 'Drop GGPoker TXT files here'}
            </h3>
            <p className="text-sm text-ink-300 mt-1">or click to browse files</p>
            <p className="text-2xs text-ink-400 mt-3">Accepts .txt files · Multiple files supported</p>
          </div>

          {files.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-ink-100">{files.length} file(s) selected</h3>
                <button onClick={doImport} className="btn-primary" disabled={files.some((f) => f.status === 'processing')}>
                  <Upload className="h-4 w-4" />
                  Import {files.length} file(s)
                </button>
              </div>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3 animate-fade-up">
                    <FileIcon status={f.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-100 truncate">{f.name}</div>
                      <div className="text-2xs text-ink-300">{f.size}</div>
                    </div>
                    <FileStatus status={f.status} />
                    <button onClick={() => removeFile(i)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <ImportResult onReset={reset} onViewTournaments={() => navigate('/admin/tournaments')} />
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
    pending: { label: 'Pending', class: 'text-ink-300' },
    processing: { label: 'Processing', class: 'text-gold' },
    done: { label: 'Ready', class: 'text-brand' },
    error: { label: 'Error', class: 'text-loss' },
  };
  const s = map[status];
  return <span className={`text-2xs font-medium ${s.class}`}>{s.label}</span>;
}

function ImportResult({ onReset, onViewTournaments }: { onReset: () => void; onViewTournaments: () => void }) {
  const summary = [
    { label: 'Tournaments Found', value: '25', icon: FileText, accent: 'text-white', bg: 'bg-ink-700/60' },
    { label: 'New', value: '22', icon: Check, accent: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Duplicates', value: '3', icon: Copy, accent: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Errors', value: '0', icon: AlertTriangle, accent: 'text-loss', bg: 'bg-loss/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-8 text-center animate-fade-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 border border-brand/20">
          <CheckCircle2 className="h-8 w-8 text-brand" />
        </div>
        <h2 className="font-display text-2xl font-semibold mt-5">Import Completed</h2>
        <p className="text-sm text-ink-300 mt-1">4 files processed successfully</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s, i) => {
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
          View Tournaments
          <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={onReset} className="btn-outline">
          Import More
        </button>
      </div>
    </div>
  );
}
