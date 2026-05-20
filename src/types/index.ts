export type BlockType = 'task' | 'title'
export type BlockState = 'default' | 'done'
export type ListType = 'today' | 'later'

export interface Block {
  id: string
  type: BlockType
  content: string
  listType: ListType
  parentId: string | null
  order: number
  state: BlockState
  inSession: boolean
  createdAt: string
  updatedAt: string
}

export interface SessionTask {
  taskId: string
  textSnapshot: string
  completedInSession: boolean
}

export type SessionStatus = 'empty' | 'running' | 'paused' | 'completed' | 'canceled'

export interface FocusSession {
  id: string
  date: string
  plannedDurationMin: number
  startedAt: string | null
  endedAt: string | null
  status: SessionStatus
  taskRefs: SessionTask[]
}
