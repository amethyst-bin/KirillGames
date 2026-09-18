import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Sparkles, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SweetRushGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface CandyDef {
  id: string;
  emoji: string;
  name: string;
  bg: string;
  border: string;
  baseMultiplier: number;
}

const CANDIES: CandyDef[] = [
  { id: 'strawberry', emoji: '🍓', name: 'Клубника', bg: 'from-rose-500 to-red-600', border: 'border-rose-400', baseMultiplier: 0.6 },
  { id: 'grape', emoji: '🍇', name: 'Виноград', bg: 'from-purple-500 to-indigo-600', border: 'border-purple-400', baseMultiplier: 0.8 },
  { id: 'orange', emoji: '🍊', name: 'Апельсин', bg: 'from-amber-400 to-orange-500', border: 'border-amber-300', baseMultiplier: 1.0 },
  { id: 'candy', emoji: '🍬', name: 'Карамель', bg: 'from-cyan-400 to-blue-500', border: 'border-cyan-300', baseMultiplier: 1.5 },
  { id: 'lollipop', emoji: '🍭', name: 'Чупа-чупс', bg: 'from-pink-400 to-rose-500', border: 'border-pink-300', baseMultiplier: 2.0 },
  { id: 'heart', emoji: '💖', name: 'Сердце', bg: 'from-red-400 to-pink-600', border: 'border-red-300', baseMultiplier: 3.5 },
];

const BOMB_MULTIPLIERS = [2, 3, 5, 10, 25, 50, 100];
const BET_OPTIONS = [50, 100, 250, 500, 1000, 2500, 5000];

interface CellData {
  uid: string;
  type: 'candy' | 'bomb';
  candyId?: string;
  bombMult?: number;
  popping?: boolean;
  isWinning?: boolean;
}

let uidCounter = 1;
const generateRandomCell = (allowBomb = true): CellData => {
  const isBomb = allowBomb && Math.random() < 0.05; // 5% chance per drop
  if (isBomb) {
    const mult = BOMB_MULTIPLIERS[Math.floor(Math.random() * BOMB_MULTIPLIERS.length)];
    return {
      uid: `bomb_${uidCounter++}_${Date.now()}`,
      type: 'bomb',
      bombMult: mult,
    };
  }
  const candy = CANDIES[Math.floor(Math.random() * CANDIES.length)];
  return {
    uid: `candy_${candy.id}_${uidCounter++}_${Date.now()}`,
    type: 'candy',
    candyId: candy.id,
  };
};

const createInitialGrid = (): CellData[][] => {
  const grid: CellData[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < 5; c++) {
      row.push(generateRandomCell(false));
    }
    grid.push(row);
  }
  return grid;
};

export const SweetRushGame: React.FC<SweetRushGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [bet, setBet] = useState<number>(100);
  const [grid, setGrid] = useState<CellData[][]>(createInitialGrid);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [roundWin, setRoundWin] = useState<number>(0);
  const [cascadeCount, setCascadeCount] = useState<number>(0);
  const [activeMultiplier, setActiveMultiplier] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<string>('Собери 4+ одинаковых сладости в кластер!');
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
    };
  }, []);

  // Check clusters of size >= 4
  const findClusters = (currentGrid: CellData[][]): { r: number; c: number }[][] => {
    const visited: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
    const clusters: { r: number; c: number }[][] = [];

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = currentGrid[r][c];
        if (visited[r][c] || cell.type !== 'candy' || !cell.candyId) continue;

        // BFS for matching candy
        const targetCandy = cell.candyId;
        const component: { r: number; c: number }[] = [];
        const queue: { r: number; c: number }[] = [{ r, c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          component.push(curr);

          const neighbors = [
            { r: curr.r - 1, c: curr.c },
            { r: curr.r + 1, c: curr.c },
            { r: curr.r, c: curr.c - 1 },
            { r: curr.r, c: curr.c + 1 },
          ];

          for (const nb of neighbors) {
            if (
              nb.r >= 0 && nb.r < 5 &&
              nb.c >= 0 && nb.c < 5 &&
              !visited[nb.r][nb.c] &&
              currentGrid[nb.r][nb.c].type === 'candy' &&
              currentGrid[nb.r][nb.c].candyId === targetCandy
            ) {
              visited[nb.r][nb.c] = true;
              queue.push(nb);
            }
          }
        }

        if (component.length >= 4) {
          clusters.push(component);
        }
      }
    }

    return clusters;
  };

  const handleSpin = async () => {
    if (isSpinning || isPlayingRef.current) return;
    if (!user || user.coins < bet) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    isPlayingRef.current = true;
    setIsSpinning(true);
    setRoundWin(0);
    setCascadeCount(0);
    setActiveMultiplier(1);
    setStatusMessage('Вращение барабанов...');

    soundManager.playSpinStart();

    // Generate fresh 5x5 board
    let currentGrid: CellData[][] = [];
    for (let r = 0; r < 5; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < 5; c++) {
        row.push(generateRandomCell(true));
      }
      currentGrid.push(row);
    }
    setGrid(currentGrid);

    await new Promise(r => setTimeout(r, 400));
    if (!isPlayingRef.current) return;

    let accumulatedWin = 0;
    let cascades = 0;

    // Loop cascades while clusters form
    while (isPlayingRef.current) {
      const clusters = findClusters(currentGrid);
      if (clusters.length === 0) break;

      cascades++;
      setCascadeCount(cascades);

      // Mark winning cells
      const popGrid = currentGrid.map(row => row.map(cell => ({ ...cell })));
      let cascadeWin = 0;

      for (const cluster of clusters) {
        const candyId = currentGrid[cluster[0].r][cluster[0].c].candyId;
        const candy = CANDIES.find(c => c.id === candyId);
        const base = candy ? candy.baseMultiplier : 1.0;

        let multiplierScale = 1.0;
        if (cluster.length === 4) multiplierScale = 1.0;
        else if (cluster.length === 5) multiplierScale = 1.5;
        else if (cluster.length === 6) multiplierScale = 2.2;
        else if (cluster.length >= 7 && cluster.length <= 8) multiplierScale = 3.5;
        else multiplierScale = 6.0;

        const clusterPayout = Math.round(bet * base * multiplierScale);
        cascadeWin += clusterPayout;

        for (const coord of cluster) {
          popGrid[coord.r][coord.c].popping = true;
          popGrid[coord.r][coord.c].isWinning = true;
        }
      }

      accumulatedWin += cascadeWin;
      setRoundWin(accumulatedWin);
      setGrid(popGrid);

      soundManager.playCandyPop();
      setStatusMessage(`Каскад #${cascades}: +${formatCoins(cascadeWin)} монет!`);

      await new Promise(r => setTimeout(r, 450));
      if (!isPlayingRef.current) return;

      // Drop columns & fill from top
      const nextGrid: CellData[][] = Array.from({ length: 5 }, () => Array(5));

      for (let c = 0; c < 5; c++) {
        const remaining: CellData[] = [];
        for (let r = 0; r < 5; r++) {
          if (!popGrid[r][c].popping) {
            remaining.push({
              ...popGrid[r][c],
              isWinning: false,
            });
          }
        }

        const needed = 5 - remaining.length;
        const newCells: CellData[] = [];
        for (let i = 0; i < needed; i++) {
          newCells.push(generateRandomCell(true));
        }

        const colCells = [...newCells, ...remaining];
        for (let r = 0; r < 5; r++) {
          nextGrid[r][c] = colCells[r];
        }
      }

      currentGrid = nextGrid;
      setGrid(currentGrid);

      await new Promise(r => setTimeout(r, 300));
    }

    // Check if bombs exist on board to multiply win
    let totalBombMult = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (currentGrid[r][c].type === 'bomb' && currentGrid[r][c].bombMult) {
          totalBombMult += currentGrid[r][c].bombMult!;
        }
      }
    }

    let finalWin = accumulatedWin;
    if (accumulatedWin > 0 && totalBombMult > 0) {
      soundManager.playBombExplode();
      setActiveMultiplier(totalBombMult);
      finalWin = accumulatedWin * totalBombMult;
      setRoundWin(finalWin);
      setStatusMessage(`💣 САХАРНЫЕ БОМБЫ x${totalBombMult}! КУШ: ${formatCoins(finalWin)}!`);
      await new Promise(r => setTimeout(r, 500));
    }

    // Finish spin
    if (finalWin > 0) {
      if (finalWin >= bet * 5) {
        soundManager.playBigWin();
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        soundManager.playWin();
      }
      setStatusMessage(`ВЫИГРЫШ: +${formatCoins(finalWin)} монет!`);
    } else {
      soundManager.playLoss();
      setStatusMessage('Нет совпадений. Попробуй ещё раз!');
    }

    try {
      const payoutMultiplier = finalWin > 0 ? Number((finalWin / bet).toFixed(2)) : 0;
      await recordGameResult('sweet_rush', bet, finalWin, payoutMultiplier);
    } catch (err) {
      console.error('Failed to sync sweet_rush result', err);
    }

    setIsSpinning(false);
    isPlayingRef.current = false;
  };

  return (
    <div className="w-full flex flex-col items-center max-w-md mx-auto px-2 py-2 select-none animate-fadeIn">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-2">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          disabled={isSpinning}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-purple-200 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> В лобби
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-950/80 to-purple-950/80 border border-pink-500/40">
          <span className="text-base">🍬</span>
          <span className="text-xs font-black text-pink-300 tracking-wider uppercase">Сладкий Куш</span>
        </div>

        <button
          onClick={onOpenBank}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black active:scale-95 transition-all"
        >
          🪙 {formatCoins(user?.coins || 0)}
        </button>
      </div>

      {/* Top Banner with Cascades & Win display */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-950 via-[#23093b] to-pink-950 border border-pink-500/30 shadow-md mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-pink-300/80 font-bold uppercase tracking-wider">
            {cascadeCount > 0 ? `Каскадов: ${cascadeCount}` : 'Сладости'}
          </span>
          <span className="text-xs text-white font-black truncate max-w-[200px]">
            {statusMessage}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-amber-300/80 font-bold uppercase">Выигрыш</span>
          <span className="text-base font-black text-amber-300 flex items-center gap-0.5">
            🪙 {formatCoins(roundWin)}
            {activeMultiplier > 1 && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-black animate-pulse">
                x{activeMultiplier}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 5x5 Sweet Grid */}
      <div className="relative w-full aspect-square max-w-[340px] p-2 rounded-3xl bg-gradient-to-b from-[#2a0845] to-[#170529] border-2 border-pink-500/50 shadow-2xl overflow-hidden flex flex-col justify-between">
        <div className="grid grid-cols-5 grid-rows-5 gap-1.5 w-full h-full">
          {grid.map((row) =>
            row.map((cell) => {
              if (cell.type === 'bomb') {
                return (
                  <div
                    key={cell.uid}
                    className="relative flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 border border-amber-300 shadow-md transform transition-all duration-200"
                  >
                    <span className="text-xl leading-none">💣</span>
                    <span className="text-[10px] font-black text-white px-1 rounded bg-black/60 leading-tight mt-0.5">
                      x{cell.bombMult}
                    </span>
                  </div>
                );
              }

              const candy = CANDIES.find(cd => cd.id === cell.candyId) || CANDIES[0];
              return (
                <div
                  key={cell.uid}
                  className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br ${candy.bg} border ${candy.border} shadow-sm transition-all duration-200 ${
                    cell.popping
                      ? 'scale-125 brightness-150 opacity-20'
                      : cell.isWinning
                      ? 'scale-105 ring-2 ring-amber-300 brightness-125'
                      : 'hover:scale-105 active:scale-95'
                  }`}
                >
                  <span className="text-2xl drop-shadow select-none">
                    {candy.emoji}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bet selector & Controls */}
      <div className="w-full mt-2 flex flex-col gap-2">
        {/* Quick Bet Chips */}
        <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
          {BET_OPTIONS.map((val) => (
            <button
              key={val}
              disabled={isSpinning}
              onClick={() => {
                soundManager.playClick();
                setBet(val);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                bet === val
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg scale-105 border border-pink-300'
                  : 'bg-purple-950/70 text-purple-300 border border-purple-500/30 active:scale-95'
              }`}
            >
              {formatCoins(val)}
            </button>
          ))}
        </div>

        {/* Spin Big Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-black text-lg tracking-wide uppercase shadow-xl flex items-center justify-center gap-2 border border-pink-300/40 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {isSpinning ? (
            <>
              <RotateCcw className="w-5 h-5 animate-spin" />
              Каскадный спин...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-200 fill-amber-200" />
              Крутить • {formatCoins(bet)}
            </>
          )}
        </button>

        {/* Paytable hint */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-pink-300/70 font-semibold text-center">
          <span>🍓 🍇 🍊 x1 - x3</span>
          <span>•</span>
          <span>🍬 🍭 💖 x2 - x6</span>
          <span>•</span>
          <span>💣 Бомбы до x100</span>
        </div>
      </div>
    </div>
  );
};
