import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ContextMenu, Popover } from 'radix-ui'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import ExternalLinkIcon from 'pixelarticons/svg/external-link.svg?react'
import NotesIcon from 'pixelarticons/svg/notes.svg?react'
import LoaderIcon from 'pixelarticons/svg/loader.svg?react'
import RepeatIcon from 'pixelarticons/svg/repeat.svg?react'
import { cn } from '@/lib/utils'
import { firstSentence, hasDetails, processDoneBy, processGroupId, ROUTINE_LABEL, routineGroupId, sessionTasksKey } from '../lib/details'
import { containerDate } from '../lib/routines'
import { clock, formatDuration, formatTime, formatTimeRange, isoMinutes, timeframeMinutes } from '../lib/dates'
import { useSettings } from '../lib/settings'
import { DELETED_PROJECT_COLOR, PROJECT_COLORS } from '../lib/projects'
import { useShallow } from 'zustand/react/shallow'
import { sessionClock } from '../lib/session'
import { justDragged, touchMenuGuard } from '../lib/touchMenu'
import { useNow } from '../lib/useNow'
import { canPasteInto, isRepeating, useStore } from '../store'
import type { Item, ProcessItem, Repeat, RoutineItem } from '../types'
import { ItemDetails, ProcessDetails, RoutineDetails, detailsClass } from './ItemDetails'
import { ProjectButton } from './ProjectButton'
import { ProjectPicker } from './ProjectPicker'
import { RichText } from './RichText'

export const ROW_H = 'h-24' // 24px — shared by filled, empty, and editing rows

const rowBase = cn(ROW_H, 'row group/row flex items-center gap-6 border-b border-border px-6 text-[0.857rem] leading-none')
export const popoverClass = 'z-40 rounded-8 border border-border bg-popover p-4 text-[0.857rem] shadow-md'

// ─── Empty row ─────────────────────────────────────────────────────────

export function EmptyRow({ container, onClick }: { container: string; onClick: () => void }) {
  return (
    <RowMenu container={container}>
      <div className={cn(rowBase, 'cursor-text hover:bg-neutral-5')} onClick={onClick} />
    </RowMenu>
  )
}

/** An empty row in a static preview (no menu, no click). */
export function StaticEmptyRow() {
  return <div className={rowBase} />
}

// ─── Item row (sortable, right-click menu, project picker) ─────────────

export function ItemRow({ item }: { item: Item }) {
  const startEditing = useStore((s) => s.startEditing)
  const pickerOpen = useStore((s) => s.projectPickerFor === item.id)
  const detailsOpen = useStore((s) => s.detailsFor === item.id)
  const openProjectPicker = useStore((s) => s.openProjectPicker)
  const openDetails = useStore((s) => s.openDetails)
  const setProject = useStore((s) => s.setProject)
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver, active } = useSortable({ id: item.id })
  // A task dragged onto a focus session goes into it (see Calendar → dropInto).
  const dropTarget = useTaskDraggedOver(isOver && item.type === 'session', active?.id)
  const details = hasDetails(item)
  const onClick = () => {
    if (justDragged()) return
    if (details) openDetails(item.id)
    else startEditing({ container: item.container, id: item.id, afterId: null })
  }

  // Nesting: the context-menu trigger must wrap a real element, so Popover.Root sits outside it.
  // One popover per row, showing either the project picker or the item's details.
  return (
    <Popover.Root
      open={pickerOpen || detailsOpen}
      onOpenChange={(open) => {
        if (open) return
        openProjectPicker(null)
        openDetails(null)
      }}
    >
      <RowMenu container={item.container} item={item}>
        <Popover.Anchor asChild>
          <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            {...attributes}
            {...listeners}
            role={undefined}
            tabIndex={-1}
            data-item-id={item.id}
            className={cn(
              rowBase,
              'bg-muted',
              details ? 'cursor-pointer hover:bg-neutral-5' : 'cursor-text',
              detailsOpen && 'bg-neutral-5',
              dropTarget && dropIntoClass,
              isDragging && 'opacity-30',
            )}
            onClick={onClick}
          >
            <RowContent item={item} interactive />
          </div>
        </Popover.Anchor>
      </RowMenu>
      <Popover.Portal>
        {pickerOpen ? (
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            onEscapeKeyDown={(e) => e.preventDefault()} // the picker handles Escape itself (form → list → close)
            className={popoverClass}
          >
            <ProjectPicker
              value={item.projectId}
              onPick={(projectId) => {
                setProject(item.id, projectId)
                openProjectPicker(null)
              }}
              onCancel={() => openProjectPicker(null)}
            />
          </Popover.Content>
        ) : (
          // Details: beside the row, top edges aligned (flips to the left near the screen edge).
          <Popover.Content
            side="right"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={(e) => item.type !== 'note' && e.preventDefault()} // only a note opens ready to type
            onCloseAutoFocus={(e) => e.preventDefault()}
            className={detailsClass}
          >
            <ItemDetails item={item} />
          </Popover.Content>
        )}
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Static look of a row; also used for the drag overlay. */
export function RowView({ item, className, style }: { item: Item; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn(rowBase, 'bg-muted', className)} style={style}>
      <RowContent item={item} />
    </div>
  )
}

function RowContent({ item, interactive }: { item: Item; interactive?: boolean }) {
  return (
    <>
      <Content item={item} />
      {interactive ? (
        // Click the dot to set / change the project; rows without one show an empty dot on hover.
        <ProjectButton itemId={item.id} projectId={item.projectId} emptyClass="opacity-0 group-hover/row:opacity-100" />
      ) : (
        <ProjectDot projectId={item.projectId} />
      )}
    </>
  )
}

// ─── Group rows (a day's routines of one repeat, its processes) ────────

/** A row standing for a list (opened in its popup): icon, label, "done/total"; struck once all are done. */
function GroupRow({ id, label, done, total, icon: Icon, panel, droppable }: GroupProps & { id: string; panel: React.ReactNode; droppable?: boolean }) {
  const open = useStore((s) => s.detailsFor === id)
  const openDetails = useStore((s) => s.openDetails)
  // Routine rows take tasks dropped onto them (see Calendar → dropInto).
  const { setNodeRef, isOver, active } = useDroppable({ id: `into:${id}`, disabled: !droppable })
  const target = useTaskDraggedOver(isOver, active?.id)
  return (
    <Popover.Root open={open} onOpenChange={(o) => !o && openDetails(null)}>
      <Popover.Anchor asChild>
        <div
          role="button"
          ref={setNodeRef}
          aria-label={`${label}, ${done} of ${total} done`}
          className={cn(rowBase, 'cursor-pointer bg-muted hover:bg-neutral-5', open && 'bg-neutral-5', target && dropIntoClass)}
          onClick={() => openDetails(id)}
        >
          <GroupContent label={label} done={done} total={total} icon={Icon} />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={detailsClass}
        >
          {panel}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

interface GroupProps {
  label: string
  done: number
  total: number
  icon: React.FC<React.SVGProps<SVGSVGElement>>
}

function GroupContent({ label, done, total, icon: Icon }: GroupProps) {
  const finished = done === total
  return (
    <>
      <Icon className="size-12 shrink-0 text-icon" />
      <Text done={finished}>{label}</Text>
      <span className={cn('shrink-0 tabular-nums', finished ? 'text-foreground-tertiary' : 'text-foreground-secondary')}>
        {done}/{total}
      </span>
    </>
  )
}

const routineProps = (repeat: Repeat, tasks: RoutineItem[]): GroupProps => ({
  label: ROUTINE_LABEL[repeat],
  done: tasks.filter((t) => t.done).length,
  total: tasks.length,
  icon: RepeatIcon,
})

/** "Daily routine 3/5": a day's routine copies of one repeat. */
export function RoutineGroupRow({ container, repeat, tasks }: { container: string; repeat: Repeat; tasks: RoutineItem[] }) {
  return (
    <GroupRow
      id={routineGroupId(container, repeat)}
      {...routineProps(repeat, tasks)}
      droppable
      panel={<RoutineDetails container={container} repeat={repeat} tasks={tasks} />}
    />
  )
}

const processProps = (date: string, processes: ProcessItem[]): GroupProps => ({
  label: 'Processes',
  done: processes.filter((p) => processDoneBy(p, date)).length,
  total: processes.length,
  icon: LoaderIcon,
})

/** "Processes 1/3": the ongoing processes carried over to this day. */
export function ProcessGroupRow({ container, processes }: { container: string; processes: ProcessItem[] }) {
  return (
    <GroupRow
      id={processGroupId(container)}
      {...processProps(containerDate(container)!, processes)}
      panel={<ProcessDetails container={container} processes={processes} />}
    />
  )
}

/** Static look of the group rows (previews). */
export function GroupView({ container, repeat, tasks, processes }: { container: string; repeat?: Repeat; tasks?: RoutineItem[]; processes?: ProcessItem[] }) {
  const props = repeat ? routineProps(repeat, tasks!) : processProps(containerDate(container)!, processes!)
  return (
    <div className={cn(rowBase, 'bg-muted')}>
      <GroupContent {...props} />
    </div>
  )
}

/** Highlight of a row a dragged task will be dropped into. */
const dropIntoClass = 'bg-neutral-10 outline outline-1 -outline-offset-1 outline-foreground'

function useTaskDraggedOver(isOver: boolean, activeId: string | number | undefined) {
  return useStore((s) => isOver && s.items.find((i) => i.id === activeId)?.type === 'task')
}

// ─── Right-click menu ──────────────────────────────────────────────────

const menuItem =
  'flex h-28 cursor-default items-center gap-12 rounded-4 px-8 text-foreground-secondary outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[disabled]:text-muted-foreground'

function RowMenu({ container, item, children }: { container: string; item?: Item; children: React.ReactNode }) {
  const clipboard = useStore((s) => s.clipboard)
  const rules = useStore((s) => s.rules)
  const s = useStore.getState
  const canPaste = canPasteInto(clipboard, container)

  return (
    <ContextMenu.Root>
      {/* Item rows: on touch, long-press is the drag; releasing without moving opens this menu (see touchMenu). */}
      <ContextMenu.Trigger asChild {...(item ? touchMenuGuard : {})}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(popoverClass, 'min-w-[11rem]')}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {item && (
            <>
              <ContextMenu.Item className={menuItem} onSelect={() => s().copyItem(item.id)}>
                Copy <Kbd>⌘C</Kbd>
              </ContextMenu.Item>
              <ContextMenu.Item className={menuItem} onSelect={() => s().cutItem(item.id)}>
                Cut <Kbd>⌘X</Kbd>
              </ContextMenu.Item>
            </>
          )}
          <ContextMenu.Item className={menuItem} disabled={!canPaste} onSelect={() => s().paste(container, item?.id ?? null)}>
            Paste <Kbd>⌘V</Kbd>
          </ContextMenu.Item>
          {item && (
            <>
              <ContextMenu.Item className={menuItem} onSelect={() => s().removeItem(item.id)}>
                Clear
              </ContextMenu.Item>
              <ContextMenu.Separator className="my-4 h-px bg-border" />
              <ContextMenu.Item
                className={menuItem}
                // Wait for the menu to close before opening the picker, so focus lands in it.
                onSelect={() => setTimeout(() => s().openProjectPicker(item.id), 0)}
              >
                Project…
              </ContextMenu.Item>
              {isRepeating(rules, item) && (
                <ContextMenu.Item className={menuItem} onSelect={() => s().stopRoutine(item.id)}>
                  Stop repeating
                </ContextMenu.Item>
              )}
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span className="ml-auto text-[0.786rem] text-foreground-tertiary">{children}</span>
)

// ─── Row contents per type ─────────────────────────────────────────────

function Content({ item }: { item: Item }) {
  switch (item.type) {
    case 'task':
      return (
        <>
          <Checkbox item={item} />
          <Text done={item.done}>
            <RichText value={item.text} />
          </Text>
        </>
      )
    case 'goal':
      return (
        <>
          <Checkbox item={item} round />
          <Text done={item.done} className="font-medium text-foreground">
            <RichText value={item.text} />
          </Text>
        </>
      )
    case 'routine':
      return (
        <>
          <Checkbox item={item} />
          <Text done={item.done}>
            <RichText value={item.text} />
          </Text>
          <RepeatIcon className="size-12 shrink-0 text-icon" aria-label={`Repeats ${item.repeat}`} />
        </>
      )
    case 'note':
      return (
        <Text className="text-foreground-tertiary">
          <RichText value={firstSentence(item.text)} />
        </Text>
      )
    case 'event':
      return (
        <>
          <StartAndLength start={item.start} end={item.end} minutes={timeframeMinutes(item.start, item.end)} />
          <Text>
            <RichText value={item.title} />
          </Text>
          <HasNotes notes={item.notes} />
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              title={`Join: ${item.link}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 rounded-2 text-icon hover:text-foreground"
            >
              <ExternalLinkIcon className="size-12" />
            </a>
          )}
        </>
      )
    case 'session':
      return <SessionContent item={item} />
  }
}

/** Rows show when it starts and how long, the way it's typed: "17:00 30m" / "5pm 1h" (per Settings →
 *  Time format). The full span ("17:00–17:30") is in the tooltip and the details popup. */
function StartAndLength({ start, end, minutes, className }: { start: string; end: string | null; minutes: number; className?: string }) {
  const f = useSettings((s) => s.timeFormat)
  return (
    <Time className={className}>
      <span title={formatTimeRange(start, end, f)}>{formatTime(start, f)}</span>
      <span className="text-foreground-tertiary"> {formatDuration(minutes)}</span>
    </Time>
  )
}

function SessionContent({ item }: { item: Extract<Item, { type: 'session' }> }) {
  const active = item.status === 'active'
  const session = useStore((s) => (active && s.activeSession?.itemId === item.id ? s.activeSession : null))
  const now = useNow(15_000, active)
  const focusedMin = session
    ? sessionClock(session, now).focusedMs / 60_000
    : (item.focusedMin ?? isoMinutes(item.startedAt, item.endedAt ?? new Date(now).toISOString()))
  const paused = !!session?.pausedAt
  return (
    <>
      <span
        className={cn('size-6 shrink-0 bg-foreground', active && (paused ? 'bg-neutral-40' : 'animate-pulse bg-success'))}
        aria-label={active ? 'Focus session, active' : 'Focus session'}
      />
      <StartAndLength
        start={clock(item.startedAt)}
        end={active ? null : clock(item.endedAt!)}
        minutes={focusedMin}
        className="text-foreground-secondary"
      />
      <span className="flex-1" />
      <SessionTasks item={item} />
      <HasNotes notes={item.notes} />
    </>
  )
}

/** "2/3" tasks: the session's own tasks, plus (tentative) tasks elsewhere checked off while it ran. The popup lists them. */
function SessionTasks({ item }: { item: Extract<Item, { type: 'session' }> }) {
  const container = sessionTasksKey(item.id)
  const own = useStore(useShallow((s) => s.items.filter((i) => i.type === 'task' && i.container === container)))
  const elsewhere = item.taskIds?.length ?? 0
  const total = own.length + elsewhere
  if (!total) return null
  const done = own.filter((t) => t.type === 'task' && t.done).length + elsewhere
  return (
    <span className="shrink-0 text-foreground-tertiary tabular-nums">
      {done}/{total} {total === 1 ? 'task' : 'tasks'}
    </span>
  )
}

/** Small mark on a row whose popup holds notes. */
function HasNotes({ notes }: { notes?: string }) {
  if (!notes?.trim()) return null
  return <NotesIcon className="size-12 shrink-0 text-icon" aria-label="Has notes" />
}

/** Visual checkbox (also used by the row editor as a type preview). */
export function CheckboxMark({ done, round }: { done: boolean; round?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center border',
        round ? 'rounded-full' : 'rounded-2',
        done ? 'border-neutral-40 bg-neutral-40 text-background' : 'border-neutral-40 bg-background',
      )}
    >
      {done && <CheckIcon className="size-8" />}
    </span>
  )
}

function Checkbox({ item, round }: { item: Item & { done: boolean }; round?: boolean }) {
  const toggleDone = useStore((s) => s.toggleDone)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.done}
      aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
      onClick={(e) => {
        e.stopPropagation()
        toggleDone(item.id)
      }}
      onPointerDown={(e) => e.stopPropagation()} // don't start a drag from the checkbox
      className="shrink-0 rounded-2 hover:opacity-70"
    >
      <CheckboxMark done={item.done} round={round} />
    </button>
  )
}

function Text({ done, className, children }: { done?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'min-w-0 flex-1 truncate leading-[1.4] text-foreground-secondary',
        className,
        done && 'text-foreground-tertiary line-through decoration-neutral-40',
      )}
    >
      {children}
    </span>
  )
}

function Time({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('shrink-0 tabular-nums text-foreground-tertiary', className)}>{children}</span>
}

export function ProjectDot({ projectId }: { projectId: string | null }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))
  if (!project) return null
  const color = project.deleted ? DELETED_PROJECT_COLOR : PROJECT_COLORS[project.color]
  const name = project.deleted ? `~deleted-${project.name}` : project.name
  return (
    <span title={name} aria-label={`Project: ${name}`} className="size-6 shrink-0 rounded-full" style={{ background: color }} />
  )
}
