const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'register', 'u', 'health', 'www', 'app', 'static',
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_RE.test(normalized)) {
    throw new Error('Email inválido');
  }
  if (normalized.length > 120) throw new Error('Email demasiado largo');
  return normalized;
}

export function validatePassword(password: string): void {
  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  if (password.length > 128) {
    throw new Error('La contraseña es demasiado larga (máx. 128 caracteres)');
  }
}

export function validateSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);

  if (!slug || slug.length < 2) {
    throw new Error('Usuario inválido (mínimo 2 caracteres, solo letras, números y guiones)');
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`El usuario "@${slug}" está reservado`);
  }
  return slug;
}

export function isStoredPasswordHash(stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('pkenc.v1.')) return stored.length > 20;
  if (!stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  return salt.length >= 16 && hash.length >= 32;
}

export function validateRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length !== 16) {
    throw new Error('Código de recuperación inválido');
  }
  return normalized;
}

export type TournamentInput = {
  id: string;
  playerId: string;
  date: string;
  name: string;
  buyIn: number;
  position: number;
  players: number;
  prize: number;
  gameType: string;
};

export function validateTournamentInput(t: TournamentInput): void {
  if (!t.id?.trim()) throw new Error('Torneo sin ID');
  if (!t.playerId?.trim()) throw new Error('Torneo sin playerId');
  if (!t.name?.trim()) throw new Error('Torneo sin nombre');
  if (!t.date?.trim() || Number.isNaN(+new Date(t.date))) {
    throw new Error(`Fecha inválida en torneo "${t.name}"`);
  }
  if (t.buyIn < 0 || t.prize < 0) {
    throw new Error(`Montos inválidos en torneo "${t.name}"`);
  }
  if (t.position < 0 || t.players < 0) {
    throw new Error(`Posición/jugadores inválidos en torneo "${t.name}"`);
  }
  if (t.position > 0 && t.players > 0 && t.position > t.players) {
    throw new Error(`Posición imposible en torneo "${t.name}"`);
  }
}

export const MAX_TXT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TXT_FILES = 50;
export const MAX_TOURNAMENTS_PER_IMPORT = 500;

export function validateTxtFile(name: string, size: number): void {
  if (!name.toLowerCase().endsWith('.txt')) {
    throw new Error('Solo se permiten archivos .txt');
  }
  if (size > MAX_TXT_FILE_BYTES) {
    throw new Error('Archivo demasiado grande (máx. 5 MB)');
  }
}
