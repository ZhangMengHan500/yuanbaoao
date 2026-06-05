import {create} from 'zustand';
import {User} from '../types';
import {authAPI} from '../services/api';
import {mmkvStorage} from '../services/mmkv';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({isLoading: true});
    try {
      const res: any = await authAPI.login({email, password});
      const {token, user} = res.data;
      mmkvStorage.setToken(token);
      mmkvStorage.setUser(user);
      set({token, user, isAuthenticated: true, isLoading: false});
    } catch (err) {
      set({isLoading: false});
      throw err;
    }
  },

  register: async (email, username, password) => {
    set({isLoading: true});
    try {
      // 如果 username 为空或 undefined，不传给后端（后端会自动从邮箱前缀生成）
      const payload: any = {email, password, confirmPassword: password};
      if (username && username.trim()) {
        payload.username = username.trim();
      }
      const res: any = await authAPI.register(payload);
      const {token, user} = res.data;
      mmkvStorage.setToken(token);
      mmkvStorage.setUser(user);
      set({token, user, isAuthenticated: true, isLoading: false});
    } catch (err) {
      set({isLoading: false});
      throw err;
    }
  },

  logout: () => {
    mmkvStorage.removeToken();
    mmkvStorage.removeUser();
    set({token: null, user: null, isAuthenticated: false});
  },

  restoreSession: () => {
    const token = mmkvStorage.getToken();
    const user = mmkvStorage.getUser();
    if (token && user) {
      set({token, user, isAuthenticated: true});
    }
  },
}));
