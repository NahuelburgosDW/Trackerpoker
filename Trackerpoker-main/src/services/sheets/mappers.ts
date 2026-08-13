import type { Player, Tournament, GameType } from '@/domain/types';
import type { ImportLog } from '@/services/sheets/types';
import { parseSheetNumber } from '@/lib/parseNumber';

export const TABS = {
  PLAYER: 'Player',
  TOURNAMENTS: 'Tournaments',
  IMPORT_LOG: 'ImportLog',
  CONFIG: 'Config',
} as const;

export function rowToPlayer(row: unknown[]): Player | null {
  if (!row[0]) return null;
  return {
    id: String(row[0]),
    nickname: String(row[1] ?? ''),
    realName: String(row[2] ?? ''),
    country: String(row[3] ?? ''),
    countryCode: String(row[4] ?? ''),
    countryFlag: String(row[5] ?? ''),
    room: String(row[6] ?? ''),
    bio: String(row[7] ?? ''),
    gameTypes: String(row[8] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    startedAt: String(row[9] ?? ''),
    createdAt: String(row[10] ?? new Date().toISOString()),
    avatarInitials: String(row[11] ?? ''),
  };
}

export function playerToRow(player: Player): unknown[] {
  return [
    player.id,
    player.nickname,
    player.realName,
    player.country,
    player.countryCode,
    player.countryFlag,
    player.room,
    player.bio,
    player.gameTypes.join(', '),
    player.startedAt,
    player.createdAt,
    player.avatarInitials,
  ];
}

export function rowToTournament(row: unknown[]): Tournament | null {
  if (!row[0]) return null;
  const dateRaw = String(row[2] ?? '');
  return {
    id: String(row[0]),
    playerId: String(row[1] ?? 'player-1'),
    date: dateRaw.includes('T') ? dateRaw : dateRaw.replace(' ', 'T'),
    name: String(row[3] ?? ''),
    buyIn: parseSheetNumber(row[4]),
    position: parseSheetNumber(row[5]),
    players: parseSheetNumber(row[6]),
    prize: parseSheetNumber(row[7]),
    gameType: (String(row[8] ?? 'MTT') as GameType),
  };
}

export function tournamentToRow(t: Tournament): unknown[] {
  return [t.id, t.playerId, t.date, t.name, t.buyIn, t.position, t.players, t.prize, t.gameType];
}

export function rowToImportLog(row: unknown[]): ImportLog | null {
  if (!row[0]) return null;
  return {
    id: String(row[0]),
    fileName: String(row[1] ?? ''),
    processedAt: String(row[2] ?? ''),
    found: Number(row[3]) || 0,
    newCount: Number(row[4]) || 0,
    duplicates: Number(row[5]) || 0,
    errors: Number(row[6]) || 0,
    status: (String(row[7] ?? 'success') as ImportLog['status']),
  };
}

export const PLAYER_HEADERS = [
  'id', 'nickname', 'realName', 'country', 'countryCode', 'countryFlag',
  'room', 'bio', 'gameTypes', 'startedAt', 'createdAt', 'avatarInitials',
];

export const TOURNAMENT_HEADERS = [
  'id', 'playerId', 'date', 'name', 'buyIn', 'position', 'players', 'prize', 'gameType',
];

export const IMPORT_LOG_HEADERS = [
  'id', 'fileName', 'processedAt', 'found', 'newCount', 'duplicates', 'errors', 'status',
];
