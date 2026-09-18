import { useState } from 'react';
import { usePlayerProfile } from './hooks/usePlayerProfile';
import { HeaderProfile } from './components/HeaderProfile';
import { SlotMachine } from './components/SlotMachine';
import { CoinRewardModal } from './components/CoinRewardModal';
import { BigWinOverlay } from './components/BigWinOverlay';
import { soundManager } from './audio/soundManager';
import { Trophy } from 'lucide-react';

type GameTab = 'slots' | 'blackjack' | 'crash' | 'leaderboard';

export function App() {
  const {
    profile,
    addCoins,
    spendCoins,
    addXP,
    recordSpin,
    updateProfileInfo,
    claimChestBonus,
    claimEmergencyCoins,
    levelUpMessage,
  } = usePlayerProfile();

  const [activeTab, setActiveTab] = useState<GameTab>('slots');
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bigWinData, setBigWinData] = useState<{ amount: number; multiplier: number } | null>(null);

  const handleTabChange = (tab: GameTab) => {
    soundManager.playClick();
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between text-white max-w-lg mx-auto relative shadow-2xl bg-gradient-to-b from-[#2a104e] via-[#1b0833] to-[#0f031f]">
      {/* Top Profile Header */}
      <HeaderProfile
        profile={profile}
        onUpdateProfile={updateProfileInfo}
        onOpenBonusModal={() => setIsBonusModalOpen(true)}
      />

      {/* Level Up Notification Banner */}
      {levelUpMessage && (
        <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-purple-950 py-2 px-4 text-center font-black text-sm uppercase tracking-wider shadow-lg animate-bounce z-20">
          ⭐ НОВЫЙ УРОВЕНЬ {levelUpMessage}! БОНУС: +{levelUpMessage * 250} МОНЕТ! ⭐
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col justify-center py-2 px-1">
        {activeTab === 'slots' && (
          <SlotMachine
            coins={profile.coins}
            onSpendCoins={spendCoins}
            onAddCoins={addCoins}
            onAddXP={addXP}
            onRecordSpin={recordSpin}
            onTriggerBigWin={(amount, multiplier) => setBigWinData({ amount, multiplier })}
            onOpenBonusModal={() => setIsBonusModalOpen(true)}
          />
        )}

        {/* Coming Soon: Blackjack Teaser */}
        {activeTab === 'blackjack' && (
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center animate-reel-land">
            <div className="text-6xl animate-bounce">🃏</div>
            <h2 className="text-2xl font-black text-amber-300 uppercase drop-shadow">
              Блэкджек (21)
            </h2>
            <p className="text-xs text-purple-200 max-w-xs leading-relaxed">
              Карточный стол с мультяшной анимацией раздачи, фишками и дилером готов к подключению в следующем модуле!
            </p>
            <div className="bg-purple-950/70 border-2 border-purple-400/40 rounded-2xl p-4 w-full text-xs font-bold text-emerald-300">
              ✓ Логика баланса монет уже общая с игровым автоматом!
            </div>
            <button
              onClick={() => handleTabChange('slots')}
              className="cartoon-btn btn-spin px-6 py-2.5 text-xs font-black"
            >
              Вернуться к Слотам
            </button>
          </div>
        )}

        {/* Coming Soon: Crash Teaser */}
        {activeTab === 'crash' && (
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center animate-reel-land">
            <div className="text-6xl animate-pulse-glow">🚀</div>
            <h2 className="text-2xl font-black text-amber-300 uppercase drop-shadow">
              Краш Ракета
            </h2>
            <p className="text-xs text-purple-200 max-w-xs leading-relaxed">
              Множитель взлетает ввысь (1.00x → 50.00x). Успей нажать «Забрать» до того, как ракета улетит! Готовится для мультиплеера с вашим VPS.
            </p>
            <div className="bg-purple-950/70 border-2 border-purple-400/40 rounded-2xl p-4 w-full text-xs font-bold text-amber-300">
              ✓ Сервер WebSockets на VPS будет транслировать общий полёт ракеты!
            </div>
            <button
              onClick={() => handleTabChange('slots')}
              className="cartoon-btn btn-spin px-6 py-2.5 text-xs font-black"
            >
              Вернуться к Слотам
            </button>
          </div>
        )}

        {/* Leaderboard Preview */}
        {activeTab === 'leaderboard' && (
          <div className="p-4 flex flex-col items-center gap-3 text-center animate-reel-land w-full">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
              <h2 className="text-xl font-black text-amber-300 uppercase drop-shadow">
                Таблица Лидеров
              </h2>
            </div>
            
            <div className="w-full bg-purple-950/80 border-2 border-purple-400/40 rounded-2xl p-3 flex flex-col gap-2">
              {/* Leaderboard item 1 */}
              <div className="flex items-center justify-between bg-amber-500/20 border border-amber-400/50 p-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥇</span>
                  <span className="text-xl">👑</span>
                  <span className="font-extrabold text-sm text-white">Золотой Кот</span>
                </div>
                <span className="font-mono font-black text-amber-300 text-sm">250 000 🪙</span>
              </div>

              {/* Leaderboard item 2 */}
              <div className="flex items-center justify-between bg-purple-900/40 border border-purple-500/30 p-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-xl">🦊</span>
                  <span className="font-extrabold text-sm text-white">Лис Удачи</span>
                </div>
                <span className="font-mono font-black text-amber-300 text-sm">120 400 🪙</span>
              </div>

              {/* Player rank */}
              <div className="flex items-center justify-between bg-emerald-500/20 border-2 border-emerald-400 p-2 rounded-xl mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-300 uppercase">ВЫ</span>
                  <span className="text-xl">{profile.avatar}</span>
                  <span className="font-extrabold text-sm text-white">{profile.username}</span>
                </div>
                <span className="font-mono font-black text-emerald-300 text-sm">
                  {profile.coins.toLocaleString('ru-RU')} 🪙
                </span>
              </div>
            </div>

            <p className="text-[11px] text-purple-300 font-bold">
              Синхронизация глобального рейтинга будет подключена через ваш VPS!
            </p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Hub */}
      <nav className="w-full grid grid-cols-4 gap-1 p-2 bg-purple-950/90 backdrop-blur-md border-t-2 border-purple-500/40 sticky bottom-0 z-30">
        <button
          onClick={() => handleTabChange('slots')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'slots'
              ? 'bg-amber-400 text-purple-950 font-black scale-105 shadow-md'
              : 'text-purple-300 hover:text-white font-bold opacity-80'
          }`}
        >
          <span className="text-lg">🎰</span>
          <span className="text-[10px] uppercase tracking-tight">Слоты</span>
        </button>

        <button
          onClick={() => handleTabChange('blackjack')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'blackjack'
              ? 'bg-amber-400 text-purple-950 font-black scale-105 shadow-md'
              : 'text-purple-300 hover:text-white font-bold opacity-80'
          }`}
        >
          <span className="text-lg">🃏</span>
          <span className="text-[10px] uppercase tracking-tight">21 Очко</span>
        </button>

        <button
          onClick={() => handleTabChange('crash')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'crash'
              ? 'bg-amber-400 text-purple-950 font-black scale-105 shadow-md'
              : 'text-purple-300 hover:text-white font-bold opacity-80'
          }`}
        >
          <span className="text-lg">🚀</span>
          <span className="text-[10px] uppercase tracking-tight">Краш</span>
        </button>

        <button
          onClick={() => handleTabChange('leaderboard')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-amber-400 text-purple-950 font-black scale-105 shadow-md'
              : 'text-purple-300 hover:text-white font-bold opacity-80'
          }`}
        >
          <span className="text-lg">🏆</span>
          <span className="text-[10px] uppercase tracking-tight">Топ</span>
        </button>
      </nav>

      {/* Free Coins & Rewards Modal */}
      <CoinRewardModal
        isOpen={isBonusModalOpen}
        onClose={() => setIsBonusModalOpen(false)}
        coins={profile.coins}
        lastBonusTime={profile.lastBonusTime}
        onClaimChest={claimChestBonus}
        onEmergencyGrant={claimEmergencyCoins}
        onTapCoin={() => addCoins(10)}
      />

      {/* Big Win Celebration Overlay */}
      {bigWinData && (
        <BigWinOverlay
          winAmount={bigWinData.amount}
          multiplier={bigWinData.multiplier}
          onClose={() => setBigWinData(null)}
        />
      )}
    </div>
  );
}

export default App;
