class CrashEngine {
  constructor(db) {
    this.db = db;
    this.wss = null;
    this.state = 'WAITING'; // WAITING | FLYING | CRASHED
    this.multiplier = 1.00;
    this.crashPoint = 2.00;
    this.countdown = 5.0;
    this.bets = new Map(); // userId -> { userId, username, avatar, betAmount, autoCashout, cashedOut: false, winAmount: 0 }
    this.recentHistory = [1.45, 2.80, 1.12, 5.40, 1.03, 12.50, 3.10, 1.95];
    this.loopInterval = null;
    this.flightStartTime = 0;
  }

  init(wss) {
    this.wss = wss;
    this.startWaitingPhase();
  }

  broadcast(data) {
    if (!this.wss) return;
    const msg = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(msg);
      }
    });
  }

  generateCrashPoint() {
    // 3% instant crash
    if (Math.random() < 0.03) return 1.00;

    // Standard formula: 100 / (100 - rand*96)
    const r = Math.random() * 95;
    let point = 100 / (100 - r);
    point = Math.round(point * 100) / 100;
    return Math.max(1.05, Math.min(100.00, point));
  }

  startWaitingPhase() {
    this.state = 'WAITING';
    this.countdown = 5.0;
    this.multiplier = 1.00;
    this.bets.clear();
    this.crashPoint = this.generateCrashPoint();

    if (this.loopInterval) clearInterval(this.loopInterval);

    const step = 100; // ms
    this.loopInterval = setInterval(() => {
      this.countdown = Math.max(0, Math.round((this.countdown - 0.1) * 10) / 10);
      this.broadcastState();

      if (this.countdown <= 0) {
        clearInterval(this.loopInterval);
        this.startFlyingPhase();
      }
    }, step);
  }

  startFlyingPhase() {
    this.state = 'FLYING';
    this.multiplier = 1.00;
    this.flightStartTime = Date.now();

    if (this.loopInterval) clearInterval(this.loopInterval);

    this.loopInterval = setInterval(() => {
      const elapsedSec = (Date.now() - this.flightStartTime) / 1000;
      // Exponential curve: 1.00 * e^(0.065 * elapsedSec)
      const currentM = Math.round(Math.pow(Math.E, 0.07 * elapsedSec) * 100) / 100;
      this.multiplier = currentM;

      // Check auto cashouts
      this.bets.forEach((bet) => {
        if (!bet.cashedOut && bet.autoCashout && currentM >= bet.autoCashout) {
          this.executeCashout(bet.userId, bet.autoCashout);
        }
      });

      // Check crash condition
      if (this.multiplier >= this.crashPoint) {
        clearInterval(this.loopInterval);
        this.startCrashedPhase();
      } else {
        this.broadcastState();
      }
    }, 60);
  }

  startCrashedPhase() {
    this.state = 'CRASHED';
    this.multiplier = this.crashPoint;

    // Add to recent history
    this.recentHistory.unshift(this.crashPoint);
    if (this.recentHistory.length > 10) this.recentHistory.pop();

    // Record losing bets to DB
    this.bets.forEach((bet) => {
      if (!bet.cashedOut) {
        try {
          this.db.prepare(`
            INSERT INTO bets (user_id, game_type, bet_amount, win_amount, multiplier)
            VALUES (?, 'crash', ?, 0, 0)
          `).run(bet.userId, bet.betAmount);
        } catch (e) {
          console.error('Error recording loss:', e);
        }
      }
    });

    this.broadcastState();

    // Pause 3 seconds before next round
    setTimeout(() => {
      this.startWaitingPhase();
    }, 3000);
  }

  broadcastState() {
    const betsList = Array.from(this.bets.values()).map((b) => ({
      userId: b.userId,
      username: b.username,
      avatar: b.avatar,
      betAmount: b.betAmount,
      cashedOut: b.cashedOut,
      winAmount: b.winAmount,
      multiplier: b.cashedMultiplier || null,
    }));

    this.broadcast({
      type: 'CRASH_TICK',
      state: this.state,
      multiplier: this.multiplier,
      countdown: this.countdown,
      crashPoint: this.state === 'CRASHED' ? this.crashPoint : null,
      bets: betsList,
      history: this.recentHistory,
    });
  }

  placeBet(user, betAmount, autoCashout) {
    if (this.state !== 'WAITING') {
      return { success: false, error: 'Ставки принимаются только до взлета!' };
    }
    if (this.bets.has(user.id)) {
      return { success: false, error: 'Вы уже сделали ставку в этом раунде!' };
    }
    if (user.coins < betAmount) {
      return { success: false, error: 'Недостаточно монет!' };
    }

    // Deduct coins in DB
    this.db.prepare('UPDATE users SET coins = coins - ?, games_played = games_played + 1 WHERE id = ?')
      .run(betAmount, user.id);

    this.bets.set(user.id, {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      betAmount,
      autoCashout: autoCashout ? parseFloat(autoCashout) : null,
      cashedOut: false,
      winAmount: 0,
    });

    this.broadcastState();
    return { success: true };
  }

  executeCashout(userId, specificMultiplier = null) {
    if (this.state !== 'FLYING') {
      return { success: false, error: 'Нельзя забрать сейчас!' };
    }
    const bet = this.bets.get(userId);
    if (!bet || bet.cashedOut) {
      return { success: false, error: 'Ставка не найдена или уже обналичена!' };
    }

    const mult = specificMultiplier || this.multiplier;
    const winAmount = Math.floor(bet.betAmount * mult);

    bet.cashedOut = true;
    bet.winAmount = winAmount;
    bet.cashedMultiplier = mult;

    // Update DB
    try {
      this.db.prepare(`
        UPDATE users 
        SET coins = coins + ?, 
            xp = xp + ?, 
            biggest_win = MAX(biggest_win, ?)
        WHERE id = ?
      `).run(winAmount, Math.floor(bet.betAmount / 2), winAmount, userId);

      this.db.prepare(`
        INSERT INTO bets (user_id, game_type, bet_amount, win_amount, multiplier)
        VALUES (?, 'crash', ?, ?, ?)
      `).run(userId, bet.betAmount, winAmount, mult);
    } catch (e) {
      console.error('Error updating cashout in DB:', e);
    }

    this.broadcastState();
    return { success: true, winAmount, multiplier: mult };
  }

  getSnapshot() {
    return {
      state: this.state,
      multiplier: this.multiplier,
      countdown: this.countdown,
      crashPoint: this.state === 'CRASHED' ? this.crashPoint : null,
      bets: Array.from(this.bets.values()),
      history: this.recentHistory,
    };
  }
}

module.exports = CrashEngine;
