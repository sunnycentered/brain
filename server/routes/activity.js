const express = require('express');
const instagram = require('../services/instagramService');
const scraper = require('../services/publicScraper');
const router = express.Router();

// Fetch and persist recent media for the configured IG token
// Falls back to public scraping when no token is available
router.post('/sync', async (req, res) => {
  const db = req.app.locals.db;
  const accessToken = req.body.access_token || process.env.IG_USER_ACCESS_TOKEN;
  const { username } = req.body;

  try {
    let media;
    let profile;

    if (accessToken) {
      // Use Instagram API with access token
      profile = await instagram.getUserProfile(accessToken);
      const mediaResp = await instagram.getUserMedia(accessToken, 50);
      media = mediaResp?.data || [];

      // Store/update profile in DB
      const upsertUser = db.prepare(
        'INSERT OR REPLACE INTO instagram_users (id, username, full_name, access_token, token_expires_at) VALUES (?, ?, ?, ?, ?)'
      );
      upsertUser.run(
        profile?.id || 'me',
        profile?.username || '',
        profile?.full_name || '',
        accessToken,
        Date.now() + 5184000000 // 60-day token expiry
      );
    } else if (username) {
      // Use public scraper (no credentials needed)
      console.log(`[scraper] Fetching public profile: @${username}`);
      const scraped = await scraper.scrapeProfile(username);
      profile = scraped.profile;
      media = scraped.media;

      // Store profile in DB
      const upsertUser = db.prepare(
        'INSERT OR REPLACE INTO instagram_users (id, username, full_name, access_token, token_expires_at) VALUES (?, ?, ?, ?, ?)'
      );
      upsertUser.run(
        `pub_${username}`, 
        profile.username,
        profile.full_name,
        'scraped',
        0
      );
    } else {
      return res.status(400).json({
        error: 'Provide access_token (for API mode) or username (for public scraper mode)',
      });
    }

    // Upsert posts
    const insertPost = db.prepare(
      'INSERT OR REPLACE INTO posts (id, user_id, caption, media_url, permalink, timestamp, raw_json) VALUES (@id, @user_id, @caption, @media_url, @permalink, @timestamp, @raw_json)'
    );
    const insertComment = db.prepare(
      'INSERT OR REPLACE INTO comments (id, post_id, text, username, user_id, timestamp, raw_json) VALUES (@id, @post_id, @text, @username, @user_id, @timestamp, @raw_json)'
    );

    let imported = 0;
    if (Array.isArray(media) && media.length > 0) {
      for (const item of media) {
        insertPost.run({
          id: item.id,
          user_id: 'me',
          caption: item.caption || '',
          media_url: item.media_url || '',
          permalink: item.permalink || '',
          timestamp: item.timestamp || '',
          raw_json: JSON.stringify(item),
        });
        imported++;
      }
    }

    res.json({
      imported,
      profile: profile ? {
        username: profile.username,
        full_name: profile.full_name,
        follower_count: profile.follower_count,
        following_count: profile.following_count,
        media_count: profile.media_count,
        is_verified: profile.is_verified,
      } : null,
      mode: accessToken ? 'api' : 'scraped',
    });
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Sync failed', detail: e?.response?.data?.message || e.message });
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

