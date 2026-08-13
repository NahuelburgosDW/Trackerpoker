import { useEffect, useState } from 'react';
import { UserCog, Save, Upload, AlertCircle, Shield } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppData } from '@/hooks/useAppData';
import { useAuth } from '@/lib/auth';
import { rotateRecoveryCode } from '@/services/registry/client';
import { RecoveryCodePanel } from '@/components/auth/RecoveryCodePanel';

export function AdminProfile() {
  const { player, updatePlayer } = useAppData();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [form, setForm] = useState({
    nickname: player.nickname,
    realName: player.realName,
    country: player.country,
    bio: player.bio,
    room: player.room,
    gameTypes: player.gameTypes.join(', '),
    startedAt: player.startedAt.slice(0, 10),
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      nickname: player.nickname,
      realName: player.realName,
      country: player.country,
      bio: player.bio,
      room: player.room,
      gameTypes: player.gameTypes.join(', '),
      startedAt: player.startedAt.slice(0, 10),
    });
  }, [player]);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await updatePlayer({
        ...player,
        nickname: form.nickname,
        realName: form.realName,
        country: form.country,
        bio: form.bio,
        room: form.room,
        gameTypes: form.gameTypes.split(',').map((s) => s.trim()).filter(Boolean),
        startedAt: form.startedAt,
        avatarInitials: form.nickname.slice(0, 2).toUpperCase(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={UserCog} title="Editar perfil" subtitle="Los cambios se reflejan en el perfil público" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Avatar</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="grid h-28 w-28 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-ink-950 font-display text-4xl font-bold shadow-glow">
              {form.nickname.slice(0, 2).toUpperCase()}
            </div>
            <button className="btn-outline" disabled>
              <Upload className="h-4 w-4" />
              Subir foto (próximamente)
            </button>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Información del jugador</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nickname" value={form.nickname} onChange={(v) => update('nickname', v)} />
            <Field label="Nombre real" value={form.realName} onChange={(v) => update('realName', v)} />
            <Field label="País" value={form.country} onChange={(v) => update('country', v)} />
            <Field label="Sala" value={form.room} onChange={(v) => update('room', v)} />
            <Field label="Modalidades" value={form.gameTypes} onChange={(v) => update('gameTypes', v)} hint="Separadas por coma" />
            <Field label="Desde" value={form.startedAt} onChange={(v) => update('startedAt', v)} type="date" />
          </div>
          <div className="mt-4">
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Descripción corta..."
            />
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-loss">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button onClick={save} disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar en Google Sheets'}
            </button>
            {saved && (
              <span className="text-sm text-brand animate-fade-in flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Perfil actualizado
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/10 flex-shrink-0">
            <Shield className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-100">Código de recuperación</h3>
            <p className="text-sm text-ink-300 mt-1">
              {user?.hasRecoveryCode
                ? 'El código está en el Sheet maestro (Users → recoveryCode). Si lo rotás, el anterior deja de servir.'
                : 'Esta cuenta no tiene código. Generá uno y se guarda en el Sheet maestro.'}
            </p>
          </div>
        </div>

        {newRecoveryCode ? (
          <RecoveryCodePanel
            code={newRecoveryCode}
            onContinue={() => {
              setNewRecoveryCode('');
              setCurrentPassword('');
            }}
            continueLabel="Listo, ya lo guardé"
            title="Nuevo código de recuperación"
            subtitle="El código anterior ya no funciona. El nuevo quedó en el Sheet maestro."
          />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">
                Contraseña actual
              </label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Para confirmar que sos vos"
                autoComplete="current-password"
              />
            </div>
            <button
              type="button"
              className="btn-outline"
              disabled={recoveryBusy || !currentPassword}
              onClick={async () => {
                if (!user) return;
                setRecoveryError('');
                setRecoveryBusy(true);
                try {
                  const code = await rotateRecoveryCode(user.id, currentPassword);
                  setNewRecoveryCode(code);
                } catch (err) {
                  setRecoveryError(err instanceof Error ? err.message : 'No se pudo generar el código');
                } finally {
                  setRecoveryBusy(false);
                }
              }}
            >
              {recoveryBusy ? 'Generando...' : 'Generar código nuevo'}
            </button>
          </div>
        )}

        {recoveryError && (
          <div className="flex items-center gap-2 text-sm text-loss">
            <AlertCircle className="h-4 w-4" />
            {recoveryError}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string }) {
  return (
    <div>
      <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
      {hint && <p className="text-2xs text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}
