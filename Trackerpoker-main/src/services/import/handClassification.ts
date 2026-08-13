/** Clasificación de impacto de una mano (BB + % de stack). */

export interface HandData {
  handId: string;
  initialStack: number;
  finalStack: number;
  bigBlind: number;
  isEliminated?: boolean;
}

export type HandCategory =
  | 'BIG_LOSS'
  | 'BIG_WIN'
  | 'MINOR_LOSS'
  | 'MINOR_WIN'
  | 'NEUTRAL';

export interface ClassifiedHand extends HandData {
  netChips: number;
  netBB: number;
  /** Porcentaje del stack (ej. -30.5 = -30.5%). */
  pctChange: number;
  category: HandCategory;
}

/** Umbral en BB para gran pérdida / gran ganancia. */
export const DEFAULT_BB_THRESHOLD = 10;

/** Umbral de fracción de stack (0.30 = 30%). */
export const DEFAULT_STACK_PCT_THRESHOLD = 0.30;

export function isKeyHandCategory(category: HandCategory): boolean {
  return category === 'BIG_LOSS' || category === 'BIG_WIN';
}

/**
 * Clasifica una sola mano.
 * BIG_LOSS: eliminado | netBB <= -10 | pctChange <= -30%
 * BIG_WIN: netBB >= 10 | pctChange >= 30%
 */
export function classifyHand(
  hand: HandData,
  bbThreshold = DEFAULT_BB_THRESHOLD,
  pctThreshold = DEFAULT_STACK_PCT_THRESHOLD,
): ClassifiedHand {
  const { initialStack, finalStack, bigBlind, isEliminated = false } = hand;

  const netChips = finalStack - initialStack;
  const netBB = bigBlind > 0 ? netChips / bigBlind : 0;
  const pctFraction = initialStack > 0 ? netChips / initialStack : 0;

  let category: HandCategory = 'NEUTRAL';

  const busted = isEliminated || (finalStack <= 0 && initialStack > 0);

  if (busted || netBB <= -bbThreshold || pctFraction <= -pctThreshold) {
    category = 'BIG_LOSS';
  } else if (netBB >= bbThreshold || pctFraction >= pctThreshold) {
    category = 'BIG_WIN';
  } else if (netChips < 0) {
    category = 'MINOR_LOSS';
  } else if (netChips > 0) {
    category = 'MINOR_WIN';
  }

  return {
    ...hand,
    isEliminated: busted,
    netChips,
    netBB: Number(netBB.toFixed(2)),
    pctChange: Number((pctFraction * 100).toFixed(1)),
    category,
  };
}

/**
 * Tops de grandes pérdidas / ganancias (mayor impacto primero).
 */
export function getHandHighlights(hands: HandData[], topLimit = 5) {
  const classifiedHands = hands.map((hand) => classifyHand(hand));

  const bigLosses = classifiedHands
    .filter((h) => h.category === 'BIG_LOSS')
    .sort((a, b) => a.netChips - b.netChips)
    .slice(0, topLimit);

  const bigWins = classifiedHands
    .filter((h) => h.category === 'BIG_WIN')
    .sort((a, b) => b.netChips - a.netChips)
    .slice(0, topLimit);

  return { bigLosses, bigWins, allClassified: classifiedHands };
}
