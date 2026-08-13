import type { ReactNode } from 'react';

type Props<T extends string = string> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string = string>({ options, value, onChange, className }: Props<T>) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1 ${className ?? ''}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              active ? 'bg-ink-600 text-white shadow-soft' : 'text-ink-300 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip transition-all duration-200 ${
        active
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-ink-700 bg-ink-850 text-ink-200 hover:border-ink-600 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
