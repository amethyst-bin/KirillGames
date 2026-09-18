import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Castle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TowersGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

const FLOOR_MULTIPLIERS = [1.35, 1.85, 2.60, 3.75, 5.50, 8.20, 12.50, 20.00];

interface FloorState {
  tiles: ('hidden' | 'gem' | 'bomb')[];
  pickedIndex: number | null;
  bombIndex: number; // hidden until played or game over
}

export const TowersGame: React.FC<TowersGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(0); // 0..7
  const [bet, setBet] = useState(50);
  const [floors, setFloors] = useState<FloorState[]>([]);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  const initGame = () => {
    if (!user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    const newFloors: FloorState[] = [];
    for (let f = 0; f < 8; f++) {
      newFloors.push({
        tiles: ['hidden', 'hidden', 'hidden'],
        pickedIndex: null,
        bombIndex: Math.floor(Math.random() * 3),
      });
    }

    setFloors(newFloors);
    setCurrentFloor(0);
    setIsPlaying(true);
    setGameOverReason(null);
  };

  const handlePickTile = (tileIndex: number) => {
    if (!isPlaying) return;

    const floor = floors[currentFloor];
    if (tileIndex === floor.bombIndex) {
      // BOMB!
      soundManager.playReelStop(0);
      const updated = floors.map((f, i) => {
        if (i === currentFloor) {
          const t: ('hidden' | 'gem' | 'bomb')[] = ['gem', 'gem', 'gem'];
          t[f.bombIndex] = 'bomb';
          return { ...f, tiles: t, pickedIndex: tileIndex };
        }
        return f;
      });

      setFloors(updated);
      setIsPlaying(false);
      setGameOverReason('💥 Ловушка! Вы наступили на мину в башне.');
      recordGameResult('towers', bet, 0, 0);
    } else {
      // GEM!
      soundManager.playCoin();
      const updated = floors.map((f, i) => {
        if (i === currentFloor) {
          const t = [...f.tiles];
          t[tileIndex] = 'gem';
          return { ...f, tiles: t, pickedIndex: tileIndex };
        }
        return f;
      });

      setFloors(updated);

      if (currentFloor === 7) {
        // Top floor conquered!
        const winAmount = Math.floor(bet * FLOOR_MULTIPLIERS[7]);
        setIsPlaying(false);
        soundManager.playBigWin();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        setGameOverReason(`👑 ВЫ ПОКОРИЛИ ВСЮ БАШНЮ! +${winAmount} 🪙 (x20.0)`);
        recordGameResult('towers', bet, winAmount, FLOOR_MULTIPLIERS[7]);
      } else {
        setCurrentFloor((prev) => prev + 1);
      }
    }
  };

  const handleCashout = () => {
    if (!isPlaying || currentFloor === 0) return;
    const mult = FLOOR_MULTIPLIERS[currentFloor - 1];
    const winAmount = Math.floor(bet * mult);

    soundManager.playBigWin();
    setIsPlaying(false);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
    setGameOverReason(`Забрано: +${winAmount} 🪙 (x${mult.toFixed(2)})`);
    recordGameResult('towers', bet, winAmount, mult);
  };

  const currentMult = currentFloor > 0 ? FLOOR_MULTIPLIERS[currentFloor - 1] : 1.0;

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
          <Castle className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Башенки
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* The Tower (Floors ordered from 7 at top down to 0 at bottom) */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#231238] via-[#1a0c2c] to-[#0f051c] border-2 border-amber-500/40 p-3 shadow-2xl flex flex-col gap-1.5">
        {[7, 6, 5, 4, 3, 2, 1, 0].map((floorIdx) => {
          const isCurrent = isPlaying && currentFloor === floorIdx;
          const isPassed = floorIdx < currentFloor;
          const mult = FLOOR_MULTIPLIERS[floorIdx];
          const floorState = floors[floorIdx];

          return (
            <div
              key={floorIdx}
              className={`flex items-center justify-between px-2 py-1 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-amber-500/20 border-2 border-amber-400 scale-[1.02] shadow-md'
                  : isPassed
                  ? 'bg-emerald-500/10 border border-emerald-500/30 opacity-80'
                  : 'bg-black/30 border border-white/5 opacity-50'
              }`}
            >
              {/* Multiplier label */}
              <span className="text-[11px] font-mono font-black text-amber-300 w-14 text-left">
                x{mult.toFixed(2)}
              </span>

              {/* 3 Tiles */}
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((tileIdx) => {
                  const tile = floorState ? floorState.tiles[tileIdx] : 'hidden';

                  return (
                    <button
                      key={tileIdx}
                      disabled={!isCurrent}
                      onClick={() => handlePickTile(tileIdx)}
                      className={`w-14 h-8 rounded-lg flex items-center justify-center font-black text-base transition-all ${
                        tile === 'gem'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : tile === 'bomb'
                          ? 'bg-rose-600 text-white shadow-md animate-bounce'
                          : isCurrent
                          ? 'bg-purple-800/90 border border-amber-400/80 hover:bg-purple-700 active:scale-95 cursor-pointer text-amber-200'
                          : 'bg-purple-950/60 border border-purple-400/20'
                      }`}
                    >
                      {tile === 'gem' ? '💎' : tile === 'bomb' ? '💣' : isCurrent ? '❓' : '🪨'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status banner */}
      {gameOverReason && (
        <div className="bg-black/80 border border-amber-400 rounded-2xl py-1.5 px-4 text-center font-black text-xs text-amber-300 uppercase shadow-md animate-bounce">
          {gameOverReason}
        </div>
      )}

      {/* Action Controls */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        {isPlaying ? (
          <div className="flex gap-2">
            <button
              disabled={currentFloor === 0}
              onClick={handleCashout}
              className="cartoon-btn btn-spin flex-1 py-3 text-base font-black disabled:opacity-40"
            >
              ЗАБРАТЬ (+{Math.floor(bet * currentMult)} 🪙)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
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
              onClick={initGame}
              className="cartoon-btn btn-gold flex-1 py-3 text-base font-black"
            >
              СТАРТ ({bet} 🪙)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
