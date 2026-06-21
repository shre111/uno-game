import { create } from 'zustand';

// Which bottom-right overlay is currently open. Only one at a time so the chat
// panel and the reactions tray never overlap.
export type OpenPanel = 'chat' | 'reactions' | null;

interface UiState {
  openPanel: OpenPanel;
  // True while the player is actively dragging a card. Mobile uses this to
  // hide the bottom action buttons so they don't obscure the card mid-drag.
  isDraggingCard: boolean;
  setOpenPanel: (p: OpenPanel) => void;
  togglePanel: (p: Exclude<OpenPanel, null>) => void;
  setIsDraggingCard: (v: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  openPanel: null,
  isDraggingCard: false,
  setOpenPanel: (openPanel) => set({ openPanel }),
  togglePanel: (p) => set((s) => ({ openPanel: s.openPanel === p ? null : p })),
  setIsDraggingCard: (isDraggingCard) => set({ isDraggingCard }),
}));
