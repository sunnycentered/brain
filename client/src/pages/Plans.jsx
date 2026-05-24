import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Plans(){
  const [plans, setPlans] = useState([])
  useEffect(()=>{ axios.get('/api/plans').then(r=>setPlans(r.data)).catch(()=>{}) }, [])

  async function create() {
    const title = prompt('Plan title')
    if(!title) return
    const plan = { actions: [ { type: 'post', when: 'weekly', caption_template: '...' } ] }
    const res = await axios.post('/api/plans', { title, description: 'Generated plan', plan })
    alert('Created plan id: ' + res.data.id)
    setPlans((await axios.get('/api/plans')).data)
  }

  return (
    <div>
      <h2>Plans</h2>
      <button onClick={create}>Create sample plan</button>
      <ul>
        {plans.map(p => <li key={p.id}>{p.title} — {new Date(p.created_at).toLocaleString()}</li>)}
      </ul>
    </div>
  )
}

