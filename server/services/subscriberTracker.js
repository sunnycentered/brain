/**
 * subscriberTracker.js
 * Tracks daily Telegram subscriber counts and churn for the Digital Nomad Tech Stack channel.
 * Writes per-day snapshots to docs/income-channel/analytics/daily-subscribers/
 */

const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const axios = require('axios');

const SUBSCRIBERS_DIR = path.resolve(
  __dirname,
  '..', '..', 'docs', 'income-channel', 'analytics', 'daily-subscribers'
);

// Ensure directory exists
if (!fs.existsSync(SUBSCRIBERS_DIR)) {
  fs.mkdirSync(SUBSCRIBERS_DIR, { recursive: true });
}

/**
 * Fetch current subscriber count from Telegram Bot API.
 * @param {Telegraf|Object} bot - Telegraf instance or object with bot.token
 * @returns {Promise<number>} Current subscriber count
 */
async function getSubscriberCount(bot) {
  const token = bot?.bot?.token || bot?.token;
  if (!token) throw new Error('Bot token required for getSubscriberCount');

  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!chatId) throw new Error('TELEGRAM_CHANNEL_ID env var is required');

  const response = await axios.get(
    `https://api.telegram.org/bot${token}/getChatMemberCount`,
    { params: { chat_id: chatId } }
  );

  return response.data.result;
}

/**
 * Get daily subscriber growth data for the last N days.
 * Reads/writes one JSON file per day in docs/income-channel/analytics/daily-subscribers/
 * Format: docs/income-channel/analytics/daily-subscribers/YYYY-MM-DD.json
 * @param {Telegraf|Object} bot
 * @param {number} [days=30] How many days of history to return
 * @returns {Promise<Array<{date: string, subscribers: number, delta: number|null}>>}
 */
async function getDailyGrowth(bot, days = 30) {
  const today = new Date();
  const records = [];

  // Fetch or create today's snapshot first
  await _saveSnapshot(today, bot);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
    const filepath = path.join(SUBSCRIBERS_DIR, filename);

    let snapshot;
    if (fs.existsSync(filepath)) {
      snapshot = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } else {
      // Fetch from Telegram API for historical dates is not possible.
      // Return null delta for dates without data.
      snapshot = { date: filename.replace('.json', ''), subscribers: null };
    }

    records.push({
      date: snapshot.date,
      subscribers: snapshot.subscribers ?? null,
      delta: null,
    });
  }

  // Compute deltas (new - prev) in chronological order
  for (let i = records.length - 2; i >= 0; i--) {
    if (records[i + 1].subscribers != null && records[i].subscribers != null) {
      records[i].delta = records[i + 1].subscribers - records[i].subscribers;
    }
  }

  // Reverse so newest-first for charting convenience
  records.reverse();
  return records;
}

/**
 * Save a daily snapshot to disk.
 * @private
 */
async function _saveSnapshot(date, bot) {
  const filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
  const filepath = path.join(SUBSCRIBERS_DIR, filename);

  // Avoid re-sampling same day if snapshot already exists
  if (fs.existsSync(filepath)) {
    const existing = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (existing.date === filename.replace('.json', '')) return existing;
  }

  const count = await getSubscriberCount(bot);
  const snapshot = { date: filename.replace('.json', ''), subscribers: count, fetchedAt: new Date().toISOString() };
  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

/**
 * Calculate the churn rate over a given period.
 * Churn = (start - end) / start * 100, where delta < 0 only counts as "lost".
 * @param {Telegraf|Object} bot
 * @param {number} [days=30]
 * @returns {Promise<number>} Churn rate percentage (0–100)
 */
async function getChurnRate(bot, days = 30) {
  const growthData = await getDailyGrowth(bot, days);

  // Need at least two data points
  const valid = growthData.filter(r => r.subscribers != null);
  if (valid.length < 2) return 0;

  const start = valid[valid.length - 1].subscribers; // oldest
  const end = valid[0].subscribers;                  // newest

  if (start === 0) return 0;

  // Count actual losses (days where delta < 0)
  let totalLoss = 0;
  for (const record of growthData) {
    if (record.delta !== null && record.delta < 0) {
      totalLoss += Math.abs(record.delta);
    }
  }

  // Churn rate: proportional to total loss relative to starting count
  return Number(((totalLoss / start) * 100).toFixed(2));
}

/**
 * Record a subscriber change event (e.g., from Telegram bot updates).
 * @param {number} delta - +n for gain, -n for loss
 * @param {string} [reason] - e.g., 'bot-update', 'manual'
 */
function recordChange(delta, reason = 'manual') {
  const today = new Date();
  const filename = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.json`;
  const filepath = path.join(SUBSCRIBERS_DIR, filename);

  let snapshot;
  if (fs.existsSync(filepath)) {
    snapshot = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } else {
    snapshot = { date: filename.replace('.json', ''), subscribers: null, events: [] };
  }

  if (!snapshot.events) snapshot.events = [];
  snapshot.events.push({ delta, reason, timestamp: new Date().toISOString() });

  // If we have a live subscriber count, apply delta
  if (snapshot.subscribers !== null) {
    snapshot.subscribers += delta;
  }

  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

module.exports = {
  getSubscriberCount,
  getDailyGrowth,
  getChurnRate,
  recordChange,
};
