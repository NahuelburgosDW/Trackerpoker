import { useEffect, useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { getServiceAccountEmail } from '@/services/sheets/backendApi';
import { SERVICE_ACCOUNT_EMAIL } from '@/lib/serviceAccount';

type Props = {
  variant?: 'inline' | 'card';
};

export function SheetShareInstructions({ variant = 'card' }: Props) {
  const [email, setEmail] = useState(SERVICE_ACCOUNT_EMAIL);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getServiceAccountEmail().then((fetched) => {
      if (fetched) setEmail(fetched);
    });
  }, []);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapperClass = variant === 'card'
    ? 'card p-4 border-amber-500/30 bg-amber-500/5 text-sm'
    : 'text-sm';

  return (
    <div className={wrapperClass}>
      <div className="flex items-start gap-2 mb-2">
        <Share2 className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
        <p className="font-semibold text-ink-100">
          Tenés que agregar este email como Editor
        </p>
      </div>

      <p className="text-ink-300 mb-3 ml-6">
        Si no agregaste <strong className="text-amber-200">{email}</strong>, la app no puede usar tu Sheet.
        &quot;Cualquiera con el enlace&quot; <strong>no sirve</strong>.
      </p>

      <div className="ml-6 flex flex-col sm:flex-row gap-2">
        <code className="flex-1 px-3 py-2 rounded-lg bg-ink-900 text-brand text-xs break-all select-all">
          {email}
        </code>
        <button type="button" onClick={copyEmail} className="btn-ghost text-xs py-2 px-3 whitespace-nowrap">
          {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar email'}
        </button>
      </div>

      <ol className="list-decimal list-inside space-y-1 text-ink-300 ml-6 mt-3">
        <li>Abrí tu Sheet → <strong>Compartir</strong></li>
        <li>En &quot;Agregar personas&quot;, pegá <strong>{email}</strong></li>
        <li>Elegí permiso <strong>Editor</strong> → Enviar</li>
        <li>Volvé acá y tocá <strong>Verificar permisos</strong> o <strong>Reintentar</strong></li>
      </ol>
    </div>
  );
}
