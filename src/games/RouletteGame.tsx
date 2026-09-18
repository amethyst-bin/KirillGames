import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Play, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RouletteGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface Sector {
  id: number;
  label: string;
  color: string;
  type: 'red' | 'black' | 'green' | 'gold' | 'jackpot';
  multiplier: number;
}

const SECTORS: Sector[] = [
  { id: 0, label: 'x2', color: '#ef4444', type: 'red', multiplier: 2 },
  { id: 1, label: 'x2', color: '#1f2937', type: 'black', multiplier: 2 },
  { id: 2, label: 'x3', color: '#3b82f6', type: 'red', multiplier: 3 },
  { id: 3, label: 'x2', color: '#1f2937', type: 'black', multiplier: 2 },
  { id: 4, label: 'x5', color: '#10b981', type: 'green', multiplier: 5 },
  { id: 5, label: 'x2', color: '#ef4444', type: 'red', multiplier: 2 },
  { id: 6, label: 'x10', color: '#eab308', type: 'gold', multiplier: 10 },
  { id: 7, label: 'x2', color: '#1f2937', type: 'black', multiplier: 2 },
  { id: 8, label: 'x2', color: '#ef4444', type: 'red', multiplier: 2 },
  { id: 9, label: 'x5', color: '#10b981', type: 'green', multiplier: 5 },
  { id: 10, label: 'x2', color: '#1f2937', type: 'black', multiplier: 2 },
  { id: 11, label: '👑 x50', color: '#a855f7', type: 'jackpot', multiplier: 50 },
];

export const RouletteGame: React.FC<RouletteGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState<'red' | 'black' | 'green' | 'gold' | 'jackpot'>('red');
  const [bet, setBet] = useState(50);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const numSectors = SECTORS.length;
  const sectorAngle = 360 / numSectors;

  const handleSpin = () => {
    if (isSpinning || !user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();
    setIsSpinning(true);
    setResultMessage(null);

    // Pick target sector
    const winningIndex = Math.floor(Math.random() * numSectors);
    const winningSector = SECTORS[winningIndex];

    // Calculate rotation: 5 full spins (1800 deg) + angle to align winningIndex with top pointer (270 deg)
    const extraSpins = 360 * 5;
    const targetSectorAngle = winningIndex * sectorAngle;
    // Pointer is at the top (0 degrees or 270 degrees)
    const targetRotation = rotation + extraSpins + (360 - (targetSectorAngle % 360)) + sectorAngle / 2;

    setRotation(targetRotation);

    // Tick audio sound during spin
    const tickInterval = setInterval(() => {
      soundManager.playClick();
    }, 120);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      soundManager.playReelStop(0);

      // Check win
      const won = winningSector.type === selectedBetType;
      if (won) {
        const winAmount = bet * winningSector.multiplier;
        setResultMessage(`🎉 ВЫИГРЫШ! Сектор ${winningSector.label} (+${winAmount} 🪙)`);
        if (winningSector.multiplier >= 10) {
          soundManager.playBigWin();
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
        } else {
          soundManager.playWin();
        }
        recordGameResult('roulette', bet, winAmount, winningSector.multiplier);
      } else {
        setResultMessage(`Выпал сектор ${winningSector.label}. Попробуйте ещё!`);
        recordGameResult('roulette', bet, 0, 0);
      }
    }, 3200);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24">
      {/* Top Header */}
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
          <span className="text-lg">🎡</span>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Колесо Фортуны
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* Wheel Area */}
      <div className="relative w-72 h-72 flex items-center justify-center my-2">
        {/* Top Pointer Needle */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-2xl drop-shadow-md">
          🔻
        </div>

        {/* Outer Golden Ring */}
        <div className="w-full h-full rounded-full p-2 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-4 border-amber-300 shadow-2xl flex items-center justify-center">
          {/* Rotating Wheel */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden border-2 border-black/40 shadow-inner"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3.2s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none',
            }}
          >
            {/* Wheel Canvas / Slices */}
            {SECTORS.map((s, i) => {
              const startA = i * sectorAngle;
              return (
                <div
                  key={s.id}
                  className="absolute top-0 left-0 w-full h-full flex justify-center items-start pt-3"
                  style={{
                    transform: `rotate(${startA + sectorAngle / 2}deg)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <span
                    className="font-black text-[11px] uppercase tracking-wider select-none"
                    style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}

            {/* Slices Conic Gradient Background */}
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `conic-gradient(
                  #ef4444 0deg 30deg,
                  #1f2937 30deg 60deg,
                  #3b82f6 60deg 90deg,
                  #1f2937 90deg 120deg,
                  #10b981 120deg 150deg,
                  #ef4444 150deg 180deg,
                  #eab308 180deg 210deg,
                  #1f2937 210deg 240deg,
                  #ef4444 240deg 270deg,
                  #10b981 270deg 300deg,
                  #1f2937 300deg 330deg,
                  #a855f7 330deg 360deg
                )`,
              }}
            />
          </div>

          {/* Central Gold Cap */}
          <div className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border-2 border-amber-500 shadow-md flex items-center justify-center font-black text-purple-950 text-xs z-10">
            ★
          </div>
        </div>
      </div>

      {/* Result Toast */}
      {resultMessage && (
        <div className="bg-black/80 border border-amber-400 rounded-2xl py-1.5 px-4 text-center font-black text-xs text-amber-300 uppercase shadow-md animate-bounce">
          {resultMessage}
        </div>
      )}

      {/* Betting Board & Controls */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        <span className="text-[10px] font-bold text-purple-300 uppercase text-left px-1">
          Выберите сектор ставки:
        </span>

        {/* Bet Type Options */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { id: 'red', label: 'Красное (x2)', color: 'bg-red-600' },
            { id: 'black', label: 'Чёрное (x2)', color: 'bg-gray-800' },
            { id: 'green', label: 'Зелень (x5)', color: 'bg-emerald-600' },
            { id: 'gold', label: 'Золото (x10)', color: 'bg-amber-500' },
            { id: 'jackpot', label: 'ДЖЕК (x50)', color: 'bg-purple-600' },
          ].map((item) => (
            <button
              key={item.id}
              disabled={isSpinning}
              onClick={() => {
                soundManager.playClick();
                setSelectedBetType(item.id as any);
              }}
              className={`py-2 px-1 rounded-xl text-[10px] font-black leading-tight border transition-all ${item.color} ${
                selectedBetType === item.id
                  ? 'border-white scale-105 shadow-md ring-2 ring-amber-300'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Bet input & Spin Button */}
        <div className="flex items-center gap-2.5 mt-1">
          <div className="flex items-center gap-1 bg-black/40 border border-purple-400/30 rounded-2xl px-2.5 py-2">
            <button
              disabled={isSpinning}
              onClick={() => setBet(Math.max(10, bet - 25))}
              className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90 disabled:opacity-40"
            >
              -
            </button>
            <span className="font-mono font-black text-amber-300 text-sm min-w-[2.5rem] text-center">
              {bet}
            </span>
            <button
              disabled={isSpinning}
              onClick={() => setBet(bet + 25)}
              className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90 disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            disabled={isSpinning}
            onClick={handleSpin}
            className="cartoon-btn btn-spin flex-1 py-3 text-base font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isSpinning ? (
              <>
                <RotateCw className="w-5 h-5 animate-spin" />
                <span>КРУТИМ...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>КРУТИТЬ ({bet} 🪙)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
