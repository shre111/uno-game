'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getSocket, connectSocket, updateSocketAuth } from '../lib/socket';
import { playMessagePop } from '../lib/sound';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { RoomPayload, ChatMessage, GameEndResult } from '../types';
import type { PersonalizedGameState } from '../types';

let registered = false;

export function useSocket() {
  const { setAuth } = useAuthStore();
  const {
    setRoom, setGameState, addChatMessage, setUnoAlert,
    setGameEndResult, setSocketError,
  } = useGameStore();

  const prevPlayerCountRef = useRef<number>(0);

  useEffect(() => {
    const socket = getSocket();

    if (!registered) {
      registered = true;

      socket.on('auth:token', ({ token, username, avatar, jwtToken }: {
        token: string; username: string; avatar: string; jwtToken: string;
      }) => {
        setAuth(token, username, avatar, jwtToken);
        updateSocketAuth(jwtToken);
      });

      socket.on('room:created', (payload: RoomPayload) => {
        setRoom(payload);
        prevPlayerCountRef.current = payload.players.length;
      });

      socket.on('room:updated', (payload: RoomPayload) => {
        const prev = prevPlayerCountRef.current;
        const next = payload.players.length;
        if (next > prev) {
          const newPlayer = payload.players[next - 1];
          toast(`${newPlayer?.avatar ?? ''} ${newPlayer?.username ?? 'Someone'} joined`);
        } else if (next < prev) {
          toast('A player left the room', { icon: '👋' });
        }
        prevPlayerCountRef.current = next;
        setRoom(payload);
      });

      socket.on('room:left', () => setRoom(null));

      socket.on('game:started', (state: PersonalizedGameState) => setGameState(state));

      socket.on('game:stateUpdate', (state: PersonalizedGameState) => setGameState(state));

      socket.on('game:challenged', ({ penalizedToken, successful }: { challengerToken: string; penalizedToken: string; successful: boolean }) => {
        const myToken = useAuthStore.getState().token;
        const gameState = useGameStore.getState().gameState;
        const penalizedName = gameState?.players.find((p) => p.token === penalizedToken)?.username ?? 'Someone';
        if (successful) {
          toast.error(`🚨 ${penalizedName} caught! +4 cards!`, { duration: 3000 });
        } else if (penalizedToken === myToken) {
          toast.error('😅 False catch — you draw 2 cards', { duration: 3000 });
        } else {
          toast(`😅 False catch — ${penalizedName} draws 2`, { duration: 3000 });
        }
      });

      socket.on('game:unoCall', ({ playerToken, username }: { playerToken: string; username: string }) => {
        // Grab token at call-time from store
        const myToken = useAuthStore.getState().token;
        setUnoAlert(playerToken);
        setTimeout(() => setUnoAlert(null), 3000);
        if (playerToken === myToken) {
          toast('🃏 You called UNO!', { duration: 2500 });
        } else {
          toast(`🃏 ${username} called UNO!`, { duration: 2500 });
        }
      });

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

      socket.on('chat:message', (msg: Omit<ChatMessage, 'id'>) => {
        addChatMessage({ id: crypto.randomUUID(), ...msg });
        // Pop sound for messages from other players (not your own)
        if (msg.playerToken !== useAuthStore.getState().token) {
          playMessagePop();
        }
      });

      socket.on('error', (err: { code: string; message: string }) => {
        const msg = err?.message ?? 'Something went wrong';
        setSocketError(msg);
        setTimeout(() => setSocketError(null), 4000);

        // Map specific error codes to user-friendly toasts
        if (err.code === 'HAS_PLAYABLE_CARD') {
          toast.warning('You have a playable card — play it!');
        } else if (err.code === 'CARD_NOT_PLAYABLE') {
          toast.error('That card cannot be played right now');
        } else if (err.code === 'NOT_YOUR_TURN') {
          toast.error('It\'s not your turn');
        } else if (err.code === 'FORGOT_UNO' || msg.toLowerCase().includes('uno')) {
          toast.error(`Penalty! ${msg}`);
        } else {
          toast.error(msg, { duration: 3500 });
        }
      });
    }

    connectSocket();
  }, [setAuth, setRoom, setGameState, addChatMessage, setUnoAlert, setGameEndResult, setSocketError]);
}
