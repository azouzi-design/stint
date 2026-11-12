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
}

export type Repeat = 'daily' | 'weekly' | 'monthly'

export interface RoutineItem extends BaseItem {
  type: 'routine'
  text: string
  done: boolean
  repeat: Repeat
}

export interface GoalItem extends BaseItem {
  type: 'goal'
  text: string
  done: boolean
}

export type Item = TaskItem | NoteItem | EventItem | SessionItem | RoutineItem | GoalItem
export type ItemType = Item['type']

// ─── Projects ──────────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  color: string // key into PROJECT_COLORS
  deleted: boolean
}
