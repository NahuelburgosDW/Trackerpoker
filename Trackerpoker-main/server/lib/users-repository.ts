import {
  USER_HEADERS, USERS_TAB, type RegistryUser, type UserRow,
} from '../types.js';
import { config } from '../config.js';
import { appendRow, getSheetsClient, getValues, protectEntireTab, updateRange } from './sheets-client.js';
import {
  generateRecoveryCode, hashPassword, needsPasswordRehash, newId, normalizeRecoveryCode,
  slugify, verifyPassword,
} from './password.js';
import {
  isStoredPasswordHash, validateEmail, validatePassword, validateRecoveryCode, validateSlug,
} from './validation.js';

function rowToUser(cells: unknown[]): UserRow {
  return {
    id: String(cells[0] || ''),
    email: String(cells[1] || ''),
    displayName: String(cells[2] || ''),
    passwordHash: String(cells[3] || ''),
    slug: String(cells[4] || ''),
    pokerSheetId: String(cells[5] || ''),
    pokerSheetUrl: String(cells[6] || ''),
    createdAt: String(cells[7] || ''),
    recoveryCode: String(cells[8] || ''),
  };
}

export function toPublicUser(user: UserRow): RegistryUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.slug,
    slug: user.slug,
    pokerSheetId: user.pokerSheetId,
    pokerSheetUrl: user.pokerSheetUrl,
    createdAt: user.createdAt,
    hasRecoveryCode: Boolean(user.recoveryCode),
  };
}

async function ensureUsersTab() {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.masterSheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === USERS_TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.masterSheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: USERS_TAB } } }],
      },
    });
  }

  const rows = await getValues(`${USERS_TAB}!A1:I1`);
  const header = rows[0] ?? [];
  if (!header.length || header[0] !== 'id' || header[3] !== 'passwordEnc' || header[8] !== 'recoveryCode') {
    await updateRange(`${USERS_TAB}!A1:I1`, [[...USER_HEADERS]]);
  }

  await protectEntireTab(
    config.masterSheetId,
    USERS_TAB,
    'Users — bloqueada. Solo la app y el dueño del Sheet pueden editar (códigos de recuperación, contraseñas, emails).',
  );
}

export async function listUsers(): Promise<UserRow[]> {
  await ensureUsersTab();
  const rows = await getValues(`${USERS_TAB}!A2:I`);
  return rows.filter((r) => r[0]).map(rowToUser);
}

export async function findBySlug(slug: string) {
  const users = await listUsers();
  return users.find((u) => u.slug === slug) ?? null;
}

export async function findByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const users = await listUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function findByIdentifier(identifier: string) {
  const byEmail = await findByEmail(identifier);
  if (byEmail) return byEmail;
  return findBySlug(slugify(identifier));
}

export async function findById(id: string) {
  const users = await listUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function findByPokerSheetId(pokerSheetId: string) {
  const users = await listUsers();
  return users.find((u) => u.pokerSheetId === pokerSheetId) ?? null;
}

function userRowNum(users: UserRow[], userId: string): number {
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('Usuario no encontrado');
  return index + 2;
}

function matchesRecoveryCode(stored: string, inputNormalized: string): boolean {
  if (!stored) return false;
  if (isStoredPasswordHash(stored)) {
    return verifyPassword(inputNormalized, stored);
  }
  return normalizeRecoveryCode(stored) === inputNormalized;
}

export async function registerAccount(
  email: string,
  password: string,
  username: string,
): Promise<{ user: RegistryUser; recoveryCode: string }> {
  await ensureUsersTab();

  validatePassword(password);
  const slug = validateSlug(username);
  const normalizedEmail = validateEmail(email);

  if (await findByEmail(normalizedEmail)) throw new Error('Este email ya está registrado');
  if (await findBySlug(slug)) throw new Error(`Este usuario (@${slug}) ya está en uso`);

  const recoveryCode = generateRecoveryCode();
  const user: UserRow = {
    id: newId(),
    email: normalizedEmail,
    displayName: slug,
    passwordHash: hashPassword(password),
    slug,
    pokerSheetId: '',
    pokerSheetUrl: '',
    createdAt: new Date().toISOString(),
    recoveryCode,
  };

  await appendRow(`${USERS_TAB}!A:I`, [
    user.id,
    user.email,
    user.displayName,
    user.passwordHash,
    user.slug,
    user.pokerSheetId,
    user.pokerSheetUrl,
    user.createdAt,
    user.recoveryCode,
  ]);

  return { user: toPublicUser(user), recoveryCode };
}

export async function login(identifier: string, password: string): Promise<RegistryUser> {
  const users = await listUsers();
  const user = users.find((u) => (
    u.email.toLowerCase() === identifier.trim().toLowerCase()
    || u.slug === slugify(identifier)
  ));
  if (!user) throw new Error('Usuario o contraseña incorrectos');

  const hashed = isStoredPasswordHash(user.passwordHash);
  const ok = hashed
    ? verifyPassword(password, user.passwordHash)
    : user.passwordHash === password;

  if (!ok) throw new Error('Usuario o contraseña incorrectos');

  if (needsPasswordRehash(user.passwordHash)) {
    const encrypted = hashPassword(password);
    await updateRange(`${USERS_TAB}!D${userRowNum(users, user.id)}`, [[encrypted]]);
    user.passwordHash = encrypted;
  }

  return toPublicUser(user);
}

export async function resetPasswordWithRecovery(
  identifier: string,
  recoveryCode: string,
  newPassword: string,
): Promise<RegistryUser> {
  validatePassword(newPassword);
  const normalizedCode = validateRecoveryCode(recoveryCode);

  const users = await listUsers();
  const user = users.find((u) => (
    u.email.toLowerCase() === identifier.trim().toLowerCase()
    || u.slug === slugify(identifier)
  ));
  if (!user || !user.recoveryCode) {
    throw new Error('No hay código de recuperación para esta cuenta');
  }
  if (!matchesRecoveryCode(user.recoveryCode, normalizedCode)) {
    throw new Error('Código de recuperación inválido');
  }

  const encrypted = hashPassword(newPassword);
  await updateRange(`${USERS_TAB}!D${userRowNum(users, user.id)}`, [[encrypted]]);
  return toPublicUser({ ...user, passwordHash: encrypted });
}

export async function rotateRecoveryCode(userId: string, password: string): Promise<string> {
  const users = await listUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Usuario no encontrado');

  const hashed = isStoredPasswordHash(user.passwordHash);
  const ok = hashed
    ? verifyPassword(password, user.passwordHash)
    : user.passwordHash === password;
  if (!ok) throw new Error('Contraseña incorrecta');

  const recoveryCode = generateRecoveryCode();
  await updateRange(`${USERS_TAB}!I${userRowNum(users, user.id)}`, [[recoveryCode]]);
  return recoveryCode;
}

export async function linkPokerSheet(userId: string, pokerSheetId: string, pokerSheetUrl: string): Promise<RegistryUser> {
  const users = await listUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('Usuario no encontrado');

  const owner = users.find((u) => u.pokerSheetId === pokerSheetId && u.id !== userId);
  if (owner) {
    throw new Error(`Este Google Sheet ya está vinculado a @${owner.slug}`);
  }

  const rowNum = index + 2;
  await updateRange(`${USERS_TAB}!F${rowNum}:G${rowNum}`, [[pokerSheetId, pokerSheetUrl]]);

  const updated = { ...users[index], pokerSheetId, pokerSheetUrl };
  return toPublicUser(updated);
}

export async function countUsers() {
  const users = await listUsers();
  return users.length;
}
