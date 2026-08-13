export type GameType = 'MTT' | 'Spin & Gold' | 'Other';

export type HandStreet = 'blinds' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type HandActionType =
  | 'ante'
  | 'small_blind'
  | 'big_blind'
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'all_in'
  | 'uncalled'
  | 'shows'
  | 'mucks'
  | 'collects'
  | 'other';

export type HandPlayer = {
  playerId: string;
  name: string;
  seat: number;
  position: string;
  startingStack: number;
  holeCards: string;
  showedCards: string;
  isHero: boolean;
};

export type HandAction = {
  street: HandStreet;
  playerId: string;
  playerName: string;
  action: HandActionType;
  amount: number;
  amountTo?: number;
  isAllIn: boolean;
  potAfter: number;
  order: number;
  raw: string;
};

export type KeyHand = {
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
  /** Big blind de la mano (fichas). */
  bigBlind?: number;
  /** chipDelta / bigBlind. */
  netBB?: number;
  initialStack?: number;
  finalStack?: number;
  /** % del stack (ej. -30.5). */
  pctChange?: number;
  /** BIG_LOSS | BIG_WIN | … */
  category?: string;
  result: 'won' | 'lost' | 'folded' | 'unknown';
  board: string;
  boardFlop?: string;
  boardTurn?: string;
  boardRiver?: string;
  pot: number;
  players?: HandPlayer[];
  actions?: HandAction[];
};

export type Tournament = {
  id: string;
  playerId: string;
  date: string;
  name: string;
  buyIn: number;
  position: number;
  players: number;
  prize: number;
  gameType: GameType;
};

export type Player = {
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
  avatarUrl?: string;
  avatarInitials: string;
};

export type Stats = {
  totalTournaments: number;
  totalInvested: number;
  totalPrizes: number;
  profit: number;
  roi: number;
  itm: number;
};

export type ExtendedStats = Stats & {
  finalTables: number;
  top3: number;
  wins: number;
  bestDayProfit: number;
  bestDay: string;
  mttCount: number;
  spinCount: number;
};

export type BestResults = {
  bestFinish: { position: number; tournament: string; players: number; date: string };
  biggestPrize: { prize: number; tournament: string; date: string };
  biggestProfit: { profit: number; tournament: string; date: string };
  bestRoi: { roi: number; tournament: string; date: string };
};
