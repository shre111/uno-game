import type { Card, CardColor } from '../types';
import { MERCY_DRAW_AMOUNTS } from '../constants';

export function isCardPlayable(
  card: Card,
  topCard: Card,
  currentColor: CardColor,
  pendingDrawCount = 0,
  opts?: { classicStack?: boolean },
): boolean {
  if (pendingDrawCount > 0) {
    // Classic stacking: any +2/+4 can be stacked onto the pending draw
    if (opts?.classicStack) {
      return card.value === 'draw2' || card.value === 'wild4';
    }
    // Mercy stacking: only draw cards of equal or higher value can be played
    const drawAmount = MERCY_DRAW_AMOUNTS[card.value] ?? 0;
    return drawAmount >= pendingDrawCount;
  }

  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function hasPlayableCard(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
  pendingDrawCount = 0,
  opts?: { classicStack?: boolean },
): boolean {
  return hand.some((c) => isCardPlayable(c, topCard, currentColor, pendingDrawCount, opts));
}

export function nextIndex(
  current: number,
  direction: 1 | -1,
  total: number,
  skip = false,
): number {
  const steps = skip ? 2 : 1;
  return ((current + direction * steps) % total + total) % total;
}

// Skip eliminated players when computing next index for Mercy
export function nextActiveIndex(
  current: number,
  direction: 1 | -1,
  total: number,
  eliminated: string[],
  tokens: string[],
  skip = false,
): number {
  let steps = skip ? 2 : 1;
  let next = current;
  while (steps > 0) {
    next = ((next + direction) % total + total) % total;
    while (eliminated.length > 0 && eliminated.includes(tokens[next]!)) {
      next = ((next + direction) % total + total) % total;
    }
    steps--;
  }
  return next;
}
