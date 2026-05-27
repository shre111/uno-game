import { create } from 'zustand';

// Which bottom-right overlay is currently open. Only one at a time so the chat
// panel and the reactions tray never overlap.
export type OpenPanel = 'chat' | 'reactions' | null;

interface UiState {
  openPanel: OpenPanel;
  setOpenPanel: (p: OpenPanel) => void;
  togglePanel: (p: Exclude<OpenPanel, null>) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  openPanel: null,
  setOpenPanel: (openPanel) => set({ openPanel }),
  togglePanel: (p) => set((s) => ({ openPanel: s.openPanel === p ? null : p })),
}));
