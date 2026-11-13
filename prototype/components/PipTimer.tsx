import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { createPortal } from 'react-dom'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import CloseIcon from 'pixelarticons/svg/close.svg?react'
import PipIcon from 'pixelarticons/svg/picture-in-picture.svg?react'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import BackIcon from 'pixelarticons/svg/corner-up-left.svg?react'
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
}: {
  icon: Icon
  label: string
  onClick: () => void
  onHover: (label: string | null) => void
  active?: boolean
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
      )}
    >
      <I className="size-16" />
    </button>
  )
}

function PipTimer({ win }: { win: Window }) {
  const session = useStore((s) => s.activeSession)!
  const { pauseSession, resumeSession, finishSession } = useStore.getState()
  const now = useNow(250, true, win) // ticks in the pop-out's own window (not throttled)
  const { displayMs, focusedMs, phase } = sessionClock(session, now)
  const [hint, setHint] = useState<string | null>(null)
  const timeUp = phase === 'timeUp'
  const paused = phase === 'paused'
  const discard = !timeUp && focusedMs < MIN_SAVED_MS

  return (
    <div className={cn('flex h-screen items-center gap-4 pr-6 pl-12', timeUp && 'bg-[oklch(0.97_0.04_75)]')}>
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

      {timeUp ? (
        <>
          <Btn icon={CheckIcon} label="Done" onClick={finishSession} onHover={setHint} active />
          <span onMouseEnter={() => setHint('Add time')} onMouseLeave={() => setHint(null)}>
            <ExtendInput compact />
          </span>
        </>
      ) : (
        <>
          {paused ? (
            <Btn icon={PlayIcon} label="Resume" onClick={resumeSession} onHover={setHint} />
          ) : (
            <Btn icon={PauseIcon} label="Pause" onClick={pauseSession} onHover={setHint} />
          )}
          {discard ? (
            <Btn icon={CloseIcon} label="Discard (under 1 min)" onClick={finishSession} onHover={setHint} />
          ) : (
            <Btn icon={StopIcon} label="Stop and save" onClick={finishSession} onHover={setHint} />
          )}
        </>
      )}

      <span className="mx-2 h-12 w-px shrink-0 bg-border" />
      <Btn icon={BackIcon} label="Back to Stint" onClick={backToTab} onHover={setHint} />
      {/* Stops floating on top: the timer carries on in the navbar, where it can be popped out again. */}
      <Btn icon={PipIcon} label="Hide timer" onClick={closePip} onHover={setHint} active />
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
