import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  username: string | null;
  avatar: string | null;
  jwtToken: string | null;
  setAuth: (token: string, username: string, avatar: string, jwtToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      avatar: null,
      jwtToken: null,
      setAuth: (token, username, avatar, jwtToken) =>
        set({ token, username, avatar, jwtToken }),
      clearAuth: () => set({ token: null, username: null, avatar: null, jwtToken: null }),
    }),
    { name: 'uno-auth' },
  ),
);
