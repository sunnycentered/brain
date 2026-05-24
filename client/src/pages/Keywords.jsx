import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Keywords(){
  const [list, setList] = useState([])
  const [seed, setSeed] = useState('')

  useEffect(()=>{ axios.get('/api/keywords').then(r=>setList(r.data)).catch(()=>{}) }, [])

  async function expand(){
    const seeds = seed.split(',').map(s=>s.trim()).filter(Boolean)
    if(seeds.length===0) return alert('Enter seed keywords comma-separated')
    const res = await axios.post('/api/keywords/expand', { seeds, audience: '', count: 20 })
    setList(await (await axios.get('/api/keywords')).data)
    alert('Expanded: ' + res.data.keywords.length)
  }

  return (
    <div>
      <h2>Keywords</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={seed} onChange={e=>setSeed(e.target.value)} placeholder="e.g. coffee, cold brew" style={{ flex: 1 }} />
        <button onClick={expand}>Expand</button>
      </div>
      <ul>
        {list.map(k=> <li key={k.id || k.keyword}>{k.keyword} — {k.score}</li>)}
      </ul>
    </div>
  )
}

