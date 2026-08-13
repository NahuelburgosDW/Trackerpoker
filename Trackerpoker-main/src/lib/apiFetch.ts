/** Base URL del backend. Vacío = same-origin `/api` (Vite proxy en local). */
const API_BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export type ApiResult<T> = { ok: boolean; error?: string } & T;

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
    throw new Error(
      API_BASE
        ? `API no disponible (${API_BASE}) — verificá Railway / VITE_API_URL`
        : 'API no disponible — ejecutá npm run dev (frontend + backend juntos)',
    );
  }

  const text = await res.text();
  if (res.status === 413) {
    throw new Error('El archivo es demasiado grande para importar de una vez. Probá con menos TXT o reiniciá el servidor.');
  }
  if (!text.trim()) {
    throw new Error(
      `API sin respuesta (HTTP ${res.status}) — verificá que el backend esté corriendo`,
    );
  }

  let json: ApiResult<T>;
  try {
    json = JSON.parse(text) as ApiResult<T>;
  } catch {
    throw new Error(
      res.status >= 400
        ? `Error del servidor (HTTP ${res.status}).`
        : `Respuesta inválida del servidor (HTTP ${res.status})`,
    );
  }

  if (!json.ok) {
    throw new Error(json.error || `Error HTTP ${res.status}`);
  }

  return json;
}
