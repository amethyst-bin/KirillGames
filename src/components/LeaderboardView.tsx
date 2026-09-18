import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { UserData } from '../services/api';
import { soundManager } from '../audio/soundManager';
import { formatTimeSpent } from '../utils/format';
import { Trophy, Coins, Flame, ChevronRight, RefreshCw } from 'lucide-react';

interface LeaderboardViewProps {
  onOpenUserProfile: (user: UserData) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onOpenUserProfile }) => {
  const [topCoins, setTopCoins] = useState<UserData[]>([]);
  const [topWinners, setTopWinners] = useState<UserData[]>([]);
  const [tab, setTab] = useState<'coins' | 'winners'>('coins');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLeaderboard();
      setTopCoins(data.topCoins);
      setTopWinners(data.topWinners);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  const list = tab === 'coins' ? topCoins : topWinners;

  return (
    <div className="w-full flex flex-col gap-3 px-3 py-2 animate-fadeIn pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-black text-white tracking-wide uppercase">
            Таблица Лидеров
          </h2>
        </div>
        <button
          onClick={() => {
            soundManager.playClick();
            fetchLeaders();
          }}
          className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-400/30 active:scale-90 transition-all"
          title="Обновить"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-xs text-purple-200 font-bold px-1">
        Нажмите на любого игрока, чтобы посмотреть его профиль, баланс и время в игре!
      </p>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-purple-950/80 p-1.5 rounded-2xl border border-purple-400/30">
        <button
          onClick={() => {
            soundManager.playClick();
            setTab('coins');
          }}
          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            tab === 'coins'
              ? 'bg-amber-400 text-purple-950 shadow-md'
              : 'text-purple-300 hover:text-white'
          }`}
        >
          <Coins className="w-3.5 h-3.5" /> По Балансу
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            setTab('winners');
          }}
          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            tab === 'winners'
              ? 'bg-amber-400 text-purple-950 shadow-md'
              : 'text-purple-300 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> По Рекордам
        </button>
      </div>

      {/* Leaderboard List */}
      <div className="flex flex-col gap-2">
        {list.map((player, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
          const isCustomImage = player.avatar && player.avatar.startsWith('data:image');

          return (
            <div
              key={player.id || index}
              onClick={() => {
                soundManager.playClick();
                onOpenUserProfile(player);
              }}
              className={`flex items-center justify-between p-3 rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] ${
                isTop3
                  ? 'bg-gradient-to-r from-amber-500/20 via-purple-900/40 to-amber-500/10 border-amber-400/50 shadow-sm'
                  : 'bg-purple-950/60 border-purple-500/20 hover:border-purple-400/40'
              }`}
            >
              {/* Left: Rank & Avatar & Info */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-black text-sm w-6 text-center text-amber-300 font-mono">
                  {rankEmoji}
                </span>

                <div className="w-10 h-10 rounded-xl bg-purple-900/80 border border-purple-400/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isCustomImage ? (
                    <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl select-none">{player.avatar}</span>
                  )}
                </div>

                <div className="flex flex-col text-left min-w-0">
                  <span className="font-extrabold text-sm text-white truncate flex items-center gap-1">
                    {player.username}
                    <span className="text-[9px] bg-purple-800 text-purple-200 px-1 py-0.2 rounded">
                      Ур.{player.level}
                    </span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-bold">
                    В игре: {formatTimeSpent(player.time_spent_seconds)}
                  </span>
                </div>
              </div>

              {/* Right: Coins / Win Amount & Arrow */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="font-mono font-black text-amber-300 text-sm">
                    {tab === 'coins'
                      ? `${player.coins.toLocaleString('ru-RU')} 🪙`
                      : `+${player.biggest_win.toLocaleString('ru-RU')} 🪙`}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
