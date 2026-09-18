import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Crosshair, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BattleshipGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

type ShipType = 'battleship' | 'cruiser' | 'destroyer' | 'submarine' | 'mine';

interface ShipDef {
  type: ShipType;
  name: string;
  emoji: string;
  size: number;
  multiplier: number;
  hitMultiplier: number;
}

const SHIP_TYPES: Record<ShipType, ShipDef> = {
  battleship: { type: 'battleship', name: 'Линкор', emoji: '🚢', size: 3, multiplier: 40.0, hitMultiplier: 5.0 },
  cruiser: { type: 'cruiser', name: 'Крейсер', emoji: '🛳️', size: 2, multiplier: 15.0, hitMultiplier: 3.0 },
  destroyer: { type: 'destroyer', name: 'Эсминец', emoji: '🚤', size: 2, multiplier: 10.0, hitMultiplier: 2.0 },
  submarine: { type: 'submarine', name: 'Подлодка', emoji: '🦈', size: 1, multiplier: 6.0, hitMultiplier: 6.0 },
  mine: { type: 'mine', name: 'Глубинная мина', emoji: '💣', size: 1, multiplier: 3.0, hitMultiplier: 3.0 },
};

const BET_OPTIONS = [50, 100, 250, 500, 1000, 2500, 5000];
const INITIAL_TORPEDOES = 9;

interface BoardCell {
  r: number;
  c: number;
  revealed: boolean;
  shipType?: ShipType;
  shipId?: number;
  isSunk?: boolean;
}

export const BattleshipGame: React.FC<BattleshipGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [bet, setBet] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [board, setBoard] = useState<BoardCell[][]>(() => createEmptyBoard());
  const [torpedoesLeft, setTorpedoesLeft] = useState<number>(INITIAL_TORPEDOES);
  const [currentWin, setCurrentWin] = useState<number>(0);
  const [shipsRemaining, setShipsRemaining] = useState<number>(5);
  const [statusText, setStatusText] = useState<string>('Сделайте ставку и запустите боевой радар!');
  const [sunkShips, setSunkShips] = useState<string[]>([]);
  const [roundOver, setRoundOver] = useState<boolean>(false);

  function createEmptyBoard(): BoardCell[][] {
    const grid: BoardCell[][] = [];
    for (let r = 0; r < 5; r++) {
      const row: BoardCell[] = [];
      for (let c = 0; c < 5; c++) {
        row.push({ r, c, revealed: false });
      }
      grid.push(row);
    }
    return grid;
  }

  const generateFleetBoard = (): BoardCell[][] => {
    const grid: BoardCell[][] = createEmptyBoard();

    // Place a ship of length `size` randomly
    let shipCounter = 1;
    const placeShip = (type: ShipType, size: number) => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const isHorizontal = Math.random() < 0.5;
        const maxR = isHorizontal ? 5 : 5 - size + 1;
        const maxC = isHorizontal ? 5 - size + 1 : 5;
        const r = Math.floor(Math.random() * maxR);
        const c = Math.floor(Math.random() * maxC);

        let canPlace = true;
        for (let i = 0; i < size; i++) {
          const currR = isHorizontal ? r : r + i;
          const currC = isHorizontal ? c + i : c;
          if (grid[currR][currC].shipType) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let i = 0; i < size; i++) {
            const currR = isHorizontal ? r : r + i;
            const currC = isHorizontal ? c + i : c;
            grid[currR][currC].shipType = type;
            grid[currR][currC].shipId = shipCounter;
          }
          shipCounter++;
          placed = true;
        }
      }
    };

    // Fleet composition
    placeShip('battleship', 3); // 1x 3-cell
    placeShip('cruiser', 2);    // 1x 2-cell
    placeShip('destroyer', 2);  // 1x 2-cell
    placeShip('submarine', 1);  // 1x 1-cell
    placeShip('mine', 1);       // 1x depth mine

    return grid;
  };

  const handleStartMission = () => {
    if (isPlaying) return;
    if (!user || user.coins < bet) {
      soundManager.playReelStop(0);
      onOpenBank();
      return;
    }

    soundManager.playSonarPing();
    const newFleet = generateFleetBoard();
    setBoard(newFleet);
    setIsPlaying(true);
    setRoundOver(false);
    setTorpedoesLeft(INITIAL_TORPEDOES);
    setCurrentWin(0);
    setShipsRemaining(5);
    setSunkShips([]);
    setStatusText('Торпеды заряжены! Выберите координаты для залпа.');
  };

  const handleFireTorpedo = (r: number, c: number) => {
    if (!isPlaying || roundOver) return;
    const cell = board[r][c];
    if (cell.revealed) return;

    soundManager.playTorpedoLaunch();

    const newBoard = board.map(row => row.map(cl => ({ ...cl })));
    newBoard[r][c].revealed = true;

    const remainingTorpedoes = torpedoesLeft - 1;
    setTorpedoesLeft(remainingTorpedoes);

    let roundWinDelta = 0;

    if (!cell.shipType) {
      // Water miss
      soundManager.playWaterSplash();
      setStatusText(`Промах по [${String.fromCharCode(65 + c)}${r + 1}]. Вода.`);
    } else if (cell.shipType === 'mine') {
      // Depth Mine detonates!
      soundManager.playBombExplode();
      setStatusText('💣 ГЛУБИННАЯ МИНА ВЗОРВАНА! Обнаружены соседние сектора!');
      roundWinDelta += Math.round(bet * SHIP_TYPES.mine.hitMultiplier);

      // Reveal adjacent cells
      const adj = [
        { r: r - 1, c },
        { r: r + 1, c },
        { r, c: c - 1 },
        { r, c: c + 1 },
      ];
      for (const a of adj) {
        if (a.r >= 0 && a.r < 5 && a.c >= 0 && a.c < 5) {
          if (!newBoard[a.r][a.c].revealed) {
            newBoard[a.r][a.c].revealed = true;
            if (newBoard[a.r][a.c].shipType) {
              const ship = SHIP_TYPES[newBoard[a.r][a.c].shipType!];
              roundWinDelta += Math.round(bet * (ship.hitMultiplier / 2));
            }
          }
        }
      }
    } else {
      // Ship hit!
      soundManager.playExplosion();
      const ship = SHIP_TYPES[cell.shipType];
      roundWinDelta += Math.round(bet * ship.hitMultiplier);

      // Check if this ship is fully sunk
      const sameShipCells = newBoard.flat().filter(cl => cl.shipId === cell.shipId);
      const allSunk = sameShipCells.every(cl => cl.revealed);

      if (allSunk) {
        sameShipCells.forEach(cl => { cl.isSunk = true; });
        roundWinDelta += Math.round(bet * (ship.multiplier - (ship.hitMultiplier * ship.size)));
        soundManager.playWin();
        setSunkShips(prev => [...prev, ship.name]);
        setShipsRemaining(prev => Math.max(0, prev - 1));
        setStatusText(`💥 ПОТОПЛЕН ${ship.name.toUpperCase()}! Награда за корабль!`);
      } else {
        setStatusText(`🎯 ПОПАДАНИЕ по ${ship.name}!`);
      }
    }

    const updatedTotalWin = currentWin + roundWinDelta;
    setCurrentWin(updatedTotalWin);
    setBoard(newBoard);

    // End of round conditions
    if (remainingTorpedoes <= 0) {
      handleFinishRound(updatedTotalWin, newBoard);
    }
  };

  const handleCashout = () => {
    if (!isPlaying || roundOver) return;
    handleFinishRound(currentWin, board);
  };

  const handleFinishRound = async (finalWin: number, currentBoard: BoardCell[][]) => {
    setIsPlaying(false);
    setRoundOver(true);

    // Reveal entire board
    const revealedAll = currentBoard.map(row => row.map(cl => ({ ...cl, revealed: true })));
    setBoard(revealedAll);

    if (finalWin > 0) {
      if (finalWin >= bet * 5) {
        soundManager.playBigWin();
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        soundManager.playWin();
      }
      setStatusText(`🏆 МИССИЯ ЗАВЕРШЕНА! Забрано +${formatCoins(finalWin)} монет!`);
    } else {
      soundManager.playLoss();
      setStatusText('Все торпеды израсходованы. Флот уцелел.');
    }

    try {
      const mult = finalWin > 0 ? Number((finalWin / bet).toFixed(2)) : 0;
      await recordGameResult('battleship', bet, finalWin, mult);
    } catch (err) {
      console.error('Failed to sync battleship result:', err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center max-w-md mx-auto px-2 py-1 select-none animate-fadeIn pb-24">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between mb-1.5">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          disabled={isPlaying}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-purple-200 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> В лобби
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-blue-950 to-cyan-950 border border-cyan-500/40">
          <span className="text-base">⚓</span>
          <span className="text-xs font-black text-cyan-300 tracking-wider uppercase">Морской Куш</span>
        </div>

        <button
          onClick={onOpenBank}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black active:scale-95 transition-all"
        >
          🪙 {formatCoins(user?.coins || 0)}
        </button>
      </div>

      {/* Naval HUD Banner */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-gradient-to-r from-blue-950 via-[#0a192f] to-indigo-950 border border-cyan-500/40 shadow-md mb-2">
        <div className="flex flex-col text-left">
          <span className="text-[10px] text-cyan-300/80 font-bold uppercase tracking-wider flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-cyan-400" />
            {isPlaying ? `Торпед: ${torpedoesLeft} • Целей: ${shipsRemaining}` : 'Радар ВМФ'}
          </span>
          <span className="text-xs text-white font-black truncate max-w-[200px]">
            {statusText}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-amber-300/80 font-bold uppercase">Куш Раунда</span>
          <span className="text-base font-black text-amber-300 flex items-center gap-0.5">
            🪙 {formatCoins(currentWin)}
          </span>
        </div>
      </div>

      {/* Fleet Status Tags */}
      <div className="w-full flex items-center justify-center gap-1.5 mb-2 overflow-x-auto no-scrollbar">
        {Object.values(SHIP_TYPES).map(st => {
          const isSunk = sunkShips.includes(st.name);
          return (
            <div
              key={st.type}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all ${
                isSunk
                  ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 line-through scale-95 opacity-80'
                  : 'bg-blue-950/60 border-cyan-500/30 text-cyan-200'
              }`}
            >
              <span>{st.emoji}</span>
              <span>x{st.multiplier}</span>
            </div>
          );
        })}
      </div>

      {/* 5x5 Naval Radar Sea Grid */}
      <div className="relative w-full aspect-square max-w-[340px] p-2 rounded-3xl bg-gradient-to-b from-[#071326] via-[#091b36] to-[#050e1d] border-2 border-cyan-500/50 shadow-2xl flex flex-col justify-between">
        {/* Column coordinate labels A B C D E */}
        <div className="grid grid-cols-5 text-center text-[10px] font-mono font-bold text-cyan-400/70 mb-0.5">
          <span>A</span>
          <span>B</span>
          <span>C</span>
          <span>D</span>
          <span>E</span>
        </div>

        <div className="grid grid-cols-5 grid-rows-5 gap-1.5 w-full h-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              if (!cell.revealed) {
                return (
                  <button
                    key={`${r}-${c}`}
                    disabled={!isPlaying || roundOver}
                    onClick={() => handleFireTorpedo(r, c)}
                    className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0c2447] to-[#081830] border border-cyan-500/30 hover:border-cyan-300 active:scale-90 transition-all shadow-inner disabled:cursor-not-allowed group overflow-hidden"
                  >
                    {/* Water waves pattern / sonar sweep */}
                    <div className="absolute inset-0 bg-cyan-400/5 group-hover:bg-cyan-400/20 transition-colors" />
                    <Crosshair className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-300 group-hover:scale-110 transition-transform" />
                  </button>
                );
              }

              // Revealed cell
              if (!cell.shipType) {
                // Water splash
                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative flex items-center justify-center rounded-xl bg-[#08172c] border border-blue-600/30 text-sm shadow-inner"
                  >
                    <span className="text-blue-400 font-bold select-none text-xs">💧</span>
                  </div>
                );
              }

              // Ship or mine
              const ship = SHIP_TYPES[cell.shipType];
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative flex flex-col items-center justify-center rounded-xl border shadow-md transition-all duration-200 select-none ${
                    cell.isSunk
                      ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-400 animate-pulse'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300'
                  }`}
                >
                  <span className="text-xl leading-none">{ship.emoji}</span>
                  <span className="text-[9px] font-black text-white px-0.5 rounded bg-black/60 leading-tight mt-0.5">
                    +{ship.hitMultiplier}x
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls & Betting */}
      <div className="w-full mt-2 flex flex-col gap-2">
        {/* Quick Bet Chips */}
        {!isPlaying && (
          <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {BET_OPTIONS.map(val => (
              <button
                key={val}
                onClick={() => {
                  soundManager.playClick();
                  setBet(val);
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                  bet === val
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105 border border-cyan-300'
                    : 'bg-blue-950/70 text-cyan-300 border border-cyan-500/30 active:scale-95'
                }`}
              >
                {formatCoins(val)}
              </button>
            ))}
          </div>
        )}

        {/* Action Button: Start Mission or Cashout */}
        {!isPlaying ? (
          <button
            onClick={handleStartMission}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white font-black text-lg tracking-wide uppercase shadow-xl flex items-center justify-center gap-2 border border-cyan-300/40 active:scale-[0.98] transition-all"
          >
            <Crosshair className="w-5 h-5 text-cyan-200" />
            В Бой! • {formatCoins(bet)}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCashout}
              disabled={currentWin <= 0}
              className="py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm tracking-wide uppercase shadow-xl flex items-center justify-center gap-1.5 border border-emerald-300/40 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              <Trophy className="w-4 h-4 text-emerald-100" />
              Забрать ({formatCoins(currentWin)})
            </button>

            <div className="py-3 rounded-2xl bg-blue-950/80 border border-cyan-500/40 text-cyan-200 font-black text-xs flex items-center justify-center gap-1.5">
              <span>🚀 Осталось: {torpedoesLeft} залпов</span>
            </div>
          </div>
        )}

        {/* Help hint */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-cyan-300/70 font-semibold text-center">
          <span>🚢 Линкор x40</span>
          <span>•</span>
          <span>🛳️ Крейсер x15</span>
          <span>•</span>
          <span>💣 Мина вскрывает соседей</span>
        </div>
      </div>
    </div>
  );
};
