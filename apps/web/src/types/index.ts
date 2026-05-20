export type { Card, CardColor, CardValue, PersonalizedGameState, PersonalizedPlayerState, LastAction } from '@uno-game/game-logic';

export interface RoomPlayer {
  token: string;
  username: string;
  avatar: string;
}

export interface RoomPayload {
  roomCode: string;
  players: RoomPlayer[];
  hostToken: string;
  status: string;
  maxPlayers?: number;
  variant?: string;
}

export interface ChatMessage {
  id: string;
  playerToken: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
}

export interface GameEndResult {
  winnerToken: string;
  winnerUsername: string;
  durationMs: number;
  players: Array<{ token: string; username: string; cardCount: number }>;
}

export interface HouseRules {
  stackDraw: boolean;
  jumpIn: boolean;
  forcePlay: boolean;
}
