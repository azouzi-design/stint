import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import { useAuth } from '../lib/auth'
import { clearConnectParam, connectState, desktopLinkUrl } from '../lib/desktopLink'
import { isDesktopApp, usePresence } from '../lib/presence'
import { DOWNLOAD } from '../lib/download'
import { primary, SignInForm } from './SignIn'

/**
 * Web, opened by the desktop app's "Sign in" (/?connect=…): signs the desktop app in as the
 * account signed in here, in one click. Signed out here: sign in first (that's the only code).
 */
export function ConnectDesktopDialog() {
  const [open, setOpen] = useState(!!connectState && !isDesktopApp)
  const status = useAuth((s) => s.status)
  if (!connectState || isDesktopApp) return null
  const close = () => {
    setOpen(false)
    clearConnectParam()
  }
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--primitive-neutral-10)/0.82)] backdrop-blur-[6px] start-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          className="start-bar fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-12 border border-border bg-background p-20 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.05)] outline-none"
        >
          {status === 'signedIn' ? (
            <Connect state={connectState} onDone={close} />
          ) : status === 'signedOut' ? (
            <SignInForm
              title="Sign in to Stint"
              intro="Sign in here once: the desktop timer then signs in with the same account, no second code."
            />
          ) : (
            <Dialog.Title className="text-[1rem] font-medium text-foreground">Connecting…</Dialog.Title>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Connect({ state, onDone }: { state: string; onDone: () => void }) {
  const email = useAuth((s) => s.email)
  const desktopOnline = usePresence((s) => s.desktopOnline)
  // A single-use link, fetched ahead so the click opens it right away. Each click uses one up.
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clicks, setClicks] = useState(0)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    desktopLinkUrl(state).then(
      (url) => live && setLink(url),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
    }
  }, [state, attempt])

  // The desktop app shows up online once it has signed in: done.
  const connected = clicks > 0 && desktopOnline
  useEffect(() => {
    if (connected) clearConnectParam()
  }, [connected])

  if (connected) {
    return (
      <div className="flex flex-col gap-12">
        <div>
          <Dialog.Title className="flex items-center gap-6 text-[1rem] font-medium text-foreground">
            <CheckIcon className="size-16 text-success" />
            Desktop timer connected
          </Dialog.Title>
          <p className="mt-4 text-[0.857rem] text-foreground-secondary">
            Signed in as {email}. Sessions you start here run on your desktop.
          </p>
        </div>
        <button type="button" onClick={onDone} className={`${primary} self-end`}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-12">
      <div>
        <Dialog.Title className="text-[1rem] font-medium text-foreground">Connect the desktop timer</Dialog.Title>
        <p className="mt-4 text-[0.857rem] text-foreground-secondary">
          {clicks === 0
            ? `It will sign in as ${email}, like this tab.`
            : 'If your browser asks, allow it to open Stint. The timer signs in on its own.'}
        </p>
      </div>
      {error && <p className="text-[0.786rem] text-destructive">{error}</p>}
      {clicks > 0 && DOWNLOAD && (
        <p className="text-[0.786rem] text-foreground-tertiary">
          Nothing opened?{' '}
          <a href={DOWNLOAD.url} className="font-medium text-foreground-secondary underline hover:text-foreground">
            {DOWNLOAD.label}
          </a>
          , open it, then click Sign in in the timer.
        </p>
      )}
      <div className="flex items-center justify-between gap-8">
        <button type="button" onClick={onDone} className="text-[0.786rem] text-foreground-tertiary hover:text-foreground">
          Not now
        </button>
        {error ? (
          <button type="button" onClick={() => {
              setError(null)
              setAttempt((a) => a + 1)
            }} className={primary}>
            Try again
          </button>
        ) : (
          <a
            href={link ?? undefined}
            aria-disabled={!link}
            onClick={(e) => {
              if (!link) return e.preventDefault()
              setTimeout(() => {
                // After the link opens: fetch a fresh one, in case it's needed again.
                setClicks((c) => c + 1)
                setLink(null)
                setAttempt((a) => a + 1)
              })
            }}
            className={`${primary} ${link ? '' : 'pointer-events-none bg-neutral-30'}`}
          >
            {clicks === 0 ? 'Open Stint desktop' : 'Open again'}
          </a>
        )}
      </div>
    </div>
  )
}
