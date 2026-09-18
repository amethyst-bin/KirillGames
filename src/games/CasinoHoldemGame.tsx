import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Crown, Sparkles, Shield, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CasinoHoldemGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number; // 2..14 (Ace = 14)
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 },
  { rank: '5', val: 5 }, { rank: '6', val: 6 }, { rank: '7', val: 7 },
  { rank: '8', val: 8 }, { rank: '9', val: 9 }, { rank: '10', val: 10 },
  { rank: 'J', val: 11 }, { rank: 'Q', val: 12 }, { rank: 'K', val: 13 },
  { rank: 'A', val: 14 },
];

const BET_OPTIONS = [50, 100, 250, 500, 1000, 2500, 5000];

function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r.rank, value: r.val });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// Hand rank score (higher score = better hand)
interface HandEvaluation {
  rankScore: number; // 1 (High Card) to 9 (Royal Flush)
  name: string;
  anteMultiplier: number;
  tieBreaker: number[];
}

function evaluate5Cards(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  // Value frequencies
  const counts: Record<number, number> = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const countPairs = Object.entries(counts).map(([v, c]) => ({ val: Number(v), count: c }));
  countPairs.sort((a, b) => b.count - a.count || b.val - a.val);

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return { rankScore: 9, name: 'Роял Флеш ★', anteMultiplier: 100, tieBreaker: [14] };
    }
    return { rankScore: 8, name: 'Стрит Флеш', anteMultiplier: 20, tieBreaker: [straightHigh] };
  }

  if (countPairs[0].count === 4) {
    return { rankScore: 7, name: 'Каре (4 карты)', anteMultiplier: 10, tieBreaker: [countPairs[0].val, countPairs[1].val] };
  }

  if (countPairs[0].count === 3 && countPairs[1].count === 2) {
    return { rankScore: 6, name: 'Фулл Хаус', anteMultiplier: 3, tieBreaker: [countPairs[0].val, countPairs[1].val] };
  }

  if (isFlush) {
    return { rankScore: 5, name: 'Флеш', anteMultiplier: 2, tieBreaker: values };
  }

  if (isStraight) {
    return { rankScore: 4, name: 'Стрит', anteMultiplier: 1, tieBreaker: [straightHigh] };
  }

  if (countPairs[0].count === 3) {
    return { rankScore: 3, name: 'Сет (Тройка)', anteMultiplier: 1, tieBreaker: [countPairs[0].val, ...values.filter(v => v !== countPairs[0].val)] };
  }

  if (countPairs[0].count === 2 && countPairs[1].count === 2) {
    return { rankScore: 2, name: 'Две Пары', anteMultiplier: 1, tieBreaker: [countPairs[0].val, countPairs[1].val, ...values.filter(v => v !== countPairs[0].val && v !== countPairs[1].val)] };
  }

  if (countPairs[0].count === 2) {
    return { rankScore: 1, name: `Пара (${sorted.find(c => c.value === countPairs[0].val)?.rank})`, anteMultiplier: 1, tieBreaker: [countPairs[0].val, ...values.filter(v => v !== countPairs[0].val)] };
  }

  return { rankScore: 0, name: `Старшая карта (${sorted[0].rank})`, anteMultiplier: 1, tieBreaker: values };
}

// Generate all combinations of k items from array
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Evaluate best 5-card hand from 7 cards
function evaluateBest7(cards: Card[]): HandEvaluation {
  const combos = getCombinations(cards, 5);
  let best: HandEvaluation = evaluate5Cards(combos[0]);

  for (let i = 1; i < combos.length; i++) {
    const ev = evaluate5Cards(combos[i]);
    if (ev.rankScore > best.rankScore) {
      best = ev;
    } else if (ev.rankScore === best.rankScore) {
      // Tie breaker compare
      for (let j = 0; j < Math.min(ev.tieBreaker.length, best.tieBreaker.length); j++) {
        if (ev.tieBreaker[j] > best.tieBreaker[j]) {
          best = ev;
          break;
        } else if (ev.tieBreaker[j] < best.tieBreaker[j]) {
          break;
        }
      }
    }
  }

  return best;
}

export const CasinoHoldemGame: React.FC<CasinoHoldemGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [anteBet, setAnteBet] = useState<number>(100);
  const [deck, setDeck] = useState<Card[]>([]);
  const [stage, setStage] = useState<'betting' | 'flop' | 'showdown'>('betting');

  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);

  const [playerHandEval, setPlayerHandEval] = useState<HandEvaluation | null>(null);
  const [dealerHandEval, setDealerHandEval] = useState<HandEvaluation | null>(null);

  const [statusMessage, setStatusMessage] = useState<string>('Сделайте ставку Анте и получите карты!');
  const [lastWin, setLastWin] = useState<number>(0);

  // Start round: Deal 2 cards to player, 2 to dealer (hidden), 3 on flop
  const handleDeal = () => {
    if (stage !== 'betting') return;
    if (!user || user.coins < anteBet) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    soundManager.playChip();
    const newDeck = createShuffledDeck();

    const pCards = [newDeck.pop()!, newDeck.pop()!];
    const dCards = [newDeck.pop()!, newDeck.pop()!];
    const flop = [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!];

    setDeck(newDeck);
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setCommunityCards(flop);

    soundManager.playCardFlip();

    const currentFlopEval = evaluate5Cards([...pCards, ...flop]);
    setPlayerHandEval(currentFlopEval);
    setDealerHandEval(null);
    setStage('flop');
    setLastWin(0);
    setStatusMessage('Флоп открыт! Сделайте Колл (2x Анте) или Сброс (Фолд).');
  };

  // Fold: forfeit Ante
  const handleFold = async () => {
    if (stage !== 'flop') return;
    soundManager.playLoss();
    setStage('betting');
    setStatusMessage('Карты сброшены. Анте потеряно.');
    try {
      await recordGameResult('casino_holdem', anteBet, 0, 0);
    } catch (err) {
      console.error('Holdem record err:', err);
    }
  };

  // Call: 2x Ante, deals Turn & River, evaluates winner
  const handleCall = async () => {
    if (stage !== 'flop') return;
    const callCost = anteBet * 2;
    const totalBet = anteBet + callCost;

    if (!user || user.coins < callCost) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    soundManager.playChip();

    // Deal Turn & River
    const currentDeck = [...deck];
    const turn = currentDeck.pop()!;
    const river = currentDeck.pop()!;
    const allCommunity = [...communityCards, turn, river];
    setCommunityCards(allCommunity);

    soundManager.playCardFlip();

    // Evaluate 7 cards
    const pEval = evaluateBest7([...playerCards, ...allCommunity]);
    const dEval = evaluateBest7([...dealerCards, ...allCommunity]);

    setPlayerHandEval(pEval);
    setDealerHandEval(dEval);
    setStage('showdown');

    // Showdown logic
    let won = false;
    let push = false;

    if (pEval.rankScore > dEval.rankScore) {
      won = true;
    } else if (pEval.rankScore < dEval.rankScore) {
      won = false;
    } else {
      // Compare tie-breakers
      won = false;
      push = true;
      for (let i = 0; i < Math.min(pEval.tieBreaker.length, dEval.tieBreaker.length); i++) {
        if (pEval.tieBreaker[i] > dEval.tieBreaker[i]) {
          won = true;
          push = false;
          break;
        } else if (pEval.tieBreaker[i] < dEval.tieBreaker[i]) {
          won = false;
          push = false;
          break;
        }
      }
    }

    let payout = 0;
    if (won) {
      // Ante pays with bonus multiplier + Call pays 1:1 (total = ante * (1 + bonus) + call * 2)
      const anteWin = Math.round(anteBet * (1 + pEval.anteMultiplier));
      const callWin = callCost * 2;
      payout = anteWin + callWin;

      setLastWin(payout);
      if (pEval.rankScore >= 4) {
        soundManager.playBigWin();
        try {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
        } catch {
          // ignore
        }
      } else {
        soundManager.playWin();
      }
      setStatusMessage(`🎉 ПОБЕДА! ${pEval.name} бьёт ${dEval.name}! Куш: +${formatCoins(payout)} 🪙`);
    } else if (push) {
      payout = totalBet;
      setLastWin(payout);
      soundManager.playCoin();
      setStatusMessage(`Ничья (${pEval.name}). Ставки возвращены.`);
    } else {
      payout = 0;
      setLastWin(0);
      soundManager.playLoss();
      setStatusMessage(`Дилер победил с комбинацией ${dEval.name}.`);
    }

    try {
      const mult = payout > 0 ? Number((payout / totalBet).toFixed(2)) : 0;
      await recordGameResult('casino_holdem', totalBet, payout, mult);
    } catch (err) {
      console.error('Holdem record err:', err);
    }
  };

  const renderCard = (card?: Card, hidden?: boolean) => {
    if (hidden || !card) {
      return (
        <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl bg-gradient-to-br from-red-800 via-rose-900 to-red-950 border-2 border-amber-400 shadow-md flex items-center justify-center select-none">
          <div className="w-8 h-12 rounded-lg border border-amber-300/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-300/80" />
          </div>
        </div>
      );
    }

    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl bg-white border border-slate-300 shadow-md flex flex-col justify-between p-1 select-none transform hover:scale-105 transition-transform">
        <div className={`text-xs font-black leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {card.rank}
        </div>
        <div className={`text-lg text-center leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {card.suit}
        </div>
        <div className={`text-xs font-black leading-none self-end rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {card.rank}
        </div>
      </div>
    );
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
          disabled={stage === 'flop'}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-purple-200 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> В лобби
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-950 to-green-950 border border-emerald-500/40">
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-xs font-black text-emerald-300 tracking-wider uppercase">Казино Холдем</span>
        </div>

        <button
          onClick={onOpenBank}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black active:scale-95 transition-all"
        >
          🪙 {formatCoins(user?.coins || 0)}
        </button>
      </div>

      {/* Emerald Velvet Poker Table */}
      <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#063319] via-[#094824] to-[#042813] border-4 border-amber-600/70 shadow-2xl p-3 flex flex-col justify-between gap-2 overflow-hidden">
        {/* Table Felt Ring line */}
        <div className="absolute inset-2 border-2 border-emerald-400/20 rounded-2xl pointer-events-none" />

        {/* Dealer Area */}
        <div className="w-full flex flex-col items-center gap-1 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider">Дилер</span>
            {dealerHandEval && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/50 text-amber-300 border border-amber-400/30">
                {dealerHandEval.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {renderCard(dealerCards[0], stage !== 'showdown')}
            {renderCard(dealerCards[1], stage !== 'showdown')}
          </div>
        </div>

        {/* Community Cards (Board) */}
        <div className="w-full flex flex-col items-center gap-1 my-1 z-10">
          <span className="text-[10px] font-bold text-amber-300/80 uppercase tracking-widest">
            Общие Карты Стола
          </span>
          <div className="flex items-center gap-1.5">
            {renderCard(communityCards[0], !communityCards[0])}
            {renderCard(communityCards[1], !communityCards[1])}
            {renderCard(communityCards[2], !communityCards[2])}
            {renderCard(communityCards[3], !communityCards[3])}
            {renderCard(communityCards[4], !communityCards[4])}
          </div>
        </div>

        {/* Player Area */}
        <div className="w-full flex flex-col items-center gap-1 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Ты</span>
            {playerHandEval && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-emerald-300 border border-emerald-400/40">
                {playerHandEval.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {renderCard(playerCards[0])}
            {renderCard(playerCards[1])}
          </div>
        </div>

        {/* Status banner */}
        <div className="w-full text-center z-10">
          <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-emerald-400/30 inline-block truncate max-w-[280px]">
            {statusMessage}
          </span>
        </div>
      </div>

      {/* Betting & Actions */}
      <div className="w-full mt-2 flex flex-col gap-2">
        {/* Stage 1: Betting Chips */}
        {stage === 'betting' && (
          <>
            <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
              {BET_OPTIONS.map(val => (
                <button
                  key={val}
                  onClick={() => {
                    soundManager.playClick();
                    setAnteBet(val);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                    anteBet === val
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-purple-950 shadow-lg scale-105 border border-amber-200'
                      : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 active:scale-95'
                  }`}
                >
                  {formatCoins(val)}
                </button>
              ))}
            </div>

            <button
              onClick={handleDeal}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-600 to-teal-500 text-white font-black text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 border border-emerald-300/40 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-5 h-5 text-amber-200" />
              Раздать Анте • {formatCoins(anteBet)} 🪙
            </button>
          </>
        )}

        {/* Stage 2: Flop Decision (Call or Fold) */}
        {stage === 'flop' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleFold}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-slate-700 to-gray-800 text-white font-black text-sm uppercase tracking-wider shadow-lg border border-slate-500/40 active:scale-95 transition-all"
            >
              Сброс (Фолд)
            </button>

            <button
              onClick={handleCall}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-purple-950 font-black text-sm uppercase tracking-wider shadow-xl border border-amber-300/50 active:scale-95 transition-all animate-pulse"
            >
              Колл ({formatCoins(anteBet * 2)}) 🪙
            </button>
          </div>
        )}

        {/* Stage 3: Showdown Complete (Play Again) */}
        {stage === 'showdown' && (
          <button
            onClick={() => setStage('betting')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-600 to-teal-500 text-white font-black text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 border border-emerald-300/40 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Сыграть Снова • {lastWin > 0 ? `+${formatCoins(lastWin)} 🪙` : 'Новая Раздача'}
          </button>
        )}

        {/* Paytable hint */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-300/70 font-semibold text-center">
          <span>Роял x100</span>
          <span>•</span>
          <span>Каре x10</span>
          <span>•</span>
          <span>Фулл x3</span>
          <span>•</span>
          <span>Флеш x2</span>
        </div>
      </div>
    </div>
  );
};
