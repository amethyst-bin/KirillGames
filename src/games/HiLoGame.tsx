import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, ArrowUp, ArrowDown, Trophy, Flame, SkipForward } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HiLoGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface Card {
  rank: number; // 2..14 (11=J, 12=Q, 13=K, 14=A)
  suit: '♠' | '♥' | '♦' | '♣';
  color: 'red' | 'black';
  label: string;
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

function getRandomCard(): Card {
  const rank = Math.floor(Math.random() * 13) + 2;
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const color = suit === '♥' || suit === '♦' ? 'red' : 'black';
  return { rank, suit, color, label: LABELS[rank] };
}

const BET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

export const HiLoGame: React.FC<HiLoGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [currentCard, setCurrentCard] = useState<Card>(() => getRandomCard());
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [isDealing, setIsDealing] = useState(false);
  const [betIndex, setBetIndex] = useState(1);
  const [streak, setStreak] = useState(0);
  const [currentWin, setCurrentWin] = useState(0);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const baseBet = BET_AMOUNTS[betIndex];

  // Calculate dynamic odds based on current card rank (2..14)
  // Higher: cards > rank
  const higherCount = 14 - currentCard.rank;
  // Lower: cards < rank
  const lowerCount = currentCard.rank - 2;

  const higherMult = higherCount > 0 ? Number((12 / higherCount * 0.95).toFixed(2)) : 1.05;
  const lowerMult = lowerCount > 0 ? Number((12 / lowerCount * 0.95).toFixed(2)) : 1.05;

  const handleGuess = (direction: 'higher' | 'lower') => {
    if (isDealing || !user) return;

    if (streak === 0 && user.coins < baseBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    soundManager.vibrate(20);
    setIsDealing(true);
    setResultMessage(null);

    const dealt = getRandomCard();
    setNextCard(dealt);

    setTimeout(() => {
      setIsDealing(false);
      setCurrentCard(dealt);
      setNextCard(null);

      const won =
        direction === 'higher'
          ? dealt.rank >= currentCard.rank
          : dealt.rank <= currentCard.rank;

      const chosenMult = direction === 'higher' ? higherMult : lowerMult;

      if (won) {
        soundManager.playCoin();
        soundManager.vibrate([30, 40, 30]);

        const prevPot = streak === 0 ? baseBet : currentWin;
        const newWin = Math.floor(prevPot * chosenMult);
        const newStreak = streak + 1;
        setStreak(newStreak);
        setCurrentWin(newWin);

        if (newStreak >= 3) {
          soundManager.playBigWin();
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
        }

        setResultMessage(`🎉 Верно! Выпала ${dealt.label}${dealt.suit}. Куш: ${newWin} 🪙! Заберите или продолжайте!`);
      } else {
        soundManager.playExplosion();
        recordGameResult('hilo', baseBet, 0, 0);
        setStreak(0);
        setCurrentWin(0);
        setResultMessage(`💥 Не угадали! Выпала ${dealt.label}${dealt.suit}. Ставка сгорела.`);
      }
    }, 600);
  };

  const handleCashOut = () => {
    if (streak === 0 || isDealing) return;
    soundManager.playBigWin();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

    const totalMult = Number((currentWin / baseBet).toFixed(2));
    recordGameResult('hilo', baseBet, currentWin, totalMult);

    setResultMessage(`🏆 Забрано: +${currentWin} 🪙 (Множитель x${totalMult})!`);
    setStreak(0);
    setCurrentWin(0);
  };

  const handleSkip = () => {
    if (isDealing || streak > 0) return;
    soundManager.playClick();
    setCurrentCard(getRandomCard());
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

        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>🃏</span> Карты Hi-Lo
        </h2>

        <div className="bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 text-xs font-black text-amber-300 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" /> Серия: {streak}
        </div>
      </div>

      {/* Card Playing Arena */}
      <div className="relative w-full h-52 rounded-3xl bg-gradient-to-b from-purple-950/90 to-purple-900/60 border-2 border-purple-400/30 p-4 flex flex-col items-center justify-center shadow-xl">
        <div className="flex items-center gap-4">
          {/* Main Displayed Card */}
          <div
            className={`w-28 h-40 rounded-2xl bg-white border-2 border-gray-300 shadow-2xl p-2.5 flex flex-col justify-between transition-all duration-300 select-none animate-reel-land ${
              currentCard.color === 'red' ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            <div className="flex justify-between items-start font-black text-base leading-none">
              <span>{currentCard.label}</span>
              <span>{currentCard.suit}</span>
            </div>
            <div className="text-4xl text-center leading-none">
              {currentCard.suit}
            </div>
            <div className="flex justify-between items-end font-black text-base leading-none rotate-180">
              <span>{currentCard.label}</span>
              <span>{currentCard.suit}</span>
            </div>
          </div>

          {/* Next Card Placeholder / Face Down */}
          <div className="w-28 h-40 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 border-2 border-purple-400/60 shadow-inner flex items-center justify-center text-3xl">
            {isDealing ? (
              <span className="animate-spin">🔄</span>
            ) : nextCard ? (
              <span className={nextCard.color === 'red' ? 'text-red-500' : 'text-white'}>
                {nextCard.label}{nextCard.suit}
              </span>
            ) : (
              <span className="text-purple-300 opacity-60">❓</span>
            )}
          </div>
        </div>

        {/* Current Win Floating Pill */}
        {streak > 0 && (
          <div className="absolute top-2 right-3 bg-amber-400 text-purple-950 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-md animate-bounce flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Текущий куш: {currentWin} 🪙
          </div>
        )}
      </div>

      {/* Result Message */}
      {resultMessage && (
        <div
          className={`w-full p-2.5 rounded-2xl text-center text-xs font-black border animate-fadeIn ${
            streak > 0
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
              : 'bg-purple-900/60 border-purple-400/40 text-purple-200'
          }`}
        >
          {resultMessage}
        </div>
      )}

      {/* Action Buttons: Higher or Lower */}
      <div className="w-full grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={isDealing}
          onClick={() => handleGuess('higher')}
          className="cartoon-btn btn-spin py-3.5 flex flex-col items-center justify-center gap-0.5"
        >
          <div className="flex items-center gap-1 text-sm font-black">
            <ArrowUp className="w-4 h-4 stroke-[3]" /> ВЫШЕ
          </div>
          <span className="text-[11px] text-emerald-100 font-bold">
            Коэффициент x{higherMult}
          </span>
        </button>

        <button
          type="button"
          disabled={isDealing}
          onClick={() => handleGuess('lower')}
          className="cartoon-btn btn-red py-3.5 flex flex-col items-center justify-center gap-0.5"
        >
          <div className="flex items-center gap-1 text-sm font-black">
            <ArrowDown className="w-4 h-4 stroke-[3]" /> НИЖЕ
          </div>
          <span className="text-[11px] text-rose-100 font-bold">
            Коэффициент x{lowerMult}
          </span>
        </button>
      </div>

      {/* Cash out / Skip & Bet Controls */}
      <div className="w-full bg-black/40 border border-purple-400/30 rounded-3xl p-3 flex flex-col gap-2.5">
        {streak === 0 ? (
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
        ) : null}

        <div className="flex gap-2 w-full">
          {streak > 0 ? (
            <button
              type="button"
              disabled={isDealing}
              onClick={handleCashOut}
              className="cartoon-btn btn-gold w-full py-3.5 text-sm font-black flex items-center justify-center gap-1.5 animate-pulse"
            >
              <Trophy className="w-4 h-4" /> Забрать выигрыш ({currentWin} 🪙)
            </button>
          ) : (
            <button
              type="button"
              disabled={isDealing}
              onClick={handleSkip}
              className="w-full py-2.5 rounded-2xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/30 text-xs font-bold text-purple-200 flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <SkipForward className="w-3.5 h-3.5 text-purple-300" /> Сменить карту бесплатно
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
