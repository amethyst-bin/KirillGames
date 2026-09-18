import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { Gift, Sparkles, Coins, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

const CHEST_COOLDOWN_MS = 60 * 1000;

export const BankModal: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);
  const [openedReward, setOpenedReward] = useState<number | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - (user?.last_bonus_time || 0);
      const rem = Math.max(0, Math.ceil((CHEST_COOLDOWN_MS - elapsed) / 1000));
      setTimeLeft(rem);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [user?.last_bonus_time]);

  if (!user) return null;

  const handleOpenChest = async () => {
    if (timeLeft > 0 || isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.claimBonus();
      setOpenedReward(res.reward);
      soundManager.playBigWin();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
      await refreshUser();
      setTimeout(() => setOpenedReward(null), 3000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Ошибка открытия сундука');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimFaucet = async () => {
    setIsLoading(true);
    try {
      await api.claimFaucet();
      soundManager.playBigWin();
      await refreshUser();
    } catch (err: unknown) {
      alert((err as Error).message || 'Ошибка получения помощи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTap = () => {
    soundManager.playCoin();
    setTapCount((prev) => prev + 1);
  };

  return (
    <div className="w-full flex flex-col gap-3 px-3 py-2 animate-fadeIn pb-24">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-black text-white tracking-wide uppercase">
            Банк и Бонусы
          </h2>
        </div>
        <span className="font-mono font-black text-amber-300 text-sm bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30">
          {formatCoins(user.coins)} 🪙
        </span>
      </div>

      {/* Lucky Chest Card */}
      <div className="rounded-3xl bg-gradient-to-b from-purple-900/80 to-purple-950/90 border-2 border-amber-400/60 p-5 shadow-xl flex flex-col items-center gap-3 text-center">
        <div className="text-6xl my-1 select-none animate-bounce">
          {openedReward ? '🎉' : '🎁'}
        </div>

        {openedReward ? (
          <div className="text-emerald-400 font-black text-xl animate-bounce">
            +{openedReward} ЗОЛОТЫХ МОНЕТ!
          </div>
        ) : (
          <>
            <h3 className="text-lg font-black text-white uppercase">
              Волшебный Сундук
            </h3>
            <p className="text-xs text-purple-200 font-bold max-w-xs">
              Открывай сундук каждую минуту и получай от 300 до 800 бесплатных монет!
            </p>

            <button
              disabled={timeLeft > 0 || isLoading}
              onClick={handleOpenChest}
              className={`cartoon-btn w-full py-3 text-sm font-black mt-2 ${
                timeLeft === 0 ? 'btn-gold' : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {timeLeft === 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> Открыть Сундук!
                </span>
              ) : (
                <span>Доступен через {timeLeft} сек.</span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Emergency Faucet (if coins < 50) */}
      {user.coins < 50 && (
        <div className="rounded-3xl bg-rose-950/80 border-2 border-rose-500 p-4 flex flex-col gap-2.5 text-center">
          <div className="text-sm font-black text-rose-300 flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" /> Закончились монеты?
          </div>
          <p className="text-xs text-rose-200 font-bold">
            Возьми экстренную помощь от казино, чтобы продолжить игру!
          </p>
          <button
            disabled={isLoading}
            onClick={handleClaimFaucet}
            className="cartoon-btn btn-spin py-2.5 text-xs font-black"
          >
            Получить +1 000 Монет
          </button>
        </div>
      )}

      {/* Tap for Coins */}
      <div className="rounded-3xl bg-purple-950/60 border border-purple-400/30 p-4 flex items-center justify-between gap-3">
        <div className="text-left">
          <div className="text-sm font-black text-white flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" /> Тапалка Золота
          </div>
          <div className="text-xs text-purple-300 font-bold mt-0.5">
            Нажато кликов: {tapCount}
          </div>
        </div>
        <button
          onClick={handleTap}
          className="cartoon-btn btn-purple px-5 py-2.5 text-xs font-black active:scale-95"
        >
          🪙 ТАП!
        </button>
      </div>
    </div>
  );
};
