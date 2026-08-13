import { useId, useMemo, useState } from 'react';
import { formatMoneyFull, formatDate } from '@/lib/format';

type Point = { date: string; value: number };

type Props = {
  data: Point[];
  height?: number;
  positive?: boolean;
};

export function ProfitChart({ data, height = 320 }: Props) {
  const id = useId();
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const width = 1000;
  const pad = { top: 20, right: 16, bottom: 28, left: 56 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const { points, min, max, areaPath, linePath, len, yTicks } = useMemo(() => {
    if (data.length < 2) return { points: [], min: 0, max: 0, areaPath: '', linePath: '', len: 0, yTicks: [] };
    const vals = data.map((d) => d.value);
    const min = Math.min(0, ...vals);
    const max = Math.max(...vals, 0);
    const range = max - min || 1;
    const x = (i: number) => pad.left + (i / (data.length - 1)) * w;
    const y = (v: number) => pad.top + h - ((v - min) / range) * h;
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.value), ...d }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + h).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top + h).toFixed(1)} Z`;
    // approximate path length for draw animation
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const ticks = 5;
    const yT = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = min + (range * i) / ticks;
      return { v, y: y(v) };
    });
    return { points: pts, min, max, areaPath: area, linePath: line, len: l, yTicks: yT };
  }, [data, h, w]);

  const zeroY = useMemo(() => {
    if (!data.length) return 0;
    const range = (max - min) || 1;
    return pad.top + h - ((0 - min) / range) * h;
  }, [min, max, h]);

  if (data.length < 2) {
    return <div className="flex items-center justify-center text-ink-300 text-sm" style={{ height }}>No data</div>;
  }

  const last = points[points.length - 1];
  const positive = last.value >= 0;
  const stroke = positive ? '#2BE5A0' : '#FF5A5F';
  const fill = positive ? 'url(#area-pos)' : 'url(#area-neg)';

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          const ratio = (px - pad.left) / w;
          const i = Math.round(ratio * (data.length - 1));
          if (i >= 0 && i < data.length && points[i]) {
            setHover({ i, x: points[i].x, y: points[i].y });
          }
        }}
      >
        <defs>
          <linearGradient id={`${id}-pos`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2BE5A0" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2BE5A0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-neg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A5F" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF5A5F" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={stroke} />
            <stop offset="100%" stopColor={stroke} />
          </linearGradient>
        </defs>

        {/* grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={width - pad.right} y2={t.y} stroke="#1B2129" strokeWidth="1" strokeDasharray="2 4" />
            <text x={pad.left - 10} y={t.y + 4} textAnchor="end" fontSize="11" fill="#525C6A" fontFamily="JetBrains Mono">
              {formatMoneyFull(t.v)}
            </text>
          </g>
        ))}

        {/* zero line */}
        <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} stroke="#2B333E" strokeWidth="1" />

        {/* area */}
        <path d={areaPath} fill={fill} className="animate-fade-in" style={{ opacity: 0.9 }} />

        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${id}-stroke)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw"
          style={{ ['--len' as string]: len, pathLength: 1 } as React.CSSProperties}
        />

        {/* hover */}
        {hover && points[hover.i] && (
          <g>
            <line x1={points[hover.i].x} y1={pad.top} x2={points[hover.i].x} y2={pad.top + h} stroke="#3A434F" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={points[hover.i].x} cy={points[hover.i].y} r="5" fill={stroke} stroke="#0B0D10" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {/* tooltip */}
      {hover && points[hover.i] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 shadow-soft"
          style={{
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
            marginTop: '-12px',
          }}
        >
          <div className="text-2xs text-ink-300 mb-0.5">{formatDate(points[hover.i].date, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: stroke }}>
            {formatMoneyFull(points[hover.i].value, true)}
          </div>
        </div>
      )}
    </div>
  );
}
