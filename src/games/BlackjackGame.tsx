import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BlackjackGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number;
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 },
  { rank: '5', val: 5 }, { rank: '6', val: 6 }, { rank: '7', val: 7 },
  { rank: '8', val: 8 }, { rank: '9', val: 9 }, { rank: '10', val: 10 },
  { rank: 'J', val: 10 }, { rank: 'Q', val: 10 }, { rank: 'K', val: 10 },
  { rank: 'A', val: 11 },
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r.rank, value: r.val });
    }
  }
  // Shuffle
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHand(cards: Card[]): number {
  let sum = cards.reduce((acc, c) => acc + c.value, 0);
  let aces = cards.filter((c) => c.rank === 'A').length;
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces -= 1;
  }
  return sum;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [deck, setDeck] = useState<Card[]>(createDeck);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'BETTING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'RESOLVED'>('BETTING');
  const [bet, setBet] = useState(50);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const startRound = () => {
    if (!user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    const newDeck = createDeck();
    const p1 = newDeck.pop()!;
    const d1 = newDeck.pop()!;
    const p2 = newDeck.pop()!;
    const d2 = newDeck.pop()!;

    const initialPlayer = [p1, p2];
    const initialDealer = [d1, d2];

    setDeck(newDeck);
    setPlayerCards(initialPlayer);
    setDealerCards(initialDealer);
    setResultMessage(null);

    const pScore = calculateHand(initialPlayer);
    const dScore = calculateHand(initialDealer);

    // Natural Blackjack check
    if (pScore === 21 || dScore === 21) {
      setGameState('RESOLVED');
      if (pScore === 21 && dScore === 21) {
        setResultMessage('НИЧЬЯ! Оба собрали 21');
        recordGameResult('blackjack', bet, bet, 1.0);
      } else if (pScore === 21) {
        const win = Math.floor(bet * 2.5);
        setResultMessage(`БЛЭКДЖЕК! Выигрыш +${win} 🪙`);
        soundManager.playBigWin();
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
        recordGameResult('blackjack', bet, win, 2.5);
      } else {
        setResultMessage('У дилера Блэкджек. Вы проиграли.');
        soundManager.playReelStop(0);
        recordGameResult('blackjack', bet, 0, 0);
      }
    } else {
      setGameState('PLAYER_TURN');
    }
  };

  const handleHit = () => {
    soundManager.playClick();
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newCards = [...playerCards, card];
    setDeck(newDeck);
    setPlayerCards(newCards);

    const score = calculateHand(newCards);
    if (score > 21) {
      setGameState('RESOLVED');
      setResultMessage(`ПЕРЕБОР (${score})! Вы проиграли.`);
      soundManager.playReelStop(0);
      recordGameResult('blackjack', bet, 0, 0);
    }
  };

  const handleStand = () => {
    soundManager.playClick();
    setGameState('DEALER_TURN');

    let currentDeck = [...deck];
    const currentDealer = [...dealerCards];
    let dScore = calculateHand(currentDealer);

    while (dScore < 17) {
      const c = currentDeck.pop()!;
      currentDealer.push(c);
      dScore = calculateHand(currentDealer);
    }

    setDeck(currentDeck);
    setDealerCards(currentDealer);
    setGameState('RESOLVED');

    const pScore = calculateHand(playerCards);
    if (dScore > 21) {
      const win = bet * 2;
      setResultMessage(`ДИЛЕР ПЕРЕБРАЛ (${dScore})! Вы выиграли +${win} 🪙`);
      soundManager.playWin();
      recordGameResult('blackjack', bet, win, 2.0);
    } else if (pScore > dScore) {
      const win = bet * 2;
      setResultMessage(`ПОБЕДА! (${pScore} против ${dScore}) +${win} 🪙`);
      soundManager.playWin();
      recordGameResult('blackjack', bet, win, 2.0);
    } else if (pScore === dScore) {
      setResultMessage(`НИЧЬЯ (${pScore} : ${dScore}). Ставка возвращена`);
      recordGameResult('blackjack', bet, bet, 1.0);
    } else {
      setResultMessage(`ПОРАЖЕНИЕ. У дилера ${dScore}, у вас ${pScore}`);
      soundManager.playReelStop(0);
      recordGameResult('blackjack', bet, 0, 0);
    }
  };

  const handleDouble = () => {
    if (!user || user.coins < bet * 2) {
      alert('Недостаточно монет для удвоения!');
      return;
    }
    soundManager.playClick();
    const newBet = bet * 2;
    setBet(newBet);

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newPlayerCards = [...playerCards, card];
    setDeck(newDeck);
    setPlayerCards(newPlayerCards);

    const pScore = calculateHand(newPlayerCards);
    if (pScore > 21) {
      setGameState('RESOLVED');
      setResultMessage(`ПЕРЕБОР (${pScore})! Вы проиграли.`);
      recordGameResult('blackjack', newBet, 0, 0);
      return;
    }

    // Dealer turn
    const currentDealer = [...dealerCards];
    let dScore = calculateHand(currentDealer);
    while (dScore < 17) {
      const c = newDeck.pop()!;
      currentDealer.push(c);
      dScore = calculateHand(currentDealer);
    }
    setDeck(newDeck);
    setDealerCards(currentDealer);
    setGameState('RESOLVED');

    if (dScore > 21 || pScore > dScore) {
      const win = newBet * 2;
      setResultMessage(`ПОБЕДА С УДВОЕНИЕМ! +${win} 🪙`);
      soundManager.playBigWin();
      recordGameResult('blackjack', newBet, win, 2.0);
    } else if (pScore === dScore) {
      setResultMessage(`НИЧЬЯ (${pScore} : ${dScore})`);
      recordGameResult('blackjack', newBet, newBet, 1.0);
    } else {
      setResultMessage(`ПОРАЖЕНИЕ (${pScore} против ${dScore})`);
      recordGameResult('blackjack', newBet, 0, 0);
    }
  };

  const playerScore = calculateHand(playerCards);
  const dealerScore =
    gameState === 'PLAYER_TURN'
      ? dealerCards[0]?.value || 0
      : calculateHand(dealerCards);

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

        <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
          Blackjack 21
        </h2>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* Blackjack Table */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#0b3323] via-[#08291c] to-[#041710] border-2 border-emerald-500/50 p-4 shadow-2xl flex flex-col items-center gap-5 min-h-[340px] justify-between">
        {/* Dealer Area */}
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-emerald-300">
            <span>ДИЛЕР</span>
            <span className="font-mono font-black">
              Очки: {dealerCards.length > 0 ? dealerScore : 0}
            </span>
          </div>

          <div className="flex gap-2 items-center justify-center min-h-[75px]">
            {dealerCards.map((c, i) => {
              const isHidden = i === 1 && gameState === 'PLAYER_TURN';
              const isRed = c.suit === '♥' || c.suit === '♦';

              return (
                <div
                  key={i}
                  className={`w-14 h-20 rounded-xl flex flex-col items-center justify-between p-1.5 shadow-md border ${
                    isHidden
                      ? 'bg-purple-950 border-purple-500/50 text-purple-300 text-lg flex items-center justify-center'
                      : `bg-white border-gray-300 ${isRed ? 'text-red-600' : 'text-gray-900'}`
                  }`}
                >
                  {isHidden ? (
                    <span className="font-black text-sm">🂠</span>
                  ) : (
                    <>
                      <span className="font-black text-xs leading-none self-start">{c.rank}</span>
                      <span className="text-2xl leading-none">{c.suit}</span>
                      <span className="font-black text-xs leading-none self-end">{c.rank}</span>
                    </>
                  )}
                </div>
              );
            })}
            {dealerCards.length === 0 && (
              <span className="text-xs text-emerald-500/60 font-bold py-6">
                Ждём начала раздачи...
              </span>
            )}
          </div>
        </div>

        {/* Result Announcement */}
        {resultMessage && (
          <div className="bg-black/80 border border-amber-400 rounded-2xl py-1.5 px-4 text-center font-black text-xs text-amber-300 uppercase shadow-lg animate-bounce">
            {resultMessage}
          </div>
        )}

        {/* Player Area */}
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-emerald-300">
            <span>ВЫ</span>
            <span className="font-mono font-black">
              Очки: {playerCards.length > 0 ? playerScore : 0}
            </span>
          </div>

          <div className="flex gap-2 items-center justify-center min-h-[75px]">
            {playerCards.map((c, i) => {
              const isRed = c.suit === '♥' || c.suit === '♦';
              return (
                <div
                  key={i}
                  className={`w-14 h-20 rounded-xl bg-white border border-gray-300 flex flex-col items-center justify-between p-1.5 shadow-md ${
                    isRed ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  <span className="font-black text-xs leading-none self-start">{c.rank}</span>
                  <span className="text-2xl leading-none">{c.suit}</span>
                  <span className="font-black text-xs leading-none self-end">{c.rank}</span>
                </div>
              );
            })}
            {playerCards.length === 0 && (
              <span className="text-xs text-emerald-500/60 font-bold py-6">
                Сделайте ставку и нажмите «Раздать»
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        {gameState === 'PLAYER_TURN' ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleHit}
              className="cartoon-btn btn-spin py-3 text-sm font-black"
            >
              + ЕЩЁ
            </button>
            <button
              onClick={handleStand}
              className="cartoon-btn btn-red py-3 text-sm font-black"
            >
              ХВАТИТ
            </button>
            <button
              disabled={playerCards.length !== 2}
              onClick={handleDouble}
              className="cartoon-btn btn-gold py-3 text-xs font-black disabled:opacity-40"
            >
              УДВОИТЬ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Bet buttons */}
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
              onClick={startRound}
              className="cartoon-btn btn-spin flex-1 py-3 text-base font-black"
            >
              РАЗДАТЬ ({bet} 🪙)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
