import { useMemo, useState } from 'react';
import { Spade, TrendingDown, TrendingUp, Lock, X, ChevronRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppData } from '@/hooks/useAppData';
import { formatDate } from '@/lib/format';
import type { HandAction, HandPlayer, KeyHand } from '@/domain/types';
import { KEY_HAND_BB_THRESHOLD } from '@/services/import/ggPokerParser';
import {
  classifyHand,
  DEFAULT_STACK_PCT_THRESHOLD,
  type HandCategory,
} from '@/services/import/handClassification';
import {
  actionLabelEs,
  groupActionsByStreet,
  streetTitleEs,
} from '@/services/import/handHistoryDetail';

function resolveCategory(hand: KeyHand): HandCategory {
  if (hand.category === 'BIG_LOSS' || hand.category === 'BIG_WIN'
    || hand.category === 'MINOR_LOSS' || hand.category === 'MINOR_WIN'
    || hand.category === 'NEUTRAL') {
    return hand.category;
  }

  const initialStack = hand.initialStack
    ?? hand.players?.find((p) => p.isHero)?.startingStack
    ?? 0;
  const finalStack = hand.finalStack ?? Math.max(0, initialStack + hand.chipDelta);
  const bigBlind = hand.bigBlind ?? 0;

  if (initialStack > 0 && bigBlind > 0) {
    return classifyHand({
      handId: hand.handId,
      initialStack,
      finalStack,
      bigBlind,
    }).category;
  }

  const netBB = hand.netBB
    ?? (bigBlind > 0 ? hand.chipDelta / bigBlind : 0);
  if (netBB <= -KEY_HAND_BB_THRESHOLD) return 'BIG_LOSS';
  if (netBB >= KEY_HAND_BB_THRESHOLD) return 'BIG_WIN';
  if (hand.chipDelta < 0) return 'MINOR_LOSS';
  if (hand.chipDelta > 0) return 'MINOR_WIN';
  return 'NEUTRAL';
}

function handNetBB(hand: KeyHand): number {
  const bb = hand.bigBlind ?? 0;
  const initial = hand.initialStack
    ?? hand.players?.find((p) => p.isHero)?.startingStack
    ?? 0;

  // Siempre recalcular desde fichas / BB (no confiar en netBB guardado con locale roto)
  if (bb > 0 && Number.isFinite(hand.chipDelta)) {
    let net = hand.chipDelta / bb;
    // Una pérdida no puede superar el stack inicial en BB
    if (initial > 0 && net < 0) {
      const maxLoss = initial / bb;
      if (net < -maxLoss - 0.05) net = -maxLoss;
    }
    return Math.round(net * 100) / 100;
  }

  if (typeof hand.netBB === 'number' && Number.isFinite(hand.netBB)) {
    // Sanear netBB absurdo vs stack
    if (initial > 0 && bb > 0 && hand.netBB < 0) {
      const maxLoss = initial / bb;
      if (hand.netBB < -maxLoss - 0.05) return Math.round(-maxLoss * 100) / 100;
    }
    return hand.netBB;
  }
  return 0;
}

function formatBB(n: number): string {
  const abs = Math.abs(n);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${text} BB`;
}

function stackInBB(chips: number, bigBlind: number): number | null {
  if (!bigBlind || bigBlind <= 0 || chips <= 0) return null;
  return Math.round((chips / bigBlind) * 10) / 10;
}

/** Parsea "Ah Kd" / "Jd 6d 9d" → códigos de carta. */
function parseCardCodes(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw.trim().split(/\s+/).filter((c) => /^[2-9TJQKA][cdhs]$/i.test(c));
}

const SUIT_SYM: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };

function MiniCard({ code }: { code: string }) {
  const rankRaw = code[0]?.toUpperCase() ?? '?';
  const rank = rankRaw === 'T' ? '10' : rankRaw;
  const suit = code[1]?.toLowerCase() ?? '';
  const red = suit === 'h' || suit === 'd';
  return (
    <span
      className={`inline-flex h-11 w-8 flex-col items-center justify-center rounded-md border bg-ink-900 shadow-sm ${
        red ? 'border-loss/40 text-loss' : 'border-ink-600 text-ink-100'
      }`}
      title={code}
    >
      <span className="text-xs font-bold leading-none">{rank}</span>
      <span className="text-sm leading-none mt-0.5">{SUIT_SYM[suit] ?? suit}</span>
    </span>
  );
}

function CardRow({ cards, label }: { cards: string[]; label?: string }) {
  if (cards.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label ? <span className="text-2xs uppercase tracking-wider text-ink-400 w-12 shrink-0">{label}</span> : null}
      <div className="flex gap-1.5">
        {cards.map((c, i) => <MiniCard key={`${label}-${c}-${i}`} code={c} />)}
      </div>
    </div>
  );
}

/**
 * Hero → Vos. Rivales que jugaron la mano → Enemigo 1, 2, …
 * Orden: por primera acción voluntaria; si no, por seat.
 */
function buildDisplayNames(hand: KeyHand): Map<string, string> {
  const map = new Map<string, string>();
  map.set('Hero', 'Vos');

  const voluntary = new Set(['call', 'bet', 'raise', 'all_in']);
  const enteredIds: string[] = [];
  const seen = new Set<string>();

  for (const a of hand.actions ?? []) {
    if (a.playerId === 'Hero' || /^Hero$/i.test(a.playerName)) continue;
    if (!voluntary.has(a.action)) continue;
    const key = a.playerId || a.playerName;
    if (seen.has(key)) continue;
    seen.add(key);
    enteredIds.push(key);
  }

  // Fallback: rivales sentados si nadie “entró” por acciones
  if (enteredIds.length === 0) {
    const others = (hand.players ?? [])
      .filter((p) => !p.isHero)
      .sort((a, b) => a.seat - b.seat);
    for (const p of others) enteredIds.push(p.playerId || p.name);
  }

  enteredIds.forEach((id, i) => {
    map.set(id, `Enemigo ${i + 1}`);
  });

  // Alias por nombre visible en acciones
  for (const a of hand.actions ?? []) {
    const key = a.playerId || a.playerName;
    if (map.has(key) && a.playerName && a.playerName !== key) {
      map.set(a.playerName, map.get(key)!);
    }
  }
  for (const p of hand.players ?? []) {
    if (p.isHero) {
      map.set(p.playerId, 'Vos');
      map.set(p.name, 'Vos');
      continue;
    }
    const label = map.get(p.playerId) || map.get(p.name);
    if (label) {
      map.set(p.playerId, label);
      map.set(p.name, label);
    }
  }

  return map;
}

function displayNameFor(action: HandAction, names: Map<string, string>): string {
  return names.get(action.playerId)
    || names.get(action.playerName)
    || (action.playerName === 'Hero' ? 'Vos' : action.playerName);
}

function displayNameForPlayer(p: HandPlayer, names: Map<string, string>): string {
  if (p.isHero) return 'Vos';
  return names.get(p.playerId) || names.get(p.name) || p.name;
}

function HandRow({ hand, onOpen }: { hand: KeyHand; onOpen: () => void }) {
  const netBB = handNetBB(hand);
  const win = resolveCategory(hand) === 'BIG_WIN';
  const bb = hand.bigBlind ?? 0;
  const startBB = stackInBB(
    hand.initialStack ?? hand.players?.find((p) => p.isHero)?.startingStack ?? 0,
    bb,
  );
  const hole = parseCardCodes(hand.holeCards);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3 text-left transition hover:border-ink-500 hover:bg-ink-800"
    >
      <div className={`mt-0.5 grid h-9 w-9 place-items-center rounded-lg ${win ? 'bg-brand/10' : 'bg-loss/10'}`}>
        {win
          ? <TrendingUp className="h-4 w-4 text-brand" />
          : <TrendingDown className="h-4 w-4 text-loss" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-ink-100">{hand.holeLabel}</span>
          {hole.length > 0 ? (
            <div className="flex gap-1 scale-90 origin-left">
              {hole.map((c) => <MiniCard key={c} code={c} />)}
            </div>
          ) : (
            <span className="font-mono text-2xs text-ink-400">{hand.holeCards}</span>
          )}
          {hand.heroPosition ? (
            <span className="text-2xs text-ink-500">{hand.heroPosition}</span>
          ) : null}
          {startBB != null ? (
            <span className="text-2xs text-ink-500">{formatBB(startBB)} al inicio</span>
          ) : null}
        </div>
        <p className={`text-sm font-semibold mt-0.5 ${win ? 'text-brand' : 'text-loss'}`}>
          {win ? 'Ganaste' : 'Perdiste'} {formatBB(netBB)}
          {hand.pctChange != null ? (
            <span className="text-2xs font-normal text-ink-400 ml-2">
              ({hand.pctChange > 0 ? '+' : ''}{hand.pctChange}% stack)
            </span>
          ) : null}
        </p>
        <p className="text-2xs text-ink-400 mt-1 truncate">
          {hand.tournamentName}
          {' · '}
          {formatDate(hand.date, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-ink-500" />
    </button>
  );
}

function HandDetailModal({ hand, onClose }: { hand: KeyHand; onClose: () => void }) {
  const netBB = handNetBB(hand);
  const win = resolveCategory(hand) === 'BIG_WIN';
  const bb = hand.bigBlind ?? 0;
  const streets = groupActionsByStreet(hand);
  const hasHistory = streets.length > 0;
  const names = useMemo(() => buildDisplayNames(hand), [hand]);
  const showdownPlayers = (hand.players ?? []).filter((p) => p.showedCards || p.isHero);

  const initialStack = hand.initialStack
    ?? hand.players?.find((p) => p.isHero)?.startingStack
    ?? 0;
  const startBB = stackInBB(initialStack, bb);
  const hole = parseCardCodes(hand.holeCards);

  const flopCards = parseCardCodes(hand.boardFlop);
  const turnCards = parseCardCodes(hand.boardTurn);
  const riverCards = parseCardCodes(hand.boardRiver);
  // Turn/river strings incluyen flop; mostrar solo la carta nueva en la fila, o el board acumulado
  const flopOnly = flopCards.slice(0, 3);
  const turnOnly = turnCards.length >= 4 ? [turnCards[3]] : turnCards.slice(3, 4);
  const riverOnly = riverCards.length >= 5 ? [riverCards[4]] : riverCards.slice(4, 5);

  const boardForStreet = (street: string): string[] => {
    if (street === 'flop') return flopOnly;
    if (street === 'turn') return turnOnly.length ? turnOnly : [];
    if (street === 'river') return riverOnly.length ? riverOnly : [];
    return [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-ink-700 bg-ink-800 p-6 shadow-soft animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Historial de la mano</h3>
            <p className="text-2xs text-ink-400 mt-1">
              {hand.holeLabel}
              {hand.heroPosition ? ` · ${hand.heroPosition}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-ink-700/60 bg-ink-850 px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold ${win ? 'text-brand' : 'text-loss'}`}>
                Vos {win ? 'ganaste' : 'perdiste'} {formatBB(netBB)}
              </p>
              {startBB != null ? (
                <p className="text-2xs text-ink-300 mt-0.5">
                  Stack al entrar: <span className="text-ink-100 font-medium">{formatBB(startBB)}</span>
                  {initialStack > 0 ? (
                    <span className="text-ink-500"> ({initialStack.toLocaleString('en-US')} fichas)</span>
                  ) : null}
                </p>
              ) : null}
            </div>
            <CardRow cards={hole} label="Vos" />
          </div>

          {(flopOnly.length > 0 || turnOnly.length > 0 || riverOnly.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-ink-700/50">
              <CardRow cards={flopOnly} label="Flop" />
              <CardRow cards={turnOnly} label="Turn" />
              <CardRow cards={riverOnly} label="River" />
            </div>
          )}

          <p className="text-2xs text-ink-500">
            {hand.tournamentName}
            {bb ? ` · Ciega ${bb.toLocaleString('en-US')}` : ''}
            {hand.pot ? ` · Pot ${hand.pot.toLocaleString('en-US')}` : ''}
          </p>
        </div>

        {!hasHistory ? (
          <p className="text-sm text-ink-300">
            Esta mano no tiene historial guardado. Volvé a importar el TXT de historial de manos.
          </p>
        ) : (
          <div className="space-y-5">
            {streets.map(({ street, actions }) => (
              <section key={street}>
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-ink-100">
                    {streetTitleEs(street)}
                  </h4>
                  <CardRow cards={boardForStreet(street)} />
                </div>
                <ul className="space-y-1.5">
                  {actions.map((a) => (
                    <li key={`${a.order}-${a.action}-${a.playerId}`} className="text-sm text-ink-200 pl-3 border-l border-ink-700">
                      {actionLabelEs(a, bb, displayNameFor(a, names))}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {showdownPlayers.some((p) => p.showedCards) ? (
              <section>
                <h4 className="text-sm font-semibold text-ink-100 mb-2">Showdown</h4>
                <ul className="space-y-2">
                  {showdownPlayers.filter((p) => p.showedCards || (p.isHero && p.holeCards)).map((p) => (
                    <li key={p.playerId} className="flex items-center gap-3 text-sm text-ink-200 pl-3 border-l border-ink-700">
                      <span className="w-24 shrink-0">{displayNameForPlayer(p, names)}</span>
                      <CardRow cards={parseCardCodes(p.showedCards || p.holeCards)} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className={`text-sm font-semibold pt-1 ${win ? 'text-brand' : 'text-loss'}`}>
              Resultado: Vos {win ? 'ganaste' : 'perdiste'} {formatBB(netBB)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function HandsPage() {
  const { hands, isOwnData } = useAppData();
  const [selected, setSelected] = useState<KeyHand | null>(null);

  const { bigLosses, bigWins } = useMemo(() => {
    const losses = hands
      .filter((h) => resolveCategory(h) === 'BIG_LOSS')
      .sort((a, b) => handNetBB(a) - handNetBB(b))
      .slice(0, 15);
    const wins = hands
      .filter((h) => resolveCategory(h) === 'BIG_WIN')
      .sort((a, b) => handNetBB(b) - handNetBB(a))
      .slice(0, 15);
    return { bigLosses: losses, bigWins: wins };
  }, [hands]);

  if (!isOwnData) {
    return (
      <div className="card p-8 text-center space-y-3">
        <Lock className="h-8 w-8 text-ink-400 mx-auto" />
        <h2 className="font-display text-xl font-semibold">Solo vos podés ver esto</h2>
        <p className="text-sm text-ink-300">Las manos clave son privadas y no aparecen en el perfil público.</p>
      </div>
    );
  }

  const pctLabel = Math.round(DEFAULT_STACK_PCT_THRESHOLD * 100);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Spade}
        title="Manos clave"
        subtitle={`Privado — ≥${KEY_HAND_BB_THRESHOLD} BB o ≥${pctLabel}% del stack`}
      />

      <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-ink-200 flex items-start gap-2">
        <Lock className="h-4 w-4 mt-0.5 text-gold flex-shrink-0" />
        Se guardan grandes pérdidas/ganancias: {KEY_HAND_BB_THRESHOLD}+ BB o {pctLabel}%+ del stack (o eliminación).
      </div>

      {bigLosses.length === 0 && bigWins.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-ink-100 font-medium">Todavía no hay manos clave</p>
          <p className="text-sm text-ink-300">
            Importá un TXT de historial de manos. Criterio: {KEY_HAND_BB_THRESHOLD}+ BB o {pctLabel}%+ del stack.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-loss flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Grandes pérdidas
            </h3>
            {bigLosses.length === 0 ? (
              <p className="text-sm text-ink-400">Sin grandes pérdidas</p>
            ) : (
              bigLosses.map((h) => (
                <HandRow key={h.id} hand={h} onOpen={() => setSelected(h)} />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-brand flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Grandes ganancias
            </h3>
            {bigWins.length === 0 ? (
              <p className="text-sm text-ink-400">Sin grandes ganancias</p>
            ) : (
              bigWins.map((h) => (
                <HandRow key={h.id} hand={h} onOpen={() => setSelected(h)} />
              ))
            )}
          </section>
        </div>
      )}

      {selected ? <HandDetailModal hand={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
