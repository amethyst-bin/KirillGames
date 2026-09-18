import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Coins, Rocket, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LimboGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

const BET_AMOUNTS = [25, 50, 100, 250, 500];
const MULTIPLIER_PRESETS = [1.2, 1.5, 2.0, 5.0, 10.0, 50.0, 100.0];

export const LimboGame: React.FC<LimboGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [betIndex, setBetIndex] = useState(1);
  const [customBet, setCustomBet] = useState<number | null>(null);
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0);
  
  const [isRolling, setIsRolling] = useState(false);
  const [displayMultiplier, setDisplayMultiplier] = useState<number>(1.0);
  const [lastOutcome, setLastOutcome] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [history, setHistory] = useState<number[]>([1.45, 3.22, 1.08, 12.5, 2.15]);

  const currentBet = customBet !== null ? customBet : BET_AMOUNTS[betIndex];
  const winChance = Math.min(95, Math.max(0.01, +(95 / targetMultiplier).toFixed(2)));
  const potentialProfit = Math.floor(currentBet * targetMultiplier);

  const handleLaunch = () => {
    if (isRolling || !user) return;
    if (user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    soundManager.vibrate([20, 40]);
    setIsRolling(true);
    setIsWin(null);

    // Calculate outcome using classic Limbo curve: 95% RTP
    const rand = Math.random();
    let outcome = 0.95 / (1 - rand);
    if (outcome < 1.0) outcome = 1.0;
    if (outcome > 10000.0) outcome = 10000.0;
    // Round to 2 decimal places
    outcome = Math.round(outcome * 100) / 100;

    const won = outcome >= targetMultiplier;

    // Fast ticker animation
    let start = 1.0;
    const end = outcome;
    const duration = 750;
    const startTime = performance.now();

    const updateTicker = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Exponential tick feeling
      const currentVal = start + (end - start) * Math.pow(progress, 2);
      setDisplayMultiplier(Math.round(currentVal * 100) / 100);

      if (progress < 1) {
        requestAnimationFrame(updateTicker);
      } else {
        setDisplayMultiplier(end);
        setLastOutcome(end);
        setIsWin(won);
        setIsRolling(false);
        setHistory((prev) => [end, ...prev.slice(0, 6)]);

        if (won) {
          soundManager.playCoin();
          soundManager.playBigWin();
          soundManager.vibrate([40, 80, 40, 80]);
          if (targetMultiplier >= 5) {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.55 } });
          }
          recordGameResult('limbo', currentBet, potentialProfit, targetMultiplier);
        } else {
          soundManager.playExplosion();
          soundManager.vibrate([80]);
          recordGameResult('limbo', currentBet, 0, 0);
        }
      }
    };

    requestAnimationFrame(updateTicker);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24 text-white">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> В меню
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-200">Баланс:</span>
          <div
            onClick={onOpenBank}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-sm cursor-pointer active:scale-95 transition-transform"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{(user?.coins || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Title Card */}
      <div className="w-full bg-gradient-to-r from-emerald-500/20 via-cyan-600/20 to-blue-600/20 border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-inner">
            ⚡
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
              Лимбо (Limbo) <span className="text-xs text-emerald-400 font-black">до x10 000</span>
            </h2>
            <p className="text-[11px] text-cyan-200 font-medium">
              Установи цель и запусти реактивный множитель!
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-white/60 uppercase font-bold block">Шанс победы</span>
          <span className="text-xs font-black text-emerald-300">{winChance}%</span>
        </div>
      </div>

      {/* History Ribbon */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <span className="text-[10px] font-bold text-white/40 uppercase mr-1">История:</span>
        {history.map((val, i) => (
          <div
            key={i}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
              val >= 2.0
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            {val.toFixed(2)}x
          </div>
        ))}
      </div>

      {/* Main Limbo Multiplier Screen */}
      <div className={`w-full relative min-h-[170px] rounded-3xl border-2 flex flex-col items-center justify-center p-6 shadow-2xl transition-all duration-300 overflow-hidden ${
        isWin === true
          ? 'bg-gradient-to-b from-emerald-950 via-[#072418] to-black border-emerald-400/80 shadow-emerald-500/30'
          : isWin === false
          ? 'bg-gradient-to-b from-rose-950 via-[#270c14] to-black border-rose-500/60 shadow-rose-500/20'
          : 'bg-gradient-to-b from-cyan-950 via-[#0a1628] to-[#050b14] border-cyan-500/40 shadow-cyan-500/10'
      }`}>
        {/* Cyber Neon Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Target Badge */}
        <div className="mb-2 flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-white/80">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Цель:</span>
          <span className="text-amber-400 font-extrabold">{targetMultiplier.toFixed(2)}x</span>
        </div>

        {/* Big Animated Multiplier Display */}
        <div className="flex items-baseline gap-1 select-none">
          <span
            className={`text-6xl sm:text-7xl font-black tracking-tight drop-shadow-lg transition-colors ${
              isWin === true
                ? 'text-emerald-400 animate-pulse'
                : isWin === false
                ? 'text-rose-400'
                : 'text-white'
            }`}
          >
            {displayMultiplier.toFixed(2)}
          </span>
          <span className="text-3xl font-extrabold text-cyan-300">x</span>
        </div>

        {/* Outcome Message */}
        <div className="mt-2 min-h-[22px] flex items-center">
          {isWin === true && (
            <span className="text-xs font-black text-emerald-300 bg-emerald-900/60 px-3 py-0.5 rounded-full border border-emerald-400/40">
              🎉 ВЫИГРЫШ: +{potentialProfit.toLocaleString()} 🪙!
            </span>
          )}
          {isWin === false && (
            <span className="text-xs font-black text-rose-300 bg-rose-900/60 px-3 py-0.5 rounded-full border border-rose-400/40">
              💥 Меньше цели ({lastOutcome?.toFixed(2)}x)!
            </span>
          )}
          {isWin === null && !isRolling && (
            <span className="text-xs font-bold text-white/50">
              Нажмите «Запуск» для броска
            </span>
          )}
          {isRolling && (
            <span className="text-xs font-bold text-cyan-300 animate-pulse flex items-center gap-1">
              <Rocket className="w-3.5 h-3.5 animate-bounce" /> Разгон множителя...
            </span>
          )}
        </div>
      </div>

      {/* Target Multiplier Settings */}
      <div className="w-full bg-purple-950/40 border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-purple-200 uppercase tracking-wider">
            Целевой множитель
          </span>
          <span className="text-xs font-black text-cyan-300">
            Шанс: {winChance}%
          </span>
        </div>

        {/* Multiplier Presets */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {MULTIPLIER_PRESETS.map((m) => (
            <button
              key={m}
              disabled={isRolling}
              onClick={() => {
                soundManager.playClick();
                setTargetMultiplier(m);
              }}
              className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                targetMultiplier === m
                  ? 'bg-cyan-400 text-purple-950 shadow-md scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {m.toFixed(1)}x
            </button>
          ))}
        </div>

        {/* Custom Multiplier Input / Slider */}
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min="1.05"
            max="20.0"
            step="0.05"
            disabled={isRolling}
            value={Math.min(targetMultiplier, 20)}
            onChange={(e) => setTargetMultiplier(parseFloat(e.target.value))}
            className="flex-1 accent-cyan-400 h-2 bg-black/40 rounded-lg cursor-pointer"
          />
          <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-xl border border-white/10 text-xs font-extrabold text-cyan-300">
            <span>{targetMultiplier.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      {/* Bet Control Panel */}
      <div className="w-full bg-purple-950/40 border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-purple-200 uppercase tracking-wider">
            Размер ставки
          </span>
          <span className="text-xs font-black text-amber-300">
            Возможный куш: +{potentialProfit.toLocaleString()} 🪙
          </span>
        </div>

        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {BET_AMOUNTS.map((amt, idx) => (
            <button
              key={amt}
              disabled={isRolling}
              onClick={() => {
                soundManager.playClick();
                setBetIndex(idx);
                setCustomBet(null);
              }}
              className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                customBet === null && betIndex === idx
                  ? 'bg-amber-400 text-purple-950 shadow-md scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Modifier Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={isRolling}
            onClick={() => {
              soundManager.playClick();
              const newBet = Math.max(10, Math.floor(currentBet / 2));
              setCustomBet(newBet);
            }}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          >
            ½ ставки
          </button>
          <button
            disabled={isRolling}
            onClick={() => {
              soundManager.playClick();
              const newBet = Math.min(user?.coins || 10000, currentBet * 2);
              setCustomBet(newBet);
            }}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          >
            2X ставка
          </button>
          <button
            disabled={isRolling}
            onClick={() => {
              soundManager.playClick();
              if (user) {
                setCustomBet(Math.min(user.coins, 5000));
              }
            }}
            className="flex-1 py-1.5 bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:bg-amber-500/40 rounded-xl text-xs font-black transition-all active:scale-95"
          >
            MAX
          </button>
        </div>

        {/* Action Button */}
        <button
          disabled={isRolling}
          onClick={handleLaunch}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-purple-950 font-black text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Rocket className="w-5 h-5 fill-current" />
          {isRolling ? 'Полёт...' : `Запуск (Выигрыш +${potentialProfit.toLocaleString()} 🪙)`}
        </button>
      </div>
    </div>
  );
};
