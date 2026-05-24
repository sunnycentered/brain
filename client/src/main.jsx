import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Keywords from './pages/Keywords'
import Plans from './pages/Plans'
import Reports from './pages/Reports'

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh' }}>
        <nav style={{ width: 220, padding: 20, borderRight: '1px solid #eee' }}>
          <h3>Public Insta</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/keywords">Keywords</Link></li>
            <li><Link to="/plans">Plans</Link></li>
            <li><Link to="/reports">Reports</Link></li>
          </ul>
        </nav>
        <main style={{ flex: 1, padding: 20 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/keywords" element={<Keywords />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)

