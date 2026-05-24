const axios = require('axios');

// Minimal Instagram Graph API wrapper. Requires a valid user access token with appropriate permissions.
// See README for OAuth setup and obtaining a long-lived token.

const GRAPH_BASE = 'https://graph.instagram.com';

async function getUserProfile(accessToken) {
  const url = `${GRAPH_BASE}/me`;
  const params = { fields: 'id,username,account_type,media_count', access_token: accessToken };
  const res = await axios.get(url, { params });
  return res.data;
}

async function getUserMedia(accessToken, limit = 50) {
  const url = `${GRAPH_BASE}/me/media`;
  const params = { fields: 'id,caption,media_url,permalink,timestamp,media_type', access_token: accessToken, limit };
  const res = await axios.get(url, { params });
  return res.data;
}

async function getMediaComments(mediaId, accessToken) {
  const url = `${GRAPH_BASE}/${mediaId}/comments`;
  const params = { fields: 'id,text,username,timestamp', access_token: accessToken };
  const res = await axios.get(url, { params });
  return res.data;
}

async function getMediaInsights(mediaId, accessToken) {
  // Not all fields are available via the simple Instagram Basic Display API; some require Graph API with Business accounts.
  const url = `${GRAPH_BASE}/${mediaId}/insights`;
  const params = { metric: 'impressions,reach,engagement,saved', access_token: accessToken };
  const res = await axios.get(url, { params });
  return res.data;
}

module.exports = {
  getUserProfile,
  getUserMedia,
  getMediaComments,
  getMediaInsights
};

