import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import './prototype.css'
import App from './App'
import { initAuth } from './lib/auth'
import { LegalPage } from './legal/Legal'
import { WidgetApp } from './widget/Widget'

// `/?widget`: the desktop timer widget (loaded by prototype/desktop), instead of the calendar.
const isWidget = new URLSearchParams(location.search).has('widget')
// /privacy and /terms are their own built pages; this covers hosts that send them here instead.
const legal = location.pathname.replace(/\/$/, '')
const legalPage = legal === '/privacy' ? 'privacy' : legal === '/terms' ? 'terms' : null

if (!legalPage) initAuth() // signed in: "My calendar" syncs with the database (web app + widget)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{legalPage ? <LegalPage page={legalPage} /> : isWidget ? <WidgetApp /> : <App />}</StrictMode>,
)
