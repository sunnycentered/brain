const express = require('express');
const router = express.Router();

// Simple reporting endpoints: generate a summary report from posts/comments
router.post('/generate', (req, res) => {
  const db = req.app.locals.db;
  const { name = 'report' } = req.body;

  // Example report: counts of posts, comments
  const postsCount = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
  const commentsCount = db.prepare('SELECT COUNT(*) as c FROM comments').get().c;
  const keywords = db.prepare('SELECT keyword, score FROM keywords ORDER BY score DESC LIMIT 10').all();

  const report = {
    name,
    created_at: Date.now(),
    metrics: { posts: postsCount, comments: commentsCount },
    top_keywords: keywords
  };

  const stmt = db.prepare('INSERT INTO reports (name, created_at, report_json) VALUES (?, ?, ?)');
  const info = stmt.run(name, report.created_at, JSON.stringify(report));

  res.json({ id: info.lastInsertRowid, report });
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare('SELECT id, name, created_at FROM reports ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.report_json = JSON.parse(row.report_json || '{}');
  res.json(row);
});

module.exports = router;

