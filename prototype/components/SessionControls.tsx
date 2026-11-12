import { useState } from 'react'
import { Popover } from 'radix-ui'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import PipIcon from 'pixelarticons/svg/picture-in-picture.svg?react'
import PauseIcon from '@/assets/icons/custom-pause.svg?react'
import { cn } from '@/lib/utils'
import { openPip, pipSupported, usePip } from '../lib/pip'
import { formatClock, primeAudio, sessionClock } from '../lib/session'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import { popoverClass } from './ItemRow'

const ghost =
  'flex h-28 items-center gap-6 rounded-6 px-8 text-[0.857rem] font-medium text-foreground-secondary hover:bg-muted'
const iconBtn = 'flex size-28 items-center justify-center rounded-6 text-icon hover:bg-muted hover:text-foreground'
const PRESETS = [25, 50, 90]

/** Start the session and open the pop-out — both from the same click (the pop-out requires one). */
function start(minutes: number) {
  primeAudio()
  useStore.getState().startSession(minutes)
  openPip().catch(() => {}) // unsupported browsers (Safari, Firefox): no pop-out
}

/** Navbar: "Start a Stint" when idle; the counter + controls during a session. */
export function SessionControls() {
  const session = useStore((s) => s.activeSession)
  return session ? <RunningControls /> : <StartButton />
}

function StartButton() {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const go = (m: number) => {
    setOpen(false)
    start(m)
  }
  const customMin = Math.round(Number(custom))

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={ghost}>
        <PlayIcon className="size-12" />
        Start a Stint
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="start" sideOffset={6} className={cn(popoverClass, 'w-[15rem] p-8')}>
          <p className="mb-8 px-2 text-[0.786rem] text-foreground-tertiary">Focus for</p>
          <div className="grid grid-cols-3 gap-4">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => go(m)}
                className="h-32 rounded-6 bg-muted font-medium text-foreground-secondary tabular-nums hover:bg-neutral-20 hover:text-foreground"
              >
                {m}m
              </button>
            ))}
          </div>
          <form
            className="mt-8 flex items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (customMin >= 1 && customMin <= 600) go(customMin)
            }}
          >
            <input
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Custom"
              aria-label="Custom duration in minutes"
              className="h-28 min-w-0 flex-1 rounded-4 bg-muted px-8 text-foreground tabular-nums outline-none placeholder:text-muted-foreground"
            />
            <span className="text-foreground-tertiary">min</span>
            <button
              type="submit"
              disabled={!(customMin >= 1 && customMin <= 600)}
              className="h-28 rounded-4 bg-foreground px-8 text-background disabled:opacity-30"
            >
              Start
            </button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function RunningControls() {
  const session = useStore((s) => s.activeSession)!
  const { pauseSession, resumeSession, extendSession, finishSession } = useStore.getState()
  const pipWin = usePip((s) => s.win)
  const now = useNow(250)
  const { remainingMs, phase } = sessionClock(session, now)

  if (phase === 'timeUp') {
    return (
      <div className="flex items-center gap-4" role="status" aria-live="polite">
        <span className="size-6 animate-pulse rounded-full bg-warning" />
        <span className="px-4 text-[0.857rem] font-medium text-foreground">Time’s up</span>
        <button type="button" className={cn(ghost, 'bg-foreground text-background hover:bg-neutral-80')} onClick={finishSession}>
          Done
        </button>
        <button type="button" className={ghost} onClick={() => extendSession(5)}>
          +5m
        </button>
        <button type="button" className={ghost} onClick={() => extendSession(15)}>
          +15m
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn('mx-4 size-6 rounded-full', phase === 'paused' ? 'bg-neutral-40' : 'animate-pulse bg-success')} />
      <span
        className={cn('w-[5.5rem] text-timer-sm tabular-nums', phase === 'paused' ? 'text-foreground-tertiary' : 'text-foreground')}
        aria-label={`${formatClock(remainingMs)} remaining${phase === 'paused' ? ', paused' : ''}`}
      >
        {formatClock(remainingMs)}
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
      <button type="button" className={iconBtn} onClick={finishSession} aria-label="Stop session" title="Stop (saves the time focused so far)">
        <span className="size-8 rounded-[1px] bg-current" />
      </button>
      {pipSupported() && !pipWin && (
        <button
          type="button"
          className={iconBtn}
          onClick={() => openPip().catch(() => {})}
          aria-label="Pop out timer"
          title="Pop out timer (stays on top)"
        >
          <PipIcon className="size-16" />
        </button>
      )}
    </div>
  )
}
