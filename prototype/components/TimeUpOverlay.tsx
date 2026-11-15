import { useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import { cn } from '@/lib/utils'
import { parseDuration } from '../lib/session'
import { useTimeUpOverlay } from '../lib/startOverlay'
import { useStore } from '../store'

/**
 * Time's up: covers the whole screen, like the start overlay, until the user responds.
 * Clicking outside doesn't close it. Esc hides it (the navbar keeps Done / extend, ⌘K brings it back).
 */
export function TimeUpOverlay() {
  const session = useStore((s) => s.activeSession)
  const hiddenFor = useTimeUpOverlay((s) => s.hiddenFor)
  const timeUpAt = session?.timeUpAt ?? null
  const open = !!timeUpAt && hiddenFor !== timeUpAt

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && timeUpAt && useTimeUpOverlay.setState({ hiddenFor: timeUpAt })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--primitive-neutral-10)/0.82)] backdrop-blur-[6px] start-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex items-center justify-center px-16 outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {open && session && <TimeUpBar key={timeUpAt} plannedMin={session.plannedMin} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function TimeUpBar({ plannedMin }: { plannedMin: number | null }) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const minutes = parseDuration(text)
  const invalid = text.trim() !== '' && minutes === null
  const { finishSession, extendSession } = useStore.getState()

  // Enter: extends when a duration is typed, otherwise Done.
  const submit = () => {
    if (minutes) extendSession(minutes)
    else if (!text.trim()) finishSession()
  }

  return (
    <div className="w-full max-w-[40rem]">
      <Dialog.Title className="sr-only">Time's up</Dialog.Title>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="start-bar flex flex-wrap items-center gap-12 rounded-12 border border-border bg-[oklch(0.97_0.04_75)] py-12 pr-12 pl-20 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.05)]"
      >
        {/* Status */}
        <div className="flex min-w-0 flex-1 items-center gap-16" role="status" aria-live="assertive">
          <span className="size-12 shrink-0 animate-pulse rounded-full bg-warning" aria-hidden />
          <span className="font-dseg7 text-[3.4rem] leading-[4.5rem] tracking-[-0.02em] text-foreground tabular-nums" aria-hidden>
            0:00
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[1rem] font-medium text-foreground">Time’s up</span>
            {plannedMin && <span className="text-[0.857rem] text-foreground-tertiary">{plannedMin} min focused</span>}
          </span>
        </div>

        {/* Extend + Done */}
        <div className="flex items-center gap-8 max-sm:w-full max-sm:justify-between">
          <label
            className={cn(
              'flex h-32 items-center rounded-8 bg-background/70 pr-4 pl-12 focus-within:ring-1',
              invalid ? 'ring-1 ring-destructive' : 'focus-within:ring-neutral-40',
            )}
          >
            <span className="text-[0.857rem] font-medium text-foreground-tertiary">+</span>
            <input
              ref={inputRef}
              autoFocus
              data-extend-input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 6))}
              placeholder="20m"
              aria-label="Extend by (minutes, or hours with h)"
              autoComplete="off"
              className="w-[3.5rem] min-w-0 bg-transparent px-4 text-[0.857rem] text-foreground tabular-nums outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              disabled={!minutes}
              onClick={() => minutes && extendSession(minutes)}
              className="flex h-24 items-center rounded-6 px-6 text-[0.857rem] font-medium text-foreground-secondary enabled:hover:bg-background enabled:hover:text-foreground disabled:text-neutral-30"
            >
              Extend
            </button>
          </label>

          <button
            type="button"
            onClick={finishSession}
            className="flex h-32 items-center gap-6 rounded-8 bg-foreground px-12 text-[0.857rem] font-medium text-background hover:bg-neutral-80"
          >
            <CheckIcon className="size-12" />
            Done
            {!text.trim() && <kbd className="font-geist text-[0.786rem] text-background/60 max-sm:hidden">↵</kbd>}
          </button>
        </div>
      </form>

      {/* Hints */}
      <p className="mt-12 flex flex-wrap justify-center gap-x-16 gap-y-4 text-[0.786rem] text-foreground-tertiary max-sm:hidden">
        {invalid ? (
          <span className="text-destructive">Type minutes (20) or hours (1.5h), up to 10 h</span>
        ) : (
          <>
            <span>Type <Kbd>20m</Kbd> / <Kbd>1h</Kbd> to extend</span>
            <span><Kbd>↵</Kbd> {minutes ? `extend ${minutes} min` : 'done'}</span>
            <span><Kbd>esc</Kbd> hide</span>
          </>
        )}
      </p>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-20 min-w-20 items-center justify-center rounded-4 border border-border bg-background px-4 font-geist text-[0.714rem] text-foreground-secondary">
      {children}
    </kbd>
  )
}
