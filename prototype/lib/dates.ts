import {
  addDays,
  differenceInMinutes,
  eachWeekOfInterval,
  endOfMonth,
  format,
  getISOWeek,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { ContainerKey, Section } from '../types'
import { useSettings, type TimeFormat } from './settings'

// Weeks start on Monday or Sunday (Settings). Functions read the setting when called:
// components showing weeks subscribe to `weekStart` so they re-render when it changes.
const week = () => ({ weekStartsOn: useSettings.getState().weekStart === 'sunday' ? 0 : 1 }) as const

/** Weeks covering the given month (each starts on the week start day), including spill-over days. */
export function monthWeeks(month: Date): Date[][] {
  return eachWeekOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }, week()).map(
    (first) => Array.from({ length: 7 }, (_, i) => addDays(first, i)),
  )
}

/** First day (Monday or Sunday) of the week holding `d`. */
export const weekStartOf = (d: Date) => startOfWeek(d, week())
/** The month a week belongs to: the one holding its middle day (so most of its days). */
export const monthOfWeek = (start: Date) => startOfMonth(addDays(start, 3))
/** Month shown with a week on mobile: today's month for this week, otherwise the middle-day rule. */
export const monthForWeek = (start: Date) =>
  weekStartOf(new Date()).getTime() === start.getTime() ? startOfMonth(new Date()) : monthOfWeek(start)
/** First week that belongs to the month. */
export const weekInMonth = (month: Date) => weekStartOf(addDays(startOfMonth(month), 3))

/** Weekday names in display order. */
export const weekdayNames = (style: 'EEEE' | 'EEE' = 'EEEE') =>
  Array.from({ length: 7 }, (_, i) => format(addDays(weekStartOf(new Date()), i), style))

/** "Nov 10 – 16", "Oct 27 – Nov 2" */
export function weekLabel(start: Date): string {
  const end = addDays(start, 6)
  return isSameMonth(start, end)
    ? `${format(start, 'MMM d')} – ${format(end, 'd')}`
    : `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
}

/** How a week is named: "This week", "Last week", "Next week", otherwise its dates ("Nov 2 – 8").
 *  (Week numbers only appear in tooltips: most people don't plan by them.) */
export function weekName(start: Date, today = new Date()): string {
  const diff = Math.round((weekStartOf(start).getTime() - weekStartOf(today).getTime()) / (7 * 864e5))
  if (diff === 0) return 'This week'
  if (diff === -1) return 'Last week'
  if (diff === 1) return 'Next week'
  return weekLabel(start)
}

/** "Week 47" (ISO), for tooltips. */
export const weekNumberLabel = (start: Date) => `Week ${getISOWeek(mondayIn(start))}`

/** The Monday inside a week (whatever day it starts on). Weekly cells are keyed by it, so their
 *  items stay put when the week start setting changes. */
export const mondayIn = (start: Date) => addDays(start, (8 - start.getDay()) % 7)

export const dayKey = (d: Date): ContainerKey => `day:${format(d, 'yyyy-MM-dd')}`
export const weekKey = (start: Date, s: Section): ContainerKey =>
  `week:${format(mondayIn(start), 'yyyy-MM-dd')}:${s}`
export const monthKey = (month: Date, s: Section): ContainerKey =>
  `month:${format(month, 'yyyy-MM')}:${s}`

/** 90 → "1.5h", 50 → "50m", 120 → "2h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`
  const h = Math.round((minutes / 60) * 100) / 100
  return `${h}h`
}

/** "17:00" + "17:30" → minutes between them */
export function timeframeMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

/** ISO timestamp → "H:mm" (the stored time format, like event times). */
export const clock = (iso: string) => format(parseISO(iso), 'H:mm')

// ─── Displayed times (Settings: 12h / 24h) ─────────────────────────────

const parts = (t: string) => t.split(':').map(Number) as [number, number]
const meridiem = (h: number) => (h < 12 ? 'am' : 'pm')
const h12 = (h: number, m: number, suffix: boolean) =>
  `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${suffix ? meridiem(h) : ''}`

/** "14:30" → "14:30" (24h) or "2:30pm" (12h). */
export function formatTime(t: string, f: TimeFormat): string {
  const [h, m] = parts(t)
  return f === '24h' ? `${h}:${String(m).padStart(2, '0')}` : h12(h, m, true)
}

/** "9:00"–"10:30" → "9:00–10:30" (24h) or "9–10:30am" / "11am–1pm" (12h). `end` null = still running. */
export function formatTimeRange(start: string, end: string | null, f: TimeFormat, sep = '–'): string {
  if (f === '24h' || end === null) return `${formatTime(start, f)}${sep}${end === null ? '…' : formatTime(end, f)}`
  const [sh, sm] = parts(start)
  const [eh, em] = parts(end)
  return `${h12(sh, sm, meridiem(sh) !== meridiem(eh))}${sep}${h12(eh, em, true)}`
}
export const isoMinutes = (a: string, b: string) => differenceInMinutes(parseISO(b), parseISO(a))
