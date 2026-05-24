const ollama = require('./ollamaService');

async function generatePostPrompt({ tone = 'friendly', keywords = [], intent = 'engagement', desired_length = 'short' } = {}) {
  const prompt = `You are a social media copywriter. Create 5 ${desired_length} Instagram post caption ideas in a ${tone} tone focused on these keywords: ${keywords.join(', ')}. Each caption should include a short call-to-action appropriate for encouraging comments or shares. Output JSON array of objects: {"caption": "...", "hashtags": ["#..."], "cta": "..."}`;
  const out = await ollama.runPrompt(prompt);
  try { return JSON.parse(out); } catch (e) { return out; }
}

async function generateCommentReply({ commentText = '', tone = 'helpful' } = {}){
  const prompt = `You are a friendly Instagram community manager. Given the comment: "${commentText}", produce 3 short reply options in a ${tone} tone suitable to encourage conversation. Output a JSON array of objects {"reply": "..."}`;
  const out = await ollama.runPrompt(prompt);
  try { return JSON.parse(out); } catch (e) { return out; }
}

module.exports = { generatePostPrompt, generateCommentReply };

