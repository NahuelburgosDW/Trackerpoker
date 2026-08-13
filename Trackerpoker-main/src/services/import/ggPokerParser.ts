import type { GameType, HandAction, HandPlayer, KeyHand, Tournament } from '@/domain/types';
import { parseHandHistoryDetail } from '@/services/import/handHistoryDetail';
import {
  classifyHand,
  DEFAULT_BB_THRESHOLD,
  isKeyHandCategory,
  type HandCategory,
} from '@/services/import/handClassification';

export type GgFileKind = 'hand_history' | 'tournament_summary' | 'unknown';

export type ParsedGgTournament = {
  tournamentId: string;
  name: string;
  buyIn: number;
  gameVariant: string;
  gameType: GameType;
  date: string;
  prize: number;
  bounty: number;
  profit: number;
  position: number;
  players: number;
  lastHandId: string;
  sourceFile: string;
  sourceKind: GgFileKind;
};

export type ParsedGgHand = {
  handId: string;
  tournamentId: string;
  tournamentName: string;
  date: string;
  tableId: string;
  heroSeat: number;
  heroPosition: string;
  holeCards: string;
  holeLabel: string;
  chipDelta: number;
  bigBlind: number;
  netBB: number;
  initialStack: number;
  finalStack: number;
  pctChange: number;
  category: HandCategory;
  result: 'won' | 'lost' | 'folded' | 'unknown';
  board: string;
  boardFlop: string;
  boardTurn: string;
  boardRiver: string;
  pot: number;
  players: HandPlayer[];
  actions: HandAction[];
  sourceFile: string;
};

/** @deprecated Usar DEFAULT_BB_THRESHOLD (10 BB + 30% stack). */
export const KEY_HAND_MIN_LOSS_BB = DEFAULT_BB_THRESHOLD;
export { DEFAULT_BB_THRESHOLD as KEY_HAND_BB_THRESHOLD };

export type GgParseResult = {
  kind: GgFileKind;
  tournaments: ParsedGgTournament[];
  hands: ParsedGgHand[];
  handsParsed: number;
  errors: string[];
};

const HAND_HEADER =
  /Poker Hand #([^:]+): Tournament #(\d+), (.+?) \$(\d+(?:\.\d+)?) (.+?) - Level\d+\(.+?\) - (\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2}:\d{2})/;

const FINISH_LINE =
  /Hero finished the tournament in (\d+)(?:st|nd|rd|th) place(?: and received \$(\d+(?:\.\d+)?))?/i;

const SUMMARY_HEADER =
  /Tournament #(\d+),\s*(.+?)\s+\$(\d+(?:\.\d+)?)\s+(Hold'?em No Limit|Omaha[^\n,]*)/i;

const SUMMARY_TOURNAMENT_FALLBACK =
  /Tournament #(\d+),\s*([^\n]+)/i;

const RANK_NAME: Record<string, string> = {
  A: 'as',
  K: 'reyes',
  Q: 'damas',
  J: 'jotas',
  T: 'dieces',
  '9': 'nueves',
  '8': 'ochos',
  '7': 'sietes',
  '6': 'seises',
  '5': 'cincos',
  '4': 'cuatros',
  '3': 'treses',
  '2': 'doses',
};

const RANK_SINGLE: Record<string, string> = {
  A: 'As',
  K: 'Rey',
  Q: 'Dama',
  J: 'Jota',
  T: 'Diez',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2',
};

type HandBlock = {
  handId: string;
  tournamentId: string;
  tournamentName: string;
  buyIn: number;
  gameVariant: string;
  date: string;
  text: string;
};

export function detectGgFileKind(content: string): GgFileKind {
  const hasHoleCards = /\*\*\* HOLE CARDS \*\*\*/.test(content);
  const handCount = (content.match(/^Poker Hand #/gm) ?? []).length;
  const hasPokerHands = hasHoleCards || handCount > 0;

  const hasSummaryMarkers =
    /You finished(?: the tournament)? in \d+/i.test(content)
    || /You received a total of \$/i.test(content)
    || /^Buy-in:/im.test(content)
    || /Total Prize Pool:/i.test(content)
    || /Bounty Prize Pool:/i.test(content)
    || /Mystery Bounty/i.test(content)
    || /^\d+(?:st|nd|rd|th)\s*:\s*Hero/im.test(content);

  // Historial de manos (cartas / Poker Hand #) → Manos clave
  if (hasPokerHands) return 'hand_history';

  // Resumen corto (Buy-in / posición / premio) → Dashboard
  if (hasSummaryMarkers || /Tournament #\d+/.test(content)) {
    return 'tournament_summary';
  }

  return 'unknown';
}

function mapGameType(tournamentName: string): GameType {
  const lower = tournamentName.toLowerCase();
  if (lower.includes('spin')) return 'Spin & Gold';
  if (lower.includes('mtt') || lower.includes('battle royale') || lower.includes('bounty') || lower.includes('builder')) {
    return 'MTT';
  }
  return 'Other';
}

function parseMoney(value?: string): number {
  if (!value) return 0;
  return Number.parseFloat(value.replace(/,/g, '')) || 0;
}

function parseChips(value?: string): number {
  if (!value) return 0;
  return Number.parseInt(value.replace(/,/g, ''), 10) || 0;
}

export function formatHoleLabel(raw: string): string {
  const match = raw.trim().match(/^([2-9TJQKA])([cdhs])\s*([2-9TJQKA])([cdhs])$/i);
  if (!match) return raw.trim() || 'Mano desconocida';

  const [, r1, s1, r2, s2] = match;
  const a = r1.toUpperCase();
  const b = r2.toUpperCase();
  const suited = s1.toLowerCase() === s2.toLowerCase();
  const code = a === b ? `${a}${b}` : `${a}${b}${suited ? 's' : 'o'}`;

  if (a === b) {
    const name = RANK_NAME[a] ?? a;
    return `Par de ${name} (${code})`;
  }

  const left = RANK_SINGLE[a] ?? a;
  const right = RANK_SINGLE[b] ?? b;
  return `${left}-${right} ${suited ? 'suited' : 'offsuit'} (${code})`;
}

function parseHandBlocks(content: string): HandBlock[] {
  const chunks = content.split(/\n(?=Poker Hand #)/).filter(Boolean);
  const hands: HandBlock[] = [];

  for (const chunk of chunks) {
    const headerLine = chunk.split('\n')[0]?.trim() ?? '';
    const match = headerLine.match(HAND_HEADER);
    if (!match) continue;

    const [, handId, tournamentId, tournamentName, buyInRaw, gameVariant, year, month, day, time] = match;
    hands.push({
      handId,
      tournamentId,
      tournamentName: tournamentName.trim(),
      buyIn: parseMoney(buyInRaw),
      gameVariant: gameVariant.trim(),
      date: `${year}-${month}-${day}T${time}`,
      text: chunk,
    });
  }

  return hands;
}

function extractPlayers(hands: HandBlock[]): number {
  const ids = new Set<string>();
  for (const hand of hands) {
    for (const match of hand.text.matchAll(/Seat \d+: ([^\n(]+)/g)) {
      const name = match[1].trim();
      if (name) ids.add(name);
    }
  }
  return ids.size;
}

function countSeats(handText: string): number {
  const tableSection = handText.split('*** HOLE CARDS ***')[0] ?? handText;
  return [...tableSection.matchAll(/Seat \d+:/g)].length;
}

function detectHeroResult(hands: HandBlock[]) {
  const lastHand = hands[0];
  const firstHand = hands[hands.length - 1];

  const finishMatch = hands.map((h) => h.text.match(FINISH_LINE)).find(Boolean);
  if (finishMatch) {
    const position = Number.parseInt(finishMatch[1], 10);
    const prize = parseMoney(finishMatch[2]);
    return { position, prize, lastHand, firstHand };
  }

  const summary = lastHand.text.split('*** SUMMARY ***')[1] ?? lastHand.text;
  let position = 0;
  let prize = 0;

  const seatCount = countSeats(lastHand.text);
  const heroLost = /Hero .*?(?:lost|folded)/.test(summary);

  if (heroLost && seatCount > 0) {
    position = seatCount;
  }

  const heroWon = /Hero .*?(?:won|collected)/.test(summary);
  if (heroWon && seatCount <= 2) {
    position = 1;
    const potMatch = lastHand.text.match(/Total pot ([\d,]+)/);
    if (potMatch) prize = parseMoney(potMatch[1]);
  }

  return { position, prize, lastHand, firstHand };
}

function parseFilenameMeta(fileName: string) {
  const match = fileName.match(/GG(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\s*-\s*(.+?)\s+(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const [, year, month, day, hour, minute, name, buyInRaw] = match;
  return {
    date: `${year}-${month}-${day}T${hour}:${minute}:00`,
    name: name.trim(),
    buyIn: parseMoney(buyInRaw),
  };
}

function heroCollected(text: string): number {
  const summary = text.split('*** SUMMARY ***')[1] ?? text;
  const won = summary.match(/Seat \d+: Hero[^\n]*won \(([\d,]+)\)/i);
  if (won) return parseChips(won[1]);
  const collected = summary.match(/Seat \d+: Hero[^\n]*collected \(([\d,]+)\)/i);
  if (collected) return parseChips(collected[1]);
  const potLine = text.match(/Hero collected ([\d,]+) from pot/i);
  if (potLine) return parseChips(potLine[1]);
  return 0;
}

/**
 * Fichas invertidas por Hero en la mano.
 * Por calle: blinds/bets/raises-to fijan el total de la calle; calls suman.
 * Antes van aparte. Se resta uncalled bet devuelto.
 */
function heroInvested(text: string): number {
  const body = text.split(/\*\*\* SUMMARY \*\*\*/i)[0] ?? text;
  let total = 0;
  let streetPut = 0;

  const commitStreet = () => {
    total += streetPut;
    streetPut = 0;
  };

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Blinds + preflop son la misma calle: no cerrar en HOLE CARDS
    if (/\*\*\* (FLOP|TURN|RIVER|SHOWDOWN) \*\*\*/i.test(line)) {
      commitStreet();
      continue;
    }

    if (!/^Hero:/i.test(line)) continue;
    if (/folds|checks|shows|mucks/i.test(line)) continue;

    const ante = line.match(/posts the ante ([\d,]+)/i);
    if (ante) {
      total += parseChips(ante[1]);
      continue;
    }

    const blind = line.match(/posts (?:small|big) blind ([\d,]+)/i);
    if (blind) {
      streetPut = parseChips(blind[1]);
      continue;
    }

    // "raises X to Y" → Y es el total de la calle (incluye lo ya posteado)
    const raiseTo = line.match(/raises [\d,]+ to ([\d,]+)/i);
    if (raiseTo) {
      streetPut = parseChips(raiseTo[1]);
      continue;
    }

    const bet = line.match(/bets ([\d,]+)/i);
    if (bet) {
      streetPut = parseChips(bet[1]);
      continue;
    }

    const call = line.match(/calls ([\d,]+)/i);
    if (call) {
      streetPut += parseChips(call[1]);
      continue;
    }
  }
  commitStreet();

  const uncalled = body.match(/Uncalled bet \(([\d,]+)\) returned to Hero/i);
  if (uncalled) total = Math.max(0, total - parseChips(uncalled[1]));

  return total;
}

/** Extrae SB/BB/ante del header GG: Level10(300/600), Level10(300/600 - 75), Level5(40/80/10) */
export function extractBlinds(handText: string): { smallBlind: number; bigBlind: number; ante: number } {
  const header = handText.split('\n')[0] ?? handText;
  const match = header.match(
    /Level\s*\d+\s*\(\s*([\d,]+)\s*\/\s*([\d,]+)(?:\s*\/\s*([\d,]+))?(?:\s*-\s*([\d,]+))?\s*\)/i,
  );
  if (!match) {
    const postedBb = handText.match(/posts big blind ([\d,]+)/i);
    const bb = parseChips(postedBb?.[1]);
    return { smallBlind: Math.floor(bb / 2), bigBlind: bb, ante: 0 };
  }
  const smallBlind = parseChips(match[1]);
  const bigBlind = parseChips(match[2]);
  const ante = parseChips(match[3] || match[4]);
  return { smallBlind, bigBlind, ante };
}

/** netChips = fichasRecibidas - fichasInvertidas (cambio neto real del stack). */
function computeHeroNetChips(text: string): number {
  const invested = heroInvested(text);
  const received = heroCollected(text);
  return received - invested;
}

function heroStartingStack(text: string): number {
  const match = text.match(/Seat \d+: Hero \(([\d,]+) in chips\)/i);
  return parseChips(match?.[1]);
}

function heroIsEliminated(text: string, finalStack: number): boolean {
  if (finalStack <= 0) return true;
  if (/Hero finished the tournament/i.test(text)) return true;
  const summary = text.split('*** SUMMARY ***')[1] ?? '';
  if (/Seat \d+: Hero[^\n]*and is all-in/i.test(summary) && /Seat \d+: Hero[^\n]*lost/i.test(summary)) {
    return true;
  }
  return false;
}

/**
 * Calcula netChips / netBB / % stack.
 * Solo guarda historial detallado si BIG_LOSS o BIG_WIN.
 */
function parseKeyHand(block: HandBlock, sourceFile: string): ParsedGgHand | null {
  const holeMatch = block.text.match(/Dealt to Hero \[([^\]]+)\]/i);
  if (!holeMatch) return null;

  const holeCards = holeMatch[1].trim().replace(/\s+/g, ' ');
  const { bigBlind } = extractBlinds(block.text);
  if (!bigBlind) return null;

  const initialStack = heroStartingStack(block.text);
  if (initialStack <= 0) return null;

  const netChips = computeHeroNetChips(block.text);
  // El neto de una pérdida no puede superar el stack (all-in perdido = -initialStack)
  const clampedNet = netChips < -initialStack ? -initialStack : netChips;
  const finalStack = Math.max(0, initialStack + clampedNet);
  const postedBb = parseChips(block.text.match(/posts big blind ([\d,]+)/i)?.[1]);
  // Preferir la BB posteada en la mano si el header discrepa
  const bb = postedBb > 0 ? postedBb : bigBlind;

  const classified = classifyHand({
    handId: block.handId,
    initialStack,
    finalStack,
    bigBlind: bb,
    isEliminated: heroIsEliminated(block.text, finalStack),
  });

  if (!isKeyHandCategory(classified.category)) return null;

  const detail = parseHandHistoryDetail(block.text);
  const potMatch = block.text.match(/Total pot ([\d,]+)/i);

  return {
    handId: block.handId,
    tournamentId: block.tournamentId,
    tournamentName: block.tournamentName,
    date: block.date,
    tableId: detail.tableId,
    heroSeat: detail.heroSeat,
    heroPosition: detail.heroPosition,
    holeCards,
    holeLabel: formatHoleLabel(holeCards),
    chipDelta: classified.netChips,
    bigBlind: bb,
    netBB: classified.netBB,
    initialStack,
    finalStack: classified.finalStack,
    pctChange: classified.pctChange,
    category: classified.category,
    result: classified.netChips >= 0 ? 'won' : 'lost',
    board: detail.board,
    boardFlop: detail.boardFlop,
    boardTurn: detail.boardTurn,
    boardRiver: detail.boardRiver,
    pot: parseChips(potMatch?.[1]) || detail.actions.at(-1)?.potAfter || 0,
    players: detail.players,
    actions: detail.actions,
    sourceFile,
  };
}

function parseSummaryBuyIn(block: string): number {
  const line = block.match(/Buy-in:\s*\$?([\d.,]+)(?:\s*\+\s*\$?([\d.,]+))?(?:\s*\+\s*\$?([\d.,]+))?/i);
  if (!line) return 0;
  return parseMoney(line[1]) + parseMoney(line[2]) + parseMoney(line[3]);
}

function parseSummaryBounty(block: string): number {
  // Solo bounty explícito del Hero — NO matchear nombres tipo "Bounty Hunters ... $1.08"
  const heroLine = block.match(
    /\d+(?:st|nd|rd|th)\s*:\s*Hero\s*,\s*\$[\d.,]+\s*\+\s*\$([\d.,]+)\s*bounty/i,
  );
  if (heroLine) return parseMoney(heroLine[1]);

  const mystery = block.match(/Mystery Bounty(?: Prize)?:\s*\$?([\d.,]+)/i);
  if (mystery) return parseMoney(mystery[1]);

  return 0;
}

function parseSummaryPrize(block: string): { prize: number; bounty: number; position: number } {
  let position = 0;
  let prize = 0;
  let bounty = parseSummaryBounty(block);

  const finished = block.match(/You finished(?: the tournament)? in (\d+)(?:st|nd|rd|th) place/i);
  if (finished) position = Number.parseInt(finished[1], 10);

  const heroPlace = block.match(
    /(\d+)(?:st|nd|rd|th)\s*:\s*Hero\s*,\s*\$([\d.,]+)(?:\s*\+\s*\$([\d.,]+)\s*bounty)?/i,
  );
  if (heroPlace) {
    position = Number.parseInt(heroPlace[1], 10);
    prize = parseMoney(heroPlace[2]);
    if (heroPlace[3]) bounty = parseMoney(heroPlace[3]);
  }

  const receivedHero = block.match(
    /Hero finished the tournament in (\d+)(?:st|nd|rd|th) place(?: and received \$([\d.,]+))?/i,
  );
  if (receivedHero) {
    position = Number.parseInt(receivedHero[1], 10);
    if (receivedHero[2]) prize = parseMoney(receivedHero[2]);
  }

  // Total cobrado (incluye prize+bounty ya sumados en GG)
  const receivedTotal = block.match(/You received a total of \$([\d.,]+)/i);
  if (receivedTotal) {
    const total = parseMoney(receivedTotal[1]);
    // Si ya teníamos bounty separado, el cash prize es total - bounty
    if (bounty > 0 && total >= bounty) {
      prize = Math.round((total - bounty) * 100) / 100;
    } else {
      prize = total;
      // "total" ya es todo lo cobrado; no inventar bounty
      if (!heroPlace?.[3]) bounty = 0;
    }
  }

  return { prize, bounty, position };
}

function parseTournamentSummaries(content: string, sourceFile: string): ParsedGgTournament[] {
  const chunks = content
    .split(/\n(?=Tournament #\d+)/)
    .map((c) => c.trim())
    .filter((c) => /Tournament #\d+/.test(c));

  const fileMeta = parseFilenameMeta(sourceFile);
  const tournaments: ParsedGgTournament[] = [];

  for (const chunk of chunks) {
    const header = chunk.match(SUMMARY_HEADER) ?? chunk.match(SUMMARY_TOURNAMENT_FALLBACK);
    if (!header) continue;

    const tournamentId = header[1];
    let rawName = header[2].trim();
    let buyInFromHeader = 0;
    let gameVariant = "Hold'em No Limit";

    if (header.length >= 5 && header[3] && header[4]) {
      buyInFromHeader = parseMoney(header[3]);
      gameVariant = header[4].trim();
    } else {
      rawName = rawName
        .replace(/\s+Hold'?em No Limit.*/i, '')
        .replace(/\$\d+(?:\.\d+)?/g, '')
        .replace(/,\s*$/, '')
        .trim();
    }

    const buyIn = parseSummaryBuyIn(chunk)
      || buyInFromHeader
      || fileMeta?.buyIn
      || 0;
    const { prize, bounty, position } = parseSummaryPrize(chunk);
    const players = Number.parseInt(
      chunk.match(/(\d+)\s+Players/i)?.[1]
        ?? chunk.match(/Players:\s*(\d+)/i)?.[1]
        ?? '0',
      10,
    );
    const dateMatch = chunk.match(
      /Tournament started\s+(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2}:\d{2})/i,
    );
    const date = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${dateMatch[4]}`
      : fileMeta?.date || new Date().toISOString();

    const totalPrize = Math.round((prize + bounty) * 100) / 100;
    tournaments.push({
      tournamentId,
      name: `${rawName} $${buyIn.toFixed(2)}`,
      buyIn,
      gameVariant,
      gameType: mapGameType(rawName),
      date,
      prize: totalPrize,
      bounty,
      profit: Math.round((totalPrize - buyIn) * 100) / 100,
      position,
      players,
      lastHandId: '',
      sourceFile,
      sourceKind: 'tournament_summary',
    });
  }

  return tournaments;
}

export function parseGgPokerTxt(content: string, sourceFile: string): GgParseResult {
  const kind = detectGgFileKind(content);
  const errors: string[] = [];

  if (kind === 'tournament_summary') {
    const tournaments = parseTournamentSummaries(content, sourceFile);
    if (tournaments.length === 0) {
      return {
        kind,
        tournaments: [],
        hands: [],
        handsParsed: 0,
        errors: ['No se encontraron resúmenes de torneo (¿es un TXT de Game Summaries?)'],
      };
    }
    return { kind, tournaments, hands: [], handsParsed: 0, errors };
  }

  const hands = parseHandBlocks(content);
  if (hands.length === 0) {
    // Maybe a summary that didn't match markers cleanly
    const summaries = parseTournamentSummaries(content, sourceFile);
    if (summaries.length > 0) {
      return {
        kind: 'tournament_summary',
        tournaments: summaries,
        hands: [],
        handsParsed: 0,
        errors,
      };
    }
    return {
      kind: 'unknown',
      tournaments: [],
      hands: [],
      handsParsed: 0,
      errors: ['No se encontraron manos ni resúmenes de torneo en el archivo'],
    };
  }

  const grouped = new Map<string, HandBlock[]>();
  for (const hand of hands) {
    const list = grouped.get(hand.tournamentId) ?? [];
    list.push(hand);
    grouped.set(hand.tournamentId, list);
  }

  const fileMeta = parseFilenameMeta(sourceFile);
  const tournaments: ParsedGgTournament[] = [];
  const keyHands: ParsedGgHand[] = [];

  for (const [tournamentId, tournamentHands] of grouped) {
    const { position, prize, lastHand, firstHand } = detectHeroResult(tournamentHands);
    const buyIn = lastHand.buyIn || firstHand.buyIn || fileMeta?.buyIn || 0;
    const tournamentName = lastHand.tournamentName || firstHand.tournamentName || fileMeta?.name || 'Torneo GGPoker';
    const gameVariant = lastHand.gameVariant || firstHand.gameVariant;

    tournaments.push({
      tournamentId,
      name: `${tournamentName} $${buyIn.toFixed(2)}`,
      buyIn,
      gameVariant,
      gameType: mapGameType(tournamentName),
      date: lastHand.date || firstHand.date || fileMeta?.date || new Date().toISOString(),
      prize,
      bounty: 0,
      profit: prize - buyIn,
      position,
      players: extractPlayers(tournamentHands),
      lastHandId: lastHand.handId,
      sourceFile,
      sourceKind: 'hand_history',
    });

    for (const block of tournamentHands) {
      const keyHand = parseKeyHand(block, sourceFile);
      if (keyHand) keyHands.push(keyHand);
    }
  }

  return {
    kind: 'hand_history',
    tournaments,
    hands: keyHands,
    handsParsed: hands.length,
    errors,
  };
}

export function parsedToTournament(parsed: ParsedGgTournament, playerId: string): Tournament {
  return {
    id: `gg-${parsed.tournamentId}`,
    playerId,
    date: parsed.date,
    name: parsed.name,
    buyIn: parsed.buyIn,
    position: parsed.position,
    players: parsed.players,
    prize: parsed.prize,
    gameType: parsed.gameType,
  };
}

export function parsedToKeyHand(parsed: ParsedGgHand, playerId: string): KeyHand {
  return {
    id: `hand-${parsed.handId}`,
    playerId,
    tournamentId: `gg-${parsed.tournamentId}`,
    tournamentName: parsed.tournamentName,
    date: parsed.date,
    handId: parsed.handId,
    tableId: parsed.tableId,
    heroSeat: parsed.heroSeat,
    heroPosition: parsed.heroPosition,
    holeCards: parsed.holeCards,
    holeLabel: parsed.holeLabel,
    chipDelta: parsed.chipDelta,
    bigBlind: parsed.bigBlind,
    netBB: parsed.netBB,
    initialStack: parsed.initialStack,
    finalStack: parsed.finalStack,
    pctChange: parsed.pctChange,
    category: parsed.category,
    result: parsed.result,
    board: parsed.board,
    boardFlop: parsed.boardFlop,
    boardTurn: parsed.boardTurn,
    boardRiver: parsed.boardRiver,
    pot: parsed.pot,
    players: parsed.players,
    actions: parsed.actions.map(({ raw: _raw, ...rest }) => ({ ...rest, raw: '' })),
  };
}

export function parseGgPokerFiles(files: { name: string; content: string }[]): {
  kindByFile: Record<string, GgFileKind>;
  tournaments: ParsedGgTournament[];
  hands: ParsedGgHand[];
  handsParsed: number;
  errors: string[];
} {
  const allTournaments = new Map<string, ParsedGgTournament>();
  const allHands = new Map<string, ParsedGgHand>();
  const kindByFile: Record<string, GgFileKind> = {};
  let handsParsed = 0;
  const errors: string[] = [];

  for (const file of files) {
    const result = parseGgPokerTxt(file.content, file.name);
    kindByFile[file.name] = result.kind;
    handsParsed += result.handsParsed;
    errors.push(...result.errors.map((e) => `${file.name}: ${e}`));

    for (const tournament of result.tournaments) {
      const existing = allTournaments.get(tournament.tournamentId);
      if (!existing) {
        allTournaments.set(tournament.tournamentId, tournament);
        continue;
      }

      // Prefer summary cash/bounty totals; keep hand-history players/last hand when richer
      const buyIn = tournament.buyIn || existing.buyIn;
      const prize = Math.max(existing.prize, tournament.prize);
      allTournaments.set(tournament.tournamentId, {
        ...existing,
        ...tournament,
        buyIn,
        prize,
        bounty: Math.max(existing.bounty, tournament.bounty),
        profit: prize - buyIn,
        players: Math.max(existing.players, tournament.players),
        position: tournament.position || existing.position,
        lastHandId: existing.lastHandId || tournament.lastHandId,
        sourceKind: existing.sourceKind === 'hand_history' || tournament.sourceKind === 'hand_history'
          ? 'hand_history'
          : tournament.sourceKind,
      });
    }

    for (const hand of result.hands) {
      allHands.set(hand.handId, hand);
    }
  }

  return {
    kindByFile,
    tournaments: [...allTournaments.values()],
    hands: [...allHands.values()],
    handsParsed,
    errors,
  };
}

export function fileKindLabel(kind: GgFileKind): string {
  if (kind === 'hand_history') return '→ Manos clave';
  if (kind === 'tournament_summary') return '→ Dashboard';
  return 'Desconocido';
}
