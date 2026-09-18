import React, { useState } from 'react';
import type { UserProfile } from '../types/game';
import { AVATARS } from '../constants/gameConfig';
import { soundManager } from '../audio/soundManager';
import { Volume2, VolumeX, Plus, Sparkles } from 'lucide-react';

interface HeaderProfileProps {
  profile: UserProfile;
  onUpdateProfile: (name: string, avatar: string) => void;
  onOpenBonusModal: () => void;
}

export const HeaderProfile: React.FC<HeaderProfileProps> = ({
  profile,
  onUpdateProfile,
  onOpenBonusModal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(profile.username);
  const [tempAvatar, setTempAvatar] = useState(profile.avatar);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) soundManager.playClick();
  };

  const handleSaveProfile = () => {
    soundManager.playClick();
    onUpdateProfile(tempName.trim() || 'Игрок', tempAvatar);
    setIsEditing(false);
  };

  const xpPercentage = Math.min(100, Math.round((profile.xp / profile.xpToNextLevel) * 100));

  return (
    <>
      <header className="w-full flex items-center justify-between px-3 py-2.5 bg-purple-950/70 backdrop-blur-md border-b-2 border-purple-500/40 sticky top-0 z-30 shadow-lg">
        {/* Left: Avatar, Name & Level */}
        <div 
          onClick={() => {
            soundManager.playClick();
            setTempName(profile.username);
            setTempAvatar(profile.avatar);
            setIsEditing(true);
          }}
          className="flex items-center gap-2.5 cursor-pointer group active:scale-95 transition-transform"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center border-2 border-amber-200">
              <span className="text-2xl select-none">{profile.avatar}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full border border-white shadow">
              LV.{profile.level}
            </div>
          </div>

          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm text-white drop-shadow flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              {profile.username}
              <Sparkles className="w-3 h-3 text-amber-400 opacity-70" />
            </span>
            {/* XP Bar */}
            <div className="w-24 h-2.5 bg-purple-950 rounded-full border border-purple-400/40 overflow-hidden mt-0.5 relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <span className="text-[9px] text-purple-200 font-bold tracking-tight">
              {profile.xp} / {profile.xpToNextLevel} XP
            </span>
          </div>
        </div>

        {/* Right: Coins Balance & Sound Button */}
        <div className="flex items-center gap-2">
          {/* Coins Badge */}
          <div 
            onClick={() => {
              soundManager.playClick();
              onOpenBonusModal();
            }}
            className="flex items-center bg-black/50 border-2 border-amber-400/80 rounded-full pl-2 pr-1.5 py-1 gap-1.5 shadow-md hover:border-amber-300 transition-all cursor-pointer active:scale-95"
            title="Получить бесплатные монеты"
          >
            <span className="text-xl animate-coin-bounce leading-none">🪙</span>
            <span className="font-black text-amber-300 text-base tracking-wide min-w-[3rem] text-right font-mono">
              {profile.coins.toLocaleString('ru-RU')}
            </span>
            <button
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-purple-950 flex items-center justify-center font-black shadow hover:brightness-110 active:scale-90 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="w-9 h-9 rounded-xl bg-purple-900/80 border border-purple-400/50 flex items-center justify-center text-purple-200 hover:text-white hover:bg-purple-800 transition-all active:scale-90"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="gold-frame p-5 w-full max-w-sm flex flex-col gap-4 text-center animate-reel-land">
            <h3 className="text-xl font-black text-amber-300 uppercase tracking-wider drop-shadow">
              Профиль Игрока
            </h3>

            {/* Avatar Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-purple-200 uppercase">Выбери Аватар</label>
              <div className="grid grid-cols-4 gap-2 bg-purple-950/60 p-2.5 rounded-2xl border border-purple-500/30">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      soundManager.playClick();
                      setTempAvatar(emoji);
                    }}
                    className={`text-2xl p-2 rounded-xl transition-all ${
                      tempAvatar === emoji
                        ? 'bg-amber-400 shadow-md scale-110 border-2 border-white'
                        : 'hover:bg-purple-800/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-purple-200 uppercase">Твой Никнейм</label>
              <input
                type="text"
                maxLength={14}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="bg-purple-950/80 border-2 border-purple-400 rounded-xl px-3 py-2 text-white font-extrabold focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Введи ник..."
              />
            </div>

            {/* Stats Overview */}
            <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-400/20 text-xs flex justify-around">
              <div>
                <div className="text-purple-300 font-bold">Спинов</div>
                <div className="font-mono font-black text-amber-300 text-sm">{profile.totalSpins}</div>
              </div>
              <div>
                <div className="text-purple-300 font-bold">Рекорд выигрыша</div>
                <div className="font-mono font-black text-emerald-400 text-sm">+{profile.biggestWin}</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsEditing(false);
                }}
                className="cartoon-btn btn-red flex-1 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveProfile}
                className="cartoon-btn btn-spin flex-1 py-2 text-sm"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
