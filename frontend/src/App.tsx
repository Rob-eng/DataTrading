import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import AdvancedAnalytics from './pages/AdvancedAnalytics'
import Robots from './pages/Robots'
import Operations from './pages/Operations'
import Upload from './pages/Upload'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
          <Route path="/robots" element={<Robots />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App 