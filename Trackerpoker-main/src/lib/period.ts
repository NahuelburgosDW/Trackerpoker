import type { Tournament } from '@/domain/types';

export type Period =
  | 'all'
  | 'year-2024'
  | 'year-2025'
  | 'year-2026'
  | 'year-2027'
  | 'year-2028'
  | 'last7d'
  | 'last30d'
  | 'thisYear';

export const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Todo', value: 'all' },
  { label: '2024', value: 'year-2024' },
  { label: '2025', value: 'year-2025' },
  { label: '2026', value: 'year-2026' },
  { label: '2027', value: 'year-2027' },
  { label: '2028', value: 'year-2028' },
  { label: '7 días', value: 'last7d' },
  { label: '30 días', value: 'last30d' },
  { label: 'Este año', value: 'thisYear' },
];

export function filterByPeriod(
  list: Tournament[],
  period: Period,
  now = new Date(),
): Tournament[] {
  if (period === 'all') return list;

  if (period.startsWith('year-')) {
    const year = parseInt(period.replace('year-', ''), 10);
    return list.filter((t) => new Date(t.date).getFullYear() === year);
  }

  if (period === 'thisYear') {
    const year = now.getFullYear();
    return list.filter((t) => new Date(t.date).getFullYear() === year);
  }

  const days = period === 'last7d' ? 7 : 30;
  const cutoff = now.getTime() - days * 86400000;
  return list.filter((t) => +new Date(t.date) >= cutoff);
}

export type ChartGranularity = 'all' | 'year' | 'month';

export const CHART_GRANULARITY_OPTIONS: { label: string; value: ChartGranularity }[] = [
  { label: 'Todo', value: 'all' },
  { label: 'Año', value: 'year' },
  { label: 'Mes', value: 'month' },
];

export function aggregateProfitSeries(
  list: Tournament[],
  granularity: ChartGranularity,
): { date: string; value: number }[] {
  const sorted = [...list].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  let cum = 0;

  if (granularity === 'all') {
    const points = sorted.map((t) => {
      cum += t.prize - t.buyIn;
      return { date: t.date, value: +cum.toFixed(2) };
    });
    return withProfitBaseline(points);
  }

  const buckets = new Map<string, number>();

  for (const t of sorted) {
    const d = new Date(t.date);
    const key =
      granularity === 'year'
        ? String(d.getFullYear())
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) ?? 0) + (t.prize - t.buyIn));
  }

  const keys = [...buckets.keys()].sort();
  const points = keys.map((key) => {
    cum += buckets.get(key)!;
    const date =
      granularity === 'year'
        ? `${key}-06-15T12:00:00.000Z`
        : `${key}-15T12:00:00.000Z`;
    return { date, value: +cum.toFixed(2) };
  });
  return withProfitBaseline(points);
}

function withProfitBaseline(points: { date: string; value: number }[]): { date: string; value: number }[] {
  if (points.length === 0) return [];
  const first = new Date(points[0].date);
  if (Number.isNaN(first.getTime())) return points;
  const start = new Date(first);
  start.setDate(start.getDate() - 1);
  return [{ date: start.toISOString(), value: 0 }, ...points];
}
