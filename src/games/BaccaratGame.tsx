import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Play, Shield, User } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BaccaratGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type BetTarget = 'player' | 'banker' | 'tie';

interface Card {
  rank: number;
  suit: string;
  color: string;
  label: string;
  value: number; // 0..9
}

const SUITS = ['♠', '♥', '♦', '♣'];
const LABELS: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

function getRandomCard(): Card {
  const rank = Math.floor(Math.random() * 13) + 1;
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const color = suit === '♥' || suit === '♦' ? 'red' : 'black';
  const value = rank >= 10 ? 0 : rank;
  return { rank, suit, color, label: LABELS[rank], value };
}

function calculateHandScore(cards: Card[]): number {
  const sum = cards.reduce((acc, c) => acc + c.value, 0);
  return sum % 10;
}

const BET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

export const BaccaratGame: React.FC<BaccaratGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [betIndex, setBetIndex] = useState(1);
  const [selectedTarget, setSelectedTarget] = useState<BetTarget>('player');
  const [isDealing, setIsDealing] = useState(false);

  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const currentBet = BET_AMOUNTS[betIndex];

  const handleDeal = () => {
    if (isDealing || !user) return;
    if (user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    soundManager.vibrate(20);
    setIsDealing(true);
    setResultMessage(null);

    // Initial 2 cards each
    const p1 = getRandomCard();
    const b1 = getRandomCard();
    const p2 = getRandomCard();
    const b2 = getRandomCard();

    setPlayerCards([p1, p2]);
    setBankerCards([b1, b2]);

    setTimeout(() => {
      let pHand = [p1, p2];
      let bHand = [b1, b2];

      let pScore = calculateHandScore(pHand);
      let bScore = calculateHandScore(bHand);

      // Natural 8 or 9 ends immediately
      if (pScore < 8 && bScore < 8) {
        // Player draws 3rd card on 0-5
        let pThird: Card | null = null;
        if (pScore <= 5) {
          pThird = getRandomCard();
          pHand.push(pThird);
          pScore = calculateHandScore(pHand);
        }

        // Banker drawing rule
        if (pThird === null) {
          if (bScore <= 5) {
            bHand.push(getRandomCard());
            bScore = calculateHandScore(bHand);
          }
        } else {
          const v = pThird.value;
          if (bScore <= 2) {
            bHand.push(getRandomCard());
          } else if (bScore === 3 && v !== 8) {
            bHand.push(getRandomCard());
          } else if (bScore === 4 && [2, 3, 4, 5, 6, 7].includes(v)) {
            bHand.push(getRandomCard());
          } else if (bScore === 5 && [4, 5, 6, 7].includes(v)) {
            bHand.push(getRandomCard());
          } else if (bScore === 6 && [6, 7].includes(v)) {
            bHand.push(getRandomCard());
          }
          bScore = calculateHandScore(bHand);
        }
      }

      setPlayerCards([...pHand]);
      setBankerCards([...bHand]);
      finalizeRound(pScore, bScore);
    }, 900);
  };

  const finalizeRound = (pScore: number, bScore: number) => {
    setIsDealing(false);

    let winner: BetTarget;
    if (pScore > bScore) winner = 'player';
    else if (bScore > pScore) winner = 'banker';
    else winner = 'tie';

    const isWin = selectedTarget === winner;
    let mult = 0;
    if (isWin) {
      if (winner === 'player') mult = 2.0;
      else if (winner === 'banker') mult = 1.95;
      else if (winner === 'tie') mult = 9.0;
    }

    const winAmount = Math.floor(currentBet * mult);
    recordGameResult('baccarat', currentBet, winAmount, mult);

    const winnerName =
      winner === 'player' ? 'Игрок (Player)' : winner === 'banker' ? 'Банкир (Banker)' : 'Ничья (Tie)';

    if (isWin) {
      soundManager.playBigWin();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setResultMessage(`🎉 Победа ${winnerName}! Выигрыш: +${winAmount} 🪙 (x${mult})!`);
    } else {
      soundManager.playReelStop(0);
      setResultMessage(`💥 Победил ${winnerName} (${pScore} против ${bScore}). Ставка проиграна.`);
    }
  };

  const pScore = calculateHandScore(playerCards);
  const bScore = calculateHandScore(bankerCards);

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

        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>👑</span> Баккара 9
        </h2>

        <div className="bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 text-xs font-black text-amber-300">
          Punto Banco
        </div>
      </div>

      {/* Table Arena: Player vs Banker */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-purple-950/90 via-emerald-950/50 to-purple-950/90 border-2 border-emerald-500/30 p-3.5 flex flex-col gap-3 shadow-xl">
        <div className="grid grid-cols-2 gap-3">
          {/* Player Hand */}
          <div className="bg-blue-950/40 border border-blue-400/30 rounded-2xl p-2.5 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs font-black text-blue-300 uppercase">
              <User className="w-3.5 h-3.5" /> Игрок: {playerCards.length > 0 ? pScore : '-'}
            </div>
            <div className="flex gap-1.5 min-h-[68px] items-center justify-center">
              {playerCards.length === 0 ? (
                <div className="w-11 h-16 rounded-lg border border-dashed border-blue-400/40 flex items-center justify-center text-xs text-blue-300/40">
                  ?
                </div>
              ) : (
                playerCards.map((c, i) => (
                  <div
                    key={i}
                    className={`w-11 h-16 rounded-lg bg-white border border-gray-300 shadow p-1 flex flex-col justify-between text-xs font-black leading-none animate-reel-land ${
                      c.color === 'red' ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className="text-base text-center">{c.suit}</span>
                    <span className="self-end rotate-180">{c.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Banker Hand */}
          <div className="bg-rose-950/40 border border-rose-400/30 rounded-2xl p-2.5 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs font-black text-rose-300 uppercase">
              <Shield className="w-3.5 h-3.5" /> Банкир: {bankerCards.length > 0 ? bScore : '-'}
            </div>
            <div className="flex gap-1.5 min-h-[68px] items-center justify-center">
              {bankerCards.length === 0 ? (
                <div className="w-11 h-16 rounded-lg border border-dashed border-rose-400/40 flex items-center justify-center text-xs text-rose-300/40">
                  ?
                </div>
              ) : (
                bankerCards.map((c, i) => (
                  <div
                    key={i}
                    className={`w-11 h-16 rounded-lg bg-white border border-gray-300 shadow p-1 flex flex-col justify-between text-xs font-black leading-none animate-reel-land ${
                      c.color === 'red' ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className="text-base text-center">{c.suit}</span>
                    <span className="self-end rotate-180">{c.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result Message Banner */}
      {resultMessage && (
        <div
          className={`w-full p-2.5 rounded-2xl text-center text-xs font-black border animate-fadeIn ${
            resultMessage.includes('Победа')
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
              : 'bg-purple-900/60 border-purple-400/40 text-purple-200'
          }`}
        >
          {resultMessage}
        </div>
      )}

      {/* Betting Targets (Player / Tie / Banker) */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={isDealing}
          onClick={() => {
            soundManager.playClick();
            setSelectedTarget('player');
          }}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-0.5 border transition-all active:scale-95 ${
            selectedTarget === 'player'
              ? 'bg-blue-600 text-white border-white shadow-lg ring-2 ring-blue-300 scale-102 font-black'
              : 'bg-purple-950/60 text-purple-300 border-purple-400/30'
          }`}
        >
          <span className="text-xs font-black">ИГРОК</span>
          <span className="text-[10px] opacity-80">Выплата x2.0</span>
        </button>

        <button
          type="button"
          disabled={isDealing}
          onClick={() => {
            soundManager.playClick();
            setSelectedTarget('tie');
          }}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-0.5 border transition-all active:scale-95 ${
            selectedTarget === 'tie'
              ? 'bg-emerald-600 text-white border-white shadow-lg ring-2 ring-emerald-300 scale-102 font-black'
              : 'bg-purple-950/60 text-purple-300 border-purple-400/30'
          }`}
        >
          <span className="text-xs font-black">НИЧЬЯ</span>
          <span className="text-[10px] opacity-80">Выплата x9.0</span>
        </button>

        <button
          type="button"
          disabled={isDealing}
          onClick={() => {
            soundManager.playClick();
            setSelectedTarget('banker');
          }}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-0.5 border transition-all active:scale-95 ${
            selectedTarget === 'banker'
              ? 'bg-rose-600 text-white border-white shadow-lg ring-2 ring-rose-300 scale-102 font-black'
              : 'bg-purple-950/60 text-purple-300 border-purple-400/30'
          }`}
        >
          <span className="text-xs font-black">БАНКИР</span>
          <span className="text-[10px] opacity-80">Выплата x1.95</span>
        </button>
      </div>

      {/* Bet Amount & Deal Action */}
      <div className="w-full bg-black/40 border border-purple-400/30 rounded-3xl p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-purple-200 uppercase">Ставка:</span>
          <div className="flex items-center gap-1.5">
            {BET_AMOUNTS.map((amt, idx) => (
              <button
                key={amt}
                type="button"
                disabled={isDealing}
                onClick={() => {
                  soundManager.playClick();
                  setBetIndex(idx);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                  betIndex === idx
                    ? 'bg-amber-400 text-purple-950 shadow-md scale-105'
                    : 'bg-purple-900/50 text-purple-300 hover:text-white'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={isDealing}
          onClick={handleDeal}
          className="cartoon-btn btn-spin w-full py-3.5 text-base font-black flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          {isDealing ? 'Раздача карт...' : `Раздать (${currentBet} 🪙)`}
        </button>
      </div>
    </div>
  );
};
