import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import './prototype.css'
import App from './App'
import { initAuth } from './lib/auth'
import { sitePageFor } from './site/Shell'
import { SitePageView } from './site/SitePageView'
import { WidgetApp } from './widget/Widget'

// `/?widget`: the desktop timer widget (loaded by prototype/desktop), instead of the calendar.
const isWidget = new URLSearchParams(location.search).has('widget')
// /guide, /privacy and /terms are their own built pages; this covers hosts that send them here instead.
const sitePage = sitePageFor(location.pathname)

if (!sitePage) initAuth() // signed in: "My calendar" syncs with the database (web app + widget)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{sitePage ? <SitePageView page={sitePage} /> : isWidget ? <WidgetApp /> : <App />}</StrictMode>,
)
