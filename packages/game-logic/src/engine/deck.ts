import type { Card, CardColor, CardValue } from '../types';

const LIGHT_COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const DARK_COLORS: CardColor[] = ['pink', 'orange', 'teal', 'purple'];

// ── Classic (108 cards) ──────────────────────────────────────────────────────

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of LIGHT_COLORS) {
    cards.push({ id: `${color}_0_0`, color, value: '0' });
    for (const value of ['1','2','3','4','5','6','7','8','9','skip','reverse','draw2'] as CardValue[]) {
      cards.push({ id: `${color}_${value}_0`, color, value });
      cards.push({ id: `${color}_${value}_1`, color, value });
    }
  }
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild_wild_${i}`, color: 'wild', value: 'wild' });
    cards.push({ id: `wild_wild4_${i}`, color: 'wild', value: 'wild4' });
  }

  return cards; // 108 cards
}

// ── Flip light side (112 cards) ──────────────────────────────────────────────
// Per color: 0×1, 1-9×2, draw1×2, skip×2, reverse×2, flip×1 = 26 cards × 4 = 104
// + wild×4 + wildDraw2×4 = 112

export function createFlipLightDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of LIGHT_COLORS) {
    cards.push({ id: `L_${color}_0_0`, color, value: '0' });
    for (const value of ['1','2','3','4','5','6','7','8','9'] as CardValue[]) {
      cards.push({ id: `L_${color}_${value}_0`, color, value });
      cards.push({ id: `L_${color}_${value}_1`, color, value });
    }
    for (const value of ['draw1', 'skip', 'reverse'] as CardValue[]) {
      cards.push({ id: `L_${color}_${value}_0`, color, value });
      cards.push({ id: `L_${color}_${value}_1`, color, value });
    }
    cards.push({ id: `L_${color}_flip_0`, color, value: 'flip' });
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `L_wild_wild_${i}`, color: 'wild', value: 'wild' });
    cards.push({ id: `L_wild_wildDraw2_${i}`, color: 'wild', value: 'wildDraw2' });
  }

  return cards; // 112 cards
}

// ── Flip dark side (112 cards) ───────────────────────────────────────────────
// Per color: 0×1, 1-9×2, draw5×2, skipAll×2, reverse×2, flip×1 = 26 cards × 4 = 104
// + wild×4 + wildDrawColor×4 = 112

export function createFlipDarkDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of DARK_COLORS) {
    cards.push({ id: `D_${color}_0_0`, color, value: '0' });
    for (const value of ['1','2','3','4','5','6','7','8','9'] as CardValue[]) {
      cards.push({ id: `D_${color}_${value}_0`, color, value });
      cards.push({ id: `D_${color}_${value}_1`, color, value });
    }
    for (const value of ['draw5', 'skipAll', 'reverse'] as CardValue[]) {
      cards.push({ id: `D_${color}_${value}_0`, color, value });
      cards.push({ id: `D_${color}_${value}_1`, color, value });
    }
    cards.push({ id: `D_${color}_flip_0`, color, value: 'flip' });
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `D_wild_wild_${i}`, color: 'wild', value: 'wild' });
    cards.push({ id: `D_wild_wildDrawColor_${i}`, color: 'wild', value: 'wildDrawColor' });
  }

  return cards; // 112 cards
}

// ── Mercy (Show 'Em No Mercy) deck ───────────────────────────────────────────
// Per color: 0×1, 1-9×2, skip×2, reverse×2, skipAll×1, draw2×2, discardAll×1 = 27 × 4 = 108
// + wild×4 + draw4×4 + draw6×3 + draw10×2 = 121 cards

export function createMercyDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of LIGHT_COLORS) {
    cards.push({ id: `M_${color}_0_0`, color, value: '0' });
    for (const value of ['1','2','3','4','5','6','7','8','9'] as CardValue[]) {
      cards.push({ id: `M_${color}_${value}_0`, color, value });
      cards.push({ id: `M_${color}_${value}_1`, color, value });
    }
    for (const value of ['skip', 'reverse', 'draw2'] as CardValue[]) {
      cards.push({ id: `M_${color}_${value}_0`, color, value });
      cards.push({ id: `M_${color}_${value}_1`, color, value });
    }
    cards.push({ id: `M_${color}_skipAll_0`, color, value: 'skipAll' });
    cards.push({ id: `M_${color}_discardAll_0`, color, value: 'discardAll' });
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `M_wild_wild_${i}`, color: 'wild', value: 'wild' });
    cards.push({ id: `M_wild_draw4_${i}`, color: 'wild', value: 'draw4' });
  }
  for (let i = 0; i < 3; i++) {
    cards.push({ id: `M_wild_draw6_${i}`, color: 'wild', value: 'draw6' });
  }
  for (let i = 0; i < 2; i++) {
    cards.push({ id: `M_wild_draw10_${i}`, color: 'wild', value: 'draw10' });
  }

  return cards; // 121 cards
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

// Keep for backwards compatibility
export function createFlipDeck(): Card[] {
  return createFlipLightDeck();
}
