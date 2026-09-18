import React, { useState, useEffect } from 'react';
import { soundManager } from '../audio/soundManager';
import { Gift, X, Sparkles, Zap, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CoinRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  lastBonusTime: number;
  onClaimChest: () => number;
  onEmergencyGrant: () => void;
  onTapCoin: () => void;
}

const CHEST_COOLDOWN_MS = 60 * 1000; // 60 seconds for quick testing!

export const CoinRewardModal: React.FC<CoinRewardModalProps> = ({
  isOpen,
  onClose,
  coins,
  lastBonusTime,
  onClaimChest,
  onEmergencyGrant,
  onTapCoin,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [chestOpenedReward, setChestOpenedReward] = useState<number | null>(null);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - lastBonusTime;
      const remaining = Math.max(0, Math.ceil((CHEST_COOLDOWN_MS - elapsed) / 1000));
      setTimeLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastBonusTime]);

  if (!isOpen) return null;

  const handleOpenChest = () => {
    if (timeLeft > 0) return;
    const reward = onClaimChest();
    setChestOpenedReward(reward);
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 },
    });
    setTimeout(() => {
      setChestOpenedReward(null);
    }, 2500);
  };

  const handleTap = () => {
    soundManager.playCoin();
    onTapCoin();
    setTapCount((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="candy-card p-5 w-full max-w-sm flex flex-col gap-4 text-center relative animate-reel-land">
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-900 border-2 border-purple-400 text-purple-200 flex items-center justify-center hover:bg-purple-800 active:scale-90 transition-all"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-amber-300">
            <Gift className="w-6 h-6 animate-bounce" />
            <h3 className="text-xl font-black uppercase tracking-wider drop-shadow">
              Банк Монет
            </h3>
          </div>
          <p className="text-xs text-purple-200 font-bold">
            Получай бесплатное золото и возвращайся в игру!
          </p>
        </div>

        {/* Section 1: Lucky Chest */}
        <div className="bg-gradient-to-b from-purple-900/80 to-purple-950/90 rounded-2xl p-4 border-2 border-amber-400/50 shadow-inner flex flex-col items-center gap-2 relative overflow-hidden">
          <div className="text-5xl my-1 animate-pulse-glow select-none">
            {chestOpenedReward ? '🎉' : '🎁'}
          </div>

          {chestOpenedReward ? (
            <div className="text-emerald-400 font-black text-lg animate-bounce">
              +{chestOpenedReward} МОНЕТ!
            </div>
          ) : (
            <>
              <div className="font-extrabold text-white text-sm">
                Волшебный Сундук
              </div>
              <div className="text-xs text-amber-300/90 font-bold">
                Награда: от 300 до 800 монет
              </div>

              <button
                disabled={timeLeft > 0}
                onClick={handleOpenChest}
                className={`cartoon-btn w-full py-2.5 text-sm mt-1 ${
                  timeLeft === 0 ? 'btn-gold animate-pulse' : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}
              >
                {timeLeft === 0 ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Sparkles className="w-4 h-4" /> Открыть Сундук!
                  </span>
                ) : (
                  <span>Готов через {timeLeft} сек</span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Section 2: Quick Tap for Coins */}
        <div className="bg-purple-950/60 rounded-2xl p-3 border border-purple-400/30 flex items-center justify-between gap-2">
          <div className="text-left">
            <div className="text-xs font-black text-white flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-400" /> Тапалка Золота
            </div>
            <div className="text-[10px] text-purple-300 font-bold">
              +10 монет за каждый клик (нажато: {tapCount})
            </div>
          </div>
          <button
            onClick={handleTap}
            className="cartoon-btn btn-purple px-4 py-2 text-xs flex items-center gap-1 active:scale-95"
          >
            🪙 ТАП!
          </button>
        </div>

        {/* Section 3: Emergency Bonus (If broke) */}
        {coins < 50 && (
          <div className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-3 flex flex-col gap-2 animate-pulse">
            <div className="text-xs font-black text-rose-300 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" /> Закончились монеты?
            </div>
            <button
              onClick={() => {
                soundManager.playBigWin();
                onEmergencyGrant();
              }}
              className="cartoon-btn btn-spin py-2 text-xs"
            >
              Взять помощь +1 000 Монет
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
