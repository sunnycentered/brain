/**
 * topicResearch.js — Topic research automation pipeline for Digital Nomad Tech Stack.
 *
 * Responsibilities:
 *   - Fetch & parse RSS feeds (10+ nomad-tech-relevant sources)
 *   - Detect trending topics using frequency, velocity, and engagement signals
 *   - Deduplicate content via SHA-256 hashing to prevent duplicate topic suggestions
 *   - Score topic relevance for the nomad audience using keyword matching
 *   - Rank topics by predicted engagement (velocity scoring)
 *   - Generate daily digest of top 5 topics → docs/income-channel/daily-topics/YYYY-MM-DD.json
 *   - Feed health checks: remove sources after 3 failed checks
 *   - Viral/unexpected news alerts via velocity threshold multiplier (3x normal = alert)
 *   - Integration hook for contentAutoGen pipeline via getTopicsForDraft()
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize article title + URL into a canonical string for hashing */
function normalizeForHash(title, url) {
  const normalizedTitle = (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // strip punctuation
    .replace(/\s+/g, ' ');        // collapse whitespace
  const normalizedUrl = (url || '').toLowerCase().trim();
  return `${normalizedTitle}|${normalizedUrl}`;
}

/** SHA-256 content hash of normalized title + URL for deduplication */
function contentHash(title, url) {
  const normalized = normalizeForHash(title, url);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

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

/** SHA-256 hash for general use */
function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ─── YAML-lite parser (no external dep) ──────────────────────────────────────

function parseYamlSimple(content) {
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

// ─── Nomad audience filter keywords (Criterion #4) ──────────────────────────

const NOMAD_AUDIENCE_KEYWORDS = [
  'nomad', 'remote work', 'digital nomad', 'travel',
  'freelancer', 'location-independent'
];

/** Tool-specific keywords for deeper relevance scoring */
const TOOL_SPECIFIC_KEYWORDS = {
  vpn: ['vpn', 'privacy', 'encryption', 'tunnel', 'anonymity'],
  coworking: ['co-working', 'coworking', 'office space', 'workation'],
  visa: ['visa', 'residency', 'immigration', 'border runs'],
  gear: ['laptop', 'portable monitor', 'noise canceling', 'backpack', 'power bank'],
  software: ['saas', 'productivity', 'notion', 'slack', 'zoom', 'figma'],
  finance: ['expatriate tax', 'offshore banking', 'wise', 'revolut', 'crypto', 'stablecoin'],
  security: ['cybersecurity', '2fa', 'password manager', 'phishing', 'firewall'],
  travel_tech: ['esim', 'wifi router', 'portable internet', 'nomad insurance'],
  communication: ['discord', 'whatsapp', 'telegram', 'signal messenger', 'translator app'],
  ai_tools: ['ai assistant', 'chatgpt', 'claude', 'gemini', 'midjourney', 'automation']
};

/** Score a title+description for nomad relevance using keyword matching */
function scoreNomadRelevance(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  const matchedKeywords = [];
  const categoriesMatched = {};

  // Nomad-audience keywords (Criterion #4 requirement)
  for (const kw of NOMAD_AUDIENCE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 1.5;  // High base weight for nomad-core terms
      matchedKeywords.push({ keyword: kw, category: 'nomad_core', relevanceWeight: 1.5 });
    }
  }

  // Tool-specific keywords with weighted scoring
  let toolRelevanceScore = 0;
  for (const [category, kws] of Object.entries(TOOL_SPECIFIC_KEYWORDS)) {
    let catScore = 0;
    for (const kw of kws) {
      if (text.includes(kw.toLowerCase())) {
        const weight = 1.0;
        catScore += weight;
        matchedKeywords.push({ keyword: kw, category, relevanceWeight: weight });
      }
    }
    toolRelevanceScore += catScore;
    categoriesMatched[category] = catScore;
  }

  // Normalize to 0–1 scale
  const totalPossible = NOMAD_AUDIENCE_KEYWORDS.length * 1.5 + Object.values(TOOL_SPECIFIC_KEYWORDS).flat().length;
  const relevanceScore = Math.min(1, (score + toolRelevanceScore) / totalPossible);

  return { score: Math.round((score + toolRelevanceScore) * 100) / 100, relevanceScore: Math.round(relevanceScore * 1000) / 1000, matchedKeywords, categoriesMatched };
}

// ─── Main Class ──────────────────────────────────────────────────────────────

class TopicResearchService {
  constructor() {
    this._trendingCache = [];
    this._dedupSet = new Map();    // hash → article reference for SHA-256 dedup
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
      categories: feedConfig.categories || [],
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

  // ── Health monitoring (Criterion #6) ──────────────────────────────────

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
    if (feed && !feed.active) return; // already inactive, skip
    if (feed) {
      feed.active = false;
      // Persist deactivation to config file
      const filePath = path.join(__dirname, '..', 'config', 'rss-feeds.json');
      fs.writeFile(filePath, JSON.stringify(this._rssFeeds, null, 2)).catch(() => {});
    }
  }

  /** Run feed health check — scan all feeds once */
  async runFeedHealthChecks() {
    const active = this._rssFeeds.feeds.filter((f) => f.active);
    let removed = [];
    for (const feed of active) {
      try {
        await fetchUrl(feed.url, 10000);
        await this._recordSuccess(feed.id);
      } catch {
        await this._recordFailure(feed.id);
        // Check if it was just deactivated in this iteration
        const state = await loadHealthState();
        if (state.feedFailures[feed.id] && state.feedFailures[feed.id] >= (this._rssFeeds._defaults?.deadFeedThreshold || 3)) {
          removed.push(feed.id);
        }
      }
    }
    return { checked: active.length, removed };
  }

  // ── Deduplication via SHA-256 content hashing (Criterion #3) ───────────

  /** Generate dedup key using SHA-256 of normalized title + URL */
  _makeDedupKey(article) {
    return contentHash(article.title, article.link || article.url);
  }

  isDuplicate(article) {
    const key = this._makeDedupKey(article);
    return this._dedupSet.has(key);
  }

  markSeen(article) {
    const key = this._makeDedupKey(article);
    this._dedupSet.set(key, article);
  }

  /** Deduplicate an array of articles using SHA-256 content hashing */
  dedupArticles(articles) {
    return articles.filter((a) => {
      const key = this._makeDedupKey(a);
      if (this._dedupSet.has(key)) return false;
      this._dedupSet.set(key, a);
      // Also persist to state so dedup survives across sessions
      this._ensurePersisted();
      return true;
    });
  }

  /** Ensure a persisted dedup state file exists on disk */
  _ensurePersisted() {
    try {
      const dedupStatePath = path.join(__dirname, '..', 'data', 'dedup-state.json');
      const entries = [];
      for (const [k, v] of this._dedupSet) {
        entries.push({ hash: k, title: v.title, source: v.source });
      }
      fs.writeFile(dedupStatePath, JSON.stringify(entries.slice(0, 1000), null, 2)).catch(() => {});
    } catch { /* best-effort */ }
  }

  // ── Relevance scoring (Criterion #4) ──────────────────────────────────

  /** Score a topic title+description for nomad relevance using keyword matching */
  scoreRelevance(title, description) {
    return scoreNomadRelevance(title, description);
  }

  // ── Velocity scoring for predicted engagement (Criterion #7) ───────────

  /**
   * Compute velocity = articles_per_hour relative to a time window.
   * Returns velocity as mentions/hour * keyword_relevance_weight.
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
    let velocity = timeWindowHours > 0 ? count / timeWindowHours : 0;

    // Keyword relevance weight multiplier per article (boost from Criterion #4 scoring)
    for (const a of recent) {
      const rel = scoreNomadRelevance(a.title, a.description || '');
      velocity *= (1 + rel.relevanceScore * 0.5); // up to 1.5x boost
    }

    // Cluster boost: articles on same topic from multiple sources
    const sourceClusterMap = {};
    for (const a of recent) {
      const base = (a.title || '').substring(0, 30).toLowerCase().replace(/[^a-z]/g, '');
      if (!sourceClusterMap[base]) sourceClusterMap[base] = [];
      sourceClusterMap[base].push(a);
    }
    for (const [k, group] of Object.entries(sourceClusterMap)) {
      if (group.length > 1) {
        velocity += (group.length - 1) * 0.3; // +0.3 per extra source
      }
    }

    return { count, velocity: Math.round(velocity * 100) / 100 };
  }

  // ── Trending detection (Criterion #2) ───────────────────────────────────

  /**
   * Core trending algorithm combining frequency, velocity, and engagement signals.
   * Returns top 5 scored topics sorted descending by predictedEngagement.
   */
  async getTrendingTopics(maxResults = 5) {
    await this.init();
    // Fresh cache per call
    this._dedupSet.clear();

    const articles = await this.fetchAllFeeds();
    const uniqueArticles = this.dedupArticles(articles);

    if (uniqueArticles.length === 0) return [];

    // Velocity scoring for the time window
    const velocityOverall = this.computeVelocity(uniqueArticles, 24);

    // Build scored topics
    const scoredTopics = uniqueArticles.map((a) => {
      const relevance = scoreNomadRelevance(a.title, a.description || '');

      // Engagement proxy: feed priority (1=high → +0.5, 3=low → +0), source count in velocity
      const feedEntry = this._rssFeeds.feeds.find((f) => f.id === a.sourceId);
      const priorityWeight = feedEntry?.priority ? (4 - Math.min(feedEntry.priority, 3)) * 0.25 : 0;

      // Frequency ratio: how many other articles share a similar title stem
      const stem = (a.title || '').substring(0, 30).toLowerCase().replace(/[^a-z]/g, '');
      const frequencyCount = uniqueArticles.filter((u) => {
        const uStem = (u.title || '').substring(0, 30).toLowerCase().replace(/[^a-z]/g, '');
        return uStem === stem;
      }).length;
      const frequencyRatio = frequencyCount / uniqueArticles.length;

      // Combined score: weighted sum of relevance, velocity ratio, frequency, engagement
      const combinedScore =
        (relevance.relevanceScore * 0.4) +          // 40% keyword/nomad relevance
        (frequencyRatio * 0.35) +                     // 35% cross-source frequency
        (priorityWeight * 0.25);                      // 25% feed priority

      return {
        title: a.title,
        link: a.link,
        source: a.source,
        pubDate: a.pubDate,
        relevanceScore: relevance.relevanceScore,
        matchedKeywords: relevance.matchedKeywords,
        velocityScore: velocityOverall.velocity,
        frequencyCount,
        frequencyRatio: Math.round(frequencyRatio * 100) / 100,
        predictedEngagement: Math.round(combinedScore * 100) / 100,
        categories: a.categories || [],
        _stem: stem,   // internal, for dedup within this run
      };
    });

    // Sort by predicted engagement descending
    scoredTopics.sort((a, b) => b.predictedEngagement - a.predictedEngagement);

    // Return top N (default 5 — Criterion #2 requirement)
    const result = scoredTopics.slice(0, maxResults);
    this._trendingCache = result;
    return result;
  }

  // ── Viral / unexpected news alert (Criterion #10) ───────────────────────

  /**
   * Check if any article's velocity exceeds the viral threshold.
   * Default: 3x normal average velocity = alert (Criterion #10).
   */
  checkForViralNews(thresholdMultiplier = null) {
    if (!this._trendingCache || this._trendingCache.length === 0) return [];
    const mult = thresholdMultiplier ?? (this._rssFeeds?._defaults?.viralThresholdMultiplier ?? 3.0);
    const avgVelocity = this._trendingCache.reduce((s, t) => s + t.velocityScore, 0) / this._trendingCache.length;
    const viralThreshold = avgVelocity * mult;

    return this._trendingCache.filter((t) => t.velocityScore > viralThreshold);
  }

  // ── Daily digest (Criterion #5) ────────────────────────────────────────

  /** Generate and save a daily digest of top N topics (default 5) */
  async generateDailyDigest(maxTopics = 5) {
    const topics = await this.getTrendingTopics(maxTopics);
    const digest = topics.slice(0, maxTopics);

    if (digest.length === 0) return { date: '', totalTopicsEvaluated: 0, topTopics: [] };

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
        pubDate: t.pubDate,
        relevanceScore: t.relevanceScore,
        velocityScore: t.velocityScore,
        predictedEngagement: t.predictedEngagement,
        frequencyCount: t.frequencyCount,
        frequencyRatio: t.frequencyRatio,
        matchedKeywords: t.matchedKeywords,
        categories: t.categories,
      })),
    };

    // Add rank numbers sorted by score
    output.topTopics.forEach((t, i) => { t.rank = i + 1; });

    await fs.writeFile(filePath, JSON.stringify(output, null, 2));
    return output;
  }

  // ── Content AutoGen integration (Criterion #8) ──────────────────────────

  /** Feed topics into content creation pipeline */
  async feedToContentAutoGen() {
    const digest = await this.generateDailyDigest(5);
    if (!digest.topTopics || digest.topTopics.length === 0) return;

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
      // contentAutoGen not available — just return the topics
    }
  }

  /**
   * getTopicsForDraft() — Integration hook for contentAutoGen pipeline.
   * Returns topics suitable for draft generation with full score metadata.
   */
  async getTopicsForDraft(maxCount = 5) {
    await this.init();
    this._dedupSet.clear();

    const topics = await this.getTrendingTopics(maxCount);

    // Enrich with draft-ready metadata
    return topics.map((t) => ({
      ...t,
      draftReady: true,
      suggestedCategories: t.matchedKeywords.map((k) => k.category),
      estimatedEngagement: t.predictedEngagement,
      recommendedTone: this._suggestTone(t),
      keywordTags: t.matchedKeywords.map((k) => k.keyword),
    }));
  }

  /** Suggest content tone based on topic keywords */
  _suggestTone(topic) {
    const text = `${topic.title} ${(topic.description || '')}`.toLowerCase();
    if (/crypto|bitcoin|defi|stablecoin/i.test(text)) return 'informative';
    if (/visa|immigration|residency/i.test(text)) return 'how-to';
    if (/gear|laptop|keyboard|headphone/i.test(text)) return 'review';
    if (/vpn|security|privacy|cyber/i.test(text)) return 'tutorial';
    if (/ai|automation|chatgpt|prompt/i.test(text)) return 'trending';
    return 'informative';
  }

  /** Return cached trending topics */
  getCachedTrendingTopics() {
    return this._trendingCache;
  }

  /** Get health state for reporting */
  getHealthState() {
    return this._healthState || {};
  }

  /** Get loaded RSS feeds config */
  getRssFeeds() {
    return this._rssFeeds;
  }

  /** Get loaded categories config */
  getCategories() {
    return this._categories;
  }
}

// ─── Module exports ──────────────────────────────────────────────────────────

module.exports = TopicResearchService;
module.exports.parseFeedXml = parseFeedXml;
module.exports.fetchUrl = fetchUrl;
module.exports.hash = hash;
module.exports.contentHash = contentHash;
module.exports.scoreNomadRelevance = scoreNomadRelevance;
module.exports.loadRssFeeds = loadRssFeeds;
module.exports.loadCategories = loadCategories;
module.exports.computeVelocity = function (articles, windowHours) {
  if (articles.length === 0) return { count: 0, velocity: 0 };
  const now = Date.now();
  const w = windowHours || 24;
  const windowMs = w * 3600 * 1000;
  const recent = articles.filter((a) => {
    if (!a.pubDate) return true;
    try { return (now - new Date(a.pubDate).getTime()) < windowMs; } catch { return true; }
  });
  let velocity = w > 0 ? recent.length / w : 0;
  // Apply keyword relevance weight per Criterion #7
  for (const a of recent) {
    const rel = scoreNomadRelevance(a.title, a.description || '');
    velocity *= (1 + rel.relevanceScore * 0.5);
  }
  return { count: recent.length, velocity: Math.round(velocity * 100) / 100 };
};
