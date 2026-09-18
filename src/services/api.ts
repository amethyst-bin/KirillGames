export const API_BASE_URL = 'http://83.143.112.6';
export const WS_URL = 'ws://83.143.112.6/ws';

export interface UserData {
  id: number;
  username: string;
  avatar: string;
  coins: number;
  level: number;
  xp: number;
  xp_to_next: number;
  biggest_win: number;
  time_spent_seconds: number;
  games_played: number;
  last_bonus_time: number;
  telegram_id?: string | null;
  telegram_username?: string | null;
  created_at?: string;
}

export function getToken(): string | null {
  return localStorage.getItem('kirillgames_token');
}

export function setToken(token: string) {
  localStorage.setItem('kirillgames_token', token);
}

export function clearToken() {
  localStorage.removeItem('kirillgames_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Ошибка сервера (${res.status})`);
    }

    return data as T;
  } catch (err: unknown) {
    const msg = (err as Error).message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error('Не удалось связаться с сервером. Проверьте интернет-соединение!');
    }
    throw err;
  }
}

export const api = {
  health: () => request<{ status: string }>('/api/health'),

  register: (username: string, password: string) =>
    request<{ token: string; user: UserData }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: UserData }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  guestLogin: () =>
    request<{ token: string; user: UserData }>('/api/auth/guest', {
      method: 'POST',
    }),

  getMe: () => request<{ user: UserData }>('/api/profile/me'),

  updateProfile: (data: { username?: string; avatar?: string }) =>
    request<{ user: UserData }>('/api/profile/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserProfile: (userId: number) =>
    request<{ user: UserData }>(`/api/profile/${userId}`),

  sendHeartbeat: () =>
    request<{ status: string }>('/api/profile/heartbeat', {
      method: 'POST',
    }),

  getLeaderboard: () =>
    request<{ topCoins: UserData[]; topWinners: UserData[] }>('/api/leaderboard'),

  claimBonus: () =>
    request<{ reward: number; user: UserData }>('/api/economy/bonus', {
      method: 'POST',
    }),

  claimFaucet: () =>
    request<{ grant: number; user: UserData }>('/api/economy/faucet', {
      method: 'POST',
    }),

  recordGame: (gameType: string, betAmount: number, winAmount: number, multiplier: number) =>
    request<{ user: UserData }>('/api/games/record', {
      method: 'POST',
      body: JSON.stringify({ gameType, betAmount, winAmount, multiplier }),
    }),

  getTelegramLinkCode: () =>
    request<{ code: string; botUsername: string; deepLink: string; expiresIn: number }>('/api/telegram/link-code', {
      method: 'POST',
    }),

  unlinkTelegram: () =>
    request<{ status: string }>('/api/telegram/unlink', {
      method: 'POST',
    }),
};
