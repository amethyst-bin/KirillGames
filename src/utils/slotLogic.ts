import type { SlotSymbol, WinResult } from '../types/game';
import { SYMBOLS, PAYLINES } from '../constants/gameConfig';

// Total weight sum
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export function getRandomSymbol(): SlotSymbol {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    if (rand < s.weight) {
      return s;
    }
    rand -= s.weight;
  }
  return SYMBOLS[0];
}

// Generate random 3x3 grid: [reelIndex 0..2][rowIndex 0..2]
export function generateRandomGrid(): SlotSymbol[][] {
  const grid: SlotSymbol[][] = [];
  for (let reel = 0; reel < 3; reel++) {
    const reelSymbols: SlotSymbol[] = [];
    for (let row = 0; row < 3; row++) {
      reelSymbols.push(getRandomSymbol());
    }
    grid.push(reelSymbols);
  }
  return grid;
}

// Evaluate paylines
export function evaluateWins(grid: SlotSymbol[][], bet: number): WinResult[] {
  const wins: WinResult[] = [];

  for (const line of PAYLINES) {
    const [p0, p1, p2] = line.positions;
    const sym0 = grid[p0[0]][p0[1]];
    const sym1 = grid[p1[0]][p1[1]];
    const sym2 = grid[p2[0]][p2[1]];

    // Check 3 of a kind
    if (sym0.id === sym1.id && sym1.id === sym2.id) {
      const winAmount = bet * sym0.multiplier;
      wins.push({
        line,
        symbol: sym0,
        winAmount,
      });
    }
  }

  return wins;
}
