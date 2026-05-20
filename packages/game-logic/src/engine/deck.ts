import type { Card, CardColor, CardValue } from '../types';

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const SINGLE_PER_COLOR: CardValue[] = ['0'];
const DOUBLE_PER_COLOR: CardValue[] = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'skip', 'reverse', 'draw2',
];
const WILD_VALUES: CardValue[] = ['wild', 'wild4'];

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of COLORS) {
    for (const value of SINGLE_PER_COLOR) {
      cards.push({ id: `${color}_${value}_0`, color, value });
    }
    for (const value of DOUBLE_PER_COLOR) {
      cards.push({ id: `${color}_${value}_0`, color, value });
      cards.push({ id: `${color}_${value}_1`, color, value });
    }
  }

  for (const value of WILD_VALUES) {
    for (let i = 0; i < 4; i++) {
      cards.push({ id: `wild_${value}_${i}`, color: 'wild' as CardColor, value });
    }
  }

  return cards; // 108 cards
}

export function shuffle<T>(array: readonly T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function reshuffleDiscard(
  drawPile: Card[],
  discardPile: Card[],
): { drawPile: Card[]; discardPile: Card[] } {
  const top = discardPile[discardPile.length - 1]!;
  const toReshuffle = discardPile.slice(0, discardPile.length - 1);
  return {
    drawPile: [...drawPile, ...shuffle(toReshuffle)],
    discardPile: [top],
  };
}
