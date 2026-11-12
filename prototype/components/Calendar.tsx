import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  MeasuringStrategy,
} from '@dnd-kit/core'
import { isSameDay, isSameMonth } from 'date-fns'
import { dayKey, monthKey, monthWeeks, weekKey } from '../lib/dates'
import { canHold, groupByContainer, useStore } from '../store'
import type { Item, Section } from '../types'
import { DayCell, MonthRow, WeekCell, type SectionCells } from './Cells'
import { RowView } from './ItemRow'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const GRID = 'grid grid-cols-8'
const EMPTY: Item[] = []

// Prefer the row under the pointer; fall back to the list (container) under it.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const row = hits.find((h) => !String(h.id).startsWith('drop:'))
  if (row) return [row]
  if (hits.length) return [hits[0]]
  return rectIntersection(args)
}

/** Container + index (in the list without the dragged item) where it should land:
 *  above or below the row under the pointer, or at the end of an empty area. */
function dropTarget({ active, over }: DragMoveEvent, pointerY: number): { container: string; index: number } | null {
  if (!over || over.id === active.id) return null
  const { items } = useStore.getState()
  const overId = String(over.id)
  if (overId.startsWith('drop:')) {
    const container = overId.slice(5)
    return { container, index: items.filter((i) => i.container === container && i.id !== active.id).length }
  }
  const target = items.find((i) => i.id === overId)
  if (!target) return null
  const rest = items.filter((i) => i.container === target.container && i.id !== active.id).sort((a, b) => a.order - b.order)
  const below = pointerY > over.rect.top + over.rect.height / 2
  return { container: target.container, index: rest.findIndex((i) => i.id === overId) + (below ? 1 : 0) }
}


export function Calendar() {
  const items = useStore((s) => s.items)
  const month = useStore((s) => s.viewMonth)
  const byContainer = useMemo(() => groupByContainer(items), [items])
  const weeks = useMemo(() => monthWeeks(month), [month])
  const today = new Date()
  const get = (key: string) => byContainer.get(key) ?? EMPTY
  const sections = (keyFor: (s: Section) => string): SectionCells => {
    const cell = (s: Section) => ({ container: keyFor(s), items: get(keyFor(s)) })
    return { goals: cell('goals'), notes: cell('notes'), backlog: cell('backlog') }
  }

  // ─── Drag & drop ───
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [dragged, setDragged] = useState<{ item: Item; width: number } | null>(null)
  const origin = useRef<{ container: string; index: number } | null>(null)
  const pointerY = useRef(0)
  const trackPointer = (e: PointerEvent) => (pointerY.current = e.clientY)

  /** Container under the drop point (a row's list, or an empty list area). */
  const overContainer = (overId: string) =>
    overId.startsWith('drop:') ? overId.slice(5) : useStore.getState().items.find((i) => i.id === overId)?.container

  function onDragStart({ active }: DragStartEvent) {
    const s = useStore.getState()
    const item = s.items.find((i) => i.id === active.id)
    if (!item) return
    s.stopEditing()
    origin.current = { container: item.container, index: item.order }
    window.addEventListener('pointermove', trackPointer)
    setDragged({ item, width: active.rect.current.initial?.width ?? 160 })
  }

  // The row moves live (within a list or into another one), so its placeholder previews where it lands.
  // onDragMove (not onDragOver): crossing from a row's lower half to its upper half must also update.
  function onDragMove(e: DragMoveEvent) {
    const s = useStore.getState()
    const item = s.items.find((i) => i.id === e.active.id)
    const target = dropTarget(e, pointerY.current)
    if (!item || !target || !canHold(item, target.container)) return
    const current = s.items.filter((i) => i.container === item.container && i.id !== item.id && i.order < item.order).length
    if (target.container === item.container && target.index === current) return
    s.moveItem(item.id, target.container, target.index)
  }

  function onDragEnd(e: DragEndEvent) {
    const s = useStore.getState()
    const id = String(e.active.id)
    const item = s.items.find((i) => i.id === id)
    const dropIn = e.over ? overContainer(String(e.over.id)) : undefined
    if (item && dropIn && canHold(item, dropIn)) s.adaptToContainer(id) // e.g. a goal dropped into a day becomes a task
    else if (origin.current) s.moveItem(id, origin.current.container, origin.current.index) // not droppable there: put it back
    endDrag()
  }

  function onDragCancel() {
    if (dragged && origin.current) useStore.getState().moveItem(dragged.item.id, origin.current.container, origin.current.index)
    endDrag()
  }

  function endDrag() {
    window.removeEventListener('pointermove', trackPointer)
    origin.current = null
    setDragged(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
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
                container={dayKey(d)}
                date={d}
                inMonth={isSameMonth(d, month)}
                isToday={isSameDay(d, today)}
                items={get(dayKey(d))}
              />
            ))}
            <WeekCell monday={days[0]} cells={sections((s) => weekKey(days[0], s))} />
          </div>
        ))}

        <MonthRow month={month} cells={sections((s) => monthKey(month, s))} />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragged && (
          <RowView
            item={dragged.item}
            className="cursor-grabbing border border-neutral-30 bg-background shadow-md"
            style={{ width: dragged.width }}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
