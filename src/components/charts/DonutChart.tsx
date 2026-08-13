import { useId, useMemo } from 'react';

type Slice = { label: string; value: number; color: string };

type Props = {
  data: Slice[];
  size?: number;
  thickness?: number;
};

export function DonutChart({ data, size = 200, thickness = 28 }: Props) {
  const id = useId();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const segments = useMemo(() => {
    let offset = 0;
    return data.map((d) => {
      const frac = d.value / total;
      const dash = frac * circ;
      const seg = { ...d, dash, gap: circ - dash, offset: -offset, pct: frac * 100 };
      offset += dash;
      return seg;
    });
  }, [data, total, circ]);

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#161B22" strokeWidth={thickness} />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff" fontFamily="Clash Display, Inter">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#525C6A" fontFamily="Inter">
          total
        </text>
      </svg>
      <div className="space-y-2.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-ink-100 font-medium">{s.label}</span>
            <span className="text-ink-300 tabular-nums ml-auto pl-3">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
