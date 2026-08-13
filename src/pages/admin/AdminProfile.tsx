import { useState } from 'react';
import { UserCog, Save, Upload } from 'lucide-react';
import { player } from '@/data/mock';
import { SectionHeader } from '@/components/ui/SectionHeader';

export function AdminProfile() {
  const [form, setForm] = useState({
    nickname: player.nickname,
    realName: player.realName,
    country: player.country,
    bio: player.bio,
    room: player.room,
    gameTypes: player.gameTypes.join(', '),
    startedAt: player.startedAt,
  });
  const [saved, setSaved] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={UserCog} title="Player Profile" subtitle="Edit the public profile information" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Avatar */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Avatar</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="grid h-28 w-28 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-ink-950 font-display text-4xl font-bold shadow-glow">
              {form.nickname.slice(0, 2).toUpperCase()}
            </div>
            <button className="btn-outline">
              <Upload className="h-4 w-4" />
              Upload Photo
            </button>
            <p className="text-2xs text-ink-300 text-center">JPG or PNG, max 2MB</p>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Profile Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nickname" value={form.nickname} onChange={(v) => update('nickname', v)} />
            <Field label="Real Name" value={form.realName} onChange={(v) => update('realName', v)} />
            <Field label="Country" value={form.country} onChange={(v) => update('country', v)} />
            <Field label="Poker Room" value={form.room} onChange={(v) => update('room', v)} />
            <Field label="Game Types" value={form.gameTypes} onChange={(v) => update('gameTypes', v)} hint="Comma-separated" />
            <Field label="Started Date" value={form.startedAt} onChange={(v) => update('startedAt', v)} type="date" />
          </div>
          <div className="mt-4">
            <label className="text-2xs font-semibold uppercase tracking-wider text-ink-300 mb-1.5 block">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Short player description..."
            />
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={save} className="btn-primary">
              <Save className="h-4 w-4" />
              Save Profile
            </button>
            {saved && (
              <span className="text-sm text-brand animate-fade-in flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Profile saved successfully
              </span>
            )}
          </div>
        </div>
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
