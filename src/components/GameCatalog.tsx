import React from 'react';
import { soundManager } from '../audio/soundManager';
import { Play, Sparkles, Users, Gift } from 'lucide-react';
import { LiveWinTicker } from './LiveWinTicker';

export type GameId = 'slots' | 'crash' | 'blackjack' | 'poker' | 'towers' | 'mines' | 'plinko' | 'roulette' | 'dice' | 'keno' | 'coinflip' | 'hilo' | 'baccarat' | 'thimbles' | 'limbo' | 'dragontiger' | 'wheel' | 'penalty' | 'scratch' | 'sicbo' | 'sweetrush' | 'battleship' | 'rps' | 'holdem' | 'pharaoh';

interface GameCatalogProps {
  onSelectGame: (gameId: GameId) => void;
  onOpenDailyStreak?: () => void;
}

interface GameItem {
  id: GameId;
  name: string;
  category: string;
  emoji: string;
  description: string;
  tag?: string;
  color: string;
  online?: boolean;
}

const GAMES: GameItem[] = [
  {
    id: 'slots',
    name: 'Candy Slots',
    category: 'Слоты 3x3',
    emoji: '🎰',
    description: 'Сочные барабаны, 5 линий и джекпоты!',
    tag: 'ТОП',
    color: 'from-pink-600/50 via-purple-700/40 to-indigo-900/60 border-pink-500/50',
  },
  {
    id: 'poker',
    name: 'Видео-Покер',
    category: 'Jacks or Better',
    emoji: '👑',
    description: '5 замен карт! Собирай комбинации до x250!',
    tag: '5 Замен',
    color: 'from-blue-600/50 via-indigo-700/40 to-purple-900/60 border-blue-500/50',
  },
  {
    id: 'crash',
    name: 'Crash Rocket',
    category: 'Мультиплеер',
    emoji: '🚀',
    description: 'Множитель летит ввысь, забери куш!',
    tag: 'LIVE',
    online: true,
    color: 'from-amber-600/50 via-orange-700/40 to-red-900/60 border-amber-500/50',
  },
  {
    id: 'plinko',
    name: 'Плинко',
    category: 'Физика и риск',
    emoji: '🟡',
    description: 'Шарик падает в лунки с множителями!',
    tag: 'ХИТ',
    color: 'from-yellow-600/50 via-amber-700/40 to-orange-900/60 border-yellow-500/50',
  },
  {
    id: 'thimbles',
    name: 'Напёрстки',
    category: '3D Интуиция',
    emoji: '🪄',
    description: 'Угадай алмаз под стаканчиком до x2.88!',
    tag: 'Новинка',
    color: 'from-amber-600/50 via-orange-800/40 to-stone-900/60 border-amber-500/50',
  },
  {
    id: 'limbo',
    name: 'Лимбо',
    category: 'Космо-множитель',
    emoji: '⚡',
    description: 'Установи цель и лови куш до x10 000!',
    tag: 'до x10k',
    color: 'from-cyan-600/50 via-teal-700/40 to-blue-900/60 border-cyan-500/50',
  },
  {
    id: 'roulette',
    name: 'Колесо Удачи',
    category: 'Рулетка',
    emoji: '🎡',
    description: 'Крути яркое колесо и лови до x50!',
    tag: 'Классика',
    color: 'from-red-600/50 via-rose-700/40 to-purple-900/60 border-red-500/50',
  },
  {
    id: 'dice',
    name: 'Кости 3D',
    category: 'Hi-Lo Craps',
    emoji: '🎲',
    description: 'Ставки на Больше, Меньше 7 и дубли!',
    tag: 'Быстро',
    color: 'from-cyan-600/50 via-blue-700/40 to-indigo-900/60 border-cyan-500/50',
  },
  {
    id: 'blackjack',
    name: 'Blackjack 21',
    category: 'Карточная классика',
    emoji: '🃏',
    description: 'Обыграй крупье, собирая ровно 21!',
    tag: 'VIP',
    color: 'from-emerald-600/50 via-teal-700/40 to-slate-900/60 border-emerald-500/50',
  },
  {
    id: 'baccarat',
    name: 'Баккара 9',
    category: 'Punto Banco',
    emoji: '👑',
    description: 'Ставки на Игрока, Банкира и Ничью!',
    tag: 'Элита',
    color: 'from-emerald-700/50 via-green-800/40 to-zinc-900/60 border-emerald-500/50',
  },
  {
    id: 'mines',
    name: 'Мины 5x5',
    category: 'Логика и риск',
    emoji: '💣',
    description: 'Настраивай мины и открывай алмазы!',
    tag: 'Азарт',
    color: 'from-rose-600/50 via-red-700/40 to-zinc-900/60 border-rose-500/50',
  },
  {
    id: 'towers',
    name: 'Башенки',
    category: '8 этажей',
    emoji: '🏰',
    description: 'Поднимайся выше и забирай победу!',
    tag: 'Башня',
    color: 'from-purple-600/50 via-indigo-800/40 to-slate-900/60 border-purple-500/50',
  },
  {
    id: 'keno',
    name: 'Кено 40',
    category: 'Лотерея',
    emoji: '🎟️',
    description: 'Счастливые шары из барабана до x5000!',
    tag: 'Джекпот',
    color: 'from-violet-600/50 via-purple-700/40 to-fuchsia-950/60 border-violet-500/50',
  },
  {
    id: 'coinflip',
    name: 'Монетка 3D',
    category: 'Орёл / Решка',
    emoji: '🪙',
    description: 'Удваивай выигрыш с каждым броском!',
    tag: 'Серии',
    color: 'from-amber-500/50 via-yellow-600/40 to-stone-900/60 border-amber-500/50',
  },
  {
    id: 'hilo',
    name: 'Карты Hi-Lo',
    category: 'Выше / Ниже',
    emoji: '🃏',
    description: 'Угадывай карту со сериями побед!',
    tag: 'Карты',
    color: 'from-blue-600/50 via-indigo-700/40 to-purple-950/60 border-blue-500/50',
  },
  {
    id: 'dragontiger',
    name: 'Дракон и Тигр',
    category: 'VIP Битва',
    emoji: '🐉',
    description: 'Битва карт: Дракон, Тигр или Ничья до x11!',
    tag: 'VIP Хит',
    color: 'from-red-600/50 via-rose-700/40 to-amber-900/60 border-rose-500/50',
  },
  {
    id: 'wheel',
    name: 'Колесо Фортуны',
    category: 'Dream Catcher',
    emoji: '🎡',
    description: 'Крути яркое колесо и сорви куш до x50!',
    tag: 'ХИТ',
    color: 'from-amber-500/50 via-red-600/40 to-purple-900/60 border-amber-500/50',
  },
  {
    id: 'penalty',
    name: 'Пенальти',
    category: 'Футбольная Дуэль',
    emoji: '⚽',
    description: 'Бей по воротам вратаря и лови до x30.72!',
    tag: 'ХИТ',
    color: 'from-emerald-600/50 via-green-700/40 to-slate-900/60 border-emerald-500/50',
  },
  {
    id: 'scratch',
    name: 'Скретч-Лотерея',
    category: 'Мгновенный Билет',
    emoji: '🎫',
    description: 'Сотри 9 ячеек и забери джекпот до x500!',
    tag: 'ЛОТЕРЕЯ',
    color: 'from-amber-600/50 via-yellow-700/40 to-purple-950/60 border-amber-500/50',
  },
  {
    id: 'sicbo',
    name: 'Сик Бо',
    category: 'Купол Макао',
    emoji: '🎲',
    description: '3 кости в куполе, Тройка до x181!',
    tag: 'VIP ХИТ',
    color: 'from-amber-600/50 via-yellow-800/40 to-slate-950/60 border-amber-500/50',
  },
  {
    id: 'sweetrush',
    name: 'Сладкий Куш',
    category: 'Кластер 5x5',
    emoji: '🍬',
    description: 'Каскадный слот со взрывными бомбами до x100!',
    tag: 'ТОП ХИТ',
    color: 'from-pink-600/50 via-rose-700/40 to-purple-950/60 border-pink-500/50',
  },
  {
    id: 'battleship',
    name: 'Морской Куш',
    category: 'Морской Бой',
    emoji: '⚓',
    description: 'Охота за линкорами и золотыми галеонами до x40!',
    tag: 'ТОП ХИТ',
    color: 'from-blue-700/50 via-cyan-800/40 to-slate-950/60 border-cyan-500/50',
  },
  {
    id: 'rps',
    name: 'RPS Арена',
    category: 'Дуэль Жестов',
    emoji: '🥊',
    description: 'Камень, Ножницы, Бумага! Стрик множителей до x112!',
    tag: 'ТОП ХИТ',
    color: 'from-amber-600/50 via-orange-700/40 to-purple-950/60 border-amber-500/50',
  },
  {
    id: 'holdem',
    name: 'Казино Холдем',
    category: 'Техасский Покер',
    emoji: '🃏',
    description: 'Холдем против Дилера! Флоп, Терн, Ривер и Роял Флеш x100!',
    tag: 'НОВИНКА',
    color: 'from-emerald-700/50 via-green-800/40 to-slate-950/60 border-emerald-500/50',
  },
  {
    id: 'pharaoh',
    name: 'Золото Фараона',
    category: 'Книга Ра 5x3',
    emoji: '📖',
    description: '10 линий, 10 фриспинов и расширяющийся символ!',
    tag: 'ТОП НОВИНКА',
    color: 'from-amber-600/50 via-yellow-700/40 to-stone-950/60 border-amber-500/50',
  },
];

export const GameCatalog: React.FC<GameCatalogProps> = ({ onSelectGame, onOpenDailyStreak }) => {
  return (
    <div className="w-full flex flex-col gap-3 px-2.5 py-2 animate-fadeIn pb-28">
      {/* Catalog Title */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase">
            Каталог Игр
          </h2>
          <p className="text-xs text-purple-200 font-bold">
            Выбирай игру и умножай баланс!
          </p>
        </div>
        <div className="bg-purple-900/80 px-3 py-1 rounded-full border border-purple-400/40 text-[11px] font-black text-amber-300 flex items-center gap-1 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 25 ИГР
        </div>
      </div>

      {/* Daily Streak Promo Banner */}
      {onOpenDailyStreak && (
        <div
          onClick={() => {
            soundManager.playClick();
            onOpenDailyStreak();
          }}
          className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-amber-600/30 via-purple-900/50 to-amber-700/30 border border-amber-400/40 flex items-center justify-between cursor-pointer hover:border-amber-300 transition-all active:scale-[0.98] shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 flex items-center justify-center shadow">
              <Gift className="w-6 h-6 text-purple-950" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                Ежедневный Бонус
                <Sparkles className="w-3 h-3 text-amber-400" />
              </span>
              <span className="text-[10px] text-purple-200">
                Заходи каждый день: призы до 350 000 🪙!
              </span>
            </div>
          </div>
          <button className="px-2.5 py-1 rounded-xl bg-amber-400 text-purple-950 font-black text-[11px] shadow">
            Забрать
          </button>
        </div>
      )}

      {/* Live Win Ticker */}
      <LiveWinTicker />

      {/* 2 Buttons in One Row Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {GAMES.map((game) => (
          <div
            key={game.id}
            onClick={() => {
              soundManager.playClick();
              onSelectGame(game.id);
            }}
            className="relative flex flex-col rounded-2xl bg-[#1b0736] border border-purple-500/30 overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.97] shadow-lg group select-none"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 190px' }}
          >
            {/* 1. Атмосферный баннер с иконкой (без тяжелых блюров для максимального FPS) */}
            <div className={`relative w-full h-24 bg-gradient-to-br ${game.color} border-b border-white/10 flex flex-col items-center justify-center overflow-hidden`}>
              {/* Background gradient accents */}
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />
              <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-3 -left-3 w-14 h-14 rounded-full bg-black/40 pointer-events-none" />

              {/* Tag Pill in corner */}
              {game.tag && (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md text-white shadow-md ${
                    game.online ? 'bg-amber-600 flex items-center gap-0.5' : 'bg-black/60 border border-white/20'
                  }`}>
                    {game.online && <Users className="w-2 h-2" />}
                    {game.tag}
                  </span>
                </div>
              )}

              {/* Иконка игры (по центру баннера) */}
              <div className="relative z-10 w-13 h-13 rounded-2xl bg-black/50 border border-white/25 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                {game.emoji}
              </div>
            </div>

            {/* 2. Название и описание игры */}
            <div className="p-2.5 flex flex-col flex-1 justify-between gap-1 text-left bg-gradient-to-b from-[#1b0736] to-[#120524]">
              <div>
                <h3 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors leading-tight line-clamp-1">
                  {game.name}
                </h3>
                <span className="text-[9px] text-purple-300 font-bold uppercase tracking-wider block">
                  {game.category}
                </span>
                <p className="text-[10px] text-purple-200/75 line-clamp-2 mt-1 leading-snug">
                  {game.description}
                </p>
              </div>

              {/* Play footer button */}
              <div className="mt-1 pt-1.5 border-t border-purple-500/20 flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-300 group-hover:text-amber-200 flex items-center gap-0.5">
                  Играть
                </span>
                <div className="w-5 h-5 rounded-full bg-amber-400 text-purple-950 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
