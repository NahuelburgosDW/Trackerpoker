import type { GameType, Player, Tournament } from '@/domain/types';

export type { GameType, Player, Tournament, Stats, ExtendedStats, BestResults } from '@/domain/types';
export {
  computeStats,
  computeExtendedStats,
  computeBest,
  cumulativeProfitSeries,
  monthlyProfit,
  performanceByBuyIn,
  performanceByGameType,
  positionDistribution,
  tournamentVolume,
} from '@/domain/stats';

export const DEFAULT_PLAYER_ID = 'player-1';

export const player: Player = {
  id: DEFAULT_PLAYER_ID,
  nickname: 'Jugador',
  realName: 'Demo Player',
  country: 'Argentina',
  countryCode: 'AR',
  countryFlag: '🇦🇷',
  room: 'GGPoker',
  bio: 'MTT & Spin & Gold Player',
  gameTypes: ['MTT', 'Spin & Gold'],
  startedAt: '2024-03-14',
  createdAt: '2024-03-14T00:00:00.000Z',
  avatarInitials: 'JP',
};

const FIRST = [
  'Bounty Hunters', 'Spin & Gold', 'Sunday Slam', 'MicroMillions', 'Daily Big',
  'Turbo Clash', 'Hyper Dash', 'Bounty King', 'Stack Hunter', 'Deep Run',
  'Mega Stack', 'Friday Frenzy', 'Weekend Warrior', 'Lucky Flip', 'Rush Hour',
  'Golden Spin', 'Mystery Bounty', 'All-in Shootout', 'Mini Main', 'Super Fifty',
];
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
      playerId: DEFAULT_PLAYER_ID,
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
export const YEARS = [2024, 2025, 2026, 2027, 2028];

export function getPlayerTournaments(playerId = DEFAULT_PLAYER_ID): Tournament[] {
  return tournaments.filter((t) => t.playerId === playerId);
}
