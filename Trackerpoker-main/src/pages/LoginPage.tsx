import { useState } from 'react';
import { LogIn, Spade, AlertCircle, AtSign, Lock } from 'lucide-react';
import { useAuth, profilePath } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { ConnectSheetStep } from '@/pages/ConnectSheetStep';
import { validatePasswordClient } from '@/lib/validation';
import { toUserFacingError } from '@/lib/userFacingError';

export function LoginPage() {
  const { login, loading, needsSheet, user } = useAuth();
  const { navigate } = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSheetStep, setShowSheetStep] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Ingresá tu usuario o email');
      return;
    }
    const pErr = validatePasswordClient(password);
    if (pErr) {
      setError(pErr);
      return;
    }

    try {
      const loggedIn = await login(identifier, password);
      if (!loggedIn.pokerSheetId) {
        setShowSheetStep(true);
        return;
      }
      navigate(profilePath(loggedIn.slug));
    } catch (err) {
      setError(toUserFacingError(err, 'Error al iniciar sesión'));
    }
  };

  if ((showSheetStep || needsSheet) && user) {
    return (
      <ConnectSheetStep
        username={user.slug}
        onDone={() => navigate(profilePath(user.slug))}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <Spade className="h-7 w-7 text-brand" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-sm text-ink-300 mt-2">Entrá con tu usuario o email y contraseña</p>
        </div>

        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
              Usuario o email
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                className="input pl-10"
                placeholder="usuario o tu@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
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
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-loss">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <LogIn className="h-4 w-4" />
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-sm text-center mt-3">
          <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-ink-300 hover:text-brand hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        </p>

        <p className="text-sm text-ink-300 mt-6 text-center">
          ¿No tenés cuenta?{' '}
          <button type="button" onClick={() => navigate('/register')} className="text-brand hover:underline">
            Crear cuenta
          </button>
        </p>
      </div>
    </div>
  );
}
