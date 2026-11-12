import { eachDayOfInterval, format, getDate, getDaysInMonth, max, min, parseISO } from 'date-fns'
import type { RoutineRule } from '../types'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

/** Scheduled dates of a rule within [from, to] (inclusive), minus skipped ones. */
export function ruleDates(rule: RoutineRule, from: Date, to: Date): string[] {
  const start = parseISO(rule.start)
  const lo = max([start, from])
  const hi = rule.end ? min([parseISO(rule.end), to]) : to
  if (lo > hi) return []
  const startDow = start.getDay()
  const startDom = getDate(start)
  return eachDayOfInterval({ start: lo, end: hi })
    .filter((d) => {
      if (rule.repeat === 'daily') return true
      if (rule.repeat === 'weekly') return d.getDay() === startDow
      return getDate(d) === Math.min(startDom, getDaysInMonth(d)) // monthly, clamped to short months
    })
    .map(ymd)
    .filter((date) => !rule.skip.includes(date))
}

/** 'day:2026-11-12' → '2026-11-12' (null for weekly/monthly containers) */
export const containerDate = (container: string) => (container.startsWith('day:') ? container.slice(4) : null)
