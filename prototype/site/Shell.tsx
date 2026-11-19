// The public pages around the app: /guide, /privacy, /terms (no sign-in needed).
// Each is its own built page (prototype/<name>/index.html → site/main.tsx); the app's entry renders
// them too, for hosts that send those paths to the app instead (see prototype/main.tsx).
import type { ReactNode } from 'react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'
import { cn } from '@/lib/utils'

export type SitePage = 'guide' | 'privacy' | 'terms'

/** The public page at this path, or null (the app). */
export function sitePageFor(pathname: string): SitePage | null {
  const p = pathname.replace(/\/$/, '')
  return p === '/guide' || p === '/privacy' || p === '/terms' ? (p.slice(1) as SitePage) : null
}

export const CONTACT = 'hello@azouzi.design'
export const Mail = () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>

const NAV: [SitePage, string][] = [
  ['guide', 'Guide'],
  ['privacy', 'Privacy'],
  ['terms', 'Terms'],
]

export function SiteShell({ page, children }: { page: SitePage; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <header className="mx-auto flex max-w-[42rem] items-center justify-between gap-12 px-16 pt-24">
        <a href="/" className="flex items-center gap-8 text-[0.929rem] font-medium text-foreground">
          <Logomark className="size-20" aria-hidden />
          Stint
        </a>
        <nav className="flex gap-16 text-[0.857rem]">
          {NAV.map(([p, label]) => (
            <a
              key={p}
              href={`/${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(p === page ? 'text-foreground' : 'text-foreground-tertiary hover:text-foreground')}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main className="doc mx-auto max-w-[42rem] px-16 pt-40 pb-64">{children}</main>
    </div>
  )
}
