import type { Player, Tournament, KeyHand } from '@/domain/types';
import type { ImportLog, SheetsData, UpsertResult } from '@/services/sheets/types';
import {
  fetchSheetDataFromBackend,
  initializeSheetFromBackend,
  updatePlayerFromBackend,
  upsertTournamentsFromBackend,
  upsertHandsFromBackend,
  deleteTournamentFromBackend,
  logImportFromBackend,
} from '@/services/sheets/backendApi';
import { getSheetConnection } from '@/services/sheets/connectionStorage';

function resolveSpreadsheetId(override?: string): string {
  const conn = getSheetConnection();
  const spreadsheetId = override ?? conn?.spreadsheetId;
  if (!spreadsheetId) throw new Error('No hay Google Sheet conectado');
  return spreadsheetId;
}

export function isSheetsConfigured(): boolean {
  return Boolean(getSheetConnection()?.spreadsheetId);
}

export function getDataSource(): 'sheets' | 'empty' {
  return isSheetsConfigured() ? 'sheets' : 'empty';
}

export async function fetchSheetData(spreadsheetIdOverride?: string): Promise<SheetsData> {
  return fetchSheetDataFromBackend(resolveSpreadsheetId(spreadsheetIdOverride));
}

export async function initializeSheetStructure(defaultPlayer: Player, sheetId?: string): Promise<void> {
  const spreadsheetId = resolveSpreadsheetId(sheetId);
  const slug = defaultPlayer.id.replace(/^player-/, '');
  await initializeSheetFromBackend(spreadsheetId, slug, defaultPlayer.realName);
}

export async function updatePlayerInSheets(player: Player, sheetId?: string): Promise<Player> {
  return updatePlayerFromBackend(resolveSpreadsheetId(sheetId), player);
}

export async function upsertTournamentsInSheets(items: Tournament[], sheetId?: string): Promise<UpsertResult> {
  return upsertTournamentsFromBackend(resolveSpreadsheetId(sheetId), items);
}

export async function upsertHandsInSheets(items: KeyHand[], sheetId?: string): Promise<UpsertResult> {
  return upsertHandsFromBackend(resolveSpreadsheetId(sheetId), items);
}

export async function deleteTournamentInSheets(id: string, sheetId?: string): Promise<void> {
  await deleteTournamentFromBackend(resolveSpreadsheetId(sheetId), id);
}

export async function logImportInSheets(
  log: Omit<ImportLog, 'id'> & { id?: string },
  sheetId?: string,
): Promise<void> {
  await logImportFromBackend(resolveSpreadsheetId(sheetId), log);
}

export async function checkSheetsHealth(sheetId?: string): Promise<boolean> {
  try {
    await fetchSheetData(sheetId);
    return true;
  } catch {
    return false;
  }
}

export function deriveYears(tournaments: Tournament[]): number[] {
  const years = new Set(tournaments.map((t) => new Date(t.date).getFullYear()));
  return [...years].sort((a, b) => a - b);
}

export function isGoogleConfigured(): boolean {
  return false;
}

export { isRegistryConfigured } from '@/services/registry/client';
