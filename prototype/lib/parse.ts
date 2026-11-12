import { normalizeUrl } from './rich'
import type { EventItem, Item, ItemFields, ItemType, Repeat } from '../types'

/** How a row being edited will be saved. 'auto' = task, unless it starts with a time range. */
export type EditMode = Exclude<ItemType, 'session'> | 'auto'

// "5:00-5:30 Meet Dave", "5 - 5:30 …", "14:00–15:00 …"
const TIME_RANGE = /^\s*(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s+(.+)$/

export function parseTimeRange(text: string): { start: string; end: string; rest: string } | null {
  const m = text.match(TIME_RANGE)
  if (!m) return null
  const [sh, sm, eh, em] = [m[1], m[2] ?? '0', m[3], m[4] ?? '0'].map(Number)
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return null
  if (eh * 60 + em <= sh * 60 + sm) return null
  const fmt = (h: number, min: number) => `${h}:${String(min).padStart(2, '0')}`
  return { start: fmt(sh, sm), end: fmt(eh, em), rest: m[5].trim() }
}

// A URL at the very end of an event row becomes the event's join link.
// Either bare ("… https://zoom.us/j/1") or auto-linked ("… [zoom.us/j/1](https://zoom.us/j/1)").
const TRAILING_URL = /(?:^|\s+)(?:\[([^\]]+)\]\(([^)\s]+)\)|((?:https?:\/\/|www\.)\S+))$/

function parseEvent(md: string): Omit<EventItem, 'id' | 'container' | 'order' | 'projectId'> | null {
  const t = parseTimeRange(md)
  if (!t) return null
  let title = t.rest
  let link: string | null = null
  const m = title.match(TRAILING_URL)
  if (m && (m[3] || normalizeUrl(m[1]) === m[2] || m[1] === m[2])) {
    link = normalizeUrl(m[3] ?? m[2])
    title = title.slice(0, m.index).trim() || 'Untitled event'
  }
  return { type: 'event', start: t.start, end: t.end, title, link }
}

/** Text shown in the editor when an existing item is edited. */
export function editText(item: Item): string {
  switch (item.type) {
    case 'event':
      return `${item.start}-${item.end} ${item.title}${item.link ? ` ${item.link}` : ''}`
    case 'session':
      return ''
    default:
      return item.text
  }
}

/** Turn edited text into item fields for the chosen mode. */
export function materialize(mode: EditMode, md: string, repeat: Repeat, prev?: Item): ItemFields {
  const done = prev && 'done' in prev ? prev.done : false
  switch (mode) {
    case 'auto':
    case 'event':
      // Events need a timeframe; without one the row is saved as a task.
      return parseEvent(md) ?? { type: 'task', text: md, done }
    case 'task':
      return { type: 'task', text: md, done }
    case 'goal':
      return { type: 'goal', text: md, done }
    case 'routine':
      return { type: 'routine', text: md, done, repeat }
    case 'note':
      return { type: 'note', text: md }
  }
}
