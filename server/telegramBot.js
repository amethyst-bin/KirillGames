const https = require('https');
const db = require('./db');

const BOT_TOKEN = '8835644217:AAHDpJMEUd966lSxB2yDMnzJaXeD-AKW_n4';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper: Format Coins with 100M+ rule
function formatCoins(coins) {
  if (coins === null || coins === undefined || isNaN(coins)) return '0';
  const val = Math.floor(coins);
  const abs = Math.abs(val);

  if (abs < 100_000_000) {
    return val.toLocaleString('ru-RU');
  }
  if (abs < 1_000_000_000) {
    const num = val / 1_000_000;
    return (num % 1 === 0 ? num.toFixed(0) : num.toFixed(1).replace(/\.0$/, '')) + 'M';
  }
  if (abs < 1_000_000_000_000) {
    const num = val / 1_000_000_000;
    return (num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, '')) + 'B';
  }
  if (abs < 1_000_000_000_000_000) {
    const num = val / 1_000_000_000_000;
    return (num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, '')) + 'T';
  }
  const num = val / 1_000_000_000_000_000;
  return (num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, '')) + 'Q';
}

function formatTimeSpent(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0} сек.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин.`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} ч. ${remMinutes} мин.`;
}

function apiRequest(method, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(`${TELEGRAM_API}/${method}`);

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 45000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: '💰 Мой баланс' }, { text: '🏆 Топ игроков' }],
    [{ text: '🎰 О казино' }, { text: '🔗 Привязать аккаунт' }]
  ],
  resize_keyboard: true,
};

async function sendMessage(chatId, text, extra = {}) {
  try {
    return await apiRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: MAIN_KEYBOARD,
      ...extra,
    });
  } catch (err) {
    console.error('Failed to send message:', err.message);
  }
}

async function handleStart(chatId, from, payload) {
  const telegramId = from.id.toString();
  const tgUser = from.username ? `@${from.username}` : from.first_name || 'Игрок';

  if (payload && payload.trim().length === 6) {
    const linkResult = linkAccountByCode(chatId, telegramId, tgUser, payload.trim());
    if (linkResult) return;
  }

  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

  if (user) {
    await sendMessage(
      chatId,
      `👋 Привет, <b>${user.username}</b>! Добро пожаловать в официальный бот <b>KirillGames</b>!\n\n` +
      `Ваш аккаунт успешно привязан.\n` +
      `💰 Текущий баланс: <b>${formatCoins(user.coins)} 🪙</b>\n` +
      `⭐ Уровень: <b>${user.level}</b>\n\n` +
      `Используйте кнопки меню ниже:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Мой баланс', callback_data: 'my_balance' }, { text: '🏆 Топ игроков', callback_data: 'top_players' }],
            [{ text: '📥 Скачать APK (v1.1.13)', url: 'https://github.com/amethyst-bin/KirillGames/releases/latest' }]
          ]
        }
      }
    );
  } else {
    await sendMessage(
      chatId,
      `👋 Привет, <b>${tgUser}</b>! Добро пожаловать в официальный бот <b>KirillGames</b> 🎰\n\n` +
      `Здесь вы можете в реальном времени следить за балансом монет и топом игроков.\n\n` +
      `⚠️ <b>Ваш Telegram пока не привязан к аккаунту!</b>\n` +
      `Чтобы привязать:\n` +
      `1. Откройте приложение <b>KirillGames</b>\n` +
      `2. Перейдите во вкладку <b>Профиль</b> ➔ <b>Telegram</b>\n` +
      `3. Нажмите кнопку <b>«Получить код»</b> и отправьте его боту командой:\n` +
      `<code>/link ВАШ_КОД</code>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏆 Посмотреть ТОП игроков', callback_data: 'top_players' }],
            [{ text: '📥 Скачать APK (v1.1.13)', url: 'https://github.com/amethyst-bin/KirillGames/releases/latest' }]
          ]
        }
      }
    );
  }
}

function linkAccountByCode(chatId, telegramId, tgUser, code) {
  const user = db.prepare(`
    SELECT * FROM users 
    WHERE telegram_link_code = ? AND telegram_link_code_expires > ?
  `).get(code, Date.now());

  if (!user) {
    sendMessage(
      chatId,
      `❌ <b>Неверный или просроченный код привязки!</b>\n\n` +
      `Откройте приложение KirillGames ➔ Профиль ➔ Нажмите «Получить код» и попробуйте снова.`
    );
    return false;
  }

  db.prepare(`
    UPDATE users 
    SET telegram_id = ?, telegram_username = ?, telegram_link_code = NULL, telegram_link_code_expires = NULL 
    WHERE id = ?
  `).run(telegramId, tgUser, user.id);

  const rankRow = db.prepare('SELECT COUNT(*) as rank FROM users WHERE coins > ?').get(user.coins);
  const rank = (rankRow ? rankRow.rank : 0) + 1;

  sendMessage(
    chatId,
    `🎉 <b>Аккаунт успешно привязан!</b>\n\n` +
    `👤 Игрок: <b>${user.username}</b> (${user.avatar})\n` +
    `⭐ Уровень: <b>${user.level}</b>\n` +
    `💰 Баланс: <b>${formatCoins(user.coins)} 🪙</b>\n` +
    `📊 Место в топе: <b>#${rank}</b>\n\n` +
    `Теперь вы всегда можете проверить свой баланс и топы по кнопкам ниже!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💰 Проверить баланс', callback_data: 'my_balance' }, { text: '🏆 Топ игроков', callback_data: 'top_players' }]
        ]
      }
    }
  );
  return true;
}

async function handleBalance(chatId, from) {
  const telegramId = from.id.toString();
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

  if (!user) {
    await sendMessage(
      chatId,
      `⚠️ <b>Вы еще не привязали аккаунт KirillGames!</b>\n\n` +
      `Для привязки зайдите в приложение в <b>Профиль</b>, нажмите <b>«Привязать Telegram»</b> и отправьте код сюда командой:\n` +
      `<code>/link 123456</code>`
    );
    return;
  }

  const rankRow = db.prepare('SELECT COUNT(*) as rank FROM users WHERE coins > ?').get(user.coins);
  const rank = (rankRow ? rankRow.rank : 0) + 1;

  await sendMessage(
    chatId,
    `🎰 <b>ВАШ ПРОФИЛЬ В KIRILLGAMES:</b>\n\n` +
    `👤 Никнейм: <b>${user.username}</b> (${user.avatar})\n` +
    `⭐ Уровень: <b>${user.level}</b> (XP: ${user.xp}/${user.level * 100})\n` +
    `💰 Баланс: <b>${formatCoins(user.coins)} 🪙</b>\n` +
    `🏆 Макс. выигрыш: <b>+${formatCoins(user.biggest_win)} 🪙</b>\n` +
    `🎮 Сыграно игр: <b>${user.games_played || 0}</b>\n` +
    `⏱ Время в игре: <b>${formatTimeSpent(user.time_spent_seconds)}</b>\n` +
    `📊 Место в топе: <b>#${rank}</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏆 Топ игроков', callback_data: 'top_players' }],
          [{ text: '🔄 Обновить баланс', callback_data: 'my_balance' }]
        ]
      }
    }
  );
}

async function handleTop(chatId) {
  const topCoins = db.prepare(`
    SELECT username, coins, level, avatar 
    FROM users 
    ORDER BY coins DESC 
    LIMIT 10
  `).all();

  let text = `🏆 <b>ТОП-10 ИГРОКОВ ПО БАЛАНСУ:</b>\n\n`;
  topCoins.forEach((p, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    text += `${medal} <b>${p.username}</b> — <code>${formatCoins(p.coins)} 🪙</code> (Ур. ${p.level})\n`;
  });

  const topWinners = db.prepare(`
    SELECT username, biggest_win, avatar 
    FROM users 
    WHERE biggest_win > 0
    ORDER BY biggest_win DESC 
    LIMIT 5
  `).all();

  if (topWinners.length > 0) {
    text += `\n💥 <b>ТОП-5 РЕКОРДНЫХ КУШЕЙ:</b>\n`;
    topWinners.forEach((p, idx) => {
      text += `${idx + 1}. <b>${p.username}</b> — <code>+${formatCoins(p.biggest_win)} 🪙</code>\n`;
    });
  }

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💰 Мой баланс', callback_data: 'my_balance' }],
        [{ text: '🔄 Обновить ТОП', callback_data: 'top_players' }]
      ]
    }
  });
}

let lastUpdateId = 0;

async function pollUpdates() {
  while (true) {
    try {
      const res = await apiRequest('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 30,
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id;

          if (update.message) {
            const msg = update.message;
            const chatId = msg.chat.id;
            const text = msg.text ? msg.text.trim() : '';
            const from = msg.from;

            if (text.startsWith('/start')) {
              const parts = text.split(' ');
              const payload = parts.length > 1 ? parts[1] : null;
              await handleStart(chatId, from, payload);
            } else if (text === '💰 Мой баланс' || text === '/balance') {
              await handleBalance(chatId, from);
            } else if (text === '🏆 Топ игроков' || text === '/top') {
              await handleTop(chatId);
            } else if (text.startsWith('/link')) {
              const parts = text.split(' ');
              if (parts.length > 1) {
                linkAccountByCode(chatId, from.id.toString(), from.username ? `@${from.username}` : from.first_name, parts[1].trim());
              } else {
                await sendMessage(chatId, 'ℹ️ Использование: <code>/link ВАШ_КОД</code>\n\nКод можно получить в приложении во вкладке <b>Профиль</b>.');
              }
            } else if (text === '/unlink') {
              db.prepare('UPDATE users SET telegram_id = NULL, telegram_username = NULL WHERE telegram_id = ?').run(from.id.toString());
              await sendMessage(chatId, '✅ Ваш Telegram успешно отвязан от аккаунта KirillGames.');
            } else if (text === '🎰 О казино' || text === '/help') {
              await sendMessage(
                chatId,
                `🎰 <b>KirillGames</b> — премиум казуальное казино для Android!\n\n` +
                `🎮 17 азартных игр (Слоты, Crash, Блэкджек, Колесо Фортуны, Покер, Дракон и Тигр, Баккара, Мины, Плинко и др.)\n` +
                `🎁 Ежедневные бонусы и сундуки наград\n` +
                `📊 Честный онлайн лидерборд\n\n` +
                `Команды бота:\n` +
                `/balance — узнать свой баланс\n` +
                `/top — таблица лидеров\n` +
                `/link КОД — привязать аккаунт\n` +
                `/unlink — отвязать аккаунт`
              );
            } else if (/^\d{6}$/.test(text)) {
              linkAccountByCode(chatId, from.id.toString(), from.username ? `@${from.username}` : from.first_name, text);
            } else {
              await sendMessage(
                chatId,
                `🤖 Команда не распознана. Используйте кнопки меню или команды /balance и /top.`
              );
            }
          }

          if (update.callback_query) {
            const cq = update.callback_query;
            const data = cq.data;
            const chatId = cq.message.chat.id;
            const from = cq.from;

            apiRequest('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});

            if (data === 'my_balance') {
              await handleBalance(chatId, from);
            } else if (data === 'top_players') {
              await handleTop(chatId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

console.log('🤖 KirillGames Telegram Bot started with polling!');
pollUpdates();
