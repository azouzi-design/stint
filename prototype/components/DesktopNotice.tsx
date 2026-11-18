import { Popover } from 'radix-ui'
import WarningIcon from 'pixelarticons/svg/warning-diamond.svg?react'
import { cn } from '@/lib/utils'
import { useAuth } from '../lib/auth'
import { isDesktopApp, markDesktopInstalled, usePresence } from '../lib/presence'
import { isPhoneOrTablet } from '../lib/device'
import { DOWNLOAD } from '../lib/download'
import { isMac } from '../lib/startOverlay'
import { useIsMobile } from '../lib/useMedia'


/**
 * True once we know the desktop timer isn't running for this account (no widget online).
 * Unknown while loading → false (no flash). No database (offline dev): always.
 */
function useDesktopMissing() {
  const status = useAuth((s) => s.status)
  const { desktopOnline, known } = usePresence()
  if (isDesktopApp) return false
  if (status === 'unavailable') return true
  return status === 'signedIn' && known && !desktopOnline
}

/**
 * The one "desktop app required" notice: a small amber chip, the same wherever it shows
 * (navbar, start overlay). Click → what the desktop app does and how to set it up.
 */
export function DesktopNotice({ className }: { className?: string }) {
  const missing = useDesktopMissing()
  const mobile = useIsMobile()
  if (!missing || mobile || isPhoneOrTablet) return null // the timer is desktop-only

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
          {DOWNLOAD && (
            <div className="mt-12 rounded-6 bg-muted p-8">
              <div className="flex items-center justify-between gap-8">
                <span className="font-medium text-foreground">Already installed?</span>
                {/* Launches the app (or shows it, if it's hidden). Not installed: nothing happens. */}
                <a
                  href="stint://open"
                  onClick={markDesktopInstalled}
                  className="flex h-28 items-center rounded-6 bg-foreground px-10 text-[0.786rem] font-medium whitespace-nowrap text-background hover:bg-neutral-80"
                >
                  Open Stint
                </a>
              </div>
              <p className="mt-4 text-[0.786rem] text-foreground-tertiary">
                If your browser asks, allow it to open Stint. Signed in there, it connects by itself.
              </p>
            </div>
          )}
          {DOWNLOAD ? (
            <ol className="mt-12 list-decimal space-y-2 pl-16 text-foreground-secondary">
              {isMac ? (
                <>
                  <li>New here? Download Stint and drag it into Applications.</li>
                  <li>
                    Open it. The first time, macOS blocks it (it isn’t signed by Apple yet): go to System Settings →
                    Privacy & Security → <Strong>Open Anyway</Strong>.
                  </li>
                </>
              ) : (
                <li>
                  New here? Download and run the installer. If Windows shows “Windows protected your PC”, click{' '}
                  <Strong>More info</Strong> → <Strong>Run anyway</Strong> (it isn’t signed yet).
                </li>
              )}
              <li>
                Click <Strong>Sign in</Strong> in the timer: it opens Stint here, then one click
                connects it.
              </li>
            </ol>
          ) : (
            <p className="mt-8 text-foreground-secondary">The desktop timer is available for Mac and Windows.</p>
          )}
          <p className="mt-6 text-[0.786rem] text-foreground-tertiary">It updates itself after that.</p>
          {DOWNLOAD && (
            <div className="mt-12 flex items-center gap-8">
              <a
                href={DOWNLOAD.url}
                className="flex h-28 items-center rounded-6 border border-border px-10 text-[0.786rem] font-medium whitespace-nowrap text-foreground hover:bg-muted"
              >
                {DOWNLOAD.label}
              </a>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}
