/**
 * contentAutoGen.js — Content creation pipeline integration.
 *
 * Receives topics from TopicResearchService and queues them for
 * automated content generation (captions, articles, social posts).
 */

const { generatePostPrompt } = require('./contentGenerator');
const path = require('path');

// ── Topic queue ──────────────────────────────────────────────────────────────

let topicQueue = [];

function addTopicQueue(topic) {
  topicQueue.push({
    ...topic,
    queuedAt: Date.now(),
    status: 'pending', // pending → generating → done
  });
}

async function feedTopics(topics) {
  /**
   * `topics` — array of topic objects from TopicResearchService.
   * Enqueues each for content generation.
   */
  for (const t of topics) {
    addTopicQueue(t);
  }
  // Trigger batch generation (lightweight: just queue, async worker picks up)
  return { queued: topicQueue.length };
}

/** Process the queue — generate draft content from queued topics */
async function processQueue() {
  const pending = topicQueue.filter((t) => t.status === 'pending');
  if (pending.length === 0) return [];

  const results = [];
  for (const topic of pending.slice(0, 10)) { // batch limit
    try {
      const keywords = topic.matchedKeywords ? topic.matchedKeywords.map((k) => k.keyword).slice(0, 8) : [];
      const captionData = await generatePostPrompt({
        tone: 'informative',
        keywords,
        intent: 'engagement',
        desired_length: 'short',
      });
      results.push({ topicTitle: topic.title, generatedCaption: captionData, status: 'done' });
      topic.status = 'done';
    } catch (err) {
      results.push({ topicTitle: topic.title, error: err.message, status: 'failed' });
      topic.status = 'failed';
    }
  }
  return results;
}

/** Reset the queue (useful for tests or manual flushes) */
function clearQueue() {
  topicQueue = [];
}

/**
 * getTopicsForDraft() — Integration hook for contentAutoGen pipeline.
 * Bridges TopicResearchService trending topics into content drafts.
 */
async function getTopicsForDraft(maxCount = 5) {
  try {
    const TopicResearchService = require(path.join(__dirname, 'topicResearch.js'));
    const topicSvc = new TopicResearchService();
    await topicSvc.init();
    return await topicSvc.getTopicsForDraft(maxCount);
  } catch {
    return [];
  }
}

module.exports = { feedTopics, addTopicQueue, processQueue, clearQueue, getTopicsForDraft };
