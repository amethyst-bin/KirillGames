import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../services/api';
import type { UserData } from '../services/api';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  serverError: string | null;
  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => void;
  retryConnection: () => void;
  updateUser: (data: { username?: string; avatar?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  recordGameResult: (gameType: string, betAmount: number, winAmount: number, multiplier: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);

    const token = getToken();
    if (token) {
      try {
        const res = await api.getMe();
        setUser(res.user);
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      } catch (err: unknown) {
        console.error('Failed to get user with saved token:', err);
        clearToken();
      }
    }

    // No token saved -> Player needs to choose login, registration, or guest!
    setUser(null);
    setShowOnboarding(true);
    setIsLoading(false);
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
    setShowOnboarding(false);
  };

  const register = async (u: string, p: string) => {
    const res = await api.register(u, p);
    setToken(res.token);
    setUser(res.user);
    setShowOnboarding(false);
  };

  const guestLogin = async () => {
    const res = await api.guestLogin();
    setToken(res.token);
    setUser(res.user);
    setShowOnboarding(false);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setShowOnboarding(true);
  };

  const retryConnection = () => {
    initAuth();
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
        serverError,
        showOnboarding,
        setShowOnboarding,
        login,
        register,
        guestLogin,
        logout,
        retryConnection,
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
