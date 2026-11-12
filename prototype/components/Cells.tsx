import { useContext } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { format, getISOWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import type { EditMode } from '../lib/parse'
import { PreviewContext, SECTION_LABEL, SECTIONS, type SectionCells } from '../lib/lists'
import { useStore } from '../store'
import type { Item, Section } from '../types'
import { EmptyRow, ItemRow, RowView, StaticEmptyRow } from './ItemRow'
import { RowEditor } from './RowEditor'
import { noShift } from './dnd'

/** Rows visible in a day before it scrolls (spreadsheet-like density). */
export const DAY_ROWS = 10
const CELL_HEADER = 'flex h-28 shrink-0 items-center gap-6 px-6 text-group-title'
// 28px header + 10 × 24px rows
const CELL_H = 'h-[19.43rem]' // 272px at 14px base

interface RowListProps {
  container: string
  items: Item[]
  /** Pad with empty rows up to this many (always at least 1 empty row). */
  min?: number
  /** Day cells: `/` picker + event shortcut. */
  inDay?: boolean
  /** Weekly/monthly sections: fixed type for new rows. */
  sectionMode?: EditMode
}

export function RowList(props: RowListProps) {
  return useContext(PreviewContext) ? <StaticRowList {...props} /> : <LiveRowList {...props} />
}

function StaticRowList({ items, min = 0 }: RowListProps) {
  return (
    <div>
      {items.map((item) => (
        <RowView key={item.id} item={item} />
      ))}
      {Array.from({ length: Math.max(min - items.length, 1) }, (_, i) => (
        <StaticEmptyRow key={`empty-${i}`} />
      ))}
    </div>
  )
}

function LiveRowList({ container, items, min = 0, inDay = false, sectionMode }: RowListProps) {
  const editing = useStore((s) => (s.editing?.container === container ? s.editing : null))
  const startEditing = useStore((s) => s.startEditing)
  const editorProps = { container, inDay, sectionMode }
  const draft = editing && editing.id === null ? editing : null
  const draftEditor = draft && (
    <RowEditor key={`draft-${draft.afterId ?? 'end'}`} afterId={draft.afterId} {...editorProps} />
  )
  const draftAnchored = !!draft?.afterId && items.some((i) => i.id === draft.afterId)

  const rows: React.ReactNode[] = []
  for (const item of items) {
    rows.push(
      editing?.id === item.id ? (
        <RowEditor key={`edit-${item.id}`} item={item} afterId={null} {...editorProps} />
      ) : (
        <ItemRow key={item.id} item={item} />
      ),
    )
    if (draftAnchored && draft?.afterId === item.id) rows.push(draftEditor)
  }
  if (draft && !draftAnchored) rows.push(draftEditor)

  // The whole list (empty rows included) is a drop target; items are sortable within it.
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${container}` })
  const empties = Math.max(min - rows.length, 1)
  return (
    <div ref={setNodeRef} className={cn(isOver && 'bg-neutral-5')}>
      <SortableContext items={items.map((i) => i.id)} strategy={noShift}>
        {rows}
      </SortableContext>
      {Array.from({ length: empties }, (_, i) => (
        <EmptyRow
          key={`empty-${i}`}
          container={container}
          onClick={() => startEditing({ container, id: null, afterId: null })}
        />
      ))}
    </div>
  )
}

export function DayCell({
  container,
  date,
  inMonth,
  isToday,
  items,
}: {
  container: string
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
        <RowList container={container} items={items} min={DAY_ROWS} inDay />
      </div>
    </div>
  )
}

const SECTION_MODE: Record<Section, EditMode> = { goals: 'goal', notes: 'note', backlog: 'task' }

export function SectionBlock({ section, label, cell, min }: { section: Section; label: string; cell: SectionCells[Section]; min?: number }) {
  return (
    <section>
      <h3 className="flex h-24 items-end px-6 pb-4 text-[0.786rem] font-medium text-foreground-tertiary">{label}</h3>
      <div className="border-t border-border">
        <RowList container={cell.container} items={cell.items} min={min} sectionMode={SECTION_MODE[section]} />
      </div>
    </section>
  )
}

export function WeekCell({ monday, cells }: { monday: Date; cells: SectionCells }) {
  return (
    <div className={cn(CELL_H, 'flex min-w-0 flex-col bg-card')}>
      <div className={cn(CELL_HEADER, 'text-foreground-tertiary')}>Week {getISOWeek(monday)}</div>
      <div className="cell-scroll min-h-0 flex-1 overflow-y-auto border-t border-border">
        {SECTIONS.map((s) => (
          <SectionBlock key={s} section={s} label={SECTION_LABEL[s]} cell={cells[s]} />
        ))}
      </div>
    </div>
  )
}

export function MonthRow({ month, cells }: { month: Date; cells: SectionCells }) {
  const name = format(month, 'MMMM')
  return (
    <div className="grid grid-cols-3 border-b border-neutral-30 bg-card">
      {SECTIONS.map((s) => (
        <div key={s} className="cell-scroll h-[13.71rem] min-w-0 overflow-y-auto border-r border-border last:border-r-0">
          <SectionBlock section={s} label={`${name} ${SECTION_LABEL[s].toLowerCase()}`} cell={cells[s]} min={6} />
        </div>
      ))}
    </div>
  )
}
