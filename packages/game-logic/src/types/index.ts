export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface PlayerState {
  token: string;
  username: string;
  avatar: string;
  hand: Card[];
  hasCalledUno: boolean;
  isConnected: boolean;
}

export type LastAction =
  | { type: 'play'; playerToken: string; card: Card; chosenColor?: CardColor }
  | { type: 'draw'; playerToken: string; count: number }
  | { type: 'uno'; playerToken: string }
  | { type: 'challenge'; challengerToken: string; penalizedToken: string; successful: boolean };

export interface GameState {
  roomCode: string;
  players: PlayerState[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPile: Card[];
  discardPile: Card[];
  topCard: Card;
  currentColor: CardColor;
  status: 'playing' | 'finished';
  winner?: string;
  pendingDrawCount: number;
  unoCallPending?: string;
  lastAction?: LastAction;
}

export interface PersonalizedPlayerState {
  token: string;
  username: string;
  avatar: string;
  handCount: number;
  hasCalledUno: boolean;
  isConnected: boolean;
}

export interface PersonalizedGameState {
  roomCode: string;
  players: PersonalizedPlayerState[];
  myHand: Card[];
  myToken: string;
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPileCount: number;
  topCard: Card;
  currentColor: CardColor;
  status: 'playing' | 'finished';
  winner?: string;
  pendingDrawCount: number;
  unoCallPending?: string;
  lastAction?: LastAction;
}
