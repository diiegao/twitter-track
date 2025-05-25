
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

const profiles = JSON.parse(fs.readFileSync('profiles.json', 'utf8'));
const LAST_TWEETS_FILE = 'lastTweets.json';
const LAST_FOLLOWS_FILE = 'lastFollows.json';
const COOKIES_FILE = 'cookies.json';

let lastTweets = fs.existsSync(LAST_TWEETS_FILE)
  ? JSON.parse(fs.readFileSync(LAST_TWEETS_FILE, 'utf8'))
  : {};

let lastFollows = fs.existsSync(LAST_FOLLOWS_FILE)
  ? JSON.parse(fs.readFileSync(LAST_FOLLOWS_FILE, 'utf8'))
  : {};

function randomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function batchArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function scrapeTweets(page, username) {
  try {
    await page.goto(`https://twitter.com/${username}`, { waitUntil: 'networkidle2' });

    const tweets = await page.$$eval('article', articles => {
      return articles.slice(0, 5).map(article => {
        const text = article.querySelector('div[data-testid="tweetText"]')?.innerText || null;
        const isReply = article.innerHTML.includes('data-testid="reply"');
        const timestampEl = article.querySelector('time');
        const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : new Date().toISOString();
        return { text, isReply, timestamp };
      });
    });

    return tweets;
  } catch (err) {
    console.error(`[tweet] Erro em @${username}:`, err.message);
    return [];
  }
}

async function scrapeFollowing(page, username) {
  try {
    await page.goto(`https://twitter.com/${username}/following`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div[dir="ltr"] > span');

    const following = await page.$$eval('div[dir="ltr"] > span', spans => {
      const handles = spans
        .map(span => span.innerText)
        .filter(t => t.startsWith('@'))
        .map(t => t.replace('@', '').trim());
      return [...new Set(handles)];
    });

    return following;
  } catch (err) {
    console.error(`[follow] Erro em @${username}:`, err.message);
    return [];
  }
}

async function processBatch(batch, browser) {
  const page = await browser.newPage();

  if (fs.existsSync(COOKIES_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    await page.setCookie(...cookies);
  }

  for (const username of batch) {
    console.log(`🔍 Verificando @${username}`);

    const tweets = await scrapeTweets(page, username);

    for (const tweet of tweets) {
      if (!tweet.text) continue;

      const hash = tweet.text.slice(0, 100);
      const saved = lastTweets[username]?.[hash];

      if (!saved) {
        const type = tweet.isReply ? '🗨️ Resposta' : '🕊️ Tweet';
        const message = `${type} de @${username} às ${tweet.timestamp}:

${tweet.text}
https://twitter.com/${username}`;
        await bot.sendMessage(chatId, message);

        lastTweets[username] = {
          ...(lastTweets[username] || {}),
          [hash]: tweet.timestamp,
        };
        fs.writeFileSync(LAST_TWEETS_FILE, JSON.stringify(lastTweets, null, 2));
      }
    }

    const currentFollowing = await scrapeFollowing(page, username);
    const previousFollowing = lastFollows[username] || [];

    const newFollows = currentFollowing.filter(u => !previousFollowing.includes(u));
    const unfollows = previousFollowing.filter(u => !currentFollowing.includes(u));

    for (const follow of newFollows) {
      const msg = `🔔 @${username} **seguiu** @${follow} às ${new Date().toISOString()}`;
      await bot.sendMessage(chatId, msg);
    }

    for (const unfollow of unfollows) {
      const msg = `🚫 @${username} **deixou de seguir** @${unfollow} às ${new Date().toISOString()}`;
      await bot.sendMessage(chatId, msg);
    }

    lastFollows[username] = currentFollowing;
    fs.writeFileSync(LAST_FOLLOWS_FILE, JSON.stringify(lastFollows, null, 2));

    const delay = randomInterval(4000, 8000);
    console.log(`⏳ Aguardando ${delay / 1000}s...`);
    await new Promise(res => setTimeout(res, delay));
  }

  await page.close();
}

async function monitor() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const batches = batchArray(profiles, 10);

  for (const batch of batches) {
    await processBatch(batch, browser);

    const delay = randomInterval(40000, 70000);
    console.log(`🛑 Esperando ${delay / 1000}s antes do próximo batch...`);
    await new Promise(res => setTimeout(res, delay));
  }

  await browser.close();
  const restart = randomInterval(60000, 120000);
  console.log(`🔁 Ciclo completo. Reiniciando em ${restart / 1000}s...`);
  setTimeout(monitor, restart);
}

monitor();
