export type GameType = 'MTT' | 'Spin & Gold' | 'Other';

export type Tournament = {
  id: string;
  date: string; // ISO
  name: string;
  buyIn: number;
  position: number;
  players: number;
  prize: number;
  gameType: GameType;
};

export type Player = {
  nickname: string;
  realName: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  room: string;
  bio: string;
  gameTypes: string[];
  startedAt: string;
  avatarInitials: string;
};

export const player: Player = {
  nickname: 'Nahuel',
  realName: 'Nahuel Heredia',
  country: 'Argentina',
  countryCode: 'AR',
  countryFlag: '🇦🇷',
  room: 'GGPoker',
  bio: 'MTT & Spin & Gold Player',
  gameTypes: ['MTT', 'Spin & Gold', 'Other'],
  startedAt: '2024-03-14',
  avatarInitials: 'NH',
};

const FIRST = ['Bounty Hunters', 'Spin & Gold', 'Sunday Slam', 'MicroMillions', 'Daily Big', 'Turbo Clash', 'Hyper Dash', 'Bounty King', 'Stack Hunter', 'Deep Run', 'Mega Stack', 'Friday Frenzy', 'Weekend Warrior', 'Lucky Flip', 'Rush Hour', 'Golden Spin', 'Mystery Bounty', 'All-in Shootout'];
const BUY_INS = [0.5, 1, 2.5, 5.4, 10, 25, 50];
const GTS: GameType[] = ['MTT', 'Spin & Gold', 'Other'];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length)];
}

function generateTournaments(count: number, seed = 42): Tournament[] {
  const rnd = seeded(seed);
  const out: Tournament[] = [];
  const start = new Date('2024-03-14').getTime();
  const end = new Date('2026-08-13').getTime();
  for (let i = 0; i < count; i++) {
    const date = new Date(start + (end - start) * (i / count)).toISOString();
    const name = pick(FIRST, rnd());
    const buyIn = pick(BUY_INS, rnd());
    const players = Math.max(20, Math.floor(40 + rnd() * 2400));
    const gameType = pick(GTS, rnd());
    // ITM ~31% — bias position to be in the money ~31% of the time
    const itm = rnd() < 0.314;
    let position: number;
    let prize = 0;
    if (itm) {
      position = Math.max(1, Math.floor(1 + rnd() * players * 0.12));
      prize = +(buyIn * (2 + rnd() * 80)).toFixed(2);
    } else {
      position = Math.floor(players * (0.2 + rnd() * 0.8));
      prize = 0;
    }
    out.push({
      id: `t-${i + 1}`,
      date,
      name,
      buyIn: +buyIn.toFixed(2),
      position,
      players,
      prize,
      gameType,
    });
  }
  return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const tournaments: Tournament[] = generateTournaments(1245);

export type Stats = {
  totalTournaments: number;
  totalInvested: number;
  totalPrizes: number;
  profit: number;
  roi: number;
  itm: number;
};

export function computeStats(list: Tournament[]): Stats {
  const totalTournaments = list.length;
  const totalInvested = list.reduce((s, t) => s + t.buyIn, 0);
  const totalPrizes = list.reduce((s, t) => s + t.prize, 0);
  const profit = totalPrizes - totalInvested;
  const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  const itmCount = list.filter((t) => t.prize > 0).length;
  const itm = totalTournaments > 0 ? (itmCount / totalTournaments) * 100 : 0;
  return { totalTournaments, totalInvested, totalPrizes, profit, roi, itm };
}

export type BestResults = {
  bestFinish: { position: number; tournament: string; players: number; date: string };
  biggestPrize: { prize: number; tournament: string; date: string };
  biggestProfit: { profit: number; tournament: string; date: string };
  bestRoi: { roi: number; tournament: string; date: string };
};

export function computeBest(list: Tournament[]): BestResults {
  let bestFinish = list[0];
  let biggestPrize = list[0];
  let biggestProfit = list[0];
  let bestRoi = list[0];
  let bestRoiVal = -Infinity;
  for (const t of list) {
    if (t.prize > 0 && t.position < bestFinish.position) bestFinish = t;
    if (t.prize > biggestPrize.prize) biggestPrize = t;
    const p = t.prize - t.buyIn;
    if (p > biggestProfit.prize - biggestProfit.buyIn) biggestProfit = t;
    const r = t.buyIn > 0 ? (p / t.buyIn) * 100 : 0;
    if (r > bestRoiVal) {
      bestRoiVal = r;
      bestRoi = t;
    }
  }
  return {
    bestFinish: { position: bestFinish.position, tournament: bestFinish.name, players: bestFinish.players, date: bestFinish.date },
    biggestPrize: { prize: biggestPrize.prize, tournament: biggestPrize.name, date: biggestPrize.date },
    biggestProfit: { profit: biggestProfit.prize - biggestProfit.buyIn, tournament: biggestProfit.name, date: biggestProfit.date },
    bestRoi: { roi: bestRoiVal, tournament: bestRoi.name, date: bestRoi.date },
  };
}

// Cumulative profit series for a given set of tournaments
export function cumulativeProfitSeries(list: Tournament[]) {
  const sorted = [...list].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  let cum = 0;
  return sorted.map((t) => {
    cum += t.prize - t.buyIn;
    return { date: t.date, value: +cum.toFixed(2) };
  });
}

// Monthly profit buckets
export function monthlyProfit(list: Tournament[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({ label: new Date(year, i, 1).toLocaleString('en', { month: 'short' }), value: 0, count: 0 }));
  for (const t of list) {
    const d = new Date(t.date);
    if (d.getFullYear() === year) {
      const m = d.getMonth();
      months[m].value += t.prize - t.buyIn;
      months[m].count += 1;
    }
  }
  return months.map((m) => ({ ...m, value: +m.value.toFixed(2) }));
}

// Performance by buy-in
export function performanceByBuyIn(list: Tournament[]) {
  const map = new Map<number, { buyIn: number; invested: number; prizes: number; count: number }>();
  for (const t of list) {
    const e = map.get(t.buyIn) ?? { buyIn: t.buyIn, invested: 0, prizes: 0, count: 0 };
    e.invested += t.buyIn;
    e.prizes += t.prize;
    e.count += 1;
    map.set(t.buyIn, e);
  }
  return Array.from(map.values())
    .sort((a, b) => a.buyIn - b.buyIn)
    .map((e) => ({
      buyIn: e.buyIn,
      profit: +(e.prizes - e.invested).toFixed(2),
      roi: e.invested > 0 ? ((e.prizes - e.invested) / e.invested) * 100 : 0,
      count: e.count,
    }));
}

// Performance by game type
export function performanceByGameType(list: Tournament[]) {
  const map = new Map<GameType, { invested: number; prizes: number; count: number }>();
  for (const t of list) {
    const e = map.get(t.gameType) ?? { invested: 0, prizes: 0, count: 0 };
    e.invested += t.buyIn;
    e.prizes += t.prize;
    e.count += 1;
    map.set(t.gameType, e);
  }
  return Array.from(map.entries()).map(([type, e]) => ({
    type,
    profit: +(e.prizes - e.invested).toFixed(2),
    roi: e.invested > 0 ? ((e.prizes - e.invested) / e.invested) * 100 : 0,
    count: e.count,
  }));
}

// Position distribution buckets (percentile finish)
export function positionDistribution(list: Tournament[]) {
  const buckets = [
    { label: '1–5%', min: 0, max: 0.05, count: 0 },
    { label: '5–10%', min: 0.05, max: 0.1, count: 0 },
    { label: '10–20%', min: 0.1, max: 0.2, count: 0 },
    { label: '20–50%', min: 0.2, max: 0.5, count: 0 },
    { label: '50%+', min: 0.5, max: 1.01, count: 0 },
  ];
  for (const t of list) {
    const p = t.position / t.players;
    const b = buckets.find((b) => p >= b.min && p < b.max) ?? buckets[buckets.length - 1];
    b.count += 1;
  }
  return buckets.map((b) => ({ label: b.label, count: b.count }));
}

// Tournament volume by month for a year
export function tournamentVolume(list: Tournament[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({ label: new Date(year, i, 1).toLocaleString('en', { month: 'short' }), value: 0 }));
  for (const t of list) {
    const d = new Date(t.date);
    if (d.getFullYear() === year) months[d.getMonth()].value += 1;
  }
  return months;
}

export const YEARS = [2024, 2025, 2026];
