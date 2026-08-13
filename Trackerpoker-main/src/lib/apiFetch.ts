import { toUserFacingError } from '@/lib/userFacingError';

/** Railway (prod). En local `npm run dev` deja vacío y usa el proxy de Vite. */
const PRODUCTION_API_URL = 'https://trackerpoker-production.up.railway.app';

const API_BASE = String(
  import.meta.env.VITE_API_URL
    ?? (import.meta.env.PROD ? PRODUCTION_API_URL : ''),
).replace(/\/$/, '');

export type ApiResult<T> = { ok: boolean; error?: string } & T;

function userApiError(status?: number): string {
  if (status === 413) {
    return 'El archivo es demasiado grande para importar de una vez. Probá con menos TXT.';
  }
  if (status === 503 || status === 502 || status === 504) {
    return 'El servicio no está disponible ahora. Intentá de nuevo más tarde.';
  }
  if (status && status >= 500) {
    return 'Error interno del servidor. Intentá de nuevo más tarde.';
  }
  if (status === 404) {
    return 'El servicio no está disponible ahora. Intentá de nuevo más tarde.';
  }
  return 'No se pudo conectar con el servidor. Intentá de nuevo más tarde.';
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(userApiError());
  }

  const text = await res.text();
  if (res.status === 413) {
    throw new Error(userApiError(413));
  }
  if (!text.trim()) {
    throw new Error(userApiError(res.status));
  }

  let json: ApiResult<T>;
  try {
    json = JSON.parse(text) as ApiResult<T>;
  } catch {
    throw new Error(userApiError(res.status));
  }

  if (!json.ok) {
    throw new Error(toUserFacingError(json.error || userApiError(res.status), userApiError(res.status)));
  }

  return json;
}
