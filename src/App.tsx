import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HeaderBar } from './components/HeaderBar';
import { LiquidGlassNavbar } from './components/LiquidGlassNavbar';
import type { NavTab } from './components/LiquidGlassNavbar';
import { GameCatalog } from './components/GameCatalog';
import type { GameId } from './components/GameCatalog';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { BankModal } from './components/BankModal';
import { PublicProfileModal } from './components/PublicProfileModal';
import type { UserData } from './services/api';

// Games
import { SlotsGame } from './games/SlotsGame';
import { CrashGame } from './games/CrashGame';
import { BlackjackGame } from './games/BlackjackGame';
import { VideoPokerGame } from './games/VideoPokerGame';
import { TowersGame } from './games/TowersGame';
import { MinesGame } from './games/MinesGame';
import { PlinkoGame } from './games/PlinkoGame';
import { RouletteGame } from './games/RouletteGame';
import { DiceGame } from './games/DiceGame';
import { KenoGame } from './games/KenoGame';
import { CoinFlipGame } from './games/CoinFlipGame';
import { HiLoGame } from './games/HiLoGame';
import { BaccaratGame } from './games/BaccaratGame';
import { ThimblesGame } from './games/ThimblesGame';
import { LimboGame } from './games/LimboGame';
import { DragonTigerGame } from './games/DragonTigerGame';
import { WheelOfFortuneGame } from './games/WheelOfFortuneGame';
import { PenaltyGame } from './games/PenaltyGame';
import { ScratchGame } from './games/ScratchGame';
import { SicBoGame } from './games/SicBoGame';

import { QuestsModal } from './components/QuestsModal';
import { OnboardingAuthModal } from './components/OnboardingAuthModal';

function MainApp() {
  const { user, showOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('catalog');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [inspectedUser, setInspectedUser] = useState<UserData | null>(null);
  const [showQuests, setShowQuests] = useState(false);

  const handleSelectGame = (gameId: GameId) => {
    setActiveGame(gameId);
    setActiveTab('game');
  };

  const handleBackToCatalog = () => {
    setActiveGame(null);
    setActiveTab('catalog');
  };

  const handleNavTabChange = (tab: NavTab) => {
    if (tab === 'catalog') {
      setActiveGame(null);
    }
    setActiveTab(tab);
  };

  const hasBonusReady = user ? (Date.now() - (user.last_bonus_time || 0) > 60000) : false;

  return (
    <div className="h-screen h-[100dvh] flex flex-col items-center justify-between text-white max-w-md mx-auto relative shadow-2xl bg-gradient-to-b from-[#250d42] via-[#16062a] to-[#0b0216] safe-top-inset overflow-hidden">
      {/* Top App Header */}
      <HeaderBar
        onOpenProfile={() => setActiveTab('profile')}
        onOpenBank={() => setActiveTab('bank')}
        onOpenQuests={() => setShowQuests(true)}
      />

      {/* Main Content Area: in games scrolling is disabled, in catalog/tabs scrolling is enabled */}
      <main className={`flex-1 w-full flex flex-col justify-start py-2 ${activeTab === 'game' ? 'overflow-hidden' : 'overflow-y-auto pb-28 smooth-scroll'} no-scrollbar`}>
        {/* Navigation Tabs */}
        {activeTab === 'catalog' && (
          <GameCatalog onSelectGame={handleSelectGame} />
        )}

        {activeTab === 'bank' && (
          <BankModal />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView onOpenUserProfile={(u) => setInspectedUser(u)} />
        )}

        {activeTab === 'profile' && (
          <ProfileView />
        )}

        {/* Active Game Views */}
        {activeTab === 'game' && (
          <>
            {activeGame === 'slots' && (
              <SlotsGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'crash' && (
              <CrashGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'blackjack' && (
              <BlackjackGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'poker' && (
              <VideoPokerGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'towers' && (
              <TowersGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'mines' && (
              <MinesGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'plinko' && (
              <PlinkoGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'roulette' && (
              <RouletteGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'dice' && (
              <DiceGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'keno' && (
              <KenoGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'coinflip' && (
              <CoinFlipGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'hilo' && (
              <HiLoGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'baccarat' && (
              <BaccaratGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'thimbles' && (
              <ThimblesGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'limbo' && (
              <LimboGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'dragontiger' && (
              <DragonTigerGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'wheel' && (
              <WheelOfFortuneGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'penalty' && (
              <PenaltyGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'scratch' && (
              <ScratchGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
            {activeGame === 'sicbo' && (
              <SicBoGame onBack={handleBackToCatalog} onOpenBank={() => setActiveTab('bank')} />
            )}
          </>
        )}
      </main>

      {/* Floating Liquid Glass Bottom Navbar */}
      <LiquidGlassNavbar
        activeTab={activeTab}
        onTabChange={handleNavTabChange}
        hasBonusReady={hasBonusReady}
      />

      {/* Public Profile Inspector Modal (When clicking any player in Top) */}
      <PublicProfileModal
        user={inspectedUser}
        onClose={() => setInspectedUser(null)}
      />

      {/* Quests & Daily Rewards Modal */}
      <QuestsModal
        isOpen={showQuests}
        onClose={() => setShowQuests(false)}
      />

      {/* Onboarding Login / Register Modal */}
      {showOnboarding && <OnboardingAuthModal />}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
