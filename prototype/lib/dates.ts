import {
  addDays,
  differenceInMinutes,
  eachWeekOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { ContainerKey, Section } from '../types'

const WEEK = { weekStartsOn: 1 } as const

/** Weeks (Mon→Sun) covering the given month, including spill-over days. */
export function monthWeeks(month: Date): Date[][] {
  return eachWeekOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }, WEEK).map(
    (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
  )
}

export const mondayOf = (d: Date) => startOfWeek(d, WEEK)
/** The month a week belongs to: the one holding its Thursday (so most of its days). */
export const monthOfWeek = (monday: Date) => startOfMonth(addDays(monday, 3))
/** Month shown with a week on mobile: today's month for this week, otherwise the Thursday rule. */
export const monthForWeek = (monday: Date) =>
  mondayOf(new Date()).getTime() === monday.getTime() ? startOfMonth(new Date()) : monthOfWeek(monday)
/** First week that belongs to the month. */
export const weekInMonth = (month: Date) => mondayOf(addDays(startOfMonth(month), 3))

/** "Nov 10 – 16", "Oct 27 – Nov 2" */
export function weekLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  return isSameMonth(monday, sunday)
    ? `${format(monday, 'MMM d')} – ${format(sunday, 'd')}`
    : `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d')}`
}

export const dayKey = (d: Date): ContainerKey => `day:${format(d, 'yyyy-MM-dd')}`
export const weekKey = (monday: Date, s: Section): ContainerKey =>
  `week:${format(monday, 'yyyy-MM-dd')}:${s}`
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

export const clock = (iso: string) => format(parseISO(iso), 'H:mm')
export const isoMinutes = (a: string, b: string) => differenceInMinutes(parseISO(b), parseISO(a))
