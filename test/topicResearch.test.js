/**
 * test/topicResearch.test.js — Unit tests for TopicResearchService.
 *
 * Verifies:
 *   - Deduplication works correctly
 *   - Trending algorithm scores topics properly
 *   - Feed health monitoring detects dead feeds
 *   - Daily digest outputs exactly 5 topics ranked by score
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;
const TopicResearchService = require('../server/services/topicResearch.js');

// YAML mini-loader (same as in topicResearch.js)
function parseYaml(content) {
  const result = {};
  const lines = content.split('\n');
  let stack = [{ obj: result, depth: -1 }];
  for (const rawLine of lines) {
    const stripped = rawLine.trim();
    if (!stripped || stripped.startsWith('#')) continue;
    const indent = rawLine.search(/\S/);
    while (stack.length > 1 && stack[stack.length - 1].depth >= indent) stack.pop();
    const keyMatch = stripped.match(/^(\w[\w\-]*)\s*:\s*(.+)?$/);
    if (keyMatch) {
      const [, key, val] = keyMatch;
      const container = stack[stack.length - 1].obj;
      if (val === undefined || val.trim() === '') {
        container[key] = {};
        stack.push({ obj: container[key], depth: indent });
      } else {
        let pv = val.replace(/^["']|["']$/g, '');
        if (pv === 'true') pv = true;
        else if (pv === 'false') pv = false;
        else if (!isNaN(pv) && !val.includes('"')) pv = Number(pv);
        container[key] = pv;
      }
    }
  }
  return result;
}

// ── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.error('  ✗ ' + name);
    console.error('    ' + e.message);
  }
}

async function run() {
  console.log('\n=== Topic Research Service Tests ===\n');

  // Load categories once for all tests
  const yaml = fs.readFileSync(path.join(__dirname, '..', 'server', 'config', 'categories.yaml'), 'utf8');
  const loadedCategories = parseYaml(yaml);

  // ── Test 1: Deduplication works ────────────────────────────────────────

  await test('Deduplication: identical titles from same source are filtered', async () => {
    const svc = new TopicResearchService();
    const articleA = { title: 'Best VPN for Nomads 2024', source: 'TechCrunch' };
    assert.strictEqual(svc.isDuplicate(articleA), false);
    svc.markSeen(articleA);
    assert.strictEqual(svc.isDuplicate(articleA), true);
  });

  await test('Deduplication: identical title from different source is kept', async () => {
    const svc = new TopicResearchService();
    const articleA = { title: 'Best VPN for Nomads 2024', source: 'TechCrunch' };
    const articleB = { title: 'Best VPN for Nomads 2024', source: 'Ars Technica' };
    svc.markSeen(articleA);
    assert.strictEqual(svc.isDuplicate(articleB), false);
  });

  await test('Deduplication: dedupArticles removes duplicates from array', async () => {
    const svc = new TopicResearchService();
    const articles = [
      { title: 'Test Article', source: 'A' },
      { title: 'Test Article', source: 'A' },
      { title: 'Another Article', source: 'B' },
      { title: 'Another Article', source: 'B' },
      { title: 'Unique Article', source: 'C' },
    ];
    const result = svc.dedupArticles(articles);
    assert.strictEqual(result.length, 3, 'Expected 3 unique, got ' + result.length);
  });

  // ── Test 2: Trending algorithm scores correctly ───────────────────────

  await test('Trending: getTrendingTopics returns scored topics array', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [
      { title: 'Top VPN Tools for Digital Nomads', description: 'privacy encryption tunnel anonymity', source: 'TestFeed', categories: ['VPN tools'], sourceId: null },
      { title: 'Best Co-Working Spaces in Bali', description: 'co-working shared workspace office space digital nomad hub', source: 'TestFeed', categories: ['Co-Working'], sourceId: null },
      { title: 'Nomad Visa Updates 2024', description: 'visa residency long-stay tax', source: 'TestFeed', categories: ['Visas'], sourceId: null },
    ];
    svc._rssFeeds = { feeds: [], _defaults: {} };
    svc._categories = loadedCategories;

    const topics = await svc.getTrendingTopics();
    assert.ok(Array.isArray(topics), 'Should return array');
    assert.ok(topics.length >= 2, 'Expected at least 2 topics (deduped), got ' + topics.length);
    for (const t of topics) {
      assert.ok(typeof t.predictedEngagement === 'number', 'predictedEngagement must be a number');
      assert.ok(t.relevanceScore >= 0, 'relevanceScore must be non-negative');
    }
  });

  await test('Trending: velocity scoring produces positive velocity for populated feeds', async () => {
    const svc = new TopicResearchService();
    svc._rssFeeds = { feeds: [], _defaults: {} };
    const articles = [
      { title: 'AI Tools for Remote Work', source: 'Feed1', pubDate: new Date().toISOString() },
      { title: 'AI Tools for Remote Work 2024', source: 'Feed2', pubDate: new Date().toISOString() },
    ];
    const v = svc.computeVelocity(articles, 1);
    assert.ok(v.count > 0, 'velocity count should be positive');
    assert.ok(v.velocity > 0, 'velocity should be positive');
  });

  await test('Trending: velocity is zero for empty array', async () => {
    const svc = new TopicResearchService();
    const v = svc.computeVelocity([], 24);
    assert.strictEqual(v.count, 0);
    assert.strictEqual(v.velocity, 0);
  });

  // ── Test 3: Feed health monitoring detects dead feeds ─────────────────

  await test('Health: recordFailure increments failure counter', async () => {
    const svc = new TopicResearchService();
    svc._rssFeeds = { feeds: [{ id: 'test-feed', active: true, name: 'Test', url: 'https://example.com/feed' }], _defaults: {} };
    svc._healthState = { feedFailures: {}, lastChecked: {} };
    await svc._recordFailure('test-feed');
    assert.strictEqual(svc._healthState.feedFailures['test-feed'], 1);
  });

  await test('Health: recordSuccess resets failure counter', async () => {
    const svc = new TopicResearchService();
    svc._rssFeeds = { feeds: [{ id: 'test-feed', active: true, name: 'Test', url: 'https://example.com/feed' }], _defaults: {} };
    svc._healthState = { feedFailures: { 'test-feed': 2 }, lastChecked: {} };
    await svc._recordSuccess('test-feed');
    assert.strictEqual(svc._healthState.feedFailures['test-feed'], 0);
  });

  await test('Health: feeds are deactivated after N consecutive failures', async () => {
    const svc = new TopicResearchService();
    const feedDef = { id: 'dead-feed', active: true, name: 'Dead Feed', url: 'https://example.com/dead' };
    svc._rssFeeds = { feeds: [feedDef], _defaults: { deadFeedThreshold: 3 } };
    svc._healthState = { feedFailures: {}, lastChecked: {} };

    for (let i = 0; i < 4; i++) {
      await svc._recordFailure('dead-feed');
    }
    assert.strictEqual(feedDef.active, false, 'Feed should be deactivated after threshold failures');
  });

  await test('Health: feed is NOT deactivated before threshold', async () => {
    const svc = new TopicResearchService();
    const feedDef = { id: 'still-alive', active: true, name: 'Alive Feed', url: 'https://example.com' };
    svc._rssFeeds = { feeds: [feedDef], _defaults: { deadFeedThreshold: 3 } };
    svc._healthState = { feedFailures: {}, lastChecked: {} };

    for (let i = 0; i < 2; i++) {
      await svc._recordFailure('still-alive');
    }
    assert.strictEqual(feedDef.active, true, 'Feed should remain active below threshold');
  });

  // ── Test 4: Daily digest outputs exactly 5 topics ranked by score ────

  await test('Daily digest: generateDailyDigest returns top N topics', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [
      { title: 'Topic A', description: 'visa travel nomad', source: 'F1', categories: ['Visas'], pubDate: new Date().toISOString() },
      { title: 'Topic B', description: 'vpn encryption privacy', source: 'F2', categories: ['VPN tools'], pubDate: new Date().toISOString() },
      { title: 'Topic C', description: 'coworking office space', source: 'F3', categories: ['Co-Working'], pubDate: new Date().toISOString() },
      { title: 'Topic D', description: 'AI automation productivity', source: 'F4', categories: ['AI tools'], pubDate: new Date().toISOString() },
      { title: 'Topic E', description: 'gear keyboard laptop', source: 'F5', categories: ['Gear'], pubDate: new Date().toISOString() },
      { title: 'Topic F', description: 'finance offshore banking crypto', source: 'F6', categories: ['Finance'], pubDate: new Date().toISOString() },
      { title: 'Topic G', description: 'security password manager 2FA', source: 'F7', categories: ['Security'], pubDate: new Date().toISOString() },
    ];
    svc._rssFeeds = { feeds: [{ id: 'F1', priority: 1 }, { id: 'F2', priority: 1 }, { id: 'F3', priority: 2 }, { id: 'F4', priority: 2 }, { id: 'F5', priority: 3 }, { id: 'F6', priority: 3 }, { id: 'F7', priority: 1 } ], _defaults: {} };
    svc._categories = loadedCategories;

    const digest = await svc.generateDailyDigest(5);
    assert.strictEqual(digest.topTopics.length, 5, 'Expected exactly 5 topics in digest, got ' + digest.topTopics.length);
    for (let i = 1; i < 5; i++) {
      assert.ok(
        digest.topTopics[i - 1].predictedEngagement >= digest.topTopics[i].predictedEngagement,
        'Rank ' + (i) + ' engagement should be >= rank ' + (i+1)
      );
    }
    const dateStr = digest.date;
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(dateStr), 'Date should be YYYY-MM-DD, got ' + dateStr);
  });

  await test('Daily digest: file is written to disk', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [{ title: 'Test topic', description: 'visa nomad', source: 'F1', categories: ['Visas'], pubDate: new Date().toISOString() }];
    svc._rssFeeds = { feeds: [], _defaults: {} };
    svc._categories = loadedCategories;
    await svc.generateDailyDigest(5);

    const today = new Date().toISOString().split('T')[0];
    const filePath = path.join(__dirname, '..', 'docs', 'income-channel', 'daily-topics', today + '.json');
    const exists = await fs.stat(filePath).then(() => true).catch(() => false);
    assert.strictEqual(exists, true, 'Daily digest file should exist at ' + filePath);
  });

  // ── Test 5: Viral news detection ─────────────────────────────────────

  await test('Viral: checkForViralNews returns empty when no cached topics', async () => {
    const svc = new TopicResearchService();
    const viral = svc.checkForViralNews();
    assert.ok(Array.isArray(viral));
    assert.strictEqual(viral.length, 0);
  });

  await test('Viral: checkForViralNews detects high-velocity items', async () => {
    const svc = new TopicResearchService();
    svc._trendingCache = [
      { title: 'Normal news', velocityScore: 0.1, predictedEngagement: 0.5 },
      { title: 'Normal news 2', velocityScore: 0.1, predictedEngagement: 0.4 },
      { title: 'VIRAL: AI takes over nomad work', velocityScore: 10.5, predictedEngagement: 0.95 },
    ];
    const viral = svc.checkForViralNews(2.0);
    assert.strictEqual(viral.length, 1, 'Should detect 1 viral item');
    assert.strictEqual(viral[0].title, 'VIRAL: AI takes over nomad work');
  });

  // ── Test 6: Relevance scoring ────────────────────────────────────────

  await test('Relevance: scores nomad-related text higher than generic text', async () => {
    const svc = new TopicResearchService();
    svc._categories = loadedCategories;

    const nomadResult = svc.scoreRelevance('Best VPN for Digital Nomads', 'vpn privacy encryption tunnel');
    const genericResult = svc.scoreRelevance('Random Tech News', 'some random words here');

    assert.ok(nomadResult.relevanceScore > genericResult.relevanceScore, 'Nomad score should exceed generic');
  });

  // ── Test 7: RSS feed config loads with sufficient sources ────────────

  await test('RSS Feeds: loads at least 10 configured sources', async () => {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'config', 'rss-feeds.json'), 'utf8'));
    assert.ok(config.feeds.length >= 10, 'Expected >= 10 feeds, got ' + config.feeds.length);
    for (const feed of config.feeds) {
      assert.ok(feed.url, 'Feed ' + feed.id + ' should have a URL');
      assert.ok(feed.name, 'Feed ' + feed.id + ' should have a name');
    }
  });

  // ── Test 8: categories.yaml loaded correctly ─────────────────────────

  await test('Categories: loads all 10 required categories', async () => {
    const requiredCats = [
      'vpn_tools', 'co_working', 'visas', 'gear', 'software',
      'finance', 'security', 'travel_tech', 'communication', 'ai_tools'
    ];
    for (const cat of requiredCats) {
      assert.ok(loadedCategories.categories && loadedCategories.categories[cat], 'Category "' + cat + '" should be present');
    }
  });

  // ── Test 9: contentAutoGen integration module exists and has correct API ──

  await test('Integration: contentAutoGen module has feedTopics function', async () => {
    const autoGen = require('../server/services/contentAutoGen.js');
    assert.strictEqual(typeof autoGen.feedTopics, 'function', 'feedTopics should be a function');
    assert.strictEqual(typeof autoGen.addTopicQueue, 'function', 'addTopicQueue should be a function');
    assert.strictEqual(typeof autoGen.processQueue, 'function', 'processQueue should be a function');
  });

  await test('Integration: feedTopics accepts topic array and queues them', async () => {
    const autoGen = require('../server/services/contentAutoGen.js');
    const topics = [
      { title: 'Test VPN Topic', source: 'test', predictedEngagement: 0.8 },
    ];
    const result = await autoGen.feedTopics(topics);
    assert.ok(result.queued >= 1, 'Should have queued at least 1 topic');
    autoGen.clearQueue();
  });

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
