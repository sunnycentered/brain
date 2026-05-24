const ollama = require('./ollamaService');

// Keyword service uses the local LLM (ollama) to expand and score keywords.
// This is GDPR/ToS-friendly because it only runs locally (ollama) and stores results locally.

async function expandKeywords(seedKeywords = [], targetAudience = '', count = 20) {
  const prompt = `You are a keyword planner assistant. Given seed keywords: ${JSON.stringify(seedKeywords)}\nTarget audience: ${targetAudience}\nProduce a JSON array of up to ${count} keyword objects with fields: {"keyword": string, "intent": "awareness|consideration|conversion", "score": 0.0}. Provide high-quality, targeted keywords.`;
  const output = await ollama.runPrompt(prompt);

  // try to parse JSON from output
  try {
    const parsed = typeof output === 'string' ? JSON.parse(output) : output;
    return parsed;
  } catch (e) {
    // If parsing fails, fallback to a simple split of lines
    const lines = String(output).split('\n').map(l => l.trim()).filter(Boolean);
    return lines.slice(0, count).map((kw, i) => ({ keyword: kw, intent: 'awareness', score: 1 - i / count }));
  }
}

module.exports = {
  expandKeywords
};

