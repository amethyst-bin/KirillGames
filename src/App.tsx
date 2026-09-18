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

import { OnboardingAuthModal } from './components/OnboardingAuthModal';

function MainApp() {
  const { user, showOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('catalog');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [inspectedUser, setInspectedUser] = useState<UserData | null>(null);

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
    <div className="min-h-screen flex flex-col items-center justify-between text-white max-w-md mx-auto relative shadow-2xl bg-gradient-to-b from-[#250d42] via-[#16062a] to-[#0b0216] safe-top-inset safe-bottom-inset">
      {/* Top App Header */}
      <HeaderBar
        onOpenProfile={() => setActiveTab('profile')}
        onOpenBank={() => setActiveTab('bank')}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col justify-start py-2 overflow-y-auto no-scrollbar">
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
