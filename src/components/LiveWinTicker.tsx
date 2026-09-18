import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface WinEvent {
  player: string;
  avatar: string;
  amount: number;
  game: string;
}

const SAMPLE_WINS: WinEvent[] = [
  { player: 'Alex_VIP', avatar: '🦁', amount: 4200, game: 'Candy Slots' },
  { player: 'Dmitry_99', avatar: '🚀', amount: 8400, game: 'Crash Rocket' },
  { player: 'Elena_Lucky', avatar: '🦄', amount: 12500, game: 'Кено 40' },
  { player: 'Max_Highroller', avatar: '👑', amount: 6200, game: 'Монетка 3D' },
  { player: 'Kirill_Pro', avatar: '💎', amount: 5500, game: 'Мины 5x5' },
  { player: 'Svetlana_S', avatar: '🦊', amount: 7800, game: 'Колесо Фортуны' },
  { player: 'Ivan_Ace', avatar: '🃏', amount: 3750, game: 'Blackjack 21' },
  { player: 'Roman_Bet', avatar: '🏰', amount: 9600, game: 'Башенки' },
];

export const LiveWinTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SAMPLE_WINS.length);
        setIsVisible(true);
      }, 400);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const current = SAMPLE_WINS[currentIndex];

  return (
    <div className="w-full px-1">
      <div
        className={`w-full rounded-2xl bg-gradient-to-r from-purple-900/60 via-amber-500/10 to-purple-900/60 border border-amber-400/30 py-1.5 px-3 flex items-center justify-between shadow-sm transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-base flex-shrink-0">{current.avatar}</span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200 truncate">
            <span className="text-white font-extrabold">{current.player}</span>
            <span className="text-[11px] text-purple-300">в {current.game}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-full text-[11px] font-black text-amber-300 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>+{current.amount.toLocaleString('ru-RU')} 🪙</span>
        </div>
      </div>
    </div>
  );
};
