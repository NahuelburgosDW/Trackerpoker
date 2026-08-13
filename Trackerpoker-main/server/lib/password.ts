import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

const ENC_PREFIX = 'pkenc.v1.';
const SALT_LEN = 16;
const HASH_LEN = 64;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(`${config.authSalt}:${password}`, salt, HASH_LEN);
  return ENC_PREFIX + Buffer.concat([salt, derived]).toString('base64url');
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  if (stored.startsWith(ENC_PREFIX)) {
    try {
      const packed = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64url');
      if (packed.length !== SALT_LEN + HASH_LEN) return false;
      const salt = packed.subarray(0, SALT_LEN);
      const hash = packed.subarray(SALT_LEN);
      const derived = scryptSync(`${config.authSalt}:${password}`, salt, HASH_LEN);
      return timingSafeEqual(hash, derived);
    } catch {
      return false;
    }
  }

  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derived = scryptSync(`${config.authSalt}:${password}`, salt, HASH_LEN);
    const hashBuf = Buffer.from(hash, 'hex');
    if (hashBuf.length !== derived.length) return false;
    return timingSafeEqual(hashBuf, derived);
  }

  const a = Buffer.from(stored);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isEncryptedSecret(stored: string): boolean {
  return stored.startsWith(ENC_PREFIX);
}

export function needsPasswordRehash(stored: string): boolean {
  return !isEncryptedSecret(stored);
}

export function generateRecoveryCode(): string {
  const bytes = randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    if (i % 4 === 3 && i < 15) out += '-';
  }
  return out;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
}

export function parseSpreadsheetId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function buildSheetUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

export function newId() {
  return createHash('sha256').update(randomBytes(16)).digest('hex').slice(0, 36);
}
