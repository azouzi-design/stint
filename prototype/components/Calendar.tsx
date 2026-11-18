import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
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
import { dayKey, monthKey, monthWeeks, weekdayNames, weekKey } from '../lib/dates'
import { useSettings } from '../lib/settings'
import { markDragEnd, openRowMenu } from '../lib/touchMenu'
import { useIsMobile } from '../lib/useMedia'
import { canHold, useStore } from '../store'
import type { Item } from '../types'
import { useLists } from '../lib/lists'
import { DayCell, MonthRow, WeekCell } from './Cells'
import { RowView } from './ItemRow'
import { WeekPager } from './WeekView'

const GRID = 'grid grid-cols-8'

/** Desktop: the month grid. Mobile: one week at a time, swiped. */
export function Calendar() {
  const mobile = useIsMobile()
  return <DragAndDrop>{mobile ? <WeekPager /> : <MonthGrid />}</DragAndDrop>
}

function MonthGrid() {
  const month = useStore((s) => s.viewMonth)
  const weekStart = useSettings((s) => s.weekStart)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- monthWeeks reads the week start setting
  const weeks = useMemo(() => monthWeeks(month), [month, weekStart])
  const { get, sections } = useLists()
  const today = new Date()

  return (
    <div className="min-w-[68rem]">
      {/* Column headers */}
      <div className={`${GRID} sticky top-48 z-10 border-b border-neutral-30 bg-background`}>
        {[...weekdayNames(), 'Weekly'].map((d) => (
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
          <WeekCell start={days[0]} cells={sections((s) => weekKey(days[0], s))} />
        </div>
      ))}

      <MonthRow month={month} cells={sections((s) => monthKey(month, s))} />
    </div>
  )
}

// ─── Drag & drop ───────────────────────────────────────────────────────

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

const touchPoint = (e: Event) => {
  const t = 'touches' in e ? (e as TouchEvent).touches[0] ?? (e as TouchEvent).changedTouches[0] : null
  return t ? { x: t.clientX, y: t.clientY } : null
}

function DragAndDrop({ children }: { children: React.ReactNode }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press and hold to lift a row; a quick swipe still scrolls the page / the week pager.
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 6 } }),
  )
  const [dragged, setDragged] = useState<{ item: Item; width: number } | null>(null)
  const origin = useRef<{ container: string; index: number } | null>(null)
  const pointerY = useRef(0)
  // Stable listeners (added on drag start, removed on drag end — a later render).
  const [track] = useState(() => ({
    pointer: (e: PointerEvent) => (pointerY.current = e.clientY),
    touch: (e: TouchEvent) => (pointerY.current = e.touches[0]?.clientY ?? pointerY.current),
  }))

  /** Container under the drop point (a row's list, or an empty list area). */
  const overContainer = (overId: string) =>
    overId.startsWith('drop:') ? overId.slice(5) : useStore.getState().items.find((i) => i.id === overId)?.container

  function onDragStart({ active, activatorEvent }: DragStartEvent) {
    const s = useStore.getState()
    const item = s.items.find((i) => i.id === active.id)
    if (!item) return
    s.stopEditing()
    origin.current = { container: item.container, index: item.order }
    pointerY.current = touchPoint(activatorEvent)?.y ?? (activatorEvent as MouseEvent).clientY
    window.addEventListener('pointermove', track.pointer)
    window.addEventListener('touchmove', track.touch)
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
    // Touch long-press released without moving: the row's menu, not a drop.
    const touch = touchPoint(e.activatorEvent)
    if (touch) markDragEnd()
    if (touch && Math.hypot(e.delta.x, e.delta.y) < 8 && origin.current) {
      s.moveItem(id, origin.current.container, origin.current.index)
      endDrag()
      setTimeout(() => openRowMenu(id, touch.x, touch.y))
      return
    }
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
    window.removeEventListener('pointermove', track.pointer)
    window.removeEventListener('touchmove', track.touch)
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
      // Never auto-scroll the week pager sideways mid-drag (it would switch weeks under the finger).
      autoScroll={{ canScroll: (el) => !(el instanceof HTMLElement && 'weekPager' in el.dataset) }}
    >
      {children}
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
