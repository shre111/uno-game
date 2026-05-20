import type { Card, CardColor } from '../types';

export function isCardPlayable(
  card: Card,
  topCard: Card,
  currentColor: CardColor,
): boolean {
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function hasPlayableCard(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
): boolean {
  return hand.some((c) => isCardPlayable(c, topCard, currentColor));
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
