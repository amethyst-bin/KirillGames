import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Play, Sparkles, RotateCcw, Shuffle, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface KenoGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

// Multipliers table based on [selectedCount][hitCount]
const PAYTABLE: Record<number, Record<number, number>> = {
  1: { 1: 3.5 },
  2: { 1: 1.5, 2: 7.0 },
  3: { 2: 2.5, 3: 25.0 },
  4: { 2: 1.5, 3: 5.0, 4: 80.0 },
  5: { 2: 1.0, 3: 3.0, 4: 15.0, 5: 250.0 },
  6: { 3: 2.0, 4: 8.0, 5: 45.0, 6: 600.0 },
  7: { 3: 1.5, 4: 5.0, 5: 20.0, 6: 100.0, 7: 1200.0 },
  8: { 4: 4.0, 5: 12.0, 6: 50.0, 7: 300.0, 8: 2000.0 },
  9: { 4: 3.0, 5: 8.0, 6: 25.0, 7: 150.0, 8: 800.0, 9: 3500.0 },
  10: { 5: 5.0, 6: 15.0, 7: 60.0, 8: 200.0, 9: 1000.0, 10: 5000.0 },
};

const BET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

export const KenoGame: React.FC<KenoGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [betIndex, setBetIndex] = useState(1);
  const [resultMessage, setResultMessage] = useState<{ text: string; win: number; mult: number } | null>(null);

  const currentBet = BET_AMOUNTS[betIndex];

  const toggleNumber = (num: number) => {
    if (isDrawing) return;
    soundManager.playClick();
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= 10) return;
      setSelectedNumbers([...selectedNumbers, num]);
    }
    setResultMessage(null);
  };

  const handleQuickPick = (count: number = 5) => {
    if (isDrawing) return;
    soundManager.playClick();
    const nums: number[] = [];
    while (nums.length < count) {
      const r = Math.floor(Math.random() * 40) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums);
    setResultMessage(null);
  };

  const handleClear = () => {
    if (isDrawing) return;
    soundManager.playClick();
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setResultMessage(null);
  };

  const handleStartDraw = () => {
    if (isDrawing || !user) return;
    if (selectedNumbers.length === 0) {
      setResultMessage({ text: 'Выберите хотя бы 1 номер!', win: 0, mult: 0 });
      return;
    }
    if (user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    setIsDrawing(true);
    setDrawnNumbers([]);
    setResultMessage(null);

    // Generate 10 winning balls out of 40
    const pool = Array.from({ length: 40 }, (_, i) => i + 1);
    const winningBalls: number[] = [];
    while (winningBalls.length < 10) {
      const idx = Math.floor(Math.random() * pool.length);
      winningBalls.push(pool.splice(idx, 1)[0]);
    }

    // Stagger ball appearance
    let step = 0;
    const interval = setInterval(() => {
      if (step < winningBalls.length) {
        const ball = winningBalls[step];
        setDrawnNumbers((prev) => [...prev, ball]);

        if (selectedNumbers.includes(ball)) {
          soundManager.playCoin();
          soundManager.vibrate([20, 30, 20]);
        } else {
          soundManager.playReelTick();
        }
        step++;
      } else {
        clearInterval(interval);
        finalizeDraw(winningBalls);
      }
    }, 180);
  };

  const finalizeDraw = (balls: number[]) => {
    setIsDrawing(false);
    const hits = selectedNumbers.filter((n) => balls.includes(n)).length;
    const picks = selectedNumbers.length;
    const mult = PAYTABLE[picks]?.[hits] || 0;
    const winAmount = Math.floor(currentBet * mult);

    recordGameResult('keno', currentBet, winAmount, mult);

    if (winAmount > 0) {
      soundManager.playBigWin();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setResultMessage({
        text: `🎉 Совпадений: ${hits}/${picks}! Выигрыш: ${winAmount} 🪙 (x${mult})`,
        win: winAmount,
        mult,
      });
    } else {
      soundManager.playReelStop(0);
      setResultMessage({
        text: `Совпадений: ${hits}/${picks}. Попробуйте ещё раз!`,
        win: 0,
        mult: 0,
      });
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24">
      {/* Top Header */}
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

        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎟️</span> Кено 40
        </h2>

        <div className="bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 text-xs font-black text-amber-300">
          Выбрано: {selectedNumbers.length}/10
        </div>
      </div>

      {/* Drawn Balls Display Bar */}
      <div className="w-full rounded-2xl bg-black/40 border border-purple-400/30 p-2.5 flex flex-col gap-1.5 items-center">
        <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Выпавшие номера (10 шаров):
        </div>
        <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[36px]">
          {drawnNumbers.length === 0 ? (
            <span className="text-xs text-purple-300/60 font-bold italic">
              Нажмите «Старт», чтобы запустить барабан!
            </span>
          ) : (
            drawnNumbers.map((ball) => {
              const isHit = selectedNumbers.includes(ball);
              return (
                <div
                  key={ball}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-md animate-reel-land transition-all ${
                    isHit
                      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-purple-950 scale-110 border-2 border-white ring-2 ring-amber-300'
                      : 'bg-purple-800 text-white border border-purple-400/40'
                  }`}
                >
                  {ball}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 40 Numbers Grid */}
      <div className="w-full bg-purple-950/70 border border-purple-400/40 rounded-3xl p-3 shadow-xl">
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedNumbers.includes(num);
            const isDrawn = drawnNumbers.includes(num);
            const isMatch = isSelected && isDrawn;

            return (
              <button
                key={num}
                type="button"
                disabled={isDrawing}
                onClick={() => toggleNumber(num)}
                className={`h-9 rounded-xl font-black text-xs transition-all flex items-center justify-center select-none active:scale-90 ${
                  isMatch
                    ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-purple-950 border-2 border-white shadow-lg ring-2 ring-amber-400 scale-105 animate-pulse'
                    : isDrawn
                    ? 'bg-purple-800/80 text-purple-200 border border-purple-600'
                    : isSelected
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-purple-950 border border-emerald-200 shadow-md scale-102'
                    : 'bg-black/40 text-purple-200 hover:bg-purple-900/50 border border-purple-500/20'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Pick and Clear Toolbar */}
      <div className="w-full flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={isDrawing}
          onClick={() => handleQuickPick(5)}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 border border-purple-400/30 text-xs font-black text-purple-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40"
        >
          <Shuffle className="w-3.5 h-3.5 text-amber-400" /> Авто-выбор (5)
        </button>
        <button
          type="button"
          disabled={isDrawing}
          onClick={() => handleQuickPick(10)}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 border border-purple-400/30 text-xs font-black text-purple-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40"
        >
          <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Макс (10)
        </button>
        <button
          type="button"
          disabled={isDrawing || selectedNumbers.length === 0}
          onClick={handleClear}
          className="py-1.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-xs font-black text-rose-300 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Сброс
        </button>
      </div>

      {/* Result Message Banner */}
      {resultMessage && (
        <div
          className={`w-full p-2.5 rounded-2xl text-center text-xs font-black border animate-fadeIn ${
            resultMessage.win > 0
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
              : 'bg-purple-900/60 border-purple-400/40 text-purple-200'
          }`}
        >
          {resultMessage.text}
        </div>
      )}

      {/* Bet Controls & Action */}
      <div className="w-full bg-black/40 border border-purple-400/30 rounded-3xl p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-purple-200 uppercase">Ставка:</span>
          <div className="flex items-center gap-1.5">
            {BET_AMOUNTS.map((amt, idx) => (
              <button
                key={amt}
                type="button"
                disabled={isDrawing}
                onClick={() => {
                  soundManager.playClick();
                  setBetIndex(idx);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                  betIndex === idx
                    ? 'bg-amber-400 text-purple-950 shadow-md scale-105'
                    : 'bg-purple-900/50 text-purple-300 hover:text-white'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={isDrawing || selectedNumbers.length === 0}
          onClick={handleStartDraw}
          className="cartoon-btn btn-spin w-full py-3.5 text-base font-black flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          {isDrawing ? 'Крутим барабан...' : `Играть (${currentBet} 🪙)`}
        </button>
      </div>
    </div>
  );
};
