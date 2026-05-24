const express = require('express');
const { generatePostPrompt, generateCommentReply } = require('../services/contentGenerator');
const router = express.Router();

router.post('/post-ideas', async (req, res) => {
  const db = req.app.locals.db;
  const { keywords = [], tone = 'friendly', desired_length = 'short' } = req.body;
  try {
    const ideas = await generatePostPrompt({ keywords, tone, desired_length });
    const stmt = db.prepare('INSERT INTO prompts (name, prompt_text, metadata) VALUES (?, ?, ?)');
    stmt.run('post-ideas', JSON.stringify(ideas), JSON.stringify({ keywords, tone }));
    res.json({ ideas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Generate failed', detail: e.message });
  }
});

router.post('/comment-replies', async (req, res) => {
  const db = req.app.locals.db;
  const { commentText = '', tone = 'helpful' } = req.body;
  try {
    const replies = await generateCommentReply({ commentText, tone });
    const stmt = db.prepare('INSERT INTO prompts (name, prompt_text, metadata) VALUES (?, ?, ?)');
    stmt.run('comment-replies', JSON.stringify(replies), JSON.stringify({ commentText, tone }));
    res.json({ replies });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Generate failed', detail: e.message });
  }
});

module.exports = router;

