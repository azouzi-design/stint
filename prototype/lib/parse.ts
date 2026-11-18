import { formatTimeRange } from './dates'
import { normalizeUrl } from './rich'
import { useSettings } from './settings'
import type { EventItem, Item, ItemFields, ItemType, Repeat } from '../types'

/** How a row being edited will be saved. 'auto' = task, unless it starts with a time range. */
export type EditMode = Exclude<ItemType, 'session'> | 'auto'

// "5:00-5:30 Meet Dave", "5 - 5:30 …", "14:00–15:00 …", "2-3pm …", "11am-1pm …", "9:30am–10:15 …"
const TIME_RANGE = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(.+)$/i

/** Hour with an optional am/pm → 0–23 (null if invalid). Without a suffix it's read as 24h. */
function hour24(h: number, suffix: string | undefined): number | null {
  if (!suffix) return h <= 23 ? h : null
  if (h < 1 || h > 12) return null
  return (h % 12) + (suffix.toLowerCase() === 'pm' ? 12 : 0)
}

export function parseTimeRange(text: string): { start: string; end: string; rest: string } | null {
  const m = text.match(TIME_RANGE)
  if (!m) return null
  const [sh, sm, eh, em] = [m[1], m[2] ?? '0', m[4], m[5] ?? '0'].map(Number)
  if (sm > 59 || em > 59) return null
  const end = hour24(eh, m[6])
  if (end === null) return null
  let start = hour24(sh, m[3])
  // "2-3pm": the start takes the end's am/pm ("11-1pm" → 11am, when that's the only way it fits).
  if (!m[3] && m[6] && sh >= 1 && sh <= 12) {
    const same = hour24(sh, m[6])!
    const other = hour24(sh, m[6].toLowerCase() === 'pm' ? 'am' : 'pm')!
    start = same * 60 + sm < end * 60 + em ? same : other
  }
  if (start === null || end * 60 + em <= start * 60 + sm) return null
  const fmt = (h: number, min: number) => `${h}:${String(min).padStart(2, '0')}`
  return { start: fmt(start, sm), end: fmt(end, em), rest: m[7].trim() }
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
      return `${formatTimeRange(item.start, item.end, useSettings.getState().timeFormat, '-')} ${item.title}${item.link ? ` ${item.link}` : ''}`
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
