const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'kirillgames.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar TEXT DEFAULT '🦊',
    coins INTEGER DEFAULT 1000,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_to_next INTEGER DEFAULT 100,
    biggest_win INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    last_bonus_time INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_type TEXT NOT NULL,
    bet_amount INTEGER NOT NULL,
    win_amount INTEGER NOT NULL,
    multiplier REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed some fun competitive players if leaderboard is empty
const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (count === 0) {
  const seedUsers = [
    { username: '👑 Король Азарта', avatar: '🦁', coins: 540200, level: 18, biggest_win: 150000, time_spent_seconds: 14200 },
    { username: '🚀 Ракета_777', avatar: '🦄', coins: 310500, level: 14, biggest_win: 85000, time_spent_seconds: 9800 },
    { username: '💎 GemHunter', avatar: '🐼', coins: 185000, level: 9, biggest_win: 42000, time_spent_seconds: 6400 },
    { username: '🍀 Везучий Боб', avatar: '🐸', coins: 95400, level: 6, biggest_win: 18000, time_spent_seconds: 4100 },
    { username: '🐱 Кот в Сапогах', avatar: '🐱', coins: 42300, level: 4, biggest_win: 10000, time_spent_seconds: 2800 },
  ];

  const dummyPass = bcrypt.hashSync('dummy123', 8);
  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, avatar, coins, level, biggest_win, time_spent_seconds)
    VALUES (@username, '${dummyPass}', @avatar, @coins, @level, @biggest_win, @time_spent_seconds)
  `);

  for (const u of seedUsers) {
    insert.run(u);
  }
}

module.exports = db;
