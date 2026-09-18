import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Dices } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DiceGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type BetChoice = 'under' | 'seven' | 'over' | 'double' | 'snake_eyes' | 'double_six';

const BET_OPTIONS: { id: BetChoice; label: string; mult: number; desc: string }[] = [
  { id: 'under', label: 'Меньше 7', mult: 2.0, desc: 'Сумма 2..6' },
  { id: 'seven', label: 'Ровно 7', mult: 5.8, desc: 'Сумма ровно 7' },
  { id: 'over', label: 'Больше 7', mult: 2.0, desc: 'Сумма 8..12' },
  { id: 'double', label: 'Любой Дубль', mult: 5.0, desc: 'Одинаковые кости' },
  { id: 'snake_eyes', label: '1 - 1 (Змея)', mult: 30.0, desc: 'Выпадет 1 и 1' },
  { id: 'double_six', label: '6 - 6 (Шестёрки)', mult: 30.0, desc: 'Выпадет 6 и 6' },
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const DiceGame: React.FC<DiceGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [die1, setDie1] = useState(3);
  const [die2, setDie2] = useState(4);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetChoice>('under');
  const [bet, setBet] = useState(50);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleRoll = () => {
    if (isRolling || !user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    setIsRolling(true);
    setResultMessage(null);

    // Roll animation intervals
    let rolls = 0;
    const interval = setInterval(() => {
      setDie1(Math.floor(Math.random() * 6) + 1);
      setDie2(Math.floor(Math.random() * 6) + 1);
      soundManager.playClick();
      rolls++;
      if (rolls >= 10) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, 80);
  };

  const finalizeRoll = () => {
    const final1 = Math.floor(Math.random() * 6) + 1;
    const final2 = Math.floor(Math.random() * 6) + 1;
    const sum = final1 + final2;

    setDie1(final1);
    setDie2(final2);
    setIsRolling(false);
    soundManager.playReelStop(0);

    // Evaluate bet
    let won = false;
    let mult = 0;

    const opt = BET_OPTIONS.find((b) => b.id === selectedBet)!;

    if (selectedBet === 'under' && sum < 7) won = true;
    if (selectedBet === 'seven' && sum === 7) won = true;
    if (selectedBet === 'over' && sum > 7) won = true;
    if (selectedBet === 'double' && final1 === final2) won = true;
    if (selectedBet === 'snake_eyes' && final1 === 1 && final2 === 1) won = true;
    if (selectedBet === 'double_six' && final1 === 6 && final2 === 6) won = true;

    mult = opt.mult;

    if (won) {
      const winAmount = Math.floor(bet * mult);
      setResultMessage(`🎉 ВЫИГРЫШ! Сумма ${sum} (+${winAmount} 🪙)`);
      if (mult >= 5.0) {
        soundManager.playBigWin();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      } else {
        soundManager.playWin();
      }
      recordGameResult('dice', bet, winAmount, mult);
    } else {
      setResultMessage(`Выпала сумма ${sum} (${final1} + ${final2}). Попробуйте ещё!`);
      recordGameResult('dice', bet, 0, 0);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 px-3 py-1.5 rounded-full border border-purple-400/30 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <div className="flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Кости (Dice)
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* Dice Arena */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#1b082e] via-[#10031d] to-[#08010f] border-2 border-amber-400/40 p-5 shadow-2xl flex flex-col items-center justify-center gap-3 min-h-[190px]">
        {/* Sum Indicator */}
        <div className="text-xs font-bold text-purple-200 uppercase tracking-widest bg-purple-900/60 px-4 py-0.5 rounded-full border border-purple-400/30">
          Сумма: <span className="text-amber-300 font-mono font-black text-sm">{die1 + die2}</span>
        </div>

        {/* The Two 3D Cartoon Dice */}
        <div className="flex items-center gap-5 my-1">
          <div
            className={`w-20 h-20 rounded-2xl bg-white border-2 border-amber-400/80 shadow-2xl flex items-center justify-center text-6xl !text-black font-mono select-none transition-transform ${
              isRolling ? 'rotate-12 scale-110' : ''
            }`}
          >
            <span className="!text-black">{DICE_FACES[die1 - 1]}</span>
          </div>

          <div
            className={`w-20 h-20 rounded-2xl bg-white border-2 border-amber-400/80 shadow-2xl flex items-center justify-center text-6xl !text-black font-mono select-none transition-transform ${
              isRolling ? '-rotate-12 scale-110' : ''
            }`}
          >
            <span className="!text-black">{DICE_FACES[die2 - 1]}</span>
          </div>
        </div>

        {/* Result banner */}
        {resultMessage && (
          <div className="bg-black/70 border border-amber-400 rounded-2xl py-1 px-4 text-center font-black text-xs text-amber-300 uppercase shadow animate-bounce">
            {resultMessage}
          </div>
        )}
      </div>

      {/* Betting Markets Grid */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        <span className="text-[10px] font-bold text-purple-300 uppercase text-left px-1">
          Выберите ставку:
        </span>

        <div className="grid grid-cols-3 gap-2">
          {BET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              disabled={isRolling}
              onClick={() => {
                soundManager.playClick();
                setSelectedBet(opt.id);
              }}
              className={`p-2 rounded-2xl flex flex-col items-center justify-center border text-center transition-all ${
                selectedBet === opt.id
                  ? 'bg-amber-400 text-purple-950 border-white shadow-md scale-105'
                  : 'bg-black/30 border-purple-400/30 text-white hover:bg-white/5'
              }`}
            >
              <span className="font-extrabold text-xs">{opt.label}</span>
              <span className={`font-mono font-black text-[11px] ${selectedBet === opt.id ? 'text-purple-950' : 'text-amber-300'}`}>
                x{opt.mult.toFixed(1)}
              </span>
              <span className={`text-[9px] font-bold ${selectedBet === opt.id ? 'text-purple-900' : 'text-purple-300'}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Bet & Roll Controls */}
        <div className="flex items-center gap-2.5 mt-1">
          <div className="flex items-center gap-1 bg-black/40 border border-purple-400/30 rounded-2xl px-2.5 py-2">
            <button
              disabled={isRolling}
              onClick={() => setBet(Math.max(10, bet - 25))}
              className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90 disabled:opacity-40"
            >
              -
            </button>
            <span className="font-mono font-black text-amber-300 text-sm min-w-[2.5rem] text-center">
              {bet}
            </span>
            <button
              disabled={isRolling}
              onClick={() => setBet(bet + 25)}
              className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90 disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            disabled={isRolling}
            onClick={handleRoll}
            className="cartoon-btn btn-spin flex-1 py-3 text-base font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Dices className="w-5 h-5" />
            <span>{isRolling ? 'БРОСАЕМ...' : `БРОСИТЬ (${bet} 🪙)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
