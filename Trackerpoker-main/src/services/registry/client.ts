import type { LinkPokerSheetPayload, RegisterAccountPayload, RegisterAccountResult, RegistryUser } from '@/services/registry/types';
import { apiFetch } from '@/lib/apiFetch';

export type RegistryHealth = {
  ok: boolean;
  message: string;
  usersTab?: boolean;
  usersCount?: number;
};

export function isRegistryConfigured() {
  return true;
}

export async function checkRegistryHealth(): Promise<RegistryHealth> {
  try {
    const json = await apiFetch<{ registry?: boolean; usersTab?: boolean; usersCount?: number; backend?: string }>(
      '/api/health',
    );

    return {
      ok: true,
      message: `API conectada al Sheet maestro (${json.usersCount ?? 0} usuarios)`,
      usersTab: json.usersTab,
      usersCount: json.usersCount,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error
        ? err.message
        : 'API no disponible — ejecutá npm run dev',
    };
  }
}

export async function lookupUserBySlug(slug: string): Promise<RegistryUser | null> {
  const json = await apiFetch<{ user: RegistryUser | null }>(`/api/users/by-slug/${encodeURIComponent(slug)}`);
  return json.user ?? null;
}

export async function registerAccount(payload: RegisterAccountPayload): Promise<RegisterAccountResult> {
  const json = await apiFetch<{ user: RegistryUser; recoveryCode: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!json.recoveryCode) throw new Error('No se generó el código de recuperación');
  return { user: json.user, recoveryCode: json.recoveryCode };
}

export async function resetPassword(identifier: string, recoveryCode: string, newPassword: string): Promise<RegistryUser> {
  const json = await apiFetch<{ user: RegistryUser }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ identifier, recoveryCode, newPassword }),
  });
  return json.user;
}

export async function rotateRecoveryCode(userId: string, password: string): Promise<string> {
  const json = await apiFetch<{ recoveryCode: string }>('/api/auth/recovery-code', {
    method: 'POST',
    body: JSON.stringify({ userId, password }),
  });
  return json.recoveryCode;
}

export async function loginUser(identifier: string, password: string): Promise<RegistryUser> {
  const json = await apiFetch<{ user: RegistryUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  return json.user;
}

export async function linkPokerSheet(payload: LinkPokerSheetPayload): Promise<RegistryUser> {
  const json = await apiFetch<{ user: RegistryUser }>(`/api/users/${payload.userId}/sheet`, {
    method: 'PATCH',
    body: JSON.stringify({ pokerSheetUrl: payload.pokerSheetUrl }),
  });
  return json.user;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
}

export function profilePath(slug: string) {
  return `/u/${slug}`;
}

export function needsSheetConnection(user: RegistryUser | null): boolean {
  return Boolean(user && !user.pokerSheetId?.trim());
}
