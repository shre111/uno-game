export type { Card, CardColor, CardValue, PersonalizedGameState, PersonalizedPlayerState, LastAction } from '@uno-game/game-logic';

export interface RoomPlayer {
  token: string;
  username: string;
  avatar: string;
  isHost: boolean;
}

export interface RoomPayload {
  code: string;
  host: string;
  status: string;
  players: RoomPlayer[];
  maxPlayers: number;
  settings: { maxPlayers: number; private: boolean };
}

export interface ChatMessage {
  id: string;
  playerToken: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: string;
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
