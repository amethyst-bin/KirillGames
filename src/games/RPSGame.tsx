import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Flame, Trophy, Swords } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RPSGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type Gesture = 'rock' | 'paper' | 'scissors';

interface GestureDef {
  id: Gesture;
  name: string;
  emoji: string;
  beats: Gesture;
  color: string;
}

const GESTURES: Record<Gesture, GestureDef> = {
  rock: { id: 'rock', name: 'Камень', emoji: '✊', beats: 'scissors', color: 'from-amber-600 to-orange-700 border-amber-400' },
  scissors: { id: 'scissors', name: 'Ножницы', emoji: '✌️', beats: 'paper', color: 'from-rose-600 to-pink-700 border-rose-400' },
  paper: { id: 'paper', name: 'Бумага', emoji: '✋', beats: 'rock', color: 'from-blue-600 to-indigo-700 border-blue-400' },
};

const STREAK_MULTIPLIERS = [1.96, 3.85, 7.50, 14.80, 29.00, 57.00, 112.00];
const BET_OPTIONS = [50, 100, 250, 500, 1000, 2500, 5000];

export const RPSGame: React.FC<RPSGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [bet, setBet] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [playerGesture, setPlayerGesture] = useState<Gesture | null>(null);
  const [botGesture, setBotGesture] = useState<Gesture | null>(null);
  const [isClashing, setIsClashing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Выбери жест для старта дуэли на Арене!');
  const [history, setHistory] = useState<string[]>([]);

  const currentMultiplier = streak > 0 ? STREAK_MULTIPLIERS[Math.min(streak - 1, STREAK_MULTIPLIERS.length - 1)] : 1;
  const currentWinAmount = streak > 0 ? Math.round(bet * currentMultiplier) : 0;

  const handlePlayMove = async (choice: Gesture) => {
    if (isClashing) return;

    if (!isPlaying) {
      if (!user || user.coins < bet) {
        soundManager.playReelStop(0);
        onOpenBank();
        return;
      }
      setIsPlaying(true);
    }

    setPlayerGesture(choice);
    setIsClashing(true);
    soundManager.playSwoosh();
    setStatusMessage('Камень... Ножницы... Бумага...');

    // Shaking anticipation delay
    await new Promise(r => setTimeout(r, 600));

    // Bot picks random gesture
    const gestureKeys: Gesture[] = ['rock', 'scissors', 'paper'];
    const botChoice = gestureKeys[Math.floor(Math.random() * gestureKeys.length)];
    setBotGesture(botChoice);

    soundManager.playPunch();

    // Determine result
    if (choice === botChoice) {
      // Draw: streak preserved!
      setStatusMessage(`Ничья (${GESTURES[choice].emoji} vs ${GESTURES[botChoice].emoji})! Стрик x${currentMultiplier} сохранён!`);
      setHistory(prev => [`Ничья: ${GESTURES[choice].emoji}=${GESTURES[botChoice].emoji}`, ...prev.slice(0, 4)]);
      setIsClashing(false);
    } else if (GESTURES[choice].beats === botChoice) {
      // Player wins round!
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const nextMult = STREAK_MULTIPLIERS[Math.min(nextStreak - 1, STREAK_MULTIPLIERS.length - 1)];
      const wonAmount = Math.round(bet * nextMult);

      setHistory(prev => [`Победа: ${GESTURES[choice].emoji} > ${GESTURES[botChoice].emoji}`, ...prev.slice(0, 4)]);

      if (nextStreak >= 4) {
        soundManager.playBigWin();
        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      } else {
        soundManager.playWin();
      }

      setStatusMessage(`🔥 ПОБЕДА! Стрик ${nextStreak} (x${nextMult})! Забери ${formatCoins(wonAmount)} или бей дальше!`);
      setIsClashing(false);

      // If max streak reached, auto-cashout jackpot!
      if (nextStreak >= STREAK_MULTIPLIERS.length) {
        handleCashoutWithAmount(wonAmount, nextMult);
      }
    } else {
      // Player loses round!
      soundManager.playLoss();
      setHistory(prev => [`Поражение: ${GESTURES[choice].emoji} < ${GESTURES[botChoice].emoji}`, ...prev.slice(0, 4)]);
      setStatusMessage(`Поражение (${GESTURES[choice].emoji} уступил ${GESTURES[botChoice].emoji}). Стрик сгорел.`);
      setIsClashing(false);
      setIsPlaying(false);
      setStreak(0);

      try {
        await recordGameResult('rps', bet, 0, 0);
      } catch (err) {
        console.error('Failed to sync rps result:', err);
      }
    }
  };

  const handleCashoutWithAmount = async (winAmt: number, mult: number) => {
    soundManager.playBigWin();
    try {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
    } catch {
      // ignore
    }

    setStatusMessage(`🏆 КУШ ЗАБРАН! +${formatCoins(winAmt)} монет (x${mult})!`);
    setIsPlaying(false);
    setStreak(0);
    setPlayerGesture(null);
    setBotGesture(null);

    try {
      await recordGameResult('rps', bet, winAmt, mult);
    } catch (err) {
      console.error('Failed to sync rps cashout:', err);
    }
  };

  const handleCashout = () => {
    if (!isPlaying || streak === 0 || isClashing) return;
    handleCashoutWithAmount(currentWinAmount, currentMultiplier);
  };

  return (
    <div className="w-full flex flex-col items-center max-w-md mx-auto px-2 py-1 select-none animate-fadeIn pb-24">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-1.5">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          disabled={isPlaying && streak > 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-purple-200 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> В лобби
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-orange-950 to-amber-950 border border-amber-500/40">
          <span className="text-base">🥊</span>
          <span className="text-xs font-black text-amber-300 tracking-wider uppercase">RPS Арена</span>
        </div>

        <button
          onClick={onOpenBank}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black active:scale-95 transition-all"
        >
          🪙 {formatCoins(user?.coins || 0)}
        </button>
      </div>

      {/* Streak Multipliers Ladder */}
      <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1 px-1 bg-black/40 rounded-2xl border border-purple-500/30 mb-2">
        {STREAK_MULTIPLIERS.map((m, idx) => {
          const step = idx + 1;
          const isPassed = streak >= step;
          const isCurrent = streak === step;
          return (
            <div
              key={step}
              className={`flex-1 flex flex-col items-center py-1 px-0.5 rounded-xl text-center border transition-all ${
                isCurrent
                  ? 'bg-amber-500 text-purple-950 border-amber-200 font-black scale-105 shadow-md animate-pulse'
                  : isPassed
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-purple-950/40 text-purple-400/70 border-purple-500/20 text-[10px]'
              }`}
            >
              <span className="text-[9px] uppercase font-mono leading-none">#{step}</span>
              <span className="text-xs font-black leading-tight">x{m}</span>
            </div>
          );
        })}
      </div>

      {/* Battle Arena Ring */}
      <div className="relative w-full aspect-[4/3] max-w-[340px] rounded-3xl bg-gradient-to-b from-[#20083b] via-[#150426] to-[#0a0214] border-2 border-amber-500/50 shadow-2xl overflow-hidden flex flex-col justify-between p-3">
        {/* Status Message */}
        <div className="w-full text-center">
          <span className="text-xs font-black text-white drop-shadow bg-black/50 px-3 py-1 rounded-full border border-amber-400/30 inline-block truncate max-w-[280px]">
            {statusMessage}
          </span>
        </div>

        {/* Clashing Hands Area */}
        <div className="flex items-center justify-around w-full my-auto px-4">
          {/* Player Hand */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-cyan-300 font-black uppercase tracking-wider">Ты</span>
            <div
              className={`w-20 h-20 rounded-2xl bg-cyan-950/60 border-2 border-cyan-400/60 flex items-center justify-center text-5xl shadow-lg transition-all duration-200 ${
                isClashing ? 'scale-125 animate-bounce' : ''
              }`}
            >
              {playerGesture ? GESTURES[playerGesture].emoji : '❓'}
            </div>
          </div>

          {/* VS Badge */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-rose-600 border border-white flex items-center justify-center text-white shadow-xl">
            <Swords className="w-5 h-5 fill-current" />
          </div>

          {/* Bot Hand */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-rose-300 font-black uppercase tracking-wider">Дилер</span>
            <div
              className={`w-20 h-20 rounded-2xl bg-rose-950/60 border-2 border-rose-400/60 flex items-center justify-center text-5xl shadow-lg transition-all duration-200 ${
                isClashing ? 'scale-125 animate-bounce' : ''
              }`}
            >
              {botGesture ? GESTURES[botGesture].emoji : '❓'}
            </div>
          </div>
        </div>

        {/* History / Win Ribbon */}
        <div className="flex items-center justify-between text-[11px] font-bold text-purple-300/80 px-1 border-t border-purple-500/20 pt-1.5">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Стрик: <b className="text-white">{streak}</b> побед
          </span>
          <span className="text-amber-300 font-black">
            {streak > 0 ? `Куш: 🪙 ${formatCoins(currentWinAmount)}` : 'Ставка: ' + formatCoins(bet)}
          </span>
        </div>
      </div>

      {/* Controls & Gesture Buttons */}
      <div className="w-full mt-2 flex flex-col gap-2">
        {/* Gestures 3 Main Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {(['rock', 'scissors', 'paper'] as Gesture[]).map(gKey => {
            const g = GESTURES[gKey];
            return (
              <button
                key={g.id}
                disabled={isClashing}
                onClick={() => handlePlayMove(g.id)}
                className={`py-3 rounded-2xl bg-gradient-to-b ${g.color} text-white font-black text-xs flex flex-col items-center justify-center gap-1 shadow-xl border active:scale-95 transition-all disabled:opacity-50`}
              >
                <span className="text-3xl filter drop-shadow">{g.emoji}</span>
                <span className="uppercase tracking-wide text-[11px]">{g.name}</span>
              </button>
            );
          })}
        </div>

        {/* Cashout or Quick Bet */}
        {isPlaying && streak > 0 ? (
          <button
            onClick={handleCashout}
            disabled={isClashing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 border border-emerald-300/50 active:scale-[0.98] transition-all animate-pulse"
          >
            <Trophy className="w-5 h-5 text-emerald-100" />
            Забрать Выигрыш • {formatCoins(currentWinAmount)} 🪙 (x{currentMultiplier})
          </button>
        ) : (
          <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {BET_OPTIONS.map(val => (
              <button
                key={val}
                disabled={isClashing}
                onClick={() => {
                  soundManager.playClick();
                  setBet(val);
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                  bet === val
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg scale-105 border border-amber-300'
                    : 'bg-purple-950/70 text-purple-300 border border-purple-500/30 active:scale-95'
                }`}
              >
                {formatCoins(val)}
              </button>
            ))}
          </div>
        )}

        {/* Recent Rounds */}
        {history.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-purple-300/70 font-mono overflow-x-auto no-scrollbar py-0.5">
            {history.map((h, i) => (
              <span key={i} className="bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
