/**
 * test/topicResearch.test.js — Unit tests for TopicResearchService.
 *
 * Verifies:
 *   - Deduplication works correctly (via SHA-256 content hashing)
 *   - Trending algorithm scores topics properly (frequency, velocity, engagement)
 *   - Feed health monitoring detects dead feeds
 *   - Daily digest outputs exactly 5 topics ranked by score
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;
const TopicResearchService = require('../server/services/topicResearch.js');
const { contentHash, scoreNomadRelevance } = require('../server/services/topicResearch.js');

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

function pass(name) {
  passed++;
  console.log('  ✓ ' + name);
}

function fail(name, msg) {
  failed++;
  console.error('  ✗ ' + name);
  if (msg) console.error('    ' + msg);
}

async function test(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (e) {
    fail(name, e.message);
  }
}

async function run() {
  console.log('\n=== Topic Research Service Tests ===\n');

  // Load categories once for all tests
  const yaml = fs.readFileSync(path.join(__dirname, '..', 'server', 'config', 'categories.yaml'), 'utf8');
  const loadedCategories = parseYaml(yaml);

  // ── Test 1: Deduplication via SHA-256 content hashing ──────────────────

  await test('Deduplication: identical titles+links produce same hash', async () => {
    const h1 = contentHash('Best VPN for Nomads', 'https://example.com/vpn');
    const h2 = contentHash('Best VPN for Nomads', 'https://example.com/vpn');
    assert.strictEqual(h1, h2);
  });

  await test('Deduplication: different titles produce different hashes', async () => {
    const h1 = contentHash('Best VPN for Nomads', 'https://example.com/vpn');
    const h2 = contentHash('Best Laptop Deals', 'https://example.com/laptop');
    assert.notStrictEqual(h1, h2);
  });

  await test('Deduplication: hash is stable and non-empty', async () => {
    const h = contentHash('Test Article', 'https://test.com');
    assert.ok(h && h.length > 0, 'hash should be non-empty');
    assert.strictEqual(h.length, 64, 'SHA-256 hex should be 64 chars');
  });

  await test('Deduplication: TopicResearch dedupArticles removes duplicates', async () => {
    const svc = new TopicResearchService();
    const articles = [
      { title: 'Test Article', link: 'https://a.com/1' },
      { title: 'Test Article', link: 'https://b.com/2' },  // different link → not deduped by URL hash
      { title: 'Test Article', link: 'https://a.com/1' },  // exact duplicate → removed
    ];
    const result = svc.dedupArticles(articles);
    assert.strictEqual(result.length, 2, 'Expected 2 unique, got ' + result.length);
  });

  await test('Deduplication: isDuplicate detects duplicates correctly', async () => {
    const svc = new TopicResearchService();
    const article = { title: 'Test', link: 'https://x.com' };
    assert.strictEqual(svc.isDuplicate(article), false);
    svc.markSeen(article);
    assert.strictEqual(svc.isDuplicate(article), true);
  });

  // ── Test 2: Trending algorithm scores correctly ───────────────────────

  await test('Trending: getTrendingTopics returns scored topics array', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [
      { title: 'Top VPN Tools for Digital Nomads', description: 'vpn privacy encryption tunnel', source: 'TestFeed', categories: ['VPN tools'], sourceId: null },
      { title: 'Best Co-Working Spaces in Bali', description: 'co-working shared workspace office space digital nomad hub', source: 'TestFeed', categories: ['Co-Working'], sourceId: null },
      { title: 'Nomad Visa Updates 2024', description: 'visa residency long-stay tax', source: 'TestFeed', categories: ['Visas'], sourceId: null },
    ];
    svc._rssFeeds = { feeds: [], _defaults: {} };

    const topics = await svc.getTrendingTopics(5);
    assert.ok(Array.isArray(topics), 'Should return array');
    assert.ok(topics.length >= 1, 'Expected at least 1 topic (deduped), got ' + topics.length);
    for (const t of topics) {
      assert.ok(typeof t.predictedEngagement === 'number', 'predictedEngagement must be a number');
      assert.ok(t.relevanceScore != null, 'relevanceScore should exist');
    }
  });

  await test('Trending: velocity scoring produces positive velocity for populated feeds', async () => {
    const articles = [
      { title: 'AI Tools for Remote Work', description: 'ai assistant automation prompt', pubDate: new Date().toISOString() },
      { title: 'AI Tools for Digital Nomads 2024', description: 'chatgpt claude productivity', pubDate: new Date().toISOString() },
    ];
    const v = TopicResearchService.computeVelocity(articles, 1);
    assert.ok(v.count > 0, 'velocity count should be positive');
    assert.ok(v.velocity > 0, 'velocity should be positive');
  });

  await test('Trending: velocity is zero for empty array', async () => {
    const v = TopicResearchService.computeVelocity([], 24);
    assert.strictEqual(v.count, 0);
    assert.strictEqual(v.velocity, 0);
  });

  await test('Trending: getTrendingTopics respects maxResults param', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [
      { title: 'A1 vpn nomad', description: 'vpn privacy', source: 'F1', categories: [], sourceId: null },
      { title: 'A2 coworking bali', description: 'coworking office', source: 'F2', categories: [], sourceId: null },
      { title: 'A3 visa nomad', description: 'visa travel', source: 'F3', categories: [], sourceId: null },
      { title: 'A4 gear laptop', description: 'laptop backpack', source: 'F4', categories: [], sourceId: null },
    ];
    svc._rssFeeds = { feeds: [], _defaults: {} };

    const topics5 = await svc.getTrendingTopics(5);
    assert.ok(topics5.length >= 1, 'Should return some topics');

    // Reset dedup set for fresh call
    const svc2 = new TopicResearchService();
    svc2.fetchAllFeeds = async () => [
      { title: 'B1 vpn nomad', description: 'vpn privacy', source: 'F1', categories: [], sourceId: null },
      { title: 'B2 coworking bali', description: 'coworking office', source: 'F2', categories: [], sourceId: null },
      { title: 'B3 visa nomad', description: 'visa travel', source: 'F3', categories: [], sourceId: null },
    ];
    svc2._rssFeeds = { feeds: [], _defaults: {} };
    const topics2 = await svc2.getTrendingTopics(2);
    assert.strictEqual(topics2.length, 2, 'Expected exactly 2 topics for maxResults=2');
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
      { title: 'Topic A', description: 'visa travel nomad remote work', source: 'F1', categories: ['Visas'], pubDate: new Date().toISOString() },
      { title: 'Topic B', description: 'vpn encryption privacy nomad', source: 'F2', categories: ['VPN tools'], pubDate: new Date().toISOString() },
      { title: 'Topic C', description: 'coworking office space nomad hub', source: 'F3', categories: ['Co-Working'], pubDate: new Date().toISOString() },
      { title: 'Topic D', description: 'AI automation productivity nomad work', source: 'F4', categories: ['AI tools'], pubDate: new Date().toISOString() },
      { title: 'Topic E', description: 'gear keyboard laptop nomad backpack', source: 'F5', categories: ['Gear'], pubDate: new Date().toISOString() },
      { title: 'Topic F', description: 'finance offshore banking crypto nomad', source: 'F6', categories: ['Finance'], pubDate: new Date().toISOString() },
      { title: 'Topic G', description: 'security password manager 2FA nomad privacy', source: 'F7', categories: ['Security'], pubDate: new Date().toISOString() },
    ];
    svc._rssFeeds = { feeds: [{ id: 'F1', priority: 1 }, { id: 'F2', priority: 1 }, { id: 'F3', priority: 2 }, { id: 'F4', priority: 2 }, { id: 'F5', priority: 3 }, { id: 'F6', priority: 3 }, { id: 'F7', priority: 1 }], _defaults: {} };

    const digest = await svc.generateDailyDigest(5);
    assert.strictEqual(digest.topTopics.length, 5, 'Expected exactly 5 topics in digest, got ' + digest.topTopics.length);
    // Verify ranking: first should have highest predictedEngagement
    for (let i = 1; i < 5; i++) {
      assert.ok(
        digest.topTopics[i - 1].predictedEngagement >= digest.topTopics[i].predictedEngagement,
        'Rank ' + i + ' engagement (' + digest.topTopics[i - 1].predictedEngagement + ') should be >= rank ' + (i+1) + ' (' + digest.topTopics[i].predictedEngagement + ')'
      );
    }
    // Verify date is correct format
    const dateStr = digest.date;
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(dateStr), 'Date should be YYYY-MM-DD, got ' + dateStr);
  });

  await test('Daily digest: file is written to disk', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [{ title: 'Test topic', description: 'visa nomad remote work', source: 'F1', categories: ['Visas'], pubDate: new Date().toISOString() }];
    svc._rssFeeds = { feeds: [], _defaults: {} };
    await svc.generateDailyDigest(5);

    const today = new Date().toISOString().split('T')[0];
    const filePath = path.join(__dirname, '..', 'docs', 'income-channel', 'daily-topics', today + '.json');
    const stat = await fsPromises.stat(filePath).catch(() => null);
    assert.ok(stat !== null, 'Daily digest file should exist at ' + filePath);
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
    svc._rssFeeds = { _defaults: {} };
    // Pre-seed trending cache with varied velocities
    svc._trendingCache = [
      { title: 'Normal news', velocityScore: 0.1, predictedEngagement: 0.5 },
      { title: 'Normal news 2', velocityScore: 0.1, predictedEngagement: 0.4 },
      { title: 'VIRAL: AI takes over nomad work', velocityScore: 10.5, predictedEngagement: 0.95 },
    ];
    const viral = svc.checkForViralNews(2.0);
    assert.strictEqual(viral.length, 1, 'Should detect 1 viral item');
    assert.strictEqual(viral[0].title, 'VIRAL: AI takes over nomad work');
  });

  // ── Test 6: Relevance scoring for nomad audience filterability ────────

  await test('Relevance: scores nomad-related text higher than generic text', async () => {
    const nomadResult = scoreNomadRelevance('Best VPN for Digital Nomads', 'vpn privacy encryption tunnel remote work');
    const genericResult = scoreNomadRelevance('Random Tech News', 'some random words here today');

    assert.ok(nomadResult.relevanceScore > genericResult.relevanceScore,
      'Nomad score (' + nomadResult.relevanceScore + ') should exceed generic (' + genericResult.relevanceScore + ')');
    assert.ok(nomadResult.matchedKeywords.length > 0, 'Nomad topic should have matched keywords');
    assert.ok(nomadResult.score > 0, 'Nomad score should be positive');
  });

  await test('Relevance: returns zero for unrelated content', async () => {
    const result = scoreNomadRelevance('Local Restaurant Review', 'pizza is delicious downtown');
    assert.strictEqual(result.relevanceScore, 0, 'Should have zero relevance for local restaurant');
    assert.strictEqual(result.score, 0, 'Score should be 0');
  });

  // ── Test 7: RSS feed config loads with sufficient sources ────────────

  await test('RSS Feeds: loads at least 10 configured sources', async () => {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'config', 'rss-feeds.json'), 'utf8'));
    assert.ok(config.feeds.length >= 10, 'Expected >= 10 feeds, got ' + config.feeds.length);
    for (const feed of config.feeds) {
      assert.ok(feed.url, 'Feed ' + feed.id + ' should have a URL');
      assert.ok(feed.name, 'Feed ' + feed.id + ' should have a name');
      assert.strictEqual(typeof feed.active === 'boolean', true, 'Feed ' + feed.id + ' should have active as boolean');
    }
  });

  // ── Test 8: categories.yaml loaded correctly with all required categories ──

  await test('Categories: loads all 10 required categories', async () => {
    const requiredCats = [
      'vpn_tools', 'co_working', 'visas', 'gear', 'software',
      'finance', 'security', 'travel_tech', 'communication', 'ai_tools'
    ];
    for (const cat of requiredCats) {
      assert.ok(loadedCategories.categories && loadedCategories.categories[cat], 'Category "' + cat + '" should be present');
      assert.ok(loadedCategories.categories[cat].keywords_str, 'Category "' + cat + '" should have keywords_str');
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

  // ── Test 10: getTopicsForDraft returns draft-ready topics ────────────

  await test('Integration: getTopicsForDraft returns enriched topic objects', async () => {
    const svc = new TopicResearchService();
    svc.fetchAllFeeds = async () => [{ title: 'Nomad AI Tools', description: 'AI assistant chatgpt automation nomad work remote', source: 'F1', categories: ['AI tools'], sourceId: null }];
    svc._rssFeeds = { feeds: [], _defaults: {} };

    const drafts = await svc.getTopicsForDraft(3);
    assert.ok(Array.isArray(drafts) && drafts.length >= 1, 'Should return drafted topics');
    if (drafts.length > 0) {
      assert.ok(drafts[0].draftReady === true, 'topic should be draft-ready');
      assert.ok(Array.isArray(drafts[0].keywordTags), 'topic should have keywordTags');
      assert.ok(typeof drafts[0].recommendedTone === 'string', 'topic should have recommendedTone');
    }
  });

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
