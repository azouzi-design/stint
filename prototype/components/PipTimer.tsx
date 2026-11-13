import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import { createPortal } from 'react-dom'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import CloseIcon from 'pixelarticons/svg/close.svg?react'
import PipIcon from 'pixelarticons/svg/picture-in-picture.svg?react'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import BackIcon from 'pixelarticons/svg/corner-up-left.svg?react'
import MoreIcon from 'pixelarticons/svg/more-vertical.svg?react'
import PauseIcon from '@/assets/icons/custom-pause.svg?react'
import { cn } from '@/lib/utils'
import { formatDuration } from '../lib/dates'
import { backToTab, closePip, usePip } from '../lib/pip'
import { formatClock, MIN_SAVED_MS, sessionClock } from '../lib/session'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import { ExtendInput } from './ExtendInput'

/** How long the pop-out shows "Saved" / "Discarded" before closing. */
const END_MS = 1600

/** Renders the pop-out timer into its window while one is open. */
export function PipPortal() {
  const win = usePip((s) => s.win)
  const session = useStore((s) => s.activeSession)
  const items = useStore((s) => s.items)
  // Remember the last session so its outcome can be shown once it ends.
  const [lastItemId, setLastItemId] = useState<string | null>(null)
  if (session && session.itemId !== lastItemId) setLastItemId(session.itemId)

  // The session just ended: show how it ended, then close.
  useEffect(() => {
    if (!win || session) return
    const t = setTimeout(closePip, END_MS)
    return () => clearTimeout(t)
  }, [win, session])

  if (!win) return null
  if (session) return createPortal(<PipTimer win={win} />, win.document.body)
  const item = items.find((i) => i.id === lastItemId)
  const savedMin = item?.type === 'session' ? (item.focusedMin ?? null) : null
  return createPortal(<PipEnded savedMin={savedMin} />, win.document.body)
}

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Icon button. Its label replaces the timer text while hovered: the window is too small for tooltips. */
function Btn({
  icon: I,
  label,
  onClick,
  onHover,
  active,
  className,
}: {
  icon: Icon
  label: string
  onClick: () => void
  onHover: (label: string | null) => void
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(label)}
      onBlur={() => onHover(null)}
      className={cn(
        'flex size-24 shrink-0 items-center justify-center rounded-4 text-icon hover:bg-muted hover:text-foreground',
        active && 'text-foreground',
        className,
      )}
    >
      <I className="size-16" />
    </button>
  )
}

type Action = { icon: Icon; label: string; onClick: () => void }

function PipTimer({ win }: { win: Window }) {
  const session = useStore((s) => s.activeSession)!
  const { pauseSession, resumeSession, finishSession } = useStore.getState()
  const now = useNow(250, true, win) // ticks in the pop-out's own window (not throttled)
  const { displayMs, focusedMs, phase } = sessionClock(session, now)
  const [hint, setHint] = useState<string | null>(null)
  // Open menu: the window's height before the menu grew it (the row keeps it), and whether the
  // window couldn't grow, in which case the actions show as icons in the row instead.
  const [menu, setMenu] = useState<{ rowHeight: number; inline: boolean } | null>(null)
  const closeMenu = () => setMenu(null)
  const timeUp = phase === 'timeUp'
  const paused = phase === 'paused'
  const discard = !timeUp && focusedMs < MIN_SAVED_MS

  // Time's up changes the menu's items (and height): close it rather than leave a gap.
  const [wasTimeUp, setWasTimeUp] = useState(timeUp)
  if (timeUp !== wasTimeUp) {
    setWasTimeUp(timeUp)
    setMenu(null)
  }

  // Time's up keeps Done + extend in the row; the menu holds the rest.
  const actions: Action[] = [
    ...(timeUp
      ? []
      : [
          paused
            ? { icon: PlayIcon, label: 'Resume', onClick: resumeSession }
            : { icon: PauseIcon, label: 'Pause', onClick: pauseSession },
          discard
            ? { icon: CloseIcon, label: 'Discard (under 1 min)', onClick: finishSession }
            : { icon: StopIcon, label: 'Stop and save', onClick: finishSession },
        ]),
    { icon: BackIcon, label: 'Back to Stint', onClick: backToTab },
    // Stops floating on top: the timer carries on in the navbar, where it can be popped out again.
    { icon: PipIcon, label: 'Hide timer', onClick: closePip },
  ]

  return (
    <div className="flex h-screen flex-col">
      <div
        className={cn('flex h-screen shrink-0 items-center gap-4 pr-2 pl-8', timeUp && 'bg-[oklch(0.97_0.04_75)]')}
        style={menu && !menu.inline ? { height: menu.rowHeight } : undefined}
      >
        {/* State dot + time, or the hovered button's label */}
        <span
          className={cn(
            'size-6 shrink-0 rounded-full',
            timeUp ? 'animate-pulse bg-warning' : paused ? 'bg-neutral-40' : 'animate-pulse bg-success',
          )}
        />
        <span className="ml-4 min-w-0 flex-1 truncate" aria-live="polite">
          {hint ? (
            <span className="text-[0.786rem] text-foreground-secondary">{hint}</span>
          ) : timeUp ? (
            <span className="text-[0.786rem] font-medium text-foreground">Time’s up</span>
          ) : (
            <span className={cn('font-dseg7 text-[1.071rem] leading-none tabular-nums', paused && 'text-foreground-tertiary')}>
              {formatClock(displayMs)}
            </span>
          )}
        </span>

        {menu?.inline ? (
          actions.map((a) => (
            <Btn
              key={a.label}
              icon={a.icon}
              label={a.label}
              onClick={() => {
                closeMenu()
                setHint(null)
                a.onClick()
              }}
              onHover={setHint}
            />
          ))
        ) : timeUp ? (
          <>
            <Btn icon={CheckIcon} label="Done" onClick={finishSession} onHover={setHint} active />
            <span onMouseEnter={() => setHint('Add time')} onMouseLeave={() => setHint(null)}>
              <ExtendInput compact />
            </span>
          </>
        ) : null}
        <Btn
          icon={MoreIcon}
          label={menu ? 'Close menu' : 'Actions'}
          onClick={() => {
            setMenu(menu ? null : { rowHeight: win.innerHeight, inline: false })
            setHint(null)
          }}
          onHover={setHint}
          active={!!menu}
          className={menu ? 'bg-muted' : undefined}
        />
      </div>

      {menu && !menu.inline && (
        <PipMenu
          win={win}
          actions={actions}
          onClose={closeMenu}
          onCantGrow={() => setMenu((m) => m && { ...m, inline: true })}
        />
      )}
    </div>
  )
}

/**
 * The pop-out is one row tall, so opening the menu grows the window by the menu's height
 * (allowed right after a click in the pop-out) and closing it shrinks the window back. If the
 * browser refuses to resize, `onCantGrow` swaps to the icons-in-the-row fallback.
 */
function PipMenu({
  win,
  actions,
  onClose,
  onCantGrow,
}: {
  win: Window
  actions: Action[]
  onClose: () => void
  onCantGrow: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0
    const before = win.innerHeight
    const grew = () => win.innerHeight > before + h / 2
    try {
      win.resizeBy(0, h)
    } catch {
      /* not allowed: checked below */
    }
    const check = setTimeout(() => grew() || onCantGrow(), 150)
    return () => {
      clearTimeout(check)
      if (!grew()) return
      try {
        win.resizeBy(0, -h)
      } catch {
        /* window already closed */
      }
    }
  }, [win]) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening

  // Close on Escape or a click outside the menu (the ⋮ button toggles it itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element
      if (!ref.current?.contains(t) && !t.closest?.('[aria-label="Close menu"]')) onClose()
    }
    win.addEventListener('keydown', onKey)
    win.addEventListener('pointerdown', onDown)
    return () => {
      win.removeEventListener('keydown', onKey)
      win.removeEventListener('pointerdown', onDown)
    }
  }, [win, onClose])

  return (
    <div ref={ref} role="menu" className="shrink-0 border-t border-border p-4">
      {actions.map(({ icon: I, label, onClick }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onClick()
          }}
          className="flex h-28 w-full items-center gap-8 rounded-4 px-8 text-left text-[0.857rem] text-foreground hover:bg-muted"
        >
          <I className="size-16 shrink-0 text-icon" />
          {label}
        </button>
      ))}
    </div>
  )
}

/** Shown briefly once the session ends, then the window closes. */
function PipEnded({ savedMin }: { savedMin: number | null }) {
  return (
    <div className="flex h-screen items-center gap-8 px-12 text-[0.857rem]">
      {savedMin !== null ? (
        <>
          <CheckIcon className="size-16 shrink-0 text-success" />
          <span className="text-foreground">Saved</span>
          <span className="text-foreground-tertiary tabular-nums">{formatDuration(savedMin)} focused</span>
        </>
      ) : (
        <>
          <CloseIcon className="size-16 shrink-0 text-foreground-tertiary" />
          <span className="text-foreground-secondary">Discarded</span>
          <span className="text-foreground-tertiary">under 1 min</span>
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
