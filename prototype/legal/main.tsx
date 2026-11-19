// Entry for the static /privacy and /terms pages (see Legal.tsx).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import '../prototype.css'
import { LegalPage } from './Legal'

const page = location.pathname.startsWith('/terms') ? 'terms' : 'privacy'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LegalPage page={page} />
  </StrictMode>,
)
