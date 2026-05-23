import { create } from 'zustand';
import type { PersonalizedGameState, CardColor, Card } from '../types';
import type { RoomPayload, ChatMessage, GameEndResult } from '../types';

export interface LiveReaction {
  id: string;
  emoji: string;
  username: string;
  x: number; // horizontal spawn position, percent
}

interface GameStore {
  room: RoomPayload | null;
  gameState: PersonalizedGameState | null;
  chatMessages: ChatMessage[];
  pendingWildCard: { cardIndex: number; card: Card } | null;
  unoAlert: string | null;
  gameEndResult: GameEndResult | null;
  socketError: string | null;
  liveReactions: LiveReaction[];

  setRoom: (room: RoomPayload | null) => void;
  setGameState: (state: PersonalizedGameState) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setPendingWildCard: (data: { cardIndex: number; card: Card } | null) => void;
  setUnoAlert: (token: string | null) => void;
  setGameEndResult: (result: GameEndResult | null) => void;
  setSocketError: (msg: string | null) => void;
  addLiveReaction: (r: { emoji: string; username: string }) => void;
  removeLiveReaction: (id: string) => void;
  reset: () => void;
}

const initial = {
  room: null,
  gameState: null,
  chatMessages: [],
  pendingWildCard: null,
  unoAlert: null,
  gameEndResult: null,
  socketError: null,
  liveReactions: [],
};

export const useGameStore = create<GameStore>()((set) => ({
  ...initial,
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-199), msg] })),
  setPendingWildCard: (pendingWildCard) => set({ pendingWildCard }),
  setUnoAlert: (unoAlert) => set({ unoAlert }),
  setGameEndResult: (gameEndResult) => set({ gameEndResult }),
  setSocketError: (socketError) => set({ socketError }),
  addLiveReaction: ({ emoji, username }) =>
    set((s) => ({
      liveReactions: [
        ...s.liveReactions.slice(-24),
        { id: crypto.randomUUID(), emoji, username, x: 8 + Math.random() * 84 },
      ],
    })),
  removeLiveReaction: (id) =>
    set((s) => ({ liveReactions: s.liveReactions.filter((r) => r.id !== id) })),
  reset: () => set(initial),
}));

export type { CardColor };
