import React, { useState, useEffect } from 'react';
import { api, type UserData, type RecentBet } from '../services/api';
import { soundManager } from '../audio/soundManager';
import { 
  ArrowLeft, Trophy, Dices, Coins, ShieldCheck, 
  TrendingUp, TrendingDown, Target, Zap, Clock, Calendar, 
  Activity, Award, Sparkles, Loader2
} from 'lucide-react';
import { formatTimeSpent, formatCoins } from '../utils/format';

interface PublicProfileModalProps {
  user: UserData | null;
  onClose: () => void;
}

const GAME_NAMES: Record<string, { name: string; emoji: string }> = {
  slots: { name: 'Слоты 777', emoji: '🎰' },
  crash: { name: 'Crash Rocket', emoji: '🚀' },
  sweet_rush: { name: 'Sweet Rush', emoji: '🍬' },
  egypt_book: { name: 'Книга Ра', emoji: '📜' },
  safe: { name: 'Взлом Сейфа', emoji: '🔐' },
  blackjack: { name: 'Блэкджек 21', emoji: '🃏' },
  poker: { name: 'Видео-Покер', emoji: '🎴' },
  towers: { name: 'Башни', emoji: '🏰' },
  mines: { name: 'Мины', emoji: '💣' },
  plinko: { name: 'Плинко', emoji: '🟢' },
  roulette: { name: 'Рулетка', emoji: '🎡' },
  dice: { name: 'Кости', emoji: '🎲' },
  keno: { name: 'Кено Лото', emoji: '🎱' },
  coinflip: { name: 'Монетка', emoji: '🪙' },
  hilo: { name: 'Больше-Меньше', emoji: '↕️' },
  baccarat: { name: 'Баккара', emoji: '👑' },
  thimbles: { name: 'Напёрстки', emoji: '🎪' },
  limbo: { name: 'Лимбо', emoji: '⚡' },
  dragontiger: { name: 'Дракон и Тигр', emoji: '🐉' },
  dragon_tiger: { name: 'Дракон и Тигр', emoji: '🐉' },
  wheel: { name: 'Колесо Фортуны', emoji: '🎯' },
  scratch: { name: 'Скретч-карты', emoji: '🎫' },
  daily_streak: { name: 'Ежедневный бонус', emoji: '🎁' },
};

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ user: initialUser, onClose }) => {
  const [profile, setProfile] = useState<UserData | null>(initialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialUser) return;
    setProfile(initialUser);
    setLoading(true);

    api.getUserProfile(initialUser.id)
      .then((res) => {
        if (res.user) {
          setProfile(res.user);
        }
      })
      .catch((err) => {
        console.warn('Failed to load full profile stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialUser?.id]);

  if (!profile) return null;

  const isCustomImage = profile.avatar && (profile.avatar.startsWith('data:image') || profile.avatar.startsWith('http'));
  const winsCount = profile.wins_count ?? 0;
  const gamesPlayed = profile.games_played ?? 0;
  const winRate = profile.win_rate ?? (gamesPlayed > 0 ? Math.round((winsCount / gamesPlayed) * 100) : 0);
  const totalWagered = profile.total_wagered ?? 0;
  const totalWon = profile.total_won ?? 0;
  const netProfit = profile.net_profit ?? (totalWon - totalWagered);
  const recentBets = profile.recent_bets || [];

  // Compute profit trend points for interactive SVG chart
  const chartPoints = (() => {
    if (recentBets.length < 2) return [];
    
    // Calculate running cumulative profit
    let cum = 0;
    const history = [{ val: 0, bet: null as RecentBet | null }];
    recentBets.forEach((b) => {
      cum += (b.win_amount - b.bet_amount);
      history.push({ val: cum, bet: b });
    });

    const vals = history.map((h) => h.val);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const range = (maxVal - minVal) || 1;

    const width = 340;
    const height = 110;
    const padX = 15;
    const padY = 15;

    return history.map((h, i) => {
      const x = padX + (i / (history.length - 1)) * (width - 2 * padX);
      const y = height - padY - ((h.val - minVal) / range) * (height - 2 * padY);
      return { x, y, val: h.val, bet: h.bet };
    });
  })();

  const svgPathD = chartPoints.length > 1
    ? chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '')
    : '';

  const svgAreaD = chartPoints.length > 1
    ? `${svgPathD} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)},110 L ${chartPoints[0].x.toFixed(1)},110 Z`
    : '';

  const isProfitPositive = netProfit >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0217] flex flex-col animate-fadeIn overflow-hidden">
      {/* Top App Bar */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-[#16042b]/95 border-b border-purple-500/30 backdrop-blur-md shrink-0">
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 px-3 py-1.5 rounded-full border border-purple-400/30 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <div className="flex items-center gap-1.5 text-sm font-black text-amber-300 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Профиль Игрока</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-400/20">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : (
            <span>ID: #{profile.id}</span>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 smooth-scroll pb-16 no-scrollbar">
        {/* Profile Card Hero */}
        <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#22073e] via-[#1a0531] to-[#120324] border-2 border-purple-500/40 p-4 shadow-2xl flex flex-col items-center text-center overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Avatar with LV badge */}
          <div className="relative mt-1">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-1 shadow-xl flex items-center justify-center border-2 border-amber-300 overflow-hidden">
              {isCustomImage ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-5xl select-none">{profile.avatar || '🦊'}</span>
              )}
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-black text-xs px-3 py-0.5 rounded-full border-2 border-white/80 shadow-md">
              УР.{profile.level}
            </div>
          </div>

          {/* Username & Metadata */}
          <div className="flex flex-col items-center mt-3 gap-0.5">
            <h2 className="text-xl font-black text-white drop-shadow tracking-wide flex items-center gap-1.5">
              {profile.username}
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h2>
            <div className="flex items-center gap-2 text-xs text-purple-300 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> {formatTimeSpent(profile.time_spent_seconds)}
              </span>
              {profile.created_at && (
                <span className="flex items-center gap-1 text-purple-400">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> с {profile.created_at.slice(0, 10)}
                </span>
              )}
            </div>
          </div>

          {/* Current Balance Ribbon */}
          <div className="w-full mt-3 bg-black/40 border border-purple-400/30 rounded-2xl py-2 px-3 flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-400" /> Баланс
            </span>
            <span className="font-mono font-black text-amber-300 text-base">
              {formatCoins(profile.coins)} 🪙
            </span>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {/* Games Played */}
          <div className="bg-[#1b0634] rounded-2xl p-3 border border-purple-500/30 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
              <span className="flex items-center gap-1">
                <Dices className="w-4 h-4 text-purple-400" /> Сыграно игр
              </span>
            </div>
            <span className="font-mono font-black text-white text-xl mt-1">
              {gamesPlayed}
            </span>
          </div>

          {/* Wins Count */}
          <div className="bg-[#1b0634] rounded-2xl p-3 border border-purple-500/30 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-emerald-400" /> Побед
              </span>
            </div>
            <span className="font-mono font-black text-emerald-400 text-xl mt-1">
              {winsCount}
            </span>
          </div>

          {/* Win Rate */}
          <div className="bg-[#1b0634] rounded-2xl p-3 border border-purple-500/30 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4 text-amber-400" /> Винрейт
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-mono font-black text-amber-300 text-xl">
                {winRate}%
              </span>
              <span className="text-[10px] text-purple-400 font-bold">побед</span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full bg-purple-950 h-1.5 rounded-full overflow-hidden mt-1.5 border border-purple-400/20">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
              />
            </div>
          </div>

          {/* Record Win */}
          <div className="bg-[#1b0634] rounded-2xl p-3 border border-purple-500/30 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-xs text-yellow-300 font-bold">
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4 text-yellow-400" /> Рекорд
              </span>
            </div>
            <span className="font-mono font-black text-yellow-300 text-xl mt-1 truncate">
              +{formatCoins(profile.biggest_win)}
            </span>
          </div>
        </div>

        {/* Financial Flow Section */}
        <div className="w-full rounded-2xl bg-[#17052d] border border-purple-500/30 p-3 shadow-md flex flex-col gap-2">
          <div className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5 px-1">
            <Activity className="w-3.5 h-3.5 text-purple-400" /> Финансовая активность
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mt-1">
            <div className="bg-black/30 p-2 rounded-xl border border-purple-400/20">
              <span className="text-[10px] text-purple-400 uppercase font-bold block">Поставлено</span>
              <span className="font-mono font-bold text-white text-xs mt-0.5 block truncate">
                {formatCoins(totalWagered)}
              </span>
            </div>

            <div className="bg-black/30 p-2 rounded-xl border border-purple-400/20">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Выиграно</span>
              <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block truncate">
                +{formatCoins(totalWon)}
              </span>
            </div>

            <div className="bg-black/30 p-2 rounded-xl border border-purple-400/20">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Профит</span>
              <span className={`font-mono font-black text-xs mt-0.5 block truncate flex items-center justify-center gap-0.5 ${
                isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {isProfitPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isProfitPositive ? '+' : ''}{formatCoins(netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Performance / Profit Trend SVG Chart */}
        <div className="w-full rounded-3xl bg-[#180530] border border-purple-500/40 p-4 shadow-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-black text-white px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-amber-300">
              <Zap className="w-4 h-4 text-amber-400" /> График Доходности (Раунды)
            </span>
            <span className="text-[10px] text-purple-300 font-mono">
              {recentBets.length > 0 ? `Последние ${recentBets.length} игр` : 'Нет данных'}
            </span>
          </div>

          {chartPoints.length > 1 ? (
            <div className="relative w-full h-32 bg-black/40 rounded-2xl p-2 border border-purple-400/20 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 340 110" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isProfitPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={isProfitPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="15" y1="20" x2="325" y2="20" stroke="#4c1d95" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="15" y1="55" x2="325" y2="55" stroke="#4c1d95" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="15" y1="90" x2="325" y2="90" stroke="#4c1d95" strokeWidth="0.5" strokeDasharray="3 3" />

                {/* Filled Area */}
                <path d={svgAreaD} fill="url(#profitAreaGrad)" />

                {/* Trend Line */}
                <path
                  d={svgPathD}
                  fill="none"
                  stroke={isProfitPositive ? '#34d399' : '#fb7185'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                />

                {/* End Point Glow Indicator */}
                {chartPoints.length > 0 && (
                  <circle
                    cx={chartPoints[chartPoints.length - 1].x}
                    cy={chartPoints[chartPoints.length - 1].y}
                    r="5"
                    fill={isProfitPositive ? '#34d399' : '#fb7185'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="animate-ping"
                  />
                )}
                {chartPoints.length > 0 && (
                  <circle
                    cx={chartPoints[chartPoints.length - 1].x}
                    cy={chartPoints[chartPoints.length - 1].y}
                    r="4"
                    fill={isProfitPositive ? '#10b981' : '#f43f5e'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </svg>
            </div>
          ) : (
            <div className="w-full py-8 bg-black/20 rounded-2xl border border-purple-500/20 flex flex-col items-center justify-center text-center px-4 gap-1.5">
              <Activity className="w-8 h-8 text-purple-400 animate-pulse" />
              <span className="text-xs font-bold text-purple-200">
                Недостаточно раундов для построения графика
              </span>
              <span className="text-[10px] text-purple-400">
                Сыграйте больше игр, чтобы график отображал динамику побед!
              </span>
            </div>
          )}
        </div>

        {/* Recent Matches List */}
        <div className="w-full rounded-2xl bg-[#16042a] border border-purple-500/30 p-3 shadow-md flex flex-col gap-2">
          <div className="text-xs font-black text-purple-200 uppercase tracking-wider flex items-center justify-between px-1">
            <span>История раундов</span>
            <span className="text-[10px] text-purple-400 font-mono">{recentBets.length} матчей</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {recentBets.length > 0 ? (
              recentBets.map((b) => {
                const gameMeta = GAME_NAMES[b.game_type] || { name: b.game_type, emoji: '🎮' };
                const isWin = b.win_amount > b.bet_amount;

                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-purple-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{gameMeta.emoji}</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-white leading-tight">{gameMeta.name}</span>
                        <span className="text-[9px] text-purple-400 font-mono">
                          {b.created_at ? b.created_at.slice(11, 19) : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.multiplier > 0 && (
                        <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
                          b.multiplier >= 2.0 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-800/40 text-purple-200'
                        }`}>
                          {b.multiplier.toFixed(2)}x
                        </span>
                      )}
                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-black text-xs ${isWin ? 'text-emerald-400' : 'text-purple-400'}`}>
                          {isWin ? `+${formatCoins(b.win_amount)}` : `-${formatCoins(b.bet_amount)}`}
                        </span>
                        <span className="text-[9px] text-purple-400 font-mono">
                          ставка {formatCoins(b.bet_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-[11px] text-purple-400 text-center py-4">
                У игрока пока нет зафиксированных раундов
              </span>
            )}
          </div>
        </div>

        {/* Bottom Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="cartoon-btn btn-gold w-full py-3.5 text-sm font-black mt-2 shadow-xl"
        >
          Вернуться в игру
        </button>
      </div>
    </div>
  );
};
