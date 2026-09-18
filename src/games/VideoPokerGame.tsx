import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VideoPokerGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface PokerCard {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number; // 2..14 (Ace = 14)
  held: boolean;
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 },
  { rank: '5', val: 5 }, { rank: '6', val: 6 }, { rank: '7', val: 7 },
  { rank: '8', val: 8 }, { rank: '9', val: 9 }, { rank: '10', val: 10 },
  { rank: 'J', val: 11 }, { rank: 'Q', val: 12 }, { rank: 'K', val: 13 },
  { rank: 'A', val: 14 },
];

function createDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r.rank, value: r.val, held: false });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// Hand evaluation function
function evaluatePokerHand(cards: PokerCard[]): { name: string; multiplier: number } {
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
      return { name: '🔥 РОЯЛ-ФЛЕШ! 🔥', multiplier: 250 };
    }
    return { name: '⭐ СТРЕЙТ-ФЛЕШ! ⭐', multiplier: 50 };
  }

  // 4 of a kind
  if (countValues[0] === 4) {
    return { name: 'КАРЕ (4 одинаковых)', multiplier: 25 };
  }

  // Full House
  if (countValues[0] === 3 && countValues[1] === 2) {
    return { name: 'ФУЛЛ-ХАУС', multiplier: 9 };
  }

  // Flush
  if (isFlush) {
    return { name: 'ФЛЕШ (одной масти)', multiplier: 6 };
  }

  // Straight
  if (isStraight) {
    return { name: 'СТРЕЙТ (по порядку)', multiplier: 4 };
  }

  // 3 of a kind
  if (countValues[0] === 3) {
    return { name: 'ТРОЙКА (Сет)', multiplier: 3 };
  }

  // Two Pair
  if (countValues[0] === 2 && countValues[1] === 2) {
    return { name: 'ДВЕ ПАРЫ', multiplier: 2 };
  }

  // Jacks or Better (Pair of J, Q, K, A)
  if (countValues[0] === 2) {
    const pairValue = parseInt(Object.keys(counts).find((k) => counts[parseInt(k)] === 2) || '0');
    if (pairValue >= 11) {
      return { name: 'ВАЛЕТЫ И ВЫШЕ', multiplier: 1 };
    }
  }

  return { name: 'Нет комбинации', multiplier: 0 };
}

export const VideoPokerGame: React.FC<VideoPokerGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [deck, setDeck] = useState<PokerCard[]>(createDeck);
  const [hand, setHand] = useState<PokerCard[]>([]);
  const [stage, setStage] = useState<'BET' | 'HOLD' | 'DONE'>('BET');
  const [bet, setBet] = useState(50);
  const [result, setResult] = useState<{ name: string; multiplier: number } | null>(null);

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
    setResult(null);
    setStage('HOLD');
  };

  const toggleHold = (index: number) => {
    if (stage !== 'HOLD') return;
    soundManager.playClick();
    setHand((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], held: !copy[index].held };
      return copy;
    });
  };

  const handleDraw = () => {
    if (stage !== 'HOLD') return;
    soundManager.playSpinStart();

    const currentDeck = [...deck];
    const newHand = hand.map((card) => {
      if (card.held) return card;
      return currentDeck.pop()!;
    });

    setDeck(currentDeck);
    setHand(newHand);
    setStage('DONE');

    const evalResult = evaluatePokerHand(newHand);
    setResult(evalResult);

    if (evalResult.multiplier > 0) {
      const winAmount = bet * evalResult.multiplier;
      if (evalResult.multiplier >= 9) {
        soundManager.playBigWin();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
      } else {
        soundManager.playWin();
      }
      recordGameResult('poker', bet, winAmount, evalResult.multiplier);
    } else {
      soundManager.playReelStop(0);
      recordGameResult('poker', bet, 0, 0);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24">
      {/* Top Bar */}
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
          <Crown className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Видео-Покер
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* Paytable Bar */}
      <div className="w-full bg-purple-950/80 border border-purple-400/30 rounded-2xl p-2.5 text-[10px] grid grid-cols-3 gap-1 text-purple-200 font-bold">
        <div>Валеты+ <span className="font-mono text-amber-300">x1</span></div>
        <div>2 Пары <span className="font-mono text-amber-300">x2</span></div>
        <div>Тройка <span className="font-mono text-amber-300">x3</span></div>
        <div>Стрейт <span className="font-mono text-amber-300">x4</span></div>
        <div>Флеш <span className="font-mono text-amber-300">x6</span></div>
        <div>Фулл-Хаус <span className="font-mono text-amber-300">x9</span></div>
        <div>Каре <span className="font-mono text-amber-300">x25</span></div>
        <div>Стрейт-Флеш <span className="font-mono text-amber-300">x50</span></div>
        <div className="text-amber-300 font-black">Роял <span className="font-mono">x250</span></div>
      </div>

      {/* Cards Table Area */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#11244d] via-[#0b1936] to-[#060e20] border-2 border-blue-500/40 p-4 shadow-2xl flex flex-col items-center gap-4 min-h-[220px] justify-center">
        {stage === 'HOLD' && (
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
            Нажимайте на карты, чтобы УДЕРЖАТЬ их (HOLD):
          </span>
        )}

        {result && (
          <div className="bg-black/70 border border-amber-400 rounded-2xl py-1 px-4 text-center font-black text-xs text-amber-300 uppercase shadow-md animate-bounce">
            {result.name} {result.multiplier > 0 ? `(+${bet * result.multiplier} 🪙)` : ''}
          </div>
        )}

        {/* 5 Cards Row */}
        <div className="grid grid-cols-5 gap-1.5 w-full justify-items-center">
          {(hand.length > 0 ? hand : [null, null, null, null, null]).map((c, i) => {
            if (!c) {
              return (
                <div
                  key={i}
                  className="w-full max-w-[60px] h-24 rounded-xl bg-blue-950/60 border border-blue-400/20 flex items-center justify-center text-blue-400/40 text-xl font-mono"
                >
                  🂠
                </div>
              );
            }

            const isRed = c.suit === '♥' || c.suit === '♦';

            return (
              <div
                key={i}
                onClick={() => toggleHold(i)}
                className={`relative w-full max-w-[60px] h-24 rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer transition-transform duration-150 ${
                  c.held ? '-translate-y-2 ring-2 ring-amber-400 shadow-lg' : 'hover:translate-y-[-2px]'
                } bg-white border border-gray-300 ${isRed ? '!text-rose-600' : '!text-zinc-950'}`}
              >
                {/* Hold Tag */}
                {c.held && (
                  <div className="absolute -top-3 bg-amber-400 text-purple-950 font-black text-[9px] px-1.5 py-0.2 rounded-full border border-white uppercase shadow">
                    HOLD
                  </div>
                )}
                <span className={`font-black text-xs leading-none self-start ${isRed ? '!text-rose-600' : '!text-zinc-950'}`}>{c.rank}</span>
                <span className={`text-2xl leading-none ${isRed ? '!text-rose-600' : '!text-zinc-950'}`}>{c.suit}</span>
                <span className={`font-black text-xs leading-none self-end ${isRed ? '!text-rose-600' : '!text-zinc-950'}`}>{c.rank}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Controls */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex items-center gap-3">
        {stage === 'HOLD' ? (
          <button
            onClick={handleDraw}
            className="cartoon-btn btn-spin w-full py-3.5 text-base font-black flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> СМЕНИТЬ КАРТЫ (DRAW)
          </button>
        ) : (
          <>
            <div className="flex items-center gap-1.5 bg-black/40 border border-purple-400/30 rounded-2xl px-3 py-2">
              <button
                onClick={() => setBet(Math.max(10, bet - 25))}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
              >
                -
              </button>
              <span className="font-mono font-black text-amber-300 text-sm min-w-[2.5rem] text-center">
                {bet}
              </span>
              <button
                onClick={() => setBet(bet + 25)}
                className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
              >
                +
              </button>
            </div>

            <button
              onClick={handleDeal}
              className="cartoon-btn btn-spin flex-1 py-3 text-base font-black"
            >
              РАЗДАТЬ ({bet} 🪙)
            </button>
          </>
        )}
      </div>
    </div>
  );
};
