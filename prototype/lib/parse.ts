import { formatTimeRange } from './dates'
import { normalizeUrl } from './rich'
import { useSettings } from './settings'
import type { EventItem, Item, ItemFields, ItemType, Repeat } from '../types'

/** How a row being edited will be saved. 'auto' = task, unless it starts with a time range. */
export type EditMode = Exclude<ItemType, 'session'> | 'auto'

// Ranges: "5:00-5:30 Meet Dave", "5 - 5:30 …", "14:00–15:00 …", "2-3pm …", "11am-1pm …", "9:30am–10:15 …"
const TIME_RANGE = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?=\s|$)/i
// A start time only, written as a time (am/pm or a colon, so "5 things" stays text): "5pm …", "17:00 …", "9:30am …"
const START_TIME = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?=\s|$)/i
// …optionally followed by a length: "1h", "1.5h", "1h30", "45m", "90min"
const LENGTH = /^\s+(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)(?:(\d{1,2})\s*(?:m|min)?)?(?=\s|$)/i

/** Length of an event when only its start is typed ("5pm Call Jon"). */
export const DEFAULT_EVENT_MIN = 30

/** Hour with an optional am/pm → 0–23 (null if invalid). Without a suffix it's read as 24h. */
function hour24(h: number, suffix: string | undefined): number | null {
  if (!suffix) return h <= 23 ? h : null
  if (h < 1 || h > 12) return null
  return (h % 12) + (suffix.toLowerCase() === 'pm' ? 12 : 0)
}

const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

export interface ParsedTime {
  start: string // 'H:mm'
  end: string
  /** The text after the time (the title, maybe a link). */
  rest: string
  /** The leading time part as typed, with its trailing space ("5pm 1h "). */
  prefix: string
}

/**
 * A time at the start of a row: a range ("5-6pm …", "14:00-15:30 …"), or a start time with an
 * optional length ("5pm Call Jon" = 30 min, "5pm 1h Call Jon", "17:00 45m …"). null = no time.
 */
export function parseTimeRange(text: string): ParsedTime | null {
  const done = (startMin: number, endMin: number, matched: number): ParsedTime | null => {
    if (endMin <= startMin) return null
    const prefix = text.slice(0, matched).replace(/^\s+/, '')
    const rest = text.slice(matched).trim()
    return { start: hm(startMin), end: hm(Math.min(endMin, 23 * 60 + 59)), rest, prefix: rest ? `${prefix} ` : prefix }
  }

  const m = text.match(TIME_RANGE)
  if (m) {
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
    if (start === null) return null
    return done(start * 60 + sm, end * 60 + em, m[0].length)
  }

  const t = text.match(START_TIME)
  if (!t || (!t[2] && !t[3])) return null
  const minute = Number(t[2] ?? 0)
  const hour = hour24(Number(t[1]), t[3])
  if (hour === null || minute > 59) return null
  const startMin = hour * 60 + minute
  const l = text.slice(t[0].length).match(LENGTH)
  if (!l) return done(startMin, startMin + DEFAULT_EVENT_MIN, t[0].length)
  const n = Number(l[1].replace(',', '.'))
  const length = l[2].toLowerCase().startsWith('h') ? Math.round(n * 60) + Number(l[3] ?? 0) : Math.round(n)
  if (!length) return null
  return done(startMin, startMin + length, t[0].length + l[0].length)
}

// A URL at the very end of an event row becomes the event's join link.
// Either bare ("… https://zoom.us/j/1") or auto-linked ("… [zoom.us/j/1](https://zoom.us/j/1)").
const TRAILING_URL = /(?:^|\s+)(?:\[([^\]]+)\]\(([^)\s]+)\)|((?:https?:\/\/|www\.)\S+))$/

function parseEvent(md: string): Omit<EventItem, 'id' | 'container' | 'order' | 'projectId'> | null {
  const t = parseTimeRange(md)
  if (!t) return null
  let title = t.rest || 'Untitled event'
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

/** "Apartment move 40%" → { text: 'Apartment move', progress: 40 } (no % = 0). */
export function parseProgress(text: string): { text: string; progress: number } {
  const m = text.match(/\s+(\d{1,3})\s*%$/)
  if (!m) return { text: text.trim(), progress: 0 }
  return { text: text.slice(0, m.index).trim() || text.trim(), progress: Math.min(100, Number(m[1])) }
}

/** Turn edited text into item fields for the chosen mode. `date` = the day it's in ('yyyy-MM-dd'). */
export function materialize(mode: EditMode, md: string, repeat: Repeat, prev?: Item, date?: string | null): ItemFields {
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
    case 'process':
      if (prev?.type === 'process') return { ...prev, text: md }
      {
        const { text, progress } = parseProgress(md)
        return { type: 'process', text, progress, doneOn: progress === 100 ? (date ?? null) : null }
      }
  }
}
