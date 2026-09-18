import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../audio/soundManager';
import { Sparkles, UserPlus, LogIn, UserX, AlertCircle, RefreshCw } from 'lucide-react';

export const OnboardingAuthModal: React.FC = () => {
  const { login, register, guestLogin, serverError, retryConnection } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || username.trim().length < 2) {
      setError('Имя пользователя должно содержать не менее 2 символов!');
      return;
    }
    if (!password || password.length < 4) {
      setError('Пароль должен содержать не менее 4 символов!');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Пароли не совпадают!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      soundManager.playBigWin();
    } catch (err: unknown) {
      setError((err as Error).message || 'Ошибка подключения к серверу');
      soundManager.playReelStop(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await guestLogin();
      soundManager.playCoin();
    } catch (err: unknown) {
      setError((err as Error).message || 'Не удалось подключиться к серверу');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-purple-950/95 border-2 border-amber-400/60 p-6 shadow-2xl flex flex-col gap-4 text-center animate-reel-land">
        {/* App Logo & Welcome */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-1 flex items-center justify-center text-3xl shadow-lg border-2 border-amber-200">
            🎰
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide uppercase mt-1 flex items-center gap-1.5">
            KirillGames
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </h2>
          <p className="text-xs text-purple-200 font-bold">
            Войдите или создайте аккаунт, чтобы сохранять прогресс и быть в топе лидеров!
          </p>
        </div>

        {/* Server error if any */}
        {serverError && (
          <div className="bg-rose-950/90 border border-rose-500 rounded-2xl p-2.5 flex items-center justify-between text-xs text-rose-200 font-bold">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              {serverError}
            </span>
            <button
              type="button"
              onClick={retryConnection}
              className="p-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white active:scale-95"
              title="Повторить попытку"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Error */}
        {error && (
          <div className="bg-red-900/60 border border-red-400 rounded-xl p-2 text-xs text-red-200 font-bold animate-pulse">
            {error}
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-2xl border border-purple-400/30">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setMode('register');
              setError('');
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-amber-400 text-purple-950 shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Регистрация
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setMode('login');
              setError('');
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-amber-400 text-purple-950 shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Вход
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 text-left">
          <div>
            <label className="text-[11px] font-bold text-purple-200 uppercase">
              Никнейм
            </label>
            <input
              type="text"
              required
              maxLength={16}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-purple-400/50 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none mt-0.5"
              placeholder="Введите никнейм..."
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-purple-200 uppercase">
              Пароль
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-purple-400/50 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none mt-0.5"
              placeholder="Пароль..."
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-bold text-purple-200 uppercase">
                Повторите пароль
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-purple-400/50 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none mt-0.5"
                placeholder="Повторите пароль..."
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="cartoon-btn btn-spin w-full py-3 text-sm font-black mt-1 disabled:opacity-40"
          >
            {isSubmitting
              ? 'Секунду...'
              : mode === 'register'
              ? 'Создать аккаунт (1000 🪙)'
              : 'Войти в игру'}
          </button>
        </form>

        {/* Guest Alternative */}
        <div className="border-t border-purple-400/20 pt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGuest}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/30 text-xs font-bold text-purple-200 active:scale-95 transition-all"
          >
            <UserX className="w-4 h-4 text-purple-400" />
            <span>Играть как Гость (без пароля)</span>
          </button>

          {/* Social OAuth Stubs */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => alert('Серверная заготовка Google OAuth готова! Привяжите Google Client ID в настройках сервера.')}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] font-bold text-white/80 active:scale-95 transition-all"
            >
              <span>🌐</span> Google
            </button>
            <button
              type="button"
              onClick={() => alert('Серверная заготовка Discord OAuth готова! Привяжите Discord Client ID в настройках сервера.')}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[11px] font-bold text-white/80 active:scale-95 transition-all"
            >
              <span>🎮</span> Discord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
