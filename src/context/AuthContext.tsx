import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../services/api';
import type { UserData } from '../services/api';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => void;
  updateUser: (data: { username?: string; avatar?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  recordGameResult: (gameType: string, betAmount: number, winAmount: number, multiplier: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    const token = getToken();
    if (token) {
      try {
        const res = await api.getMe();
        setUser(res.user);
        setIsLoading(false);
        return;
      } catch {
        clearToken();
      }
    }

    // If no token or token expired, auto create/login as guest
    try {
      const res = await api.guestLogin();
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      console.error('Failed to init guest account:', e);
      // Fallback offline mock user
      setUser({
        id: 999,
        username: 'Игрок_Офлайн',
        avatar: '🦊',
        coins: 1000,
        level: 1,
        xp: 0,
        xp_to_next: 100,
        biggest_win: 0,
        time_spent_seconds: 0,
        games_played: 0,
        last_bonus_time: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Heartbeat every 30 seconds to track time spent
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      api.sendHeartbeat().catch(() => {});
      setUser((prev) => (prev ? { ...prev, time_spent_seconds: prev.time_spent_seconds + 30 } : null));
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const login = async (u: string, p: string) => {
    const res = await api.login(u, p);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (u: string, p: string) => {
    const res = await api.register(u, p);
    setToken(res.token);
    setUser(res.user);
  };

  const guestLogin = async () => {
    const res = await api.guestLogin();
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearToken();
    guestLogin();
  };

  const updateUser = async (data: { username?: string; avatar?: string }) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      // ignore
    }
  };

  const recordGameResult = async (gameType: string, betAmount: number, winAmount: number, multiplier: number) => {
    // Optimistic local update
    setUser((prev) => {
      if (!prev) return null;
      const net = winAmount - betAmount;
      return {
        ...prev,
        coins: Math.max(0, prev.coins + net),
        biggest_win: Math.max(prev.biggest_win, winAmount),
        games_played: prev.games_played + 1,
      };
    });

    try {
      const res = await api.recordGame(gameType, betAmount, winAmount, multiplier);
      setUser(res.user);
    } catch (err) {
      console.error('Failed to sync game result with server:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        guestLogin,
        logout,
        updateUser,
        refreshUser,
        recordGameResult,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
