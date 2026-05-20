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

      socket.on('auth:token', ({ token, username, avatar, jwtToken }: {
        token: string; username: string; avatar: string; jwtToken: string;
      }) => {
        setAuth(token, username, avatar, jwtToken);
      });

      socket.on('room:created', (payload: RoomPayload) => setRoom(payload));
      socket.on('room:joined', (payload: RoomPayload) => setRoom(payload));
      socket.on('room:updated', (payload: RoomPayload) => setRoom(payload));
      socket.on('room:left', () => setRoom(null));

      socket.on('game:stateUpdate', (state: PersonalizedGameState) => setGameState(state));

      socket.on('game:unoCall', ({ playerToken }: { playerToken: string }) => {
        setUnoAlert(playerToken);
        setTimeout(() => setUnoAlert(null), 3000);
      });

      socket.on('game:ended', (result: GameEndResult) => setGameEndResult(result));

      socket.on('chat:message', (msg: Omit<ChatMessage, 'id'> & { id?: string }) => {
        addChatMessage({ id: msg.id ?? crypto.randomUUID(), ...msg });
      });
    }

    connectSocket();

    return () => {
      // Keep socket connected across page navigations; only clean up on full unmount
    };
  }, [setAuth, setRoom, setGameState, addChatMessage, setUnoAlert, setGameEndResult]);
}
