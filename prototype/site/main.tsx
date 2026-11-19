// Entry for the static public pages: /guide, /privacy, /terms (see Shell.tsx).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import '../prototype.css'
import { SitePageView } from './SitePageView'
import { sitePageFor } from './Shell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SitePageView page={sitePageFor(location.pathname) ?? 'guide'} />
  </StrictMode>,
)
