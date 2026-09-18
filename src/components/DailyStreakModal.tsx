import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { X, Gift, CheckCircle2, Clock, Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

const STREAK_KEY = 'kg_daily_streak_v1';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

export interface StreakState {
  lastClaimTime: number;
  streakDay: number; // 1 to 7
}

export const STREAK_REWARDS = [
  { day: 1, baseCoins: 1000, title: 'День 1', icon: '🪙' },
  { day: 2, baseCoins: 2500, title: 'День 2', icon: '🪙' },
  { day: 3, baseCoins: 5000, title: 'День 3', icon: '💎' },
  { day: 4, baseCoins: 10000, title: 'День 4', icon: '💎' },
  { day: 5, baseCoins: 25000, title: 'День 5', icon: '👑' },
  { day: 6, baseCoins: 50000, title: 'День 6', icon: '🔥' },
  { day: 7, baseCoins: 100000, title: 'День 7', icon: '🎁', isVipBox: true },
];

export function getDailyStreakInfo(): {
  streakDay: number;
  canClaim: boolean;
  timeRemainingMs: number;
  lastClaimTime: number;
} {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) {
      return { streakDay: 1, canClaim: true, timeRemainingMs: 0, lastClaimTime: 0 };
    }
    const data: StreakState = JSON.parse(raw);
    const now = Date.now();
    const elapsed = now - data.lastClaimTime;

    if (elapsed > FORTY_EIGHT_HOURS) {
      // Streak broken after 48 hours without claiming
      return { streakDay: 1, canClaim: true, timeRemainingMs: 0, lastClaimTime: data.lastClaimTime };
    }

    if (elapsed >= TWENTY_FOUR_HOURS) {
      // Ready to claim next day (cycle back to 1 after 7)
      const nextDay = data.streakDay >= 7 ? 1 : data.streakDay + 1;
      return { streakDay: nextDay, canClaim: true, timeRemainingMs: 0, lastClaimTime: data.lastClaimTime };
    }

    // Still waiting for 24h cooldown
    return {
      streakDay: data.streakDay,
      canClaim: false,
      timeRemainingMs: TWENTY_FOUR_HOURS - elapsed,
      lastClaimTime: data.lastClaimTime,
    };
  } catch {
    return { streakDay: 1, canClaim: true, timeRemainingMs: 0, lastClaimTime: 0 };
  }
}

interface DailyStreakModalProps {
  onClose: () => void;
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({ onClose }) => {
  const { recordGameResult } = useAuth();
  const [streakInfo, setStreakInfo] = useState(getDailyStreakInfo);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [claimedReward, setClaimedReward] = useState<{ amount: number; isVipBonus: number } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const info = getDailyStreakInfo();
      setStreakInfo(info);
      if (!info.canClaim && info.timeRemainingMs > 0) {
        const totalSec = Math.floor(info.timeRemainingMs / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        setTimeLeftStr(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        setTimeLeftStr('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = () => {
    if (!streakInfo.canClaim) return;

    const currentRewardDef = STREAK_REWARDS.find((r) => r.day === streakInfo.streakDay) || STREAK_REWARDS[0];
    let totalReward = currentRewardDef.baseCoins;
    let vipExtra = 0;

    if (currentRewardDef.isVipBox) {
      // Guaranteed random bonus 50 000 to 250 000
      vipExtra = Math.floor(Math.random() * 200000) + 50000;
      totalReward += vipExtra;
    }

    // Save streak state
    const newState: StreakState = {
      lastClaimTime: Date.now(),
      streakDay: streakInfo.streakDay,
    };
    localStorage.setItem(STREAK_KEY, JSON.stringify(newState));

    // Award coins to user via optimistic & server sync
    recordGameResult('daily_streak', 0, totalReward, 1.0);

    // Audio & Visual Effects
    soundManager.playDailyReward();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setClaimedReward({ amount: totalReward, isVipBonus: vipExtra });
    setStreakInfo(getDailyStreakInfo());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 animate-fadeIn select-none">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#2a0e4e] via-[#1b0833] to-[#120424] border border-purple-500/40 p-4 shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg flex items-center justify-center -mt-8 border-2 border-amber-300">
          <Gift className="w-8 h-8 text-purple-950 stroke-[2.5]" />
        </div>

        <h2 className="mt-2 text-xl font-black text-white tracking-wide flex items-center gap-1.5">
          Календарь Наград
          <Sparkles className="w-4 h-4 text-amber-400" />
        </h2>
        <p className="text-xs text-purple-200 mt-0.5 max-w-[260px]">
          Заходи каждый день и забирай растущие призы до 350 000 🪙!
        </p>

        {/* Claim Success Banner */}
        {claimedReward && (
          <div className="w-full mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-600/40 to-teal-600/40 border border-emerald-400/60 flex flex-col items-center animate-bounce">
            <span className="text-xs text-emerald-200 font-bold">Награда получена!</span>
            <span className="text-xl font-black text-amber-300 font-mono">
              +{formatCoins(claimedReward.amount)} 🪙
            </span>
            {claimedReward.isVipBonus > 0 && (
              <span className="text-[10px] text-amber-300 font-semibold">
                Включая VIP Сейф: +{formatCoins(claimedReward.isVipBonus)} 🪙
              </span>
            )}
          </div>
        )}

        {/* 7-Days Grid */}
        <div className="w-full grid grid-cols-4 gap-2 mt-3.5">
          {STREAK_REWARDS.map((item) => {
            const isClaimed = !streakInfo.canClaim && item.day <= streakInfo.streakDay;
            const isCurrent = streakInfo.canClaim && item.day === streakInfo.streakDay;
            const isDay7 = item.day === 7;

            return (
              <div
                key={item.day}
                className={`relative rounded-xl p-2 flex flex-col items-center justify-between border transition-all ${
                  isDay7 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'
                } ${
                  isClaimed
                    ? 'bg-purple-950/40 border-emerald-500/40 opacity-70'
                    : isCurrent
                    ? 'bg-gradient-to-b from-amber-500/30 to-purple-900/60 border-amber-400 shadow-lg shadow-amber-500/20 scale-105 ring-2 ring-amber-400/50'
                    : 'bg-[#18052e]/80 border-purple-500/20 opacity-60'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-[10px] font-black text-purple-200">
                    {item.title}
                  </span>
                  {isClaimed && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                <div className="text-xl my-0.5">
                  {item.icon}
                </div>

                <div className="flex flex-col items-center">
                  <span className={`text-[10px] font-mono font-black ${isCurrent ? 'text-amber-300' : 'text-purple-300'}`}>
                    +{formatCoins(item.baseCoins)}
                  </span>
                  {isDay7 && (
                    <span className="text-[8px] font-bold text-amber-400 uppercase tracking-tighter">
                      +VIP Сейф
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Claim / Timer Action Button */}
        <div className="w-full mt-4">
          {streakInfo.canClaim ? (
            <button
              onClick={handleClaim}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 font-black text-base shadow-lg shadow-amber-500/30 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5 fill-current" />
              Забрать День {streakInfo.streakDay}
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center gap-2 text-purple-300 font-bold text-xs">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Следующая награда через: <span className="font-mono text-amber-300">{timeLeftStr || '00:00:00'}</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
