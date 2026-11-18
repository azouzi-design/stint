// The popup a calendar item opens when clicked: its full details, editable in place.
// Opened from ItemRow (anchored to the row's top-right). One panel per item type.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useShallow } from 'zustand/react/shallow'
import CalendarIcon from 'pixelarticons/svg/calendar.svg?react'
import ClockIcon from 'pixelarticons/svg/clock.svg?react'
import ExternalLinkIcon from 'pixelarticons/svg/external-link.svg?react'
import LinkIcon from 'pixelarticons/svg/link.svg?react'
import CloseIcon from 'pixelarticons/svg/close.svg?react'
import NotesIcon from 'pixelarticons/svg/notes.svg?react'
import LoaderIcon from 'pixelarticons/svg/loader.svg?react'
import RepeatIcon from 'pixelarticons/svg/repeat.svg?react'
import ZapIcon from 'pixelarticons/svg/zap.svg?react'
import { cn } from '@/lib/utils'
import { clock, formatDuration, formatTimeRange, isoMinutes, weekName } from '../lib/dates'
import { processDoneBy, ROUTINE_LABEL, sessionTasksKey } from '../lib/details'
import { parseProgress } from '../lib/parse'
import { SECTION_LABEL } from '../lib/lists'
import { normalizeUrl, plainText, safeHref } from '../lib/rich'
import { sessionClock } from '../lib/session'
import { useSettings } from '../lib/settings'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import type { EventItem, Item, ItemFields, NoteItem, ProcessItem, Repeat, RoutineItem, Section, SessionItem, TaskItem } from '../types'
import { CheckboxMark } from './ItemRow'
import { EventTimeFields } from './EventTime'
import { ProjectButton } from './ProjectButton'

export const detailsClass = 'z-40 w-[20rem] rounded-8 border border-border bg-popover text-[0.857rem] shadow-md'

export function ItemDetails({ item }: { item: Item }) {
  switch (item.type) {
    case 'note':
      return <NoteDetails item={item} />
    case 'event':
      return <EventDetails item={item} />
    case 'session':
      return <SessionDetails item={item} />
    default:
      return null
  }
}

/** Change some of an item's fields (updateItem takes them all). */
function patch<T extends Item>(item: T, changes: Partial<T>) {
  const fields: Partial<Item> = { ...item, ...changes }
  delete fields.id
  delete fields.container
  delete fields.order
  delete fields.projectId
  useStore.getState().updateItem(item.id, fields as ItemFields)
}

// ─── Shared parts ──────────────────────────────────────────────────────

type Icon = React.FC<React.SVGProps<SVGSVGElement>>

function Header({ icon: Icon, label, container, children }: { icon: Icon; label: string; container: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center gap-6 border-b border-border px-12 text-[0.786rem] text-foreground-tertiary">
      <Icon className="size-12 shrink-0 text-icon" />
      <span className="font-medium text-foreground-secondary">{label}</span>
      {children}
      <span className="ml-auto">{whereLabel(container)}</span>
    </div>
  )
}

/** 'day:2026-11-18' → 'Wed 18 Nov' · 'week:2026-11-16:notes' → 'This week · Notes' · 'month:2026-11:notes' → 'November · Notes' */
function whereLabel(container: string): string {
  const [kind, date, section] = container.split(':')
  const what = section ? ` · ${SECTION_LABEL[section as Section]}` : ''
  if (kind === 'day') return format(parseISO(date), 'EEE d MMM')
  if (kind === 'week') return `${weekName(parseISO(date))}${what}`
  return `${format(parseISO(`${date}-01`), 'MMMM')}${what}`
}

/** A labeled line in a details panel: icon + content. */
function Field({ icon: Icon, label, children }: { icon: Icon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-28 items-center gap-8 px-12">
      <Icon className="size-12 shrink-0 text-icon" aria-label={label} />
      {children}
    </div>
  )
}

const inputClass =
  'h-24 min-w-0 flex-1 rounded-4 bg-transparent px-4 -mx-4 text-foreground outline-none hover:bg-muted focus:bg-muted placeholder:text-muted-foreground'

/** Free-text notes at the bottom of a panel. */
function NotesField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="border-t border-border">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Notes"
        aria-label="Notes"
        className="block max-h-[40vh] min-h-[4.5rem] w-full resize-none bg-transparent px-12 py-8 leading-[1.5] text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground"
      />
    </div>
  )
}

/** A text input that saves on Enter / blur; Escape (and an invalid value) puts the saved value back. */
function CommitInput({
  value,
  onCommit,
  className,
  ...props
}: { value: string; onCommit: (v: string) => boolean | void } & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value)
  // Saved value changed (here or on another device): show it.
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setDraft(value)
  }
  const commit = () => {
    if (draft === value) return
    if (onCommit(draft.trim()) === false) setDraft(value)
  }
  return (
    <input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape' && draft !== value) {
          e.stopPropagation() // first Escape undoes the edit, the next one closes the popup
          setDraft(value)
        }
      }}
      className={cn(inputClass, className)}
    />
  )
}

// ─── Note ──────────────────────────────────────────────────────────────

function NoteDetails({ item }: { item: NoteItem }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Open with the cursor at the end of the text.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  // Closing an emptied note deletes it (same as clearing a row's text).
  useEffect(
    () => () => {
      const s = useStore.getState()
      const now = s.items.find((i) => i.id === item.id)
      if (now?.type === 'note' && !now.text.trim()) s.removeItem(item.id)
    },
    [item.id],
  )

  return (
    <>
      <Header icon={NotesIcon} label="Note" container={item.container} />
      <textarea
        ref={ref}
        value={item.text}
        onChange={(e) => patch(item, { text: e.target.value })}
        placeholder="Write anything…"
        aria-label="Note"
        className="block max-h-[60vh] min-h-[10rem] w-full resize-none bg-transparent px-12 py-8 leading-[1.5] text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground"
      />
    </>
  )
}

// ─── Event ─────────────────────────────────────────────────────────────

function EventDetails({ item }: { item: EventItem }) {
  const href = item.link ? safeHref(item.link) : null
  return (
    <>
      <Header icon={CalendarIcon} label="Event" container={item.container} />
      <div className="flex flex-col gap-2 py-8">
        <div className="flex items-center gap-8 px-12 pb-4">
          <CommitInput
            value={plainText(item.title)}
            onCommit={(title) => (title ? patch(item, { title }) : false)}
            aria-label="Title"
            placeholder="Title"
            className="h-28 text-[1rem] font-medium"
          />
        </div>
        <div className="px-12">
          <EventTimeFields start={item.start} end={item.end} onChange={(start, end) => patch(item, { start, end })} />
        </div>
        <Field icon={LinkIcon} label="Link">
          <CommitInput
            value={item.link ?? ''}
            onCommit={(link) => patch(item, { link: link ? normalizeUrl(link) : null })}
            placeholder="Add a link"
            aria-label="Link"
            className="truncate"
          />
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex h-24 shrink-0 items-center gap-4 rounded-4 bg-foreground px-8 text-[0.786rem] font-medium text-background hover:opacity-80"
            >
              Join <ExternalLinkIcon className="size-12" />
            </a>
          )}
        </Field>
        <ProjectField item={item} />
      </div>
      <NotesField value={item.notes ?? ''} onChange={(notes) => patch(item, { notes })} />
    </>
  )
}

/** The item's project: dot + name, click to change it (or "Add project"). */
function ProjectField({ item }: { item: Item }) {
  return (
    <div className="flex min-h-28 items-center px-12">
      <ProjectButton itemId={item.id} projectId={item.projectId} withName />
    </div>
  )
}

// ─── Focus session ─────────────────────────────────────────────────────

function SessionDetails({ item }: { item: SessionItem }) {
  const timeFormat = useSettings((s) => s.timeFormat)
  const active = item.status === 'active'
  const session = useStore((s) => (active && s.activeSession?.itemId === item.id ? s.activeSession : null))
  const now = useNow(1_000, active)
  const focusedMin = session
    ? sessionClock(session, now).focusedMs / 60_000
    : (item.focusedMin ?? isoMinutes(item.startedAt, item.endedAt ?? new Date(now).toISOString()))
  const state = !session ? null : session.timeUpAt ? "Time's up" : session.pausedAt ? 'Paused' : 'Running'

  return (
    <>
      <Header icon={ZapIcon} label="Focus session" container={item.container}>
        {state && <span className={cn('rounded-4 px-4', state === 'Running' ? 'bg-success/15 text-success' : 'bg-muted')}>{state}</span>}
      </Header>
      <div className="flex flex-col gap-2 py-8">
        <div className="flex items-baseline gap-8 px-12 pb-4">
          <span className="text-[1.286rem] font-medium tabular-nums text-foreground">{formatDuration(focusedMin)}</span>
          <span className="text-foreground-tertiary">
            focused{session?.plannedMin ? ` of ${formatDuration(session.plannedMin)}` : ''}
          </span>
        </div>
        <Field icon={ClockIcon} label="Time">
          <span className="tabular-nums text-foreground-secondary">
            {formatTimeRange(clock(item.startedAt), active ? null : clock(item.endedAt!), timeFormat)}
            {active && ' now'}
          </span>
        </Field>
        <ProjectField item={item} />
      </div>
      <SessionTasks item={item} />
      <NotesField value={item.notes ?? ''} onChange={(notes) => patch(item, { notes })} />
    </>
  )
}

function SessionTasks({ item }: { item: SessionItem }) {
  const container = sessionTasksKey(item.id)
  const tasks = useStore(
    useShallow((s) => s.items.filter((i): i is TaskItem => i.type === 'task' && i.container === container).sort((a, b) => a.order - b.order)),
  )
  // Tentative: tasks elsewhere in the calendar checked off while the session ran.
  const ids = item.taskIds ?? []
  const finishedElsewhere = useStore(useShallow((s) => s.items.filter((i): i is TaskItem => i.type === 'task' && ids.includes(i.id))))

  return (
    <div className="border-t border-border py-8">
      <p className="px-12 pb-4 text-[0.786rem] font-medium text-foreground-tertiary">Tasks</p>
      {tasks.map((t) => (
        <TaskLine key={t.id} task={t} onRemove={() => useStore.getState().removeItem(t.id)} removeLabel="Remove" />
      ))}
      <NewTask onAdd={(text) => useStore.getState().addItem(container, null, { type: 'task', text, done: false })} />
      {finishedElsewhere.length > 0 && (
        <>
          <p className="px-12 pt-8 pb-4 text-[0.786rem] text-foreground-tertiary">Finished during this session</p>
          {finishedElsewhere.map((t) => (
            <div key={t.id} className="flex h-24 items-center gap-8 px-12 text-foreground-secondary">
              <CheckboxMark done />
              <span className="truncate">{plainText(t.text)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/** A task inside a popup: checkbox + editable text. Clearing the text (or ×) removes it. */
function TaskLine({ task, onRemove, removeLabel }: { task: TaskItem | RoutineItem; onRemove: () => void; removeLabel: string }) {
  const s = useStore.getState
  return (
    <div className="group/line flex h-24 items-center gap-8 px-12">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        onClick={() => s().toggleDone(task.id)}
        className="shrink-0 rounded-2 hover:opacity-70"
      >
        <CheckboxMark done={task.done} />
      </button>
      <CommitInput
        value={task.text}
        onCommit={(text) => (text ? patch<TaskItem | RoutineItem>(task, { text }) : onRemove())}
        aria-label="Task"
        className={cn(task.done && 'text-foreground-tertiary line-through decoration-neutral-40')}
      />
      <ProjectButton itemId={task.id} projectId={task.projectId} emptyClass="opacity-0 group-hover/line:opacity-100" />
      <button
        type="button"
        onClick={onRemove}
        title={removeLabel}
        aria-label={removeLabel}
        className="flex size-16 shrink-0 items-center justify-center rounded-4 text-icon opacity-0 group-hover/line:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
      >
        <CloseIcon className="size-12" />
      </button>
    </div>
  )
}

/** "Add a task" line: Enter adds it and stays ready for the next one. */
function NewTask({ onAdd, placeholder = 'Add a task' }: { onAdd: (text: string) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  return (
    <div className="flex h-24 items-center gap-8 px-12">
      <span className="flex size-12 shrink-0 items-center justify-center text-icon">+</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !text.trim()) return
          e.preventDefault()
          onAdd(text.trim())
          setText('')
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={inputClass}
      />
    </div>
  )
}

// ─── Routine (a day's daily / weekly / monthly routine, as one group) ───

export function RoutineDetails({ container, repeat, tasks }: { container: string; repeat: Repeat; tasks: RoutineItem[] }) {
  const done = tasks.filter((t) => t.done).length
  const s = useStore.getState
  return (
    <>
      <Header icon={RepeatIcon} label={ROUTINE_LABEL[repeat]} container={container}>
        <span className="tabular-nums">
          {done}/{tasks.length}
        </span>
      </Header>
      <div className="py-8">
        {tasks.map((t) => (
          <TaskLine
            key={t.id}
            task={t}
            // Leaving the routine: this day and the following ones (earlier days keep their history).
            onRemove={() => {
              s().stopRoutine(t.id)
              s().removeItem(t.id)
            }}
            removeLabel="Remove from the routine, from this day on"
          />
        ))}
        <NewTask
          onAdd={(text) => {
            // A new task of this routine, repeating from this day (same weekday / day of the month).
            const id = s().addItem(container, tasks.at(-1)?.id ?? null, { type: 'routine', text, done: false, repeat })
            s().makeRoutine(id, repeat)
          }}
        />
      </div>
    </>
  )
}

// ─── Processes (carried over from day to day until 100%) ───────────────

export function ProcessDetails({ container, processes }: { container: string; processes: ProcessItem[] }) {
  const date = container.slice(4)
  const done = processes.filter((p) => processDoneBy(p, date)).length
  return (
    <>
      <Header icon={LoaderIcon} label="Processes" container={container}>
        <span className="tabular-nums">
          {done}/{processes.length}
        </span>
      </Header>
      <div className="flex flex-col gap-4 py-8">
        {processes.map((p) => (
          <ProcessLine key={p.id} process={p} date={date} />
        ))}
        <NewTask
          placeholder="Add a process, e.g. Move flat 10%"
          onAdd={(typed) => {
            const { text, progress } = parseProgress(typed)
            useStore.getState().addItem(container, null, { type: 'process', text, progress, doneOn: progress === 100 ? date : null })
          }}
        />
      </div>
    </>
  )
}

function ProcessLine({ process: p, date }: { process: ProcessItem; date: string }) {
  const remove = () => useStore.getState().removeItem(p.id)
  const setProgress = (progress: number) =>
    // Reaching 100% finishes it on the day it's set from: it stays there (at 100%) and stops
    // carrying over to the next days. Going back below 100% reopens it.
    patch(p, { progress, doneOn: progress === 100 ? date : null })
  return (
    <div className="group/line px-12">
      <div className="flex h-24 items-center gap-8">
        <CommitInput
          value={p.text}
          onCommit={(text) => (text ? patch(p, { text }) : remove())}
          aria-label="Process"
          className={cn(p.progress === 100 && 'text-foreground-tertiary line-through decoration-neutral-40')}
        />
        <ProjectButton itemId={p.id} projectId={p.projectId} emptyClass="opacity-0 group-hover/line:opacity-100" />
        <button
          type="button"
          onClick={remove}
          title="Delete process (from every day)"
          aria-label="Delete process"
          className="flex size-16 shrink-0 items-center justify-center rounded-4 text-icon opacity-0 group-hover/line:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
        >
          <CloseIcon className="size-12" />
        </button>
      </div>
      <div className="flex h-20 items-center gap-8">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={p.progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          aria-label={`Progress of ${plainText(p.text)}`}
          className="h-4 min-w-0 flex-1 cursor-pointer accent-foreground"
        />
        <span className="w-32 shrink-0 text-right text-[0.786rem] tabular-nums text-foreground-secondary">{p.progress}%</span>
      </div>
    </div>
  )
}
