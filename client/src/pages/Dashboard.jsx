import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    axios.get('/api/activity/posts').then(r => setPosts(r.data)).catch(() => {});
  }, []);

  const handleSync = async () => {
    setLoading(true)
    setSyncMsg('')
    try {
      const username = prompt('Enter Instagram username (without @), or leave blank if using API mode:');
      if (username) {
        const res = await axios.post('/api/activity/sync', { username });
        setSyncMsg(`✅ Synced ${res.data.imported} posts (mode: ${res.data.mode})`);
        setProfile(res.data.profile);
        // refresh posts
        const postsRes = await axios.get('/api/activity/posts');
        setPosts(postsRes.data);
      } else {
        const token = prompt('Paste your Instagram access token:');
        if (!token) { setLoading(false); return; }
        const res = await axios.post('/api/activity/sync', { access_token: token });
        setSyncMsg(`✅ Synced ${res.data.imported} posts (mode: ${res.data.mode})`);
        setProfile(res.data.profile);
        const postsRes = await axios.get('/api/activity/posts');
        setPosts(postsRes.data);
      }
    } catch (e) {
      setSyncMsg(`❌ Sync failed: ${e.response?.data?.detail || e.message}`);
    }
    setLoading(false)
  }

  return (
    <div>
      <h2>Dashboard</h2>

      {profile \u0026\u0026 (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile.profile_pic_url \u0026\u0026 (
              <img src={profile.profile_pic_url} alt="profile" style={{ width: 60, height: 60, borderRadius: '50%' }} />
            )}
            <div>
              <strong>{profile.full_name}</strong> {profile.is_verified \u0026\u0026 '✅'}
              <br />
              <small>@{profile.username} · {profile.follower_count?.toLocaleString()} followers · {profile.following_count?.toLocaleString()} following</small>
            </div>
          </div>
        </div>
      )}

      {syncMsg \u0026\u0026 <p style={{ padding: '8px 0' }}>{syncMsg}</p>}

      <p>Recent posts</p>
      {posts.length === 0 ? <p>No posts. Click "Sync" to import from Instagram.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {posts.map(p => (
            <div key={p.id} style={{ border: '1px solid #eee', padding: 8 }}>
              <img src={p.media_url} alt="media" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              <p>{p.caption}</p>
              <small>{new Date(p.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <button onClick={handleSync} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync'}
        </button>
      </div>
    </div>
  )
}
