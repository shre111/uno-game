import type { Card, CardColor, GameState, PersonalizedGameState, PlayerState, LastAction } from '../types';
import {
  createDeck, createFlipLightDeck, createFlipDarkDeck, createMercyDeck,
  shuffle, reshuffleDiscard,
} from './deck';
import { isCardPlayable, hasPlayableCard, nextIndex, nextActiveIndex } from './rules';
import {
  HAND_SIZE, DRAW_PENALTY, DRAW_TWO_COUNT, WILD_FOUR_COUNT,
  FLIP_DRAW_ONE_COUNT, FLIP_DRAW_TWO_COUNT, FLIP_DRAW_FIVE_COUNT,
  MERCY_ELIMINATION_THRESHOLD, MERCY_DRAW_AMOUNTS,
} from '../constants';

interface InitPlayer {
  token: string;
  username: string;
  avatar: string;
}

function ensureDrawable(state: GameState, needed: number): GameState {
  if (state.drawPile.length >= needed) return state;
  if (state.discardPile.length <= 1) return state;
  const { drawPile, discardPile } = reshuffleDiscard(state.drawPile, state.discardPile);
  return { ...state, drawPile, discardPile };
}

function pullCards(state: GameState, count: number): { state: GameState; cards: Card[] } {
  const s = ensureDrawable(state, count);
  const cards = s.drawPile.slice(0, count);
  return { state: { ...s, drawPile: s.drawPile.slice(count) }, cards };
}

function patchPlayer(state: GameState, token: string, patch: Partial<PlayerState>): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.token === token ? { ...p, ...patch } : p)),
  };
}

function basePersonalize(state: GameState, playerToken: string): PersonalizedGameState {
  return {
    roomCode: state.roomCode,
    variant: state.variant,
    myToken: playerToken,
    myHand: state.players.find((p) => p.token === playerToken)?.hand ?? [],
    players: state.players.map((p) => ({
      token: p.token,
      username: p.username,
      avatar: p.avatar,
      handCount: p.hand.length,
      hasCalledUno: p.hasCalledUno,
      isConnected: p.isConnected,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    drawPileCount: state.drawPile.length,
    topCard: state.topCard,
    currentColor: state.currentColor,
    status: state.status,
    winner: state.winner,
    pendingDrawCount: state.pendingDrawCount,
    unoCallPending: state.unoCallPending,
    lastAction: state.lastAction,
    turnDuration: state.turnDuration,
    turnStartedAt: state.turnStartedAt,
  };
}

// ── ClassicUNO ────────────────────────────────────────────────────────────────

export const ClassicUNO = {
  createInitialState(initPlayers: InitPlayer[], roomCode: string): GameState {
    let deck = shuffle(createDeck());

    const players: PlayerState[] = initPlayers.map((p) => ({
      ...p,
      hand: deck.splice(0, HAND_SIZE),
      hasCalledUno: false,
      isConnected: true,
    }));

    let topCard!: Card;
    while (deck.length > 0) {
      const candidate = deck.shift()!;
      if (candidate.value !== 'wild4') { topCard = candidate; break; }
      deck.push(candidate);
    }

    return {
      roomCode,
      variant: 'Classic',
      players,
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: deck,
      discardPile: [topCard],
      topCard,
      currentColor: topCard.color === 'wild' ? 'red' : topCard.color,
      status: 'playing',
      pendingDrawCount: 0,
    };
  },

  playCard(
    state: GameState,
    playerToken: string,
    cardIndex: number,
    chosenColor?: CardColor,
  ): { state: GameState; error?: string } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1) return { state, error: 'PLAYER_NOT_FOUND' };
    if (pIdx !== state.currentPlayerIndex) return { state, error: 'NOT_YOUR_TURN' };

    const player = state.players[pIdx]!;
    const card = player.hand[cardIndex];
    if (!card) return { state, error: 'INVALID_CARD_INDEX' };
    if (!isCardPlayable(card, state.topCard, state.currentColor)) {
      return { state, error: 'CARD_NOT_PLAYABLE' };
    }

    const newHand = player.hand.filter((_, i) => i !== cardIndex);
    let s: GameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === pIdx ? { ...p, hand: newHand, hasCalledUno: false } : p,
      ),
      discardPile: [...state.discardPile, card],
      topCard: card,
      currentColor: card.color === 'wild' ? (chosenColor ?? 'red') : card.color,
    };

    if (newHand.length === 0) {
      return { state: { ...s, status: 'finished', winner: playerToken } };
    }

    const action: LastAction = {
      type: 'play',
      playerToken,
      card,
      ...(card.color === 'wild' ? { chosenColor: chosenColor ?? 'red' } : {}),
    };

    switch (card.value) {
      case 'skip': {
        s = { ...s, currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length, true), lastAction: action };
        break;
      }
      case 'reverse': {
        const newDir = (s.direction * -1) as 1 | -1;
        const skipTurn = s.players.length === 2;
        s = { ...s, direction: newDir, currentPlayerIndex: nextIndex(pIdx, newDir, s.players.length, skipTurn), lastAction: action };
        break;
      }
      case 'draw2': {
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        const { state: after, cards } = pullCards(s, DRAW_TWO_COUNT);
        s = {
          ...after,
          players: after.players.map((p, i) => i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p),
          currentPlayerIndex: nextIndex(nextIdx, after.direction, after.players.length),
          lastAction: action,
        };
        break;
      }
      case 'wild4': {
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        const { state: after, cards } = pullCards(s, WILD_FOUR_COUNT);
        s = {
          ...after,
          players: after.players.map((p, i) => i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p),
          currentPlayerIndex: nextIndex(nextIdx, after.direction, after.players.length),
          lastAction: action,
        };
        break;
      }
      default: {
        s = { ...s, currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length), lastAction: action };
      }
    }

    return { state: s };
  },

  drawCard(state: GameState, playerToken: string): { state: GameState; drawnCards: Card[] } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1 || pIdx !== state.currentPlayerIndex) return { state, drawnCards: [] };

    const { state: after, cards } = pullCards(state, 1);
    if (cards.length === 0) return { state, drawnCards: [] };

    const newState = patchPlayer(after, playerToken, { hand: [...state.players[pIdx]!.hand, ...cards] });

    return {
      state: {
        ...newState,
        currentPlayerIndex: nextIndex(pIdx, state.direction, state.players.length),
        lastAction: { type: 'draw', playerToken, count: 1 },
      },
      drawnCards: cards,
    };
  },

  callUNO(state: GameState, playerToken: string): GameState {
    if (!state.players.find((p) => p.token === playerToken)) return state;
    return { ...patchPlayer(state, playerToken, { hasCalledUno: true }), lastAction: { type: 'uno', playerToken } };
  },

  // Pass the turn to the next player without any action (used on turn timeout)
  forceSkipTurn(state: GameState): GameState {
    return {
      ...state,
      currentPlayerIndex: nextIndex(state.currentPlayerIndex, state.direction, state.players.length),
    };
  },

  challengeUNO(state: GameState, challengerToken: string): { state: GameState; penalized: boolean; penalizedToken: string } {
    const target = state.players.find(
      (p) => p.hand.length === 1 && !p.hasCalledUno && p.token !== challengerToken,
    );
    const victimToken = target ? target.token : challengerToken;
    const successful = Boolean(target);
    const penaltyCount = successful ? 4 : DRAW_PENALTY;

    const { state: after, cards } = pullCards(state, penaltyCount);
    const victim = after.players.find((p) => p.token === victimToken)!;
    const penalizedState = patchPlayer(after, victimToken, { hand: [...victim.hand, ...cards] });

    return {
      state: { ...penalizedState, lastAction: { type: 'challenge', challengerToken, penalizedToken: victimToken, successful } },
      penalized: true,
      penalizedToken: victimToken,
    };
  },

  personalizeState(state: GameState, playerToken: string): PersonalizedGameState {
    return basePersonalize(state, playerToken);
  },
};

// ── FlipUNO ───────────────────────────────────────────────────────────────────

export const FlipUNO = {
  createInitialState(initPlayers: InitPlayer[], roomCode: string): GameState {
    let lightDeck = shuffle(createFlipLightDeck());
    const darkDeck = shuffle(createFlipDarkDeck());

    const players: PlayerState[] = initPlayers.map((p) => ({
      ...p,
      hand: lightDeck.splice(0, HAND_SIZE),
      hasCalledUno: false,
      isConnected: true,
    }));

    // Starting card must not be wild or flip
    let topCard!: Card;
    while (lightDeck.length > 0) {
      const candidate = lightDeck.shift()!;
      if (candidate.color !== 'wild' && candidate.value !== 'flip') { topCard = candidate; break; }
      lightDeck.push(candidate);
    }

    return {
      roomCode,
      variant: 'Flip',
      side: 'light',
      players,
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: lightDeck,
      discardPile: [topCard],
      topCard,
      currentColor: topCard.color,
      status: 'playing',
      pendingDrawCount: 0,
      inactiveDrawPile: darkDeck,
      inactiveDiscardPile: [],
    };
  },

  playCard(
    state: GameState,
    playerToken: string,
    cardIndex: number,
    chosenColor?: CardColor,
  ): { state: GameState; error?: string } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1) return { state, error: 'PLAYER_NOT_FOUND' };
    if (pIdx !== state.currentPlayerIndex) return { state, error: 'NOT_YOUR_TURN' };

    const player = state.players[pIdx]!;
    const card = player.hand[cardIndex];
    if (!card) return { state, error: 'INVALID_CARD_INDEX' };
    if (!isCardPlayable(card, state.topCard, state.currentColor)) {
      return { state, error: 'CARD_NOT_PLAYABLE' };
    }

    const newHand = player.hand.filter((_, i) => i !== cardIndex);
    let s: GameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === pIdx ? { ...p, hand: newHand, hasCalledUno: false } : p,
      ),
      discardPile: [...state.discardPile, card],
      topCard: card,
      currentColor: card.color === 'wild' ? (chosenColor ?? (state.side === 'dark' ? 'pink' : 'red')) : card.color,
    };

    if (newHand.length === 0) {
      return { state: { ...s, status: 'finished', winner: playerToken } };
    }

    const action: LastAction = {
      type: 'play',
      playerToken,
      card,
      ...(card.color === 'wild' ? { chosenColor: chosenColor ?? (state.side === 'dark' ? 'pink' : 'red') } : {}),
    };

    switch (card.value) {
      case 'flip': {
        const newSide: 'light' | 'dark' = s.side === 'dark' ? 'light' : 'dark';

        // All current hands + draw pile → new inactive (shuffle together)
        const handsBack = s.players.flatMap((p) => p.hand);
        const newInactiveDrawPile = shuffle([...s.drawPile, ...handsBack]);
        const newInactiveDiscardPile = [...s.discardPile]; // includes the just-played flip card

        // New active piles come from previously inactive
        let newActiveDraw = [...(s.inactiveDrawPile ?? [])];
        let newActiveDiscard = [...(s.inactiveDiscardPile ?? [])];

        // Deal fresh hands to each player from new active draw pile
        const newPlayers = s.players.map((p) => {
          const count = p.hand.length;
          const newHand = newActiveDraw.splice(0, count);
          return { ...p, hand: newHand };
        });

        // Determine new top card
        let newTopCard: Card;
        let newCurrentColor: CardColor;

        if (newActiveDiscard.length > 0) {
          newTopCard = newActiveDiscard[newActiveDiscard.length - 1]!;
          newCurrentColor = (newTopCard.color === 'wild'
            ? (newSide === 'dark' ? 'pink' : 'red')
            : newTopCard.color) as CardColor;
        } else {
          // First time flipping to this side — seed a non-action starting card
          const seedIdx = newActiveDraw.findIndex(
            (c) => c.color !== 'wild' && c.value !== 'flip' && c.value !== 'wildDrawColor',
          );
          const si = seedIdx >= 0 ? seedIdx : 0;
          const [seedCard] = newActiveDraw.splice(si, 1);
          newTopCard = seedCard!;
          newActiveDiscard = [newTopCard];
          newCurrentColor = newTopCard.color as CardColor;
        }

        s = {
          ...s,
          side: newSide,
          players: newPlayers,
          drawPile: newActiveDraw,
          discardPile: newActiveDiscard,
          topCard: newTopCard,
          currentColor: newCurrentColor,
          inactiveDrawPile: newInactiveDrawPile,
          inactiveDiscardPile: newInactiveDiscardPile,
          wildDrawColorPending: undefined,
          currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length),
          lastAction: { type: 'flip', playerToken, newSide },
        };
        break;
      }

      case 'skip': {
        // Light side skip — skip next player
        s = { ...s, currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length, true), lastAction: action };
        break;
      }

      case 'skipAll': {
        // Dark side — everyone else skips, current player goes again
        s = { ...s, currentPlayerIndex: pIdx, lastAction: action };
        break;
      }

      case 'reverse': {
        const newDir = (s.direction * -1) as 1 | -1;
        const skipTurn = s.players.length === 2;
        s = { ...s, direction: newDir, currentPlayerIndex: nextIndex(pIdx, newDir, s.players.length, skipTurn), lastAction: action };
        break;
      }

      case 'draw1': {
        // Light side — next player draws 1 and skips
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        const { state: after, cards } = pullCards(s, FLIP_DRAW_ONE_COUNT);
        s = {
          ...after,
          players: after.players.map((p, i) => i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p),
          currentPlayerIndex: nextIndex(nextIdx, after.direction, after.players.length),
          lastAction: action,
        };
        break;
      }

      case 'wildDraw2': {
        // Light side wild — next player draws 2 and skips
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        const { state: after, cards } = pullCards(s, FLIP_DRAW_TWO_COUNT);
        s = {
          ...after,
          players: after.players.map((p, i) => i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p),
          currentPlayerIndex: nextIndex(nextIdx, after.direction, after.players.length),
          lastAction: action,
        };
        break;
      }

      case 'draw5': {
        // Dark side — next player draws 5 and skips
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        const { state: after, cards } = pullCards(s, FLIP_DRAW_FIVE_COUNT);
        s = {
          ...after,
          players: after.players.map((p, i) => i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p),
          currentPlayerIndex: nextIndex(nextIdx, after.direction, after.players.length),
          lastAction: action,
        };
        break;
      }

      case 'wildDrawColor': {
        // Dark side wild — next player draws until they get the chosen color
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        s = {
          ...s,
          wildDrawColorPending: chosenColor ?? 'pink',
          currentPlayerIndex: nextIdx,
          lastAction: action,
        };
        break;
      }

      default: {
        s = { ...s, currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length), lastAction: action };
      }
    }

    return { state: s };
  },

  drawCard(state: GameState, playerToken: string): { state: GameState; drawnCards: Card[] } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1 || pIdx !== state.currentPlayerIndex) return { state, drawnCards: [] };

    const player = state.players[pIdx]!;

    // Wild Draw Color: draw until matching color is found
    if (state.wildDrawColorPending) {
      const targetColor = state.wildDrawColorPending;
      let s = state;
      let currentHand = [...player.hand];
      const allDrawn: Card[] = [];

      let found = false;
      while (!found && (s.drawPile.length > 0 || s.discardPile.length > 1)) {
        const { state: after, cards } = pullCards(s, 1);
        if (cards.length === 0) break;
        s = after;
        allDrawn.push(...cards);
        currentHand = [...currentHand, ...cards];
        if (cards[0]!.color === targetColor || cards[0]!.color === 'wild') {
          found = true;
        }
      }

      return {
        state: {
          ...patchPlayer(s, playerToken, { hand: currentHand }),
          wildDrawColorPending: undefined,
          currentPlayerIndex: nextIndex(pIdx, state.direction, state.players.length),
          lastAction: { type: 'draw', playerToken, count: allDrawn.length },
        },
        drawnCards: allDrawn,
      };
    }

    // Regular draw
    const { state: after, cards } = pullCards(state, 1);
    if (cards.length === 0) return { state, drawnCards: [] };

    return {
      state: {
        ...patchPlayer(after, playerToken, { hand: [...player.hand, ...cards] }),
        currentPlayerIndex: nextIndex(pIdx, state.direction, state.players.length),
        lastAction: { type: 'draw', playerToken, count: 1 },
      },
      drawnCards: cards,
    };
  },

  callUNO: ClassicUNO.callUNO,
  challengeUNO: ClassicUNO.challengeUNO,
  forceSkipTurn: ClassicUNO.forceSkipTurn,

  personalizeState(state: GameState, playerToken: string): PersonalizedGameState {
    return {
      ...basePersonalize(state, playerToken),
      side: state.side ?? 'light',
      wildDrawColorPending: state.wildDrawColorPending,
    };
  },
};

// ── MercyUNO ──────────────────────────────────────────────────────────────────

function getMercyTokens(state: GameState) {
  return state.players.map((p) => p.token);
}

function nextMercyIndex(
  current: number,
  direction: 1 | -1,
  state: GameState,
  skip = false,
): number {
  return nextActiveIndex(
    current,
    direction,
    state.players.length,
    state.eliminated ?? [],
    getMercyTokens(state),
    skip,
  );
}

function checkElimination(state: GameState): GameState {
  const eliminated = [...(state.eliminated ?? [])];
  let s = state;

  for (const player of s.players) {
    if (!eliminated.includes(player.token) && player.hand.length >= MERCY_ELIMINATION_THRESHOLD) {
      eliminated.push(player.token);
      // Return their cards to the draw pile
      s = {
        ...s,
        drawPile: shuffle([...s.drawPile, ...player.hand]),
        players: s.players.map((p) =>
          p.token === player.token ? { ...p, hand: [] } : p,
        ),
      };
    }
  }

  // Check if only 1 active player remains
  const activePlayers = s.players.filter((p) => !eliminated.includes(p.token));
  if (activePlayers.length === 1) {
    return { ...s, eliminated, status: 'finished', winner: activePlayers[0]!.token };
  }

  return { ...s, eliminated };
}

export const MercyUNO = {
  createInitialState(initPlayers: InitPlayer[], roomCode: string): GameState {
    let deck = shuffle(createMercyDeck());

    const players: PlayerState[] = initPlayers.map((p) => ({
      ...p,
      hand: deck.splice(0, HAND_SIZE),
      hasCalledUno: false,
      isConnected: true,
    }));

    // Starting card: not wild, not draw card
    let topCard!: Card;
    while (deck.length > 0) {
      const candidate = deck.shift()!;
      if (candidate.color !== 'wild' && !MERCY_DRAW_AMOUNTS[candidate.value] && candidate.value !== 'skipAll' && candidate.value !== 'discardAll') {
        topCard = candidate;
        break;
      }
      deck.push(candidate);
    }

    return {
      roomCode,
      variant: 'Mercy',
      players,
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: deck,
      discardPile: [topCard],
      topCard,
      currentColor: topCard.color,
      status: 'playing',
      pendingDrawCount: 0,
      eliminated: [],
    };
  },

  playCard(
    state: GameState,
    playerToken: string,
    cardIndex: number,
    chosenColor?: CardColor,
  ): { state: GameState; error?: string } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1) return { state, error: 'PLAYER_NOT_FOUND' };
    if (pIdx !== state.currentPlayerIndex) return { state, error: 'NOT_YOUR_TURN' };
    // Skip eliminated players
    if ((state.eliminated ?? []).includes(playerToken)) return { state, error: 'PLAYER_ELIMINATED' };

    const player = state.players[pIdx]!;
    const card = player.hand[cardIndex];
    if (!card) return { state, error: 'INVALID_CARD_INDEX' };

    // Check playability with pending draw stacking
    if (!isCardPlayable(card, state.topCard, state.currentColor, state.pendingDrawCount)) {
      return { state, error: 'CARD_NOT_PLAYABLE' };
    }

    const newHand = player.hand.filter((_, i) => i !== cardIndex);
    let s: GameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === pIdx ? { ...p, hand: newHand, hasCalledUno: false } : p,
      ),
      discardPile: [...state.discardPile, card],
      topCard: card,
      currentColor: card.color === 'wild' ? (chosenColor ?? 'red') : card.color,
    };

    if (newHand.length === 0) {
      return { state: { ...s, status: 'finished', winner: playerToken } };
    }

    const action: LastAction = {
      type: 'play',
      playerToken,
      card,
      ...(card.color === 'wild' ? { chosenColor: chosenColor ?? 'red' } : {}),
    };

    switch (card.value) {
      case 'skip': {
        s = { ...s, currentPlayerIndex: nextMercyIndex(pIdx, s.direction, s, true), lastAction: action };
        break;
      }

      case 'skipAll': {
        // Current player goes again
        s = { ...s, currentPlayerIndex: pIdx, lastAction: action };
        break;
      }

      case 'reverse': {
        const newDir = (s.direction * -1) as 1 | -1;
        const activePlayers = s.players.filter((p) => !(s.eliminated ?? []).includes(p.token));
        const skipTurn = activePlayers.length === 2;
        s = { ...s, direction: newDir, currentPlayerIndex: nextMercyIndex(pIdx, newDir, { ...s, direction: newDir }, skipTurn), lastAction: action };
        break;
      }

      case 'draw2':
      case 'draw4':
      case 'draw6':
      case 'draw10': {
        const drawAmount = MERCY_DRAW_AMOUNTS[card.value]!;
        const newPendingDraw = s.pendingDrawCount + drawAmount;
        const nextIdx = nextMercyIndex(pIdx, s.direction, s);
        s = {
          ...s,
          pendingDrawCount: newPendingDraw,
          currentPlayerIndex: nextIdx,
          lastAction: action,
        };
        break;
      }

      case 'discardAll': {
        // Discard all cards of the same color from player's hand
        const discardColor = card.color;
        const toDiscard = newHand.filter((c) => c.color === discardColor);
        const remaining = newHand.filter((c) => c.color !== discardColor);

        s = {
          ...s,
          players: s.players.map((p, i) =>
            i === pIdx ? { ...p, hand: remaining } : p,
          ),
          discardPile: [...s.discardPile, ...toDiscard],
        };

        if (remaining.length === 0) {
          return { state: { ...s, status: 'finished', winner: playerToken } };
        }

        s = { ...s, currentPlayerIndex: nextMercyIndex(pIdx, s.direction, s), lastAction: action };
        break;
      }

      default: {
        s = { ...s, currentPlayerIndex: nextMercyIndex(pIdx, s.direction, s), lastAction: action };
      }
    }

    return { state: checkElimination(s) };
  },

  drawCard(state: GameState, playerToken: string): { state: GameState; drawnCards: Card[]; noAction?: boolean } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1 || pIdx !== state.currentPlayerIndex) return { state, drawnCards: [] };
    if ((state.eliminated ?? []).includes(playerToken)) return { state, drawnCards: [] };

    const player = state.players[pIdx]!;

    // Forced draw from pending (can't stack anymore)
    if (state.pendingDrawCount > 0) {
      const { state: after, cards } = pullCards(state, state.pendingDrawCount);
      const finalState = checkElimination({
        ...patchPlayer(after, playerToken, { hand: [...player.hand, ...cards] }),
        pendingDrawCount: 0,
        currentPlayerIndex: nextMercyIndex(pIdx, state.direction, after),
        lastAction: { type: 'draw', playerToken, count: cards.length },
      });
      return { state: finalState, drawnCards: cards };
    }

    // If player already has a playable card, they should not be drawing
    if (hasPlayableCard(player.hand, state.topCard, state.currentColor, 0)) {
      return { state, drawnCards: [], noAction: true };
    }

    // Draw until a playable card is found
    let s = state;
    let currentHand = [...player.hand];
    const allDrawn: Card[] = [];

    while (!hasPlayableCard(currentHand, s.topCard, s.currentColor, 0)) {
      const { state: after, cards } = pullCards(s, 1);
      if (cards.length === 0) break; // deck exhausted
      s = after;
      allDrawn.push(...cards);
      currentHand = [...currentHand, ...cards];
    }

    if (allDrawn.length === 0) {
      // Couldn't draw anything — shouldn't happen but advance turn to avoid sticking
      return {
        state: {
          ...state,
          currentPlayerIndex: nextMercyIndex(pIdx, state.direction, state),
          lastAction: { type: 'draw', playerToken, count: 0 },
        },
        drawnCards: [],
      };
    }

    // Keep turn with this player — they must now play the card they just drew
    return {
      state: checkElimination({
        ...patchPlayer(s, playerToken, { hand: currentHand }),
        lastAction: { type: 'draw', playerToken, count: allDrawn.length },
      }),
      drawnCards: allDrawn,
    };
  },

  callUNO: ClassicUNO.callUNO,
  challengeUNO: ClassicUNO.challengeUNO,

  forceSkipTurn(state: GameState): GameState {
    return {
      ...state,
      currentPlayerIndex: nextMercyIndex(state.currentPlayerIndex, state.direction, state),
    };
  },

  personalizeState(state: GameState, playerToken: string): PersonalizedGameState {
    return {
      ...basePersonalize(state, playerToken),
      eliminated: state.eliminated ?? [],
    };
  },
};
