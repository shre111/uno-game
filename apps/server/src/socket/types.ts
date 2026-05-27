import type { GuestPayload } from '../middleware/auth';
import type { CardColor, PersonalizedGameState, HouseRules } from '@uno-game/game-logic';

// ── Inbound event payloads ──────────────────────────────────────────────────

export interface CreateRoomData {
  username: string;
  avatar: string;
  variant?: string;
  maxPlayers?: number;
  private?: boolean;
  turnDuration?: number;
}

export interface JoinRoomData {
  code: string;
  username: string;
  avatar: string;
}

export interface PlayCardData {
  cardIndex: number;
  chosenColor?: CardColor;
}

export interface ChatData {
  message: string;
}

// ── Outbound event payloads ─────────────────────────────────────────────────

export interface RoomPlayerPayload {
  token: string;
  username: string;
  avatar: string;
  isHost: boolean;
}

export interface RoomPayload {
  code: string;
  host: string;
  status: string;
  variant: string;
  players: RoomPlayerPayload[];
  maxPlayers: number;
  settings: { maxPlayers: number; private: boolean; turnDuration: number };
}

export interface GameEndPayload {
  roomCode: string;
  winner: string;
  players: Array<{ token: string; username: string; position: number; handCount: number }>;
  duration: number;
}

export interface UnoCallPayload {
  playerToken: string;
  username: string;
}

export interface ChatMessagePayload {
  playerToken: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: string;
}

export interface SocketError {
  code: string;
  message: string;
}

// ── Typed Socket.io interfaces ──────────────────────────────────────────────

export interface ClientToServerEvents {
  'room:create': (data: CreateRoomData) => void;
  'room:join': (data: JoinRoomData) => void;
  'room:leave': () => void;
  'room:sync': (data: { code: string }) => void;
  'game:start': (data?: { houseRules?: HouseRules }) => void;
  'game:playCard': (data: PlayCardData) => void;
  'game:drawCard': () => void;
  'game:callUNO': () => void;
  'game:challengeUNO': (data?: { targetToken?: string }) => void;
  'chat:send': (data: ChatData) => void;
  'reaction:send': (data: { emoji: string }) => void;
  'voice:send': (data: { audio: ArrayBuffer; mime: string }) => void;
}

export interface ServerToClientEvents {
  'room:created': (room: RoomPayload) => void;
  'room:updated': (room: RoomPayload) => void;
  'game:started': (state: PersonalizedGameState) => void;
  'game:stateUpdate': (state: PersonalizedGameState) => void;
  'game:ended': (result: GameEndPayload) => void;
  'game:unoCall': (data: UnoCallPayload) => void;
  'game:challenged': (data: { challengerToken: string; penalizedToken: string; successful: boolean }) => void;
  'chat:message': (data: ChatMessagePayload) => void;
  'reaction:received': (data: { emoji: string; token: string; username: string }) => void;
  'voice:received': (data: { from: string; username: string; audio: ArrayBuffer; mime: string }) => void;
  'error': (error: SocketError) => void;
  'auth:token': (data: { token: string; username: string; avatar: string; jwtToken: string }) => void;
}

export interface SocketData {
  guest: GuestPayload;
  currentRoom?: string;
  newToken?: string;
  lastVoiceAt?: number;
}

// ── Convenience aliases ─────────────────────────────────────────────────────

import type { Server, Socket } from 'socket.io';

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
