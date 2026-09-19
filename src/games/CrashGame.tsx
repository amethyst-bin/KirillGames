import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { WS_URL, getToken } from '../services/api';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Rocket, Users, History, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCoins } from '../utils/format';

interface CrashGameProps {
  onBack: () => void;
  onOpenBank: () => void;
}

interface CrashBet {
  userId: number;
  username: string;
  avatar: string;
  betAmount: number;
  cashedOut: boolean;
  winAmount: number;
  multiplier?: number | null;
}

type CrashState = 'WAITING' | 'FLYING' | 'CRASHED';

export const CrashGame: React.FC<CrashGameProps> = ({ onBack, onOpenBank }) => {
  const { user, refreshUser } = useAuth();
  const [wsConnected, setWsConnected] = useState(false);

  // Game state from WS
  const [gameState, setGameState] = useState<CrashState>('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(5.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [bets, setBets] = useState<CrashBet[]>([]);
  const [history, setHistory] = useState<number[]>([]);

  // Local bet state
  const [betAmount, setBetAmount] = useState(50);
  const [autoCashout, setAutoCashout] = useState<string>('2.0');
  const [hasBet, setHasBet] = useState(false);
  const [myCashoutInfo, setMyCashoutInfo] = useState<{ winAmount: number; mult: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const lastStateRef = useRef<CrashState>('WAITING');
  const hasFiredCashoutRef = useRef<boolean>(false);

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: number;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          const token = getToken();
          if (token) {
            ws.send(JSON.stringify({ type: 'AUTH', token }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'INIT_STATE') {
              setGameState(data.crash.state);
              setMultiplier(data.crash.multiplier);
              setCountdown(data.crash.countdown);
              setHistory(data.crash.history || []);
            }

            if (data.type === 'CRASH_TICK') {
              setGameState(data.state);
              setMultiplier(data.multiplier);
              setCountdown(data.countdown);
              setCrashPoint(data.crashPoint);
              setBets(data.bets || []);
              if (data.history) setHistory(data.history);

              // Check if I cashed out (single fire through ref check)
              if (user) {
                const myBet = data.bets?.find((b: CrashBet) => b.userId === user.id);
                if (myBet && myBet.cashedOut && !hasFiredCashoutRef.current) {
                  hasFiredCashoutRef.current = true;
                  setMyCashoutInfo({ winAmount: myBet.winAmount, mult: myBet.multiplier || data.multiplier });
                  soundManager.playBigWin();
                  confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
                  refreshUser();
                }
              }

              // Sound effects
              if (data.state === 'CRASHED' && lastStateRef.current === 'FLYING') {
                soundManager.playReelStop(2);
                refreshUser();
              }
              lastStateRef.current = data.state;
            }

            if (data.type === 'ERROR') {
              setErrorMessage(data.message || 'Ошибка');
              soundManager.playLoss();
              setTimeout(() => setErrorMessage(null), 3500);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = window.setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        console.error('WS connection error:', e);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, [user?.id]);

  // Reset my bet state when new WAITING round begins
  useEffect(() => {
    if (gameState === 'WAITING') {
      setHasBet(false);
      setMyCashoutInfo(null);
      hasFiredCashoutRef.current = false;
    }
  }, [gameState]);

  // Place Bet
  const handlePlaceBet = () => {
    if (!wsRef.current || !user) return;
    if (user.coins < betAmount) {
      soundManager.playClick();
      onOpenBank();
      return;
    }

    soundManager.playClick();
    wsRef.current.send(JSON.stringify({
      type: 'PLACE_CRASH_BET',
      betAmount,
      autoCashout: autoCashout ? parseFloat(autoCashout) : null,
    }));
    setHasBet(true);
    refreshUser();
  };

  // Cashout
  const handleCashout = () => {
    if (!wsRef.current) return;
    soundManager.playCoin();
    wsRef.current.send(JSON.stringify({ type: 'CRASH_CASHOUT' }));
  };

  const myActiveBet = bets.find((b) => b.userId === user?.id);
  const canCashout = gameState === 'FLYING' && myActiveBet && !myActiveBet.cashedOut;

  // Trajectory curve computation
  // Arena coordinates: viewBox="0 0 500 240"
  // Start: (45, 205), Max endpoint: (450, 45)
  const currentMult = gameState === 'CRASHED' ? (crashPoint || multiplier) : multiplier;
  const t = Math.min(1.0, Math.max(0.0, Math.log(Math.max(1.0, currentMult)) / Math.log(15)));
  
  const startX = 45;
  const startY = 205;
  const targetX = startX + t * 405; // 45 -> 450
  const targetY = startY - Math.pow(t, 0.85) * 160; // 205 -> 45

  // Cubic bezier control points for smooth rising flight curve
  const cp1X = startX + (targetX - startX) * 0.45;
  const cp1Y = startY - (startY - targetY) * 0.1;
  const cp2X = startX + (targetX - startX) * 0.75;
  const cp2Y = startY - (startY - targetY) * 0.65;

  const curvePath = gameState === 'WAITING' 
    ? `M ${startX} ${startY}` 
    : `M ${startX} ${startY} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${targetX.toFixed(1)} ${targetY.toFixed(1)}`;
  
  const areaPath = gameState === 'WAITING'
    ? ''
    : `${curvePath} L ${targetX.toFixed(1)} ${startY} L ${startX} ${startY} Z`;

  // Rocket angle: tangent approximation
  const tangentAngle = gameState === 'WAITING' 
    ? 0 
    : -Math.min(50, Math.max(15, 15 + t * 35));

  // Avatar renderer helper to prevent base64 leaks
  const renderAvatar = (avatar: string) => {
    if (avatar && (avatar.startsWith('data:image') || avatar.startsWith('http'))) {
      return (
        <img
          src={avatar}
          alt="Avatar"
          className="w-5 h-5 rounded-full object-cover border border-purple-400/40 shrink-0"
        />
      );
    }
    return <span className="text-sm shrink-0 select-none">{avatar || '🦊'}</span>;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 px-3 py-1 animate-fadeIn pb-24 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/60 px-3 py-1.5 rounded-full border border-purple-400/30 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <div className="flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-amber-400 animate-pulse" />
          <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
            Crash Rocket
          </h2>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400 animate-ping'}`} />
          <span className="text-purple-300">{wsConnected ? 'Сервер' : 'Подключение'}</span>
        </div>
      </div>

      {/* History Multipliers Ribbon */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto py-1 px-2.5 bg-[#17052e]/80 rounded-2xl border border-purple-400/25 text-xs no-scrollbar shadow-inner">
        <History className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        {history.map((h, i) => (
          <span
            key={i}
            className={`font-mono font-black px-2 py-0.5 rounded-lg flex-shrink-0 text-[11px] ${
              h >= 2.0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
        {history.length === 0 && (
          <span className="text-[10px] text-purple-400 italic">Ожидание раундов...</span>
        )}
      </div>

      {/* Modern Crash Flight Arena with Glowing Diagonal Curve */}
      <div className="relative w-full h-72 rounded-3xl bg-gradient-to-b from-[#110424] via-[#1a0636] to-[#0a0217] border-2 border-purple-400/40 overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

        {/* Ambient Top Glow */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
          gameState === 'CRASHED' ? 'bg-rose-500/25' : gameState === 'FLYING' ? 'bg-amber-500/20' : 'bg-purple-500/10'
        }`} />

        {/* Dynamic Multiplier / Status Overlay */}
        <div className="z-10 w-full flex flex-col items-center justify-center pt-5 text-center pointer-events-none">
          {gameState === 'WAITING' && (
            <div className="flex flex-col items-center gap-1 animate-fadeIn">
              <span className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Взлёт через
              </span>
              <span className="text-4xl font-mono font-black text-white drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                {countdown.toFixed(1)}s
              </span>
              <div className="w-40 h-2 bg-purple-950 rounded-full border border-purple-400/30 overflow-hidden mt-1 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-100"
                  style={{ width: `${(countdown / 5.0) * 100}%` }}
                />
              </div>
            </div>
          )}

          {gameState === 'FLYING' && (
            <div className="flex flex-col items-center animate-fadeIn">
              <span className="text-5xl font-mono font-black text-amber-300 tracking-tight drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
                {multiplier.toFixed(2)}x
              </span>
              <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 animate-bounce" /> Набирает высоту!
              </span>
            </div>
          )}

          {gameState === 'CRASHED' && (
            <div className="flex flex-col items-center gap-1 animate-reel-land">
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> ВЗРЫВ РАКЕТЫ
              </span>
              <span className="text-5xl font-mono font-black text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">
                {(crashPoint || multiplier).toFixed(2)}x
              </span>
            </div>
          )}
        </div>

        {/* SVG Flight Arena with Trajectory Curve */}
        <div className="absolute inset-0 w-full h-full">
          <svg viewBox="0 0 500 240" className="w-full h-full overflow-visible">
            <defs>
              {/* Curve Glow Filters */}
              <filter id="glowCurve" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Area Gradient Under Rocket Curve */}
              <linearGradient id="rocketAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gameState === 'CRASHED' ? '#f43f5e' : '#f59e0b'} stopOpacity="0.45" />
                <stop offset="60%" stopColor={gameState === 'CRASHED' ? '#be123c' : '#d97706'} stopOpacity="0.15" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>

              {/* Trajectory Stroke Gradient */}
              <linearGradient id="rocketLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor={gameState === 'CRASHED' ? '#f43f5e' : '#10b981'} />
              </linearGradient>
            </defs>

            {/* Arena Axis Lines & Guidelines */}
            <line x1="45" y1="205" x2="470" y2="205" stroke="#6b21a8" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="45" y1="45" x2="45" y2="205" stroke="#6b21a8" strokeWidth="1.5" strokeOpacity="0.4" />
            
            {/* Horizontal Grid Ticks */}
            <line x1="45" y1="165" x2="470" y2="165" stroke="#581c87" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.3" />
            <line x1="45" y1="125" x2="470" y2="125" stroke="#581c87" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.3" />
            <line x1="45" y1="85" x2="470" y2="85" stroke="#581c87" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.3" />
            
            <text x="35" y="208" fill="#a855f7" fontSize="10" fontWeight="bold" textAnchor="end">1x</text>
            <text x="35" y="145" fill="#a855f7" fontSize="10" fontWeight="bold" textAnchor="end">2x</text>
            <text x="35" y="85" fill="#a855f7" fontSize="10" fontWeight="bold" textAnchor="end">5x</text>
            <text x="35" y="48" fill="#a855f7" fontSize="10" fontWeight="bold" textAnchor="end">10x+</text>

            {/* Launchpad Base Platform */}
            <ellipse cx="45" cy="207" rx="14" ry="4" fill="#a855f7" fillOpacity="0.3" />

            {/* Curve Fill Area */}
            {gameState !== 'WAITING' && (
              <path d={areaPath} fill="url(#rocketAreaGrad)" />
            )}

            {/* Glowing Trajectory Curve */}
            {gameState !== 'WAITING' && (
              <>
                <path
                  d={curvePath}
                  fill="none"
                  stroke="url(#rocketLineGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#glowCurve)"
                />
                <path
                  d={curvePath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeOpacity="0.8"
                />
              </>
            )}

            {/* Trajectory Tip Pulse Marker */}
            {gameState === 'FLYING' && (
              <>
                <circle cx={targetX} cy={targetY} r="7" fill="#f59e0b" fillOpacity="0.35" className="animate-ping" />
                <circle cx={targetX} cy={targetY} r="3.5" fill="#ffffff" />
              </>
            )}

            {/* The Flying Rocket / Explosion Object */}
            <g
              transform={`translate(${targetX}, ${targetY}) rotate(${tangentAngle})`}
              className="transition-transform duration-75 ease-out"
            >
              {gameState === 'CRASHED' ? (
                // Explosion Visual
                <g className="animate-reel-land">
                  <circle cx="0" cy="0" r="28" fill="#f43f5e" fillOpacity="0.3" className="animate-ping" />
                  <circle cx="0" cy="0" r="16" fill="#fb7185" fillOpacity="0.6" />
                  <text x="0" y="8" fontSize="32" textAnchor="middle" className="select-none">
                    💥
                  </text>
                </g>
              ) : gameState === 'FLYING' ? (
                // Rocket in Full Flight with Exhaust Flame
                <g>
                  {/* Exhaust Flame */}
                  <g transform="translate(-18, 5)">
                    <text x="0" y="0" fontSize="18" className="animate-pulse select-none" transform="rotate(45)">
                      🔥
                    </text>
                  </g>
                  {/* Rocket Body */}
                  <text x="0" y="4" fontSize="32" textAnchor="middle" className="select-none filter drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                    🚀
                  </text>
                </g>
              ) : (
                // Rocket Waiting on Launchpad
                <g className="animate-pulse">
                  <text x="0" y="4" fontSize="30" textAnchor="middle" className="select-none">
                    🚀
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Win Notification Banner */}
        {myCashoutInfo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-purple-950 px-4 py-1.5 rounded-full font-black text-xs uppercase shadow-xl animate-bounce z-20 border-2 border-white/80 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Забрано: +{formatCoins(myCashoutInfo.winAmount)} 🪙 ({myCashoutInfo.mult.toFixed(2)}x)</span>
          </div>
        )}

        {/* Error Toast */}
        {errorMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-xs uppercase shadow-xl animate-pulse z-20 border border-rose-300">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Betting Controls & Action Button */}
      <div className="w-full rounded-3xl bg-[#17052e]/90 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-3">
        {/* Bet inputs */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bet Amount */}
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-purple-300 uppercase">Ставка</span>
            <div className="flex items-center gap-1 bg-black/40 border border-purple-400/40 rounded-xl px-2.5 py-1.5 mt-0.5">
              <span className="text-sm">🪙</span>
              <input
                type="number"
                disabled={hasBet && gameState !== 'WAITING'}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full bg-transparent font-mono font-black text-amber-300 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Auto Cashout */}
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-purple-300 uppercase">Авто-вывод</span>
            <div className="flex items-center gap-1 bg-black/40 border border-purple-400/40 rounded-xl px-2.5 py-1.5 mt-0.5">
              <span className="text-xs text-purple-300 font-bold">x</span>
              <input
                type="number"
                step="0.1"
                disabled={hasBet && gameState !== 'WAITING'}
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value)}
                className="w-full bg-transparent font-mono font-black text-white text-sm focus:outline-none"
                placeholder="2.0"
              />
            </div>
          </div>
        </div>

        {/* Quick Bet Adjustment Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {[50, 100, 500, 1000].map((amt) => (
            <button
              key={amt}
              disabled={hasBet && gameState !== 'WAITING'}
              onClick={() => {
                soundManager.playClick();
                setBetAmount(amt);
              }}
              className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                betAmount === amt
                  ? 'bg-amber-400 text-purple-950 border-amber-300 shadow-sm'
                  : 'bg-purple-900/40 text-purple-200 border-purple-400/20 hover:bg-purple-800/50'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Main Action Button */}
        {canCashout ? (
          <button
            onClick={handleCashout}
            className="cartoon-btn btn-spin w-full py-4 text-xl font-black tracking-wider flex items-center justify-center gap-2 shadow-2xl animate-pulse"
          >
            <span>ЗАБРАТЬ</span>
            <span className="font-mono">
              (+{formatCoins(Math.floor((myActiveBet?.betAmount || betAmount) * multiplier))} 🪙)
            </span>
          </button>
        ) : (
          <button
            disabled={gameState !== 'WAITING' || hasBet}
            onClick={handlePlaceBet}
            className={`cartoon-btn w-full py-3.5 text-base font-black tracking-wider flex items-center justify-center gap-2 ${
              hasBet ? 'btn-purple opacity-75' : 'btn-gold'
            }`}
          >
            {hasBet ? 'Ставка принята! Ждём взлёт...' : `Поставить (${formatCoins(betAmount)} 🪙)`}
          </button>
        )}
      </div>

      {/* Online Players Bets Table */}
      <div className="w-full rounded-2xl bg-[#16042a]/80 border border-purple-400/20 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-purple-300 px-1">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Игроки в раунде ({bets.length})
          </span>
          <span>Ставка / Выигрыш</span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
          {bets.map((b, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs bg-black/30 px-2.5 py-1.5 rounded-xl border border-purple-500/10"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                {renderAvatar(b.avatar)}
                <span className="font-bold text-white truncate max-w-[9rem]">
                  {b.username}
                </span>
              </div>
              <div className="shrink-0 text-right">
                {b.cashedOut ? (
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    +{formatCoins(b.winAmount)} ({b.multiplier ? b.multiplier.toFixed(2) : ''}x)
                  </span>
                ) : (
                  <span className="font-mono text-purple-300 text-xs">
                    {formatCoins(b.betAmount)} 🪙
                  </span>
                )}
              </div>
            </div>
          ))}
          {bets.length === 0 && (
            <span className="text-[11px] text-purple-400 text-center py-2">
              Нет ставок на этот раунд. Сделайте ставку первыми!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
