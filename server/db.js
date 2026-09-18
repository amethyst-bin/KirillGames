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

module.exports = db;

