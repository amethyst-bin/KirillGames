import React, { useState, useEffect } from 'react';
import { soundManager } from '../audio/soundManager';
import { X, Trophy, CheckCircle2, Gift, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

interface QuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

const DEFAULT_QUESTS: Quest[] = [
  {
    id: 'quest_games',
    title: 'Азартный старт',
    description: 'Сыграйте 5 любых игр',
    reward: 500,
    icon: '🎲',
    target: 5,
    progress: 0,
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_big_win',
    title: 'Охотник за кушем',
    description: 'Выиграйте от 500 монет за один раунд',
    reward: 1000,
    icon: '👑',
    target: 500,
    progress: 0,
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_time',
    title: 'Постоянный гость',
    description: 'Проведите 2 минуты в игре',
    reward: 600,
    icon: '⏱️',
    target: 120,
    progress: 0,
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_level',
    title: 'На пути к величию',
    description: 'Достигните 2-го уровня профиля',
    reward: 1500,
    icon: '⭐',
    target: 2,
    progress: 1,
    completed: false,
    claimed: false,
  },
];

export const QuestsModal: React.FC<QuestsModalProps> = ({ isOpen, onClose }) => {
  const { user, recordGameResult } = useAuth();
  const [quests, setQuests] = useState<Quest[]>(() => {
    try {
      const saved = localStorage.getItem('kirillgames_quests');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_QUESTS;
  });

  // Synchronize progress with user stats
  useEffect(() => {
    if (!user) return;

    setQuests((prevQuests) => {
      const updated = prevQuests.map((q) => {
        let p = q.progress;
        if (q.id === 'quest_games') p = user.games_played || 0;
        if (q.id === 'quest_big_win') p = user.biggest_win || 0;
        if (q.id === 'quest_time') p = user.time_spent_seconds || 0;
        if (q.id === 'quest_level') p = user.level || 1;

        const completed = p >= q.target;
        return { ...q, progress: Math.min(p, q.target), completed };
      });
      localStorage.setItem('kirillgames_quests', JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  if (!isOpen) return null;

  const handleClaim = (questId: string, reward: number) => {
    soundManager.playBigWin();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });

    // Grant bonus coins
    recordGameResult('quest', 0, reward, 1.0);

    const updated = quests.map((q) => (q.id === questId ? { ...q, claimed: true } : q));
    setQuests(updated);
    localStorage.setItem('kirillgames_quests', JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-purple-950/95 border-2 border-amber-400/60 p-5 shadow-2xl flex flex-col gap-3.5 text-center animate-reel-land max-h-[85vh] overflow-y-auto no-scrollbar">
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

        {/* Title */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" /> Задания и Награды
          </div>
          <h3 className="text-lg font-black text-white">Выполняй квесты — получай монеты!</h3>
        </div>

        {/* Quest List */}
        <div className="flex flex-col gap-2.5 mt-1">
          {quests.map((quest) => {
            const percent = Math.min(100, Math.floor((quest.progress / quest.target) * 100));

            return (
              <div
                key={quest.id}
                className="bg-black/40 border border-purple-400/30 rounded-2xl p-3 flex flex-col gap-2 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{quest.icon}</span>
                    <div>
                      <h4 className="text-xs font-black text-white">{quest.title}</h4>
                      <p className="text-[11px] text-purple-300 font-bold">{quest.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-lg text-xs font-black text-amber-300">
                    <Gift className="w-3 h-3" /> +{quest.reward}
                  </div>
                </div>

                {/* Progress Bar & Claim Button */}
                <div className="flex items-center justify-between gap-3 mt-0.5">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex justify-between text-[10px] text-purple-200 font-bold">
                      <span>Прогресс:</span>
                      <span>
                        {quest.progress} / {quest.target}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-purple-900 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {quest.claimed ? (
                    <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Получено
                    </span>
                  ) : quest.completed ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(quest.id, quest.reward)}
                      className="cartoon-btn btn-gold py-1.5 px-3 text-xs font-black flex items-center gap-1 animate-pulse"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Забрать
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-purple-400">В процессе</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
