import { useState } from 'react';
import { Link2, Spade, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { SheetShareInstructions } from '@/components/ui/SheetShareInstructions';
import { checkSheetWriteAccessFromBackend } from '@/services/sheets/backendApi';
import { parseSpreadsheetId } from '@/services/sheets/parseUrl';
import { isSheetPermissionError } from '@/lib/sheetErrors';
import { missingServiceAccountMessage } from '@/lib/serviceAccount';
import { AuthBackLink } from '@/components/auth/AuthBackLink';
import { toUserFacingError } from '@/lib/userFacingError';

type Props = {
  username: string;
  onDone: () => void;
};

type VerifyState = 'idle' | 'checking' | 'ok' | 'fail';

export function ConnectSheetStep({ username, onDone }: Props) {
  const { linkPokerSheet, loading } = useAuth();
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');

  const handleVerify = async () => {
    setError('');
    setVerifyMessage('');
    const sheetId = parseSpreadsheetId(sheetUrl);
    if (!sheetId) {
      setVerifyState('fail');
      setVerifyMessage('El link del Google Sheet no es válido.');
      return;
    }

    setVerifyState('checking');
    try {
      await checkSheetWriteAccessFromBackend(sheetId);
      setVerifyState('ok');
      setVerifyMessage('Permisos OK — la app puede leer y escribir en tu Sheet.');
    } catch (err) {
      const message = toUserFacingError(err, 'Sin acceso al Sheet');
      setVerifyState('fail');
      setVerifyMessage(
        isSheetPermissionError(message)
          ? missingServiceAccountMessage()
          : message,
      );
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verifyState !== 'ok') {
      setError('Primero verificá los permisos del Sheet con el botón de abajo.');
      return;
    }

    try {
      await linkPokerSheet(sheetUrl);
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al vincular Sheet';
      setError(
        isSheetPermissionError(message)
          ? missingServiceAccountMessage()
          : message,
      );
      setVerifyState('fail');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-fade-up">
        <AuthBackLink />
        <div className="text-center mb-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <Spade className="h-7 w-7 text-brand" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold">Conectá tu Google Sheet</h1>
          <p className="text-sm text-ink-300 mt-2">
            Paso 3 de 3 — perfil <span className="text-brand">@{username}</span> creado
          </p>
        </div>

        <div className="card p-4 mb-4 border-brand/20 bg-brand/5 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-brand flex-shrink-0" />
          <p className="text-ink-200">
            Tu cuenta ya está en la pestaña <strong>Users</strong> del Sheet maestro.
            Ahora conectá tu Sheet de poker siguiendo los pasos de abajo.
          </p>
        </div>

        <div className="mb-4">
          <SheetShareInstructions />
        </div>

        <form onSubmit={handleLink} className="card p-6 space-y-4">
          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
              Link de tu Google Sheet de poker
            </label>
            <input
              className="input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => {
                setSheetUrl(e.target.value);
                setVerifyState('idle');
                setVerifyMessage('');
                setError('');
              }}
              required
            />
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={!sheetUrl.trim() || verifyState === 'checking'}
            className="btn-ghost w-full border border-ink-700"
          >
            <ShieldCheck className="h-4 w-4" />
            {verifyState === 'checking' ? 'Verificando permisos...' : 'Verificar permisos'}
          </button>

          {verifyState === 'ok' && (
            <div className="flex items-start gap-2 text-sm text-brand">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {verifyMessage}
            </div>
          )}

          {verifyState === 'fail' && verifyMessage && (
            <div className="flex items-start gap-2 text-sm text-loss">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {verifyMessage}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-loss">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !sheetUrl.trim() || verifyState !== 'ok'}
            className="btn-primary w-full"
          >
            <Link2 className="h-4 w-4" />
            {loading ? 'Vinculando...' : 'Vincular Sheet y continuar'}
          </button>

          {verifyState !== 'ok' && (
            <p className="text-2xs text-center text-ink-400">
              Tenés que verificar permisos antes de vincular el Sheet.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
