/**
 * diversityEnforcer.js — Prevents posting more than N items on the same topic per week.
 *
 * Works as a middleware between the post queue and the delivery layer.
 * Before any post is dispatched, it checks the topic's weekly count against
 * the configured limit (default: 2). If the limit would be exceeded, the post
 * is deferred or rejected depending on policy.
 */

const { getWeekKey } = require('./postScheduler');

// ── State ───────────────────────────────────────────────────────────────────────

/** Running topic counts per week: { [weekKey]: { [topic]: count } } */
let _topicCounts = {};

// ── Config ──────────────────────────────────────────────────────────────────────

async function getLimit() {
  const cfg = require('../cron/autoPostCron').getDiversityConfig();
  return (await cfg())?.max_per_topic_week || 2;
}

// ── API ───────────────────────────────────────────────────────────────────────────

/**
 * Check whether posting on `topic` would exceed the weekly diversity limit.
 * @param {string} topic
 * @returns {{ allowed: boolean, currentCount: number, limit: number }}
 */
async function checkDiversity(topic) {
  const weekKey = getWeekKey();
  const currentTopicCounts = _topicCounts[weekKey] || {};
  const currentCount = currentTopicCounts[topic] || 0;
  const limit = await getLimit();

  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    topic,
    weekKey,
  };
}

/**
 * Register a post on `topic` (call after successful delivery).
 */
function recordPost(topic) {
  const weekKey = getWeekKey();
  if (!_topicCounts[weekKey]) _topicCounts[weekKey] = {};
  _topicCounts[weekKey][topic] = (_topicCounts[weekKey][topic] || 0) + 1;
}

/**
 * Get a snapshot of current diversity state for all topics in the current week.
 */
function getDiversitySnapshot() {
  const weekKey = getWeekKey();
  return _topicCounts[weekKey] ? { ..._topicCounts[weekKey] } : {};
}

/**
 * Flush diversity counters (for testing or manual reset).
 */
function flushCounters() {
  _topicCounts = {};
}

/**
 * Determine the topic of a post from its content/payload.
 * Uses simple heuristic: first word after stripping common stop words,
 * or falls back to a hash-based bucket for unknown topics.
 */
function extractTopic(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  // Strip markdown/URLs for cleaner topic extraction
  const cleaned = text.replace(/[#*`]/g, '').replace(/[<](?:https?:\/\/)?\S+[>]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(w.toLowerCase()));
  return words[0] ? `topic:${words[0].toLowerCase()}` : `topic:hash-${Buffer.from(cleaned.slice(0, 16)).toString('hex')}`;
}

/**
 * Full diversity check + register flow — used as middleware.
 * Returns { allowed: boolean, reason?: string } and registers the post if allowed.
 */
async function enforceDiversity(topic, payload) {
  const result = await checkDiversity(topic);
  if (result.allowed) {
    recordPost(topic);
    return { allowed: true };
  }
  return { allowed: false, reason: `Topic "${topic}" has reached diversity limit (${result.currentCount}/${result.limit}) for week ${result.weekKey}` };
}

module.exports = { checkDiversity, recordPost, getDiversitySnapshot, flushCounters, extractTopic, enforceDiversity };
