const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailClient(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !EMAIL_RE.test(normalized)) return 'Email inválido';
  return null;
}

export function validatePasswordClient(password: string, confirm?: string): string | null {
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  if (password.length > 128) return 'La contraseña es demasiado larga';
  if (confirm !== undefined && password !== confirm) return 'Las contraseñas no coinciden';
  return null;
}

export function validateUsernameClient(username: string): string | null {
  const slug = username.trim();
  if (slug.length < 2) return 'Usuario mínimo 2 caracteres';
  if (!/^[a-z0-9-]+$/i.test(slug)) return 'Solo letras, números y guiones';
  return null;
}

export const MAX_TXT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TXT_FILES = 50;
export const MAX_TOURNAMENTS_PER_IMPORT = 500;

export function validateTxtFileClient(name: string, size: number): string | null {
  if (!name.toLowerCase().endsWith('.txt')) return 'Solo archivos .txt';
  if (size > MAX_TXT_FILE_BYTES) return 'Archivo demasiado grande (máx. 5 MB)';
  return null;
}

export function validateRecoveryCodeClient(code: string): string | null {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length !== 16) return 'El código debe tener 16 caracteres (XXXX-XXXX-XXXX-XXXX)';
  return null;
}

export function tournamentKey(id: string): string {
  return id.trim().toLowerCase();
}
