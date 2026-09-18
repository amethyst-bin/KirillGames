import React from 'react';
import { soundManager } from '../audio/soundManager';
import { Play, Sparkles, Users } from 'lucide-react';

export type GameId = 'slots' | 'crash' | 'blackjack' | 'poker' | 'towers' | 'mines' | 'plinko' | 'roulette' | 'dice' | 'keno' | 'coinflip';

interface GameCatalogProps {
  onSelectGame: (gameId: GameId) => void;
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
    description: 'Сочные барабаны, 5 линий выплат и мега-джекпоты!',
    tag: 'Популярное',
    color: 'from-pink-500/20 to-purple-600/30 border-pink-500/40',
  },
  {
    id: 'crash',
    name: 'Crash Rocket',
    category: 'Мультиплеер',
    emoji: '🚀',
    description: 'Множитель летит ввысь! Успей забрать куш до взрыва.',
    tag: 'LIVE Онлайн',
    online: true,
    color: 'from-amber-500/20 to-orange-600/30 border-amber-500/40',
  },
  {
    id: 'plinko',
    name: 'Плинко (Plinko)',
    category: 'Физика и риск',
    emoji: '🟡',
    description: 'Шарик отскакивает от препятствий и падает в ячейки с множителями!',
    tag: 'Хит',
    color: 'from-yellow-500/20 to-amber-600/30 border-yellow-500/40',
  },
  {
    id: 'roulette',
    name: 'Колесо Фортуны',
    category: 'Рулетка',
    emoji: '🎡',
    description: 'Крути яркое колесо! Ставки на сектора и джекпот до x50.',
    tag: 'Классика',
    color: 'from-red-500/20 to-purple-700/30 border-red-500/40',
  },
  {
    id: 'dice',
    name: 'Кости (Dice)',
    category: 'Hi-Lo Craps',
    emoji: '🎲',
    description: 'Бросай 2 кости. Ставки на Больше, Меньше 7 и дубли до x30!',
    tag: 'Быстрая игра',
    color: 'from-cyan-500/20 to-blue-700/30 border-cyan-500/40',
  },
  {
    id: 'blackjack',
    name: 'Blackjack 21',
    category: 'Карточная классика',
    emoji: '🃏',
    description: 'Обыграй крупье, собирая 21 очко без перебора!',
    tag: 'Классика',
    color: 'from-emerald-500/20 to-teal-600/30 border-emerald-500/40',
  },
  {
    id: 'poker',
    name: 'Видео-Покер',
    category: 'Jacks or Better',
    emoji: '👑',
    description: '5 карт, удерживай лучшие и получай выплаты от пары валетов.',
    tag: 'Покер',
    color: 'from-blue-500/20 to-indigo-600/30 border-blue-500/40',
  },
  {
    id: 'towers',
    name: 'Башенки',
    category: 'Tower of Fortune',
    emoji: '🏰',
    description: 'Поднимайся по 8 этажам башни. Забирай выигрыш в любой момент!',
    tag: 'Новинка',
    color: 'from-purple-500/20 to-indigo-700/30 border-purple-500/40',
  },
  {
    id: 'mines',
    name: 'Мины 5x5',
    category: 'Логика и риск',
    emoji: '💣',
    description: 'Выбирай количество мин и открывай сокровища шаг за шагом.',
    tag: 'Выбор игроков',
    color: 'from-rose-500/20 to-red-700/30 border-rose-500/40',
  },
  {
    id: 'keno',
    name: 'Кено 40',
    category: 'Лотерея',
    emoji: '🎟️',
    description: 'Выбирай счастливые числа и лови шары из барабана до x5000!',
    tag: 'Новинка',
    color: 'from-violet-500/20 to-purple-700/30 border-violet-500/40',
  },
  {
    id: 'coinflip',
    name: 'Монетка 3D',
    category: 'Орёл или Решка',
    emoji: '🪙',
    description: 'Удваивай выигрыш с каждым верным броском монеты!',
    tag: 'Серии побед',
    color: 'from-amber-400/20 to-yellow-600/30 border-amber-400/40',
  },
];

export const GameCatalog: React.FC<GameCatalogProps> = ({ onSelectGame }) => {
  return (
    <div className="w-full flex flex-col gap-3 px-3 py-2 animate-fadeIn pb-24">
      {/* Catalog Title */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase">
            Каталог Игр
          </h2>
          <p className="text-xs text-purple-200 font-bold">
            Выбирай игру и приумножай свои монеты!
          </p>
        </div>
        <div className="bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 text-[11px] font-black text-amber-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> 11 ИГР
        </div>
      </div>

      {/* Grid of Games */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {GAMES.map((game) => (
          <div
            key={game.id}
            onClick={() => {
              soundManager.playClick();
              onSelectGame(game.id);
            }}
            className={`relative flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${game.color} border backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md group overflow-hidden`}
          >
            {/* Game Icon */}
            <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform flex-shrink-0">
              {game.emoji}
            </div>

            {/* Game Info */}
            <div className="flex flex-col flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white truncate group-hover:text-amber-300 transition-colors">
                  {game.name}
                </h3>
                {game.tag && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md text-white ${
                    game.online ? 'bg-amber-600 flex items-center gap-0.5' : 'bg-purple-800'
                  }`}>
                    {game.online && <Users className="w-2.5 h-2.5" />}
                    {game.tag}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                {game.category}
              </span>
              <p className="text-[11px] text-white/70 line-clamp-1 mt-0.5">
                {game.description}
              </p>
            </div>

            {/* Play Arrow Button */}
            <div className="w-8 h-8 rounded-full bg-amber-400 text-purple-950 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
