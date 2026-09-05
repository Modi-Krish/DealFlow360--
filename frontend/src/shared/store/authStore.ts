import { create } from 'zustand';

interface AuthState {
  user: any | null;
  token: str | null;
  setAuth: (user: any, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));
