const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = require('./db');
const CrashEngine = require('./crashEngine');

const PORT = 42;
const JWT_SECRET = 'kirillgames_super_secret_jwt_2026';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' })); // Support base64 image avatar uploads

// Auth Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Generate JWT helper
function createToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'KirillGames Server', time: Date.now() });
});

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.trim().length < 2) {
    return res.status(400).json({ error: 'Имя пользователя должно быть не менее 2 символов!' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Пользователь с таким именем уже существует!' });
  }

  const password_hash = bcrypt.hashSync(password, 8);
  const info = db.prepare(`
    INSERT INTO users (username, password_hash, avatar, coins, level, xp, xp_to_next)
    VALUES (?, ?, '🦊', 1000, 1, 0, 100)
  `).run(username.trim(), password_hash);

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = createToken(newUser);
  res.json({ token, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите никнейм и пароль!' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !user.password_hash) {
    return res.status(400).json({ error: 'Неверный никнейм или пароль!' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(400).json({ error: 'Неверный никнейм или пароль!' });
  }

  const token = createToken(user);
  res.json({ token, user });
});

// Quick Guest Entry
app.post('/api/auth/guest', (req, res) => {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const username = `Гость_${randNum}`;
  const avatars = ['🦊', '🐼', '🦁', '🐸', '🦄', '🐯'];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];

  const info = db.prepare(`
    INSERT INTO users (username, password_hash, avatar, coins, level, xp, xp_to_next)
    VALUES (?, NULL, ?, 1000, 1, 0, 100)
  `).run(username, avatar);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = createToken(user);
  res.json({ token, user });
});

// OAuth Stubs for Discord & Google
app.get('/api/auth/oauth/google', (req, res) => {
  res.json({
    status: 'configured_stub',
    message: 'Google OAuth готов к привязке CLIENT_ID / SECRET. Укажите ваши ключи в server/.env.',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=PLACEHOLDER'
  });
});

app.get('/api/auth/oauth/discord', (req, res) => {
  res.json({
    status: 'configured_stub',
    message: 'Discord OAuth готов к привязке CLIENT_ID / SECRET. Укажите ваши ключи в server/.env.',
    authUrl: 'https://discord.com/api/oauth2/authorize?client_id=PLACEHOLDER'
  });
});

// --- Profile Routes ---
app.get('/api/profile/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/profile/update', authenticate, (req, res) => {
  const { username, avatar } = req.body;
  const updates = [];
  const params = [];

  if (username && username.trim().length >= 2) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Это имя уже занято другим игроком!' });
    }
    updates.push('username = ?');
    params.push(username.trim());
  }

  if (avatar) {
    updates.push('avatar = ?');
    params.push(avatar);
  }

  if (updates.length > 0) {
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updatedUser });
});

// Public profile of any user (by ID)
app.get('/api/profile/:id', (req, res) => {
  const userId = req.params.id;
  const user = db.prepare(`
    SELECT id, username, avatar, coins, level, xp, xp_to_next, biggest_win, time_spent_seconds, games_played, created_at
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user });
});

// Heartbeat / Time-spent tracker (called every 30s by active client)
app.post('/api/profile/heartbeat', authenticate, (req, res) => {
  db.prepare('UPDATE users SET time_spent_seconds = time_spent_seconds + 30 WHERE id = ?')
    .run(req.user.id);
  res.json({ status: 'ok' });
});

// --- Leaderboard ---
app.get('/api/leaderboard', (req, res) => {
  const topCoins = db.prepare(`
    SELECT id, username, avatar, coins, level, biggest_win, time_spent_seconds
    FROM users
    ORDER BY coins DESC
    LIMIT 25
  `).all();

  const topWinners = db.prepare(`
    SELECT id, username, avatar, coins, level, biggest_win, time_spent_seconds
    FROM users
    ORDER BY biggest_win DESC
    LIMIT 10
  `).all();

  res.json({ topCoins, topWinners });
});

// --- Economy & Bonuses ---
app.post('/api/economy/bonus', authenticate, (req, res) => {
  const now = Date.now();
  const elapsed = now - (req.user.last_bonus_time || 0);
  if (elapsed < 60000) { // 60s cooldown
    return res.status(400).json({ error: 'Сундук еще перезаряжается!' });
  }

  const reward = Math.floor(300 + Math.random() * 600);
  db.prepare('UPDATE users SET coins = coins + ?, last_bonus_time = ? WHERE id = ?')
    .run(reward, now, req.user.id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ reward, user: updatedUser });
});

app.post('/api/economy/faucet', authenticate, (req, res) => {
  if (req.user.coins >= 50) {
    return res.status(400).json({ error: 'У вас еще достаточно монет!' });
  }

  const grant = 1000;
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(grant, req.user.id);
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ grant, user: updatedUser });
});

// Record outcome for local games (Slots, Blackjack, Poker, Towers, Mines)
app.post('/api/games/record', authenticate, (req, res) => {
  const { gameType, betAmount, winAmount, multiplier } = req.body;
  if (!gameType || betAmount === undefined || winAmount === undefined) {
    return res.status(400).json({ error: 'Missing game payload' });
  }

  // Calculate net coin change
  const netCoins = winAmount - betAmount;
  const earnedXP = Math.max(5, Math.floor(betAmount / 2));

  let newXP = req.user.xp + earnedXP;
  let newLevel = req.user.level;
  let newReq = req.user.xp_to_next;

  while (newXP >= newReq) {
    newXP -= newReq;
    newLevel += 1;
    newReq = Math.floor(newReq * 1.5);
  }

  db.prepare(`
    UPDATE users 
    SET coins = MAX(0, coins + ?),
        games_played = games_played + 1,
        biggest_win = MAX(biggest_win, ?),
        xp = ?,
        level = ?,
        xp_to_next = ?
    WHERE id = ?
  `).run(netCoins, winAmount, newXP, newLevel, newReq, req.user.id);

  db.prepare(`
    INSERT INTO bets (user_id, game_type, bet_amount, win_amount, multiplier)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, gameType, betAmount, winAmount, multiplier || 0);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updatedUser });
});

// --- HTTP Server & WebSockets ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const crashEngine = new CrashEngine(db);
crashEngine.init(wss);

// WebSocket connection handling
wss.on('connection', (ws) => {
  let wsUser = null;

  // Send initial snapshot
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    crash: crashEngine.getSnapshot(),
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'AUTH') {
        const decoded = jwt.verify(data.token, JWT_SECRET);
        wsUser = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
        ws.send(JSON.stringify({ type: 'AUTH_OK', user: wsUser }));
      }

      if (data.type === 'PLACE_CRASH_BET') {
        if (!wsUser) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Требуется авторизация!' }));
        // Refresh fresh user balance
        const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(wsUser.id);
        const res = crashEngine.placeBet(freshUser, data.betAmount, data.autoCashout);
        if (!res.success) {
          ws.send(JSON.stringify({ type: 'ERROR', message: res.error }));
        }
      }

      if (data.type === 'CRASH_CASHOUT') {
        if (!wsUser) return;
        const res = crashEngine.executeCashout(wsUser.id);
        if (!res.success) {
          ws.send(JSON.stringify({ type: 'ERROR', message: res.error }));
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KirillGames backend server running on http://0.0.0.0:${PORT}`);
});
