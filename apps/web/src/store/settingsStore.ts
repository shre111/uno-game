import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  soundEnabled: boolean;
  volume: number; // 0..1
  voiceEnabled: boolean; // play incoming voice notes
  setSoundEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
  setVoiceEnabled: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      volume: 0.7,
      voiceEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
    }),
    { name: 'uno-settings' },
  ),
);
