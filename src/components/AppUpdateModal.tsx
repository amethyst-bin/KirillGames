import React from 'react';
import type { ReleaseInfo } from '../services/updateService';
import { soundManager } from '../audio/soundManager';
import { Download, Sparkles, AlertCircle, X } from 'lucide-react';

interface AppUpdateModalProps {
  info: ReleaseInfo;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ info, onClose }) => {
  const handleDownload = () => {
    soundManager.playBigWin();
    if (info.downloadUrl) {
      window.open(info.downloadUrl, '_system');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#21073d] via-[#16042b] to-[#0d021b] border-2 border-amber-400/80 p-5 shadow-2xl flex flex-col items-center gap-4 text-center animate-reel-land overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-900/80 border border-purple-400/40 text-purple-200 flex items-center justify-center hover:bg-purple-800 active:scale-90 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-xl flex items-center justify-center border-2 border-amber-200 mt-2">
          <Download className="w-8 h-8 text-purple-950 stroke-[2.5] animate-bounce" />
        </div>

        {/* Title & Version Info */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-400" /> Доступно обновление!
          </div>
          <h3 className="text-xl font-black text-white drop-shadow mt-1">
            Версия v{info.latestVersion}
          </h3>
          <span className="text-[11px] text-purple-300 font-bold">
            Текущая: v{info.currentVersion} {info.releaseDate && `• ${info.releaseDate}`}
          </span>
        </div>

        {/* Changelog Box */}
        <div className="w-full bg-black/40 border border-purple-400/30 rounded-2xl p-3 text-left max-h-36 overflow-y-auto no-scrollbar shadow-inner">
          <span className="text-[10px] text-purple-300 font-bold uppercase block mb-1">
            Что нового:
          </span>
          <p className="text-xs text-purple-100 whitespace-pre-line leading-relaxed font-sans">
            {info.changelog || '• Оптимизация производительности\n• Исправления интерфейса и баланса'}
          </p>
        </div>

        {/* Android Package Conflict Advice */}
        <div className="w-full bg-amber-500/15 border border-amber-400/40 rounded-2xl p-3 text-left flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-100 leading-snug">
            <strong className="text-amber-300 font-bold block mb-0.5">
              Если Android пишет «Пакет конфликтует»:
            </strong>
            Удалите старую версию приложения с телефона и установите новую. Ваш профиль, баланс и монеты привязаны к серверу и сохранятся!
          </div>
        </div>

        {/* Direct APK Download Button */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={handleDownload}
            className="cartoon-btn btn-gold w-full py-3.5 text-sm font-black flex items-center justify-center gap-2 shadow-xl"
          >
            <Download className="w-4 h-4" />
            <span>Скачать APK ({info.apkName || 'KirillGames.apk'})</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="text-xs text-purple-300 hover:text-white py-1 transition-colors"
          >
            Напомнить позже
          </button>
        </div>
      </div>
    </div>
  );
};
