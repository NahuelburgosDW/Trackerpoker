import { useMemo } from 'react';

type Bar = { label: string; value: number; sub?: string };

type Props = {
  data: Bar[];
  height?: number;
  formatValue?: (v: number) => string;
};

export function HBarChart({ data, height, formatValue }: Props) {
  const rowH = 44;
  const totalH = height ?? data.length * rowH + 8;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const zero = 50; // percentage split for zero baseline

  const bars = useMemo(() => {
    return data.map((d) => {
      const pct = (Math.abs(d.value) / max) * 48;
      return { ...d, pct, positive: d.value >= 0 };
    });
  }, [data, max]);

  return (
    <div className="w-full" style={{ height: totalH }}>
      {bars.map((b, i) => (
        <div key={i} className="flex items-center gap-3 mb-2.5 last:mb-0 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="w-14 text-sm text-ink-200 font-medium text-right tabular-nums flex-shrink-0">{b.label}</div>
          <div className="relative flex-1 h-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-1/2 h-full flex justify-end">
                <div
                  className="h-full rounded-l-md transition-all duration-700"
                  style={{
                    width: b.positive ? 0 : `${b.pct}%`,
                    background: 'linear-gradient(90deg, rgba(255,90,95,0.3), rgba(255,90,95,0.6))',
                  }}
                />
              </div>
              <div className="w-px h-full bg-ink-600" />
              <div className="w-1/2 h-full">
                <div
                  className="h-full rounded-r-md transition-all duration-700"
                  style={{
                    width: b.positive ? `${b.pct}%` : 0,
                    background: 'linear-gradient(90deg, rgba(43,229,160,0.5), rgba(43,229,160,0.9))',
                  }}
                />
              </div>
            </div>
          </div>
          <div className={`w-20 text-sm font-semibold tabular-nums flex-shrink-0 ${b.positive ? 'text-brand' : 'text-loss'}`}>
            {formatValue ? formatValue(b.value) : b.value.toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}
