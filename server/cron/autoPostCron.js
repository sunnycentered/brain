/**
 * autoPostCron.js — Configurable cron scheduler for the Income Channel auto-posting system.
 *
 * Runs on a fixed UTC schedule (08:00 / 14:00 / 20:00) with timezone-aware
 * region targeting for NA, EU, and APAC audiences. Uses node-cron (or native
 * setInterval fallback) for scheduling and delegates post execution to PostScheduler.
 */

const path = require('path');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Minimal YAML loader (same pattern used by topicResearch).
 * Returns a plain object tree — sufficient for post-schedule.yaml structure.
 */
function loadYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  const lines = content.split('\n');
  let stack = [{ obj: result, depth: -1 }];

  for (const rawLine of lines) {
    const stripped = rawLine.trim();
    if (!stripped || stripped.startsWith('#')) continue;
    const indent = rawLine.search(/\S/);
    while (stack.length > 1 && stack[stack.length - 1].depth >= indent) stack.pop();
    const keyMatch = stripped.match(/^(\w[\w\-\.]+)\s*:\s*(.+)?$/);
    if (keyMatch) {
      const [, key, val] = keyMatch;
      const container = stack[stack.length - 1].obj;
      if (val === undefined || val.trim() === '') {
        container[key] = {};
        stack.push({ obj: container[key], depth: indent });
      } else {
        let parsedVal = val.replace(/^["']|["']$/g, '').trim();
        if (parsedVal === 'true') parsedVal = true;
        else if (parsedVal === 'false') parsedVal = false;
        else if (!isNaN(parsedVal) && !val.includes('"')) parsedVal = Number(parsedVal);
        container[key] = parsedVal;
      }
    }
  }
  return result;
}

/** Load schedule config from YAML */
async function loadScheduleConfig() {
  const cfgPath = path.join(__dirname, '..', 'config', 'post-schedule.yaml');
  return loadYaml(cfgPath);
}

/** Get local time strings for each region at a given UTC hour */
function getLocalTimes(utcHour) {
  const now = new Date();
  const utcDate = new Date(now.toISOString().split('T')[0]);
  utcDate.setUTCHours(utcHour, 0, 0, 0);

  const tzMap = {
    NA: 'America/Los_Angeles',
    EU: 'Europe/London',
    APAC: 'Asia/Tokyo',
  };

  const result = {};
  for (const [region, tz] of Object.entries(tzMap)) {
    result[region] = utcDate.toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
  }
  return result;
}

/** Convert "HH:MM" UTC string to node-cron expression (minute hour * * *) */
function utcToCronExpression(utcTime) {
  const [h, m] = utcTime.split(':').map(Number);
  return `${m} ${h} * * *`;
}

/** Compute effective local time for a region at schedule UTC offset */
function getEffectiveLocalHour(utcHour, region) {
  const now = new Date();
  const utcDate = new Date(now.toISOString().split('T')[0]);
  utcDate.setUTCHours(utcHour);

  const tzMap = {
    NA: 'America/Los_Angeles',
    EU: 'Europe/London',
    APAC: 'Asia/Tokyo',
  };

  const str = utcDate.toLocaleString('en-US', { timeZone: tzMap[region], hour12: false, hour: '2-digit' });
  return parseInt(str, 10);
}

// ── Session config ─────────────────────────────────────────────────────────────

/** Returns array of active session objects from config */
async function getActiveSessions() {
  const config = await loadScheduleConfig();
  if (!config.schedule?.sessions) return [];

  return config.schedule.sessions.filter((s) => s.enabled !== false).map((s) => ({
    id: s.id,
    utcHour: parseInt(s.utc.split(':')[0], 10),
    cronExpr: utcToCronExpression(s.utc),
    label: s.label,
    utcTime: s.utc,
    regions: getLocalTimes(parseInt(s.utc.split(':')[0], 10)),
    maxPostsPerSession: config.post_limits?.max_per_session || 3,
  }));
}

/** Determine which region each session is optimized for */
function optimizeRegion(session) {
  const hours = Object.values(session.regions).map((t) => parseInt(t.split(':')[0], 10));
  // Find the hour closest to standard primetime: NA=9, EU=15, APAC=17
  let bestRegion = 'NA';
  let bestScore = -Infinity;
  const targets = { NA: 9, EU: 15, APAC: 17 };

  for (const [region, h] of Object.entries(session.regions)) {
    const score = -(Math.abs(h - targets[region]) ** 2);
    if (score > bestScore) {
      bestScore = score;
      bestRegion = region;
    }
  }
  return bestRegion;
}

// ── Scheduler (native setInterval fallback if node-cron unavailable) ───────────

let schedulers = [];

function isCronAvailable() {
  try { require('node-cron'); return true; } catch { return false; }
}

/** Start all cron jobs from config */
async function startAutoPostCron(postScheduler) {
  const sessions = await getActiveSessions();
  stopAutoPostCron();

  if (isCronAvailable()) {
    const nodeCron = require('node-cron');

    for (const session of sessions) {
      const job = nodeCron.schedule(session.cronExpr, async () => {
        const region = optimizeRegion(session);
        console.log(`[autoPostCron] Session "${session.id}" firing (${session.utcTime} UTC → ${region})`);
        await postScheduler.runSession(session, region);
      });
      schedulers.push(job);
    }

    console.log(`[autoPostCron] Started ${schedulers.length} cron jobs for sessions: ${sessions.map((s) => s.id).join(', ')}`);
  } else {
    // Fallback: use setInterval with UTC-time alignment
    const msPerMin = 60 * 1000;

    for (const session of sessions) {
      const nextTrigger = computeNextTriggerMs(session.utcHour, parseInt(session.utc.split(':')[1], 10));
      const intervalMs = 60 * 60 * 1000; // check every hour

      const timer = setInterval(async () => {
        const now = new Date();
        const nowUTC = now.getUTCHours() * 100 + now.getUTCMinutes();
        const targetUTC = session.utcHour * 100 + parseInt(session.utc.split(':')[1], 10);

        if (nowUTC === targetUTC) {
          const region = optimizeRegion(session);
          console.log(`[autoPostCron-fb] Session "${session.id}" firing (${session.utcTime} UTC → ${region})`);
          await postScheduler.runSession(session, region);
        }
      }, intervalMs);

      schedulers.push(timer);
    }

    console.log(`[autoPostCron-fb] Started ${schedulers.length} setInterval-based jobs for sessions: ${sessions.map((s) => s.id).join(', ')}`);
  }
}

function stopAutoPostCron() {
  for (const s of schedulers) {
    if (typeof s.stop === 'function') s.stop();
    else clearInterval(s);
  }
  schedulers = [];
  console.log('[autoPostCron] All jobs stopped');
}

/** Compute next trigger milliseconds from now */
function computeNextTriggerMs(hour, minute) {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(hour, minute, 0, 0);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime() - now.getTime();
}

/** Get region optimization for the current UTC hour */
function getCurrentOptimizedRegion() {
  const now = new Date();
  const utcH = now.getUTCHours();
  return getEffectiveLocalHour(utcH, 'NA') > 6 && getEffectiveLocalHour(utcH, 'NA') < 23 ? 'NA' : (getEffectiveLocalHour(utcH, 'EU') > 6 && getEffectiveLocalHour(utcH, 'EU') < 23 ? 'EU' : 'APAC');
}

// ── Config access helpers ──────────────────────────────────────────────────────

/** Get rate limit settings */
function getRateLimitConfig() {
  // lazy load on first call
  let _cache = null;
  return async () => {
    if (!_cache) {
      const config = await loadScheduleConfig();
      _cache = config.rate_limit || { max_per_second: 30, burst_window_ms: 1000 };
    }
    return _cache;
  };
}

/** Get retry settings */
function getRetryConfig() {
  let _cache = null;
  return async () => {
    if (!_cache) {
      const config = await loadScheduleConfig();
      _cache = config.retry || { max_attempts: 3, backoff_base_ms: 2000, backoff_multiplier: 2.5, jitter_max_ms: 500 };
    }
    return _cache;
  };
}

/** Get diversity settings */
function getDiversityConfig() {
  let _cache = null;
  return async () => {
    if (!_cache) {
      const config = await loadScheduleConfig();
      _cache = config.diversity || { max_per_topic_week: 2 };
    }
    return _cache;
  };
}

/** Get deduplication settings */
function getDedupConfig() {
  let _cache = null;
  return async () => {
    if (!_cache) {
      const config = await loadScheduleConfig();
      _cache = config.deduplication || { hash_algorithm: 'sha256', retention_hours: 168 };
    }
    return _cache;
  };
}

module.exports = {
  // Core scheduler
  startAutoPostCron,
  stopAutoPostCron,

  // Config loaders
  loadScheduleConfig,
  getActiveSessions,
  getRateLimitConfig,
  getRetryConfig,
  getDiversityConfig,
  getDedupConfig,

  // Helpers
  utcToCronExpression,
  getLocalTimes,
  optimizeRegion,
  getCurrentOptimizedRegion,
  computeNextTriggerMs,
};
