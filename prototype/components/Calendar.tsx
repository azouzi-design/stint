import { useMemo } from 'react'
import { isSameDay, isSameMonth } from 'date-fns'
import { dayKey, monthKey, monthWeeks, weekKey } from '../lib/dates'
import { groupByContainer, useStore } from '../store'
import type { Item, Section } from '../types'
import { DayCell, MonthRow, WeekCell } from './Cells'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const GRID = 'grid grid-cols-8'
const EMPTY: Item[] = []

export function Calendar() {
  const items = useStore((s) => s.items)
  const month = useStore((s) => s.viewMonth)
  const byContainer = useMemo(() => groupByContainer(items), [items])
  const weeks = useMemo(() => monthWeeks(month), [month])
  const today = new Date()
  const get = (key: string) => byContainer.get(key) ?? EMPTY
  const sections = (keyFor: (s: Section) => string): Record<Section, Item[]> => ({
    goals: get(keyFor('goals')),
    notes: get(keyFor('notes')),
    backlog: get(keyFor('backlog')),
  })

  return (
    <div className="min-w-[68rem]">
      {/* Column headers */}
      <div className={`${GRID} sticky top-48 z-10 border-b border-neutral-30 bg-background`}>
        {[...WEEKDAYS, 'Weekly'].map((d) => (
          <div key={d} className="flex h-32 items-center px-6 text-group-title text-foreground-tertiary">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((days) => (
        <div key={days[0].toISOString()} className={`${GRID} border-b border-neutral-30`}>
          {days.map((d) => (
            <DayCell
              key={d.toISOString()}
              date={d}
              inMonth={isSameMonth(d, month)}
              isToday={isSameDay(d, today)}
              items={get(dayKey(d))}
            />
          ))}
          <WeekCell monday={days[0]} bySection={sections((s) => weekKey(days[0], s))} />
        </div>
      ))}

      <MonthRow month={month} bySection={sections((s) => monthKey(month, s))} />
    </div>
  )
}
