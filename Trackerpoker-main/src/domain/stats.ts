import type { BestResults, ExtendedStats, GameType, Stats, Tournament } from '@/domain/types';

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

export function computeExtendedStats(list: Tournament[]): ExtendedStats {
  const base = computeStats(list);
  const finalTables = list.filter((t) => t.position <= 9).length;
  const top3 = list.filter((t) => t.position <= 3).length;
  const wins = list.filter((t) => t.position === 1).length;
  const mttCount = list.filter((t) => t.gameType === 'MTT').length;
  const spinCount = list.filter((t) => t.gameType === 'Spin & Gold').length;

  const byDay = new Map<string, number>();
  for (const t of list) {
    const day = t.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + (t.prize - t.buyIn));
  }

  let bestDayProfit = -Infinity;
  let bestDay = '';
  for (const [day, profit] of byDay) {
    if (profit > bestDayProfit) {
      bestDayProfit = profit;
      bestDay = day;
    }
  }

  return {
    ...base,
    finalTables,
    top3,
    wins,
    bestDayProfit: bestDayProfit === -Infinity ? 0 : bestDayProfit,
    bestDay,
    mttCount,
    spinCount,
  };
}

export function computeBest(list: Tournament[]): BestResults {
  if (list.length === 0) {
    const empty = { position: 0, tournament: '—', players: 0, date: new Date().toISOString() };
    return {
      bestFinish: empty,
      biggestPrize: { prize: 0, tournament: '—', date: new Date().toISOString() },
      biggestProfit: { profit: 0, tournament: '—', date: new Date().toISOString() },
      bestRoi: { roi: 0, tournament: '—', date: new Date().toISOString() },
    };
  }

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
    bestFinish: {
      position: bestFinish.position,
      tournament: bestFinish.name,
      players: bestFinish.players,
      date: bestFinish.date,
    },
    biggestPrize: { prize: biggestPrize.prize, tournament: biggestPrize.name, date: biggestPrize.date },
    biggestProfit: {
      profit: biggestProfit.prize - biggestProfit.buyIn,
      tournament: biggestProfit.name,
      date: biggestProfit.date,
    },
    bestRoi: { roi: bestRoiVal, tournament: bestRoi.name, date: bestRoi.date },
  };
}

export function cumulativeProfitSeries(list: Tournament[]) {
  const sorted = [...list].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  let cum = 0;
  const points = sorted.map((t) => {
    cum += t.prize - t.buyIn;
    return { date: t.date, value: +cum.toFixed(2) };
  });
  if (points.length === 0) return [];
  const first = new Date(points[0].date);
  if (Number.isNaN(first.getTime())) return points;
  const start = new Date(first);
  start.setDate(start.getDate() - 1);
  return [{ date: start.toISOString(), value: 0 }, ...points];
}

export function monthlyProfit(list: Tournament[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(year, i, 1).toLocaleString('es', { month: 'short' }),
    value: 0,
    count: 0,
  }));
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

export function tournamentVolume(list: Tournament[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(year, i, 1).toLocaleString('es', { month: 'short' }),
    value: 0,
  }));
  for (const t of list) {
    const d = new Date(t.date);
    if (d.getFullYear() === year) months[d.getMonth()].value += 1;
  }
  return months;
}
