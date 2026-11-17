import { Popover } from 'radix-ui'
import WarningIcon from 'pixelarticons/svg/warning-diamond.svg?react'
import { cn } from '@/lib/utils'
import { useAuth, useSignInOpen } from '../lib/auth'
import { isDesktopApp, usePresence } from '../lib/presence'
import { isMac } from '../lib/startOverlay'
import { useIsMobile } from '../lib/useMedia'

/** The latest Mac build (GitHub Releases; `latest/download` always serves the newest release). */
const MAC_DOWNLOAD_URL = 'https://github.com/azouzi-design/stint/releases/latest/download/Stint-mac.dmg'

/**
 * True once we know the desktop timer isn't running for this user: signed out (it can't be
 * linked), or signed in with no widget online. Unknown while loading → false (no flash).
 */
function useDesktopMissing() {
  const status = useAuth((s) => s.status)
  const { desktopOnline, known } = usePresence()
  if (isDesktopApp || status === 'loading') return false
  if (status === 'signedIn') return known && !desktopOnline
  return true
}

/**
 * The one "desktop app required" notice: a small amber chip, the same wherever it shows
 * (navbar, start overlay). Click → what the desktop app does and how to set it up.
 */
export function DesktopNotice({ className }: { className?: string }) {
  const missing = useDesktopMissing()
  const signedIn = useAuth((s) => s.status === 'signedIn')
  const mobile = useIsMobile()
  if (!missing || mobile) return null // the timer is desktop-only

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          'flex h-24 items-center gap-6 rounded-full bg-[oklch(0.97_0.04_75)] pr-10 pl-8 text-[0.786rem] font-medium whitespace-nowrap text-[oklch(0.45_0.09_65)] hover:bg-[oklch(0.94_0.06_75)]',
          className,
        )}
      >
        <WarningIcon className="size-12 shrink-0" />
        Desktop app required
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[60] w-[18rem] rounded-8 border border-border bg-popover p-12 text-[0.857rem] shadow-md outline-none"
        >
          <p className="font-medium text-foreground">Stint’s timer runs on your desktop</p>
          <p className="mt-4 text-foreground-secondary">
            It floats above your other apps and alerts you when time’s up. Without it, sessions only run in this tab.
          </p>
          {isMac ? (
            <ol className="mt-8 list-decimal space-y-2 pl-16 text-foreground-secondary">
              <li>Download Stint and drag it into Applications.</li>
              <li>
                Open it. The first time, macOS blocks it (it isn’t signed by Apple yet): go to System Settings → Privacy &
                Security → <span className="font-medium text-foreground">Open Anyway</span>.
              </li>
              <li>{signedIn ? 'Sign in there with the same email.' : 'Sign in, here and there, with the same email.'}</li>
            </ol>
          ) : (
            <p className="mt-8 text-foreground-secondary">Stint for Windows is coming soon. For now the desktop timer is Mac only.</p>
          )}
          <div className="mt-12 flex items-center gap-8">
            {isMac && (
              <a
                href={MAC_DOWNLOAD_URL}
                className="flex h-28 items-center rounded-6 bg-foreground px-10 text-[0.786rem] font-medium whitespace-nowrap text-background hover:bg-neutral-80"
              >
                Download for Mac
              </a>
            )}
            {!signedIn && (
              <Popover.Close
                onClick={() => useSignInOpen.setState(true)}
                className="ml-auto flex h-28 items-center rounded-6 px-10 text-[0.786rem] font-medium whitespace-nowrap text-foreground-secondary hover:bg-muted"
              >
                Sign in
              </Popover.Close>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
