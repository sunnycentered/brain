const express = require('express');
const router = express.Router();

// Create a plan using prompts via Ollama or accept plan JSON
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const { title, description, plan } = req.body;
  if (!title || !plan) return res.status(400).json({ error: 'title and plan (JSON) are required' });
  const stmt = db.prepare('INSERT INTO plans (title, description, created_at, plan_json) VALUES (?, ?, ?, ?)');
  const info = stmt.run(title, description || '', Date.now(), JSON.stringify(plan));
  res.json({ id: info.lastInsertRowid });
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare('SELECT id, title, description, created_at FROM plans ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.plan_json = JSON.parse(row.plan_json || '{}');
  res.json(row);
});

module.exports = router;

