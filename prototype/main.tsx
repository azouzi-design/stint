import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import './prototype.css'
import App from './App'
import { WidgetApp } from './widget/Widget'

// `/?widget`: the desktop timer widget (loaded by prototype/desktop), instead of the calendar.
const isWidget = new URLSearchParams(location.search).has('widget')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isWidget ? <WidgetApp /> : <App />}</StrictMode>,
)
