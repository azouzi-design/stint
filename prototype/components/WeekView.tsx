import { useLayoutEffect, useRef } from 'react'
import { addDays, addWeeks, format, getISOWeek, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { dayKey, mondayIn, monthForWeek, monthKey, weekKey } from '../lib/dates'
import { useSettings } from '../lib/settings'
import { useStore } from '../store'
import { PreviewContext, SECTION_LABEL, SECTIONS, useLists, type SectionCells } from '../lib/lists'
import { RowList, SectionBlock } from './Cells'

/** Rows shown per day on mobile before it grows (a day grows with its items; the page scrolls). */
const MOBILE_DAY_ROWS = 3

/**
 * Mobile: one week, swiped sideways (CSS scroll-snap). Three pages — previous, current, next week;
 * once a swipe settles on a side page, the week shifts and the pager re-centers.
 * The side pages are static previews, clipped to the current week's height.
 */
export function WeekPager() {
  const week = useStore((s) => s.viewWeek)
  const shiftWeek = useStore((s) => s.shiftWeek)
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef(0)
  const touching = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current!
    el.scrollLeft = el.clientWidth
    const recenter = () => (el.scrollLeft = el.clientWidth)
    window.addEventListener('resize', recenter)
    return () => window.removeEventListener('resize', recenter)
  }, [week])

  // Shift once scrolling has stopped and the finger is up (not while it holds the pager mid-swipe).
  function scheduleSettle() {
    clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = ref.current
      if (!el || touching.current) return
      const page = Math.round(el.scrollLeft / el.clientWidth)
      if (page !== 1) shiftWeek(page - 1)
    }, 120)
  }

  return (
    <div
      ref={ref}
      data-week-pager=""
      onScroll={scheduleSettle}
      onTouchStart={() => (touching.current = true)}
      onTouchEnd={() => {
        touching.current = false
        scheduleSettle()
      }}
      onTouchCancel={() => (touching.current = false)}
      className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
    >
      {[-1, 0, 1].map((offset) => {
        const start = addWeeks(week, offset)
        const page = 'w-full shrink-0 snap-center snap-always'
        return offset === 0 ? (
          <div key={offset} className={page}>
            <WeekView start={start} />
          </div>
        ) : (
          <div key={offset} className={cn(page, 'relative')} aria-hidden inert>
            <div className="absolute inset-0 overflow-hidden">
              <PreviewContext.Provider value>
                <WeekView start={start} />
              </PreviewContext.Provider>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({ start }: { start: Date }) {
  useSettings((s) => s.weekStart) // re-render when the week start changes
  const { get, sections } = useLists()
  const today = new Date()
  const month = monthForWeek(start)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="pb-32">
      {days.map((d) => {
        const isToday = isSameDay(d, today)
        return (
          <section key={d.toISOString()} className="border-b border-neutral-30">
            <h2 className="flex h-32 items-center gap-6 px-12 text-group-title">
              <span className={isToday ? 'text-foreground' : 'text-foreground-secondary'}>{format(d, 'EEEE')}</span>
              <span className="text-foreground-tertiary">{format(d, 'MMM d')}</span>
              {isToday && <span className="size-4 rounded-full bg-foreground" aria-label="Today" />}
            </h2>
            <div className="px-6">
              <div className="border-t border-border">
                <RowList container={dayKey(d)} items={get(dayKey(d))} min={MOBILE_DAY_ROWS} inDay />
              </div>
            </div>
          </section>
        )
      })}
      <Sections title={`Week ${getISOWeek(mondayIn(start))}`} cells={sections((s) => weekKey(start, s))} />
      <Sections title={format(month, 'MMMM')} cells={sections((s) => monthKey(month, s))} />
    </div>
  )
}

/** The weekly / monthly cell, stacked: Goals, Notes, Backlog. */
function Sections({ title, cells }: { title: string; cells: SectionCells }) {
  return (
    <section className="border-b border-neutral-30 bg-card pb-12">
      <h2 className="flex h-32 items-center px-12 text-group-title text-foreground-secondary">{title}</h2>
      <div className="px-6">
        {SECTIONS.map((s) => (
          <SectionBlock key={s} section={s} label={SECTION_LABEL[s]} cell={cells[s]} />
        ))}
      </div>
    </section>
  )
}
