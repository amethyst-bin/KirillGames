import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { Volume2, VolumeX, Plus, Sparkles, Trophy } from 'lucide-react';

interface HeaderBarProps {
  onOpenProfile: () => void;
  onOpenBank: () => void;
  onOpenQuests: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenProfile, onOpenBank, onOpenQuests }) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) soundManager.playClick();
  };

  if (!user) return null;

  const isCustomImage = user.avatar && user.avatar.startsWith('data:image');

  return (
    <header className="w-full flex items-center justify-between px-3 py-2 bg-purple-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 shadow-md">
      {/* Brand & User Profile Button */}
      <div 
        onClick={() => {
          soundManager.playClick();
          onOpenProfile();
        }}
        className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow flex items-center justify-center border border-amber-200 overflow-hidden">
            {isCustomImage ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl select-none">{user.avatar}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[9px] px-1 rounded-full border border-white">
            {user.level}
          </div>
        </div>

        <div className="flex flex-col text-left">
          <span className="font-black text-xs text-white leading-tight flex items-center gap-1">
            KirillGames
            <Sparkles className="w-3 h-3 text-amber-400" />
          </span>
          <span className="text-[11px] text-purple-200 font-bold truncate max-w-[5.5rem]">
            {user.username}
          </span>
        </div>
      </div>

      {/* Coins & Sound */}
      <div className="flex items-center gap-2">
        {/* Coins Pill */}
        <div
          onClick={() => {
            soundManager.playClick();
            onOpenBank();
          }}
          className="flex items-center bg-black/40 border border-amber-400/60 rounded-full pl-2 pr-1.5 py-1 gap-1.5 shadow cursor-pointer active:scale-95 transition-transform"
          title="Получить бесплатные монеты"
        >
          <span className="text-base leading-none">🪙</span>
          <span className="font-black text-amber-300 text-xs font-mono min-w-[2.5rem] text-right">
            {user.coins.toLocaleString('ru-RU')}
          </span>
          <button className="w-5 h-5 rounded-full bg-amber-400 text-purple-950 flex items-center justify-center font-black">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        {/* Quests Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenQuests();
          }}
          className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 hover:scale-105 active:scale-90 transition-transform shadow-inner"
          title="Задания и Награды"
        >
          <Trophy className="w-4 h-4 text-amber-300" />
        </button>

        {/* Mute Button */}
        <button
          onClick={handleToggleSound}
          className="w-8 h-8 rounded-xl bg-purple-900/80 border border-purple-400/30 flex items-center justify-center text-purple-200 hover:text-white active:scale-90 transition-transform"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
