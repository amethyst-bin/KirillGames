import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Coins, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ThimblesGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type BallCount = 1 | 2;
type Phase = 'betting' | 'preview' | 'shuffling' | 'picking' | 'revealed';

const BET_AMOUNTS = [25, 50, 100, 250, 500];

export const ThimblesGame: React.FC<ThimblesGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [betIndex, setBetIndex] = useState(1);
  const [customBet, setCustomBet] = useState<number | null>(null);
  const [ballCount, setBallCount] = useState<BallCount>(1);
  const [phase, setPhase] = useState<Phase>('betting');
  
  // Array of 3 items indicating if ball is present under cup [0, 1, 2]
  const [ballLocations, setBallLocations] = useState<boolean[]>([true, false, false]);
  // Visual positions: cupPositions[cupId] = current slot index (0, 1, or 2)
  const [cupPositions, setCupPositions] = useState<number[]>([0, 1, 2]);
  const [selectedCup, setSelectedCup] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Сделайте ставку и выберите напёрсток');

  const currentBet = customBet !== null ? customBet : BET_AMOUNTS[betIndex];
  const multiplier = ballCount === 1 ? 2.88 : 1.44;

  const handleStartGame = () => {
    if (!user) return;
    if (user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    // Determine ball locations
    const initialBalls = [false, false, false];
    if (ballCount === 1) {
      const idx = Math.floor(Math.random() * 3);
      initialBalls[idx] = true;
    } else {
      const emptyIdx = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i++) {
        if (i !== emptyIdx) initialBalls[i] = true;
      }
    }

    setBallLocations(initialBalls);
    setCupPositions([0, 1, 2]);
    setSelectedCup(null);
    setWinAmount(null);
    setPhase('preview');
    setStatusMessage('Запоминайте, где шарик...');
    soundManager.playSpinStart();
    soundManager.vibrate([30, 40]);

    // Preview for 900ms, then lower cups and shuffle
    setTimeout(() => {
      setPhase('shuffling');
      setStatusMessage('Стаканчики перемешиваются...');
      runShuffleSequence();
    }, 900);
  };

  const runShuffleSequence = () => {
    let steps = 6;
    let currentPositions = [0, 1, 2];

    const interval = setInterval(() => {
      // Pick 2 distinct slots to swap
      const slotA = Math.floor(Math.random() * 3);
      let slotB = Math.floor(Math.random() * 3);
      while (slotB === slotA) {
        slotB = Math.floor(Math.random() * 3);
      }

      // Find which cups are at slotA and slotB
      const cupA = currentPositions.indexOf(slotA);
      const cupB = currentPositions.indexOf(slotB);

      const nextPositions = [...currentPositions];
      nextPositions[cupA] = slotB;
      nextPositions[cupB] = slotA;

      currentPositions = nextPositions;
      setCupPositions(nextPositions);
      soundManager.playClick();
      soundManager.vibrate([15]);

      steps--;
      if (steps <= 0) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase('picking');
          setStatusMessage('Укажите, где спрятан шарик!');
          soundManager.vibrate([30, 50, 30]);
        }, 300);
      }
    }, 280);
  };

  const handlePickCup = (cupId: number) => {
    if (phase !== 'picking') return;

    setSelectedCup(cupId);
    setPhase('revealed');
    soundManager.vibrate([30, 50]);

    const hasBall = ballLocations[cupId];

    if (hasBall) {
      const won = Math.floor(currentBet * multiplier);
      setWinAmount(won);
      setStatusMessage(`🎉 ПОБЕДА! Выигрыш: +${won.toLocaleString()} 🪙 (x${multiplier})`);
      soundManager.playCoin();
      soundManager.playBigWin();
      soundManager.vibrate([50, 80, 50, 80]);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 } });
      recordGameResult('thimbles', currentBet, won, multiplier);
    } else {
      setWinAmount(0);
      setStatusMessage('💥 Пусто! Попробуйте ещё раз!');
      soundManager.playExplosion();
      soundManager.vibrate([80]);
      recordGameResult('thimbles', currentBet, 0, 0);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24 text-white">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> В меню
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-200">Баланс:</span>
          <div
            onClick={onOpenBank}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-sm cursor-pointer active:scale-95 transition-transform"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{(user?.coins || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Game Title Card */}
      <div className="w-full bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-pink-500/20 border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
            🪄
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
              Напёрстки <span className="text-xs text-amber-400 font-black">x{multiplier}</span>
            </h2>
            <p className="text-[11px] text-purple-200 font-medium">
              Следи за стаканчиками и угадай где шарик!
            </p>
          </div>
        </div>

        {/* Ball Mode Selector */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            disabled={phase !== 'betting' && phase !== 'revealed'}
            onClick={() => {
              soundManager.playClick();
              setBallCount(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
              ballCount === 1
                ? 'bg-amber-500 text-purple-950 shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            1 шар (x2.88)
          </button>
          <button
            disabled={phase !== 'betting' && phase !== 'revealed'}
            onClick={() => {
              soundManager.playClick();
              setBallCount(2);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
              ballCount === 2
                ? 'bg-amber-500 text-purple-950 shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            2 шара (x1.44)
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="w-full text-center py-2 px-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur-sm">
        <span className={`text-xs font-black tracking-wide ${
          winAmount && winAmount > 0 ? 'text-amber-300' : 'text-purple-200'
        }`}>
          {statusMessage}
        </span>
      </div>

      {/* Felt Game Table Area */}
      <div className="w-full relative min-h-[220px] rounded-2xl bg-gradient-to-b from-[#184e35] via-[#0d3623] to-[#082216] border-2 border-emerald-600/40 p-4 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        {/* Table Felt Vignette & Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Wood border detail */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 opacity-60" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 opacity-60" />

        {/* 3 Cups Track */}
        <div className="relative w-full max-w-[320px] h-[160px] flex items-center justify-between px-2">
          {[0, 1, 2].map((cupId) => {
            const slotIndex = cupPositions[cupId];
            const isLifted = (phase === 'preview') || (phase === 'revealed' && (selectedCup === cupId || winAmount === 0));
            const hasBall = ballLocations[cupId];

            return (
              <div
                key={cupId}
                onClick={() => handlePickCup(cupId)}
                style={{
                  left: `${slotIndex * 33.33}%`,
                  transition: phase === 'shuffling' ? 'left 260ms cubic-bezier(0.4, 0, 0.2, 1)' : 'left 300ms ease',
                }}
                className="absolute w-1/3 h-full flex flex-col items-center justify-end pb-3 cursor-pointer select-none group"
              >
                {/* Under-Cup Ball / Diamond (Visible when lifted or revealed) */}
                <div
                  className={`absolute bottom-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    hasBall
                      ? 'scale-100 opacity-100'
                      : 'scale-0 opacity-0'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="text-3xl animate-bounce drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]">
                      💎
                    </span>
                  </div>
                </div>

                {/* The Golden Thimble Cup */}
                <div
                  style={{
                    transform: isLifted ? 'translateY(-55px)' : 'translateY(0)',
                    transition: 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  className={`relative flex flex-col items-center filter drop-shadow-[0_12px_8px_rgba(0,0,0,0.6)] ${
                    phase === 'picking' ? 'hover:scale-105 active:scale-95' : ''
                  }`}
                >
                  {/* Glowing Selection Indicator */}
                  {phase === 'picking' && (
                    <div className="absolute -top-6 text-amber-300 animate-pulse text-xs font-black bg-black/60 px-2 py-0.5 rounded-full border border-amber-400/40">
                      Выбрать
                    </div>
                  )}

                  {/* 3D Stylized Golden Thimble */}
                  <div className="relative w-16 h-20 rounded-t-3xl bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 border-2 border-amber-200 shadow-inner flex flex-col items-center justify-between p-1.5 overflow-hidden">
                    {/* Metal Sheen Highlight */}
                    <div className="absolute top-0 left-2 w-3 h-full bg-white/40 blur-[2px] transform -skew-x-12" />
                    
                    {/* Top Knob */}
                    <div className="w-5 h-2 rounded-full bg-amber-100 shadow-sm border border-amber-300" />

                    {/* Middle Pattern / Star */}
                    <div className="w-8 h-8 rounded-full bg-amber-500/60 border border-amber-200/60 flex items-center justify-center text-amber-100 font-black text-xs shadow-inner">
                      ✦
                    </div>

                    {/* Bottom Rim */}
                    <div className="w-full h-3 rounded-b-xl bg-gradient-to-r from-amber-600 via-amber-300 to-amber-700 shadow-md border-t border-amber-200" />
                  </div>

                  {/* Cup Shadow on Table */}
                  <div
                    style={{
                      transform: isLifted ? 'scale(0.6)' : 'scale(1)',
                      opacity: isLifted ? 0.3 : 0.8,
                    }}
                    className="w-16 h-3 rounded-full bg-black/70 blur-[3px] mt-1 transition-all duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bet Control Panel */}
      <div className="w-full bg-purple-950/40 border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-purple-200 uppercase tracking-wider">
            Размер ставки
          </span>
          <span className="text-xs font-black text-amber-300">
            Возможный куш: +{Math.floor(currentBet * multiplier).toLocaleString()} 🪙
          </span>
        </div>

        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {BET_AMOUNTS.map((amt, idx) => (
            <button
              key={amt}
              disabled={phase === 'preview' || phase === 'shuffling' || phase === 'picking'}
              onClick={() => {
                soundManager.playClick();
                setBetIndex(idx);
                setCustomBet(null);
              }}
              className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                customBet === null && betIndex === idx
                  ? 'bg-amber-400 text-purple-950 shadow-md scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Modifier Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={phase === 'preview' || phase === 'shuffling' || phase === 'picking'}
            onClick={() => {
              soundManager.playClick();
              const newBet = Math.max(10, Math.floor(currentBet / 2));
              setCustomBet(newBet);
            }}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          >
            ½ ставки
          </button>
          <button
            disabled={phase === 'preview' || phase === 'shuffling' || phase === 'picking'}
            onClick={() => {
              soundManager.playClick();
              const newBet = Math.min(user?.coins || 10000, currentBet * 2);
              setCustomBet(newBet);
            }}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          >
            2X ставка
          </button>
          <button
            disabled={phase === 'preview' || phase === 'shuffling' || phase === 'picking'}
            onClick={() => {
              soundManager.playClick();
              if (user) {
                setCustomBet(Math.min(user.coins, 5000));
              }
            }}
            className="flex-1 py-1.5 bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:bg-amber-500/40 rounded-xl text-xs font-black transition-all active:scale-95"
          >
            MAX
          </button>
        </div>

        {/* Action Button */}
        {phase === 'betting' || phase === 'revealed' ? (
          <button
            onClick={handleStartGame}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-purple-950 font-black text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 fill-current" />
            {phase === 'revealed' ? 'Играть снова' : 'Запустить напёрстки'}
          </button>
        ) : (
          <div className="w-full py-3.5 rounded-xl bg-white/10 text-white/60 font-bold text-sm text-center flex items-center justify-center gap-2">
            {phase === 'picking' ? 'Выберите один из стаканчиков выше 👆' : 'Перемешивание...'}
          </div>
        )}
      </div>
    </div>
  );
};
