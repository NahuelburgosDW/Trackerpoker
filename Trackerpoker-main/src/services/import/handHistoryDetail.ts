import type {
  HandAction, HandActionType, HandPlayer, HandStreet, KeyHand,
} from '@/domain/types';

function parseChips(value?: string): number {
  if (!value) return 0;
  return Number.parseInt(value.replace(/,/g, ''), 10) || 0;
}

const POSITION_LABELS_BY_COUNT: Record<number, string[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['BTN', 'SB', 'BB', 'UTG'],
  5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
  7: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'HJ', 'CO'],
  8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
  9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
};

function positionForSeat(seat: number, buttonSeat: number, seats: number[]): string {
  const ordered = [...seats].sort((a, b) => a - b);
  const n = ordered.length;
  if (n === 0) return '';
  const btnIdx = ordered.indexOf(buttonSeat);
  if (btnIdx < 0) return `Seat ${seat}`;
  const seatIdx = ordered.indexOf(seat);
  if (seatIdx < 0) return `Seat ${seat}`;
  const offset = (seatIdx - btnIdx + n) % n;
  const labels = POSITION_LABELS_BY_COUNT[n] ?? ordered.map((_, i) => (i === 0 ? 'BTN' : `P${i}`));
  return labels[offset] ?? `Seat ${seat}`;
}

function parsePlayers(text: string, buttonSeat: number): HandPlayer[] {
  const players: HandPlayer[] = [];
  const seatLines = [...text.matchAll(/^Seat (\d+): ([^\n(]+?) \(([\d,]+) in chips\)/gim)];
  const seats = seatLines.map((m) => Number.parseInt(m[1], 10));

  for (const match of seatLines) {
    const seat = Number.parseInt(match[1], 10);
    const name = match[2].trim();
    const startingStack = parseChips(match[3]);
    const isHero = /^Hero$/i.test(name);
    const dealt = text.match(new RegExp(`Dealt to ${escapeRegExp(name)}(?: \\[([^\\]]+)\\])?`, 'i'));
    const showed = text.match(new RegExp(`Seat ${seat}:[^\\n]*showed \\[([^\\]]+)\\]`, 'i'))
      ?? text.match(new RegExp(`${escapeRegExp(name)}: shows \\[([^\\]]+)\\]`, 'i'));

    players.push({
      playerId: isHero ? 'Hero' : name,
      name: isHero ? 'Hero' : name,
      seat,
      position: positionForSeat(seat, buttonSeat, seats),
      startingStack,
      holeCards: dealt?.[1]?.trim().replace(/\s+/g, ' ') ?? '',
      showedCards: showed?.[1]?.trim().replace(/\s+/g, ' ') ?? '',
      isHero,
    });
  }

  return players;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseBoardCards(text: string) {
  const flop = text.match(/\*\*\* FLOP \*\*\* \[([^\]]+)\]/i)?.[1]?.trim() ?? '';
  const turnAdd = text.match(/\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/i)?.[1]?.trim() ?? '';
  const riverAdd = text.match(/\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/i)?.[1]?.trim() ?? '';
  const summaryBoard = text.match(/Board \[([^\]]*)\]/i)?.[1]?.trim() ?? '';

  const boardFlop = flop;
  const boardTurn = flop && turnAdd ? `${flop} ${turnAdd}` : (summaryBoard.split(/\s+/).slice(0, 4).join(' ') || '');
  const boardRiver = flop && turnAdd && riverAdd
    ? `${flop} ${turnAdd} ${riverAdd}`
    : summaryBoard;

  return {
    boardFlop,
    boardTurn: boardTurn || boardFlop,
    boardRiver: boardRiver || boardTurn || boardFlop,
    board: boardRiver || summaryBoard || boardTurn || boardFlop,
  };
}

type ActionParse = {
  action: HandActionType;
  amount: number;
  amountTo?: number;
  isAllIn: boolean;
};

function classifyAction(line: string): ActionParse | null {
  const allIn = /and is all-in/i.test(line);

  if (/posts the ante/i.test(line)) {
    return { action: 'ante', amount: parseChips(line.match(/ante ([\d,]+)/i)?.[1]), isAllIn: allIn };
  }
  if (/posts small blind/i.test(line)) {
    return { action: 'small_blind', amount: parseChips(line.match(/blind ([\d,]+)/i)?.[1]), isAllIn: allIn };
  }
  if (/posts big blind/i.test(line)) {
    return { action: 'big_blind', amount: parseChips(line.match(/blind ([\d,]+)/i)?.[1]), isAllIn: allIn };
  }
  if (/folds/i.test(line)) return { action: 'fold', amount: 0, isAllIn: false };
  if (/checks/i.test(line)) return { action: 'check', amount: 0, isAllIn: false };
  if (/calls/i.test(line)) {
    return { action: allIn ? 'all_in' : 'call', amount: parseChips(line.match(/calls ([\d,]+)/i)?.[1]), isAllIn: allIn };
  }
  if (/bets/i.test(line)) {
    return { action: allIn ? 'all_in' : 'bet', amount: parseChips(line.match(/bets ([\d,]+)/i)?.[1]), isAllIn: allIn };
  }
  if (/raises/i.test(line)) {
    const raiseTo = parseChips(line.match(/raises [\d,]+ to ([\d,]+)/i)?.[1]);
    const raiseBy = parseChips(line.match(/raises ([\d,]+)/i)?.[1]);
    return {
      action: allIn ? 'all_in' : 'raise',
      amount: raiseBy,
      amountTo: raiseTo || undefined,
      isAllIn: allIn,
    };
  }
  if (/shows/i.test(line)) return { action: 'shows', amount: 0, isAllIn: false };
  if (/mucks/i.test(line)) return { action: 'mucks', amount: 0, isAllIn: false };
  if (/collected/i.test(line)) {
    return { action: 'collects', amount: parseChips(line.match(/collected ([\d,]+)/i)?.[1]), isAllIn: false };
  }
  return null;
}

function streetFromMarker(line: string): HandStreet | null {
  if (/\*\*\* HOLE CARDS \*\*\*/i.test(line)) return 'preflop';
  if (/\*\*\* FLOP \*\*\*/i.test(line)) return 'flop';
  if (/\*\*\* TURN \*\*\*/i.test(line)) return 'turn';
  if (/\*\*\* RIVER \*\*\*/i.test(line)) return 'river';
  if (/\*\*\* SHOWDOWN \*\*\*/i.test(line)) return 'showdown';
  if (/\*\*\* SUMMARY \*\*\*/i.test(line)) return null;
  return null;
}

export function parseHandHistoryDetail(text: string): {
  tableId: string;
  heroSeat: number;
  heroPosition: string;
  players: HandPlayer[];
  actions: HandAction[];
  board: string;
  boardFlop: string;
  boardTurn: string;
  boardRiver: string;
} {
  const tableId = text.match(/Table '([^']+)'/i)?.[1] ?? '';
  const buttonSeat = Number.parseInt(text.match(/Seat #(\d+) is the button/i)?.[1] ?? '0', 10);
  const players = parsePlayers(text, buttonSeat);
  const hero = players.find((p) => p.isHero);
  const boards = parseBoardCards(text);

  const actions: HandAction[] = [];
  let street: HandStreet = 'blinds';
  let pot = 0;
  let order = 0;

  const body = text.split(/\*\*\* SUMMARY \*\*\*/i)[0] ?? text;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const nextStreet = streetFromMarker(line);
    if (nextStreet) {
      street = nextStreet;
      continue;
    }

    const uncalled = line.match(/Uncalled bet \(([\d,]+)\) returned to (.+)$/i);
    if (uncalled) {
      const amount = parseChips(uncalled[1]);
      const name = uncalled[2].trim();
      pot = Math.max(0, pot - amount);
      order += 1;
      actions.push({
        street,
        playerId: /^Hero$/i.test(name) ? 'Hero' : name,
        playerName: /^Hero$/i.test(name) ? 'Hero' : name,
        action: 'uncalled',
        amount,
        isAllIn: false,
        potAfter: pot,
        order,
        raw: line,
      });
      continue;
    }

    const playerAction = line.match(/^([^:]+):\s*(.+)$/);
    if (!playerAction) continue;
    const name = playerAction[1].trim();
    const rest = playerAction[2].trim();
    const parsed = classifyAction(rest);
    if (!parsed) continue;

    // Raise "to X" — for pot tracking use amount put in this street action.
    // For raises, the line is "raises A to B" where A is the additional amount in GG format... 
    // Actually GG: "raises 4,400 to 5,000" means raise BY 4400 TO 5000 total.
    // For pot, add the "raises X" amount (additional), not the "to".
    let potDelta = parsed.amount;
    if (parsed.action === 'raise' || (parsed.action === 'all_in' && parsed.amountTo)) {
      potDelta = parsed.amount; // additional chips
    }

    pot += potDelta;
    order += 1;
    actions.push({
      street: street === 'blinds' && !['ante', 'small_blind', 'big_blind'].includes(parsed.action)
        ? 'preflop'
        : street,
      playerId: /^Hero$/i.test(name) ? 'Hero' : name,
      playerName: /^Hero$/i.test(name) ? 'Hero' : name,
      action: parsed.action,
      amount: parsed.amount,
      amountTo: parsed.amountTo,
      isAllIn: parsed.isAllIn,
      potAfter: pot,
      order,
      raw: line,
    });
  }

  return {
    tableId,
    heroSeat: hero?.seat ?? 0,
    heroPosition: hero?.position ?? '',
    players,
    actions,
    ...boards,
  };
}

export function actionLabelEs(
  action: HandAction,
  bigBlind = 0,
  displayName?: string,
): string {
  const name = displayName
    ?? (action.playerName === 'Hero' || action.playerId === 'Hero' ? 'Vos' : action.playerName);
  const fmt = (chips: number) => {
    if (!chips) return '';
    if (bigBlind > 0) {
      const bb = Math.round((chips / bigBlind) * 10) / 10;
      const bbText = Number.isInteger(bb) ? String(bb) : bb.toFixed(1);
      return `${bbText} BB`;
    }
    return chips.toLocaleString('en-US');
  };
  const amt = fmt(action.amount);
  const to = action.amountTo ? fmt(action.amountTo) : '';
  const allIn = action.isAllIn ? ' (all-in)' : '';

  switch (action.action) {
    case 'ante':
      return `${name} posteó ante ${amt}.`;
    case 'small_blind':
      return `${name} posteó small blind ${amt}.`;
    case 'big_blind':
      return `${name} posteó big blind ${amt}.`;
    case 'fold':
      return `${name} foldeó.`;
    case 'check':
      return `${name} checkeó.`;
    case 'call':
      return `${name} pagó ${amt}${allIn}.`;
    case 'bet':
      return `${name} hizo bet de ${amt}${allIn}.`;
    case 'raise':
      return to
        ? `${name} hizo raise a ${to}${allIn}.`
        : `${name} hizo raise de ${amt}${allIn}.`;
    case 'all_in':
      if (to) return `${name} fue all-in a ${to}.`;
      if (amt) return `${name} fue all-in por ${amt}.`;
      return `${name} fue all-in.`;
    case 'uncalled':
      return `Apuesta no cobrada (${amt}) devuelta a ${name}.`;
    case 'shows': {
      const cards = action.raw.match(/shows \[([^\]]+)\]/i)?.[1]?.trim().replace(/\s+/g, ' ');
      return cards ? `${name} mostró ${cards}.` : `${name} mostró cartas.`;
    }
    case 'mucks':
      return `${name} muck.`;
    case 'collects':
      return `${name} recolectó ${amt} del pot.`;
    default:
      return `${name}: ${action.raw}`;
  }
}

export function streetTitleEs(street: HandStreet, _board = ''): string {
  if (street === 'blinds') return 'Blinds / Ante';
  if (street === 'preflop') return 'Preflop';
  if (street === 'flop') return 'Flop';
  if (street === 'turn') return 'Turn';
  if (street === 'river') return 'River';
  return 'Showdown';
}

export function groupActionsByStreet(hand: KeyHand): { street: HandStreet; board: string; actions: HandAction[] }[] {
  const order: HandStreet[] = ['blinds', 'preflop', 'flop', 'turn', 'river', 'showdown'];
  const map = new Map<HandStreet, HandAction[]>();
  for (const a of hand.actions ?? []) {
    const list = map.get(a.street) ?? [];
    list.push(a);
    map.set(a.street, list);
  }

  return order
    .filter((s) => (map.get(s)?.length ?? 0) > 0)
    .map((street) => {
      let board = '';
      if (street === 'flop') board = hand.boardFlop || hand.board;
      if (street === 'turn') board = hand.boardTurn || hand.board;
      if (street === 'river') board = hand.boardRiver || hand.board;
      return { street, board, actions: map.get(street) ?? [] };
    });
}
