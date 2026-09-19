import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Shield, Sparkles, KeyRound, Lock, Unlock, RotateCcw, Delete, ChevronUp, ChevronDown, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SafeGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface TierConfig {
  id: 'office' | 'bank' | 'vip';
  title: string;
  digits: number;
  maxAttempts: number;
  multiplier: number;
  badge: string;
  color: string;
}

const TIERS: TierConfig[] = [
  { id: 'office', title: 'Офисный Сейф', digits: 3, maxAttempts: 6, multiplier: 8.0, badge: 'Легко (3 цифры)', color: 'from-emerald-600 to-teal-800 border-emerald-400' },
  { id: 'bank', title: 'Банковский Сейф', digits: 4, maxAttempts: 7, multiplier: 25.0, badge: 'Средне (4 цифры)', color: 'from-blue-600 to-indigo-800 border-blue-400' },
  { id: 'vip', title: 'Швейцарский VIP', digits: 5, maxAttempts: 8, multiplier: 100.0, badge: 'Эксперт (5 цифр)', color: 'from-amber-600 to-purple-800 border-amber-400' },
];

const BET_OPTIONS = [50, 100, 250, 500, 1000, 2500, 5000];

type Comparison = 'exact' | 'higher' | 'lower';

interface AttemptResult {
  guess: number[];
  feedback: Comparison[];
}

export const SafeGame: React.FC<SafeGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [selectedTier, setSelectedTier] = useState<TierConfig>(TIERS[0]);
  const [bet, setBet] = useState(100);
  const [stage, setStage] = useState<'BET' | 'PLAYING' | 'WON' | 'LOST'>('BET');

  const [secretCode, setSecretCode] = useState<number[]>([]);
  const [currentInput, setCurrentInput] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);

  const attemptsLeft = selectedTier.maxAttempts - attempts.length;

  // Start Crack Attempt
  const handleStart = () => {
    if (!user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playTumblerClick();
    // Generate secret random code of N digits (0..9)
    const secret = Array.from({ length: selectedTier.digits }, () => Math.floor(Math.random() * 10));
    setSecretCode(secret);
    setCurrentInput([]);
    setAttempts([]);
    setStage('PLAYING');
  };

  // Keypad press
  const handleKeyPress = (num: number) => {
    if (stage !== 'PLAYING') return;
    if (currentInput.length >= selectedTier.digits) return;

    soundManager.playKeypadBeep();
    setCurrentInput((prev) => [...prev, num]);
  };

  // Delete digit
  const handleDelete = () => {
    if (stage !== 'PLAYING' || currentInput.length === 0) return;
    soundManager.playClick();
    setCurrentInput((prev) => prev.slice(0, -1));
  };

  // Submit combination
  const handleSubmitGuess = () => {
    if (stage !== 'PLAYING') return;
    if (currentInput.length !== selectedTier.digits) return;

    soundManager.playTumblerClick();

    const feedback: Comparison[] = currentInput.map((digit, idx) => {
      if (digit === secretCode[idx]) return 'exact';
      if (digit < secretCode[idx]) return 'higher'; // Secret digit is higher
      return 'lower';                              // Secret digit is lower
    });

    const newAttempt: AttemptResult = {
      guess: [...currentInput],
      feedback,
    };

    const newAttempts = [newAttempt, ...attempts];
    setAttempts(newAttempts);
    setCurrentInput([]);

    const isAllExact = feedback.every((f) => f === 'exact');

    if (isAllExact) {
      // VICTORY: Vault cracked!
      setStage('WON');
      soundManager.playVaultUnlock();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
      });
      const winAmount = Math.floor(bet * selectedTier.multiplier);
      recordGameResult('vault_cracker', bet, winAmount, selectedTier.multiplier);
    } else if (newAttempts.length >= selectedTier.maxAttempts) {
      // DEFEAT: Out of attempts
      setStage('LOST');
      soundManager.playLoss();
      recordGameResult('vault_cracker', bet, 0, 0);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-2.5 px-2.5 py-1 animate-fadeIn pb-24 select-none">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 px-3 py-1.5 rounded-xl border border-purple-400/30 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> В лобби
        </button>

        <div className="flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Взлом Сейфа (x{selectedTier.multiplier})
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-2.5 py-1 rounded-xl border border-purple-400/30">
          {formatCoins(user?.coins)} 🪙
        </div>
      </div>

      {/* Tier Tabs (Only in BET mode) */}
      {stage === 'BET' && (
        <div className="w-full grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-2xl border border-purple-500/30">
          {TIERS.map((tier) => {
            const isSelected = selectedTier.id === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedTier(tier);
                }}
                className={`py-1.5 px-2 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? `bg-gradient-to-br ${tier.color} text-white shadow-lg border scale-[1.02]`
                    : 'bg-purple-950/40 text-purple-300 border border-purple-500/20 opacity-70 hover:opacity-100'
                }`}
              >
                <span className="text-[11px] font-black uppercase leading-tight line-clamp-1">
                  {tier.title.split(' ')[0]}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  x{tier.multiplier} ({tier.digits} цифр)
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Vault Door Container */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#1b222c] via-[#0f141c] to-[#070a0f] border-2 border-slate-500/50 p-3.5 shadow-2xl flex flex-col items-center gap-3 min-h-[220px] justify-between relative overflow-hidden">
        {/* Steel Rivets Trim */}
        <div className="w-full flex items-center justify-between text-slate-500 text-[9px] px-1">
          <span>● ● ● СЕЙФ ВЫСОКОЙ БЕЗОПАСНОСТИ ● ● ●</span>
          <span className="font-mono font-bold text-amber-400">
            {stage === 'PLAYING' ? `ПОПЫТКИ: ${attemptsLeft}/${selectedTier.maxAttempts}` : `МАКС: ${selectedTier.maxAttempts} ПОПЫТОК`}
          </span>
        </div>

        {/* Central Vault Dial / Status */}
        <div className="relative flex flex-col items-center justify-center my-auto">
          {/* Wheel Ring */}
          <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl ${
            stage === 'WON'
              ? 'border-emerald-400 bg-emerald-950/60 shadow-emerald-500/40 scale-105'
              : stage === 'LOST'
              ? 'border-rose-500 bg-rose-950/60 shadow-rose-500/40'
              : 'border-amber-400/60 bg-slate-900/80 shadow-amber-500/20'
          }`}>
            {stage === 'WON' ? (
              <div className="flex flex-col items-center text-center animate-bounce">
                <Unlock className="w-10 h-10 text-emerald-400 stroke-[2.5]" />
                <span className="text-[10px] font-black text-amber-300 uppercase mt-0.5">ВЗЛОМАН!</span>
              </div>
            ) : stage === 'LOST' ? (
              <div className="flex flex-col items-center text-center">
                <Lock className="w-10 h-10 text-rose-400 stroke-[2.5]" />
                <span className="text-[9px] font-black text-rose-300 uppercase mt-0.5">БЛОКИРОВКА</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <Shield className="w-9 h-9 text-amber-400 stroke-[2]" />
                <span className="text-[9px] font-mono font-black text-amber-300 mt-0.5">
                  x{selectedTier.multiplier}
                </span>
              </div>
            )}
          </div>

          {/* Winning / Lost Message */}
          {stage === 'WON' && (
            <div className="mt-2 text-center">
              <span className="text-xs text-emerald-300 font-bold block">Сейф открыт! Награда:</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                +{formatCoins(Math.floor(bet * selectedTier.multiplier))} 🪙
              </span>
            </div>
          )}

          {stage === 'LOST' && (
            <div className="mt-2 text-center">
              <span className="text-xs text-rose-300 font-bold block">Секретный код был:</span>
              <div className="flex items-center gap-1.5 justify-center mt-1">
                {secretCode.map((d, i) => (
                  <span key={i} className="w-6 h-6 rounded-lg bg-rose-900/80 border border-rose-400 text-white font-mono font-black text-sm flex items-center justify-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Digit Input Slots */}
        {stage === 'PLAYING' && (
          <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex items-center gap-2 justify-center">
              {Array.from({ length: selectedTier.digits }).map((_, idx) => {
                const val = currentInput[idx];
                const isCurrent = currentInput.length === idx;

                return (
                  <div
                    key={idx}
                    className={`w-10 h-12 rounded-xl flex items-center justify-center font-mono font-black text-xl border transition-all ${
                      val !== undefined
                        ? 'bg-amber-400/20 border-amber-300 text-amber-300 shadow-md'
                        : isCurrent
                        ? 'bg-black/60 border-amber-400 ring-2 ring-amber-400/50 text-white animate-pulse'
                        : 'bg-black/40 border-slate-600 text-slate-500'
                    }`}
                  >
                    {val !== undefined ? val : '_'}
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              Введи {selectedTier.digits} цифр и нажми ПРОВЕРИТЬ
            </span>
          </div>
        )}

        {/* History of Previous Attempts */}
        {attempts.length > 0 && stage === 'PLAYING' && (
          <div className="w-full max-h-24 overflow-y-auto rounded-xl bg-black/50 border border-slate-700/50 p-1.5 flex flex-col gap-1 no-scrollbar">
            {attempts.map((att, attIdx) => (
              <div key={attIdx} className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs">
                <span className="text-[10px] text-slate-400 font-bold">#{attempts.length - attIdx}:</span>
                <div className="flex items-center gap-1.5">
                  {att.guess.map((digit, dIdx) => {
                    const fb = att.feedback[dIdx];
                    return (
                      <div
                        key={dIdx}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black border ${
                          fb === 'exact'
                            ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                            : fb === 'higher'
                            ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                            : 'bg-amber-600/30 border-amber-400 text-amber-300'
                        }`}
                      >
                        <span>{digit}</span>
                        {fb === 'exact' ? (
                          <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
                        ) : fb === 'higher' ? (
                          <ChevronUp className="w-3 h-3 text-blue-300 stroke-[3]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-amber-300 stroke-[3]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control Keypad / Bet Area */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2">
        {stage === 'PLAYING' ? (
          <div className="flex flex-col gap-1.5">
            {/* 3x4 Digital Keypad */}
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  disabled={currentInput.length >= selectedTier.digits}
                  className="py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-600 text-white font-mono font-black text-lg active:scale-95 transition-all shadow disabled:opacity-40"
                >
                  {num}
                </button>
              ))}

              {/* Backspace */}
              <button
                onClick={handleDelete}
                disabled={currentInput.length === 0}
                className="py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 flex items-center justify-center active:scale-95 transition-all shadow disabled:opacity-30"
              >
                <Delete className="w-5 h-5" />
              </button>

              {/* Zero */}
              <button
                onClick={() => handleKeyPress(0)}
                disabled={currentInput.length >= selectedTier.digits}
                className="py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-600 text-white font-mono font-black text-lg active:scale-95 transition-all shadow disabled:opacity-40"
              >
                0
              </button>

              {/* Submit Guess */}
              <button
                onClick={handleSubmitGuess}
                disabled={currentInput.length !== selectedTier.digits}
                className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-purple-950 font-black text-xs flex items-center justify-center uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                ПРОВЕРИТЬ
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {stage !== 'BET' && (
              <button
                onClick={handleStart}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 font-black text-base shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                СЫГРАТЬ ЕЩЁ ({formatCoins(bet)} 🪙)
              </button>
            )}

            {stage === 'BET' && (
              <div className="flex items-center gap-2">
                {/* Bet Selector */}
                <div className="flex items-center gap-1.5 bg-black/40 border border-purple-400/30 rounded-2xl px-3 py-1.5">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      const curIdx = BET_OPTIONS.indexOf(bet);
                      if (curIdx > 0) setBet(BET_OPTIONS[curIdx - 1]);
                      else setBet(Math.max(10, bet - 50));
                    }}
                    className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-amber-300 text-sm min-w-[3.5rem] text-center">
                    {formatCoins(bet)}
                  </span>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      const curIdx = BET_OPTIONS.indexOf(bet);
                      if (curIdx !== -1 && curIdx < BET_OPTIONS.length - 1) setBet(BET_OPTIONS[curIdx + 1]);
                      else setBet(bet + 100);
                    }}
                    className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
                  >
                    +
                  </button>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStart}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 font-black text-base shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  ВЗЛОМАТЬ СЕЙФ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
