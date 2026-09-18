import React, { useEffect, useState } from 'react';
import { soundManager } from '../audio/soundManager';
import confetti from 'canvas-confetti';

interface BigWinOverlayProps {
  winAmount: number;
  multiplier: number;
  onClose: () => void;
}

export const BigWinOverlay: React.FC<BigWinOverlayProps> = ({
  winAmount,
  multiplier,
  onClose,
}) => {
  const [displayedCoins, setDisplayedCoins] = useState(0);

  useEffect(() => {
    soundManager.playBigWin();

    // Trigger multiple confetti bursts
    const end = Date.now() + 2500;
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 250);

    // Number roll-up animation
    const startTime = performance.now();
    const duration = 1800;

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayedCoins(Math.floor(easeProgress * winAmount));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    requestAnimationFrame(animateCount);

    return () => clearInterval(interval);
  }, [winAmount]);

  const title =
    multiplier >= 50
      ? '🔥 МЕГА ДЖЕКПОТ! 🔥'
      : multiplier >= 20
      ? '⭐ СУПЕР ВЫИГРЫШ! ⭐'
      : '🎉 БОЛЬШОЙ КУШ! 🎉';

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-pointer animate-fadeIn"
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-reel-land">
        <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wider animate-bounce uppercase drop-shadow-[0_4px_10px_rgba(234,179,8,0.8)]">
          {title}
        </div>

        <div className="text-6xl sm:text-7xl animate-pulse-glow my-2 select-none">
          👑
        </div>

        <div className="bg-black/60 border-4 border-amber-400 rounded-3xl px-6 py-4 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
          <div className="text-xs font-bold text-amber-200 tracking-widest uppercase mb-1">
            Вы выиграли
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-black text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2">
            <span>🪙</span>
            <span>+{displayedCoins.toLocaleString('ru-RU')}</span>
          </div>
        </div>

        <div className="text-xs text-purple-200 font-extrabold animate-pulse mt-3">
          Нажми в любое место, чтобы забрать!
        </div>
      </div>
    </div>
  );
};
