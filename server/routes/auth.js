const express = require('express');
const axios = require('axios');
const router = express.Router();

// Minimal OAuth flow skeleton for Instagram Basic Display / Graph API.
// This does not fully implement app review or server-side business auth flow.

// Redirect user to Instagram auth URL
router.get('/login', (req, res) => {
  const clientId = process.env.IG_APP_ID;
  const redirectUri = process.env.IG_REDIRECT_URI;
  const scope = 'user_profile,user_media';
  if (!clientId || !redirectUri) return res.status(400).json({ error: 'IG_APP_ID and IG_REDIRECT_URI must be set' });
  const url = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  res.redirect(url);
});

// OAuth callback: exchange code for a short-lived token, then exchange for long-lived token.
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokenRes = await axios.post('https://api.instagram.com/oauth/access_token', null, {
      params: {
        client_id: process.env.IG_APP_ID,
        client_secret: process.env.IG_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.IG_REDIRECT_URI,
        code
      }
    });

    // tokenRes.data contains access_token and user_id for Basic Display API
    // For production, you'd store the token securely and (if needed) exchange for long-lived tokens.

    // For simplicity, return the token object to the caller (in real app, store server side)
    res.json(tokenRes.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Token exchange failed', detail: e?.response?.data || e.message });
  }
});

module.exports = router;

