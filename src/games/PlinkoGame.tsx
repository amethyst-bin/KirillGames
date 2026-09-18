import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlinkoGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

// Multipliers for 8 rows based on risk
const RISK_MULTIPLIERS = {
  low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
  high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
};

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bet: number;
  currentRow: number;
  finished: boolean;
}

interface Peg {
  x: number;
  y: number;
  hitTime: number;
}

export const PlinkoGame: React.FC<PlinkoGameProps> = ({ onBack, onOpenBank }) => {
  const { user, recordGameResult } = useAuth();

  const [bet, setBet] = useState(50);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [lastWin, setLastWin] = useState<{ amount: number; mult: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const nextBallId = useRef(1);

  const rows = 8;
  const multipliers = RISK_MULTIPLIERS[risk];

  // Initialize Pegs
  useEffect(() => {
    const pegs: Peg[] = [];
    const width = 340;
    const height = 320;
    const startY = 40;
    const rowSpacing = (height - startY - 45) / rows;

    for (let r = 0; r < rows; r++) {
      const pinsInRow = r + 3;
      const spacing = 28 + (rows - r) * 0.5;
      const rowWidth = (pinsInRow - 1) * spacing;
      const startX = (width - rowWidth) / 2;

      for (let c = 0; c < pinsInRow; c++) {
        pegs.push({
          x: startX + c * spacing,
          y: startY + r * rowSpacing,
          hitTime: 0,
        });
      }
    }
    pegsRef.current = pegs;
  }, [rows]);

  // Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const now = Date.now();

      ctx.clearRect(0, 0, width, height);

      // Draw Pegs
      pegsRef.current.forEach((peg) => {
        const isHit = now - peg.hitTime < 200;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, isHit ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? '#fef08a' : '#c084fc';
        ctx.shadowColor = isHit ? '#eab308' : 'transparent';
        ctx.shadowBlur = isHit ? 8 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Buckets at the bottom
      const bucketCount = multipliers.length;
      const bucketWidth = width / bucketCount;
      const bucketY = height - 32;

      multipliers.forEach((mult, i) => {
        const bx = i * bucketWidth;
        const isExtreme = i === 0 || i === bucketCount - 1;
        const isMid = mult >= 2.0;

        ctx.fillStyle = isExtreme
          ? '#ef4444'
          : isMid
          ? '#eab308'
          : '#3b82f6';
        ctx.fillRect(bx + 1.5, bucketY, bucketWidth - 3, 24);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mult}x`, bx + bucketWidth / 2, bucketY + 12);
      });

      // Update & Draw Balls
      const activeBalls: Ball[] = [];

      ballsRef.current.forEach((ball) => {
        if (ball.finished) return;

        // Gravity
        ball.vy += 0.22;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Collision with pegs
        pegsRef.current.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 10) {
            peg.hitTime = now;
            soundManager.playClick();
            // Deflect left or right
            const bounceDir = dx >= 0 ? 1 : -1;
            ball.vx = bounceDir * (0.8 + Math.random() * 0.9);
            ball.vy = -Math.abs(ball.vy) * 0.45;
          }
        });

        // Walls
        if (ball.x < 12) {
          ball.x = 12;
          ball.vx = Math.abs(ball.vx) * 0.6;
        } else if (ball.x > width - 12) {
          ball.x = width - 12;
          ball.vx = -Math.abs(ball.vx) * 0.6;
        }

        // Check if landed in bottom bucket
        if (ball.y >= bucketY) {
          ball.finished = true;
          const bucketIndex = Math.max(
            0,
            Math.min(bucketCount - 1, Math.floor(ball.x / bucketWidth))
          );
          const mult = multipliers[bucketIndex];
          const winAmount = Math.floor(ball.bet * mult);

          setLastWin({ amount: winAmount, mult });
          if (mult >= 3.0) {
            soundManager.playBigWin();
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          } else {
            soundManager.playCoin();
          }

          recordGameResult('plinko', ball.bet, winAmount, mult);
        } else {
          activeBalls.push(ball);

          // Draw Ball
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      ballsRef.current = activeBalls;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [multipliers]);

  const dropBall = () => {
    if (!user) return;
    if (user.coins < bet) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playSpinStart();

    // Random slight horizontal offset at drop
    const dropX = 170 + (Math.random() - 0.5) * 16;
    ballsRef.current.push({
      id: nextBallId.current++,
      x: dropX,
      y: 12,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1.2,
      bet,
      currentRow: 0,
      finished: false,
    });
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
          <span className="text-lg">🟡</span>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Плинко (Plinko)
          </h2>
        </div>

        <div className="font-mono text-xs font-black text-amber-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-400/30">
          {user?.coins.toLocaleString('ru-RU')} 🪙
        </div>
      </div>

      {/* Canvas Board */}
      <div className="relative w-full max-w-[340px] rounded-3xl bg-gradient-to-b from-[#19082c] via-[#10041f] to-[#0a0214] border-2 border-purple-500/40 p-1 shadow-2xl flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={340}
          height={320}
          className="w-full h-auto rounded-2xl block"
        />

        {/* Last Win Overlay */}
        {lastWin && (
          <div className="absolute top-2 bg-black/70 border border-amber-400 px-3 py-1 rounded-full text-xs font-black text-amber-300 animate-bounce shadow">
            +{lastWin.amount} 🪙 ({lastWin.mult}x)
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-2.5">
        {/* Risk Selection */}
        <div className="flex items-center justify-between bg-black/40 p-1 rounded-xl border border-purple-400/30">
          <span className="text-[10px] font-bold text-purple-300 uppercase px-2">Риск:</span>
          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  soundManager.playClick();
                  setRisk(r);
                }}
                className={`text-xs font-black px-3 py-1 rounded-lg transition-all ${
                  risk === r
                    ? 'bg-amber-400 text-purple-950 shadow'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {r === 'low' ? 'Низкий' : r === 'medium' ? 'Средний' : 'Высокий'}
              </button>
            ))}
          </div>
        </div>

        {/* Bet & Drop Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-black/40 border border-purple-400/30 rounded-2xl px-2.5 py-2">
            <button
              onClick={() => {
                soundManager.playClick();
                setBet(Math.max(10, bet - 25));
              }}
              className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
            >
              -
            </button>
            <span className="font-mono font-black text-amber-300 text-sm min-w-[2.5rem] text-center">
              {bet}
            </span>
            <button
              onClick={() => {
                soundManager.playClick();
                setBet(bet + 25);
              }}
              className="w-7 h-7 rounded-lg bg-purple-800 text-white font-black text-sm flex items-center justify-center border border-purple-400 active:scale-90"
            >
              +
            </button>
          </div>

          <button
            onClick={dropBall}
            className="cartoon-btn btn-spin flex-1 py-3 text-base font-black flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Sparkles className="w-4 h-4" /> БРОСИТЬ ШАР ({bet} 🪙)
          </button>
        </div>
      </div>
    </div>
  );
};
