import CloseIcon from 'pixelarticons/svg/close.svg?react'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import PauseIcon from '@/assets/icons/custom-pause.svg?react'
import { cn } from '@/lib/utils'
import { formatClock, MIN_SAVED_MS, sessionClock } from '../lib/session'
import { useIsMobile } from '../lib/useMedia'
import { isPhoneOrTablet } from '../lib/device'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import { ExtendInput } from './ExtendInput'
import { isMac, START_SHORTCUT, useStartOverlay } from '../lib/startOverlay'

const ghost =
  'flex h-28 items-center gap-6 rounded-6 px-8 text-[0.857rem] font-medium text-foreground-secondary hover:bg-muted'
const iconBtn = 'flex size-28 items-center justify-center rounded-6 text-icon hover:bg-muted hover:text-foreground'

/** Navbar: "Start a Stint" when idle; the counter + controls during a session. */
export function SessionControls() {
  const session = useStore((s) => s.activeSession)
  if (isPhoneOrTablet) return session ? <Counter /> : <ComputerOnly />
  return session ? <RunningControls /> : <StartButton />
}

/** Phones and tablets: sessions are computer-only. */
function ComputerOnly() {
  return <span className="truncate px-4 text-[0.786rem] text-foreground-tertiary">Focus sessions start on your computer</span>
}

/** Phones and tablets: the session running on the computer, to glance at (no controls). */
function Counter() {
  const session = useStore((s) => s.activeSession)!
  const now = useNow(1000)
  const { displayMs, phase } = sessionClock(session, now)
  return (
    <div className="flex items-center gap-6 px-4" role="status">
      <span
        className={cn(
          'size-6 rounded-full',
          phase === 'timeUp' ? 'animate-pulse bg-warning' : phase === 'paused' ? 'bg-neutral-40' : 'animate-pulse bg-success',
        )}
      />
      {phase === 'timeUp' ? (
        <span className="text-[0.857rem] font-medium text-foreground">Time’s up</span>
      ) : (
        <span
          className={cn(
            'font-dseg7 text-[1rem] leading-none tabular-nums',
            phase === 'paused' ? 'text-foreground-tertiary' : 'text-foreground',
          )}
        >
          {formatClock(displayMs)}
        </span>
      )}
    </div>
  )
}

function StartButton() {
  const setOpen = useStartOverlay((s) => s.setOpen)
  const mobile = useIsMobile()
  return (
    <button type="button" className={ghost} onClick={() => setOpen(true)} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
      <PlayIcon className="size-12" />
      Start a Stint
      {!mobile && (
        <kbd className="ml-2 font-geist text-[0.786rem] font-normal text-foreground-tertiary">{START_SHORTCUT}</kbd>
      )}
    </button>
  )
}

function RunningControls() {
  const session = useStore((s) => s.activeSession)!
  const { pauseSession, resumeSession, finishSession } = useStore.getState()
  const now = useNow(250)
  const { displayMs, focusedMs, phase } = sessionClock(session, now)
  const noCap = session.plannedMin === null

  if (phase === 'timeUp') {
    return (
      <div className="flex items-center gap-4" role="status" aria-live="polite">
        <span className="size-6 animate-pulse rounded-full bg-warning" />
        <span className="px-4 text-[0.857rem] font-medium text-foreground">Time’s up</span>
        <button type="button" className={cn(ghost, 'bg-foreground text-background hover:bg-neutral-80')} onClick={finishSession}>
          Done
        </button>
        <ExtendInput />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn('mx-4 size-6 rounded-full', phase === 'paused' ? 'bg-neutral-40' : 'animate-pulse bg-success')} />
      <span
        className={cn('min-w-[3.75rem] font-dseg7 text-[1rem] leading-none tabular-nums', phase === 'paused' ? 'text-foreground-tertiary' : 'text-foreground')}
        aria-label={`${formatClock(displayMs)} ${noCap ? 'focused' : 'remaining'}${phase === 'paused' ? ', paused' : ''}`}
      >
        {formatClock(displayMs)}
      </span>
      {phase === 'paused' ? (
        <button type="button" className={iconBtn} onClick={resumeSession} aria-label="Resume" title="Resume">
          <PlayIcon className="size-16" />
        </button>
      ) : (
        <button type="button" className={iconBtn} onClick={pauseSession} aria-label="Pause" title="Pause">
          <PauseIcon className="size-16" />
        </button>
      )}
      {focusedMs < MIN_SAVED_MS ? (
        <button type="button" className={iconBtn} onClick={finishSession} aria-label="Discard session" title="Discard (under 1 min, not saved)">
          <CloseIcon className="size-16" />
        </button>
      ) : (
        <button type="button" className={iconBtn} onClick={finishSession} aria-label="Stop session" title="Stop (saves the time focused so far)">
          <span className="size-8 rounded-[1px] bg-current" />
        </button>
      )}
    </div>
  )
}
