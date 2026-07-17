const fs = require('fs');
const path = require('path');

// Analytics data directory — stores JSON logs for Gumroad product page
const DATA_DIR = path.join(__dirname, '..', 'analytics', 'starter-pack');

/**
 * Ensure the analytics data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Log an analytics event to a JSON file.
 * @param {Object} event - Event object with type, metadata, and timestamp
 */
function logEvent(event) {
  ensureDir();
  const filePath = path.join(DATA_DIR, 'events.jsonl');
  const line = JSON.stringify({ ...event, ts: new Date().toISOString() }) + '\n';
  fs.appendFileSync(filePath, line);
  return true;
}

/* ============================================================
   Product Page Views & Unique Visitors
   ============================================================ */

/**
 * Track Gumroad product page views and unique visitors.
 * In production, this would receive webhook events from Gumroad or
 * integrate with their API / Google Analytics.
 * @param {number} pageViews - Total page views in the period
 * @param {number} uniqueVisitors - Unique visitors in the period
 */
async function trackPageViews(pageViews, uniqueVisitors) {
  logEvent({
    type: 'product_page_views',
    pageViews,
    uniqueVisitors,
    product: 'nomad-starter-pack',
  });

  // Also track daily snapshot
  const dateKey = new Date().toISOString().split('T')[0];
  const summaryFile = path.join(DATA_DIR, 'daily-summary.json');
  let summaries = {};
  if (fs.existsSync(summaryFile)) {
    try { summaries = JSON.parse(fs.readFileSync(summaryFile, 'utf-8')); } catch (_) { summaries = {}; }
  }
  if (!summaries[dateKey]) {
    summaries[dateKey] = { pageViews: 0, uniqueVisitors: 0, purchases: 0, refunds: 0 };
  }
  summaries[dateKey].pageViews += pageViews;
  summaries[dateKey].uniqueVisitors += uniqueVisitors;
  fs.writeFileSync(summaryFile, JSON.stringify(summaries, null, 2));

  return { date: dateKey, pageViews, uniqueVisitors };
}

/* ============================================================
   Conversion Tracking (Visitor → Buyer)
   ============================================================ */

/**
 * Track a purchase/conversion event.
 * @param {Object} data - Purchase details
 * @param {string} data.tier - Tier name: basic | premium | bundle
 * @param {number} data.amount - Amount in USD
 * @param {string} data.productId - Product identifier (default: 'nomad-starter-pack')
 * @returns {Object} Confirmation object
 */
async function trackConversion({ tier, amount, productId = 'nomad-starter-pack' } = {}) {
  const event = {
    type: 'purchase_conversion',
    product: productId,
    tier,
    amount,
  };
  logEvent(event);

  // Track revenue by tier
  const revenueFile = path.join(DATA_DIR, 'tier-revenue.json');
  let tierData = {};
  if (fs.existsSync(revenueFile)) {
    try { tierData = JSON.parse(fs.readFileSync(revenueFile, 'utf-8')); } catch (_) { tierData = {}; }
  }
  if (!tierData[tier]) {
    tierData[tier] = { count: 0, totalRevenue: 0 };
  }
  tierData[tier].count += 1;
  tierData[tier].totalRevenue += amount;
  fs.writeFileSync(revenueFile, JSON.stringify(tierData, null, 2));

  // Track conversion rate (purchases / page views)
  const dateKey = new Date().toISOString().split('T')[0];
  const summaryFile = path.join(DATA_DIR, 'daily-summary.json');
  let summaries = {};
  if (fs.existsSync(summaryFile)) {
    try { summaries = JSON.parse(fs.readFileSync(summaryFile, 'utf-8')); } catch (_) { summaries = {}; }
  }
  if (!summaries[dateKey]) {
    summaries[dateKey] = { pageViews: 0, uniqueVisitors: 0, purchases: 0, refunds: 0 };
  }
  summaries[dateKey].purchases += 1;
  fs.writeFileSync(summaryFile, JSON.stringify(summaries, null, 2));

  return { success: true, tier, amount, date: dateKey };
}

/* ============================================================
   Refund Tracking
   ============================================================ */

/**
 * Track a refund event (received from Gumroad webhook).
 * @param {Object} data - Refund details
 * @param {string} data.productId - Product identifier
 * @param {number} data.refundAmount - Amount refunded in USD
 * @param {string} [data.reason] - Reason for refund (if provided)
 * @returns {Object} Confirmation object
 */
async function trackRefund({ productId = 'nomad-starter-pack', refundAmount, reason } = {}) {
  const event = {
    type: 'refund',
    product: productId,
    refundAmount,
    reason,
  };
  logEvent(event);

  // Update daily summary with refund count
  const dateKey = new Date().toISOString().split('T')[0];
  const summaryFile = path.join(DATA_DIR, 'daily-summary.json');
  let summaries = {};
  if (fs.existsSync(summaryFile)) {
    try { summaries = JSON.parse(fs.readFileSync(summaryFile, 'utf-8')); } catch (_) { summaries = {}; }
  }
  if (!summaries[dateKey]) {
    summaries[dateKey] = { pageViews: 0, uniqueVisitors: 0, purchases: 0, refunds: 0 };
  }
  summaries[dateKey].refunds += 1;
  fs.writeFileSync(summaryFile, JSON.stringify(summaries, null, 2));

  return { success: true, refundAmount, reason, date: dateKey };
}

/* ============================================================
   Telegram Bot Interaction Tracking
   ============================================================ */

/**
 * Track a user interacting with the product via Telegram bot.
 * @param {string} command - The command sent (e.g., '/pricing', '/buy')
 * @param {string} chatId - Telegram chat ID
 * @param {string} userId - Telegram user ID
 */
async function trackTelegramCommand({ command, chatId, userId }) {
  logEvent({
    type: 'telegram_command',
    command,
    chatId,
    userId,
    product: 'nomad-starter-pack',
  });

  // If the command is a purchase link, mark as conversion click
  if (['/buy', '/premium', '/bundle', '/basic'].includes(command)) {
    logEvent({
      type: 'telegram_purchase_click',
      targetTier: command === '/buy' ? 'gumroad_main' : command.replace('/', ''),
      chatId,
      userId,
      product: 'nomad-starter-pack',
    });
  }

  return { success: true, command };
}

/**
 * Track a click-through to the Gumroad page from Telegram.
 */
async function trackTelegramClickThrough({ source, tier }) {
  logEvent({
    type: 'click_through',
    source,          // 'telegram_channel', 'telegram_bot'
    tier,            // 'basic', 'premium', 'bundle', or null (main page)
    product: 'nomad-starter-pack',
  });
  return { success: true, source, tier };
}

/* ============================================================
   Affiliate Link Click Tracking
   ============================================================ */

/**
 * Track a click on an affiliate link in the PDF guide.
 * @param {string} toolName - Name of the tool (e.g., 'expressvpn', 'airalo')
 * @param {string} source - Where the link was found ('pdf_guide', 'sales_page')
 */
async function trackAffiliateClick({ toolName, source }) {
  logEvent({
    type: 'affiliate_click',
    tool: toolName.toLowerCase(),
    source,
    product: 'nomad-starter-pack',
  });

  // Update affiliate performance summary
  const file = path.join(DATA_DIR, 'affiliate-performance.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (_) { data = {}; }
  }
  if (!data[toolName.toLowerCase()]) {
    data[toolName.toLowerCase()] = { clicks: 0, conversions: 0 };
  }
  data[toolName.toLowerCase()].clicks += 1;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

  return { success: true, tool: toolName, source };
}

/**
 * Track an affiliate conversion (purchase through our link).
 */
async function trackAffiliateConversion({ toolName, commission, currency = 'USD' }) {
  logEvent({
    type: 'affiliate_conversion',
    tool: toolName.toLowerCase(),
    commission,
    currency,
    product: 'nomad-starter-pack',
  });

  const file = path.join(DATA_DIR, 'affiliate-performance.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (_) { data = {}; }
  }
  if (!data[toolName.toLowerCase()]) {
    data[toolName.toLowerCase()] = { clicks: 0, conversions: 0 };
  }
  data[toolName.toLowerCase()].conversions += 1;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

  return { success: true, tool: toolName, commission, currency };
}

/* ============================================================
   Analytics Reporting / Summary Functions
   ============================================================ */

/**
 * Generate a summary of all product analytics.
 */
async function getAnalyticsSummary() {
  ensureDir();

  // Load daily summaries
  let dailySummaries = {};
  const summaryFile = path.join(DATA_DIR, 'daily-summary.json');
  if (fs.existsSync(summaryFile)) {
    try { dailySummaries = JSON.parse(fs.readFileSync(summaryFile, 'utf-8')); } catch (_) { /* empty */ }
  }

  // Load tier revenue data
  let tierRevenue = {};
  const tierFile = path.join(DATA_DIR, 'tier-revenue.json');
  if (fs.existsSync(tierFile)) {
    try { tierRevenue = JSON.parse(fs.readFileSync(tierFile, 'utf-8')); } catch (_) { /* empty */ }
  }

  // Load affiliate performance
  let affiliatePerf = {};
  const affFile = path.join(DATA_DIR, 'affiliate-performance.json');
  if (fs.existsSync(affFile)) {
    try { affiliatePerf = JSON.parse(fs.readFileSync(affFile, 'utf-8')); } catch (_) { /* empty */ }
  }

  // Aggregate totals
  let totalPageViews = 0;
  let totalUniqueVisitors = 0;
  let totalPurchases = 0;
  let totalRefunds = 0;
  let totalRevenue = 0;

  Object.values(dailySummaries).forEach(s => {
    totalPageViews += s.pageViews || 0;
    totalUniqueVisitors += s.uniqueVisitors || 0;
    totalPurchases += s.purchases || 0;
    totalRefunds += s.refunds || 0;
  });

  Object.values(tierRevenue).forEach(t => {
    totalRevenue += t.totalRevenue || 0;
  });

  const conversionRate = totalUniqueVisitors > 0 ? (totalPurchases / totalUniqueVisitors * 100) : 0;
  const refundRate = totalPurchases > 0 ? (totalRefunds / totalPurchases * 100) : 0;

  return {
    overview: {
      totalPageViews,
      totalUniqueVisitors,
      totalPurchases,
      totalRefunds,
      totalRevenueUSD: totalRevenue.toFixed(2),
      conversionRate: `${conversionRate.toFixed(2)}%`,
      refundRate: `${refundRate.toFixed(2)}%`,
    },
    tierBreakdown: tierRevenue,
    affiliatePerformance: affiliatePerf,
    dailySummaries,
  };
}

/* ============================================================
   Gumroad Webhook Handlers
   ============================================================ */

/**
 * Handle a Gumroad webhook event for purchases.
 * @param {Object} webhookPayload - Raw payload from Gumroad webhook
 */
async function handleGumroadPurchaseWebhook(webhookPayload) {
  const { product_id, variant_name: tier, price_cents, customer_email } = webhookPayload;

  if (!price_cents || !tier) return { success: false, error: 'Missing required fields' };

  const amountUSD = price_cents / 100;
  
  await trackConversion({ tier, amount: amountUSD, productId: product_id });
  
  return { 
    success: true, 
    message: `Purchase recorded: ${tier} tier, $${amountUSD}`,
    email: customer_email,
  };
}

/**
 * Handle a Gumroad webhook event for refunds.
 */
async function handleGumroadRefundWebhook(webhookPayload) {
  const { product_id, refund_amount_cents: refundAmountCents, reason } = webhookPayload;

  if (!refundAmountCents) return { success: false, error: 'Missing refund amount' };

  const amountUSD = refundAmountCents / 100;
  
  await trackRefund({ productId: product_id, refundAmount: amountUSD, reason });
  
  return { 
    success: true, 
    message: `Refund recorded: $${amountUSD}`,
  };
}

/* ============================================================
   Exported Functions
   ============================================================ */

module.exports = {
  // Core tracking functions
  trackPageViews,
  trackConversion,
  trackRefund,
  
  // Telegram integration
  trackTelegramCommand,
  trackTelegramClickThrough,
  
  // Affiliate link tracking
  trackAffiliateClick,
  trackAffiliateConversion,
  
  // Webhook handlers
  handleGumroadPurchaseWebhook,
  handleGumroadRefundWebhook,
  
  // Reporting
  getAnalyticsSummary,
};
