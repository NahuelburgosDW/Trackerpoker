import { ChevronDown, Spade } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { YEARS } from '@/data/mock';
import { player } from '@/data/mock';

type Props = {
  year: number;
  onYear: (y: number) => void;
  onMenu?: () => void;
};

export function Topbar({ year, onYear, onMenu }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-700/60 bg-ink-900/80 px-4 backdrop-blur-xl md:px-6">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-lg border border-ink-700 text-ink-200 hover:text-white hover:bg-ink-750 md:hidden"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2 md:hidden">
        <Spade className="h-5 w-5 text-brand" />
        <span className="font-display font-semibold text-sm">PokerTracker</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-sm font-medium text-ink-100 hover:border-ink-600 transition"
          >
            <span className="tabular-nums">{year}</span>
            <ChevronDown className={`h-4 w-4 text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-32 rounded-xl border border-ink-700 bg-ink-800 py-1 shadow-soft animate-fade-up">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    onYear(y);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-sm transition hover:bg-ink-750 ${
                    y === year ? 'text-brand font-semibold' : 'text-ink-100'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-ink-700 bg-ink-850 py-1.5 pl-1.5 pr-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-ink-950 font-display font-bold text-sm">
            {player.avatarInitials}
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="text-sm font-semibold">[{player.avatarInitials}] {player.nickname}</div>
            <div className="text-2xs text-ink-300">{player.country}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
