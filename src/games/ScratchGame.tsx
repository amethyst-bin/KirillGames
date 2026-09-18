import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Plus, Sparkles, Wand2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScratchGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface ScratchSymbol {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  weight: number; // For RNG probability
}

const SYMBOLS: ScratchSymbol[] = [
  { id: 'diamond',  name: 'Бриллиант', emoji: '💎', multiplier: 500, weight: 2 },
  { id: 'crown',    name: 'Корона',    emoji: '👑', multiplier: 100, weight: 4 },
  { id: 'gold_bag', name: 'Мешок',     emoji: '💰', multiplier: 50,  weight: 8 },
  { id: 'lightning',name: 'Молния',    emoji: '⚡', multiplier: 25,  weight: 15 },
  { id: 'clover',   name: 'Клевер',    emoji: '🍀', multiplier: 10,  weight: 30 },
  { id: 'coin',     name: 'Монета',    emoji: '🪙', multiplier: 5,   weight: 50 },
  { id: 'cherry',   name: 'Вишни',     emoji: '🍒', multiplier: 2,   weight: 80 },
];

const TICKET_PRICES = [50, 100, 500, 1000, 5000];

interface CellData {
  symbol: ScratchSymbol;
  isRevealed: boolean;
  isWinning: boolean;
}

export const ScratchGame: React.FC<ScratchGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [ticketPrice, setTicketPrice] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [cells, setCells] = useState<CellData[]>([]);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [winningSymbol, setWinningSymbol] = useState<ScratchSymbol | null>(null);
  const [recentWins, setRecentWins] = useState<number[]>([5, 2, 10, 2, 50]);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Купите билет и сотрите 9 ячеек!');

  // Pick symbol based on weighted probability
  const getRandomSymbol = (): ScratchSymbol => {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const sym of SYMBOLS) {
      if (rand < sym.weight) return sym;
      rand -= sym.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  };

  // Generate a new 3x3 scratch card
  const handleBuyTicket = () => {
    if (!user || user.coins < ticketPrice) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    soundManager.playClick();
    setWinAmount(0);
    setWinningSymbol(null);
    setRevealedCount(0);
    setIsPlaying(true);
    setStatusMessage('Сотрите ячейки пальцем или нажмите «Стереть всё»!');

    // Decide if this ticket is a winning ticket (~38% hit rate)
    const isWin = Math.random() < 0.38;
    let chosenWinningSym: ScratchSymbol | null = null;

    if (isWin) {
      // Pick which symbol wins
      const winRoll = Math.random();
      if (winRoll < 0.005) chosenWinningSym = SYMBOLS[0]; // 💎 x500
      else if (winRoll < 0.02) chosenWinningSym = SYMBOLS[1]; // 👑 x100
      else if (winRoll < 0.06) chosenWinningSym = SYMBOLS[2]; // 💰 x50
      else if (winRoll < 0.15) chosenWinningSym = SYMBOLS[3]; // ⚡ x25
      else if (winRoll < 0.35) chosenWinningSym = SYMBOLS[4]; // 🍀 x10
      else if (winRoll < 0.65) chosenWinningSym = SYMBOLS[5]; // 🪙 x5
      else chosenWinningSym = SYMBOLS[6]; // 🍒 x2
    }

    const grid: ScratchSymbol[] = [];
    if (chosenWinningSym) {
      // Place 3 winning symbols in random positions
      grid.push(chosenWinningSym, chosenWinningSym, chosenWinningSym);
      while (grid.length < 9) {
        const filler = getRandomSymbol();
        // Avoid creating 3 of another symbol
        const count = grid.filter(s => s.id === filler.id).length;
        if (count < 2) {
          grid.push(filler);
        }
      }
    } else {
      // Generate losing card: ensure no symbol appears 3 times
      while (grid.length < 9) {
        const candidate = getRandomSymbol();
        const count = grid.filter(s => s.id === candidate.id).length;
        if (count < 2) {
          grid.push(candidate);
        }
      }
    }

    // Shuffle grid
    for (let i = grid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [grid[i], grid[j]] = [grid[j], grid[i]];
    }

    setCells(grid.map(sym => ({
      symbol: sym,
      isRevealed: false,
      isWinning: false,
    })));
  };

  // Scratch an individual cell
  const handleScratchCell = (index: number) => {
    if (!isPlaying || cells[index].isRevealed) return;

    soundManager.playScratch();

    const updated = [...cells];
    updated[index].isRevealed = true;
    setCells(updated);

    const newRevealed = revealedCount + 1;
    setRevealedCount(newRevealed);

    // If all 9 revealed, check outcome
    if (newRevealed === 9) {
      finalizeCard(updated);
    }
  };

  // Scratch all 9 cells instantly
  const handleScratchAll = () => {
    if (!isPlaying) return;

    soundManager.playScratch();
    const updated = cells.map(c => ({ ...c, isRevealed: true }));
    setCells(updated);
    setRevealedCount(9);
    finalizeCard(updated);
  };

  const finalizeCard = async (finalCells: CellData[]) => {
    setIsPlaying(false);

    // Count symbol appearances
    const counts: Record<string, { count: number; symbol: ScratchSymbol; indices: number[] }> = {};
    finalCells.forEach((c, idx) => {
      if (!counts[c.symbol.id]) {
        counts[c.symbol.id] = { count: 0, symbol: c.symbol, indices: [] };
      }
      counts[c.symbol.id].count += 1;
      counts[c.symbol.id].indices.push(idx);
    });

    let bestWinSymbol: ScratchSymbol | null = null;
    let winningIndices: number[] = [];

    Object.values(counts).forEach(entry => {
      if (entry.count >= 3) {
        if (!bestWinSymbol || entry.symbol.multiplier > bestWinSymbol.multiplier) {
          bestWinSymbol = entry.symbol;
          winningIndices = entry.indices;
        }
      }
    });

    if (bestWinSymbol) {
      const sym = bestWinSymbol as ScratchSymbol;
      const win = Math.floor(ticketPrice * sym.multiplier);
      setWinAmount(win);
      setWinningSymbol(sym);

      // Highlight winning cells
      const highlighted = finalCells.map((c, idx) => ({
        ...c,
        isWinning: winningIndices.includes(idx),
      }));
      setCells(highlighted);

      setStatusMessage(`🎉 СОВПАДЕНИЕ 3x ${sym.emoji}! ВЫИГРЫШ: +${formatCoins(win)} 🪙 (x${sym.multiplier})`);
      soundManager.playBigWin();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

      await recordGameResult('scratch', ticketPrice, win, sym.multiplier);
      setRecentWins(prev => [sym.multiplier, ...prev.slice(0, 5)]);
    } else {
      setStatusMessage('Увы, нет 3 совпадений. Испытайте удачу снова!');
      soundManager.playReelStop(0);
      await recordGameResult('scratch', ticketPrice, 0, 0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#120624] text-white select-none overflow-hidden relative font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#1b0a36] border-b border-purple-900/60 z-20 flex-shrink-0">
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
            🎫 Скретч-Карты
            <span className="text-[10px] bg-amber-500 text-purple-950 font-black px-1.5 py-0.2 rounded-full">
              до x500
            </span>
          </div>
          <div className="text-[10px] text-purple-300 font-semibold tracking-wide">
            Мгновенная Лотерея
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

      {/* Paytable Horizontal Scroll */}
      <div className="px-2.5 py-1.5 bg-[#16062d] border-b border-purple-900/40 flex items-center justify-between gap-1 overflow-x-auto z-10 flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-bold w-full justify-between max-w-md mx-auto">
          {SYMBOLS.map(sym => (
            <div
              key={sym.id}
              className={`flex-1 py-1 px-1 rounded-xl text-center border flex flex-col items-center transition-all ${
                winningSymbol?.id === sym.id
                  ? 'bg-amber-500 border-amber-300 text-slate-950 font-black scale-105 shadow-md animate-pulse'
                  : 'bg-black/30 border-purple-900/30 text-purple-200'
              }`}
            >
              <div className="text-base">{sym.emoji}</div>
              <div className="text-[10px] font-black text-amber-400">x{sym.multiplier}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Lottery Area */}
      <div className="flex-1 relative flex flex-col justify-between p-3 overflow-hidden bg-gradient-to-b from-[#16072e] via-[#1d093d] to-[#120624]">
        {/* Top Status & Recent Wins */}
        <div className="w-full flex items-center justify-between px-1 z-10">
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-purple-800/40 text-[10px] font-bold text-purple-300">
            <span>Топ множители:</span>
            {recentWins.slice(0, 4).map((w, idx) => (
              <span key={idx} className="text-amber-400">x{w}</span>
            ))}
          </div>

          <div className="text-[10px] text-purple-300 font-bold">
            {cells.length > 0 ? `Открыто: ${revealedCount}/9` : 'Новый билет'}
          </div>
        </div>

        {/* Status Callout Banner */}
        <div className="self-center z-10 my-1">
          <div className="px-3 py-1.5 rounded-full bg-black/60 border border-purple-500/40 text-xs font-bold text-purple-200 text-center shadow-md flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{statusMessage}</span>
          </div>
        </div>

        {/* 3x3 Scratch Card Container */}
        <div className="relative w-full max-w-xs mx-auto aspect-square bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 p-2.5 rounded-3xl border-4 border-amber-400/80 shadow-2xl flex flex-col justify-between">
          {/* Card Hologram Header */}
          <div className="flex items-center justify-between px-2 pb-1 text-slate-950 font-black text-[10px] tracking-widest uppercase">
            <span>★ СЧАСТЛИВЫЙ БИЛЕТ ★</span>
            <span className={winAmount > 0 ? 'text-amber-200 font-extrabold animate-pulse' : ''}>
              {winAmount > 0 ? `+${formatCoins(winAmount)} 🪙` : `${formatCoins(ticketPrice)} 🪙`}
            </span>
          </div>

          {/* 3x3 Cells Grid */}
          <div className="grid grid-cols-3 gap-2 flex-1 p-1 bg-purple-950/80 rounded-2xl border border-amber-300/40">
            {cells.length === 0 ? (
              /* Placeholder Unpurchased Grid */
              Array.from({ length: 9 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-gradient-to-br from-slate-400 via-zinc-300 to-slate-500 border-2 border-slate-300 flex items-center justify-center text-slate-700 font-black text-xl shadow-inner opacity-70"
                >
                  ❓
                </div>
              ))
            ) : (
              /* Active Scratch Cells */
              cells.map((cell, idx) => (
                <div
                  key={idx}
                  onClick={() => handleScratchCell(idx)}
                  className={`relative rounded-xl border-2 flex items-center justify-center text-3xl cursor-pointer transition-all duration-200 select-none ${
                    cell.isRevealed
                      ? cell.isWinning
                        ? 'bg-amber-400 border-yellow-200 scale-105 shadow-xl animate-bounce'
                        : 'bg-[#2b1055] border-purple-500/50 shadow-inner'
                      : 'bg-gradient-to-br from-slate-300 via-zinc-200 to-slate-400 border-white hover:brightness-105 active:scale-95 shadow-md'
                  }`}
                >
                  {cell.isRevealed ? (
                    <div className="flex flex-col items-center">
                      <span className="drop-shadow-sm">{cell.symbol.emoji}</span>
                      <span className="text-[9px] font-black text-amber-300 tracking-tighter -mt-1">
                        x{cell.symbol.multiplier}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-600">
                      <span className="text-sm font-black">СТЕРЕТЬ</span>
                      <span className="text-[10px] opacity-70">✦</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Ticket Footer Decal */}
          <div className="text-center text-[9px] text-amber-200 font-bold pt-1 tracking-tight">
            Соберите 3 одинаковых символа для победы!
          </div>
        </div>

        {/* Action Controls & Price Selector */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-2 z-20 mt-2">
          {/* Main Action Buttons */}
          <div className="flex gap-2">
            {!isPlaying ? (
              <button
                type="button"
                onClick={handleBuyTicket}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-purple-950 font-black text-base shadow-xl border-2 border-amber-200 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Купить билет ({formatCoins(ticketPrice)} 🪙)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleScratchAll}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base shadow-xl border-2 border-emerald-300 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                <span>Стереть всё сразу</span>
              </button>
            )}
          </div>

          {/* Price Selector Chips */}
          <div className="bg-[#1b0a36]/95 p-2 rounded-2xl border border-purple-800/60 flex flex-col gap-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-bold uppercase text-[10px] tracking-wider">
                Стоимость билета
              </span>
              <div className="text-amber-300 font-black">
                {formatCoins(ticketPrice)} 🪙
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {TICKET_PRICES.map((price) => (
                <button
                  key={price}
                  type="button"
                  disabled={isPlaying}
                  onClick={() => {
                    soundManager.playClick();
                    setTicketPrice(price);
                  }}
                  className={`py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                    ticketPrice === price
                      ? 'bg-amber-400 text-purple-950 border-amber-200 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 border-purple-800/50 hover:bg-purple-900 disabled:opacity-50'
                  }`}
                >
                  {price >= 1000 ? `${price / 1000}K` : price}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
