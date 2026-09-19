import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Crown, Sparkles, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VideoPokerGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface PokerCard {
  id: number;
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number; // 2..14 (Ace = 14)
  held: boolean;
  justSwapped?: boolean;
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 },
  { rank: '5', val: 5 }, { rank: '6', val: 6 }, { rank: '7', val: 7 },
  { rank: '8', val: 8 }, { rank: '9', val: 9 }, { rank: '10', val: 10 },
  { rank: 'J', val: 11 }, { rank: 'Q', val: 12 }, { rank: 'K', val: 13 },
  { rank: 'A', val: 14 },
];

const BET_PRESETS = [50, 100, 250, 500, 1000, 2500, 5000];
const MAX_SWAPS = 5;

function createDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  let cardId = 1;
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ id: cardId++, suit: s, rank: r.rank, value: r.val, held: false });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// Hand evaluation function
function evaluatePokerHand(cards: PokerCard[]): { name: string; multiplier: number; isWinning: boolean } {
  if (!cards || cards.length < 5) {
    return { name: 'Раздача...', multiplier: 0, isWinning: false };
  }

  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const values = sorted.map((c) => c.value);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Straight check (including A-2-3-4-5)
  let isStraight = false;
  if (
    values[4] - values[3] === 1 &&
    values[3] - values[2] === 1 &&
    values[2] - values[1] === 1 &&
    values[1] - values[0] === 1
  ) {
    isStraight = true;
  } else if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
    isStraight = true; // Ace-low straight
  }

  // Count occurrences of each value
  const counts: Record<number, number> = {};
  values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  const countValues = Object.values(counts).sort((a, b) => b - a);

  // Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (values[0] === 10 && values[4] === 14) {
      return { name: '🔥 РОЯЛ-ФЛЕШ! 🔥', multiplier: 250, isWinning: true };
    }
    return { name: '⭐ СТРЕЙТ-ФЛЕШ! ⭐', multiplier: 50, isWinning: true };
  }

  // 4 of a kind (Каре)
  if (countValues[0] === 4) {
    return { name: 'КАРЕ (4 одинаковых)', multiplier: 25, isWinning: true };
  }

  // Full House
  if (countValues[0] === 3 && countValues[1] === 2) {
    return { name: 'ФУЛЛ-ХАУС', multiplier: 9, isWinning: true };
  }

  // Flush
  if (isFlush) {
    return { name: 'ФЛЕШ (одной масти)', multiplier: 6, isWinning: true };
  }

  // Straight
  if (isStraight) {
    return { name: 'СТРЕЙТ (по порядку)', multiplier: 4, isWinning: true };
  }

  // 3 of a kind (Тройка)
  if (countValues[0] === 3) {
    return { name: 'ТРОЙКА (Сет)', multiplier: 3, isWinning: true };
  }

  // Two Pair (Две пары)
  if (countValues[0] === 2 && countValues[1] === 2) {
    return { name: 'ДВЕ ПАРЫ', multiplier: 2, isWinning: true };
  }

  // Jacks or Better (Pair of J, Q, K, A)
  if (countValues[0] === 2) {
    const pairValue = parseInt(Object.keys(counts).find((k) => counts[parseInt(k)] === 2) || '0');
    if (pairValue >= 11) {
      return { name: 'ВАЛЕТЫ И ВЫШЕ', multiplier: 1, isWinning: true };
    }
    return { name: 'Младшая пара (до Валетов)', multiplier: 0, isWinning: false };
  }

  return { name: 'Нет комбинации', multiplier: 0, isWinning: false };
}

export const VideoPokerGame: React.FC<VideoPokerGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [deck, setDeck] = useState<PokerCard[]>(createDeck);
  const [hand, setHand] = useState<PokerCard[]>([]);
  const [stage, setStage] = useState<'BET' | 'PLAYING' | 'DONE'>('BET');
  const [bet, setBet] = useState(100);
  const [swapsLeft, setSwapsLeft] = useState(MAX_SWAPS);
  const [result, setResult] = useState<{ name: string; multiplier: number; isWinning: boolean } | null>(null);

  // Initial Deal
  const handleDeal = () => {
    if (!user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    const newDeck = createDeck();
    const initialHand: PokerCard[] = [];
    for (let i = 0; i < 5; i++) {
      initialHand.push(newDeck.pop()!);
    }

    setDeck(newDeck);
    setHand(initialHand);
    setSwapsLeft(MAX_SWAPS);
    setStage('PLAYING');

    const evalResult = evaluatePokerHand(initialHand);
    setResult(evalResult);
  };

  // Toggle card HOLD
  const toggleHold = (index: number) => {
    if (stage !== 'PLAYING') return;
    soundManager.playChip();
    setHand((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], held: !copy[index].held };
      return copy;
    });
  };

  // Swap non-held cards (up to 5 times)
  const handleSwap = () => {
    if (stage !== 'PLAYING' || swapsLeft <= 0) return;

    soundManager.playChip();
    const currentDeck = [...deck];

    // Ensure deck has enough cards
    if (currentDeck.length < 5) {
      currentDeck.push(...createDeck());
    }

    const newHand = hand.map((card) => {
      if (card.held) {
        return { ...card, justSwapped: false };
      }
      const newCard = currentDeck.pop()!;
      return { ...newCard, held: false, justSwapped: true };
    });

    const newSwapsLeft = swapsLeft - 1;
    setDeck(currentDeck);
    setHand(newHand);
    setSwapsLeft(newSwapsLeft);

    const evalResult = evaluatePokerHand(newHand);
    setResult(evalResult);

    // If out of swaps, auto finalize
    if (newSwapsLeft === 0) {
      finalizeRound(evalResult);
    }
  };

  // Cash out early or finalize
  const handleCashout = () => {
    if (stage !== 'PLAYING' || !result) return;
    finalizeRound(result);
  };

  const finalizeRound = (finalEval: { name: string; multiplier: number; isWinning: boolean }) => {
    setStage('DONE');

    if (finalEval.isWinning && finalEval.multiplier > 0) {
      const winAmount = bet * finalEval.multiplier;
      if (finalEval.multiplier >= 9) {
        soundManager.playBigWin();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
      } else {
        soundManager.playWin();
      }
      recordGameResult('poker', bet, winAmount, finalEval.multiplier);
    } else {
      soundManager.playReelStop(0);
      recordGameResult('poker', bet, 0, 0);
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
          <Crown className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Видео-Покер (5 замен)
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-2.5 py-1 rounded-xl border border-purple-400/30">
          {formatCoins(user?.coins)} 🪙
        </div>
      </div>

      {/* Paytable Mini Header */}
      <div className="w-full bg-purple-950/80 border border-purple-400/30 rounded-2xl p-2 text-[10px] grid grid-cols-3 gap-1 text-purple-200 font-bold">
        <div>Валеты+ <span className="font-mono text-amber-300 font-black">x1</span></div>
        <div>2 Пары <span className="font-mono text-amber-300 font-black">x2</span></div>
        <div>Тройка <span className="font-mono text-amber-300 font-black">x3</span></div>
        <div>Стрейт <span className="font-mono text-amber-300 font-black">x4</span></div>
        <div>Флеш <span className="font-mono text-amber-300 font-black">x6</span></div>
        <div>Фулл-Хаус <span className="font-mono text-amber-300 font-black">x9</span></div>
        <div>Каре <span className="font-mono text-amber-300 font-black">x25</span></div>
        <div>Стрейт-Флеш <span className="font-mono text-amber-300 font-black">x50</span></div>
        <div className="text-amber-300 font-black">Роял <span className="font-mono">x250</span></div>
      </div>

      {/* Poker Table Velvet Felt */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#0b3323] via-[#072418] to-[#03140d] border-2 border-emerald-500/50 p-3.5 shadow-2xl flex flex-col items-center gap-3 min-h-[240px] justify-between relative overflow-hidden">
        {/* Decorative Table Inset */}
        <div className="absolute inset-2 border border-emerald-400/20 rounded-2xl pointer-events-none" />

        {/* Status / Combination Banner */}
        <div className="w-full flex items-center justify-between z-10">
          {stage === 'PLAYING' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-200 uppercase">Замен осталось:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: MAX_SWAPS }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                      idx < swapsLeft
                        ? 'bg-amber-400 border-amber-300 text-purple-950 scale-110 shadow-sm shadow-amber-400/50'
                        : 'bg-emerald-950/60 border-emerald-700 text-emerald-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                ))}
              </div>
            </div>
          ) : stage === 'DONE' ? (
            <span className="text-xs font-black text-amber-300 uppercase">Раунд завершён</span>
          ) : (
            <span className="text-xs font-bold text-emerald-200">Сделай ставку и нажми РАЗДАТЬ</span>
          )}

          {result && (
            <div
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                result.isWinning
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-purple-950 border-amber-300 animate-pulse shadow-md'
                  : 'bg-black/50 text-purple-200 border-emerald-500/30'
              }`}
            >
              {result.name} {result.multiplier > 0 ? `(x${result.multiplier})` : ''}
            </div>
          )}
        </div>

        {/* 5 Cards Row */}
        <div className="grid grid-cols-5 gap-1.5 w-full justify-items-center my-auto z-10">
          {(hand.length > 0 ? hand : [null, null, null, null, null]).map((c, i) => {
            if (!c) {
              return (
                <div
                  key={i}
                  className="w-full max-w-[62px] h-24 rounded-xl bg-emerald-950/60 border border-emerald-400/30 flex items-center justify-center text-emerald-400/40 text-2xl font-mono shadow-inner"
                >
                  🂠
                </div>
              );
            }

            const isRed = c.suit === '♥' || c.suit === '♦';

            return (
              <div
                key={c.id || i}
                onClick={() => toggleHold(i)}
                className={`relative w-full max-w-[62px] h-24 rounded-xl flex flex-col items-center justify-between p-1.5 cursor-pointer transition-all duration-200 ${
                  c.held
                    ? '-translate-y-2 ring-2 ring-amber-400 shadow-xl shadow-amber-400/30 bg-white'
                    : 'bg-white hover:-translate-y-1'
                } border border-gray-300 select-none`}
              >
                {/* Hold Tag */}
                {c.held && (
                  <div className="absolute -top-3 bg-amber-400 text-purple-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white uppercase shadow-md animate-fadeIn">
                    HOLD
                  </div>
                )}

                {/* Top Corner */}
                <div className="w-full flex items-center justify-between leading-none">
                  <span className={`font-black text-xs ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}>
                    {c.rank}
                  </span>
                  <span className={`text-[10px] ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}>
                    {c.suit}
                  </span>
                </div>

                {/* Center Big Suit */}
                <span className={`text-3xl leading-none my-auto ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}>
                  {c.suit}
                </span>

                {/* Bottom Corner */}
                <div className="w-full flex items-center justify-between leading-none rotate-180">
                  <span className={`font-black text-xs ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}>
                    {c.rank}
                  </span>
                  <span className={`text-[10px] ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}>
                    {c.suit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip */}
        <div className="text-[11px] text-emerald-200/80 font-bold text-center z-10">
          {stage === 'PLAYING'
            ? '💡 Нажми на карту для удержания (HOLD). Неудержанные карты будут заменены!'
            : stage === 'DONE'
            ? result?.isWinning
              ? `🎉 Выигрыш: +${formatCoins(bet * (result?.multiplier || 0))} 🪙!`
              : 'Удачи в следующем раунде!'
            : 'У тебя 5 замен карт для сбора наилучшей комбинации!'}
        </div>
      </div>

      {/* Control Area */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        {stage === 'PLAYING' ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Swap Button */}
              <button
                onClick={handleSwap}
                disabled={swapsLeft <= 0}
                className="py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                СМЕНИТЬ ({swapsLeft})
              </button>

              {/* Cashout / Finish Button */}
              <button
                onClick={handleCashout}
                disabled={!result?.isWinning}
                className={`py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all ${
                  result?.isWinning
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-purple-950 shadow-amber-400/30 animate-pulse'
                    : 'bg-purple-900/40 text-purple-400 border border-purple-500/20 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {result?.isWinning
                  ? `ЗАБРАТЬ ${formatCoins(bet * result.multiplier)} 🪙`
                  : 'НЕТ ВЫИГРЫША'}
              </button>
            </div>
          </div>
        ) : stage === 'DONE' ? (
          <button
            onClick={handleDeal}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 font-black text-base shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            НОВАЯ РАЗДАЧА ({formatCoins(bet)} 🪙)
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            {/* Bet Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-purple-400/30 rounded-2xl px-3 py-1.5">
              <button
                onClick={() => {
                  soundManager.playClick();
                  const curIdx = BET_PRESETS.indexOf(bet);
                  if (curIdx > 0) setBet(BET_PRESETS[curIdx - 1]);
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
                  const curIdx = BET_PRESETS.indexOf(bet);
                  if (curIdx !== -1 && curIdx < BET_PRESETS.length - 1) setBet(BET_PRESETS[curIdx + 1]);
                  else setBet(bet + 100);
                }}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
              >
                +
              </button>
            </div>

            {/* Deal Button */}
            <button
              onClick={handleDeal}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-purple-950 font-black text-base shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              РАЗДАТЬ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
