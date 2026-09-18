import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Play, RotateCw, Info, Sparkles, BookOpen, Flame, Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PharaohGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface SymbolDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  payouts: { [count: number]: number }; // multiplier of line bet (total bet / 10)
  minCount: number;
}

const PHARAOH_SYMBOLS: SymbolDef[] = [
  {
    id: 'book',
    name: 'Книга Ра',
    emoji: '📖',
    color: 'from-amber-500 to-yellow-300 text-amber-200 border-amber-400',
    payouts: { 3: 20, 4: 200, 5: 2000 }, // scatter pays (multiplied by line bet * 10 = total bet * 2, 20, 200)
    minCount: 3,
  },
  {
    id: 'pharaoh',
    name: 'Фараон',
    emoji: '👑',
    color: 'from-yellow-600 to-amber-400 text-yellow-100 border-yellow-300',
    payouts: { 2: 10, 3: 100, 4: 1000, 5: 5000 },
    minCount: 2,
  },
  {
    id: 'anubis',
    name: 'Анубис',
    emoji: '🐺',
    color: 'from-indigo-600 to-purple-400 text-indigo-100 border-indigo-400',
    payouts: { 2: 5, 3: 40, 4: 400, 5: 2000 },
    minCount: 2,
  },
  {
    id: 'horus',
    name: 'Гор',
    emoji: '🦅',
    color: 'from-cyan-600 to-blue-400 text-cyan-100 border-cyan-400',
    payouts: { 2: 5, 3: 30, 4: 150, 5: 750 },
    minCount: 2,
  },
  {
    id: 'scarab',
    name: 'Скарабей',
    emoji: '🪲',
    color: 'from-emerald-600 to-teal-400 text-emerald-100 border-emerald-400',
    payouts: { 2: 5, 3: 30, 4: 150, 5: 750 },
    minCount: 2,
  },
  {
    id: 'ace',
    name: 'Туз',
    emoji: '🅰️',
    color: 'from-red-600 to-rose-400 text-rose-100 border-rose-400',
    payouts: { 3: 10, 4: 40, 5: 150 },
    minCount: 3,
  },
  {
    id: 'king',
    name: 'Король',
    emoji: '🫅',
    color: 'from-purple-600 to-fuchsia-400 text-purple-100 border-purple-400',
    payouts: { 3: 10, 4: 40, 5: 150 },
    minCount: 3,
  },
  {
    id: 'queen',
    name: 'Дама',
    emoji: '👸',
    color: 'from-pink-600 to-rose-400 text-pink-100 border-pink-400',
    payouts: { 3: 5, 4: 25, 5: 100 },
    minCount: 3,
  },
  {
    id: 'jack',
    name: 'Валет',
    emoji: '🃑',
    color: 'from-blue-600 to-sky-400 text-blue-100 border-blue-400',
    payouts: { 3: 5, 4: 25, 5: 100 },
    minCount: 3,
  },
  {
    id: 'ten',
    name: '10',
    emoji: '🔟',
    color: 'from-amber-700 to-orange-500 text-amber-100 border-amber-500',
    payouts: { 3: 5, 4: 25, 5: 100 },
    minCount: 3,
  },
];

// 10 Standard Egyptian Paylines (row index 0..2 for each reel 0..4)
const PAYLINES = [
  [1, 1, 1, 1, 1], // Line 1: Center
  [0, 0, 0, 0, 0], // Line 2: Top
  [2, 2, 2, 2, 2], // Line 3: Bottom
  [0, 1, 2, 1, 0], // Line 4: V-shape
  [2, 1, 0, 1, 2], // Line 5: Inverted V
  [0, 0, 1, 2, 2], // Line 6: High to low slope
  [2, 2, 1, 0, 0], // Line 7: Low to high slope
  [1, 2, 2, 2, 1], // Line 8: Trough
  [1, 0, 0, 0, 1], // Line 9: Crest
  [0, 1, 0, 1, 0], // Line 10: Alternating
];

const BET_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function getRandomSymbol(): SymbolDef {
  const rand = Math.random();
  // Weighted distribution
  if (rand < 0.04) return PHARAOH_SYMBOLS[0]; // Book (Wild/Scatter) ~4%
  if (rand < 0.08) return PHARAOH_SYMBOLS[1]; // Pharaoh ~4%
  if (rand < 0.14) return PHARAOH_SYMBOLS[2]; // Anubis ~6%
  if (rand < 0.22) return PHARAOH_SYMBOLS[3]; // Horus ~8%
  if (rand < 0.30) return PHARAOH_SYMBOLS[4]; // Scarab ~8%
  if (rand < 0.44) return PHARAOH_SYMBOLS[5]; // Ace ~14%
  if (rand < 0.58) return PHARAOH_SYMBOLS[6]; // King ~14%
  if (rand < 0.72) return PHARAOH_SYMBOLS[7]; // Queen ~14%
  if (rand < 0.86) return PHARAOH_SYMBOLS[8]; // Jack ~14%
  return PHARAOH_SYMBOLS[9];                  // Ten ~14%
}

function generateGrid(): SymbolDef[][] {
  // 5 reels, 3 rows each -> grid[reelIndex][rowIndex]
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => getRandomSymbol())
  );
}

export const PharaohGame: React.FC<PharaohGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [grid, setGrid] = useState<SymbolDef[][]>(generateGrid);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoSpin, setIsAutoSpin] = useState(false);

  const [betIndex, setBetIndex] = useState(3); // 100 default
  const currentBet = BET_AMOUNTS[betIndex];
  const lineBet = Math.max(1, Math.floor(currentBet / 10));

  // Free Spins State
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [expandingSymbol, setExpandingSymbol] = useState<SymbolDef | null>(null);
  const [freeSpinsWinTotal, setFreeSpinsWinTotal] = useState(0);
  const [isExpanding, setIsExpanding] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);

  // Win info
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);

  const spinTimerRef = useRef<number | null>(null);
  const isSpinningRef = useRef(false);
  isSpinningRef.current = isSpinning;

  // Auto spin loop
  useEffect(() => {
    let timer: number;
    if (isAutoSpin && !isSpinning) {
      if (freeSpinsLeft > 0 || (user && user.coins >= currentBet)) {
        timer = window.setTimeout(() => {
          handleSpin();
        }, 1000);
      } else {
        setIsAutoSpin(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isAutoSpin, isSpinning, freeSpinsLeft, user?.coins, currentBet]);

  // Execute Spin
  const handleSpin = () => {
    if (isSpinningRef.current) return;
    const isFreeRound = freeSpinsLeft > 0;

    if (!isFreeRound && user && user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      setIsAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setWinningLines([]);
    setLastWinAmount(0);
    setIsExpanding(false);
    soundManager.playSpinStart();

    // Deduct bet if not free spins
    if (isFreeRound) {
      setFreeSpinsLeft((prev) => prev - 1);
    }

    setSpinningReels([true, true, true, true, true]);

    // Cycling animation
    spinTimerRef.current = window.setInterval(() => {
      soundManager.playReelTick();
      setGrid((prev) =>
        prev.map((reel, rIdx) =>
          spinningReels[rIdx] ? [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()] : reel
        )
      );
    }, 80);

    const finalGrid = generateGrid();

    // Staggered stop for 5 reels
    const stops = [600, 850, 1100, 1350, 1600];
    stops.forEach((delay, rIdx) => {
      setTimeout(() => {
        soundManager.playReelStop(rIdx % 3);
        setSpinningReels((prev) => {
          const next = [...prev];
          next[rIdx] = false;
          return next;
        });
        setGrid((prev) => {
          const next = [...prev];
          next[rIdx] = finalGrid[rIdx];
          return next;
        });

        // Final reel stopped
        if (rIdx === 4) {
          if (spinTimerRef.current) clearInterval(spinTimerRef.current);
          setGrid(finalGrid);
          evaluateResults(finalGrid, isFreeRound);
        }
      }, delay);
    });
  };

  const evaluateResults = (g: SymbolDef[][], isFreeRound: boolean) => {
    let totalWin = 0;
    const activeLines: number[] = [];

    // 1. Evaluate 10 standard paylines
    PAYLINES.forEach((line, lineIdx) => {
      // First symbol on reel 0
      const firstSym = g[0][line[0]];
      let matchSym = firstSym.id === 'book' ? null : firstSym;
      let matchCount = 1;

      for (let r = 1; r < 5; r++) {
        const currentSym = g[r][line[r]];
        if (currentSym.id === 'book') {
          // Book is Wild!
          matchCount++;
        } else if (!matchSym) {
          matchSym = currentSym;
          matchCount++;
        } else if (currentSym.id === matchSym.id) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchSym && matchCount >= matchSym.minCount) {
        const mult = matchSym.payouts[matchCount] || 0;
        if (mult > 0) {
          totalWin += mult * lineBet;
          activeLines.push(lineIdx);
        }
      }
    });

    // 2. Evaluate Scatter Books anywhere on screen
    let bookCount = 0;
    for (let r = 0; r < 5; r++) {
      for (let row = 0; row < 3; row++) {
        if (g[r][row].id === 'book') {
          bookCount++;
        }
      }
    }

    if (bookCount >= 3) {
      const scatterMult = bookCount === 3 ? 20 : bookCount === 4 ? 200 : 2000;
      totalWin += scatterMult * lineBet;
      soundManager.playBookOpen();

      // Trigger or retrigger Free Spins
      const addedSpins = 10;
      if (!expandingSymbol) {
        // Pick random non-book symbol
        const nonBooks = PHARAOH_SYMBOLS.filter((s) => s.id !== 'book');
        const picked = nonBooks[Math.floor(Math.random() * nonBooks.length)];
        setExpandingSymbol(picked);
        setShowBonusModal(true);
      }
      setFreeSpinsLeft((prev) => prev + addedSpins);
    }

    // 3. Free Spins Expanding Symbol Feature
    if (isFreeRound && expandingSymbol) {
      const reelsWithSpecial: number[] = [];
      for (let r = 0; r < 5; r++) {
        if (g[r].some((s) => s.id === expandingSymbol.id)) {
          reelsWithSpecial.push(r);
        }
      }

      if (reelsWithSpecial.length >= expandingSymbol.minCount) {
        // Expand reels with special symbol
        setTimeout(() => {
          setIsExpanding(true);
          soundManager.playEgyptianFanfare();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.5 },
          });

          // Special scatter payout on all 10 lines
          const expandMult = expandingSymbol.payouts[reelsWithSpecial.length] || 0;
          const expandWin = expandMult * lineBet * 10;
          totalWin += expandWin;

          finishRound(totalWin, activeLines, isFreeRound);
        }, 500);
        return;
      }
    }

    finishRound(totalWin, activeLines, isFreeRound);
  };

  const finishRound = (totalWin: number, activeLines: number[], isFreeRound: boolean) => {
    setWinningLines(activeLines);
    setLastWinAmount(totalWin);
    setIsSpinning(false);

    if (isFreeRound) {
      setFreeSpinsWinTotal((prev) => prev + totalWin);
    }

    if (totalWin > 0) {
      soundManager.playWin();
      if (totalWin >= currentBet * 5) {
        soundManager.playEgyptianFanfare();
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }

    // Sync with backend API
    const effectiveBet = isFreeRound ? 0 : currentBet;
    const mult = effectiveBet > 0 ? Number((totalWin / effectiveBet).toFixed(2)) : 1.0;
    recordGameResult('pharaoh_gold', effectiveBet, totalWin, mult);

    // If free spins exhausted, reset
    if (isFreeRound && freeSpinsLeft <= 1) {
      setTimeout(() => {
        setExpandingSymbol(null);
      }, 2000);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between px-3 py-2 animate-fadeIn select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-bold active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          В лобби
        </button>

        <div className="flex items-center gap-2">
          {freeSpinsLeft > 0 && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-600 to-yellow-500 text-purple-950 px-2.5 py-1 rounded-full text-xs font-black animate-pulse shadow-lg">
              <Sparkles className="w-3.5 h-3.5" />
              Фриспины: {freeSpinsLeft}
            </div>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              setShowPaytable(true);
            }}
            className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center hover:bg-amber-500/30 active:scale-90 transition-transform"
            title="Таблица выплат"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Free Spins Banner Info */}
      {freeSpinsLeft > 0 && expandingSymbol && (
        <div className="mt-2 w-full py-1 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-yellow-600/30 to-amber-600/30 border border-amber-400/50 flex items-center justify-between text-xs">
          <span className="text-amber-200 font-bold flex items-center gap-1">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Спец-символ:
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-amber-300/40">
            <span className="text-base">{expandingSymbol.emoji}</span>
            <span className="text-amber-300 font-black">{expandingSymbol.name}</span>
          </div>
          <span className="text-purple-200 text-[11px] font-mono font-bold">
            Выигрыш: +{formatCoins(freeSpinsWinTotal)} 🪙
          </span>
        </div>
      )}

      {/* 5x3 Egyptian Reel Grid */}
      <div className="relative my-auto w-full max-w-sm mx-auto rounded-3xl bg-gradient-to-b from-[#3a200a] via-[#1a0f05] to-[#0d0702] border-2 border-amber-500/60 p-2 shadow-2xl shadow-amber-600/20">
        {/* Ancient Egyptian Header trim */}
        <div className="w-full flex items-center justify-between px-2 pb-1 border-b border-amber-500/30 mb-1">
          <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-500" />
            ЗОЛОТО ФАРАОНА 5x3
          </span>
          <span className="text-[10px] font-black text-amber-300 font-mono">
            10 ЛИНИЙ
          </span>
        </div>

        {/* 5 Reels Container */}
        <div className="grid grid-cols-5 gap-1 bg-black/60 rounded-2xl p-1 border border-amber-600/40">
          {grid.map((reel, reelIdx) => {
            const isSpinningThis = spinningReels[reelIdx];
            const hasExpandingThis = isExpanding && expandingSymbol && reel.some((s) => s.id === expandingSymbol.id);

            return (
              <div
                key={reelIdx}
                className="flex flex-col gap-1 relative overflow-hidden rounded-xl bg-gradient-to-b from-[#201004] to-[#120802] border border-amber-500/20 p-0.5"
              >
                {reel.map((sym, rowIdx) => {
                  const displaySym = hasExpandingThis ? expandingSymbol : sym;

                  return (
                    <div
                      key={rowIdx}
                      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center border transition-all duration-200 ${
                        hasExpandingThis
                          ? 'bg-gradient-to-br from-amber-500/40 to-yellow-600/40 border-amber-300 ring-2 ring-amber-400/60 scale-105'
                          : displaySym.id === 'book'
                          ? 'bg-amber-950/60 border-amber-400 shadow-md'
                          : 'bg-[#180b03]/80 border-amber-500/20'
                      }`}
                    >
                      <span className={`text-2xl transition-transform ${isSpinningThis ? 'blur-[1px] scale-95' : 'scale-100'}`}>
                        {displaySym.emoji}
                      </span>
                      <span className="text-[9px] font-black font-mono text-amber-200/90 mt-0.5 leading-none">
                        {displaySym.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Win Status Ribbon */}
        <div className="w-full mt-2 py-1 px-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-amber-900/60 to-amber-950/60 border border-amber-500/30 flex items-center justify-between text-xs">
          <span className="text-purple-200 font-bold text-[11px]">
            {winningLines.length > 0 ? `Линий сыграло: ${winningLines.length}` : 'Сделай спин!'}
          </span>
          <span className="font-mono font-black text-amber-300 text-sm">
            {lastWinAmount > 0 ? `+${formatCoins(lastWinAmount)} 🪙` : '0 🪙'}
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full flex flex-col gap-2 mt-2">
        {/* Bet Selector */}
        <div className="flex items-center justify-between bg-black/40 border border-amber-500/30 rounded-2xl px-3 py-1.5">
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-200/70 font-bold uppercase">Общая ставка</span>
            <span className="font-mono font-black text-amber-300 text-sm">
              {formatCoins(currentBet)} 🪙
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={isSpinning || betIndex === 0 || freeSpinsLeft > 0}
              onClick={() => {
                soundManager.playClick();
                setBetIndex((prev) => Math.max(0, prev - 1));
              }}
              className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 text-white font-black text-base disabled:opacity-30 active:scale-95"
            >
              -
            </button>
            <button
              disabled={isSpinning || betIndex === BET_AMOUNTS.length - 1 || freeSpinsLeft > 0}
              onClick={() => {
                soundManager.playClick();
                setBetIndex((prev) => Math.min(BET_AMOUNTS.length - 1, prev + 1));
              }}
              className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 text-white font-black text-base disabled:opacity-30 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Action Buttons: Auto & Spin */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAutoSpin((prev) => !prev);
            }}
            disabled={isSpinning}
            className={`col-span-1 rounded-2xl border font-black text-xs flex flex-col items-center justify-center p-2 transition-all ${
              isAutoSpin
                ? 'bg-rose-600/40 border-rose-400 text-rose-200'
                : 'bg-purple-950/60 border-purple-500/30 text-purple-200 hover:bg-purple-900/60'
            }`}
          >
            <RotateCw className={`w-4 h-4 mb-0.5 ${isAutoSpin ? 'animate-spin' : ''}`} />
            {isAutoSpin ? 'Стоп' : 'Авто'}
          </button>

          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`col-span-3 py-3.5 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isSpinning
                ? 'bg-amber-600/50 text-purple-950 cursor-not-allowed'
                : freeSpinsLeft > 0
                ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-purple-950 shadow-amber-500/30 hover:brightness-110'
                : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-purple-950 shadow-amber-500/30 hover:brightness-110'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            {freeSpinsLeft > 0 ? `Фриспин (${freeSpinsLeft})` : 'КРУТИТЬ'}
          </button>
        </div>
      </div>

      {/* Bonus Trigger Modal */}
      {showBonusModal && expandingSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 animate-fadeIn">
          <div className="relative w-full max-w-xs rounded-3xl bg-gradient-to-b from-[#4a280b] via-[#241203] to-[#120801] border-2 border-amber-400 p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/30 border border-amber-300 flex items-center justify-center text-3xl shadow-lg -mt-9">
              📖
            </div>
            <h3 className="mt-3 text-xl font-black text-amber-300 uppercase tracking-wide">
              10 Фриспинов!
            </h3>
            <p className="text-xs text-amber-200/80 mt-1">
              Древняя книга выбрала священный расширяющийся символ:
            </p>

            <div className="my-4 p-3 rounded-2xl bg-black/60 border border-amber-400/50 flex items-center gap-3">
              <span className="text-4xl animate-bounce">{expandingSymbol.emoji}</span>
              <div className="flex flex-col text-left">
                <span className="text-base font-black text-amber-300">{expandingSymbol.name}</span>
                <span className="text-[10px] text-purple-200">Расширяется на весь барабан!</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                setShowBonusModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-purple-950 font-black text-sm shadow-md active:scale-95"
            >
              Начать Фриспины
            </button>
          </div>
        </div>
      )}

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-3 animate-fadeIn">
          <div className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#241203] via-[#1a0b02] to-[#100501] border border-amber-500/40 p-4 shadow-2xl no-scrollbar">
            <button
              onClick={() => {
                soundManager.playClick();
                setShowPaytable(false);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-amber-300 uppercase">
                Таблица выплат (10 Линий)
              </h3>
            </div>

            {/* Symbols Table */}
            <div className="flex flex-col gap-1.5 text-xs">
              {PHARAOH_SYMBOLS.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{s.emoji}</span>
                    <span className="font-bold text-white text-[11px]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-amber-300">
                    {s.id === 'book' ? (
                      <span>3+ Книги = 10 Фриспинов + Скаттер до x2000</span>
                    ) : (
                      Object.entries(s.payouts).map(([cnt, mul]) => (
                        <span key={cnt} className="bg-purple-950/60 px-1 py-0.5 rounded border border-purple-500/20">
                          {cnt}x: {mul}x
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200/90 leading-relaxed">
              💡 <strong>Книга Ра (📖)</strong> заменяет любые символы (Wild) и при выпадении 3+ штук запускает <strong>10 Фриспинов</strong> со случайным расширяющимся спец-символом!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
