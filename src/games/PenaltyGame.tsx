import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Plus, Sparkles, Crosshair, DollarSign, Shuffle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PenaltyGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type ShotZone = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

interface ZoneConfig {
  id: ShotZone;
  label: string;
  sub: string;
  x: number; // percentage
  y: number; // percentage
}

const SHOT_ZONES: ZoneConfig[] = [
  { id: 'top-left', label: 'Девятка Л.', sub: 'Верхний угол', x: 18, y: 22 },
  { id: 'center', label: 'Центр', sub: 'Под планку', x: 50, y: 25 },
  { id: 'top-right', label: 'Девятка П.', sub: 'Верхний угол', x: 82, y: 22 },
  { id: 'bottom-left', label: 'Нижний Л.', sub: 'В притирку', x: 20, y: 76 },
  { id: 'bottom-right', label: 'Нижний П.', sub: 'В притирку', x: 80, y: 76 },
];

const LADDER_MULTIPLIERS = [1.92, 3.84, 7.68, 15.36, 30.72];
const BET_PRESETS = [100, 500, 1000, 5000, 25000];

export const PenaltyGame: React.FC<PenaltyGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [betAmount, setBetAmount] = useState<number>(100);
  const [streak, setStreak] = useState<number>(0);
  const [isKicking, setIsKicking] = useState<boolean>(false);
  const [keeperZone, setKeeperZone] = useState<ShotZone>('center');
  const [selectedZone, setSelectedZone] = useState<ShotZone | null>(null);
  const [ballState, setBallState] = useState<{ x: number; y: number; active: boolean; outcome: 'goal' | 'saved' | null }>({
    x: 50,
    y: 85,
    active: false,
    outcome: null,
  });
  const [history, setHistory] = useState<('goal' | 'saved')[]>([]);
  const [recentWins, setRecentWins] = useState<number[]>([1.92, 3.84, 1.92, 7.68]);
  const [statusText, setStatusText] = useState<string>('Выберите сектор ворот для удара!');

  const currentMultiplier = streak > 0 ? LADDER_MULTIPLIERS[streak - 1] : 0;
  const nextMultiplier = streak < 5 ? LADDER_MULTIPLIERS[streak] : LADDER_MULTIPLIERS[4];
  const currentWin = Math.floor(betAmount * currentMultiplier);

  const handleShoot = async (targetZone: ShotZone) => {
    if (isKicking) return;
    if (streak === 0 && (!user || user.coins < betAmount)) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    setIsKicking(true);
    setSelectedZone(targetZone);
    setStatusText('Разбег... Удар по мячу! ⚽');

    soundManager.playKick();

    // Goalkeeper AI: chooses a zone randomly (25% chance to dive correctly to user's zone)
    const allZones: ShotZone[] = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
    const isSave = Math.random() < 0.28;
    const keeperChoice = isSave 
      ? targetZone 
      : allZones.filter(z => z !== targetZone)[Math.floor(Math.random() * (allZones.length - 1))];

    setKeeperZone(keeperChoice);

    const targetConfig = SHOT_ZONES.find(z => z.id === targetZone)!;

    // Ball flight animation
    setBallState({
      x: targetConfig.x,
      y: targetConfig.y,
      active: true,
      outcome: null,
    });

    // Wait for ball to reach the goal (550ms)
    setTimeout(async () => {
      const isGoal = keeperChoice !== targetZone;

      if (isGoal) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setHistory(prev => [...prev, 'goal']);
        setBallState(prev => ({ ...prev, outcome: 'goal' }));

        soundManager.playWhistle();
        soundManager.playCrowdCheer();

        if (newStreak === 5) {
          // MAX SUPER WIN x30.72!
          const maxWin = Math.floor(betAmount * LADDER_MULTIPLIERS[4]);
          setStatusText(`🏆 СУПЕР-ХЕТ-ТРИК! 5 ИЗ 5! ВЫИГРЫШ: +${formatCoins(maxWin)} 🪙`);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          soundManager.playBigWin();

          await recordGameResult('penalty', betAmount, maxWin, LADDER_MULTIPLIERS[4]);
          setRecentWins(prev => [LADDER_MULTIPLIERS[4], ...prev.slice(0, 5)]);

          setTimeout(() => {
            setStreak(0);
            setHistory([]);
            setBallState({ x: 50, y: 85, active: false, outcome: null });
            setSelectedZone(null);
            setIsKicking(false);
          }, 2500);
          return;
        } else {
          const nextWin = Math.floor(betAmount * LADDER_MULTIPLIERS[newStreak - 1]);
          setStatusText(`🔥 ГОООЛ! Множитель x${LADDER_MULTIPLIERS[newStreak - 1]} (+${formatCoins(nextWin)} 🪙)`);
        }
      } else {
        // SAVED!
        soundManager.playDeflection();
        soundManager.playWhistle();
        setHistory(prev => [...prev, 'saved']);
        setBallState(prev => ({ ...prev, outcome: 'saved' }));
        setStatusText('❌ ВРАТАРЬ ПАРИРОВАЛ УДАР! СЕРИЯ ОКОНЧЕНА');

        // Record loss on server
        await recordGameResult('penalty', betAmount, 0, 0);

        setTimeout(() => {
          setStreak(0);
          setHistory([]);
          setBallState({ x: 50, y: 85, active: false, outcome: null });
          setSelectedZone(null);
          setStatusText('Новая серия! Выберите ставку и угол ворот.');
        }, 1800);
      }

      setIsKicking(false);
    }, 600);
  };

  const handleCashout = async () => {
    if (isKicking || streak === 0) return;

    setIsKicking(true);
    soundManager.playWin();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });

    setStatusText(`💰 ВЫИГРЫШ ЗАБРАН: +${formatCoins(currentWin)} 🪙 (x${currentMultiplier})`);
    await recordGameResult('penalty', betAmount, currentWin, currentMultiplier);
    setRecentWins(prev => [currentMultiplier, ...prev.slice(0, 5)]);

    setTimeout(() => {
      setStreak(0);
      setHistory([]);
      setBallState({ x: 50, y: 85, active: false, outcome: null });
      setSelectedZone(null);
      setIsKicking(false);
      setStatusText('Ставка выплачена! Готовы к новой дуэли?');
    }, 1200);
  };

  const handleRandomShot = () => {
    const randomZone = SHOT_ZONES[Math.floor(Math.random() * SHOT_ZONES.length)].id;
    handleShoot(randomZone);
  };

  // Keeper coordinate translation based on current diving zone
  const getKeeperTransform = () => {
    switch (keeperZone) {
      case 'top-left':
        return 'translate(-90px, -60px) rotate(-35deg)';
      case 'top-right':
        return 'translate(90px, -60px) rotate(35deg)';
      case 'bottom-left':
        return 'translate(-100px, 30px) rotate(-65deg)';
      case 'bottom-right':
        return 'translate(100px, 30px) rotate(65deg)';
      case 'center':
      default:
        return 'translate(0px, 0px)';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a1209] text-white select-none overflow-hidden relative font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0e1d0c] border-b border-emerald-900/60 z-20 flex-shrink-0">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 active:scale-95 text-emerald-200 border border-emerald-700/50 flex items-center gap-1 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> В лобби
        </button>

        <div className="flex flex-col items-center">
          <div className="text-base font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5 drop-shadow">
            ⚽ Пенальти
            <span className="text-[10px] bg-amber-500 text-purple-950 font-black px-1.5 py-0.2 rounded-full">
              x30.72
            </span>
          </div>
          <div className="text-[10px] text-emerald-400/80 font-semibold tracking-wide">
            Футбольная Дуэль
          </div>
        </div>

        {/* Coins Balance Chip */}
        <div
          onClick={onOpenBank}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 text-amber-300 font-black text-xs cursor-pointer active:scale-95 transition-all shadow-inner"
        >
          <span>🪙</span>
          <span>{formatCoins(user?.coins ?? 0)}</span>
          <Plus className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
        </div>
      </div>

      {/* Ladder Multiplier Bar */}
      <div className="px-3 py-1.5 bg-[#071708] border-b border-emerald-900/40 flex items-center justify-between gap-1 overflow-x-auto z-10 flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-extrabold w-full justify-between max-w-md mx-auto">
          {LADDER_MULTIPLIERS.map((mult, idx) => {
            const isCompleted = streak > idx;
            const isCurrent = streak === idx + 1;
            const isNext = streak === idx;

            return (
              <div
                key={mult}
                className={`flex-1 py-1 px-1 rounded-xl text-center border transition-all flex flex-col items-center ${
                  isCompleted
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-sm'
                    : isCurrent
                    ? 'bg-amber-500 border-amber-300 text-slate-950 font-black scale-105 shadow-md animate-pulse'
                    : isNext
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
                    : 'bg-black/30 border-emerald-900/30 text-emerald-600'
                }`}
              >
                <div className="text-[9px] uppercase tracking-tighter opacity-80">
                  {idx + 1}-й гол
                </div>
                <div className="text-xs font-black">
                  x{mult}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Stadium & Pitch Field */}
      <div className="flex-1 relative flex flex-col justify-between p-3 overflow-hidden bg-gradient-to-b from-[#0a1a0c] via-[#0f2c13] to-[#143e1a]">
        {/* Stadium Floodlights & Net Grid Effect */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Stadium Crowd Silhouette top banner */}
        <div className="w-full flex items-center justify-between px-2 pt-1 z-10">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Серия:</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] ${
                    history[i] === 'goal'
                      ? 'bg-emerald-500 border-emerald-300 text-white'
                      : history[i] === 'saved'
                      ? 'bg-rose-600 border-rose-400 text-white'
                      : 'bg-emerald-950/50 border-emerald-800 text-transparent'
                  }`}
                >
                  {history[i] === 'goal' ? '✓' : history[i] === 'saved' ? '✕' : '•'}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Multipliers pill */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-emerald-800/40 text-[10px] font-bold text-emerald-300">
            <span>Топ:</span>
            {recentWins.slice(0, 3).map((w, idx) => (
              <span key={idx} className="text-amber-400">x{w}</span>
            ))}
          </div>
        </div>

        {/* Status Callout Pill */}
        <div className="self-center z-10 my-0.5">
          <div className="px-3 py-1 rounded-full bg-black/60 border border-emerald-500/40 text-xs font-bold text-emerald-200 text-center shadow-md">
            {statusText}
          </div>
        </div>

        {/* Football Goal Area */}
        <div className="relative w-full max-w-md mx-auto aspect-[16/10] bg-[#0c2311] rounded-t-2xl border-4 border-white/90 shadow-2xl overflow-hidden flex flex-col justify-end">
          {/* Goal Net Cross-Hatch */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#ffffff15_25%,transparent_25%),linear-gradient(-45deg,#ffffff15_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ffffff15_75%),linear-gradient(-45deg,transparent_75%,#ffffff15_75%)] [background-size:20px_20px]" />

          {/* Goal Depth Grass Floor */}
          <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-emerald-950 to-transparent border-t border-emerald-700/30" />

          {/* Goalkeeper Sprite / Character */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-transform duration-500 ease-out flex flex-col items-center pointer-events-none"
            style={{ transform: getKeeperTransform() }}
          >
            {/* Goalkeeper Avatar */}
            <div className="relative flex flex-col items-center">
              {/* Goalkeeper Gloves */}
              <div className="flex justify-between w-20 -mb-2">
                <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-200 shadow-sm animate-pulse" />
                <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-200 shadow-sm animate-pulse" />
              </div>
              {/* Keeper Head */}
              <div className="w-9 h-9 rounded-full bg-amber-200 border-2 border-amber-400 flex items-center justify-center text-xl shadow-md z-10">
                🦁
              </div>
              {/* Keeper Jersey */}
              <div className="w-14 h-12 rounded-t-xl bg-gradient-to-b from-rose-600 to-rose-800 border border-rose-300 flex items-center justify-center text-white font-black text-xs shadow-inner">
                1
              </div>
              {/* Keeper Shorts & Legs */}
              <div className="flex gap-2">
                <div className="w-4 h-6 bg-zinc-900 rounded-b border border-zinc-700" />
                <div className="w-4 h-6 bg-zinc-900 rounded-b border border-zinc-700" />
              </div>
            </div>
          </div>

          {/* 5 Interactive Shot Target Zones */}
          {SHOT_ZONES.map((zone) => {
            const isSelected = selectedZone === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                disabled={isKicking}
                onClick={() => handleShoot(zone.id)}
                style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all active:scale-90 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/40 scale-110 shadow-lg'
                    : 'border-white/50 bg-black/30 hover:border-amber-300 hover:bg-amber-400/20'
                } ${isKicking ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Crosshair className={`w-5 h-5 ${isSelected ? 'text-amber-300 animate-spin' : 'text-white/80'}`} />
                <span className="text-[9px] font-black text-white drop-shadow tracking-tight mt-0.5">
                  {zone.label}
                </span>
              </button>
            );
          })}

          {/* The Soccer Ball */}
          <div
            className={`absolute z-30 transition-all duration-500 ease-out flex items-center justify-center pointer-events-none ${
              ballState.active ? 'scale-75' : 'scale-100'
            }`}
            style={{
              left: `${ballState.x}%`,
              top: `${ballState.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`w-9 h-9 rounded-full bg-white border-2 border-zinc-900 shadow-2xl flex items-center justify-center text-xl transition-transform ${
              ballState.active ? 'rotate-180 animate-spin' : ''
            }`}>
              ⚽
            </div>
          </div>
        </div>

        {/* Penalty Spot Line on Pitch */}
        <div className="w-full max-w-xs mx-auto flex flex-col items-center justify-center mt-1 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md mb-1" />
          <div className="w-32 h-0.5 bg-white/40" />
        </div>

        {/* Action / Cashout Button Area */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-2 z-20 mt-1">
          {streak > 0 ? (
            /* Cashout Active Mode */
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isKicking}
                onClick={handleCashout}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base shadow-lg border-2 border-emerald-300 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                <span>ЗАБРАТЬ {formatCoins(currentWin)} 🪙</span>
                <span className="text-xs bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded-lg">x{currentMultiplier}</span>
              </button>

              <button
                type="button"
                disabled={isKicking}
                onClick={handleRandomShot}
                className="py-3 px-3 rounded-2xl bg-emerald-950/80 border border-emerald-700 hover:bg-emerald-900 text-emerald-200 font-black text-xs active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
                title="Случайный угол"
              >
                <Shuffle className="w-4 h-4" />
                <span>Авто-удар</span>
              </button>
            </div>
          ) : (
            /* Choose Bet Mode */
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isKicking}
                onClick={handleRandomShot}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-purple-950 font-black text-sm shadow-xl border border-amber-200 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Sparkles className="w-4 h-4" />
                <span>Удар по мячу! (клик по воротам)</span>
              </button>
            </div>
          )}

          {/* Bet Amount Controls */}
          <div className="bg-[#0c1f0e]/95 p-2 rounded-2xl border border-emerald-800/60 flex flex-col gap-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold uppercase text-[10px] tracking-wider">
                Сумма ставки {streak > 0 ? '(зафиксирована)' : ''}
              </span>
              <div className="text-amber-300 font-black flex items-center gap-1">
                <span>{formatCoins(betAmount)} 🪙</span>
                {streak === 0 && (
                  <span className="text-[10px] text-emerald-400">
                    (след. гол: x{nextMultiplier})
                  </span>
                )}
              </div>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-5 gap-1">
              {BET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isKicking || streak > 0}
                  onClick={() => {
                    soundManager.playClick();
                    setBetAmount(preset);
                  }}
                  className={`py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                    betAmount === preset
                      ? 'bg-amber-400 text-purple-950 border-amber-200 shadow-md'
                      : 'bg-emerald-950/70 text-emerald-200 border-emerald-800/50 hover:bg-emerald-900 disabled:opacity-50'
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
            </div>

            {/* Math multipliers (1/2, 2X, MAX) */}
            {streak === 0 && (
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setBetAmount(prev => Math.max(10, Math.floor(prev / 2)));
                  }}
                  className="py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-800/40 text-[10px] font-bold text-emerald-300"
                >
                  1/2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setBetAmount(prev => prev * 2);
                  }}
                  className="py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-800/40 text-[10px] font-bold text-emerald-300"
                >
                  2X
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    if (user && user.coins > 0) setBetAmount(user.coins);
                  }}
                  className="py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[10px] font-black text-amber-300"
                >
                  MAX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
