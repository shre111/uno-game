import type { Card, CardColor, GameState, PersonalizedGameState, PlayerState, LastAction } from '../types';
import { createDeck, shuffle, reshuffleDiscard } from './deck';
import { isCardPlayable, nextIndex } from './rules';
import { HAND_SIZE, DRAW_PENALTY, DRAW_TWO_COUNT, WILD_FOUR_COUNT } from '../constants';

interface InitPlayer {
  token: string;
  username: string;
  avatar: string;
}

// Ensures the draw pile has at least `needed` cards, reshuffling discard if necessary.
function ensureDrawable(state: GameState, needed: number): GameState {
  if (state.drawPile.length >= needed) return state;
  if (state.discardPile.length <= 1) return state; // nothing to reshuffle
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

export const ClassicUNO = {
  createInitialState(initPlayers: InitPlayer[], roomCode: string): GameState {
    let deck = shuffle(createDeck());

    const players: PlayerState[] = initPlayers.map((p) => ({
      ...p,
      hand: deck.splice(0, HAND_SIZE),
      hasCalledUno: false,
      isConnected: true,
    }));

    // Starting card must not be Wild Draw Four
    let topCard!: Card;
    while (deck.length > 0) {
      const candidate = deck.shift()!;
      if (candidate.value !== 'wild4') { topCard = candidate; break; }
      deck.push(candidate);
    }

    return {
      roomCode,
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
        s = {
          ...s,
          currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length, true),
          lastAction: action,
        };
        break;
      }
      case 'reverse': {
        const newDir = (s.direction * -1) as 1 | -1;
        // With 2 players, reverse acts like skip
        const skipTurn = s.players.length === 2;
        s = {
          ...s,
          direction: newDir,
          currentPlayerIndex: nextIndex(pIdx, newDir, s.players.length, skipTurn),
          lastAction: action,
        };
        break;
      }
      case 'draw2': {
        const nextIdx = nextIndex(pIdx, s.direction, s.players.length);
        const { state: after, cards } = pullCards(s, DRAW_TWO_COUNT);
        s = {
          ...after,
          players: after.players.map((p, i) =>
            i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p,
          ),
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
          players: after.players.map((p, i) =>
            i === nextIdx ? { ...p, hand: [...p.hand, ...cards] } : p,
          ),
          currentPlayerIndex: nextIndex(nextIdx, after.direction, after.players.length),
          lastAction: action,
        };
        break;
      }
      default: {
        s = {
          ...s,
          currentPlayerIndex: nextIndex(pIdx, s.direction, s.players.length),
          lastAction: action,
        };
      }
    }

    return { state: s };
  },

  drawCard(
    state: GameState,
    playerToken: string,
  ): { state: GameState; drawnCards: Card[] } {
    const pIdx = state.players.findIndex((p) => p.token === playerToken);
    if (pIdx === -1 || pIdx !== state.currentPlayerIndex) return { state, drawnCards: [] };

    const { state: after, cards } = pullCards(state, 1);
    if (cards.length === 0) return { state, drawnCards: [] };

    const newState = patchPlayer(after, playerToken, {
      hand: [...state.players[pIdx]!.hand, ...cards],
    });

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
    return {
      ...patchPlayer(state, playerToken, { hasCalledUno: true }),
      lastAction: { type: 'uno', playerToken },
    };
  },

  challengeUNO(
    state: GameState,
    challengerToken: string,
  ): { state: GameState; penalized: boolean; penalizedToken: string } {
    // Find a player with exactly 1 card who has not called UNO
    const target = state.players.find(
      (p) => p.hand.length === 1 && !p.hasCalledUno && p.token !== challengerToken,
    );

    // If no valid target, challenger is penalised instead
    const victimToken = target ? target.token : challengerToken;
    const successful = Boolean(target);

    const { state: after, cards } = pullCards(state, DRAW_PENALTY);
    const victim = after.players.find((p) => p.token === victimToken)!;
    const penalizedState = patchPlayer(after, victimToken, {
      hand: [...victim.hand, ...cards],
    });

    return {
      state: {
        ...penalizedState,
        lastAction: { type: 'challenge', challengerToken, penalizedToken: victimToken, successful },
      },
      penalized: true,
      penalizedToken: victimToken,
    };
  },

  personalizeState(state: GameState, playerToken: string): PersonalizedGameState {
    return {
      roomCode: state.roomCode,
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
    };
  },
};
