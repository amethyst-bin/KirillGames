import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Bomb } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MinesGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type TileState = 'hidden' | 'gem' | 'mine';

function calculateMinesMultiplier(minesCount: number, gemsOpened: number): number {
  if (gemsOpened === 0) return 1.0;
  let mult = 1.0;
  for (let i = 0; i < gemsOpened; i++) {
    mult *= (25 - i) / (25 - minesCount - i);
  }
  return Math.round(mult * 0.97 * 100) / 100;
}

export const MinesGame: React.FC<MinesGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [bet, setBet] = useState(50);
  const [minesCount, setMinesCount] = useState(3);
  const [grid, setGrid] = useState<TileState[]>(Array(25).fill('hidden'));
  const [mineLocations, setMineLocations] = useState<Set<number>>(new Set());
  const [gemsOpened, setGemsOpened] = useState(0);
  const [gameResult, setGameResult] = useState<string | null>(null);

  const startGame = () => {
    if (!user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    const mines = new Set<number>();
    while (mines.size < minesCount) {
      mines.add(Math.floor(Math.random() * 25));
    }

    setMineLocations(mines);
    setGrid(Array(25).fill('hidden'));
    setGemsOpened(0);
    setIsPlaying(true);
    setGameResult(null);
  };

  const handleTileClick = (index: number) => {
    if (!isPlaying || grid[index] !== 'hidden') return;

    if (mineLocations.has(index)) {
      // Hit a mine!
      soundManager.playReelStop(0);
      const newGrid = grid.map((t, i) => {
        if (mineLocations.has(i)) return 'mine' as TileState;
        return t;
      });
      setGrid(newGrid);
      setIsPlaying(false);
      setGameResult('💥 БУХ! Вы подорвались на мине.');
      recordGameResult('mines', bet, 0, 0);
    } else {
      // Found a gem!
      soundManager.playCoin();
      const newGrid = [...grid];
      newGrid[index] = 'gem';
      setGrid(newGrid);

      const newGems = gemsOpened + 1;
      setGemsOpened(newGems);

      // If all safe tiles opened
      if (newGems === 25 - minesCount) {
        const mult = calculateMinesMultiplier(minesCount, newGems);
        const winAmount = Math.floor(bet * mult);
        setIsPlaying(false);
        soundManager.playBigWin();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        setGameResult(`💎 ВСЕ МИНЫ ОБОЙДЕНЫ! +${winAmount} 🪙 (x${mult.toFixed(2)})`);
        recordGameResult('mines', bet, winAmount, mult);
      }
    }
  };

  const handleCashout = () => {
    if (!isPlaying || gemsOpened === 0) return;
    const mult = calculateMinesMultiplier(minesCount, gemsOpened);
    const winAmount = Math.floor(bet * mult);

    soundManager.playBigWin();
    setIsPlaying(false);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
    setGameResult(`Забрано: +${winAmount} 🪙 (x${mult.toFixed(2)})`);

    // Reveal remaining mines
    const newGrid = grid.map((t, i) => {
      if (mineLocations.has(i)) return 'mine' as TileState;
      return t;
    });
    setGrid(newGrid);

    recordGameResult('mines', bet, winAmount, mult);
  };

  const currentMultiplier = calculateMinesMultiplier(minesCount, gemsOpened);

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

        <div className="flex items-center gap-1.5">
          <Bomb className="w-4 h-4 text-rose-400" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Мины 5x5
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* Info bar */}
      <div className="w-full bg-purple-950/70 border border-purple-400/30 rounded-2xl py-1.5 px-3 flex items-center justify-between text-xs font-bold">
        <span className="text-purple-300">Мин на поле: {minesCount}</span>
        <span className="text-emerald-400 font-mono font-black">
          Открыто алмазов: {gemsOpened}
        </span>
        <span className="text-amber-300 font-mono font-black">
          {currentMultiplier.toFixed(2)}x
        </span>
      </div>

      {/* 5x5 Mines Grid */}
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1a082e] to-[#0d0318] border-2 border-purple-500/40 p-3 shadow-2xl">
        <div className="grid grid-cols-5 gap-2 w-full">
          {grid.map((tile, idx) => (
            <button
              key={idx}
              disabled={!isPlaying || tile !== 'hidden'}
              onClick={() => handleTileClick(idx)}
              className={`h-12 sm:h-14 rounded-xl font-black text-xl flex items-center justify-center transition-all duration-150 ${
                tile === 'gem'
                  ? 'bg-emerald-500 text-white shadow-md scale-105'
                  : tile === 'mine'
                  ? 'bg-rose-600 text-white shadow-md animate-bounce'
                  : isPlaying
                  ? 'bg-purple-900/90 border border-purple-400/40 hover:bg-purple-800 active:scale-90 text-purple-300 cursor-pointer'
                  : 'bg-purple-950/60 border border-purple-400/20 text-purple-600'
              }`}
            >
              {tile === 'gem' ? '💎' : tile === 'mine' ? '💣' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Result announcement */}
      {gameResult && (
        <div className="bg-black/80 border border-amber-400 rounded-2xl py-1.5 px-4 text-center font-black text-xs text-amber-300 uppercase shadow-md animate-bounce">
          {gameResult}
        </div>
      )}

      {/* Action Controls */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        {isPlaying ? (
          <button
            disabled={gemsOpened === 0}
            onClick={handleCashout}
            className="cartoon-btn btn-spin w-full py-3.5 text-base font-black flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>ЗАБРАТЬ</span>
            <span className="font-mono">
              (+{Math.floor(bet * currentMultiplier)} 🪙)
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Bet Amount */}
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-purple-300 uppercase">Ставка</span>
                <div className="flex items-center gap-1.5 bg-black/40 border border-purple-400/30 rounded-xl px-2 py-1.5 mt-0.5">
                  <span className="text-sm">🪙</span>
                  <input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent font-mono font-black text-amber-300 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Mine count */}
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-purple-300 uppercase">Мин (1-15)</span>
                <div className="flex items-center gap-1.5 bg-black/40 border border-purple-400/30 rounded-xl px-2 py-1.5 mt-0.5">
                  <Bomb className="w-4 h-4 text-rose-400" />
                  <select
                    value={minesCount}
                    onChange={(e) => setMinesCount(parseInt(e.target.value))}
                    className="w-full bg-transparent font-mono font-black text-white text-sm focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 7, 10, 15].map((m) => (
                      <option key={m} value={m} className="bg-purple-950 text-white">
                        {m} мин
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="cartoon-btn btn-gold w-full py-3 text-base font-black"
            >
              НАЧАТЬ ИГРУ ({bet} 🪙)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
