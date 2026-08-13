import { ArrowLeft } from 'lucide-react';
import { useRouter } from '@/lib/router';

/** Vuelve al inicio (login). */
export function AuthBackLink({ label = 'Volver al inicio' }: { label?: string }) {
  const { navigate } = useRouter();
  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white transition"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
