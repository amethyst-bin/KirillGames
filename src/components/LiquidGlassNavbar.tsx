import React from 'react';
import { Gamepad2, Gift, Trophy, User } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

export type NavTab = 'catalog' | 'game' | 'bank' | 'leaderboard' | 'profile';

interface LiquidGlassNavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasBonusReady?: boolean;
}

export const LiquidGlassNavbar: React.FC<LiquidGlassNavbarProps> = ({
  activeTab,
  onTabChange,
  hasBonusReady,
}) => {
  const tabs = [
    { id: 'catalog' as NavTab, label: 'Игры', icon: Gamepad2 },
    { id: 'bank' as NavTab, label: 'Банк', icon: Gift, badge: hasBonusReady },
    { id: 'leaderboard' as NavTab, label: 'Топы', icon: Trophy },
    { id: 'profile' as NavTab, label: 'Профиль', icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-40 pointer-events-auto">
      {/* Liquid Glass Pill */}
      <nav className="relative flex items-center justify-between px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Subtle glass shimmer gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/20 pointer-events-none rounded-full" />

        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id || (activeTab === 'game' && t.id === 'catalog');

          return (
            <button
              key={t.id}
              onClick={() => {
                soundManager.playClick();
                onTabChange(t.id);
              }}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-purple-950 font-black shadow-md scale-105'
                  : 'text-white/80 hover:text-white hover:bg-white/5 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {t.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full animate-ping" />
                )}
              </div>
              <span className="text-[10px] font-extrabold tracking-tight mt-0.5 select-none">
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
