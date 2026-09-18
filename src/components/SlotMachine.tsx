import React, { useState, useEffect, useRef } from 'react';
import type { SlotSymbol, WinResult } from '../types/game';
import { SYMBOLS, BET_AMOUNTS, PAYLINES } from '../constants/gameConfig';
import { generateRandomGrid, evaluateWins, getRandomSymbol } from '../utils/slotLogic';
import { soundManager } from '../audio/soundManager';
import { Play, RotateCw, Info, Flame } from 'lucide-react';

interface SlotMachineProps {
  coins: number;
  onSpendCoins: (amount: number) => boolean;
  onAddCoins: (amount: number) => void;
  onAddXP: (xp: number) => void;
  onRecordSpin: (winAmount: number) => void;
  onTriggerBigWin: (winAmount: number, multiplier: number) => void;
  onOpenBonusModal: () => void;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({
  coins,
  onSpendCoins,
  onAddCoins,
  onAddXP,
  onRecordSpin,
  onTriggerBigWin,
  onOpenBonusModal,
}) => {
  // Grid state: 3 reels, each has 3 visible symbols
  const [grid, setGrid] = useState<SlotSymbol[][]>(() => generateRandomGrid());
  
  // Spinning states per reel
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelSpinning, setReelSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [reelBounce, setReelBounce] = useState<[boolean, boolean, boolean]>([false, false, false]);

  // Current bet
  const [betIndex, setBetIndex] = useState(1); // default to 25
  const currentBet = BET_AMOUNTS[betIndex];

  // Results
  const [lastWins, setLastWins] = useState<WinResult[]>([]);
  const [totalWin, setTotalWin] = useState<number>(0);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);

  // Audio tick timer reference
  const tickIntervalRef = useRef<number | null>(null);
  const handleSpinRef = useRef<() => void>(() => {});

  // Auto spin loop
  useEffect(() => {
    let timer: number;
    if (isAutoSpin && !isSpinning) {
      if (coins >= currentBet) {
        timer = window.setTimeout(() => {
          handleSpinRef.current();
        }, 1200);
      } else {
        setIsAutoSpin(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isAutoSpin, isSpinning, coins, currentBet]);

  // Handle Bet changes
  const handleIncreaseBet = () => {
    soundManager.playClick();
    if (betIndex < BET_AMOUNTS.length - 1) {
      setBetIndex(betIndex + 1);
    }
  };

  const handleDecreaseBet = () => {
    soundManager.playClick();
    if (betIndex > 0) {
      setBetIndex(betIndex - 1);
    }
  };

  const handleMaxBet = () => {
    soundManager.playClick();
    setBetIndex(BET_AMOUNTS.length - 1);
  };

  // Spin Logic
  const handleSpin = () => {
    if (isSpinning) return;

    if (coins < currentBet) {
      soundManager.playClick();
      onOpenBonusModal();
      setIsAutoSpin(false);
      return;
    }

    const success = onSpendCoins(currentBet);
    if (!success) return;

    soundManager.playSpinStart();
    setIsSpinning(true);
    setLastWins([]);
    setTotalWin(0);
    setReelBounce([false, false, false]);
    setReelSpinning([true, true, true]);

    // Target final grid
    const finalGrid = generateRandomGrid();

    // Start reel tick audio & visual blur simulation
    tickIntervalRef.current = window.setInterval(() => {
      soundManager.playReelTick();
      setGrid([
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      ]);
    }, 90);

    // Staggered stop:
    // Reel 1: stops at 1000ms
    setTimeout(() => {
      soundManager.playReelStop(0);
      setReelSpinning((prev) => [false, prev[1], prev[2]]);
      setReelBounce((prev) => [true, prev[1], prev[2]]);
      setGrid((prev) => [finalGrid[0], prev[1], prev[2]]);
    }, 1000);

    // Reel 2: stops at 1450ms
    setTimeout(() => {
      soundManager.playReelStop(1);
      setReelSpinning((prev) => [prev[0], false, prev[2]]);
      setReelBounce((prev) => [prev[0], true, prev[2]]);
      setGrid((prev) => [finalGrid[0], finalGrid[1], prev[2]]);
    }, 1450);

    // Reel 3: stops at 1900ms (sweet anticipation)
    setTimeout(() => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }

      soundManager.playReelStop(2);
      setReelSpinning([false, false, false]);
      setReelBounce([true, true, true]);
      setGrid(finalGrid);
      setIsSpinning(false);

      // Evaluate outcomes
      const wins = evaluateWins(finalGrid, currentBet);
      const earnedXP = Math.max(5, Math.floor(currentBet / 2));
      onAddXP(earnedXP);

      if (wins.length > 0) {
        const winSum = wins.reduce((acc, w) => acc + w.winAmount, 0);
        const maxMult = Math.max(...wins.map((w) => w.symbol.multiplier));

        setLastWins(wins);
        setTotalWin(winSum);
        onAddCoins(winSum);
        onRecordSpin(winSum);

        if (maxMult >= 20 || winSum >= currentBet * 10) {
          onTriggerBigWin(winSum, maxMult);
        } else {
          soundManager.playWin();
        }
      } else {
        onRecordSpin(0);
      }
    }, 1900);
  };

  useEffect(() => {
    handleSpinRef.current = handleSpin;
  }, [handleSpin]);

  // Check if a cell is part of any winning payline
  const isCellWinning = (reelIdx: number, rowIdx: number) => {
    return lastWins.some((w) =>
      w.line.positions.some(([r, c]) => r === reelIdx && c === rowIdx)
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-3 py-2 gap-3">
      {/* Game Title & Paytable Button */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xl">🎰</span>
          <h2 className="text-base font-black text-amber-300 tracking-wider uppercase drop-shadow">
            Lucky Candy Slots
          </h2>
        </div>
        <button
          onClick={() => {
            soundManager.playClick();
            setShowPaytable(!showPaytable);
          }}
          className="cartoon-btn btn-purple px-2.5 py-1 text-[11px] flex items-center gap-1"
        >
          <Info className="w-3.5 h-3.5" /> Выплаты
        </button>
      </div>

      {/* Paytable Modal / Dropdown */}
      {showPaytable && (
        <div className="w-full bg-purple-950/90 border-2 border-purple-400/60 rounded-2xl p-3 text-xs animate-reel-land shadow-xl">
          <div className="font-extrabold text-amber-300 mb-2 uppercase text-center flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-amber-400" /> Множители за 3 в ряд
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SYMBOLS.map((sym) => (
              <div
                key={sym.id}
                className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{sym.emoji}</span>
                  <span className="font-bold text-purple-200">{sym.name}</span>
                </div>
                <span className="font-mono font-black text-amber-300">
                  x{sym.multiplier}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Slot Machine Frame */}
      <div className="relative w-full gold-frame p-3 sm:p-4 shadow-2xl flex flex-col items-center gap-3">
        {/* Top Decorative Lights */}
        <div className="flex items-center justify-center gap-3 w-full py-1">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
          <div className="w-3 h-3 rounded-full bg-amber-300 animate-pulse" />
          <div className="text-xs font-black tracking-widest text-amber-300 uppercase px-3 py-0.5 bg-black/50 rounded-full border border-amber-400/50">
            {totalWin > 0 ? (
              <span className="text-emerald-400 animate-bounce">ВЫИГРЫШ: +{totalWin}</span>
            ) : (
              '5 ЛИНИЙ ВЫПЛАТ'
            )}
          </div>
          <div className="w-3 h-3 rounded-full bg-amber-300 animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        {/* Reels Container: 3 Columns */}
        <div className="grid grid-cols-3 gap-2 w-full bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-950 p-2.5 rounded-2xl border-4 border-amber-400/80 shadow-inner overflow-hidden relative">
          {[0, 1, 2].map((reelIndex) => {
            const spinning = reelSpinning[reelIndex];
            const bouncing = reelBounce[reelIndex];

            return (
              <div
                key={reelIndex}
                className={`flex flex-col gap-2 bg-purple-900/40 rounded-xl p-1.5 border border-purple-400/30 overflow-hidden relative ${
                  bouncing ? 'animate-reel-land' : ''
                } ${spinning ? 'filter blur-[1px]' : ''}`}
              >
                {[0, 1, 2].map((rowIndex) => {
                  const symbol = grid[reelIndex][rowIndex];
                  const winning = isCellWinning(reelIndex, rowIndex);

                  return (
                    <div
                      key={rowIndex}
                      className={`relative flex flex-col items-center justify-center h-20 sm:h-22 rounded-xl transition-all duration-300 ${
                        winning
                          ? 'bg-gradient-to-br from-amber-400/50 to-yellow-500/50 border-3 border-amber-300 scale-105 shadow-[0_0_15px_rgba(250,204,21,0.8)] z-10'
                          : 'bg-black/30 border border-white/10'
                      }`}
                    >
                      <span className="text-4xl sm:text-5xl select-none filter drop-shadow-md">
                        {symbol.emoji}
                      </span>
                      <span className="text-[10px] font-extrabold text-purple-200 mt-0.5 tracking-tight opacity-80">
                        {symbol.name}
                      </span>

                      {/* Sparkle badge on win */}
                      {winning && (
                        <div className="absolute -top-1 -right-1 text-xs animate-spin">
                          ✨
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Win Alert Bar */}
        {lastWins.length > 0 && (
          <div className="w-full bg-gradient-to-r from-amber-500/20 via-emerald-500/30 to-amber-500/20 border border-emerald-400/50 rounded-xl py-1 px-3 text-center flex items-center justify-center gap-2">
            <span className="text-base">🎉</span>
            <span className="text-xs font-black text-emerald-300 uppercase">
              Линий с выигрышем: {lastWins.length}! +{totalWin} монет!
            </span>
          </div>
        )}

        {/* Controls: Bet Adjustments */}
        <div className="flex items-center justify-between w-full bg-purple-950/80 px-3 py-2 rounded-2xl border border-purple-400/40">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-purple-300 uppercase">
              Ставка
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={isSpinning || betIndex === 0}
                onClick={handleDecreaseBet}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90 disabled:opacity-40"
              >
                -
              </button>
              <span className="font-mono font-black text-amber-300 text-base min-w-[3rem] text-center">
                {currentBet}
              </span>
              <button
                disabled={isSpinning || betIndex === BET_AMOUNTS.length - 1}
                onClick={handleIncreaseBet}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Buttons: Max Bet & Auto Spin */}
          <div className="flex items-center gap-2">
            <button
              disabled={isSpinning}
              onClick={handleMaxBet}
              className="cartoon-btn btn-gold px-3 py-1.5 text-xs font-black"
            >
              МАКС
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setIsAutoSpin(!isAutoSpin);
              }}
              className={`cartoon-btn px-3 py-1.5 text-xs font-black ${
                isAutoSpin ? 'btn-red animate-pulse' : 'btn-purple'
              }`}
            >
              {isAutoSpin ? 'СТОП' : 'АВТО'}
            </button>
          </div>
        </div>

        {/* Big Juicy SPIN Button */}
        <button
          disabled={isSpinning}
          onClick={handleSpin}
          className="cartoon-btn btn-spin w-full py-4 text-xl tracking-wider flex items-center justify-center gap-2 shadow-xl"
        >
          {isSpinning ? (
            <>
              <RotateCw className="w-6 h-6 animate-spin" />
              <span>КРУТИМ...</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              <span>КРУТИТЬ ({currentBet} 🪙)</span>
            </>
          )}
        </button>
      </div>

      {/* Paylines Guide Diagram */}
      <div className="w-full flex items-center justify-around py-1 text-[11px] text-purple-300 font-bold bg-purple-950/40 rounded-xl border border-purple-400/20">
        {PAYLINES.map((pl) => (
          <div key={pl.id} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: pl.color }}
            />
            <span>{pl.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
