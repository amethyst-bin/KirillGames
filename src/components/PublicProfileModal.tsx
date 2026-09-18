import React from 'react';
import type { UserData } from '../services/api';
import { soundManager } from '../audio/soundManager';
import { X, Clock, Trophy, Dices, Coins, ShieldCheck } from 'lucide-react';

interface PublicProfileModalProps {
  user: UserData | null;
  onClose: () => void;
}

import { formatTimeSpent, formatCoins } from '../utils/format';

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ user, onClose }) => {
  if (!user) return null;

  const isCustomImage = user.avatar && user.avatar.startsWith('data:image');

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#160429] border-2 border-amber-400/60 p-5 shadow-2xl flex flex-col items-center gap-4 text-center animate-reel-land">
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-900 border border-purple-400 text-purple-200 flex items-center justify-center hover:bg-purple-800 active:scale-90 transition-all"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Header Title */}
        <div className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Профиль Игрока
        </div>

        {/* Avatar & Level */}
        <div className="relative mt-1">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-lg flex items-center justify-center border-2 border-amber-200 overflow-hidden">
            {isCustomImage ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-4xl select-none">{user.avatar}</span>
            )}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full border border-white shadow">
            LV.{user.level}
          </div>
        </div>

        {/* Username */}
        <div className="flex flex-col">
          <h3 className="text-lg font-black text-white drop-shadow">
            {user.username}
          </h3>
          <span className="text-[11px] text-purple-300 font-bold">
            В игре: {formatTimeSpent(user.time_spent_seconds)}
          </span>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {/* Balance */}
          <div className="bg-purple-900/50 rounded-2xl p-3 border border-purple-400/30 flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-amber-300 font-bold mb-1">
              <Coins className="w-4 h-4 text-amber-400" /> Баланс
            </div>
            <span className="font-mono font-black text-white text-base truncate max-w-full">
              {formatCoins(user.coins)} 🪙
            </span>
          </div>

          {/* Biggest Win */}
          <div className="bg-purple-900/50 rounded-2xl p-3 border border-purple-400/30 flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-emerald-300 font-bold mb-1">
              <Trophy className="w-4 h-4 text-emerald-400" /> Рекорд
            </div>
            <span className="font-mono font-black text-emerald-400 text-base truncate max-w-full">
              +{formatCoins(user.biggest_win)}
            </span>
          </div>

          {/* Games Played */}
          <div className="bg-purple-900/50 rounded-2xl p-3 border border-purple-400/30 flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-purple-200 font-bold mb-1">
              <Dices className="w-4 h-4 text-purple-300" /> Игр сыграно
            </div>
            <span className="font-mono font-black text-white text-base">
              {user.games_played || 0}
            </span>
          </div>

          {/* Playtime */}
          <div className="bg-purple-900/50 rounded-2xl p-3 border border-purple-400/30 flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-cyan-300 font-bold mb-1">
              <Clock className="w-4 h-4 text-cyan-400" /> Время в игре
            </div>
            <span className="font-mono font-black text-cyan-300 text-xs mt-1">
              {formatTimeSpent(user.time_spent_seconds)}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="cartoon-btn btn-gold w-full py-2.5 text-xs font-black mt-1"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};
