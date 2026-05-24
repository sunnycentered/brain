const express = require('express');
const keywordService = require('../services/keywordService');
const router = express.Router();

// Expand keywords using local LLM (ollama)
router.post('/expand', async (req, res) => {
  const db = req.app.locals.db;
  const { seeds = [], audience = '', count = 20 } = req.body;
  if (!Array.isArray(seeds) || seeds.length === 0) return res.status(400).json({ error: 'Provide seed keywords array' });
  try {
    const expanded = await keywordService.expandKeywords(seeds, audience, count);
    // Persist to DB (upsert)
    const insert = db.prepare('INSERT OR IGNORE INTO keywords (keyword, score) VALUES (?, ?)');
    const update = db.prepare('UPDATE keywords SET score = ? WHERE keyword = ?');
    const saved = [];
    for (const k of expanded) {
      const keyword = k.keyword || k;
      const score = k.score || 0;
      insert.run(keyword, score);
      update.run(score, keyword);
      saved.push({ keyword, score });
    }
    res.json({ keywords: saved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Keyword expansion failed', detail: e.message });
  }
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare('SELECT * FROM keywords ORDER BY score DESC').all();
  res.json(rows);
});

module.exports = router;

