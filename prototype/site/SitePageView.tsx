import { GuidePage } from './Guide'
import { LegalPage } from './Legal'
import type { SitePage } from './Shell'

export function SitePageView({ page }: { page: SitePage }) {
  return page === 'guide' ? <GuidePage /> : <LegalPage page={page} />
}
