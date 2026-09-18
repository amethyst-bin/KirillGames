import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATARS } from '../constants/gameConfig';
import { soundManager } from '../audio/soundManager';
import { formatTimeSpent, formatCoins } from '../utils/format';
import { api } from '../services/api';
import { Upload, Sparkles, LogOut, Clock, Trophy, Dices, Coins, Shield, Send, Copy, Check, ExternalLink } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, login, register, logout, updateUser, refreshUser } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [editName, setEditName] = useState(user?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram Linking State
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [isGeneratingTg, setIsGeneratingTg] = useState(false);
  const [copiedTgCode, setCopiedTgCode] = useState(false);
  const [profileToast, setProfileToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setProfileToast({ msg, type });
    setTimeout(() => setProfileToast(null), 3500);
  };

  if (!user) return null;

  const isCustomImage = user.avatar && user.avatar.startsWith('data:image');

  // Handle custom image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Размер картинки не должен превышать 5 МБ!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await updateUser({ avatar: base64 });
        soundManager.playCoin();
        showToast('Аватар успешно обновлён!', 'success');
      } catch (err) {
        console.error('Failed to update avatar:', err);
        showToast('Не удалось загрузить аватар', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle save profile changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateUser({ username: editName.trim() });
      soundManager.playClick();
      setSaveSuccess(true);
      showToast('Имя профиля успешно сохранено!', 'success');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: unknown) {
      showToast((err as Error).message || 'Ошибка сохранения', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Telegram Handlers
  const handleGenerateCode = async () => {
    setIsGeneratingTg(true);
    try {
      soundManager.playClick();
      const res = await api.getTelegramLinkCode();
      setTelegramCode(res.code);
      setTelegramDeepLink(res.deepLink);
    } catch (err: unknown) {
      showToast((err as Error).message || 'Ошибка генерации кода', 'error');
    } finally {
      setIsGeneratingTg(false);
    }
  };

  const handleCopyCode = () => {
    if (!telegramCode) return;
    try {
      navigator.clipboard?.writeText(telegramCode);
    } catch {
      // ignore
    }
    soundManager.playCoin();
    setCopiedTgCode(true);
    setTimeout(() => setCopiedTgCode(false), 2000);
  };

  const handleUnlink = async () => {
    if (!confirm('Вы уверены, что хотите отвязать Telegram?')) return;
    try {
      soundManager.playClick();
      await api.unlinkTelegram();
      await refreshUser();
      setTelegramCode(null);
      setTelegramDeepLink(null);
      showToast('Telegram успешно отвязан', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Ошибка отвязки', 'error');
    }
  };

  // Handle Auth submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await login(usernameInput, passwordInput);
      } else {
        await register(usernameInput, passwordInput);
      }
      soundManager.playBigWin();
      setIsAuthModalOpen(false);
      setUsernameInput('');
      setPasswordInput('');
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Ошибка авторизации');
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 px-3 py-2 animate-fadeIn pb-24">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-black text-white tracking-wide uppercase">
          Мой Профиль
        </h2>

        {user.username.startsWith('Гость_') ? (
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAuthModalOpen(true);
            }}
            className="cartoon-btn btn-gold px-3 py-1.5 text-xs font-black flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> Зарегистрироваться
          </button>
        ) : (
          <button
            onClick={() => {
              soundManager.playClick();
              logout();
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/40 text-rose-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Выйти
          </button>
        )}
      </div>

      {/* Floating Notification Toast */}
      {profileToast && (
        <div
          className={`p-2.5 rounded-2xl text-xs font-bold text-center border shadow-lg animate-fadeIn ${
            profileToast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}
        >
          {profileToast.msg}
        </div>
      )}

      {/* Profile Card */}
      <div className="relative w-full rounded-3xl bg-purple-950/80 border-2 border-purple-400/40 p-4 shadow-xl flex flex-col items-center gap-4 text-center">
        {/* Avatar with Upload button */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-lg flex items-center justify-center border-2 border-amber-200 overflow-hidden">
            {isCustomImage ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-5xl select-none">{user.avatar}</span>
            )}
          </div>

          {/* Upload Button Overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-full border-2 border-white shadow-lg hover:scale-110 active:scale-95 transition-all"
            title="Загрузить аватарку"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Username and level badge */}
        <div className="flex flex-col items-center gap-1 w-full max-w-xs">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-black/40 border border-purple-400/50 rounded-xl px-3 py-1 text-center font-black text-white text-base focus:border-amber-400 focus:outline-none"
              placeholder="Ваш ник..."
              maxLength={16}
            />
            <button
              disabled={isSaving || editName === user.username}
              onClick={handleSaveProfile}
              className="cartoon-btn btn-spin px-3 py-1 text-xs font-black disabled:opacity-30"
            >
              {saveSuccess ? '✓' : 'Сохранить'}
            </button>
          </div>
          <span className="text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Уровень {user.level} (Опыт: {user.xp}/{user.xp_to_next} XP)
          </span>
        </div>

        {/* Preset Cartoon Avatars */}
        <div className="w-full flex flex-col gap-1 text-left">
          <span className="text-[11px] font-bold text-purple-300 uppercase px-1">
            Или выбери мультяшный аватар:
          </span>
          <div className="grid grid-cols-6 gap-1.5 bg-black/30 p-2 rounded-2xl border border-purple-400/20">
            {AVATARS.slice(0, 6).map((emoji) => (
              <button
                key={emoji}
                onClick={async () => {
                  soundManager.playClick();
                  await updateUser({ avatar: emoji });
                }}
                className={`text-2xl p-1.5 rounded-xl transition-all ${
                  user.avatar === emoji
                    ? 'bg-amber-400 shadow-md scale-110'
                    : 'hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Stats Cards */}
        <div className="grid grid-cols-2 gap-2 w-full text-left">
          <div className="bg-purple-900/40 rounded-2xl p-3 border border-purple-400/20 flex items-center gap-3">
            <Coins className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-purple-300 font-bold uppercase">Монеты</div>
              <div className="font-mono font-black text-amber-300 text-sm truncate">
                {formatCoins(user.coins)}
              </div>
            </div>
          </div>

          <div className="bg-purple-900/40 rounded-2xl p-3 border border-purple-400/20 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-purple-300 font-bold uppercase">Макс. выигрыш</div>
              <div className="font-mono font-black text-emerald-400 text-sm truncate">
                +{formatCoins(user.biggest_win)}
              </div>
            </div>
          </div>

          <div className="bg-purple-900/40 rounded-2xl p-3 border border-purple-400/20 flex items-center gap-3">
            <Dices className="w-6 h-6 text-purple-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-purple-300 font-bold uppercase">Сыграно игр</div>
              <div className="font-mono font-black text-white text-sm truncate">
                {user.games_played || 0}
              </div>
            </div>
          </div>

          <div className="bg-purple-900/40 rounded-2xl p-3 border border-purple-400/20 flex items-center gap-3">
            <Clock className="w-6 h-6 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-purple-300 font-bold uppercase">Время в игре</div>
              <div className="font-mono font-black text-cyan-300 text-xs truncate">
                {formatTimeSpent(user.time_spent_seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Bot Integration Card */}
        <div className="w-full rounded-2xl bg-gradient-to-r from-[#0c2238] via-[#112a45] to-[#0a1a2e] border border-sky-500/40 p-3 text-left flex flex-col gap-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                <Send className="w-4 h-4 ml-0.5" />
              </div>
              <div>
                <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  Telegram Бот
                  <span className="text-[9px] bg-sky-500/30 text-sky-300 px-1.5 py-0.5 rounded-full border border-sky-400/30">
                    @kirillgames_bot
                  </span>
                </h4>
                <p className="text-[10px] text-sky-200/80">
                  Проверяйте баланс и топы прямо в мессенджере
                </p>
              </div>
            </div>

            {user.telegram_username || user.telegram_id ? (
              <span className="text-[10px] font-black bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2 py-0.5 rounded-full">
                Привязан
              </span>
            ) : null}
          </div>

          {user.telegram_username || user.telegram_id ? (
            <div className="flex items-center justify-between bg-black/30 p-2 rounded-xl border border-sky-500/20 text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-xs">
                  Аккаунт: <span className="text-sky-300 font-mono">{user.telegram_username || `ID: ${user.telegram_id}`}</span>
                </span>
              </div>
              <button
                onClick={handleUnlink}
                className="text-[11px] font-black text-rose-300 hover:text-rose-200 bg-rose-950/40 border border-rose-500/30 px-2 py-1 rounded-lg active:scale-95"
              >
                Отвязать
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {!telegramCode ? (
                <button
                  disabled={isGeneratingTg}
                  onClick={handleGenerateCode}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isGeneratingTg ? 'Генерация кода...' : 'Привязать Telegram'}
                </button>
              ) : (
                <div className="flex flex-col gap-2 bg-black/40 p-2.5 rounded-xl border border-sky-400/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-sky-200 uppercase font-bold">
                      Ваш одноразовый код:
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">
                      Действует 15 минут
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-sky-950/70 border border-sky-400/60 rounded-xl px-3 py-2">
                    <span className="font-mono font-black text-xl text-amber-300 tracking-widest">
                      {telegramCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-lg font-black flex items-center gap-1 active:scale-95"
                    >
                      {copiedTgCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedTgCode ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={telegramDeepLink || `https://t.me/kirillgames_bot?start=${telegramCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-black text-xs text-center flex items-center justify-center gap-1 shadow active:scale-98"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Открыть @kirillgames_bot
                    </a>
                    <button
                      onClick={async () => {
                        soundManager.playClick();
                        await refreshUser();
                      }}
                      className="py-2 px-3 bg-purple-900/80 hover:bg-purple-800 border border-purple-400/30 text-purple-200 rounded-xl font-black text-xs active:scale-95"
                      title="Проверить статус"
                    >
                      Готово?
                    </button>
                  </div>

                  <p className="text-[10px] text-sky-300/80 leading-tight text-center">
                    Нажмите «Открыть бот» или отправьте боту команду <code className="text-white bg-white/10 px-1 rounded">/link {telegramCode}</code>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal (Login / Register / OAuth stubs) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-3xl bg-purple-950/95 border-2 border-purple-400/60 p-5 shadow-2xl flex flex-col gap-3.5 text-center animate-reel-land">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                {authMode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
              </h3>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-purple-300 hover:text-white font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Error banner */}
            {authError && (
              <div className="bg-red-900/60 border border-red-400 rounded-xl p-2 text-xs text-red-200 font-bold">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2.5 text-left">
              <div>
                <label className="text-[11px] font-bold text-purple-200 uppercase">Никнейм</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-black/40 border border-purple-400/50 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none mt-1"
                  placeholder="Придумайте ник..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-200 uppercase">Пароль</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-black/40 border border-purple-400/50 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:border-amber-400 focus:outline-none mt-1"
                  placeholder="Пароль..."
                />
              </div>

              <button
                type="submit"
                className="cartoon-btn btn-spin w-full py-2.5 text-sm font-black mt-2"
              >
                {authMode === 'login' ? '🚀 Войти в аккаунт' : '🎁 Создать аккаунт (БЕСПЛАТНО + 5 000 🪙)'}
              </button>
            </form>

            {/* Toggle login / register */}
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-xs text-amber-300 hover:underline font-bold"
            >
              {authMode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>

            {/* OAuth 2.0 Stubs */}
            <div className="border-t border-purple-400/20 pt-3 flex flex-col gap-2">
              <span className="text-[10px] text-purple-300 font-bold uppercase">
                Быстрый вход через соцсети:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => showToast('Google OAuth в разработке! Доступен стандартный вход и регистрация.', 'error')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white active:scale-95 transition-all"
                >
                  <span>🌐</span> Google
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Discord OAuth в разработке! Доступен стандартный вход и регистрация.', 'error')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#5865F2]/30 hover:bg-[#5865F2]/40 border border-[#5865F2]/50 text-xs font-bold text-white active:scale-95 transition-all"
                >
                  <span>🎮</span> Discord
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
