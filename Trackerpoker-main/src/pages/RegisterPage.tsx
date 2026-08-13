import { useEffect, useState } from 'react';
import { UserPlus, Spade, AtSign, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { slugify, checkRegistryHealth, type RegistryHealth } from '@/services/registry/client';
import {
  validateEmailClient, validatePasswordClient, validateUsernameClient,
} from '@/lib/validation';
import { toUserFacingError } from '@/lib/userFacingError';
import { ConnectSheetStep } from '@/pages/ConnectSheetStep';
import { RecoveryCodePanel } from '@/components/auth/RecoveryCodePanel';

export function RegisterPage() {
  const { registerAccount, loading, user, needsSheet } = useAuth();
  const { navigate } = useRouter();

  const [step, setStep] = useState<'account' | 'recovery' | 'sheet'>(needsSheet && user ? 'sheet' : 'account');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [registry, setRegistry] = useState<RegistryHealth | null>(null);
  const [checkingRegistry, setCheckingRegistry] = useState(true);

  useEffect(() => {
    if (user && needsSheet && step === 'account' && !recoveryCode) setStep('sheet');
  }, [user, needsSheet, step, recoveryCode]);

  useEffect(() => {
    let cancelled = false;
    checkRegistryHealth().then((result) => {
      if (!cancelled) {
        setRegistry(result);
        setCheckingRegistry(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const registryOk = registry?.ok ?? false;
  const usernameError = username ? validateUsernameClient(username) : null;
  const emailError = email ? validateEmailClient(email) : null;
  const passwordError = password ? validatePasswordClient(password, confirmPassword) : null;
  const formValid = !usernameError && !emailError && !passwordError
    && username && email && password && confirmPassword;
  const canSubmit = registryOk && !loading && formValid;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const uErr = validateUsernameClient(username);
    const eErr = validateEmailClient(email);
    const pErr = validatePasswordClient(password, confirmPassword);
    if (uErr || eErr || pErr) {
      setError(uErr ?? eErr ?? pErr ?? 'Datos inválidos');
      return;
    }

    try {
      const result = await registerAccount(email, password, username);
      setRecoveryCode(result.recoveryCode);
      setStep('recovery');
    } catch (err) {
      setError(toUserFacingError(err, 'No se pudo crear la cuenta. Intentá de nuevo más tarde.'));
    }
  };

  if (step === 'recovery' && recoveryCode) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg animate-fade-up">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold">Paso 2 de 3 — código de recuperación</h1>
            <p className="text-sm text-ink-300 mt-2">Quedó guardado en el Sheet maestro. Copialo si querés tenerlo a mano.</p>
          </div>
          <RecoveryCodePanel
            code={recoveryCode}
            onContinue={() => setStep('sheet')}
          />
        </div>
      </div>
    );
  }

  if (step === 'sheet' && user) {
    return (
      <ConnectSheetStep
        username={user.slug}
        onDone={() => navigate(`/u/${user.slug}`)}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="text-center mb-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <Spade className="h-7 w-7 text-brand" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-ink-300 mt-2">Paso 1 de 3 — tus datos de acceso</p>
        </div>

        {!checkingRegistry && !registryOk && (
          <p className="mb-4 text-sm text-ink-300 text-center">
            El servicio no está disponible ahora. Intentá de nuevo más tarde.
          </p>
        )}

        <form onSubmit={handleCreateAccount} className="card p-6 space-y-4">
          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
              Usuario (tu perfil público)
            </label>
            <div className="flex items-center gap-2">
              <AtSign className="h-4 w-4 text-ink-400 flex-shrink-0" />
              <span className="text-sm text-ink-400">/u/</span>
              <input
                className="input flex-1"
                placeholder="nahuel"
                value={username}
                onChange={(e) => setUsername(slugify(e.target.value))}
                required
                autoComplete="username"
              />
            </div>
            <p className="text-2xs text-ink-400 mt-1.5">Tu URL pública será pokertracker.app/u/{username || 'usuario'}</p>
            {usernameError && <p className="text-2xs text-loss mt-1">{usernameError}</p>}
          </div>

          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="email"
                className="input pl-10"
                placeholder="tu@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {emailError && <p className="text-2xs text-loss mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
              Contraseña
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
            {passwordError && confirmPassword && <p className="text-2xs text-loss mt-1">{passwordError}</p>}
          </div>

          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
              Confirmar contraseña
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

          <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
            <UserPlus className="h-4 w-4" />
            {loading ? 'Creando perfil...' : 'Crear perfil'}
          </button>
        </form>

        <p className="text-sm text-ink-300 mt-6 text-center">
          ¿Ya tenés cuenta?{' '}
          <button onClick={() => navigate('/login')} className="text-brand hover:underline">
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
