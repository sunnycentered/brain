/**
 * postScheduler.js — Post queue management for the Income Channel auto-posting system.
 *
 * Integrates with telegramChannel.js (or any pluggable delivery channel) to:
 *   - Manage a FIFO post queue
 * - Deduplicate by content hash before enqueue
 * - Enforce per-topic diversity limits
 * - Rate-limit burst output to respect Telegram's 30 msg/s limit
 * - Retry failed deliveries with exponential backoff
 * - Record every attempt in the audit log
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// ── State ───────────────────────────────────────────────────────────────────────

/** Post queue (FIFO): [{ id, contentHash, topic, payload, region, status, attempts, nextRetry }] */
let postQueue = [];
let nextId = 1;

/** Seen content hashes → { hash, postedAt } for deduplication window */
const seenHashes = new Map();

/** Topic counts: { [topic]: countInCurrentWeek } */
let topicCounts = {};

// ── Channel abstraction ───────────────────────────────────────────────────────

/**
 * Delivery function signature. Replace with telegramChannel.postToIncomeChannel() in production.
 * @param {{ payload, region }} deliveryData
 * @returns {Promise<{ ok: boolean, msgId?: number, error?: string }>}
 */
let deliveryFn = null; // set externally via setDeliveryFunction()

function setDeliveryFunction(fn) {
  if (typeof fn !== 'function') throw new Error('deliveryFn must be a function');
  deliveryFn = fn;
}

/** Default no-op channel for testing */
async function _noopDelivery({ payload, region }) {
  return { ok: true, msgId: Math.floor(Math.random() * 10000), region };
}

// ── Audit log ───────────────────────────────────────────────────────────────────

const AUDIT_LOG_PATH = path.join(__dirname, '..', '..', 'docs', 'income-channel', 'audit-log');

async function _ensureAuditLogDir() {
  try { await fs.access(AUDIT_LOG_PATH); } catch { await fs.mkdir(AUDIT_LOG_PATH, { recursive: true }); }
}

/** Append one audit entry */
async function appendAuditEntry(entry) {
  await _ensureAuditLogDir();
  const logFile = path.join(AUDIT_LOG_PATH, `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
  const line = JSON.stringify(entry) + '\n';
  await fs.appendFile(logFile, line);
}

// ── Content hashing / deduplication ─────────────────────────────────────────────

/** SHA-256 content hash for deduplication */
function contentHash(content) {
  return crypto.createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex');
}

/** Check if content has already been posted within the dedup window */
async function isDuplicate(content) {
  const hash = contentHash(content);
  if (seenHashes.has(hash)) {
    const entry = seenHashes.get(hash);
    // Purge expired entries
    if (Date.now() - entry.postedAt > 7 * 24 * 60 * 60 * 1000) {
      seenHashes.delete(hash);
    } else {
      return true;
    }
  }
  return false;
}

/** Mark content as seen */
function markSeen(content) {
  const hash = contentHash(content);
  seenHashes.set(hash, { postedAt: Date.now(), content });
}

// ── Diversity enforcement ───────────────────────────────────────────────────────

/** Get current week key (ISO week) for topic counting */
function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

/** Check if topic exceeds weekly diversity limit */
async function checkTopicLimit(topic) {
  const key = getWeekKey();
  const currentCount = (topicCounts[key] && topicCounts[key][topic]) || 0;
  const config = require('./autoPostCron').getDiversityConfig();
  const divCfg = await config();
  const limit = divCfg?.max_per_topic_week || 2;
  return currentCount >= limit;
}

/** Increment topic count */
function incTopicCount(topic) {
  const key = getWeekKey();
  if (!topicCounts[key]) topicCounts[key] = {};
  topicCounts[key][topic] = (topicCounts[key][topic] || 0) + 1;
}

// ── Rate limiting ───────────────────────────────────────────────────────────────

const rateLimitBucket = { tokens: 30, lastRefill: Date.now() };
const MAX_TOKENS = 30; // Telegram API limit

async function acquireRateToken() {
  const rlConfig = require('./autoPostCron').getRateLimitConfig();
  const cfg = await rlConfig();
  const maxPerSec = cfg?.max_per_second || MAX_TOKENS;
  const windowMs = cfg?.burst_window_ms || 1000;

  // Refill tokens
  const now = Date.now();
  const elapsed = now - rateLimitBucket.lastRefill;
  const refillAmount = (elapsed / windowMs) * maxPerSec;
  rateLimitBucket.tokens = Math.min(maxPerSec, rateLimitBucket.tokens + refillAmount);
  rateLimitBucket.lastRefill = now;

  if (rateLimitBucket.tokens >= 1) {
    rateLimitBucket.tokens -= 1;
    return true; // token acquired
  }

  // Wait and retry once
  const waitMs = Math.ceil((windowMs / maxPerSec));
  await new Promise((r) => setTimeout(r, waitMs));
  rateLimitBucket.tokens -= 1;
  return true;
}

// ── Retry logic (exponential backoff) ───────────────────────────────────────────

async function getRetryConfig() {
  const rc = require('./autoPostCron').getRetryConfig();
  return await rc();
}

/** Execute a delivery with retry and exponential backoff */
async function deliverWithRetry(payload, topic, region, maxAttempts = 3) {
  const cfg = await getRetryConfig();
  const baseMs = cfg?.backoff_base_ms || 2000;
  const multiplier = cfg?.backoff_multiplier || 2.5;
  const jitterMax = cfg?.jitter_max_ms || 500;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await acquireRateToken();
    const deliveryResult = await (deliveryFn || _noopDelivery)({ payload, region });

    const auditEntry = {
      timestamp: new Date().toISOString(),
      topic,
      contentHash: contentHash(payload),
      region,
      attempt,
      maxAttempts,
      deliveryStatus: deliveryResult.ok ? 'delivered' : 'failed',
      msgId: deliveryResult.msgId || null,
      error: deliveryResult.error || lastError || null,
    };

    await appendAuditEntry(auditEntry);

    if (deliveryResult.ok) {
      return { ok: true, attempt, ...deliveryResult };
    }

    lastError = deliveryResult.error;

    if (attempt < maxAttempts) {
      const backoffMs = baseMs * Math.pow(multiplier, attempt - 1) + (Math.random() * jitterMax);
      console.log(`[postScheduler] Retry ${attempt}/${maxAttempts} for topic "${topic}" in ${Math.round(backoffMs)}ms`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  return { ok: false, attempt: maxAttempts, error: lastError };
}

// ── Queue management ────────────────────────────────────────────────────────────

/** Enqueue a post (with dedup check) */
async function enqueuePost(topic, payload, region = 'NA') {
  // Dedup
  const duplicate = await isDuplicate(payload);
  if (duplicate) {
    await appendAuditEntry({
      timestamp: new Date().toISOString(),
      topic,
      contentHash: contentHash(payload),
      region,
      attempt: 0,
      maxAttempts: 0,
      deliveryStatus: 'skipped_duplicate',
      msgId: null,
      error: 'Content already posted within dedup window',
    });
    return { queued: false, reason: 'duplicate' };
  }

  // Diversity check
  const topicExceeded = await checkTopicLimit(topic);
  if (topicExceeded) {
    await appendAuditEntry({
      timestamp: new Date().toISOString(),
      topic,
      contentHash: contentHash(payload),
      region,
      attempt: 0,
      maxAttempts: 0,
      deliveryStatus: 'skipped_diversity',
      msgId: null,
      error: `Topic limit reached for week ${getWeekKey()}`,
    });
    return { queued: false, reason: 'diversity_limit' };
  }

  const entry = {
    id: nextId++,
    topic,
    payload,
    contentHash: contentHash(payload),
    region,
    status: 'queued',
    attempts: 0,
    createdAt: Date.now(),
  };

  postQueue.push(entry);
  markSeen(payload);
  incTopicCount(topic);

  await appendAuditEntry({
    timestamp: new Date().toISOString(),
    topic,
    contentHash: entry.contentHash,
    region,
    attempt: 0,
    maxAttempts: 0,
    deliveryStatus: 'enqueued',
    msgId: null,
    error: null,
  });

  return { queued: true, id: entry.id };
}

/** Process next post in the queue */
async function dequeueAndDeliver() {
  if (postQueue.length === 0) return null;

  const entry = postQueue.shift();
  entry.status = 'delivering';
  entry.attempts += 1;

  const result = await deliverWithRetry(entry.payload, entry.topic, entry.region);

  if (result.ok) {
    entry.status = 'delivered';
  } else {
    entry.status = 'failed';
    // Put back in queue for retry if not exhausted
    if (entry.attempts < 3) {
      postQueue.unshift(entry); // highest priority retry
    }
  }

  return result;
}

/** Run a full session: process up to maxPostsPerSession */
async function runSession(session, region) {
  const maxPosts = session?.maxPostsPerSession || 3;
  const results = [];

  for (let i = 0; i < maxPosts && postQueue.length > 0; i++) {
    const result = await dequeueAndDeliver();
    if (result) results.push(result);
  }

  return results;
}

/** Get queue stats */
function getStats() {
  return {
    queued: postQueue.filter((e) => e.status === 'queued').length,
    delivering: postQueue.filter((e) => e.status === 'delivering').length,
    delivered: postQueue.filter((e) => e.status === 'delivered').length,
    failed: postQueue.filter((e) => e.status === 'failed').length,
    totalInQueue: postQueue.length,
    seenHashes: seenHashes.size,
  };
}

/** Flush the queue (for tests/cleanup) */
function flushQueue() {
  postQueue = [];
  seenHashes.clear();
  topicCounts = {};
  rateLimitBucket.tokens = MAX_TOKENS;
  rateLimitBucket.lastRefill = Date.now();
  nextId = 1;
}

module.exports = {
  enqueuePost,
  dequeueAndDeliver,
  runSession,
  setDeliveryFunction,
  contentHash,
  isDuplicate,
  markSeen,
  checkTopicLimit,
  getWeekKey,
  deliverWithRetry,
  acquireRateToken,
  getStats,
  flushQueue,
};
