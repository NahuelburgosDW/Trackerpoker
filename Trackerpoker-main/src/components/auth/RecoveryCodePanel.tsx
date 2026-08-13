import { useState } from 'react';
import { Copy, Check, ShieldAlert } from 'lucide-react';

type Props = {
  code: string;
  onContinue: () => void;
  continueLabel?: string;
  title?: string;
  subtitle?: string;
};

export function RecoveryCodePanel({
  code,
  onContinue,
  continueLabel = 'Continuar',
  title = 'Tu código de recuperación',
  subtitle = 'Quedó guardado en el Sheet maestro (pestaña Users, columna recoveryCode). También podés copiarlo.',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/10 flex-shrink-0">
          <ShieldAlert className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-sm text-ink-300 mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3">
        <code className="font-mono text-lg tracking-widest text-ink-100">{code}</code>
        <button type="button" onClick={copy} className="btn-outline shrink-0">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm text-ink-200 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        Guardé o anoté este código. También está en el Google Sheet maestro.
      </label>

      <button type="button" disabled={!ack} onClick={onContinue} className="btn-primary w-full">
        {continueLabel}
      </button>
    </div>
  );
}
