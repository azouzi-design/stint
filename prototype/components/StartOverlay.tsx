import { useEffect, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'
import { cn } from '@/lib/utils'
import { openPip } from '../lib/pip'
import { primeAudio } from '../lib/session'
import { isMac, useStartOverlay } from '../lib/startOverlay'
import { useStore } from '../store'

const MAX_MIN = 600 // 10 hours

type Unit = 'min' | 'hr'

/** Start the session and open the pop-out — both from the same click / key press (the pop-out requires one). */
function start(minutes: number | null) {
  primeAudio()
  useStore.getState().startSession(minutes)
  openPip().catch(() => {}) // unsupported browsers (Safari, Firefox): no pop-out
}

/** Minutes for the typed value, or null when it isn't a valid duration. */
function toMinutes(value: string, unit: Unit): number | null {
  const n = Number(value)
  if (!value || !Number.isFinite(n)) return null
  const minutes = Math.round(unit === 'hr' ? n * 60 : n)
  return minutes >= 1 && minutes <= MAX_MIN ? minutes : null
}

/** ⌘K / Ctrl+K anywhere opens the overlay (unless a row editor used it, e.g. for a link). At time's up it focuses the extend field. */
function useStartShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key.toLowerCase() !== 'k' || !(isMac ? e.metaKey : e.ctrlKey)) return
      e.preventDefault()
      const session = useStore.getState().activeSession
      // Time's up: jump to the extend field instead.
      if (session?.timeUpAt) document.querySelector<HTMLInputElement>('[data-extend-input]')?.focus()
      if (session) return
      const { open, setOpen } = useStartOverlay.getState()
      setOpen(!open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function StartOverlay() {
  useStartShortcut()
  const open = useStartOverlay((s) => s.open)
  const setOpen = useStartOverlay((s) => s.setOpen)
  const session = useStore((s) => s.activeSession)

  // A session started elsewhere (or a refresh restoring one) closes the overlay.
  useEffect(() => {
    if (session) setOpen(false)
  }, [session, setOpen])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--primitive-neutral-10)/0.82)] backdrop-blur-[6px] start-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex items-center justify-center px-16 outline-none"
          onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)} // click outside the bar closes
        >
          {open && <StartBar onStart={() => setOpen(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function StartBar({ onStart }: { onStart: () => void }) {
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('min')
  const [noCap, setNoCap] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const minutes = toMinutes(value, unit)
  const canStart = noCap || minutes !== null
  const tooLong = !noCap && Number(value) > 0 && Math.round(unit === 'hr' ? Number(value) * 60 : Number(value)) > MAX_MIN

  const go = () => {
    if (!canStart) return
    onStart()
    start(noCap ? null : minutes)
  }

  const switchUnit = (u: Unit) => {
    setUnit(u)
    inputRef.current?.focus()
  }

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key.toLowerCase()
    if (e.metaKey || e.ctrlKey || e.altKey) return
    // Letters as unit shortcuts: type "90m" or "1.5h".
    if (k === 'm' || k === 'h') {
      e.preventDefault()
      switchUnit(k === 'm' ? 'min' : 'hr')
    } else if (k === 'n') {
      e.preventDefault()
      setNoCap((c) => !c)
    }
  }

  return (
    <div className="w-full max-w-[40rem]">
      <Dialog.Title className="sr-only">Start a Stint</Dialog.Title>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          go()
        }}
        className="start-bar flex flex-wrap items-center gap-12 rounded-12 border border-border bg-background py-12 pr-12 pl-20 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.05)]"
      >
        {/* Logomark + duration */}
        <div className="flex min-w-0 flex-1 items-center gap-16">
          <Logomark className="size-32 shrink-0 text-foreground" aria-hidden />
          <label className="flex min-w-0 flex-1 items-baseline gap-8">
            <span className="sr-only">Duration in {unit === 'min' ? 'minutes' : 'hours'}</span>
            <input
              ref={inputRef}
              autoFocus
              inputMode="decimal"
              autoComplete="off"
              value={noCap ? '' : value}
              placeholder={noCap ? '--' : '00'}
              onChange={(e) => {
                // Digits and one decimal (so "1.5h" can be typed before the unit). Minutes get rounded.
                const clean = e.target.value.replace(/[^\d.]/g, '').replace(/^(\d{0,3}\.?\d?).*$/, '$1')
                setValue(clean)
                if (clean) setNoCap(false) // typing a duration turns the timecap back on
              }}
              onKeyDown={onInputKey}
              className={cn(
                'h-[4.5rem] w-0 min-w-0 flex-1 bg-transparent font-dseg7 text-[3.4rem] leading-none tracking-[-0.02em] text-foreground tabular-nums caret-foreground outline-none placeholder:text-neutral-20',
              )}
            />
          </label>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8 max-sm:w-full max-sm:justify-between">
          <div
            role="radiogroup"
            aria-label="Unit"
            className={cn('flex h-32 rounded-8 bg-muted p-2 transition-opacity', noCap && 'opacity-40')}
          >
            {(['min', 'hr'] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                onClick={() => {
                  setNoCap(false)
                  switchUnit(u)
                }}
                className={cn(
                  'w-40 rounded-6 text-[0.857rem] font-medium text-foreground-tertiary hover:text-foreground',
                  unit === u && 'bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
                )}
              >
                {u === 'min' ? 'Min' : 'Hr'}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-pressed={noCap}
            onClick={() => {
              setNoCap((c) => !c)
              inputRef.current?.focus()
            }}
            className={cn(
              'flex h-32 items-center gap-8 rounded-8 px-12 text-[0.857rem] font-medium whitespace-nowrap',
              noCap ? 'bg-foreground text-background' : 'bg-muted text-foreground-secondary hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-12 items-center justify-center rounded-[3px] border',
                noCap ? 'border-background' : 'border-neutral-40',
              )}
            >
              {noCap && <span className="size-6 rounded-[1px] bg-background" />}
            </span>
            No timecap
          </button>

          <button
            type="submit"
            disabled={!canStart}
            className="flex h-32 items-center gap-6 rounded-8 bg-foreground px-12 text-[0.857rem] font-medium text-background hover:bg-neutral-80 disabled:bg-neutral-30"
          >
            <PlayIcon className="size-12" />
            Start
            <kbd className="font-geist text-[0.786rem] text-background/60 max-sm:hidden">↵</kbd>
          </button>
        </div>
      </form>

      {/* Hints */}
      <p className="mt-12 flex flex-wrap justify-center gap-x-16 gap-y-4 text-[0.786rem] text-foreground-tertiary max-sm:hidden">
        {tooLong ? (
          <span className="text-destructive">Up to 10 hours</span>
        ) : (
          <>
            <span><Kbd>M</Kbd> / <Kbd>H</Kbd> minutes / hours</span>
            <span><Kbd>N</Kbd> no timecap</span>
            <span><Kbd>↵</Kbd> start</span>
            <span><Kbd>esc</Kbd> close</span>
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
