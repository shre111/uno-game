import { create } from 'zustand';
import type { PersonalizedGameState, CardColor, Card } from '../types';
import type { RoomPayload, ChatMessage, GameEndResult } from '../types';

interface GameStore {
  room: RoomPayload | null;
  gameState: PersonalizedGameState | null;
  chatMessages: ChatMessage[];
  pendingWildCard: { cardIndex: number; card: Card } | null;
  unoAlert: string | null;
  gameEndResult: GameEndResult | null;

  setRoom: (room: RoomPayload | null) => void;
  setGameState: (state: PersonalizedGameState) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setPendingWildCard: (data: { cardIndex: number; card: Card } | null) => void;
  setUnoAlert: (token: string | null) => void;
  setGameEndResult: (result: GameEndResult | null) => void;
  reset: () => void;
}

const initial = {
  room: null,
  gameState: null,
  chatMessages: [],
  pendingWildCard: null,
  unoAlert: null,
  gameEndResult: null,
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
  reset: () => set(initial),
}));

export type { CardColor };
