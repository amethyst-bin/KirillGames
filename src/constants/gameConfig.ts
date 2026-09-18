import type { SlotSymbol, PayLine, UserProfile } from '../types/game';

export const SYMBOLS: SlotSymbol[] = [
  {
    id: 'cherry',
    name: 'Вишенка',
    emoji: '🍒',
    color: '#ff3366',
    multiplier: 2,
    weight: 35,
  },
  {
    id: 'lemon',
    name: 'Лимон',
    emoji: '🍋',
    color: '#ffcc00',
    multiplier: 3,
    weight: 28,
  },
  {
    id: 'grape',
    name: 'Виноград',
    emoji: '🍇',
    color: '#a855f7',
    multiplier: 5,
    weight: 22,
  },
  {
    id: 'clover',
    name: 'Клевер',
    emoji: '🍀',
    color: '#22c55e',
    multiplier: 10,
    weight: 16,
  },
  {
    id: 'star',
    name: 'Звезда',
    emoji: '⭐',
    color: '#eab308',
    multiplier: 20,
    weight: 10,
  },
  {
    id: 'diamond',
    name: 'Алмаз',
    emoji: '💎',
    color: '#38bdf8',
    multiplier: 50,
    weight: 6,
  },
  {
    id: 'seven',
    name: 'Семёрка',
    emoji: '7️⃣',
    color: '#ef4444',
    multiplier: 100,
    weight: 3,
  },
];

export const PAYLINES: PayLine[] = [
  {
    id: 1,
    name: 'Центр',
    positions: [[0, 1], [1, 1], [2, 1]],
    color: '#f59e0b',
  },
  {
    id: 2,
    name: 'Верх',
    positions: [[0, 0], [1, 0], [2, 0]],
    color: '#3b82f6',
  },
  {
    id: 3,
    name: 'Низ',
    positions: [[0, 2], [1, 2], [2, 2]],
    color: '#10b981',
  },
  {
    id: 4,
    name: 'Диагональ ↘',
    positions: [[0, 0], [1, 1], [2, 2]],
    color: '#ec4899',
  },
  {
    id: 5,
    name: 'Диагональ ↗',
    positions: [[0, 2], [1, 1], [2, 0]],
    color: '#8b5cf6',
  },
];

export const BET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export const DEFAULT_PROFILE: UserProfile = {
  username: 'Игрок',
  avatar: '🦊',
  coins: 1000,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  biggestWin: 0,
  totalSpins: 0,
  lastBonusTime: 0,
};

export const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐱', '🦄', '🐯', '🐵'];
