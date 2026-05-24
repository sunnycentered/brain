import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Reports(){
  const [reports, setReports] = useState([])
  useEffect(()=>{ axios.get('/api/reports').then(r=>setReports(r.data)).catch(()=>{}) }, [])

  async function gen(){
    const name = prompt('Report name', 'Summary report')
    if(!name) return
    const res = await axios.post('/api/reports/generate', { name })
    alert('Report generated id: ' + res.data.id)
    setReports((await axios.get('/api/reports')).data)
  }

  return (
    <div>
      <h2>Reports</h2>
      <button onClick={gen}>Generate report</button>
      <ul>
        {reports.map(r => <li key={r.id}>{r.name} — {new Date(r.created_at).toLocaleString()}</li>)}
      </ul>
    </div>
  )
}

