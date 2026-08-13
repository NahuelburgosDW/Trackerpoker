/** Mensajes internos / de setup que no deben verse en la UI. */
const INTERNAL_ERROR =
  /MASTER_SHEET|GOOGLE_APPLICATION|GOOGLE_SERVICE_ACCOUNT|VITE_|AUTH_SALT|FRONTEND_URL|\.env\b|npm run|tsx |Railway|service account|credentials\.json|Backend no configurado|API sin respuesta|verificá que el backend/i;

export function toUserFacingError(raw: unknown, fallback = 'Algo salió mal. Intentá de nuevo más tarde.'): string {
  const message = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '';
  if (!message.trim()) return fallback;
  if (INTERNAL_ERROR.test(message)) return fallback;
  // HTTP genéricos del cliente API
  if (/^Error del servidor \(HTTP \d+\)/.test(message)) {
    return 'El servicio no está disponible ahora. Intentá de nuevo más tarde.';
  }
  if (/^Error HTTP \d+/.test(message) || /^API no disponible/i.test(message)) {
    return 'No se pudo conectar con el servidor. Intentá de nuevo más tarde.';
  }
  return message;
}
