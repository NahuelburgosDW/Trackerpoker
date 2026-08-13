import { useId, useMemo } from 'react';

type Bar = { label: string; value: number };

type Props = {
  data: Bar[];
  height?: number;
  signed?: boolean;
};

export function BarChart({ data, height = 240, signed = true }: Props) {
  const id = useId();
  const width = 1000;
  const pad = { top: 16, right: 8, bottom: 28, left: 48 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const { bars, min, max, zeroY, yTicks } = useMemo(() => {
    const vals = data.map((d) => d.value);
    const min = signed ? Math.min(0, ...vals) : 0;
    const max = Math.max(...vals, 0);
    const range = (max - min) || 1;
    const bw = w / data.length;
    const barW = Math.min(48, bw * 0.6);
    const zeroY = pad.top + h - ((0 - min) / range) * h;
    const bars = data.map((d, i) => {
      const x = pad.left + i * bw + (bw - barW) / 2;
      const top = pad.top + h - ((d.value - min) / range) * h;
      const height = Math.abs(zeroY - top);
      const y = d.value >= 0 ? top : zeroY;
      return { x, y, height: Math.max(2, height), barW, value: d.value, label: d.label, positive: d.value >= 0 };
    });
    const ticks = 4;
    const yT = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = min + (range * i) / ticks;
      return { v, y: pad.top + h - ((v - min) / range) * h };
    });
    return { bars, min, max, zeroY, yTicks: yT };
  }, [data, h, w, signed]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`${id}-pos`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2BE5A0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#16C98A" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`${id}-neg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5A5F" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF5A5F" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} y1={t.y} x2={width - pad.right} y2={t.y} stroke="#161B22" strokeWidth="1" strokeDasharray="2 4" />
          <text x={pad.left - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="#525C6A" fontFamily="JetBrains Mono">
            {Math.abs(t.v) >= 1000 ? `${(t.v / 1000).toFixed(1)}k` : t.v.toFixed(0)}
          </text>
        </g>
      ))}
      <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} stroke="#2B333E" strokeWidth="1" />
      {bars.map((b, i) => (
        <g key={i} className="animate-grow-y" style={{ transformOrigin: `${b.x + b.barW / 2}px ${zeroY}px`, animationDelay: `${i * 40}ms` }}>
          <rect x={b.x} y={b.y} width={b.barW} height={b.height} rx="4" fill={b.positive ? `url(#${id}-pos)` : `url(#${id}-neg)`} />
        </g>
      ))}
      {bars.map((b, i) => (
        <text key={i} x={b.x + b.barW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#525C6A" fontFamily="Inter">
          {b.label}
        </text>
      ))}
    </svg>
  );
}
