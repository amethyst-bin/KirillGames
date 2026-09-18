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
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-sm z-40 pointer-events-auto">
      {/* Liquid Glass Pill with Deep Contrast */}
      <nav className="relative flex items-center justify-between px-2 py-1.5 rounded-2xl bg-[#160429] border-2 border-purple-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
        {/* Subtle glass shimmer gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/15 via-transparent to-black/40 pointer-events-none rounded-2xl" />

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
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-purple-950 font-black shadow-lg scale-105'
                  : 'text-purple-200 hover:text-white hover:bg-white/5 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-purple-950' : 'stroke-2 text-purple-200'}`} />
                {t.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-[10px] font-black tracking-tight mt-0.5 select-none ${
                isActive ? 'text-purple-950' : 'text-purple-200'
              }`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
