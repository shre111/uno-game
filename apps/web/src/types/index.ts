export type { Card, CardColor, CardValue, PersonalizedGameState, PersonalizedPlayerState, LastAction, HouseRules } from '@uno-game/game-logic';

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
  variant?: string;
  players: RoomPlayer[];
  maxPlayers: number;
  settings: { maxPlayers: number; private: boolean; turnDuration: number };
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
