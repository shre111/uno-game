import { io, Socket } from 'socket.io-client';
import type { CardColor } from '../types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const jwtToken = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('uno-auth') ?? '{}')?.state?.jwtToken ?? ''
      : '';

    socket = io(SERVER_URL, {
      auth: { token: jwtToken },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

// Call this when a new JWT arrives so reconnections use the updated token
export function updateSocketAuth(jwtToken: string) {
  const s = getSocket();
  s.auth = { token: jwtToken };
}

export function connectSocket() {
  getSocket().connect();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// Typed emit helpers
export const emit = {
  createRoom: (username: string, avatar: string, variant = 'Classic', maxPlayers = 6) =>
    getSocket().emit('room:create', { username, avatar, variant, maxPlayers }),

  joinRoom: (roomCode: string, username: string, avatar: string) =>
    getSocket().emit('room:join', { code: roomCode, username, avatar }),

  leaveRoom: () => getSocket().emit('room:leave'),

  startGame: () => getSocket().emit('game:start'),

  playCard: (cardIndex: number, chosenColor?: CardColor) =>
    getSocket().emit('game:playCard', { cardIndex, chosenColor }),

  drawCard: () => getSocket().emit('game:drawCard'),

  callUNO: () => getSocket().emit('game:callUNO'),

  challengeUNO: () => getSocket().emit('game:challengeUNO'),

  sendChat: (message: string) => getSocket().emit('chat:send', { message }),
};
