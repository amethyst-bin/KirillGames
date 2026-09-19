import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Dices, RotateCcw, Sparkles, Trophy, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CrapsGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type BetType = 
  | 'pass_line' 
  | 'dont_pass' 
  | 'field' 
  | 'any_seven' 
  | 'any_craps' 
  | 'hard_4' 
  | 'hard_6' 
  | 'hard_8' 
  | 'hard_10';

interface BetConfig {
  name: string;
  payout: string;
  desc: string;
}

const BET_INFO: Record<BetType, BetConfig> = {
  pass_line: { name: 'Pass Line', payout: '1:1', desc: '7 или 11 = Победа! 2, 3, 12 = Проигрыш. Иначе число становится Пойнтом.' },
  dont_pass: { name: "Don't Pass", payout: '1:1', desc: '2 или 3 = Победа! 7 или 11 = Проигрыш. 12 = Возврат. Против стрелка.' },
  field: { name: 'Field (Поле)', payout: 'до 3:1', desc: 'Ставка на 1 бросок: 2 или 12 платят 2:1 / 3:1! 3, 4, 9, 10, 11 платят 1:1.' },
  any_seven: { name: 'Any Seven (7)', payout: '4:1', desc: 'Ставка на 1 бросок: выпадение любой семёрки (7).' },
  any_craps: { name: 'Any Craps (2,3,12)', payout: '7:1', desc: 'Ставка на 1 бросок: выпадение крэпса (2, 3 или 12).' },
  hard_4: { name: 'Hard 4 (2-2)', payout: '7:1', desc: 'Дубль 2 и 2 до выпадения обычной 4 или 7.' },
  hard_6: { name: 'Hard 6 (3-3)', payout: '9:1', desc: 'Дубль 3 и 3 до выпадения обычной 6 или 7.' },
  hard_8: { name: 'Hard 8 (4-4)', payout: '9:1', desc: 'Дубль 4 и 4 до выпадения обычной 8 или 7.' },
  hard_10: { name: 'Hard 10 (5-5)', payout: '7:1', desc: 'Дубль 5 и 5 до выпадения обычной 10 или 7.' },
};

const CHIPS = [10, 50, 100, 500, 1000];

// Pips positions on standard 6-sided die
const DIE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export const CrapsGame: React.FC<CrapsGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [point, setPoint] = useState<number | null>(null);
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const [bets, setBets] = useState<Partial<Record<BetType, number>>>({ pass_line: 50 });
  const [announcement, setAnnouncement] = useState<string>('Кости на столе! Сделайте ставки на Pass Line или Field');
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ d1: number; d2: number; sum: number; win: boolean }>>([
    { d1: 3, d2: 4, sum: 7, win: true },
    { d1: 5, d2: 3, sum: 8, win: false },
  ]);
  const [showRules, setShowRules] = useState(false);

  const rollTimeoutRef = useRef<number | null>(null);

  const totalBet = Object.values(bets).reduce((a, b) => (a || 0) + (b || 0), 0) || 0;

  // Add chip to a bet box
  const handleAddBet = (type: BetType) => {
    if (isRolling) return;
    if (point !== null && (type === 'pass_line' || type === 'dont_pass')) {
      setAnnouncement('Ставки на Pass Line фиксируются до определения Point!');
      soundManager.playClick();
      return;
    }
    soundManager.playChip();
    setBets((prev) => ({
      ...prev,
      [type]: (prev[type] || 0) + selectedChip,
    }));
  };

  // Clear bets
  const handleClearBets = () => {
    if (isRolling) return;
    soundManager.playClick();
    if (point !== null) {
      // Keep existing pass_line or dont_pass if point is active
      setBets((prev) => {
        const kept: Partial<Record<BetType, number>> = {};
        if (prev.pass_line) kept.pass_line = prev.pass_line;
        if (prev.dont_pass) kept.dont_pass = prev.dont_pass;
        return kept;
      });
      setAnnouncement('Сняты дополнительные ставки на один бросок');
    } else {
      setBets({});
      setAnnouncement('Ставки очищены. Выберите сектор');
    }
  };

  // Double bets
  const handleDoubleBets = () => {
    if (isRolling) return;
    soundManager.playChip();
    setBets((prev) => {
      const doubled: Partial<Record<BetType, number>> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (v) doubled[k as BetType] = v * 2;
      });
      return doubled;
    });
  };

  // Roll the dice
  const handleRoll = async () => {
    if (isRolling) return;
    if (totalBet <= 0) {
      setAnnouncement('Сделайте хотя бы одну ставку перед броском!');
      soundManager.playClick();
      return;
    }
    if (!user || user.coins < totalBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    setIsRolling(true);
    setLastWin(null);
    soundManager.playDiceShake();
    setAnnouncement('Бросок костей!..');

    // Simulate tumbling animation
    let ticks = 0;
    const interval = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
      ticks++;
      if (ticks >= 8) {
        clearInterval(interval);
      }
    }, 90);

    rollTimeoutRef.current = window.setTimeout(async () => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      setDice([d1, d2]);
      soundManager.playDiceTumble();

      let totalWinAmount = 0;
      let newPoint: number | null = point;
      let msg = `Выпало: ${d1} + ${d2} = ${sum}. `;
      const nextBets = { ...bets };

      // Evaluate One-Roll Bets
      // 1. Field Bet
      if (nextBets.field) {
        if ([3, 4, 9, 10, 11].includes(sum)) {
          totalWinAmount += nextBets.field * 2; // 1:1 profit
          msg += 'Поле выиграло (1:1)! ';
        } else if (sum === 2) {
          totalWinAmount += nextBets.field * 3; // 2:1 profit
          msg += 'Поле ДВОЙКА (2:1)! ';
        } else if (sum === 12) {
          totalWinAmount += nextBets.field * 4; // 3:1 profit
          msg += 'Поле ДВЕНАДЦАТЬ (3:1)! ';
        }
        delete nextBets.field;
      }

      // 2. Any Seven (4:1)
      if (nextBets.any_seven) {
        if (sum === 7) {
          totalWinAmount += nextBets.any_seven * 5;
          msg += 'Any 7 сыграло (4:1)! ';
        }
        delete nextBets.any_seven;
      }

      // 3. Any Craps (7:1)
      if (nextBets.any_craps) {
        if ([2, 3, 12].includes(sum)) {
          totalWinAmount += nextBets.any_craps * 8;
          msg += 'Any Craps сыграло (7:1)! ';
        }
        delete nextBets.any_craps;
      }

      // 4. Hardways
      if (nextBets.hard_4) {
        if (d1 === 2 && d2 === 2) {
          totalWinAmount += nextBets.hard_4 * 8;
          msg += 'Hard 4 Дубль (7:1)! ';
        } else if (sum === 7 || sum === 4) {
          delete nextBets.hard_4;
        }
      }
      if (nextBets.hard_6) {
        if (d1 === 3 && d2 === 3) {
          totalWinAmount += nextBets.hard_6 * 10;
          msg += 'Hard 6 Дубль (9:1)! ';
        } else if (sum === 7 || sum === 6) {
          delete nextBets.hard_6;
        }
      }
      if (nextBets.hard_8) {
        if (d1 === 4 && d2 === 4) {
          totalWinAmount += nextBets.hard_8 * 10;
          msg += 'Hard 8 Дубль (9:1)! ';
        } else if (sum === 7 || sum === 8) {
          delete nextBets.hard_8;
        }
      }
      if (nextBets.hard_10) {
        if (d1 === 5 && d2 === 5) {
          totalWinAmount += nextBets.hard_10 * 8;
          msg += 'Hard 10 Дубль (7:1)! ';
        } else if (sum === 7 || sum === 10) {
          delete nextBets.hard_10;
        }
      }

      // Evaluate Pass Line / Don't Pass
      if (point === null) {
        // Come-out Roll
        if (sum === 7 || sum === 11) {
          if (nextBets.pass_line) {
            totalWinAmount += nextBets.pass_line * 2;
            msg += 'Natural Win по Pass Line! ';
          }
          if (nextBets.dont_pass) {
            delete nextBets.dont_pass;
          }
        } else if (sum === 2 || sum === 3) {
          if (nextBets.pass_line) delete nextBets.pass_line;
          if (nextBets.dont_pass) {
            totalWinAmount += nextBets.dont_pass * 2;
            msg += "Craps! Don't Pass выиграл! ";
          }
        } else if (sum === 12) {
          if (nextBets.pass_line) delete nextBets.pass_line;
          if (nextBets.dont_pass) {
            totalWinAmount += nextBets.dont_pass; // Push (bar 12)
            msg += "Крэпс 12! Don't Pass Ничья. ";
          }
        } else {
          // Establish Point: 4, 5, 6, 8, 9, 10
          newPoint = sum;
          msg += `Установлен POINT = ${sum}! Продолжайте броски.`;
        }
      } else {
        // Point Phase
        if (sum === point) {
          // Point Hit! Pass line wins
          if (nextBets.pass_line) {
            totalWinAmount += nextBets.pass_line * 2;
            msg += `POINT ${point} ВЫБИТ! Победа Pass Line! `;
          }
          if (nextBets.dont_pass) delete nextBets.dont_pass;
          newPoint = null; // Reset to come-out
        } else if (sum === 7) {
          // Seven Out!
          if (nextBets.pass_line) delete nextBets.pass_line;
          if (nextBets.dont_pass) {
            totalWinAmount += nextBets.dont_pass * 2;
            msg += "SEVEN OUT! Don't Pass выиграл! ";
          } else {
            msg += 'SEVEN OUT! Раунд завершён.';
          }
          newPoint = null;
        } else {
          msg += `Point остаётся ${point}. Бросайте снова!`;
        }
      }

      setPoint(newPoint);
      setBets(nextBets);
      setAnnouncement(msg);

      const isRoundWin = totalWinAmount > 0;
      setLastWin(totalWinAmount);
      setHistory((prev) => [{ d1, d2, sum, win: isRoundWin }, ...prev.slice(0, 9)]);

      if (isRoundWin) {
        soundManager.playCrapsWin();
        if (totalWinAmount >= totalBet * 3) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        soundManager.playLoss();
      }

      // Record to backend API
      const multiplier = totalBet > 0 ? totalWinAmount / totalBet : 0;
      await recordGameResult('craps', totalBet, totalWinAmount, multiplier);

      setIsRolling(false);
    }, 900);
  };

  const renderDie = (val: number) => {
    const activePips = DIE_PIPS[val] || [];
    return (
      <div className={`relative w-14 h-14 bg-gradient-to-br from-red-600 via-rose-600 to-red-800 rounded-2xl p-2 shadow-2xl border-2 border-red-300 grid grid-cols-3 grid-rows-3 gap-1 ${
        isRolling ? 'animate-spin' : 'transition-transform duration-200'
      }`}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((pipIdx) => (
          <div key={pipIdx} className="flex items-center justify-center">
            {activePips.includes(pipIdx) && (
              <span className="w-2.5 h-2.5 bg-white rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24 max-w-lg mx-auto">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 px-3 py-1.5 rounded-full border border-purple-400/30 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <div className="flex items-center gap-1.5">
          <Dices className="w-5 h-5 text-amber-400 animate-pulse" />
          <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
            Vegas Craps VIP
          </h2>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            setShowRules(!showRules);
          }}
          className="w-7 h-7 rounded-full bg-purple-900/60 border border-purple-400/30 text-purple-200 flex items-center justify-center hover:text-white"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Rules Dropdown Modal */}
      {showRules && (
        <div className="w-full bg-[#1b0634] border border-amber-400/40 rounded-2xl p-3 text-xs text-purple-200 flex flex-col gap-2 shadow-xl animate-fadeIn max-h-72 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between text-amber-300 font-black uppercase text-[11px]">
            <span>Правила и Таблица выплат Крэпса (Craps)</span>
            <button onClick={() => setShowRules(false)} className="text-white font-bold">✕</button>
          </div>
          <p className="text-[11px] leading-relaxed">
            • <strong>Come-Out Roll (Первый бросок)</strong>: Ставьте на <strong>Pass Line</strong>. Если выпало 7 или 11 — моментальный выигрыш! Если 2, 3, 12 — крэпс (проигрыш).
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong>Point (Пойнт)</strong>: При выпадении 4, 5, 6, 8, 9, 10 фиксируется Пойнт. Ваша цель — снова выбить этот номер ДО выпадения 7!
          </p>
          <div className="flex flex-col gap-1 mt-1 border-t border-purple-400/20 pt-1.5">
            <span className="text-[10px] text-amber-300 font-black uppercase">Выплаты секторов:</span>
            {Object.entries(BET_INFO).map(([key, info]) => (
              <div key={key} className="flex items-start justify-between gap-2 text-[10px] bg-black/30 p-1.5 rounded-lg">
                <div>
                  <strong className="text-white font-bold block">{info.name}</strong>
                  <span className="text-purple-300 text-[9px]">{info.desc}</span>
                </div>
                <span className="font-mono font-black text-amber-300 bg-purple-950 px-1.5 py-0.5 rounded shrink-0">
                  {info.payout}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Point Indicator Bar & Recent History */}
      <div className="w-full flex items-center justify-between bg-[#140428] border border-purple-400/30 rounded-2xl px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-300 uppercase">Пойнт:</span>
          <div className={`px-3 py-0.5 rounded-full font-black text-xs font-mono shadow ${
            point !== null 
              ? 'bg-amber-400 text-purple-950 animate-pulse border border-amber-200' 
              : 'bg-black/50 text-purple-400 border border-purple-400/20'
          }`}>
            {point !== null ? `ON: ${point}` : 'OFF'}
          </div>
        </div>

        {/* History Ribbons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {history.map((h, i) => (
            <span
              key={i}
              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                h.sum === 7 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : h.win
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-900/40 text-purple-300'
              }`}
            >
              {h.sum}
            </span>
          ))}
        </div>
      </div>

      {/* Main Dice Table Felt Area */}
      <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#0a3622] via-[#062417] to-[#04160e] border-4 border-amber-500/60 p-4 shadow-2xl flex flex-col items-center gap-3 overflow-hidden">
        {/* Ambient table glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Stickman Callout Ribbon */}
        <div className="w-full bg-black/40 border border-emerald-400/30 rounded-xl py-1.5 px-3 text-center">
          <span className="text-xs font-bold text-emerald-200 tracking-wide">
            {announcement}
          </span>
        </div>

        {/* 3D Dice Display Stage */}
        <div className="flex items-center justify-center gap-5 py-2">
          {renderDie(dice[0])}
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-black text-amber-300 drop-shadow">
              {dice[0] + dice[1]}
            </span>
            <span className="text-[9px] font-bold uppercase text-emerald-300">
              Сумма
            </span>
          </div>
          {renderDie(dice[1])}
        </div>

        {/* Win Banner */}
        {lastWin !== null && lastWin > 0 && (
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-purple-950 px-4 py-1 rounded-full font-black text-xs uppercase shadow-xl animate-bounce border border-white flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            <span>Выигрыш: +{formatCoins(lastWin)} 🪙</span>
          </div>
        )}

        {/* Craps Betting Grid */}
        <div className="w-full flex flex-col gap-2 mt-1">
          {/* Top Primary Line Bets: Pass Line & Don't Pass */}
          <div className="grid grid-cols-2 gap-2">
            {/* Pass Line */}
            <button
              onClick={() => handleAddBet('pass_line')}
              className={`relative py-3 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-between active:scale-95 ${
                bets.pass_line
                  ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : 'bg-black/30 border-emerald-500/40 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between w-full text-[10px] text-emerald-300 font-bold px-1">
                <span>PASS LINE</span>
                <span className="text-amber-300 font-mono">1:1</span>
              </div>
              <span className="text-xs text-white font-extrabold mt-1">7, 11 Победа</span>
              {bets.pass_line ? (
                <div className="mt-1 bg-amber-400 text-purple-950 font-mono font-black text-xs px-2 py-0.5 rounded-full shadow">
                  {formatCoins(bets.pass_line)} 🪙
                </div>
              ) : null}
            </button>

            {/* Don't Pass */}
            <button
              onClick={() => handleAddBet('dont_pass')}
              className={`relative py-3 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-between active:scale-95 ${
                bets.dont_pass
                  ? 'bg-rose-500/25 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-black/30 border-rose-500/40 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center justify-between w-full text-[10px] text-rose-300 font-bold px-1">
                <span>DON'T PASS</span>
                <span className="text-rose-300 font-mono">1:1</span>
              </div>
              <span className="text-xs text-white font-extrabold mt-1">2, 3 Крэпс</span>
              {bets.dont_pass ? (
                <div className="mt-1 bg-rose-500 text-white font-mono font-black text-xs px-2 py-0.5 rounded-full shadow">
                  {formatCoins(bets.dont_pass)} 🪙
                </div>
              ) : null}
            </button>
          </div>

          {/* Field Bet Box */}
          <button
            onClick={() => handleAddBet('field')}
            className={`w-full py-2.5 px-3 rounded-2xl border-2 transition-all flex flex-col items-center active:scale-98 ${
              bets.field
                ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                : 'bg-black/30 border-yellow-500/40 hover:border-yellow-400'
            }`}
          >
            <div className="flex items-center justify-between w-full text-xs font-black text-yellow-300">
              <span className="tracking-widest">FIELD (ПОЛЕ)</span>
              <span className="text-[10px] text-yellow-200">2 & 12 платят x2 / x3</span>
            </div>
            <div className="flex items-center justify-around w-full mt-1 text-sm font-mono font-black text-white">
              <span className="text-amber-300">2</span>
              <span>3</span>
              <span>4</span>
              <span className="text-emerald-400">9</span>
              <span>10</span>
              <span>11</span>
              <span className="text-amber-300">12</span>
            </div>
            {bets.field ? (
              <div className="mt-1 bg-yellow-400 text-purple-950 font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow">
                Ставка: {formatCoins(bets.field)} 🪙
              </div>
            ) : null}
          </button>

          {/* Proposition Bets (One-Roll & Hardways) */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Any 7 */}
            <button
              onClick={() => handleAddBet('any_seven')}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
                bets.any_seven
                  ? 'bg-amber-500/25 border-amber-400 shadow'
                  : 'bg-black/30 border-purple-500/30 hover:border-purple-400'
              }`}
            >
              <span className="text-[10px] font-bold text-rose-300">ANY 7</span>
              <span className="text-xs font-mono font-black text-amber-300">4:1</span>
              {bets.any_seven && (
                <span className="text-[9px] font-mono font-bold text-white bg-purple-900 px-1 rounded mt-0.5">
                  {formatCoins(bets.any_seven)}
                </span>
              )}
            </button>

            {/* Any Craps */}
            <button
              onClick={() => handleAddBet('any_craps')}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
                bets.any_craps
                  ? 'bg-amber-500/25 border-amber-400 shadow'
                  : 'bg-black/30 border-purple-500/30 hover:border-purple-400'
              }`}
            >
              <span className="text-[10px] font-bold text-amber-300">CRAPS</span>
              <span className="text-xs font-mono font-black text-amber-300">7:1</span>
              {bets.any_craps && (
                <span className="text-[9px] font-mono font-bold text-white bg-purple-900 px-1 rounded mt-0.5">
                  {formatCoins(bets.any_craps)}
                </span>
              )}
            </button>

            {/* Hardways 6 & 8 */}
            <button
              onClick={() => handleAddBet('hard_8')}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
                bets.hard_8
                  ? 'bg-amber-500/25 border-amber-400 shadow'
                  : 'bg-black/30 border-purple-500/30 hover:border-purple-400'
              }`}
            >
              <span className="text-[10px] font-bold text-emerald-300">HARD 8 (4-4)</span>
              <span className="text-xs font-mono font-black text-amber-300">9:1</span>
              {bets.hard_8 && (
                <span className="text-[9px] font-mono font-bold text-white bg-purple-900 px-1 rounded mt-0.5">
                  {formatCoins(bets.hard_8)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Betting & Rolling Controls */}
      <div className="w-full rounded-3xl bg-[#17052e]/90 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-3">
        {/* Chip Selection Ribbon */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-purple-300 uppercase">Номинал фишки:</span>
          <div className="flex items-center gap-1.5">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  soundManager.playChip();
                  setSelectedChip(chip);
                }}
                className={`w-9 h-9 rounded-full font-mono font-black text-xs border-2 flex items-center justify-center transition-all ${
                  selectedChip === chip
                    ? 'bg-amber-400 text-purple-950 border-white scale-110 shadow-lg'
                    : 'bg-purple-950 text-purple-200 border-purple-400/40 hover:bg-purple-900'
                }`}
              >
                {chip >= 1000 ? `${chip / 1000}k` : chip}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Bet Adjustment Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearBets}
            disabled={isRolling}
            className="flex-1 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-xs font-bold text-purple-200 hover:text-white flex items-center justify-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Очистить
          </button>
          <button
            onClick={handleDoubleBets}
            disabled={isRolling}
            className="flex-1 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-xs font-bold text-purple-200 hover:text-white flex items-center justify-center gap-1 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" /> 2X Удвоить
          </button>
        </div>

        {/* Big Roll Action Button */}
        <button
          disabled={isRolling || totalBet <= 0}
          onClick={handleRoll}
          className="cartoon-btn btn-gold w-full py-4 text-lg font-black tracking-wider flex items-center justify-center gap-2 shadow-2xl active:scale-98"
        >
          <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
          <span>
            {isRolling ? 'КОСТИ БРОШЕНЫ...' : `БРОСИТЬ КОСТИ (${formatCoins(totalBet)} 🪙)`}
          </span>
        </button>
      </div>
    </div>
  );
};
