import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SYMBOLS, BET_AMOUNTS, PAYLINES } from '../constants/gameConfig';
import { generateRandomGrid, evaluateWins, getRandomSymbol } from '../utils/slotLogic';
import type { SlotSymbol, WinResult } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Play, RotateCw, Info, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SlotsGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

export const SlotsGame: React.FC<SlotsGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [grid, setGrid] = useState<SlotSymbol[][]>(() => generateRandomGrid());
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelSpinning, setReelSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [betIndex, setBetIndex] = useState(1);
  const currentBet = BET_AMOUNTS[betIndex];

  const [lastWins, setLastWins] = useState<WinResult[]>([]);
  const [totalWin, setTotalWin] = useState<number>(0);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);

  const tickRef = useRef<number | null>(null);
  const handleSpinRef = useRef<() => void>(() => {});

  useEffect(() => {
    let timer: number;
    if (isAutoSpin && !isSpinning) {
      if (user && user.coins >= currentBet) {
        timer = window.setTimeout(() => {
          handleSpinRef.current();
        }, 1200);
      } else {
        setIsAutoSpin(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isAutoSpin, isSpinning, user?.coins, currentBet]);

  const handleSpin = () => {
    if (isSpinning || !user) return;
    if (user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      setIsAutoSpin(false);
      return;
    }

    soundManager.playSpinStart();
    setIsSpinning(true);
    setLastWins([]);
    setTotalWin(0);
    setReelSpinning([true, true, true]);

    const finalGrid = generateRandomGrid();

    // Fast symbol cycling without heavy re-renders
    tickRef.current = window.setInterval(() => {
      soundManager.playReelTick();
      setGrid([
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      ]);
    }, 100);

    // Staggered stop
    setTimeout(() => {
      soundManager.playReelStop(0);
      setReelSpinning((prev) => [false, prev[1], prev[2]]);
      setGrid((prev) => [finalGrid[0], prev[1], prev[2]]);
    }, 800);

    setTimeout(() => {
      soundManager.playReelStop(1);
      setReelSpinning((prev) => [prev[0], false, prev[2]]);
      setGrid((prev) => [finalGrid[0], finalGrid[1], prev[2]]);
    }, 1200);

    setTimeout(() => {
      if (tickRef.current) clearInterval(tickRef.current);
      soundManager.playReelStop(2);
      setReelSpinning([false, false, false]);
      setGrid(finalGrid);
      setIsSpinning(false);

      const wins = evaluateWins(finalGrid, currentBet);
      if (wins.length > 0) {
        const winSum = wins.reduce((acc, w) => acc + w.winAmount, 0);
        const maxMult = Math.max(...wins.map((w) => w.symbol.multiplier));

        setLastWins(wins);
        setTotalWin(winSum);
        soundManager.playWin();

        if (maxMult >= 20 || winSum >= currentBet * 10) {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        }

        recordGameResult('slots', currentBet, winSum, maxMult);
      } else {
        recordGameResult('slots', currentBet, 0, 0);
      }
    }, 1600);
  };

  useEffect(() => {
    handleSpinRef.current = handleSpin;
  }, [handleSpin]);

  const isWinning = (reelIdx: number, rowIdx: number) => {
    return lastWins.some((w) =>
      w.line.positions.some(([r, c]) => r === reelIdx && c === rowIdx)
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 px-3 py-1.5 rounded-full border border-purple-400/30 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
          Candy Slots
        </h2>

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

      {/* Paytable */}
      {showPaytable && (
        <div className="w-full bg-purple-950/95 border border-purple-400/50 rounded-2xl p-3 text-xs shadow-xl animate-fadeIn">
          <div className="font-extrabold text-amber-300 mb-2 uppercase text-center flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-amber-400" /> Таблица выплат за 3 в ряд
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SYMBOLS.map((sym) => (
              <div
                key={sym.id}
                className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{sym.emoji}</span>
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

      {/* Slot Machine Chassis */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-amber-400/70 p-3 shadow-xl flex flex-col items-center gap-3">
        {/* Win / Status banner */}
        <div className="w-full py-1 px-3 bg-black/50 rounded-full border border-amber-400/30 text-center text-xs font-black uppercase">
          {totalWin > 0 ? (
            <span className="text-emerald-400 animate-bounce">
              ВЫИГРЫШ: +{totalWin.toLocaleString('ru-RU')} 🪙
            </span>
          ) : (
            <span className="text-amber-300">5 ЛИНИЙ ВЫПЛАТ</span>
          )}
        </div>

        {/* 3 Reels */}
        <div className="grid grid-cols-3 gap-2 w-full bg-gradient-to-b from-[#1b0638] to-[#2a0d54] p-2 rounded-2xl border-2 border-purple-400/40">
          {[0, 1, 2].map((reelIdx) => (
            <div
              key={reelIdx}
              className={`flex flex-col gap-2 bg-black/30 rounded-xl p-1 border border-purple-500/20 ${
                reelSpinning[reelIdx] ? 'opacity-80' : ''
              }`}
            >
              {[0, 1, 2].map((rowIdx) => {
                const sym = grid[reelIdx][rowIdx];
                const win = isWinning(reelIdx, rowIdx);

                return (
                  <div
                    key={rowIdx}
                    className={`relative flex flex-col items-center justify-center h-20 rounded-xl transition-transform ${
                      win
                        ? 'bg-amber-400/30 border-2 border-amber-300 scale-105 z-10 shadow-md'
                        : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <span className="text-4xl select-none">{sym.emoji}</span>
                    <span className="text-[10px] font-bold text-purple-200 mt-0.5 opacity-80">
                      {sym.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full bg-purple-900/60 px-3 py-2 rounded-2xl border border-purple-400/30">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-purple-300 uppercase">Ставка</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={isSpinning || betIndex === 0}
                onClick={() => {
                  soundManager.playClick();
                  setBetIndex(betIndex - 1);
                }}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 disabled:opacity-40"
              >
                -
              </button>
              <span className="font-mono font-black text-amber-300 text-sm min-w-[2.5rem] text-center">
                {currentBet}
              </span>
              <button
                disabled={isSpinning || betIndex === BET_AMOUNTS.length - 1}
                onClick={() => {
                  soundManager.playClick();
                  setBetIndex(betIndex + 1);
                }}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isSpinning}
              onClick={() => {
                soundManager.playClick();
                setBetIndex(BET_AMOUNTS.length - 1);
              }}
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
                isAutoSpin ? 'btn-red' : 'btn-purple'
              }`}
            >
              {isAutoSpin ? 'СТОП' : 'АВТО'}
            </button>
          </div>
        </div>

        {/* SPIN Button */}
        <button
          disabled={isSpinning}
          onClick={handleSpin}
          className="cartoon-btn btn-spin w-full py-3.5 text-lg font-black tracking-wider flex items-center justify-center gap-2"
        >
          {isSpinning ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin" />
              <span>КРУТИМ...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>КРУТИТЬ ({currentBet} 🪙)</span>
            </>
          )}
        </button>
      </div>

      {/* Paylines overview */}
      <div className="w-full flex items-center justify-around py-1 text-[11px] text-purple-300 font-bold bg-purple-950/40 rounded-xl border border-purple-400/20">
        {PAYLINES.map((pl) => (
          <div key={pl.id} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.color }} />
            <span>{pl.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
