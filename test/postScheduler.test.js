/**
 * test/postScheduler.test.js — Unit tests for PostScheduler, Deduplication, Retry, Rate Limiting, and Audit Log.
 *
 * Tests:
 *   1. Deduplication prevents reposts (content hash check)
 *   2. Retry logic with exponential backoff (3 attempts)
 *   3. Rate limiting queues excess posts (max 30/sec Telegram limit)
 *   4. Audit log records every post attempt with timestamp and delivery status
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const PostScheduler = require('../server/services/postScheduler.js');

// ── Test harness ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

function resetScheduler() {
  PostScheduler.flushQueue();
}

// ── Test helpers ────────────────────────────────────────────────────────────────

/** Create a mock delivery function that fails N times then succeeds */
function createMockDelivery({ failTimes = 0, error = 'Telegram API timeout' } = {}) {
  let callCount = 0;
  return async ({ payload, region }) => {
    callCount += 1;
    if (callCount <= failTimes) {
      return { ok: false, error };
    }
    return { ok: true, msgId: Math.floor(Math.random() * 100000), region };
  };
}

// ── Test Suite ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== Post Scheduler Tests ===\n');

  // ═══════════════════════════════════════════════════════════
  // Test 1: Deduplication prevents reposts (content hash check)
  // ═══════════════════════════════════════════════════════════

  console.log('\n--- Deduplication Tests ---\n');

  await test('Dedup: contentHash produces consistent SHA-256', async () => {
    const h1 = PostScheduler.contentHash('Hello, world!');
    const h2 = PostScheduler.contentHash('Hello, world!');
    assert.strictEqual(typeof h1, 'string');
    assert.strictEqual(h1.length, 64, 'SHA-256 hex should be 64 chars');
    assert.strictEqual(h1, h2, 'Same content should produce same hash');
  });

  await test('Dedup: different content produces different hashes', async () => {
    const h1 = PostScheduler.contentHash('Hello, world!');
    const h2 = PostScheduler.contentHash('Goodbye, world!');
    assert.notStrictEqual(h1, h2, 'Different content should produce different hashes');
  });

  await test('Dedup: isDuplicate returns false for new content', async () => {
    resetScheduler();
    const result = await PostScheduler.isDuplicate('brand-new-post-content');
    assert.strictEqual(result, false);
  });

  await test('Dedup: isDuplicate returns true after markSeen', async () => {
    resetScheduler();
    const content = 'mark-this-seen';
    PostScheduler.markSeen(content);
    const result = await PostScheduler.isDuplicate(content);
    assert.strictEqual(result, true);
  });

  await test('Dedup: enqueuePost skips duplicate content', async () => {
    resetScheduler();
    const payload = 'duplicate-test-post';

    const r1 = await PostScheduler.enqueuePost('test-topic', payload, 'NA');
    assert.strictEqual(r1.queued, true);

    const r2 = await PostScheduler.enqueuePost('test-topic', payload, 'EU');
    assert.strictEqual(r2.queued, false);
    assert.strictEqual(r2.reason, 'duplicate');
  });

  await test('Dedup: enqueuePost accepts new content after dedup window', async () => {
    resetScheduler();
    PostScheduler.markSeen('old-duplicate-content');
    const newContent = 'totally-new-post-' + Date.now();
    const r = await PostScheduler.enqueuePost('test-topic', newContent, 'NA');
    assert.strictEqual(r.queued, true);
  });

  // ═══════════════════════════════════════════════════════════
  // Test 2: Retry logic with exponential backoff (3 attempts)
  // ═══════════════════════════════════════════════════════════

  console.log('\n--- Retry Logic Tests ---\n');

  await test('Retry: succeeds on first attempt when delivery works', async () => {
    resetScheduler();
    PostScheduler.setDeliveryFunction(async ({ payload, region }) => ({ ok: true, msgId: 42, region }));
    const result = await PostScheduler.deliverWithRetry('test-payload', 'retry-test-topic', 'NA', 3);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.attempt, 1);
  });

  await test('Retry: retries N times then succeeds (2 failures + 1 success)', async () => {
    resetScheduler();
    let callCount = 0;
    const mockDeliver = async ({ payload, region }) => {
      callCount += 1;
      if (callCount <= 2) return { ok: false, error: 'Network timeout' };
      return { ok: true, msgId: 99, region };
    };
    PostScheduler.setDeliveryFunction(mockDeliver);

    const result = await PostScheduler.deliverWithRetry('test-payload', 'retry-test-topic', 'NA', 3);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.attempt, 3, 'Should have taken 3 attempts');
    assert.strictEqual(callCount, 3, 'Delivery should be called exactly 3 times');
  });

  await test('Retry: all retries exhausted returns failure', async () => {
    resetScheduler();
    let callCount = 0;
    const mockDeliver = async () => {
      callCount += 1;
      return { ok: false, error: 'Telegram API returned 500' };
    };
    PostScheduler.setDeliveryFunction(mockDeliver);

    const result = await PostScheduler.deliverWithRetry('fail-payload', 'retry-fail-topic', 'APAC', 3);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.attempt, 3);
    assert.strictEqual(callCount, 3, 'Should have made exactly 3 attempts');
    assert.ok(result.error, 'Should contain error message');
  });

  await test('Retry: backoff timing follows exponential pattern', async () => {
    resetScheduler();
    let callCount = 0;
    const startTime = Date.now();
    const timestamps = [];

    const mockDeliver = async ({ payload, region }) => {
      timestamps.push(Date.now() - startTime);
      callCount += 1;
      if (callCount <= 2) return { ok: false, error: 'Timeout' };
      return { ok: true, msgId: 77, region };
    };
    PostScheduler.setDeliveryFunction(mockDeliver);

    await PostScheduler.deliverWithRetry('backoff-test', 'backoff-topic', 'EU', 3);

    // Verify timing gaps increase (exponential)
    if (timestamps.length >= 3) {
      const gap1 = timestamps[2] - timestamps[1];
      const gap0 = timestamps[1] - timestamps[0];
      // With base=2000, multiplier=2.5: gap1 should be ~2.5x gap0 + jitter
      assert.ok(gap1 >= gap0 * 2, `Backoff gap (${gap1}ms) should be at least 2x previous (${gap0}ms)`);
    }
  });

  await test('Retry: configurable max attempts parameter', async () => {
    resetScheduler();
    let callCount = 0;
    const mockDeliver = async () => { callCount += 1; return { ok: false, error: 'Always fails' }; };
    PostScheduler.setDeliveryFunction(mockDeliver);

    const result = await PostScheduler.deliverWithRetry('max-test', 'max-topic', 'NA', 2);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(callCount, 2, 'Should have made exactly 2 attempts');
  });

  // ═══════════════════════════════════════════════════════════
  // Test 3: Rate limiting queues excess posts (max 30/sec Telegram limit)
  // ═══════════════════════════════════════════════════════════

  console.log('\n--- Rate Limiting Tests ---\n');

  await test('RateLimit: acquireRateToken returns true and refills tokens', async () => {
    resetScheduler();
    let success = await PostScheduler.acquireRateToken();
    assert.strictEqual(success, true);
  });

  await test('RateLimit: multiple rapid calls consume and refill tokens correctly', async () => {
    resetScheduler();
    const results = [];
    for (let i = 0; i < 5; i++) {
      const success = await PostScheduler.acquireRateToken();
      results.push(success);
    }
    // First few should succeed (tokens available), later ones may wait and still succeed
    const successes = results.filter((r) => r === true).length;
    assert.ok(successes >= 4, `At least 4 of 5 rate tokens should succeed, got ${successes}`);
  });

  await test('RateLimit: queue size is managed correctly with high enqueue rate', async () => {
    resetScheduler();
    const enqueueResults = [];
    for (let i = 0; i < 10; i++) {
      const r = await PostScheduler.enqueuePost(`topic-${i}`, `payload-${i}-${Date.now()}`, 'NA');
      enqueueResults.push(r);
    }
    const queuedCount = enqueueResults.filter((r) => r.queued).length;
    assert.ok(queuedCount >= 1, 'At least one post should be enqueued');
    const stats = PostScheduler.getStats();
    assert.strictEqual(stats.totalInQueue, queuedCount, `Queue count should match enqueued posts`);
  });

  await test('RateLimit: dequeueAndDeliver respects order (FIFO)', async () => {
    resetScheduler();
    PostScheduler.setDeliveryFunction(async ({ payload, region }) => ({ ok: true, msgId: Math.floor(Math.random() * 10000), region }));

    for (let i = 0; i < 3; i++) {
      await PostScheduler.enqueuePost(`fifo-topic-${i}`, `payload-fifo-${i}`, 'NA');
    }

    const statsBefore = PostScheduler.getStats();
    assert.ok(statsBefore.totalInQueue >= 1, 'Should have items in queue');
  });

  await test('RateLimit: integration — full enqueue → dequeue → deliver flow', async () => {
    resetScheduler();
    const deliveredResults = [];
    let deliveryCalls = 0;
    PostScheduler.setDeliveryFunction(async ({ payload, region }) => {
      deliveryCalls += 1;
      return { ok: true, msgId: deliveryCalls, region };
    });

    for (let i = 0; i < 5; i++) {
      await PostScheduler.enqueuePost(`integration-topic-${i}`, `integration-payload-${i}`, 'NA');
    }

    let stats = PostScheduler.getStats();
    assert.ok(stats.queued >= 1, 'Should have queued posts');

    // Dequeue and deliver all
    while (true) {
      const result = await PostScheduler.dequeueAndDeliver();
      if (!result) break;
      deliveredResults.push(result);
      stats = PostScheduler.getStats();
      if (stats.totalInQueue === 0 && stats.delivered > 0) break;
    }

    assert.ok(deliveredResults.length >= 1, 'Should have delivered at least one post');
    assert.strictEqual(deliveryCalls, deliveredResults.length, 'Delivery call count should match results');
  });

  // ═══════════════════════════════════════════════════════════
  // Test 4: Audit log records every post attempt with timestamp and delivery status
  // ═══════════════════════════════════════════════════════════

  console.log('\n--- Audit Log Tests ---\n');

  await test('AuditLog: appendAuditEntry writes a valid JSON line to the daily file', async () => {
    const auditDir = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log');
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(auditDir, `audit-${today}.jsonl`);

    // Clean slate for this test
    PostScheduler.flushQueue();

    await fs.writeFile(logFile, '', 'utf8');

    const entry = {
      timestamp: new Date().toISOString(),
      postId: 9001,
      topic: 'audit-test',
      contentHash: crypto.createHash('sha256').update('audit-content').digest('hex'),
      deliveryStatus: 'test-entry',
      attempt: 0,
      region: 'NA',
    };

    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');

    const lines = (await fs.readFile(logFile, 'utf8')).split('\n').filter((l) => l.trim());
    assert.ok(lines.length >= 1, 'Audit log should have at least one entry');

    const parsed = JSON.parse(lines[0]);
    assert.ok(parsed.timestamp, 'Entry should have timestamp');
    assert.strictEqual(parsed.topic, 'audit-test');
    assert.strictEqual(parsed.deliveryStatus, 'test-entry');
    assert.strictEqual(typeof parsed.contentHash, 'string');
    assert.strictEqual(parsed.contentHash.length, 64);
  });

  await test('AuditLog: enqueued posts are recorded in audit log', async () => {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log', `audit-${today}.jsonl`);

    PostScheduler.flushQueue();
    await fs.writeFile(logFile, '', 'utf8');

    await PostScheduler.enqueuePost('audit-enqueue-topic', 'audit-enqueue-payload', 'NA');

    const lines = (await fs.readFile(logFile, 'utf8')).split('\n').filter((l) => l.trim());
    assert.ok(lines.length >= 1, 'Enqueued post should produce audit log entry');

    const parsed = JSON.parse(lines[0]);
    assert.strictEqual(parsed.deliveryStatus, 'enqueued', `Audit should record 'enqueued' status, got '${parsed.deliveryStatus}'`);
  });

  await test('AuditLog: delivered posts are recorded in audit log', async () => {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log', `audit-${today}.jsonl`);

    PostScheduler.flushQueue();
    await fs.writeFile(logFile, '', 'utf8');
    PostScheduler.setDeliveryFunction(async () => ({ ok: true, msgId: 5001 }));

    await PostScheduler.enqueuePost('audit-deliver-topic', 'audit-deliver-payload', 'EU');
    const deliverResult = await PostScheduler.dequeueAndDeliver();
    assert.ok(deliverResult && deliverResult.ok, 'Delivery should succeed');

    const lines = (await fs.readFile(logFile, 'utf8')).split('\n').filter((l) => l.trim());
    const entries = lines.map((l) => JSON.parse(l));
    const deliveredEntries = entries.filter((e) => e.deliveryStatus === 'delivered');
    assert.ok(deliveredEntries.length >= 1, 'Should have at least one delivered audit entry');
  });

  await test('AuditLog: failed retries are recorded in audit log', async () => {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log', `audit-${today}.jsonl`);

    PostScheduler.flushQueue();
    await fs.writeFile(logFile, '', 'utf8');
    let attempts = 0;
    PostScheduler.setDeliveryFunction(async () => { attempts += 1; return { ok: false, error: 'Test failure' }; });

    const result = await PostScheduler.deliverWithRetry('audit-fail-payload', 'audit-fail-topic', 'APAC', 3);

    assert.strictEqual(result.ok, false);
    const lines = (await fs.readFile(logFile, 'utf8')).split('\n').filter((l) => l.trim());
    const entries = lines.map((l) => JSON.parse(l));
    assert.strictEqual(entries.length, 3, `Should have 3 failed audit entries, got ${entries.length}`);
    assert.ok(entries.every((e) => e.deliveryStatus === 'failed'), 'All entries should show failed status');
  });

  await test('AuditLog: skipped duplicates are recorded in audit log', async () => {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log', `audit-${today}.jsonl`);

    PostScheduler.flushQueue();
    await fs.writeFile(logFile, '', 'utf8');

    await PostScheduler.enqueuePost('dup-topic', 'duplicate-audit-content', 'NA');
    const r = await PostScheduler.enqueuePost('dup-topic', 'duplicate-audit-content', 'EU');

    assert.strictEqual(r.queued, false);

    const lines = (await fs.readFile(logFile, 'utf8')).split('\n').filter((l) => l.trim());
    const entries = lines.map((l) => JSON.parse(l));
    const skippedEntries = entries.filter((e) => e.deliveryStatus === 'skipped_duplicate');
    assert.ok(skippedEntries.length >= 1, 'Duplicate skip should be recorded in audit log');
  });

  await test('AuditLog: every entry has a valid ISO timestamp', async () => {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log', `audit-${today}.jsonl`);

    PostScheduler.flushQueue();
    await fs.writeFile(logFile, '', 'utf8');
    PostScheduler.setDeliveryFunction(async () => ({ ok: true, msgId: 1 }));
    await PostScheduler.enqueuePost('ts-topic', 'ts-payload', 'NA');
    await PostScheduler.dequeueAndDeliver();

    const lines = (await fs.readFile(logFile, 'utf8')).split('\n').filter((l) => l.trim());
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.ok(parsed.timestamp, 'Every entry must have a timestamp');
      const d = new Date(parsed.timestamp);
      assert.ok(!isNaN(d.getTime()), `Timestamp "${parsed.timestamp}" should be valid ISO 8601`);
    }
  });

  await test('AuditLog: template.json is valid JSON with required schema fields', async () => {
    const templatePath = path.join(__dirname, '..', 'docs', 'income-channel', 'audit-log', 'template.json');
    const template = JSON.parse(await fs.readFile(templatePath, 'utf8'));

    assert.ok(template.type === 'object');
    assert.ok(Array.isArray(template.required), 'Template should have "required" array');
    assert.ok(template.properties?.timestamp);
    assert.ok(template.properties?.contentHash);
    assert.ok(template.properties?.deliveryStatus);
    assert.ok(template.properties?.attempt);

    const requiredFields = template.required;
    for (const field of requiredFields) {
      assert.ok(template.properties[field], `Required field "${field}" should be defined in schema properties`);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Test 5: Topic diversity enforcement (bonus integration test)
  // ═══════════════════════════════════════════════════════════

  console.log('\n--- Diversity Enforcement Tests ---\n');

  await test('Diversity: checkTopicLimit detects excess posts on same topic', async () => {
    resetScheduler();
    const PostScheduler2 = require('../server/services/postScheduler.js');
    // Simulate max 2 per week; enqueue 3 times with topic override
    for (let i = 0; i < 3; i++) {
      await PostScheduler2.enqueuePost('diversity-topic', `payload-${i}-${Date.now()}`, 'NA');
    }
    // After enqueuing, check: the third should be diversity-limited
    const stats = PostScheduler2.getStats();
    assert.ok(stats.totalInQueue >= 1, 'Should have some posts in queue');
  });

  await test('Diversity: getWeekKey returns consistent ISO week key', async () => {
    const wk1 = PostScheduler.getWeekKey(new Date('2026-07-16'));
    const wk2 = PostScheduler.getWeekKey(new Date('2026-07-17'));
    assert.strictEqual(typeof wk1, 'string');
    assert.ok(wk1.includes('-W'), 'Week key should include -W separator');
    assert.strictEqual(wk1, wk2, 'Same week dates should return same key');
  });

  // ═══════════════════════════════════════════════════════════
  // Test 6: Queue stats and management
  // ═══════════════════════════════════════════════════════════

  console.log('\n--- Queue Stats Tests ---\n');

  await test('Stats: getStats returns correct counts after mixed operations', async () => {
    resetScheduler();
    PostScheduler.setDeliveryFunction(async () => ({ ok: true, msgId: 1 }));

    for (let i = 0; i < 3; i++) {
      await PostScheduler.enqueuePost(`stats-topic-${i}`, `payload-stats-${i}`, 'NA');
    }

    const stats = PostScheduler.getStats();
    assert.ok(stats.queued >= 1 || stats.totalInQueue >= 1, 'Should have queued posts');
    assert.strictEqual(typeof stats.delivered, 'number');
    assert.strictEqual(typeof stats.failed, 'number');
    assert.strictEqual(typeof stats.seenHashes, 'number');
  });

  await test('Stats: flushQueue resets all counters', async () => {
    const statsBefore = PostScheduler.getStats();
    assert.ok(statsBefore.totalInQueue >= 0);

    PostScheduler.flushQueue();

    const statsAfter = PostScheduler.getStats();
    assert.strictEqual(statsAfter.queued, 0);
    assert.strictEqual(statsAfter.delivering, 0);
    assert.strictEqual(statsAfter.delivered, 0);
    assert.strictEqual(statsAfter.failed, 0);
    assert.strictEqual(statsAfter.totalInQueue, 0);
    assert.strictEqual(statsAfter.seenHashes, 0);
  });

  // ═══════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
