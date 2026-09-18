import { useState, useEffect } from 'react';
import type { UserProfile } from '../types/game';
import { DEFAULT_PROFILE } from '../constants/gameConfig';
import { soundManager } from '../audio/soundManager';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'kirill_casino_profile_v1';

export function usePlayerProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  });

  const [levelUpMessage, setLevelUpMessage] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  // Add coins
  const addCoins = (amount: number) => {
    setProfile((prev) => ({
      ...prev,
      coins: prev.coins + amount,
    }));
  };

  // Deduct coins (returns false if not enough)
  const spendCoins = (amount: number): boolean => {
    if (profile.coins < amount) return false;
    setProfile((prev) => ({
      ...prev,
      coins: prev.coins - amount,
    }));
    return true;
  };

  // Add XP and handle leveling up
  const addXP = (earnedXP: number) => {
    setProfile((prev) => {
      let newXP = prev.xp + earnedXP;
      let newLevel = prev.level;
      let newReq = prev.xpToNextLevel;
      let leveledUp = false;

      while (newXP >= newReq) {
        newXP -= newReq;
        newLevel += 1;
        newReq = Math.floor(newReq * 1.5);
        leveledUp = true;
      }

      if (leveledUp) {
        const bonusCoins = newLevel * 250;
        soundManager.playLevelUp();
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.3 },
        });
        setLevelUpMessage(newLevel);
        setTimeout(() => setLevelUpMessage(null), 3500);

        return {
          ...prev,
          level: newLevel,
          xp: newXP,
          xpToNextLevel: newReq,
          coins: prev.coins + bonusCoins,
        };
      }

      return {
        ...prev,
        xp: newXP,
      };
    });
  };

  // Record a spin and win
  const recordSpin = (winAmount: number) => {
    setProfile((prev) => ({
      ...prev,
      totalSpins: prev.totalSpins + 1,
      biggestWin: Math.max(prev.biggestWin, winAmount),
    }));
  };

  // Update avatar and username
  const updateProfileInfo = (username: string, avatar: string) => {
    setProfile((prev) => ({
      ...prev,
      username,
      avatar,
    }));
  };

  // Claim chest bonus
  const claimChestBonus = (): number => {
    const reward = Math.floor(300 + Math.random() * 500);
    soundManager.playBigWin();
    addCoins(reward);
    setProfile((prev) => ({
      ...prev,
      lastBonusTime: Date.now(),
    }));
    return reward;
  };

  // Emergency coins faucet when user is broke
  const claimEmergencyCoins = () => {
    const amount = 500;
    soundManager.playCoin();
    addCoins(amount);
  };

  return {
    profile,
    addCoins,
    spendCoins,
    addXP,
    recordSpin,
    updateProfileInfo,
    claimChestBonus,
    claimEmergencyCoins,
    levelUpMessage,
  };
}
