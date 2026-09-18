import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { WS_URL, getToken } from '../services/api';
import { soundManager } from '../audio/soundManager';
import { ArrowLeft, Rocket, Users, History, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

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

export const CrashGame: React.FC<CrashGameProps> = ({ onBack, onOpenBank }) => {
  const { user, refreshUser } = useAuth();
  const [wsConnected, setWsConnected] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<'WAITING' | 'FLYING' | 'CRASHED'>('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(5.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [bets, setBets] = useState<CrashBet[]>([]);
  const [history, setHistory] = useState<number[]>([]);

  // Local bet input
  const [betAmount, setBetAmount] = useState(50);
  const [autoCashout, setAutoCashout] = useState<string>('2.0');
  const [hasBet, setHasBet] = useState(false);
  const [myCashoutInfo, setMyCashoutInfo] = useState<{ winAmount: number; mult: number } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

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

              // Check if I cashed out
              if (user) {
                const myBet = data.bets?.find((b: CrashBet) => b.userId === user.id);
                if (myBet && myBet.cashedOut && !myCashoutInfo) {
                  setMyCashoutInfo({ winAmount: myBet.winAmount, mult: myBet.multiplier || data.multiplier });
                  soundManager.playBigWin();
                  confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
                  refreshUser();
                }
              }

              // Sound effects
              if (data.state === 'CRASHED' && gameState === 'FLYING') {
                soundManager.playReelStop(2);
                refreshUser();
              }
            }

            if (data.type === 'ERROR') {
              alert(data.message);
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

  // Visual flight height percentage (0 to 80%)
  const flightHeight = Math.min(80, (multiplier - 1.0) * 15);

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

        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-amber-400 animate-pulse" />
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider">
            Crash Rocket
          </h2>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400 animate-ping'}`} />
          <span className="text-purple-300">{wsConnected ? 'Сервер VPS' : 'Подключение...'}</span>
        </div>
      </div>

      {/* History Ribbon */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto py-1 px-2 bg-purple-950/60 rounded-xl border border-purple-400/20 text-xs no-scrollbar">
        <History className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        {history.map((h, i) => (
          <span
            key={i}
            className={`font-mono font-bold px-2 py-0.5 rounded-lg flex-shrink-0 text-[11px] ${
              h >= 2.0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main Rocket Flight Arena */}
      <div className="relative w-full h-64 rounded-3xl bg-gradient-to-b from-[#120526] via-[#200940] to-[#0c031a] border-2 border-purple-400/40 overflow-hidden shadow-2xl flex flex-col items-center justify-center">
        {/* Animated stars background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

        {/* Multiplier / Countdown Display */}
        <div className="z-10 flex flex-col items-center text-center">
          {gameState === 'WAITING' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                Взлёт через
              </span>
              <span className="text-4xl font-mono font-black text-white animate-pulse">
                {countdown.toFixed(1)}s
              </span>
              <div className="w-36 h-2 bg-purple-950 rounded-full border border-purple-400/30 overflow-hidden mt-1">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${(countdown / 5.0) * 100}%` }}
                />
              </div>
            </div>
          )}

          {gameState === 'FLYING' && (
            <div className="flex flex-col items-center">
              <span className="text-5xl font-mono font-black text-amber-300 drop-shadow">
                {multiplier.toFixed(2)}x
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">
                Ракета летит!
              </span>
            </div>
          )}

          {gameState === 'CRASHED' && (
            <div className="flex flex-col items-center gap-1 animate-reel-land">
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> ВЗРЫВ РАКЕТЫ
              </span>
              <span className="text-5xl font-mono font-black text-rose-400">
                {crashPoint ? crashPoint.toFixed(2) : multiplier.toFixed(2)}x
              </span>
            </div>
          )}
        </div>

        {/* The Rocket Actor */}
        <div
          className="absolute left-1/4 transition-all duration-100 flex flex-col items-center"
          style={{
            bottom: gameState === 'FLYING' ? `${20 + flightHeight}%` : gameState === 'CRASHED' ? '30%' : '15%',
            transform: gameState === 'FLYING' ? 'rotate(-20deg) scale(1.1)' : 'rotate(0deg)',
          }}
        >
          <span className="text-5xl select-none">
            {gameState === 'CRASHED' ? '💥' : '🚀'}
          </span>
          {gameState === 'FLYING' && (
            <span className="text-xs text-orange-400 font-black animate-pulse">
              🔥
            </span>
          )}
        </div>

        {/* My Win Toast */}
        {myCashoutInfo && (
          <div className="absolute top-4 bg-emerald-500/90 text-purple-950 px-4 py-1.5 rounded-full font-black text-xs uppercase shadow-lg animate-bounce z-20">
            Забрано: +{myCashoutInfo.winAmount} 🪙 ({myCashoutInfo.mult.toFixed(2)}x)
          </div>
        )}
      </div>

      {/* Action / Betting Controls */}
      <div className="w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-3 shadow-xl flex flex-col gap-3">
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

        {/* Big Action Button */}
        {canCashout ? (
          <button
            onClick={handleCashout}
            className="cartoon-btn btn-spin w-full py-4 text-xl font-black tracking-wider flex items-center justify-center gap-2 shadow-xl animate-pulse"
          >
            <span>ЗАБРАТЬ</span>
            <span className="font-mono">
              (+{Math.floor((myActiveBet?.betAmount || betAmount) * multiplier)} 🪙)
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
            {hasBet ? 'Ставка принята! Ждём старт...' : `Поставить (${betAmount} 🪙)`}
          </button>
        )}
      </div>

      {/* Online Players Bets in this round */}
      <div className="w-full rounded-2xl bg-purple-950/60 border border-purple-400/20 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-purple-300 px-1">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Игроки в раунде ({bets.length})
          </span>
          <span>Ставка / Выигрыш</span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
          {bets.map((b, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs bg-black/30 px-2.5 py-1 rounded-xl"
            >
              <div className="flex items-center gap-1.5">
                <span>{b.avatar}</span>
                <span className="font-bold text-white truncate max-w-[7rem]">
                  {b.username}
                </span>
              </div>
              <div>
                {b.cashedOut ? (
                  <span className="font-mono font-black text-emerald-400">
                    +{b.winAmount} ({b.multiplier ? b.multiplier.toFixed(2) : ''}x)
                  </span>
                ) : (
                  <span className="font-mono text-purple-300">
                    {b.betAmount} 🪙
                  </span>
                )}
              </div>
            </div>
          ))}
          {bets.length === 0 && (
            <span className="text-[11px] text-purple-400 text-center py-1">
              Нет ставок на этот раунд. Сделайте ставку первыми!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
