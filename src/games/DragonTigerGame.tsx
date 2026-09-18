import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Coins, Flame, Swords } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DragonTigerGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type BetTarget = 'dragon' | 'tie' | 'tiger';

interface Card {
  rank: string;
  suit: string;
  value: number;
  color: 'red' | 'black';
}

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { label: 'A', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: 'J', value: 11 },
  { label: 'Q', value: 12 },
  { label: 'K', value: 13 },
];

const BET_AMOUNTS = [25, 50, 100, 250, 500];

function getRandomCard(): Card {
  const r = RANKS[Math.floor(Math.random() * RANKS.length)];
  const s = SUITS[Math.floor(Math.random() * SUITS.length)];
  return {
    rank: r.label,
    suit: s,
    value: r.value,
    color: s === '♥' || s === '♦' ? 'red' : 'black',
  };
}

export const DragonTigerGame: React.FC<DragonTigerGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [betIndex, setBetIndex] = useState(1);
  const [customBet, setCustomBet] = useState<number | null>(null);
  const [betTarget, setBetTarget] = useState<BetTarget>('dragon');
  
  const [dragonCard, setDragonCard] = useState<Card | null>(null);
  const [tigerCard, setTigerCard] = useState<Card | null>(null);
  const [isDealing, setIsDealing] = useState(false);
  const [winner, setWinner] = useState<BetTarget | null>(null);
  const [statusText, setStatusText] = useState('Сделайте ставку на Дракона, Тигра или Ничью');

  const currentBet = customBet !== null ? customBet : BET_AMOUNTS[betIndex];

  const handleDeal = () => {
    if (isDealing || !user) return;
    if (user.coins < currentBet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    soundManager.vibrate([20, 30]);
    setIsDealing(true);
    setDragonCard(null);
    setTigerCard(null);
    setWinner(null);
    setStatusText('Раздача карт...');

    const dCard = getRandomCard();
    let tCard = getRandomCard();
    // Prevent identical card
    while (tCard.rank === dCard.rank && tCard.suit === dCard.suit) {
      tCard = getRandomCard();
    }

    setTimeout(() => {
      setDragonCard(dCard);
      soundManager.playClick();
      soundManager.vibrate([25]);

      setTimeout(() => {
        setTigerCard(tCard);
        soundManager.playClick();
        soundManager.vibrate([25]);

        let roundWinner: BetTarget = 'tie';
        if (dCard.value > tCard.value) {
          roundWinner = 'dragon';
        } else if (tCard.value > dCard.value) {
          roundWinner = 'tiger';
        }

        setWinner(roundWinner);
        setIsDealing(false);

        const isWin = betTarget === roundWinner;
        const multiplier = roundWinner === 'tie' ? 11.0 : 2.0;

        if (isWin) {
          const won = Math.floor(currentBet * multiplier);
          soundManager.playCoin();
          soundManager.playBigWin();
          soundManager.vibrate([40, 80, 40, 80]);
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.55 } });
          setStatusText(`🎉 ПОБЕДА! Выигрыш: +${won.toLocaleString()} 🪙 (x${multiplier})`);
          recordGameResult('dragon_tiger', currentBet, won, multiplier);
        } else {
          soundManager.playExplosion();
          soundManager.vibrate([80]);
          const winName = roundWinner === 'dragon' ? 'Дракон' : roundWinner === 'tiger' ? 'Тигр' : 'Ничья';
          setStatusText(`💥 Победил ${winName}! Попробуйте снова!`);
          recordGameResult('dragon_tiger', currentBet, 0, 0);
        }
      }, 550);
    }, 450);
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 hover:bg-purple-800 text-xs font-bold text-white transition-all active:scale-95"
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

      {/* Game Title Card */}
      <div className="w-full bg-gradient-to-r from-red-600/30 via-purple-900/40 to-amber-600/30 border border-white/15 rounded-2xl p-3 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-2xl shadow-inner border border-amber-300/40">
            🐉
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
              Дракон и Тигр <span className="text-xs text-amber-400 font-black">до x11</span>
            </h2>
            <p className="text-[11px] text-purple-200 font-medium">
              Чья карта старше? Быстрый раунд в одно касание!
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl">🐅</span>
        </div>
      </div>

      {/* Arena Display: Dragon vs Tiger */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#1c082e] via-[#10031d] to-[#0a0113] border-2 border-purple-500/40 p-4 flex flex-col items-center justify-between min-h-[220px] shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/15 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 blur-2xl rounded-full pointer-events-none" />

        {/* Top Status */}
        <div className="w-full text-center py-1 px-3 rounded-xl bg-black/40 border border-white/10 text-xs font-black text-amber-300">
          {statusText}
        </div>

        {/* Duel Area */}
        <div className="w-full flex items-center justify-around my-3">
          {/* Dragon Side */}
          <div className={`flex flex-col items-center gap-1.5 transition-transform ${winner === 'dragon' ? 'scale-105' : ''}`}>
            <div className="flex items-center gap-1 text-sm font-black text-rose-400 uppercase tracking-wide">
              <span>🐉 Дракон</span>
              {winner === 'dragon' && <span className="text-xs bg-rose-600 text-white px-1.5 rounded-full animate-bounce">WIN!</span>}
            </div>

            {/* Dragon Card */}
            <div
              className={`w-24 h-36 rounded-2xl border-2 flex flex-col justify-between p-2 shadow-2xl transition-all duration-300 select-none ${
                dragonCard
                  ? 'bg-white border-rose-500/60 shadow-rose-500/20 animate-reel-land'
                  : 'bg-gradient-to-br from-rose-950 to-purple-950 border-rose-500/30 flex items-center justify-center'
              }`}
            >
              {dragonCard ? (
                <>
                  <div className={`flex justify-between items-start font-black text-base leading-none ${dragonCard.color === 'red' ? '!text-rose-600' : '!text-zinc-950'}`}>
                    <span>{dragonCard.rank}</span>
                    <span>{dragonCard.suit}</span>
                  </div>
                  <div className={`text-4xl text-center leading-none ${dragonCard.color === 'red' ? '!text-rose-600' : '!text-zinc-950'}`}>
                    {dragonCard.suit}
                  </div>
                  <div className={`flex justify-between items-end font-black text-base leading-none rotate-180 ${dragonCard.color === 'red' ? '!text-rose-600' : '!text-zinc-950'}`}>
                    <span>{dragonCard.rank}</span>
                    <span>{dragonCard.suit}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl opacity-40">🐉</span>
                  <span className="text-[10px] text-rose-400/60 font-black">DRAGON</span>
                </div>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/60 border border-purple-400/40 flex items-center justify-center text-amber-400 font-black shadow-inner">
              <Swords className="w-5 h-5" />
            </div>
            {winner === 'tie' && (
              <span className="text-[10px] bg-emerald-500 text-purple-950 font-black px-2 py-0.5 rounded-full animate-pulse shadow">
                НИЧЬЯ!
              </span>
            )}
          </div>

          {/* Tiger Side */}
          <div className={`flex flex-col items-center gap-1.5 transition-transform ${winner === 'tiger' ? 'scale-105' : ''}`}>
            <div className="flex items-center gap-1 text-sm font-black text-amber-400 uppercase tracking-wide">
              <span>Тигр 🐅</span>
              {winner === 'tiger' && <span className="text-xs bg-amber-500 text-purple-950 px-1.5 rounded-full animate-bounce">WIN!</span>}
            </div>

            {/* Tiger Card */}
            <div
              className={`w-24 h-36 rounded-2xl border-2 flex flex-col justify-between p-2 shadow-2xl transition-all duration-300 select-none ${
                tigerCard
                  ? 'bg-white border-amber-500/60 shadow-amber-500/20 animate-reel-land'
                  : 'bg-gradient-to-br from-amber-950 to-purple-950 border-amber-500/30 flex items-center justify-center'
              }`}
            >
              {tigerCard ? (
                <>
                  <div className={`flex justify-between items-start font-black text-base leading-none ${tigerCard.color === 'red' ? '!text-rose-600' : '!text-zinc-950'}`}>
                    <span>{tigerCard.rank}</span>
                    <span>{tigerCard.suit}</span>
                  </div>
                  <div className={`text-4xl text-center leading-none ${tigerCard.color === 'red' ? '!text-rose-600' : '!text-zinc-950'}`}>
                    {tigerCard.suit}
                  </div>
                  <div className={`flex justify-between items-end font-black text-base leading-none rotate-180 ${tigerCard.color === 'red' ? '!text-rose-600' : '!text-zinc-950'}`}>
                    <span>{tigerCard.rank}</span>
                    <span>{tigerCard.suit}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl opacity-40">🐅</span>
                  <span className="text-[10px] text-amber-400/60 font-black">TIGER</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rules note */}
        <div className="text-[10px] text-purple-300/70 font-medium">
          Старшинство: К (13) &gt; Q (12) &gt; J (11) ... &gt; 2 &gt; А (1)
        </div>
      </div>

      {/* Target Selector (3 Fields) */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          disabled={isDealing}
          onClick={() => {
            soundManager.playClick();
            setBetTarget('dragon');
          }}
          className={`py-3 rounded-2xl border-2 flex flex-col items-center transition-all ${
            betTarget === 'dragon'
              ? 'bg-gradient-to-b from-red-600 to-rose-700 border-rose-400 shadow-lg shadow-rose-500/30 scale-[1.02]'
              : 'bg-[#1b0736] border-purple-500/30 text-rose-300/80 hover:border-rose-400/40'
          }`}
        >
          <span className="text-xs font-black uppercase tracking-wider">🐉 Дракон</span>
          <span className="text-[11px] font-extrabold text-amber-300 mt-0.5">x2.0 (1:1)</span>
        </button>

        <button
          disabled={isDealing}
          onClick={() => {
            soundManager.playClick();
            setBetTarget('tie');
          }}
          className={`py-3 rounded-2xl border-2 flex flex-col items-center transition-all ${
            betTarget === 'tie'
              ? 'bg-gradient-to-b from-emerald-600 to-teal-700 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-[1.02]'
              : 'bg-[#1b0736] border-purple-500/30 text-emerald-300/80 hover:border-emerald-400/40'
          }`}
        >
          <span className="text-xs font-black uppercase tracking-wider">🤝 Ничья</span>
          <span className="text-[11px] font-extrabold text-amber-300 mt-0.5">x11.0 (11:1)</span>
        </button>

        <button
          disabled={isDealing}
          onClick={() => {
            soundManager.playClick();
            setBetTarget('tiger');
          }}
          className={`py-3 rounded-2xl border-2 flex flex-col items-center transition-all ${
            betTarget === 'tiger'
              ? 'bg-gradient-to-b from-amber-500 to-yellow-600 text-purple-950 border-amber-300 shadow-lg shadow-amber-500/30 scale-[1.02]'
              : 'bg-[#1b0736] border-purple-500/30 text-amber-300/80 hover:border-amber-400/40'
          }`}
        >
          <span className="text-xs font-black uppercase tracking-wider">🐅 Тигр</span>
          <span className={`text-[11px] font-extrabold mt-0.5 ${betTarget === 'tiger' ? 'text-purple-950' : 'text-amber-300'}`}>
            x2.0 (1:1)
          </span>
        </button>
      </div>

      {/* Bet Controls */}
      <div className="w-full bg-[#18052e]/90 border border-purple-500/30 rounded-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-purple-200 uppercase tracking-wider">
            Размер ставки
          </span>
          <span className="text-xs font-black text-amber-300">
            Возможный куш: +{Math.floor(currentBet * (betTarget === 'tie' ? 11.0 : 2.0)).toLocaleString()} 🪙
          </span>
        </div>

        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {BET_AMOUNTS.map((amt, idx) => (
            <button
              key={amt}
              disabled={isDealing}
              onClick={() => {
                soundManager.playClick();
                setBetIndex(idx);
                setCustomBet(null);
              }}
              className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                customBet === null && betIndex === idx
                  ? 'bg-amber-400 text-purple-950 shadow-md scale-[1.02]'
                  : 'bg-purple-900/60 border border-purple-400/30 text-white hover:bg-purple-800'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Modifiers */}
        <div className="flex items-center gap-2">
          <button
            disabled={isDealing}
            onClick={() => {
              soundManager.playClick();
              const newBet = Math.max(10, Math.floor(currentBet / 2));
              setCustomBet(newBet);
            }}
            className="flex-1 py-1.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-400/30 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          >
            ½ ставки
          </button>
          <button
            disabled={isDealing}
            onClick={() => {
              soundManager.playClick();
              const newBet = Math.min(user?.coins || 10000, currentBet * 2);
              setCustomBet(newBet);
            }}
            className="flex-1 py-1.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-400/30 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          >
            2X ставка
          </button>
          <button
            disabled={isDealing}
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
          disabled={isDealing}
          onClick={handleDeal}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-purple-950 font-black text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Flame className="w-5 h-5 fill-current text-rose-600" />
          {isDealing ? 'Битва...' : `Раздать карты (${currentBet.toLocaleString()} 🪙)`}
        </button>
      </div>
    </div>
  );
};
