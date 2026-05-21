'use client';

import { useEffect } from 'react';
import { getSocket, connectSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { RoomPayload, ChatMessage, GameEndResult } from '../types';
import type { PersonalizedGameState } from '../types';

let registered = false;

export function useSocket() {
  const { setAuth } = useAuthStore();
  const { setRoom, setGameState, addChatMessage, setUnoAlert, setGameEndResult } = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    if (!registered) {
      registered = true;

      // Auth — server sends structured object now
      socket.on('auth:token', ({ token, username, avatar, jwtToken }: {
        token: string; username: string; avatar: string; jwtToken: string;
      }) => {
        setAuth(token, username, avatar, jwtToken);
      });

      // Room events
      socket.on('room:created', (payload: RoomPayload) => setRoom(payload));
      socket.on('room:updated', (payload: RoomPayload) => setRoom(payload));
      socket.on('room:left', () => setRoom(null));

      // Game events — server emits 'game:started' for initial state, 'game:stateUpdate' for moves
      socket.on('game:started', (state: PersonalizedGameState) => setGameState(state));
      socket.on('game:stateUpdate', (state: PersonalizedGameState) => setGameState(state));

      socket.on('game:unoCall', ({ playerToken }: { playerToken: string }) => {
        setUnoAlert(playerToken);
        setTimeout(() => setUnoAlert(null), 3000);
      });

      // Transform server GameEndPayload → client GameEndResult
      socket.on('game:ended', (result: {
        roomCode: string;
        winner: string;
        players: Array<{ token: string; username: string; position: number; handCount: number }>;
        duration: number;
      }) => {
        const winnerPlayer = result.players.find((p) => p.token === result.winner);
        const transformed: GameEndResult = {
          winnerToken: result.winner,
          winnerUsername: winnerPlayer?.username ?? 'Unknown',
          durationMs: result.duration * 1000,
          players: result.players.map((p) => ({
            token: p.token,
            username: p.username,
            cardCount: p.handCount,
          })),
        };
        setGameEndResult(transformed);
      });

      // Chat — server now sends playerToken; add client-side id
      socket.on('chat:message', (msg: Omit<ChatMessage, 'id'>) => {
        addChatMessage({ id: crypto.randomUUID(), ...msg });
      });
    }

    connectSocket();
  }, [setAuth, setRoom, setGameState, addChatMessage, setUnoAlert, setGameEndResult]);
}
