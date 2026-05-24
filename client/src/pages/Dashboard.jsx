import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [posts, setPosts] = useState([])
  useEffect(() => {
    axios.get('/api/activity/posts').then(r => setPosts(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
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
        <button onClick={async () => {
          const token = prompt('Paste your Instagram access token (or leave blank to use server env token)');
          await axios.post('/api/activity/sync', { access_token: token }).then(r => alert('Imported: ' + r.data.imported)).catch(e => alert('Sync failed: ' + (e.response?.data?.error || e.message)));
        }}>Sync</button>
      </div>
    </div>
  )
}

