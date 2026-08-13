import { useState } from 'react';
import { KeyRound, Spade, AlertCircle, AtSign, Lock, Shield } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { resetPassword } from '@/services/registry/client';
import { validatePasswordClient, validateRecoveryCodeClient } from '@/lib/validation';
import { AuthBackLink } from '@/components/auth/AuthBackLink';
import { toUserFacingError } from '@/lib/userFacingError';

export function ForgotPasswordPage() {
  const { navigate } = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Ingresá tu usuario o email');
      return;
    }
    const codeErr = validateRecoveryCodeClient(recoveryCode);
    if (codeErr) {
      setError(codeErr);
      return;
    }
    const pErr = validatePasswordClient(password, confirmPassword);
    if (pErr) {
      setError(pErr);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(identifier, recoveryCode, password);
      setDone(true);
    } catch (err) {
      setError(toUserFacingError(err, 'Error al restablecer la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <AuthBackLink />
        <div className="text-center mb-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <Spade className="h-7 w-7 text-brand" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold">Recuperar contraseña</h1>
          <p className="text-sm text-ink-300 mt-2">
            Usá el código de recuperación que guardaste al crear la cuenta
          </p>
        </div>

        {done ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand/10">
              <KeyRound className="h-6 w-6 text-brand" />
            </div>
            <p className="text-sm text-ink-100">Contraseña actualizada. Ya podés iniciar sesión.</p>
            <button type="button" onClick={() => navigate('/')} className="btn-primary w-full">
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div>
              <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
                Usuario o email
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  className="input pl-10"
                  placeholder="nahuel o tu@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
                Código de recuperación
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  className="input pl-10 font-mono tracking-widest uppercase"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="Repetí la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-loss">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              <KeyRound className="h-4 w-4" />
              {loading ? 'Actualizando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        <p className="text-sm text-ink-300 mt-6 text-center">
          <button type="button" onClick={() => navigate('/')} className="text-brand hover:underline">
            Volver a iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
