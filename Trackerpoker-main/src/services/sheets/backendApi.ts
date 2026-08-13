import type { Player, Tournament, KeyHand } from '@/domain/types';
import type { ImportLog, SheetsData, UpsertResult } from '@/services/sheets/types';
import { apiFetch } from '@/lib/apiFetch';

export async function fetchSheetDataFromBackend(spreadsheetId: string): Promise<SheetsData> {
  const json = await apiFetch<{ data: SheetsData }>(`/api/poker-sheets/${spreadsheetId}/data`);
  return {
    ...json.data,
    hands: json.data.hands ?? [],
  };
}

export async function checkSheetWriteAccessFromBackend(spreadsheetId: string): Promise<void> {
  await apiFetch(`/api/poker-sheets/${spreadsheetId}/check-access`, { method: 'POST' });
}

export async function initializeSheetFromBackend(
  spreadsheetId: string,
  slug: string,
  displayName?: string,
): Promise<Player> {
  const json = await apiFetch<{ player: Player }>(`/api/poker-sheets/${spreadsheetId}/init`, {
    method: 'POST',
    body: JSON.stringify({ slug, displayName }),
  });
  return json.player;
}

export async function updatePlayerFromBackend(spreadsheetId: string, player: Player): Promise<Player> {
  const json = await apiFetch<{ player: Player }>(`/api/poker-sheets/${spreadsheetId}/player`, {
    method: 'PUT',
    body: JSON.stringify(player),
  });
  return json.player;
}

export async function upsertTournamentsFromBackend(
  spreadsheetId: string,
  items: Tournament[],
): Promise<UpsertResult> {
  const json = await apiFetch<{ result: UpsertResult }>(`/api/poker-sheets/${spreadsheetId}/tournaments`, {
    method: 'POST',
    body: JSON.stringify({ tournaments: items }),
  });
  return json.result;
}

export async function upsertHandsFromBackend(
  spreadsheetId: string,
  items: KeyHand[],
): Promise<UpsertResult> {
  // Chunk para no saturar body/Sheets en imports grandes
  const CHUNK = 40;
  let found = 0;
  let newCount = 0;
  let duplicates = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const json = await apiFetch<{ result: UpsertResult }>(`/api/poker-sheets/${spreadsheetId}/hands`, {
      method: 'POST',
      body: JSON.stringify({ hands: chunk }),
    });
    found += json.result.found;
    newCount += json.result.newCount;
    duplicates += json.result.duplicates;
    errors += json.result.errors;
  }

  return { found, newCount, duplicates, errors };
}

export async function deleteTournamentFromBackend(spreadsheetId: string, id: string): Promise<void> {
  await apiFetch(`/api/poker-sheets/${spreadsheetId}/tournaments/${id}`, { method: 'DELETE' });
}

export async function logImportFromBackend(
  spreadsheetId: string,
  log: Omit<ImportLog, 'id'> & { id?: string },
): Promise<void> {
  await apiFetch(`/api/poker-sheets/${spreadsheetId}/import-log`, {
    method: 'POST',
    body: JSON.stringify(log),
  });
}

export async function getServiceAccountEmail(): Promise<string | null> {
  try {
    const json = await apiFetch<{ serviceAccountEmail?: string }>('/api/health');
    return json.serviceAccountEmail ?? null;
  } catch {
    return null;
  }
}

export type { ImportLog };
