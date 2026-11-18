import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ContextMenu, Popover } from 'radix-ui'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import ExternalLinkIcon from 'pixelarticons/svg/external-link.svg?react'
import RepeatIcon from 'pixelarticons/svg/repeat.svg?react'
import { cn } from '@/lib/utils'
import { clock, formatDuration, formatTimeRange, isoMinutes, timeframeMinutes } from '../lib/dates'
import { useSettings } from '../lib/settings'
import { DELETED_PROJECT_COLOR, PROJECT_COLORS } from '../lib/projects'
import { useShallow } from 'zustand/react/shallow'
import { sessionClock } from '../lib/session'
import { justDragged, touchMenuGuard } from '../lib/touchMenu'
import { useNow } from '../lib/useNow'
import { canPasteInto, isRepeating, useStore } from '../store'
import type { Item } from '../types'
import { ProjectPicker } from './ProjectPicker'
import { RichText } from './RichText'

export const ROW_H = 'h-24' // 24px — shared by filled, empty, and editing rows

const rowBase = cn(ROW_H, 'row flex items-center gap-6 border-b border-border px-6 text-[0.857rem] leading-none')
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
  const openProjectPicker = useStore((s) => s.openProjectPicker)
  const setProject = useStore((s) => s.setProject)
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id })
  const editable = item.type !== 'session'

  // Nesting: the context-menu trigger must wrap a real element, so Popover.Root sits outside it.
  return (
    <Popover.Root open={pickerOpen} onOpenChange={(open) => !open && openProjectPicker(null)}>
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
            className={cn(rowBase, 'bg-muted', editable && 'cursor-text', isDragging && 'opacity-30')}
            onClick={editable ? () => !justDragged() && startEditing({ container: item.container, id: item.id, afterId: null }) : undefined}
          >
            <RowContent item={item} />
          </div>
        </Popover.Anchor>
      </RowMenu>
      <Popover.Portal>
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

function RowContent({ item }: { item: Item }) {
  return (
    <>
      <Content item={item} />
      <ProjectDot projectId={item.projectId} />
    </>
  )
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
          <RichText value={item.text} />
        </Text>
      )
    case 'event':
      return (
        <>
          <Time>
            <TimeRange start={item.start} end={item.end} />
          </Time>
          <Text>
            <RichText value={item.title} />
          </Text>
          <span className="sr-only">{formatDuration(timeframeMinutes(item.start, item.end))}</span>
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

/** "9:00–10:30" or "9–10:30am", per Settings → Time format. */
function TimeRange({ start, end }: { start: string; end: string | null }) {
  const f = useSettings((s) => s.timeFormat)
  return <>{formatTimeRange(start, end, f)}</>
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
      <Time className="text-foreground-secondary">
        <TimeRange start={clock(item.startedAt)} end={active ? null : clock(item.endedAt!)} />
        <span className="text-foreground-tertiary"> / {formatDuration(focusedMin)}</span>
      </Time>
      <span className="flex-1" />
      <SessionTasks ids={item.taskIds ?? []} />
    </>
  )
}

/** Tentative session ↔ task link: "3 tasks", click to list the tasks finished during the session. */
function SessionTasks({ ids }: { ids: string[] }) {
  const tasks = useStore(useShallow((s) => s.items.filter((i) => i.type === 'task' && ids.includes(i.id))))
  if (!tasks.length) return null
  return (
    <Popover.Root>
      <Popover.Trigger
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 rounded-2 text-foreground-tertiary tabular-nums hover:text-foreground hover:underline"
      >
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={4} className={cn(popoverClass, 'w-[14rem] p-8')}>
          <p className="mb-4 text-[0.786rem] text-foreground-tertiary">Finished during this session</p>
          <ul className="flex flex-col gap-4">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-6 text-foreground-secondary">
                <CheckboxMark done />
                <span className="truncate">
                  <RichText value={t.type === 'task' ? t.text : ''} />
                </span>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
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
