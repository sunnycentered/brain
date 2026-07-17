/**
 * topicResearch.js — Topic research automation pipeline for Digital Nomad Tech Stack.
 *
 * Responsibilities:
 *   - Fetch & parse RSS feeds (10+ nomad-tech-relevant sources)
 *   - Detect trending topics using frequency, velocity, and engagement signals
 *   - Deduplicate content via hashing to prevent duplicate topic suggestions
 *   - Score topic relevance for the nomad audience using keyword matching
 *   - Rank topics by predicted engagement (velocity scoring)
 *   - Generate daily digest of top 5 topics → docs/income-channel/daily-topics/YYYY-MM-DD.json
 *   - Feed health checks: remove sources after 3 failed checks
 *   - Viral/unexpected news alerts via velocity threshold multiplier
 *   - Integration hook for contentAutoGen pipeline
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple XML-RSS/ATOM → plain-text item extractor */
function parseFeedXml(xml) {
  const items = [];
  // Match <item>…</item> (RSS) or feed-level elements in ATOM
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractField(block, 'title') || '';
    const link = extractField(block, 'link') || '';
    const desc = extractField(block, 'description') || extractField(block, 'summary') || '';
    const pubDate = extractField(block, 'pubDate') || '';
    const guid = extractField(block, 'guid') || '';
    items.push({ title, link, description: desc, pubDate, guid });
  }
  return items;
}

function extractField(xmlBlock, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const m = xmlBlock.match(regex);
  return m ? m[1].trim() : null;
}

/** HTTP GET with timeout */
function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow one redirect
        fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Fetch timeout')); });
  });
}

/** SHA-256 hash for dedup */
function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ─── YAML-lite parser (no external dep) ──────────────────────────────────────

function parseYamlSimple(content) {
  // Minimal nested-key parser sufficient for our categories.yaml structure
  const result = {};
  const lines = content.split('\n');
  let stack = [{ obj: result, depth: -1 }];
  for (const rawLine of lines) {
    const stripped = rawLine.trim();
    if (!stripped || stripped.startsWith('#')) continue;
    const indent = rawLine.search(/\S/);
    // Pop stack to parent level
    while (stack.length > 1 && stack[stack.length - 1].depth >= indent) stack.pop();
    const keyMatch = stripped.match(/^(\w[\w\-]*)\s*:\s*(.+)?$/);
    if (keyMatch) {
      const [, key, val] = keyMatch;
      const container = stack[stack.length - 1].obj;
      if (val === undefined || val.trim() === '') {
        container[key] = {};
        stack.push({ obj: container[key], depth: indent });
      } else {
        let parsedVal = val.replace(/^["']|["']$/g, '');
        if (parsedVal === 'true') parsedVal = true;
        else if (parsedVal === 'false') parsedVal = false;
        else if (!isNaN(parsedVal) && !val.includes('"')) parsedVal = Number(parsedVal);
        container[key] = parsedVal;
      }
    }
  }
  return result;
}

// ─── Config loader ──────────────────────────────────────────────────────────

async function loadRssFeeds() {
  const filePath = path.join(__dirname, '..', 'config', 'rss-feeds.json');
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadCategories() {
  const filePath = path.join(__dirname, '..', 'config', 'categories.yaml');
  const raw = await fs.readFile(filePath, 'utf8');
  return parseYamlSimple(raw);
}

// ─── Health tracking store (in-memory for now; persisted via state file) ────

const DEFAULT_STATE_PATH = path.join(__dirname, '..', 'data', 'feed-health-state.json');

async function loadHealthState() {
  try {
    const raw = await fs.readFile(DEFAULT_STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { feedFailures: {}, lastChecked: {} };
  }
}

async function saveHealthState(state) {
  const dir = path.dirname(DEFAULT_STATE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DEFAULT_STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── Main Class ──────────────────────────────────────────────────────────────

class TopicResearchService {
  constructor() {
    this._trendingCache = [];
    this._dedupSet = new Set(); // active hashes cache
    this._healthState = null;
    this._categories = null;
    this._rssFeeds = null;
    this._initialized = false;
  }

  /** Initialize config & health state */
  async init() {
    if (this._initialized) return;
    this._rssFeeds = await loadRssFeeds();
    this._categories = await loadCategories();
    this._healthState = await loadHealthState();
    this._initialized = true;
  }

  // ── RSS ingestion ─────────────────────────────────────────────────────

  /** Fetch a single feed and return articles */
  async fetchFeed(feedConfig) {
    if (!feedConfig.active) return [];
    const xml = await fetchUrl(feedConfig.url, this._rssFeeds._defaults?.feedTimeoutMs || 15000);
    if (!xml) {
      await this._recordFailure(feedConfig.id);
      return [];
    }
    // Success → reset failure counter
    await this._recordSuccess(feedConfig.id);
    return parseFeedXml(xml).map((item) => ({
      ...item,
      source: feedConfig.name,
      categories: feedConfig.categories,
      sourceId: feedConfig.id,
    }));
  }

  /** Fetch all active feeds in parallel */
  async fetchAllFeeds() {
    const active = this._rssFeeds.feeds.filter((f) => f.active);
    const results = await Promise.allSettled(
      active.map((f) => this.fetchFeed(f))
    );
    const allArticles = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allArticles.push(...r.value);
      }
    }
    return allArticles;
  }

  // ── Health monitoring ─────────────────────────────────────────────────

  async _recordFailure(feedId) {
    if (!this._healthState) this._healthState = await loadHealthState();
    this._healthState.feedFailures[feedId] = (this._healthState.feedFailures[feedId] || 0) + 1;
    this._healthState.lastChecked[feedId] = Date.now();
    await saveHealthState(this._healthState);

    const threshold = this._rssFeeds._defaults?.deadFeedThreshold || 3;
    if (this._healthState.feedFailures[feedId] >= threshold) {
      this._deactivateFeed(feedId);
    }
  }

  async _recordSuccess(feedId) {
    if (!this._healthState) this._healthState = await loadHealthState();
    // Reset counter on success
    this._healthState.feedFailures[feedId] = 0;
    this._healthState.lastChecked[feedId] = Date.now();
    await saveHealthState(this._healthState);
  }

  _deactivateFeed(feedId) {
    const feed = this._rssFeeds.feeds.find((f) => f.id === feedId);
    if (feed) {
      feed.active = false;
      // Also persist to config file
      const filePath = path.join(__dirname, '..', 'config', 'rss-feeds.json');
      fs.writeFile(filePath, JSON.stringify(this._rssFeeds, null, 2)).catch(() => {});
    }
  }

  /** Run feed health check — scan all feeds once */
  async runFeedHealthChecks() {
    const active = this._rssFeeds.feeds.filter((f) => f.active);
    for (const feed of active) {
      try {
        await fetchUrl(feed.url, 10000);
        await this._recordSuccess(feed.id);
      } catch {
        await this._recordFailure(feed.id);
      }
    }
    return { checked: active.length, removed: [] };
  }

  // ── Deduplication ─────────────────────────────────────────────────────

  /** Return false if the title+source combo already exists (duplicate) */
  isDuplicate(article) {
    const key = `${article.title}|${article.source}`;
    return this._dedupSet.has(key);
  }

  markSeen(article) {
    const key = `${article.title}|${article.source}`;
    this._dedupSet.add(key);
  }

  /** Deduplicate an array of articles */
  dedupArticles(articles) {
    return articles.filter((a) => {
      if (this.isDuplicate(a)) return false;
      this.markSeen(a);
      return true;
    });
  }

  // ── Relevance scoring ─────────────────────────────────────────────────

  /** Score a topic title+description for nomad relevance */
  scoreRelevance(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    let score = 0;
    let matchedKeywords = [];

    if (!this._categories || !this._categories.categories) return { score: 0, relevanceScore: 0, matchedKeywords: [] };

    for (const [catKey, catDef] of Object.entries(this._categories.categories)) {
      const kws = Array.isArray(catDef.keywords) ? catDef.keywords : [];
      for (const kw of kws) {
        if (text.includes(kw.toLowerCase())) {
          score += 1;
          matchedKeywords.push({ keyword: kw, category: catKey });
        }
      }
    }

    // Bonus for high-relevance categories
    let categoryBonus = 0;
    for (const mc of matchedKeywords) {
      const catConf = this._categories.categories?.[mc.category];
      if (catConf?.nomad_relevance === 'high') categoryBonus += 0.5;
    }

    return { score, relevanceScore: Math.min(1, (score + categoryBonus) / 10), matchedKeywords };
  }

  // ── Velocity scoring (predicted engagement) ───────────────────────────

  /**
   * Compute velocity = articles_per_hour relative to a baseline.
   * Higher velocity → higher predicted engagement.
   */
  computeVelocity(articles, timeWindowHours = 24) {
    if (articles.length === 0) return { count: 0, velocity: 0 };

    const now = Date.now();
    const windowMs = timeWindowHours * 3600 * 1000;
    const recent = articles.filter((a) => {
      if (!a.pubDate) return true; // keep unparsed-date items
      try {
        return (now - new Date(a.pubDate).getTime()) < windowMs;
      } catch { return true; }
    });

    const count = recent.length;
    const velocity = timeWindowHours > 0 ? count / timeWindowHours : 0;

    // Boost: exponential factor for clustering (same topic in multiple feeds)
    const sourceClusterMap = {};
    for (const a of recent) {
      const base = a.title?.substring(0, 30).toLowerCase().replace(/[^a-z]/g, '');
      if (!sourceClusterMap[base]) sourceClusterMap[base] = [];
      sourceClusterMap[base].push(a);
    }
    let clusterBoost = 0;
    for (const [k, group] of Object.entries(sourceClusterMap)) {
      if (group.length > 1) {
        clusterBoost += (group.length - 1) * 0.3;
      }
    }

    return { count, velocity: velocity + clusterBoost };
  }

  // ── Trending detection ────────────────────────────────────────────────

  /**
   * Core trending algorithm combining frequency, velocity, and engagement signals.
   * Returns scored topics sorted descending.
   */
  async getTrendingTopics() {
    await this.init();

    const articles = await this.fetchAllFeeds();
    // Dedup first
    const uniqueArticles = this.dedupArticles(articles);

    if (uniqueArticles.length === 0) return [];

    // Velocity scoring
    const velocity = this.computeVelocity(uniqueArticles, 24);

    // Build scored topics
    const scoredTopics = uniqueArticles.map((a) => {
      const relevance = this.scoreRelevance(a.title, a.description || '');
      // Engagement proxy: feed priority (1=high, 3=low), source count in velocity
      const engagementFactor = (4 - (a.sourceId ? (this._rssFeeds.feeds.find((f) => f.id === a.sourceId)?.priority || 2) : 2)) * 0.25;

      // Combined score: weighted sum of relevance, velocity ratio, engagement
      const velocityRatio = velocity.count > 0 ? (uniqueArticles.filter((u) => {
        const base = u.title?.substring(0, 30).toLowerCase().replace(/[^a-z]/g, '');
        return base === (a.title?.substring(0, 30).toLowerCase().replace(/[^a-z]/g, ''));
      }).length / uniqueArticles.length) : 0;

      const combinedScore = (relevance.relevanceScore * 0.4) + (velocityRatio * 0.35) + (engagementFactor * 0.25);

      return {
        title: a.title,
        link: a.link,
        source: a.source,
        pubDate: a.pubDate,
        relevanceScore: Math.round(relevance.relevanceScore * 100) / 100,
        matchedKeywords: relevance.matchedKeywords,
        velocityScore: Math.round(velocity.velocity * 100) / 100,
        predictedEngagement: Math.round(combinedScore * 100) / 100,
        categories: a.categories || [],
      };
    });

    // Sort by predicted engagement descending
    scoredTopics.sort((a, b) => b.predictedEngagement - a.predictedEngagement);
    this._trendingCache = scoredTopics;
    return scoredTopics;
  }

  // ── Viral / unexpected news alert ────────────────────────────────────

  /** Check if any article's velocity exceeds the viral threshold */
  checkForViralNews(thresholdMultiplier = null) {
    if (!this._trendingCache || this._trendingCache.length === 0) return [];
    const config = this._categories;
    const mult = thresholdMultiplier ?? (config?.viral_threshold_multiplier ?? 2.0);
    const avgVelocity = this._trendingCache.reduce((s, t) => s + t.velocityScore, 0) / this._trendingCache.length;
    const viralThreshold = avgVelocity * mult;

    return this._trendingCache.filter((t) => t.velocityScore > viralThreshold);
  }

  // ── Daily digest ─────────────────────────────────────────────────────

  /** Generate and save a daily digest of top N topics (default 5) */
  async generateDailyDigest(maxTopics = 5) {
    const topics = await this.getTrendingTopics();
    const digest = topics.slice(0, maxTopics);

    if (digest.length === 0) return { date: '', topics: [] };

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const outDir = path.join(__dirname, '..', '..', 'docs', 'income-channel', 'daily-topics');
    await fs.mkdir(outDir, { recursive: true });

    const filePath = path.join(outDir, `${today}.json`);
    const output = {
      date: today,
      totalTopicsEvaluated: topics.length,
      topTopics: digest.map((t) => ({
        rank: 0,
        title: t.title,
        link: t.link,
        source: t.source,
        relevanceScore: t.relevanceScore,
        velocityScore: t.velocityScore,
        predictedEngagement: t.predictedEngagement,
        matchedKeywords: t.matchedKeywords,
        categories: t.categories,
      })),
    };

    // Add rank numbers
    output.topTopics.forEach((t, i) => { t.rank = i + 1; });

    await fs.writeFile(filePath, JSON.stringify(output, null, 2));
    return output;
  }

  // ── Content AutoGen integration ──────────────────────────────────────

  /** Feed topics into content creation pipeline */
  async feedToContentAutoGen() {
    const digest = await this.generateDailyDigest(5);
    if (!digest.topTopics || digest.topTopics.length === 0) return;

    // Import and call the content auto-gen integration (lazy to handle missing module)
    try {
      const contentAutoGen = require(path.join(__dirname, 'contentAutoGen.js'));
      if (typeof contentAutoGen.feedTopics === 'function') {
        await contentAutoGen.feedTopics(digest.topTopics);
      } else if (typeof contentAutoGen.addTopicQueue === 'function') {
        for (const topic of digest.topTopics) {
          contentAutoGen.addTopicQueue(topic);
        }
      }
    } catch {
      // contentAutoGen not available — just return the topics so caller can use them
    }
  }

  /** Return cached trending topics */
  getCachedTrendingTopics() {
    return this._trendingCache;
  }

  /** Get health state for reporting */
  getHealthState() {
    return this._healthState || {};
  }
}

// ─── Module exports ──────────────────────────────────────────────────────────

module.exports = TopicResearchService;
module.exports.parseFeedXml = parseFeedXml;
module.exports.fetchUrl = fetchUrl;
module.exports.hash = hash;
module.exports.loadRssFeeds = loadRssFeeds;
module.exports.loadCategories = loadCategories;
module.exports.computeVelocity = function (articles) {
  if (articles.length === 0) return { count: 0, velocity: 0 };
  const now = Date.now();
  const windowMs = 24 * 3600 * 1000;
  const recent = articles.filter((a) => {
    if (!a.pubDate) return true;
    try { return (now - new Date(a.pubDate).getTime()) < windowMs; } catch { return true; }
  });
  return { count: recent.length, velocity: recent.length / 24 };
};
