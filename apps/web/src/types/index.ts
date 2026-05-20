export type { Card, CardColor, CardValue, PersonalizedGameState, PersonalizedPlayerState, LastAction } from '@uno-game/game-logic';

export interface RoomPayload {
  roomCode: string;
  players: Array<{ token: string; username: string; avatar: string }>;
  hostToken: string;
  status: string;
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
