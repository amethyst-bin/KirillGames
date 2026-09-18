import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { formatCoins } from '../utils/format';
import { ArrowLeft, Plus, Sparkles, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WheelOfFortuneGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface Segment {
  id: number;
  multiplier: number;
  label: string;
  color: string;
  textColor: string;
}

// 24 Segments: 8 of x1, 6 of x2, 4 of x5, 3 of x10, 2 of x20, 1 of x50
const WHEEL_SEGMENTS: Segment[] = [
  { id: 0,  multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 1,  multiplier: 2,  label: 'x2',  color: '#2563eb', textColor: '#ffffff' },
  { id: 2,  multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 3,  multiplier: 5,  label: 'x5',  color: '#059669', textColor: '#ffffff' },
  { id: 4,  multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 5,  multiplier: 2,  label: 'x2',  color: '#2563eb', textColor: '#ffffff' },
  { id: 6,  multiplier: 10, label: 'x10', color: '#9333ea', textColor: '#ffffff' },
  { id: 7,  multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 8,  multiplier: 2,  label: 'x2',  color: '#2563eb', textColor: '#ffffff' },
  { id: 9,  multiplier: 5,  label: 'x5',  color: '#059669', textColor: '#ffffff' },
  { id: 10, multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 11, multiplier: 20, label: 'x20', color: '#d97706', textColor: '#ffffff' },
  { id: 12, multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 13, multiplier: 2,  label: 'x2',  color: '#2563eb', textColor: '#ffffff' },
  { id: 14, multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 15, multiplier: 5,  label: 'x5',  color: '#059669', textColor: '#ffffff' },
  { id: 16, multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 17, multiplier: 2,  label: 'x2',  color: '#2563eb', textColor: '#ffffff' },
  { id: 18, multiplier: 10, label: 'x10', color: '#9333ea', textColor: '#ffffff' },
  { id: 19, multiplier: 1,  label: 'x1',  color: '#475569', textColor: '#ffffff' },
  { id: 20, multiplier: 5,  label: 'x5',  color: '#059669', textColor: '#ffffff' },
  { id: 21, multiplier: 2,  label: 'x2',  color: '#2563eb', textColor: '#ffffff' },
  { id: 22, multiplier: 20, label: 'x20', color: '#d97706', textColor: '#ffffff' },
  { id: 23, multiplier: 50, label: 'x50', color: '#dc2626', textColor: '#fef08a' }, // JACKPOT
];

const MULTIPLIERS = [1, 2, 5, 10, 20, 50];
const BET_PRESETS = [10, 50, 100, 500, 1000];

export const WheelOfFortuneGame: React.FC<WheelOfFortuneGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(2);
  const [betAmount, setBetAmount] = useState<number>(50);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [lastWinner, setLastWinner] = useState<Segment | null>(null);
  const [history, setHistory] = useState<number[]>([1, 2, 5, 1, 10, 2, 1]);
  const [statusMessage, setStatusMessage] = useState<string>('Выберите множитель и крутите колесо!');

  const animationRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef<number>(0);

  const numSegments = WHEEL_SEGMENTS.length;
  const degreesPerSegment = 360 / numSegments;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleSpin = async () => {
    if (isSpinning) return;
    if (!user || user.coins < betAmount) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    setIsSpinning(true);
    soundManager.playSpinStart();
    setStatusMessage('Колесо фортуны вращается...');

    // Pick winning segment
    const winningIndex = Math.floor(Math.random() * numSegments);
    const winningSegment = WHEEL_SEGMENTS[winningIndex];

    // Pointer is at the top (270 degrees in SVG circle or 0 at top depending on orientation)
    // The top needle is at 0 degrees.
    // Winning segment center should end at the top needle (0 deg mod 360).
    // Segment i spans from (i * deg) to ((i + 1) * deg). Center is (i + 0.5) * deg.
    // For center to be at 0 deg: 360 - ((winningIndex + 0.5) * degreesPerSegment).
    const extraTurns = 360 * (5 + Math.floor(Math.random() * 3));
    const targetOffset = 360 - (winningIndex + 0.5) * degreesPerSegment;
    const finalRotation = currentRotation + extraTurns + (targetOffset - (currentRotation % 360) + 360) % 360;

    const startRotation = currentRotation;
    const duration = 4500;
    const startTime = performance.now();
    lastTickAngleRef.current = startRotation;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quartic ease-out deceleration
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const angle = startRotation + (finalRotation - startRotation) * easeOut;
      setCurrentRotation(angle);

      // Sound tick every time a segment peg passes pointer
      if (Math.abs(angle - lastTickAngleRef.current) >= degreesPerSegment) {
        soundManager.playWheelTick();
        lastTickAngleRef.current = angle;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished
        setIsSpinning(false);
        setLastWinner(winningSegment);
        setHistory((prev) => [winningSegment.multiplier, ...prev.slice(0, 7)]);

        const isWin = winningSegment.multiplier === selectedMultiplier;
        if (isWin) {
          const winCoins = Math.floor(betAmount * winningSegment.multiplier);
          soundManager.playBigWin();
          setStatusMessage(`🎉 ПОБЕДА! Сектор ${winningSegment.label}! Выигрыш: +${formatCoins(winCoins)} 🪙`);

          confetti({
            particleCount: winningSegment.multiplier >= 10 ? 80 : 40,
            spread: 60,
            origin: { y: 0.6 }
          });

          recordGameResult('wheel', betAmount, winCoins, winningSegment.multiplier);
        } else {
          soundManager.playClick();
          setStatusMessage(`Выпал сектор ${winningSegment.label}. Попробуйте ещё раз!`);
          recordGameResult('wheel', betAmount, 0, 0);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full flex flex-col items-center gap-2.5 px-3 py-1 animate-fadeIn pb-24 text-white select-none">
      {/* Top Bar: Back, Title, Live Coins */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="w-9 h-9 rounded-xl bg-purple-900/80 border border-purple-400/30 flex items-center justify-center text-purple-200 active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            🎡 Колесо Фортуны
          </h2>
        </div>

        <div
          onClick={() => {
            soundManager.playClick();
            onOpenBank();
          }}
          className="flex items-center bg-black/40 border border-amber-400/50 rounded-full pl-2 pr-1.5 py-0.5 gap-1 shadow cursor-pointer active:scale-95"
        >
          <span className="text-xs">🪙</span>
          <span className="font-mono font-black text-amber-300 text-xs truncate max-w-[4.5rem]">
            {formatCoins(user?.coins || 0)}
          </span>
          <div className="w-4 h-4 rounded-full bg-amber-400 text-purple-950 flex items-center justify-center font-black">
            <Plus className="w-3 h-3 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* History Pill Strip */}
      <div className="w-full flex items-center justify-between bg-black/40 px-2.5 py-1 rounded-xl border border-purple-500/20 text-[10px]">
        <span className="text-purple-300 font-bold uppercase">История:</span>
        <div className="flex items-center gap-1.5 overflow-hidden">
          {history.map((m, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded-full font-black text-[10px] shadow-sm ${
                m === 50
                  ? 'bg-rose-600 text-yellow-200 animate-pulse'
                  : m === 20
                  ? 'bg-amber-600 text-white'
                  : m === 10
                  ? 'bg-purple-600 text-white'
                  : m === 5
                  ? 'bg-emerald-600 text-white'
                  : m === 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-200'
              }`}
            >
              x{m}
            </span>
          ))}
        </div>
      </div>

      {/* Wheel Container */}
      <div className="relative flex flex-col items-center justify-center my-1">
        {/* Top Pointer Arrow */}
        <div className="absolute -top-3 z-30 flex flex-col items-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400" />
          <div className="w-3 h-3 rounded-full bg-amber-300 border-2 border-purple-950 -mt-1 shadow" />
        </div>

        {/* Outer Wheel Golden Rim */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-2 bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-600 shadow-[0_0_25px_rgba(234,179,8,0.4)] border-4 border-amber-400 flex items-center justify-center">
          {/* Rotating SVG Wheel */}
          <div
            className="w-full h-full rounded-full overflow-hidden shadow-inner relative"
            style={{
              transform: `rotate(${currentRotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.1s ease',
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {WHEEL_SEGMENTS.map((seg, i) => {
                const startAngle = i * degreesPerSegment;
                const endAngle = (i + 1) * degreesPerSegment;

                // Trig coordinates on 100x100 SVG (radius = 50, center = 50,50)
                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad = ((endAngle - 90) * Math.PI) / 180;

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                const textAngle = startAngle + degreesPerSegment / 2;
                const textRad = ((textAngle - 90) * Math.PI) / 180;
                const tx = 50 + 35 * Math.cos(textRad);
                const ty = 50 + 35 * Math.sin(textRad);

                return (
                  <g key={seg.id}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="#1e0b36"
                      strokeWidth="0.6"
                    />
                    <text
                      x={tx}
                      y={ty}
                      fill={seg.textColor}
                      fontSize="4.8"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Central Golden Hub */}
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 border-4 border-purple-950 shadow-xl flex items-center justify-center z-20">
            <div className="w-10 h-10 rounded-full bg-[#1e0738] flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className={`w-full py-1.5 px-3 rounded-xl text-center text-xs font-black border transition-all ${
        lastWinner && lastWinner.multiplier === selectedMultiplier
          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-md animate-bounce'
          : 'bg-[#18052e] border-purple-500/30 text-purple-200'
      }`}>
        {statusMessage}
      </div>

      {/* Multiplier Selection Buttons */}
      <div className="w-full flex flex-col gap-1">
        <span className="text-[10px] text-purple-300 uppercase font-black px-1 text-left">
          Выберите сектор для ставки:
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {MULTIPLIERS.map((m) => {
            const isSelected = selectedMultiplier === m;
            return (
              <button
                key={m}
                disabled={isSpinning}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedMultiplier(m);
                }}
                className={`py-2 rounded-xl flex flex-col items-center justify-center font-black transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-purple-950 scale-105 shadow-md border-2 border-white'
                    : 'bg-[#1a0633] text-purple-200 border border-purple-500/30 hover:bg-[#250a47]'
                }`}
              >
                <span className="text-xs">x{m}</span>
                <span className="text-[8px] opacity-80">{m === 50 ? 'ДЖЕК' : 'Множ.'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bet Amount Selector */}
      <div className="w-full flex flex-col gap-1 bg-[#160429] p-2 rounded-2xl border border-purple-500/30">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-purple-300 font-bold uppercase text-[10px]">Ставка:</span>
          <span className="font-mono font-black text-amber-300 text-sm">
            {formatCoins(betAmount)} 🪙
          </span>
          <span className="text-[10px] text-emerald-400 font-extrabold">
            Выигрыш: +{formatCoins(betAmount * selectedMultiplier)} 🪙
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {BET_PRESETS.map((p) => (
            <button
              key={p}
              disabled={isSpinning}
              onClick={() => {
                soundManager.playClick();
                setBetAmount(p);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                betAmount === p
                  ? 'bg-amber-400 text-purple-950 font-black'
                  : 'bg-purple-900/60 text-purple-200 hover:bg-purple-800'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={isSpinning}
            onClick={() => {
              soundManager.playClick();
              if (user) setBetAmount(Math.max(10, Math.min(user.coins, 100000)));
            }}
            className="px-2 py-1 bg-rose-900/60 border border-rose-500/30 text-rose-200 text-xs font-black rounded-lg active:scale-95"
          >
            МАКС
          </button>
        </div>
      </div>

      {/* Spin Button */}
      <button
        disabled={isSpinning}
        onClick={handleSpin}
        className="w-full py-3.5 rounded-2xl font-black text-base uppercase tracking-wider cartoon-btn btn-spin flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
      >
        <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
        {isSpinning ? 'Колесо крутится...' : `Крутить (${formatCoins(betAmount)} 🪙)`}
      </button>
    </div>
  );
};
