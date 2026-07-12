import React from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import AssetsPage from './pages/AssetsPage'

function Home() {
  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">AssetFlow</p>
        <h1>Development environment is running.</h1>
        <p>
          React, Vite, FastAPI, and PostgreSQL are wired together for local containerized development.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link to="/assets" className="btn-primary" style={{ textDecoration: 'none' }}>
            Go to Asset Directory
          </Link>
        </p>
      </section>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assets" element={<AssetsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
