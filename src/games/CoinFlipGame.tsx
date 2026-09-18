import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Coins, Flame, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CoinFlipGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type Side = 'heads' | 'tails';

const MULTIPLIERS = [1.95, 3.85, 7.6, 15.0, 30.0, 60.0];
const BET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

export const CoinFlipGame: React.FC<CoinFlipGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [betIndex, setBetIndex] = useState(1);
  const [selectedSide, setSelectedSide] = useState<Side>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [streak, setStreak] = useState(0);
  const [currentWin, setCurrentWin] = useState(0);
  const [coinRotation, setCoinRotation] = useState(0);
  const [landedSide, setLandedSide] = useState<Side>('heads');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const baseBet = BET_AMOUNTS[betIndex];
  const nextMult = MULTIPLIERS[Math.min(streak, MULTIPLIERS.length - 1)];

  const handleFlip = () => {
    if (isFlipping || !user) return;

    // If starting a new round, verify balance
    if (streak === 0 && user.coins < baseBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    soundManager.vibrate([20, 40, 20]);
    setIsFlipping(true);
    setResultMessage(null);

    // Random outcome: heads or tails
    const outcome: Side = Math.random() < 0.5 ? 'heads' : 'tails';
    const isWin = outcome === selectedSide;

    // 3D rotation turns: 5 full rotations (1800deg) + 180 if tails
    const extra = outcome === 'tails' ? 180 : 0;
    const nextRot = coinRotation + 1800 + extra - (coinRotation % 360);
    setCoinRotation(nextRot);

    setTimeout(() => {
      setIsFlipping(false);
      setLandedSide(outcome);

      if (isWin) {
        soundManager.playCoin();
        soundManager.vibrate([40, 60, 40]);
        const newStreak = streak + 1;
        setStreak(newStreak);
        const win = Math.floor(baseBet * MULTIPLIERS[Math.min(newStreak - 1, MULTIPLIERS.length - 1)]);
        setCurrentWin(win);

        if (newStreak >= 3) {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
          soundManager.playBigWin();
        }

        setResultMessage(`🔥 Победа! Множитель x${MULTIPLIERS[Math.min(newStreak - 1, MULTIPLIERS.length - 1)]}! Заберите выигрыш или удваивайте дальше!`);
      } else {
        soundManager.playExplosion();
        // Record loss
        recordGameResult('coinflip', baseBet, 0, 0);
        setStreak(0);
        setCurrentWin(0);
        setResultMessage(`💥 Выпало: ${outcome === 'heads' ? 'Орёл 🦅' : 'Решка 👑'}. Не повезло!`);
      }
    }, 1200);
  };

  const handleCashOut = () => {
    if (streak === 0 || isFlipping) return;
    soundManager.playBigWin();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const mult = MULTIPLIERS[Math.min(streak - 1, MULTIPLIERS.length - 1)];
    recordGameResult('coinflip', baseBet, currentWin, mult);

    setResultMessage(`🏆 Забрано: +${currentWin} 🪙 (Множитель x${mult})!`);
    setStreak(0);
    setCurrentWin(0);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24">
      {/* Header */}
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
          <span>🪙</span> Монетка 3D
        </h2>

        <div className="bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 text-xs font-black text-amber-300 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" /> Серия: {streak}
        </div>
      </div>

      {/* 3D Coin Arena */}
      <div className="relative w-full h-44 rounded-3xl bg-gradient-to-b from-purple-950/80 to-purple-900/50 border-2 border-purple-400/30 p-4 flex flex-col items-center justify-center shadow-xl overflow-hidden">
        {/* Glow behind coin */}
        <div className="absolute w-36 h-36 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

        {/* 3D Coin Container */}
        <div className="relative" style={{ perspective: '1000px' }}>
          <div
            className="w-28 h-28 rounded-full border-4 border-amber-300 shadow-2xl flex items-center justify-center text-4xl select-none transition-transform duration-1000"
            style={{
              transform: `rotateY(${coinRotation}deg)`,
              transformStyle: 'preserve-3d',
              background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #eab308 50%, #854d0e 100%)',
            }}
          >
            <span className="drop-shadow-md">
              {landedSide === 'heads' ? '🦅' : '👑'}
            </span>
          </div>
        </div>

        {/* Multiplier status bar */}
        {streak > 0 && (
          <div className="absolute top-2 right-3 bg-amber-400 text-purple-950 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-md animate-bounce flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Текущий куш: {currentWin} 🪙
          </div>
        )}
      </div>

      {/* Result Message */}
      {resultMessage && (
        <div
          className={`w-full p-2.5 rounded-2xl text-center text-xs font-black border animate-fadeIn ${
            streak > 0
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
              : 'bg-purple-900/60 border-purple-400/40 text-purple-200'
          }`}
        >
          {resultMessage}
        </div>
      )}

      {/* Side Selector (Heads or Tails) */}
      <div className="w-full grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isFlipping}
          onClick={() => {
            soundManager.playClick();
            setSelectedSide('heads');
          }}
          className={`p-3 rounded-2xl font-black text-sm border flex items-center justify-center gap-2 transition-all active:scale-95 ${
            selectedSide === 'heads'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-purple-950 border-white shadow-lg ring-2 ring-amber-300 scale-102'
              : 'bg-purple-950/60 text-purple-200 border-purple-400/30 hover:bg-purple-900/60'
          }`}
        >
          <span className="text-xl">🦅</span> Орёл
        </button>

        <button
          type="button"
          disabled={isFlipping}
          onClick={() => {
            soundManager.playClick();
            setSelectedSide('tails');
          }}
          className={`p-3 rounded-2xl font-black text-sm border flex items-center justify-center gap-2 transition-all active:scale-95 ${
            selectedSide === 'tails'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-purple-950 border-white shadow-lg ring-2 ring-amber-300 scale-102'
              : 'bg-purple-950/60 text-purple-200 border-purple-400/30 hover:bg-purple-900/60'
          }`}
        >
          <span className="text-xl">👑</span> Решка
        </button>
      </div>

      {/* Controls & Action Buttons */}
      <div className="w-full bg-black/40 border border-purple-400/30 rounded-3xl p-3 flex flex-col gap-2.5">
        {streak === 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-200 uppercase">Ставка:</span>
            <div className="flex items-center gap-1.5">
              {BET_AMOUNTS.map((amt, idx) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isFlipping}
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
        )}

        <div className="flex gap-2 w-full">
          <button
            type="button"
            disabled={isFlipping}
            onClick={handleFlip}
            className="cartoon-btn btn-spin flex-1 py-3.5 text-base font-black flex items-center justify-center gap-2"
          >
            <Coins className="w-5 h-5 fill-current" />
            {isFlipping
              ? 'Бросаем...'
              : streak === 0
              ? `Бросить (${baseBet} 🪙)`
              : `Удвоить (x${nextMult})`}
          </button>

          {streak > 0 && (
            <button
              type="button"
              disabled={isFlipping}
              onClick={handleCashOut}
              className="cartoon-btn btn-gold flex-1 py-3.5 text-sm font-black flex items-center justify-center gap-1.5 animate-pulse"
            >
              <Trophy className="w-4 h-4" /> Забрать {currentWin} 🪙
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
