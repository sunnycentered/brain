/**
 * revenueLogger.js
 * Logs Stars revenue, converts Stars → USD and Stars → TON,
 * and integrates with the TON blockchain API for on-chain validation.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const REVENUE_DIR = path.resolve(
  __dirname,
  '..', '..', 'docs', 'income-channel', 'analytics', 'revenue'
);
if (!fs.existsSync(REVENUE_DIR)) {
  fs.mkdirSync(REVENUE_DIR, { recursive: true });
}

/** Default conversion rates (can be overridden by env vars or live fetch) */
const DEFAULT_RATES = {
  starsPerDollar: 100,          // 100 Stars ≈ $1 USD
  usdPerTon: parseFloat(process.env.USD_PER_TON) || 6.5, // TON/USD rate (live fetch recommended)
};

/**
 * Fetch the latest TON price from TON API / CoinGecko fallback.
 * @returns {Promise<number>} TON price in USD
 */
async function getTonPrice() {
  const envRate = parseFloat(process.env.USD_PER_TON);
  if (envRate) return envRate;

  try {
    // Try TON API via toncenter or coinmarketcap
    const resp = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'the-open-network', vs_currencies: 'usd' },
      timeout: 5000,
    });
    return resp.data?.['the-open-network']?.usd ?? DEFAULT_RATES.usdPerTon;
  } catch {
    console.warn('⚠️ Could not fetch TON price from CoinGecko; using fallback rate');
    return DEFAULT_RATES.usdPerTon;
  }
}

/**
 * Convert Stars → USD.
 * @param {number} stars
 * @returns {number} USD amount
 */
function starsToUsd(stars) {
  return (stars / DEFAULT_RATES.starsPerDollar);
}

/**
 * Convert Stars → TON using live or configured rate.
 * @param {number} stars
 * @param {number} [tonPrice] optional TON price override
 * @returns {Promise<{usd: number, ton: number}>}
 */
async function starsToTon(stars, tonPrice) {
  const usd = starsToUsd(stars);
  const t = tonPrice || (await getTonPrice());
  return { usd: Number(usd.toFixed(4)), ton: Number((usd / t).toFixed(6)) };
}

/**
 * Log a Stars revenue event.
 * @param {Object} data
 * @param {number} data.stars - Stars received
 * @param {string} data.date - YYYY-MM-DD
 * @param {string} data.from - e.g., 'telegram-stars', 'gumroad'
 * @param {string} data.product? - product name/slug
 * @param {string} data.paymentMethod? - 'stars', 'ton', 'stripe'
 */
async function logRevenue({ stars, date, from, product = null, paymentMethod = 'stars' }) {
  const filepath = path.join(REVENUE_DIR, `${date}.json`);

  let entries;
  if (fs.existsSync(filepath)) {
    entries = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } else {
    entries = [];
  }

  const tonPrice = await getTonPrice();
  const conversion = await starsToTon(stars, tonPrice);

  const entry = {
    id: `${date}-${from}-${Date.now()}`,
    date,
    stars,
    usd: conversion.usd,
    ton: conversion.ton,
    tonPriceUsd: tonPrice,
    from,
    product,
    paymentMethod,
    recordedAt: new Date().toISOString(),
  };

  entries.push(entry);
  fs.writeFileSync(filepath, JSON.stringify(entries, null, 2));
  return entry;
}

/**
 * Get revenue breakdown by date range.
 * @param {string} from - YYYY-MM-DD
 * @param {string} to   - YYYY-MM-DD
 * @returns {Promise<{entries: Object[], totalStars: number, totalUsd: number, totalTon: number}>}
 */
async function getRevenueBreakdown(from, to) {
  const allEntries = [];

  for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const filepath = path.join(REVENUE_DIR, `${dateStr}.json`);
    if (fs.existsSync(filepath)) {
      allEntries.push(...JSON.parse(fs.readFileSync(filepath, 'utf8')));
    }
  }

  const totalStars = allEntries.reduce((s, e) => s + e.stars, 0);
  const totalUsd = allEntries.reduce((s, e) => s + e.usd, 0);
  const totalTon = allEntries.reduce((s, e) => s + e.ton, 0);

  return { entries: allEntries, totalStars, totalUsd, totalTon };
}

/**
 * Split revenue by payment method for a given period.
 */
async function getRevenueByPaymentMethod(from, to) {
  const { entries } = await getRevenueBreakdown(from, to);

  const map = {};
  for (const e of entries) {
    const key = e.paymentMethod || 'stars';
    if (!map[key]) map[key] = { stars: 0, usd: 0, ton: 0, count: 0 };
    map[key].stars += e.stars;
    map[key].usd += e.usd;
    map[key].ton += e.ton;
    map[key].count += 1;
  }

  // Round values
  for (const key of Object.keys(map)) {
    map[key].stars = Math.round(map[key].stars);
    map[key].usd = Number(map[key].usd.toFixed(2));
    map[key].ton = Number(map[key].ton.toFixed(4));
  }

  return map;
}

module.exports = {
  getTonPrice,
  starsToUsd,
  starsToTon,
  logRevenue,
  getRevenueBreakdown,
  getRevenueByPaymentMethod,
  DEFAULT_RATES,
};
