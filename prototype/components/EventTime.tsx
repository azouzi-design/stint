// Picking an event's time without typing it: a start list (15-minute steps) and length chips.
// Used while creating an event in a row (RowEditor) and in an event's details popup.
import { forwardRef } from 'react'
import ClockIcon from 'pixelarticons/svg/clock.svg?react'
import { cn } from '@/lib/utils'
import { formatDuration, formatTime } from '../lib/dates'
import { DEFAULT_EVENT_MIN } from '../lib/parse'
import { useSettings } from '../lib/settings'

const LENGTHS = [15, 30, 45, 60, 90, 120]
const LAST = 23 * 60 + 59

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const fromMin = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

/** The next quarter hour from now: where a new event starts when only its length is picked. */
const nextQuarter = () => {
  const d = new Date()
  return Math.min(Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 15) * 15, LAST - 15)
}

interface Props {
  start: string | null
  end: string | null
  onChange: (start: string, end: string) => void
}

/** Start list + length chips. Changing the start keeps the length. */
export const EventTimeFields = forwardRef<HTMLSelectElement, Props>(function EventTimeFields({ start, end, onChange }, ref) {
  const f = useSettings((s) => s.timeFormat)
  const s = start ? toMin(start) : null
  const length = s !== null && end ? toMin(end) - s : null
  const slots = Array.from({ length: 96 }, (_, i) => i * 15)
  if (s !== null && !slots.includes(s)) slots.push(s) // a typed start off the 15-minute grid
  slots.sort((a, b) => a - b)

  const set = (startMin: number, len: number) => onChange(fromMin(startMin), fromMin(Math.min(startMin + len, LAST)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-24 items-center gap-8">
        <ClockIcon className="size-12 shrink-0 text-icon" aria-hidden />
        <select
          ref={ref}
          value={s ?? ''}
          onChange={(e) => set(Number(e.target.value), length ?? DEFAULT_EVENT_MIN)}
          aria-label="Start time"
          className={cn(
            'h-24 cursor-pointer rounded-4 bg-muted px-4 tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-foreground',
            s === null ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {s === null && (
            <option value="" disabled>
              Start time
            </option>
          )}
          {slots.map((m) => (
            <option key={m} value={m}>
              {formatTime(fromMin(m), f)}
            </option>
          ))}
        </select>
        {end && length !== null && (
          <span className="truncate text-foreground-tertiary tabular-nums">
            → {formatTime(end, f)} · {formatDuration(length)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 pl-20" role="group" aria-label="Length">
        {LENGTHS.map((len) => (
          <button
            key={len}
            type="button"
            // Keep the focus where it is (the row being typed in).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => set(s ?? nextQuarter(), len)}
            aria-pressed={length === len}
            className={cn(
              'h-20 rounded-4 px-6 text-[0.786rem] tabular-nums',
              length === len ? 'bg-foreground text-background' : 'bg-muted text-foreground-secondary hover:text-foreground',
            )}
          >
            {formatDuration(len)}
          </button>
        ))}
      </div>
    </div>
  )
})
