// ─── Containers ────────────────────────────────────────────────────────
// Every item lives in exactly one container, identified by a string key:
//   day:2026-11-12
//   week:2026-11-09:goals      (week key = that week's Monday)
//   month:2026-11:backlog
export type Section = 'goals' | 'notes' | 'backlog'
export type ContainerKey = string

// ─── Items ─────────────────────────────────────────────────────────────
interface BaseItem {
  id: string
  container: ContainerKey
  order: number
  projectId: string | null
}

export interface TaskItem extends BaseItem {
  type: 'task'
  text: string
  done: boolean
}

export interface NoteItem extends BaseItem {
  type: 'note'
  text: string
}

export interface EventItem extends BaseItem {
  type: 'event'
  title: string
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  link: string | null
}

export interface SessionItem extends BaseItem {
  type: 'session'
  status: 'active' | 'finished'
  startedAt: string // ISO
  endedAt: string | null // ISO, set once finished
  /** Focused minutes (pauses excluded). Missing on older/sample data = end − start. */
  focusedMin?: number
  /** Tentative: tasks checked off while this session was running. */
  taskIds?: string[]
}

/** The running focus session (one at a time). Everything is derived from timestamps. */
export interface ActiveSession {
  itemId: string
  plannedMin: number
  startedAt: string // ISO
  pausedAt: string | null // ISO while paused
  pausedMs: number // total paused time so far
  /** Set when the countdown reaches zero; the session then waits for the user. */
  timeUpAt: string | null
}

export type Repeat = 'daily' | 'weekly' | 'monthly'

export interface RoutineItem extends BaseItem {
  type: 'routine'
  text: string
  done: boolean
  repeat: Repeat
  /** The rule this copy was generated from, and the date it was scheduled for.
   *  The scheduled date stays the same if the copy is dragged to another day. */
  ruleId?: string
  ruleDate?: string // 'yyyy-MM-dd'
}

/** A repeating routine. Copies are generated per day/week/month until `end`. */
export interface RoutineRule {
  id: string
  text: string
  repeat: Repeat
  projectId: string | null
  start: string // 'yyyy-MM-dd' — also sets the weekday / day-of-month
  end: string | null // last scheduled date (inclusive), null = still repeating
  skip: string[] // scheduled dates whose copy was deleted or converted
}

export interface GoalItem extends BaseItem {
  type: 'goal'
  text: string
  done: boolean
}

export type Item = TaskItem | NoteItem | EventItem | SessionItem | RoutineItem | GoalItem
export type ItemType = Item['type']

/** An item's own fields, without its identity/position (id, container, order, project). */
export type ItemFields = Item extends infer T
  ? T extends Item
    ? Omit<T, 'id' | 'container' | 'order' | 'projectId'>
    : never
  : never

/** An item copied or cut with the right-click menu / ⌘C / ⌘X. */
export interface Clipboard {
  fields: ItemFields
  projectId: string | null
  /** Plain text also written to the system clipboard, to recognise our own paste. */
  text: string
}

/** Which row is being edited. id = existing item; id null = new row after `afterId` (null = at the end). */
export interface Editing {
  container: ContainerKey
  id: string | null
  afterId: string | null
}

// ─── Projects ──────────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  color: string // key into PROJECT_COLORS
  deleted: boolean
}
