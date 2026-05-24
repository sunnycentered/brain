const express = require('express');
const instagram = require('../services/instagramService');
const router = express.Router();

// Fetch and persist recent media for the configured IG token
router.post('/sync', async (req, res) => {
  const db = req.app.locals.db;
  const accessToken = req.body.access_token || process.env.IG_USER_ACCESS_TOKEN;
  if (!accessToken) return res.status(400).json({ error: 'Missing access token (provide in body or set IG_USER_ACCESS_TOKEN)' });

  try {
    const media = await instagram.getUserMedia(accessToken, 50);
    const insertPost = db.prepare(`INSERT OR REPLACE INTO posts (id, user_id, caption, media_url, permalink, timestamp, raw_json) VALUES (@id, @user_id, @caption, @media_url, @permalink, @timestamp, @raw_json)`);
    const insertComment = db.prepare(`INSERT OR REPLACE INTO comments (id, post_id, text, username, user_id, timestamp, raw_json) VALUES (@id, @post_id, @text, @username, @user_id, @timestamp, @raw_json)`);

    if (media && Array.isArray(media.data)) {
      for (const item of media.data) {
        insertPost.run({ id: item.id, user_id: 'me', caption: item.caption || '', media_url: item.media_url || '', permalink: item.permalink || '', timestamp: item.timestamp || '', raw_json: JSON.stringify(item) });

        // fetch comments for each post and persist
        try {
          const comments = await instagram.getMediaComments(item.id, accessToken);
          if (comments && Array.isArray(comments.data)) {
            for (const c of comments.data) {
              insertComment.run({ id: c.id, post_id: item.id, text: c.text, username: c.username, user_id: null, timestamp: c.timestamp || '', raw_json: JSON.stringify(c) });
            }
          }
        } catch (e) {
          // comments might not be available on Basic Display; skip errors
          console.warn('Comments fetch failed for', item.id, e.message);
        }
      }
    }

    res.json({ imported: media.data ? media.data.length : 0 });
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Sync failed', detail: e?.response?.data || e.message });
  }
});

// Simple read endpoints
router.get('/posts', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare('SELECT id, caption, media_url, permalink, timestamp FROM posts ORDER BY timestamp DESC').all();
  res.json(rows);
});

router.get('/comments', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare('SELECT id, post_id, text, username, timestamp FROM comments ORDER BY timestamp DESC').all();
  res.json(rows);
});

module.exports = router;

