import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import PauseIcon from '@/assets/icons/custom-pause.svg?react'
import { cn } from '@/lib/utils'
import { closePip, usePip } from '../lib/pip'
import { formatClock, sessionClock } from '../lib/session'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'

/** Renders the pop-out timer into the Picture-in-Picture window while it's open. */
export function PipPortal() {
  const win = usePip((s) => s.win)
  const session = useStore((s) => s.activeSession)

  // Close the pop-out once the session is over.
  useEffect(() => {
    if (win && !session) closePip()
  }, [win, session])

  if (!win || !session) return null
  return createPortal(<PipTimer win={win} />, win.document.body)
}

const btn = 'flex h-28 items-center justify-center gap-4 rounded-6 px-8 text-[0.857rem] font-medium'

function PipTimer({ win }: { win: Window }) {
  const session = useStore((s) => s.activeSession)!
  const { pauseSession, resumeSession, extendSession, finishSession } = useStore.getState()
  const now = useNow(250, true, win) // ticks in the pop-out's own window (not throttled)
  const { remainingMs, phase } = sessionClock(session, now)
  const timeUp = phase === 'timeUp'

  return (
    <div className={cn('flex h-screen flex-col items-center justify-center gap-8 p-12', timeUp && 'bg-[oklch(0.97_0.04_75)]')}>
      <p className="flex items-center gap-6 text-[0.786rem] text-foreground-tertiary">
        <span className={cn('size-6 rounded-full', timeUp ? 'animate-pulse bg-warning' : phase === 'paused' ? 'bg-neutral-40' : 'animate-pulse bg-success')} />
        {timeUp ? 'Time’s up' : phase === 'paused' ? 'Paused' : 'Focusing'}
      </p>
      <p className={cn('font-dseg7 text-[2.6rem] leading-none tabular-nums', phase === 'paused' && 'text-foreground-tertiary')}>
        {formatClock(remainingMs)}
      </p>
      <div className="flex items-center gap-4">
        {timeUp ? (
          <>
            <button type="button" className={cn(btn, 'bg-foreground text-background')} onClick={finishSession}>
              Done
            </button>
            <button type="button" className={cn(btn, 'bg-muted text-foreground-secondary')} onClick={() => extendSession(5)}>
              +5m
            </button>
            <button type="button" className={cn(btn, 'bg-muted text-foreground-secondary')} onClick={() => extendSession(15)}>
              +15m
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={cn(btn, 'bg-muted text-foreground-secondary')}
              onClick={phase === 'paused' ? resumeSession : pauseSession}
            >
              {phase === 'paused' ? <PlayIcon className="size-12" /> : <PauseIcon className="size-12" />}
              {phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className={cn(btn, 'bg-muted text-foreground-secondary')} onClick={finishSession}>
              <span className="size-8 rounded-[1px] bg-current" />
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  )
}
