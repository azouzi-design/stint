import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import CloseIcon from 'pixelarticons/svg/close.svg?react'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import MoreIcon from 'pixelarticons/svg/more-vertical.svg?react'
import OpenIcon from 'pixelarticons/svg/external-link.svg?react'
import HideIcon from 'pixelarticons/svg/eye-off.svg?react'
import PinIcon from 'pixelarticons/svg/arrow-bar-up.svg?react'
import InfinityIcon from 'pixelarticons/svg/clock.svg?react'
import ArrowIcon from 'pixelarticons/svg/arrow-right.svg?react'
import LoginIcon from 'pixelarticons/svg/login.svg?react'
import LogoutIcon from 'pixelarticons/svg/logout.svg?react'
import PauseIcon from '@/assets/icons/custom-pause.svg?react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cn } from '@/lib/utils'
import { ExtendInput } from '../components/ExtendInput'
import { SessionController } from '../components/SessionController'
import { useSignIn } from '../lib/useSignIn'
import { signOut, useAuth } from '../lib/auth'
import { canLinkFromWeb, cancelDesktopSignIn, listenForDesktopLinks, startDesktopSignIn, useDesktopLink } from '../lib/desktopLink'
import { formatDuration } from '../lib/dates'
import { formatClock, MIN_SAVED_MS, parseDuration, primeAudio, primeNotifications, sessionClock } from '../lib/session'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import { hideWidget, inDesktopApp, openStint, resizeWidget, setAlwaysOnTop, showWidget } from './tauri'
import { useAutoUpdate } from './updater'

/** How long "Saved" / "Discarded" shows before going back to the start row. */
const END_MS = 1600

type Icon = ComponentType<SVGProps<SVGSVGElement>>
type Action = { icon: Icon; label: string; onClick: () => void }

/** "Always on top" (⋮ menu). Per computer, not synced: it's about this screen. On by default. */
const useOnTop = create<boolean>()(persist(() => true, { name: 'stint-widget-on-top' }))

/** Whether the sign-in row replaces the start row. */
const useSigningIn = create<boolean>(() => false)

const iconBtn =
  'flex size-24 shrink-0 items-center justify-center rounded-4 text-icon hover:bg-muted hover:text-foreground'

/**
 * The desktop timer widget: a tiny always-on-top window (see prototype/desktop).
 * Idle → start row; running / paused / time's up → the timer; then "Saved" briefly.
 */
export function WidgetApp() {
  const ref = useRef<HTMLDivElement>(null)
  useAutoUpdate()
  useEffect(listenForDesktopLinks, [])

  // Floats above other windows when the user wants it, and always at time's up.
  const onTop = useOnTop()
  const timeUp = useStore((s) => !!s.activeSession?.timeUpAt)
  useEffect(() => setAlwaysOnTop(onTop || timeUp), [onTop, timeUp])

  // Frameless, transparent window: the page draws its own rounded card.
  useLayoutEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.className = 'm-0 overflow-hidden bg-transparent font-geist text-foreground'
  }, [])

  // The window is exactly the size of its content (it grows when the menu opens).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => resizeWidget(el.offsetWidth, el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <>
      <SessionController />
      <div
        ref={ref}
        className={cn(
          'w-max overflow-hidden rounded-8 border border-border bg-background',
          !inDesktopApp && 'm-16 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.2)]', // browser preview
        )}
      >
        <Widget />
      </div>
    </>
  )
}

function Widget() {
  const session = useStore((s) => s.activeSession)
  const auth = useAuth((s) => s.status)
  const signingIn = useSigningIn()
  const items = useStore((s) => s.items)
  // Remember the last session so its outcome can show once it ends.
  const [lastItemId, setLastItemId] = useState<string | null>(null)
  if (session && session.itemId !== lastItemId) setLastItemId(session.itemId)

  useEffect(() => {
    if (session || !lastItemId) return
    const t = setTimeout(() => setLastItemId(null), END_MS)
    return () => clearTimeout(t)
  }, [session, lastItemId])

  // A session started (here or in the web app): show the widget if it was hidden, without
  // taking focus from the browser. Time's up: bring it forward.
  const itemId = session?.itemId
  useEffect(() => {
    if (itemId) showWidget({ focus: false })
  }, [itemId])
  const timeUp = !!session?.timeUpAt
  useEffect(() => {
    if (timeUp) showWidget()
  }, [timeUp])

  useEffect(() => {
    if (auth === 'signedIn') useSigningIn.setState(false)
  }, [auth])

  // The timer only works signed in: every session belongs to the account (and syncs with the web app).
  if (auth === 'loading') return <Frame actions={always}><Dot /></Frame>
  if (auth === 'signedOut') return signingIn ? <SignInRow /> : <ConnectRow />
  if (session) return <Timer />
  if (lastItemId) {
    const item = items.find((i) => i.id === lastItemId)
    return <Ended savedMin={item?.type === 'session' ? (item.focusedMin ?? null) : null} />
  }
  return <StartRow />
}

/** Shared frame: one row (draggable) + an optional menu below it. */
function Frame({
  children,
  actions,
  amber,
}: {
  children: React.ReactNode
  actions: Action[]
  amber?: boolean
}) {
  const [menu, setMenu] = useState(false)
  return (
    <div>
      <div data-tauri-drag-region className={cn('flex h-32 items-center gap-2 pr-4 pl-12', amber && 'bg-[oklch(0.97_0.04_75)]')}>
        {children}
        <button
          type="button"
          aria-label={menu ? 'Close menu' : 'Actions'}
          title="Actions"
          onClick={() => setMenu((m) => !m)}
          className={cn(iconBtn, menu && 'bg-muted text-foreground')}
        >
          <MoreIcon className="size-16" />
        </button>
      </div>
      {menu && <Menu actions={actions} onClose={() => setMenu(false)} />}
    </div>
  )
}

function Menu({ actions, onClose }: { actions: Action[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element
      if (!ref.current?.contains(t) && !t.closest?.('[aria-label="Close menu"]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  return (
    <div ref={ref} role="menu" className="border-t border-border p-4">
      {actions.map(({ icon: I, label, onClick }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onClick()
          }}
          className="flex h-28 w-full items-center gap-8 rounded-4 px-8 text-left text-[0.857rem] whitespace-nowrap text-foreground hover:bg-muted"
        >
          <I className="size-16 shrink-0 text-icon" />
          {label}
        </button>
      ))}
      <OnTopToggle />
    </div>
  )
}

/** A switch, not an action: the menu stays open so the new state shows. */
function OnTopToggle() {
  const on = useOnTop()
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      title="Off: other windows can cover the timer. It still comes on top when time's up."
      onClick={() => useOnTop.setState(!on, true)}
      className="flex h-28 w-full items-center gap-8 rounded-4 px-8 text-left text-[0.857rem] whitespace-nowrap text-foreground hover:bg-muted"
    >
      <PinIcon className="size-16 shrink-0 text-icon" />
      Always on top
      <span
        className={cn(
          'ml-auto flex h-16 w-28 shrink-0 items-center rounded-full p-2 transition-colors',
          on ? 'justify-end bg-foreground' : 'justify-start bg-neutral-30',
        )}
      >
        <span className="size-12 rounded-full bg-background" />
      </span>
    </button>
  )
}

const always: Action[] = [
  { icon: OpenIcon, label: 'Open Stint', onClick: () => openStint() },
  ...(inDesktopApp ? [{ icon: HideIcon, label: 'Hide timer', onClick: hideWidget }] : []),
]

/** Start from the click (the browser needs one to allow the sound and the notification). */
function start(minutes: number | null) {
  primeAudio()
  primeNotifications()
  useStore.getState().startSession(minutes)
}

function StartRow() {
  const [text, setText] = useState('')
  const minutes = parseDuration(text)
  const signedIn = useAuth((s) => s.status === 'signedIn')
  const account: Action[] = signedIn ? [{ icon: LogoutIcon, label: 'Sign out', onClick: () => void signOut() }] : []
  return (
    <Frame actions={[{ icon: InfinityIcon, label: 'Start without timecap', onClick: () => start(null) }, ...always, ...account]}>
      <Dot />
      <form
        className="ml-6 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (minutes) start(minutes)
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 5))}
          placeholder="25m"
          aria-label="Duration (minutes, or hours with h)"
          title="Type minutes (25) or hours (1.5h), then Enter"
          autoComplete="off"
          className="h-24 w-[2.75rem] rounded-4 bg-muted px-6 text-[0.857rem] tabular-nums outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-neutral-40"
        />
        <button
          type="submit"
          disabled={!minutes}
          aria-label="Start"
          title="Start"
          className="flex size-24 shrink-0 items-center justify-center rounded-4 bg-foreground text-background hover:bg-neutral-80 disabled:bg-neutral-30"
        >
          <PlayIcon className="size-12" />
        </button>
      </form>
    </Frame>
  )
}

function Timer() {
  const session = useStore((s) => s.activeSession)!
  const { pauseSession, resumeSession, finishSession } = useStore.getState()
  const now = useNow(250)
  const { displayMs, focusedMs, phase } = sessionClock(session, now)
  const timeUp = phase === 'timeUp'
  const paused = phase === 'paused'
  const discard = !timeUp && focusedMs < MIN_SAVED_MS

  const actions: Action[] = [
    ...(timeUp
      ? []
      : [
          discard
            ? { icon: CloseIcon, label: 'Discard', onClick: finishSession }
            : { icon: StopIcon, label: 'Stop and save', onClick: finishSession },
        ]),
    ...always,
  ]

  return (
    <Frame actions={actions} amber={timeUp}>
      <span
        data-tauri-drag-region
        className={cn(
          'size-6 shrink-0 rounded-full',
          timeUp ? 'animate-pulse bg-warning' : paused ? 'bg-neutral-40' : 'animate-pulse bg-success',
        )}
      />
      {timeUp ? (
        <>
          <span data-tauri-drag-region className="mr-2 ml-6 text-[0.857rem] font-medium whitespace-nowrap">
            Time’s up
          </span>
          <button type="button" className={cn(iconBtn, 'text-foreground')} onClick={finishSession} aria-label="Done" title="Done">
            <CheckIcon className="size-16" />
          </button>
          <ExtendInput compact />
        </>
      ) : (
        <>
          <span
            data-tauri-drag-region
            className={cn('mr-4 ml-6 font-dseg7 text-[1rem] leading-none tabular-nums', paused && 'text-foreground-tertiary')}
          >
            {formatClock(displayMs)}
          </span>
          {paused ? (
            <button type="button" className={iconBtn} onClick={resumeSession} aria-label="Resume" title="Resume">
              <PlayIcon className="size-16" />
            </button>
          ) : (
            <button type="button" className={iconBtn} onClick={pauseSession} aria-label="Pause" title="Pause">
              <PauseIcon className="size-16" />
            </button>
          )}
        </>
      )}
    </Frame>
  )
}

const Dot = () => <span data-tauri-drag-region className="size-6 shrink-0 rounded-full bg-neutral-30" />

/**
 * Signed out: one button. It continues in the browser, where the web app (already signed in, or
 * signed in there once) connects this app in one click (lib/desktopLink.ts).
 */
function ConnectRow() {
  const { step, error } = useDesktopLink()
  // Builds without stint:// links (0.2.0, until they update): sign in by code here.
  const begin = canLinkFromWeb ? startDesktopSignIn : () => useSigningIn.setState(true)
  const waiting = step === 'waiting'
  return (
    <div>
      <Frame actions={waiting ? [{ icon: LoginIcon, label: 'Open the browser again', onClick: begin }, ...always] : always}>
        <Dot />
        {step === 'idle' ? (
          <button
            type="button"
            onClick={begin}
            className="mr-2 ml-6 flex h-24 items-center gap-4 rounded-4 bg-foreground px-8 text-[0.857rem] font-medium whitespace-nowrap text-background hover:bg-neutral-80"
          >
            <LoginIcon className="size-12" />
            Sign in
          </button>
        ) : (
          <>
            <span data-tauri-drag-region className="mr-2 ml-6 text-[0.857rem] whitespace-nowrap text-foreground-secondary">
              {waiting ? 'Continue in your browser' : 'Signing in…'}
            </span>
            {waiting && (
              <button type="button" onClick={cancelDesktopSignIn} aria-label="Cancel" title="Cancel" className={iconBtn}>
                <CloseIcon className="size-16" />
              </button>
            )}
          </>
        )}
      </Frame>
      {error && <p className="max-w-[13rem] px-12 pb-6 text-[0.714rem] text-destructive">{error}</p>}
    </div>
  )
}

/** Email → 6-digit code, in place of the start row (fallback for builds without stint:// links). */
function SignInRow() {
  const close = () => useSigningIn.setState(false)
  const s = useSignIn(close)
  const isEmail = s.step === 'email'
  const note = s.error ?? (isEmail ? null : `Code sent to ${s.email.trim()}`)
  return (
    <div>
      <form
        data-tauri-drag-region
        className="flex h-32 items-center gap-2 pr-4 pl-8"
        onSubmit={(e) => {
          e.preventDefault()
          if (isEmail ? s.canSend : s.canVerify) void (isEmail ? s.send() : s.verify())
        }}
      >
        <input
          key={s.step}
          autoFocus
          type={isEmail ? 'email' : 'text'}
          inputMode={isEmail ? 'email' : 'numeric'}
          autoComplete={isEmail ? 'email' : 'one-time-code'}
          placeholder={isEmail ? 'Email to sync' : '6-digit code'}
          value={isEmail ? s.email : s.code}
          onChange={(e) => (isEmail ? s.setEmail(e.target.value) : s.setCode(e.target.value))}
          className={cn(
            'h-24 w-[10rem] rounded-4 bg-muted px-6 text-[0.857rem] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-neutral-40',
            !isEmail && 'tracking-[0.2em] tabular-nums',
          )}
        />
        <button
          type="submit"
          disabled={isEmail ? !s.canSend : !s.canVerify}
          aria-label={isEmail ? 'Send code' : 'Sign in'}
          title={isEmail ? 'Send code' : 'Sign in'}
          className="flex size-24 shrink-0 items-center justify-center rounded-4 bg-foreground text-background hover:bg-neutral-80 disabled:bg-neutral-30"
        >
          {s.busy ? '…' : isEmail ? <ArrowIcon className="size-12" /> : <CheckIcon className="size-12" />}
        </button>
        <button
          type="button"
          onClick={isEmail ? close : s.back}
          aria-label={isEmail ? 'Cancel' : 'Use another email'}
          title={isEmail ? 'Cancel' : 'Use another email'}
          className={iconBtn}
        >
          <CloseIcon className="size-16" />
        </button>
      </form>
      {note && (
        <p className={cn('max-w-[13rem] px-8 pb-6 text-[0.714rem]', s.error ? 'text-destructive' : 'text-foreground-tertiary')}>
          {note}
        </p>
      )}
    </div>
  )
}

function Ended({ savedMin }: { savedMin: number | null }) {
  return (
    <div data-tauri-drag-region className="flex h-32 items-center gap-6 px-12 text-[0.857rem] whitespace-nowrap">
      {savedMin !== null ? (
        <>
          <CheckIcon className="size-16 shrink-0 text-success" />
          <span className="text-foreground">Saved</span>
          <span className="text-foreground-tertiary tabular-nums">{formatDuration(savedMin)}</span>
        </>
      ) : (
        <>
          <CloseIcon className="size-16 shrink-0 text-foreground-tertiary" />
          <span className="text-foreground-secondary">Discarded</span>
        </>
      )}
    </div>
  )
}

function StopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" {...props}>
      <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  )
}
