import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Plus, RotateCcw, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SicBoGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type BetType = 'small' | 'big' | 'even' | 'odd' | 'any_triple' | 'triple_6' | 'sum_9_12' | 'sum_other';

interface BetOption {
  id: BetType;
  label: string;
  sub: string;
  multiplier: number;
}

const BET_OPTIONS: BetOption[] = [
  { id: 'small', label: 'МАЛОЕ', sub: 'Сумма 4-10', multiplier: 2.0 },
  { id: 'big', label: 'БОЛЬШОЕ', sub: 'Сумма 11-17', multiplier: 2.0 },
  { id: 'even', label: 'ЧЁТ', sub: 'Чётная сумма', multiplier: 2.0 },
  { id: 'odd', label: 'НЕЧЁТ', sub: 'Нечётная сумма', multiplier: 2.0 },
  { id: 'sum_9_12', label: 'СУММА 9-12', sub: 'Средние очки', multiplier: 7.0 },
  { id: 'any_triple', label: 'ЛЮБАЯ ТРОЙКА', sub: 'Три одинаковых', multiplier: 31.0 },
  { id: 'triple_6', label: 'ТРОЙКА 6-6-6', sub: '★ ДЖЕКПОТ ★', multiplier: 181.0 },
];

const CHIP_VALUES = [50, 100, 500, 1000, 5000];

export const SicBoGame: React.FC<SicBoGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<Record<BetType, number>>({
    small: 0,
    big: 0,
    even: 0,
    odd: 0,
    any_triple: 0,
    triple_6: 0,
    sum_9_12: 0,
    sum_other: 0,
  });

  const [dice, setDice] = useState<[number, number, number]>([3, 4, 5]);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningBets, setWinningBets] = useState<BetType[]>([]);
  const [history, setHistory] = useState<number[]>([12, 9, 15, 7, 11]);
  const [statusText, setStatusText] = useState<string>('Сделайте ставки на столе и нажмите «Бросить»!');

  const totalBet = Object.values(bets).reduce((sum, v) => sum + v, 0);

  const handlePlaceBet = (betId: BetType) => {
    if (isShaking) return;
    if (!user || user.coins < totalBet + selectedChip) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }
    soundManager.playClick();
    setBets(prev => ({
      ...prev,
      [betId]: prev[betId] + selectedChip,
    }));
  };

  const handleClearBets = () => {
    if (isShaking) return;
    soundManager.playClick();
    setBets({
      small: 0,
      big: 0,
      even: 0,
      odd: 0,
      any_triple: 0,
      triple_6: 0,
      sum_9_12: 0,
      sum_other: 0,
    });
  };

  const handleRoll = async () => {
    if (isShaking) return;
    if (totalBet <= 0) {
      soundManager.playReelStop(0);
      setStatusText('Сначала поставьте хотя бы одну фишку на стол!');
      return;
    }
    if (!user || user.coins < totalBet) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    setIsShaking(true);
    setWinningBets([]);
    setLastWin(0);
    setStatusText('Кости перемешиваются в куполе...');

    soundManager.playDiceShaker();

    // Roll 3 random dice
    const roll1 = Math.floor(1 + Math.random() * 6);
    const roll2 = Math.floor(1 + Math.random() * 6);
    const roll3 = Math.floor(1 + Math.random() * 6);

    setTimeout(async () => {
      setDice([roll1, roll2, roll3]);
      const sum = roll1 + roll2 + roll3;
      const isTriple = roll1 === roll2 && roll2 === roll3;

      const wonList: BetType[] = [];

      // Determine winning bet types
      if (!isTriple) {
        if (sum >= 4 && sum <= 10) wonList.push('small');
        if (sum >= 11 && sum <= 17) wonList.push('big');
        if (sum % 2 === 0) wonList.push('even');
        if (sum % 2 !== 0) wonList.push('odd');
      }

      if (sum >= 9 && sum <= 12) {
        wonList.push('sum_9_12');
      }

      if (isTriple) {
        wonList.push('any_triple');
        if (roll1 === 6) {
          wonList.push('triple_6');
        }
      }

      setWinningBets(wonList);
      setHistory(prev => [sum, ...prev.slice(0, 5)]);

      // Calculate total payout
      let payout = 0;
      wonList.forEach(wId => {
        const option = BET_OPTIONS.find(o => o.id === wId);
        const betOnThis = bets[wId] || 0;
        if (option && betOnThis > 0) {
          payout += Math.floor(betOnThis * option.multiplier);
        }
      });

      setLastWin(payout);

      if (payout > 0) {
        const bestMultiplier = Math.max(...wonList.map(wId => BET_OPTIONS.find(o => o.id === wId)?.multiplier || 0));
        soundManager.playBigWin();
        if (payout >= totalBet * 5 || isTriple) {
          confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 } });
        }
        setStatusText(`🎉 ВЫИГРЫШ: +${formatCoins(payout)} 🪙! (Кости: ${roll1}-${roll2}-${roll3}, Сумма: ${sum})`);
        await recordGameResult('sicbo', totalBet, payout, bestMultiplier);
      } else {
        soundManager.playReelStop(0);
        setStatusText(`Кости: ${roll1}-${roll2}-${roll3} (Сумма: ${sum}). Попробуйте снова!`);
        await recordGameResult('sicbo', totalBet, 0, 0);
      }

      setIsShaking(false);
    }, 750);
  };

  const getDicePipEmoji = (val: number) => {
    switch (val) {
      case 1: return '⚀';
      case 2: return '⚁';
      case 3: return '⚂';
      case 4: return '⚃';
      case 5: return '⚄';
      case 6: return '⚅';
      default: return '⚀';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#10061e] text-white select-none overflow-hidden relative font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1b0833] border-b border-purple-900/60 z-20 flex-shrink-0">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="p-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 active:scale-95 text-purple-200 border border-purple-700/50 flex items-center gap-1 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> В лобби
        </button>

        <div className="flex flex-col items-center">
          <div className="text-base font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5 drop-shadow">
            🎲 Сик Бо
            <span className="text-[10px] bg-amber-500 text-purple-950 font-black px-1.5 py-0.2 rounded-full">
              до x181
            </span>
          </div>
          <div className="text-[10px] text-purple-300 font-semibold tracking-wide">
            Тройные Кости Макао
          </div>
        </div>

        {/* Coins Balance */}
        <div
          onClick={onOpenBank}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 text-amber-300 font-black text-xs cursor-pointer active:scale-95 transition-all shadow-inner"
        >
          <span>🪙</span>
          <span>{formatCoins(user?.coins ?? 0)}</span>
          <Plus className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 relative flex flex-col justify-between p-2.5 overflow-hidden bg-gradient-to-b from-[#17072c] via-[#210940] to-[#10061e]">
        {/* Shaker Dome Area */}
        <div className="flex flex-col items-center justify-center my-0.5 z-10">
          {/* History Pill */}
          <div className="flex items-center gap-1.5 mb-1.5 bg-black/40 px-2.5 py-0.5 rounded-full border border-purple-800/40 text-[10px] font-bold text-purple-300">
            <span>Суммы:</span>
            {history.map((h, idx) => (
              <span key={idx} className="text-amber-400 font-mono">[{h}]</span>
            ))}
          </div>

          {/* Transparent Glass Dome */}
          <div className="relative w-44 h-28 rounded-t-full bg-gradient-to-b from-cyan-400/20 via-purple-500/10 to-transparent border-t-2 border-x-2 border-cyan-300/40 shadow-[0_0_25px_rgba(6,182,212,0.25)] flex items-center justify-center overflow-hidden">
            {/* Glass Glare Reflections */}
            <div className="absolute top-2 inset-x-6 h-3 bg-white/25 rounded-full blur-[1px] pointer-events-none" />

            {/* 3 Physical Dice Inside Dome */}
            <div className={`flex items-center justify-center gap-2.5 transition-transform duration-200 ${
              isShaking ? 'animate-bounce scale-110' : ''
            }`}>
              {dice.map((dVal, idx) => (
                <div
                  key={idx}
                  className={`w-11 h-11 rounded-2xl bg-white border-2 border-amber-300 text-slate-950 font-black text-3xl shadow-2xl flex items-center justify-center transition-all ${
                    isShaking ? 'rotate-45' : 'rotate-0'
                  }`}
                >
                  <span className={dVal === 1 || dVal === 4 ? 'text-rose-600' : 'text-slate-950'}>
                    {getDicePipEmoji(dVal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Glowing Shaker Base Plate */}
            <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 border-t border-amber-200" />
          </div>

          {/* Sum Banner */}
          <div className={`px-3 py-0.5 -mt-1 rounded-full border text-[11px] font-black shadow-md ${
            lastWin > 0
              ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105 animate-pulse'
              : 'bg-black/70 border-amber-400/50 text-amber-300'
          }`}>
            {lastWin > 0
              ? `★ ВЫИГРЫШ: +${formatCoins(lastWin)} 🪙 ★`
              : `Сумма очков: ${dice[0] + dice[1] + dice[2]}`}
          </div>
        </div>

        {/* Status Callout Banner */}
        <div className="self-center z-10 my-0.5">
          <div className="px-3 py-1 rounded-full bg-black/60 border border-purple-500/40 text-xs font-bold text-purple-200 text-center shadow-md">
            {statusText}
          </div>
        </div>

        {/* Interactive Macau Betting Board */}
        <div className="grid grid-cols-2 gap-1.5 w-full max-w-md mx-auto z-10">
          {BET_OPTIONS.map((opt) => {
            const currentBet = bets[opt.id] || 0;
            const isWinner = winningBets.includes(opt.id);

            return (
              <div
                key={opt.id}
                onClick={() => handlePlaceBet(opt.id)}
                className={`p-2 rounded-2xl border cursor-pointer transition-all active:scale-95 flex flex-col justify-between ${
                  isWinner
                    ? 'bg-amber-500/40 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse scale-[1.02]'
                    : currentBet > 0
                    ? 'bg-purple-900/60 border-amber-400/60 shadow-md'
                    : 'bg-[#1e0a38]/80 border-purple-700/40 hover:border-amber-400/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white tracking-wide">
                    {opt.label}
                  </span>
                  <span className="text-[10px] font-black text-amber-300 bg-black/40 px-1.5 py-0.2 rounded-lg border border-amber-400/30">
                    x{opt.multiplier}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-purple-300 font-semibold">
                    {opt.sub}
                  </span>
                  {currentBet > 0 && (
                    <span className="text-[10px] font-black text-amber-200 bg-amber-500/30 px-1.5 py-0.2 rounded-full border border-amber-400/50">
                      {formatCoins(currentBet)} 🪙
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls & Chips Area */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-1.5 z-20 mt-1">
          {/* Main Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isShaking || totalBet === 0}
              onClick={handleRoll}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-purple-950 font-black text-base shadow-xl border-2 border-amber-200 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>БРОСИТЬ КОСТИ ({formatCoins(totalBet)} 🪙)</span>
            </button>

            {totalBet > 0 && (
              <button
                type="button"
                disabled={isShaking}
                onClick={handleClearBets}
                className="py-3 px-3 rounded-2xl bg-rose-950/70 hover:bg-rose-900 border border-rose-600/40 text-rose-300 font-bold text-xs active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
                title="Очистить ставки"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Сброс</span>
              </button>
            )}
          </div>

          {/* Chip Presets Bar */}
          <div className="bg-[#190833]/95 p-1.5 rounded-2xl border border-purple-800/60 flex items-center justify-between gap-1 shadow-md">
            <span className="text-purple-300 font-bold uppercase text-[9px] tracking-wider pl-1">
              Фишка:
            </span>
            <div className="flex gap-1">
              {CHIP_VALUES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isShaking}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedChip(chip);
                  }}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-black transition-all border ${
                    selectedChip === chip
                      ? 'bg-amber-400 text-purple-950 border-amber-200 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 border-purple-800/50 hover:bg-purple-900'
                  }`}
                >
                  {chip >= 1000 ? `${chip / 1000}K` : chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
