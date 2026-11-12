import { format, getISOWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Item, Section } from '../types'
import { EmptyRow, ItemRow } from './ItemRow'

/** Rows visible in a day before it scrolls (spreadsheet-like density). */
export const DAY_ROWS = 10
const CELL_HEADER = 'flex h-28 shrink-0 items-center gap-6 px-6 text-group-title'
// 28px header + 10 × 24px rows
const CELL_H = 'h-[19.43rem]' // 272px at 14px base

/** Renders items followed by empty rows, padded to `min` rows (always ≥ 1 empty). */
function RowList({ items, min = 0 }: { items: Item[]; min?: number }) {
  const empties = Math.max(min - items.length, 1)
  return (
    <>
      {items.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
      {Array.from({ length: empties }, (_, i) => (
        <EmptyRow key={`empty-${i}`} />
      ))}
    </>
  )
}

export function DayCell({
  date,
  inMonth,
  isToday,
  items,
}: {
  date: Date
  inMonth: boolean
  isToday: boolean
  items: Item[]
}) {
  if (!inMonth) {
    return (
      <div className={cn(CELL_H, 'flex flex-col border-r border-border bg-muted/60')}>
        <div className={cn(CELL_HEADER, 'text-muted-foreground')}>{format(date, 'd')}</div>
      </div>
    )
  }
  return (
    <div className={cn(CELL_H, 'flex min-w-0 flex-col border-r border-border')}>
      <div className={cn(CELL_HEADER, isToday ? 'text-foreground' : 'text-foreground-tertiary')}>
        {format(date, 'd')}
        {isToday && <span className="size-4 rounded-full bg-foreground" aria-label="Today" />}
      </div>
      <div className="cell-scroll min-h-0 flex-1 overflow-y-auto border-t border-border">
        <RowList items={items} min={DAY_ROWS} />
      </div>
    </div>
  )
}

const SECTION_LABEL: Record<Section, string> = { goals: 'Goals', notes: 'Notes', backlog: 'Backlog' }
const SECTIONS: Section[] = ['goals', 'notes', 'backlog']

function SectionBlock({ label, items, min }: { label: string; items: Item[]; min?: number }) {
  return (
    <section>
      <h3 className="flex h-24 items-end px-6 pb-4 text-[0.786rem] font-medium text-foreground-tertiary">{label}</h3>
      <div className="border-t border-border">
        <RowList items={items} min={min} />
      </div>
    </section>
  )
}

export function WeekCell({ monday, bySection }: { monday: Date; bySection: Record<Section, Item[]> }) {
  return (
    <div className={cn(CELL_H, 'flex min-w-0 flex-col bg-card')}>
      <div className={cn(CELL_HEADER, 'text-foreground-tertiary')}>Week {getISOWeek(monday)}</div>
      <div className="cell-scroll min-h-0 flex-1 overflow-y-auto border-t border-border">
        {SECTIONS.map((s) => (
          <SectionBlock key={s} label={SECTION_LABEL[s]} items={bySection[s]} />
        ))}
      </div>
    </div>
  )
}

export function MonthRow({ month, bySection }: { month: Date; bySection: Record<Section, Item[]> }) {
  const name = format(month, 'MMMM')
  return (
    <div className="grid grid-cols-3 border-b border-neutral-30 bg-card">
      {SECTIONS.map((s) => (
        <div key={s} className="cell-scroll h-[13.71rem] min-w-0 overflow-y-auto border-r border-border last:border-r-0">
          <SectionBlock label={`${name} ${SECTION_LABEL[s].toLowerCase()}`} items={bySection[s]} min={6} />
        </div>
      ))}
    </div>
  )
}
