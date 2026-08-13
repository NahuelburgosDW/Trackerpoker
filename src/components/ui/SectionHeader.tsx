import type { LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ icon: Icon, title, subtitle, actions, className }: Props) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 mb-5 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-700/60 border border-ink-600">
            <Icon className="h-[18px] w-[18px] text-ink-100" strokeWidth={2} />
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-ink-300 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
