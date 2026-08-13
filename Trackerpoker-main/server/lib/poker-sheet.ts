import { randomUUID } from 'node:crypto';
import {
  appendSheetRows, clearSheetRange, ensureSheetTabs, getSheetValues, updateSheetRange, wrapSheetError,
} from './sheets-client.js';
import { parseSheetNumber } from './parse-number.js';
import { validateTournamentInput } from './validation.js';

const TABS = {
  PLAYER: 'Player',
  TOURNAMENTS: 'Tournaments',
  HANDS: 'Hands',
  IMPORT_LOG: 'ImportLog',
  CONFIG: 'Config',
};

const PLAYER_HEADERS = [
  'id', 'nickname', 'realName', 'country', 'countryCode', 'countryFlag',
  'room', 'bio', 'gameTypes', 'startedAt', 'createdAt', 'avatarInitials',
];

const TOURNAMENT_HEADERS = [
  'id', 'playerId', 'date', 'name', 'buyIn', 'position', 'players', 'prize', 'gameType',
];

/** 22 columnas — historial solo en manos clave (>= 40 BB de pérdida). */
const HAND_HEADERS = [
  'id', 'playerId', 'tournamentId', 'tournamentName', 'date', 'handId',
  'tableId', 'heroSeat', 'heroPosition',
  'holeCards', 'holeLabel', 'chipDelta', 'bigBlind', 'netBB', 'result',
  'board', 'boardFlop', 'boardTurn', 'boardRiver', 'pot',
  'playersJson', 'actionsJson',
] as const;

const HAND_RANGE = 'A:V';
const HAND_HEADER_RANGE = 'A1:V1';
const HAND_DATA_RANGE = 'A2:V';

const IMPORT_LOG_HEADERS = [
  'id', 'fileName', 'processedAt', 'found', 'newCount', 'duplicates', 'errors', 'status',
];

type Player = {
  id: string;
  nickname: string;
  realName: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  room: string;
  bio: string;
  gameTypes: string[];
  startedAt: string;
  createdAt: string;
  avatarInitials: string;
};

type Tournament = {
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

type HandPlayer = {
  playerId: string;
  name: string;
  seat: number;
  position: string;
  startingStack: number;
  holeCards: string;
  showedCards: string;
  isHero: boolean;
};

type HandAction = {
  street: string;
  playerId: string;
  playerName: string;
  action: string;
  amount: number;
  amountTo?: number;
  isAllIn: boolean;
  potAfter: number;
  order: number;
  raw: string;
};

type KeyHand = {
  id: string;
  playerId: string;
  tournamentId: string;
  tournamentName: string;
  date: string;
  handId: string;
  tableId?: string;
  heroSeat?: number;
  heroPosition?: string;
  holeCards: string;
  holeLabel: string;
  chipDelta: number;
  bigBlind?: number;
  netBB?: number;
  result: string;
  board: string;
  boardFlop?: string;
  boardTurn?: string;
  boardRiver?: string;
  pot: number;
  players?: HandPlayer[];
  actions?: HandAction[];
};

type ImportLog = {
  id: string;
  fileName: string;
  processedAt: string;
  found: number;
  newCount: number;
  duplicates: number;
  errors: number;
  status: string;
};

function rowToPlayer(row: unknown[]): Player | null {
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

function playerToRow(player: Player): unknown[] {
  return [
    player.id, player.nickname, player.realName, player.country, player.countryCode,
    player.countryFlag, player.room, player.bio, player.gameTypes.join(', '),
    player.startedAt, player.createdAt, player.avatarInitials,
  ];
}

function rowToTournament(row: unknown[]): Tournament | null {
  if (!row[0]) return null;
  return {
    id: String(row[0]),
    playerId: String(row[1] ?? 'player-1'),
    date: normalizeSheetDate(String(row[2] ?? '')),
    name: String(row[3] ?? ''),
    buyIn: parseSheetNumber(row[4]),
    position: parseSheetNumber(row[5]),
    players: parseSheetNumber(row[6]),
    prize: parseSheetNumber(row[7]),
    gameType: String(row[8] ?? 'MTT'),
  };
}

function normalizeSheetDate(value: string): string {
  if (!value) return new Date().toISOString();
  if (value.includes('T')) return value;
  return value.replace(' ', 'T');
}

function tournamentToRow(t: Tournament): unknown[] {
  return [t.id, t.playerId, t.date, t.name, t.buyIn, t.position, t.players, t.prize, t.gameType];
}

function parseJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Soporta: legacy 12 cols, schema 20 cols (sin netBB), schema 22 cols actual. */
function rowToHand(row: unknown[]): KeyHand | null {
  if (!row[0]) return null;

  // Schema actual A–V (22 cols): chipDelta@11, bigBlind@12, netBB@13, result@14, … actions@21
  if (row.length >= 21) {
    return {
      id: String(row[0]),
      playerId: String(row[1] ?? ''),
      tournamentId: String(row[2] ?? ''),
      tournamentName: String(row[3] ?? ''),
      date: normalizeSheetDate(String(row[4] ?? '')),
      handId: String(row[5] ?? ''),
      tableId: String(row[6] ?? '') || undefined,
      heroSeat: Number(row[7]) || undefined,
      heroPosition: String(row[8] ?? '') || undefined,
      holeCards: String(row[9] ?? ''),
      holeLabel: String(row[10] ?? ''),
      chipDelta: parseSheetNumber(row[11]),
      bigBlind: (() => {
        const n = parseSheetNumber(row[12]);
        return n > 0 ? n : undefined;
      })(),
      netBB: (() => {
        if (row[13] === '' || row[13] == null) return undefined;
        const n = parseSheetNumber(row[13]);
        return Number.isFinite(n) ? n : undefined;
      })(),
      result: String(row[14] ?? 'unknown'),
      board: String(row[15] ?? ''),
      boardFlop: String(row[16] ?? '') || undefined,
      boardTurn: String(row[17] ?? '') || undefined,
      boardRiver: String(row[18] ?? '') || undefined,
      pot: parseSheetNumber(row[19]),
      players: parseJsonArray<HandPlayer>(row[20], []),
      actions: parseJsonArray<HandAction>(row[21], []),
    };
  }

  // Schema intermedio A–T (20 cols): sin bigBlind/netBB
  if (row.length >= 19) {
    const chipDelta = parseSheetNumber(row[11]);
    return {
      id: String(row[0]),
      playerId: String(row[1] ?? ''),
      tournamentId: String(row[2] ?? ''),
      tournamentName: String(row[3] ?? ''),
      date: normalizeSheetDate(String(row[4] ?? '')),
      handId: String(row[5] ?? ''),
      tableId: String(row[6] ?? '') || undefined,
      heroSeat: Number(row[7]) || undefined,
      heroPosition: String(row[8] ?? '') || undefined,
      holeCards: String(row[9] ?? ''),
      holeLabel: String(row[10] ?? ''),
      chipDelta,
      result: String(row[12] ?? 'unknown'),
      board: String(row[13] ?? ''),
      boardFlop: String(row[14] ?? '') || undefined,
      boardTurn: String(row[15] ?? '') || undefined,
      boardRiver: String(row[16] ?? '') || undefined,
      pot: parseSheetNumber(row[17]),
      players: parseJsonArray<HandPlayer>(row[18], []),
      actions: parseJsonArray<HandAction>(row[19], []),
    };
  }

  // Legacy A–L
  return {
    id: String(row[0]),
    playerId: String(row[1] ?? ''),
    tournamentId: String(row[2] ?? ''),
    tournamentName: String(row[3] ?? ''),
    date: normalizeSheetDate(String(row[4] ?? '')),
    handId: String(row[5] ?? ''),
    holeCards: String(row[6] ?? ''),
    holeLabel: String(row[7] ?? ''),
    chipDelta: parseSheetNumber(row[8]),
    result: String(row[9] ?? 'unknown'),
    board: String(row[10] ?? ''),
    pot: parseSheetNumber(row[11]),
    players: [],
    actions: [],
  };
}

function handToRow(h: KeyHand): unknown[] {
  return [
    h.id,
    h.playerId,
    h.tournamentId,
    h.tournamentName,
    h.date,
    h.handId,
    h.tableId ?? '',
    h.heroSeat ?? '',
    h.heroPosition ?? '',
    h.holeCards,
    h.holeLabel,
    h.chipDelta,
    h.bigBlind ?? '',
    h.netBB ?? '',
    h.result,
    h.board,
    h.boardFlop ?? '',
    h.boardTurn ?? '',
    h.boardRiver ?? '',
    h.pot,
    JSON.stringify(h.players ?? []),
    JSON.stringify(h.actions ?? []),
  ];
}

function handHasDetail(h: KeyHand | null | undefined): boolean {
  return (h?.actions?.length ?? 0) > 0;
}

function handNeedsUpgrade(existing: KeyHand, incoming: KeyHand): boolean {
  if (!handHasDetail(incoming)) return false;
  if (!handHasDetail(existing)) return true;
  // Re-import con netBB / schema nuevo
  if ((existing.netBB == null || existing.netBB === 0) && incoming.netBB != null) return true;
  return false;
}

function rowToImportLog(row: unknown[]): ImportLog | null {
  if (!row[0]) return null;
  return {
    id: String(row[0]),
    fileName: String(row[1] ?? ''),
    processedAt: String(row[2] ?? ''),
    found: Number(row[3]) || 0,
    newCount: Number(row[4]) || 0,
    duplicates: Number(row[5]) || 0,
    errors: Number(row[6]) || 0,
    status: String(row[7] ?? 'success'),
  };
}

async function getValuesOrEmpty(spreadsheetId: string, range: string) {
  try {
    return await getSheetValues(spreadsheetId, range);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Unable to parse range') || msg.includes('404')) return [];
    throw err;
  }
}

/** Intenta escribir en el Sheet para detectar si falta invitar la service account como Editor. */
export async function verifyPokerSheetWriteAccess(spreadsheetId: string) {
  try {
    await ensureSheetTabs(spreadsheetId, [TABS.CONFIG]);
    const now = new Date().toISOString();
    await updateSheetRange(spreadsheetId, `${TABS.CONFIG}!A1:B1`, [['key', 'value']]);
    await updateSheetRange(spreadsheetId, `${TABS.CONFIG}!A2:B2`, [['lastSync', now]]);
    return { hasWriteAccess: true as const, checkedAt: now };
  } catch (err) {
    throw wrapSheetError(err);
  }
}

export async function fetchPokerSheetData(spreadsheetId: string) {
  try {
    await verifyPokerSheetWriteAccess(spreadsheetId);

    const [playerRows, tourRows, handRows, logRows, configRows] = await Promise.all([
      getValuesOrEmpty(spreadsheetId, `${TABS.PLAYER}!A2:L2`),
      getValuesOrEmpty(spreadsheetId, `${TABS.TOURNAMENTS}!A2:I`),
      getValuesOrEmpty(spreadsheetId, `${TABS.HANDS}!${HAND_DATA_RANGE}`),
      getValuesOrEmpty(spreadsheetId, `${TABS.IMPORT_LOG}!A2:H`),
      getValuesOrEmpty(spreadsheetId, `${TABS.CONFIG}!A2:B`),
    ]);

    const player = playerRows[0] ? rowToPlayer(playerRows[0]) : null;
    const tournaments = tourRows.map(rowToTournament).filter(Boolean) as Tournament[];
    tournaments.sort((a, b) => +new Date(b.date) - +new Date(a.date));

    const hands = handRows.map(rowToHand).filter(Boolean) as KeyHand[];
    hands.sort((a, b) => (a.netBB ?? 0) - (b.netBB ?? 0));

    const importLogs = logRows.map(rowToImportLog).filter(Boolean) as ImportLog[];
    importLogs.sort((a, b) => +new Date(b.processedAt) - +new Date(a.processedAt));

    let lastSync: string | null = null;
    for (const row of configRows) {
      if (row[0] === 'lastSync') lastSync = String(row[1]);
    }

    return {
      player,
      tournaments,
      hands,
      importLogs,
      meta: { connected: true, lastSync },
    };
  } catch (err) {
    throw wrapSheetError(err);
  }
}

export async function initializePokerSheet(spreadsheetId: string, slug: string, displayName?: string) {
  try {
    await ensureSheetTabs(spreadsheetId, Object.values(TABS));

    const name = displayName || slug;
    const player: Player = {
      id: `player-${slug}`,
      nickname: name.split(' ')[0] || slug,
      realName: name,
      country: '',
      countryCode: '',
      countryFlag: '',
      room: 'GGPoker',
      bio: '',
      gameTypes: ['MTT'],
      startedAt: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };

    await updateSheetRange(spreadsheetId, `${TABS.PLAYER}!A1:L2`, [
      PLAYER_HEADERS,
      playerToRow(player),
    ]);
    await updateSheetRange(spreadsheetId, `${TABS.TOURNAMENTS}!A1:I1`, [TOURNAMENT_HEADERS]);
    await updateSheetRange(spreadsheetId, `${TABS.HANDS}!${HAND_HEADER_RANGE}`, [HAND_HEADERS]);
    await updateSheetRange(spreadsheetId, `${TABS.IMPORT_LOG}!A1:H1`, [IMPORT_LOG_HEADERS]);
    await updateSheetRange(spreadsheetId, `${TABS.CONFIG}!A2:B2`, [['lastSync', new Date().toISOString()]]);

    return player;
  } catch (err) {
    throw wrapSheetError(err);
  }
}

export async function updatePokerPlayer(spreadsheetId: string, player: Player) {
  try {
    if (!player.id?.trim() || !player.nickname?.trim()) {
      throw new Error('Perfil inválido — nickname es obligatorio');
    }
    await ensureSheetTabs(spreadsheetId, Object.values(TABS));
    await updateSheetRange(spreadsheetId, `${TABS.PLAYER}!A2:L2`, [playerToRow(player)]);
    await touchSync(spreadsheetId);
    return player;
  } catch (err) {
    throw wrapSheetError(err);
  }
}

export async function upsertPokerTournaments(spreadsheetId: string, items: Tournament[]) {
  try {
    await ensureSheetTabs(spreadsheetId, Object.values(TABS));
    const existing = await getSheetValues(spreadsheetId, `${TABS.TOURNAMENTS}!A2:I`);
    const existingIds = new Set(existing.map((r) => String(r[0])));

    let newCount = 0;
    let duplicates = 0;
    let errors = 0;
    const toAppend: unknown[][] = [];
    const batchIds = new Set<string>();

    for (const t of items) {
      try {
        validateTournamentInput(t);
      } catch {
        errors++;
        continue;
      }

      if (batchIds.has(t.id)) {
        duplicates++;
        continue;
      }
      batchIds.add(t.id);

      if (existingIds.has(t.id)) {
        duplicates++;
        continue;
      }

      toAppend.push(tournamentToRow(t));
      existingIds.add(t.id);
      newCount++;
    }

    if (toAppend.length > 0) {
      await appendSheetRows(spreadsheetId, `${TABS.TOURNAMENTS}!A:I`, toAppend, 'RAW');
    }

    await touchSync(spreadsheetId);
    return { found: items.length, newCount, duplicates, errors };
  } catch (err) {
    throw wrapSheetError(err);
  }
}

export async function upsertPokerHands(spreadsheetId: string, items: KeyHand[]) {
  try {
    await ensureSheetTabs(spreadsheetId, Object.values(TABS));
    await updateSheetRange(spreadsheetId, `${TABS.HANDS}!${HAND_HEADER_RANGE}`, [Array.from(HAND_HEADERS)]);

    const existing = await getValuesOrEmpty(spreadsheetId, `${TABS.HANDS}!${HAND_DATA_RANGE}`);
    const byId = new Map<string, { index: number; hand: KeyHand }>();
    existing.forEach((r, index) => {
      const hand = rowToHand(r);
      if (hand) byId.set(hand.id, { index, hand });
    });

    let newCount = 0;
    let duplicates = 0;
    let upgraded = 0;
    const toAppend: unknown[][] = [];
    const batchIds = new Set<string>();
    const upgradedRows = new Map<number, unknown[]>();

    for (const h of items) {
      if (!h.id?.trim() || !h.holeCards?.trim()) {
        continue;
      }
      if (batchIds.has(h.id)) {
        duplicates++;
        continue;
      }
      batchIds.add(h.id);

      const prev = byId.get(h.id);
      if (prev) {
        // Re-import: enriquecer manos viejas sin historial / sin netBB
        if (handNeedsUpgrade(prev.hand, h)) {
          upgradedRows.set(prev.index, handToRow(h));
          upgraded++;
        } else {
          duplicates++;
        }
        continue;
      }

      toAppend.push(handToRow(h));
      byId.set(h.id, { index: -1, hand: h });
      newCount++;
    }

    const needsRewrite =
      upgradedRows.size > 0
      || (toAppend.length > 0 && existing.some((r) => r.length < 21));

    if (needsRewrite) {
      const rewritten = existing.map((row, i) => {
        if (upgradedRows.has(i)) return upgradedRows.get(i)!;
        const hand = rowToHand(row);
        return hand ? handToRow(hand) : row;
      });
      await clearSheetRange(spreadsheetId, `${TABS.HANDS}!${HAND_RANGE}`);
      await updateSheetRange(spreadsheetId, `${TABS.HANDS}!A1`, [
        Array.from(HAND_HEADERS),
        ...rewritten,
        ...toAppend,
      ]);
    } else if (toAppend.length > 0) {
      await appendSheetRows(spreadsheetId, `${TABS.HANDS}!${HAND_RANGE}`, toAppend, 'RAW');
    }

    await touchSync(spreadsheetId);
    return { found: items.length, newCount: newCount + upgraded, duplicates, errors: 0 };
  } catch (err) {
    throw wrapSheetError(err);
  }
}

export async function deletePokerTournament(spreadsheetId: string, id: string) {
  try {
    await ensureSheetTabs(spreadsheetId, Object.values(TABS));
    const rows = await getValuesOrEmpty(spreadsheetId, `${TABS.TOURNAMENTS}!A2:I`);
    const before = rows.length;
    const kept = rows.filter((r) => String(r[0]) !== id);
    if (kept.length === before) {
      throw new Error('Torneo no encontrado');
    }

    await clearSheetRange(spreadsheetId, `${TABS.TOURNAMENTS}!A:I`);
    await updateSheetRange(spreadsheetId, `${TABS.TOURNAMENTS}!A1`, [TOURNAMENT_HEADERS, ...kept]);

    const handRows = await getValuesOrEmpty(spreadsheetId, `${TABS.HANDS}!${HAND_DATA_RANGE}`);
    if (handRows.length > 0) {
      const keptHands = handRows
        .map(rowToHand)
        .filter((h): h is KeyHand => Boolean(h) && h.tournamentId !== id)
        .map(handToRow);
      if (keptHands.length !== handRows.length) {
        await clearSheetRange(spreadsheetId, `${TABS.HANDS}!${HAND_RANGE}`);
        await updateSheetRange(spreadsheetId, `${TABS.HANDS}!A1`, [Array.from(HAND_HEADERS), ...keptHands]);
      }
    }

    await touchSync(spreadsheetId);
  } catch (err) {
    throw wrapSheetError(err);
  }
}

async function touchSync(spreadsheetId: string) {
  const now = new Date().toISOString();
  const configRows = await getValuesOrEmpty(spreadsheetId, `${TABS.CONFIG}!A2:B`);
  let found = false;
  const updated = configRows.map((row) => {
    if (row[0] === 'lastSync') {
      found = true;
      return ['lastSync', now];
    }
    return row;
  });
  if (!found) updated.push(['lastSync', now]);
  if (updated.length > 0) {
    await updateSheetRange(spreadsheetId, `${TABS.CONFIG}!A2:B${updated.length + 1}`, updated);
  }
}

export async function logPokerImport(
  spreadsheetId: string,
  log: {
    id?: string;
    fileName: string;
    processedAt: string;
    found: number;
    newCount: number;
    duplicates: number;
    errors: number;
    status: string;
  },
) {
  try {
    await ensureSheetTabs(spreadsheetId, Object.values(TABS));
    await updateSheetRange(spreadsheetId, `${TABS.IMPORT_LOG}!A1:H1`, [IMPORT_LOG_HEADERS]);
    await appendSheetRows(spreadsheetId, `${TABS.IMPORT_LOG}!A:H`, [[
      log.id ?? randomUUID(),
      log.fileName,
      log.processedAt,
      log.found,
      log.newCount,
      log.duplicates,
      log.errors,
      log.status,
    ]]);
    await touchSync(spreadsheetId);
  } catch (err) {
    throw wrapSheetError(err);
  }
}
