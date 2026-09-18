export type SymbolId = 'cherry' | 'lemon' | 'grape' | 'clover' | 'star' | 'diamond' | 'seven';

export interface SlotSymbol {
  id: SymbolId;
  name: string;
  emoji: string;
  color: string;
  multiplier: number; // Multiplier for 3-of-a-kind
  weight: number; // For weighted random selection
}

export interface PayLine {
  id: number;
  name: string;
  positions: [number, number][]; // [reelIndex, rowIndex] for 3 positions
  color: string;
}

export interface WinResult {
  line: PayLine;
  symbol: SlotSymbol;
  winAmount: number;
}

export interface UserProfile {
  username: string;
  avatar: string;
  coins: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  biggestWin: number;
  totalSpins: number;
  lastBonusTime: number; // timestamp
}
