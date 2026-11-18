// Sample data so the calendar feels real on first load. Covers the previous,
// current, and next month relative to today. Deterministic per date, so a
// reset produces the same calendar.
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isWeekend,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { dayKey, isoMinutes, monthKey, timeframeMinutes, weekKey } from './lib/dates'
import { ruleDates } from './lib/routines'
import type { Item, Project, RoutineRule } from './types'

export const SEED_PROJECTS: Project[] = [
  { id: 'p-portfolio', name: 'Portfolio', color: 'blue', deleted: false },
  { id: 'p-client', name: 'Client work', color: 'orange', deleted: false },
  { id: 'p-admin', name: 'Admin', color: 'green', deleted: false },
  { id: 'p-health', name: 'Health', color: 'pink', deleted: false },
]

const TASKS: [string, string | null][] = [
  ['Reply to client emails', 'p-client'],
  ['Send invoice for last month', 'p-admin'],
  ['Portfolio: projects section', 'p-portfolio'],
  ['Fix mobile nav on portfolio', 'p-portfolio'],
  ['Call the bank about transfer', 'p-admin'],
  ['Review proposal draft', 'p-client'],
  ['Buy a new notebook', null],
  ['Schedule social posts for next week', null],
  ['Prepare tax documents', 'p-admin'],
  ['Book dentist appointment', 'p-health'],
  ['Update CV', null],
  ['Groceries', null],
  ['Refine landing page hero', 'p-client'],
  ['Follow up on contract', 'p-client'],
  ['Write case study outline', 'p-portfolio'],
  ['Clean up Figma file', 'p-client'],
]

const NOTES = [
  'Working from the coworking space',
  'Low energy today, keep it light',
  'Idea: rebrand bio + social covers',
  'Invoices are due Friday',
]

const EVENTS: [string, string, string, string | null, string | null][] = [
  ['Team sync', '10:00', '10:30', 'https://meet.google.com/abc-defg-hij', 'p-client'],
  ['Client call', '15:00', '16:00', 'https://zoom.us/j/123456789', 'p-client'],
  ['Design review', '14:00', '14:45', 'https://meet.google.com/xyz-uvwx-rst', 'p-client'],
  ['Dinner with friends', '20:00', '22:00', null, null],
  ['Gym class', '18:00', '19:00', null, 'p-health'],
  ['1:1 with Jon', '11:00', '11:30', 'https://meet.google.com/jon-one-one', null],
]

const WEEK_GOALS = ['Ship portfolio v1', 'Close the proposal', 'Train 4 times', 'Inbox zero by Friday']
const WEEK_BACKLOG = ['Research invoicing tools', 'Draft newsletter', 'Organize photos', 'Read design article']
const MONTH_GOALS = ['Launch the new portfolio', 'Sign 2 new clients', 'Read 2 books']
const MONTH_BACKLOG = ['Renew passport', 'Plan a weekend trip', 'Set up a budget sheet', 'Back up laptop']

// Small deterministic PRNG seeded from a string
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function seedRules(now = new Date()): RoutineRule[] {
  const from = startOfMonth(addMonths(now, -1))
  const firstSunday = addDays(from, (7 - from.getDay()) % 7)
  const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
  return [
    { id: 'r-reading', text: 'Morning reading', repeat: 'daily', projectId: 'p-health', start: ymd(from), end: null, skip: [] },
    { id: 'r-review', text: 'Weekly review', repeat: 'weekly', projectId: null, start: ymd(firstSunday), end: null, skip: [] },
    { id: 'r-rent', text: 'Pay rent', repeat: 'monthly', projectId: 'p-admin', start: ymd(from), end: null, skip: [] },
  ]
}

export function buildSeed(now = new Date()): Item[] {
  const items: Item[] = []
  let n = 0
  const id = () => `seed-${n++}`
  const today = startOfDay(now)
  const from = startOfMonth(addMonths(now, -1))
  const to = endOfMonth(addMonths(now, 1))
  const rules = seedRules(now)

  for (const day of eachDayOfInterval({ start: from, end: to })) {
    const r = rng(format(day, 'yyyy-MM-dd'))
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
    const container = dayKey(day)
    const isPast = isBefore(day, today)
    const isToday = isSameDay(day, today)
    const farFuture = day.getTime() - today.getTime() > 14 * 864e5
    const dayItems: Item[] = []
    let order = 0
    const base = () => ({ id: id(), container, order: order++ })

    // Routine copies for the seeded range (later dates are generated from the rules)
    const ymd = format(day, 'yyyy-MM-dd')
    for (const rule of rules) {
      if (!ruleDates(rule, day, day).length) continue
      const done = isPast || (isToday && rule.repeat === 'daily' && r() > 0.3)
      dayItems.push({ ...base(), type: 'routine', text: rule.text, done, repeat: rule.repeat, projectId: rule.projectId, ruleId: rule.id, ruleDate: ymd })
    }

    // Focus sessions (past days and earlier today only)
    if ((isPast || isToday) && !isWeekend(day)) {
      let hour = 9 + Math.floor(r() * 2)
      const count = 1 + Math.floor(r() * 3)
      for (let i = 0; i < count; i++) {
        const minutes = pick([25, 50, 50, 90])
        const start = set(day, { hours: hour, minutes: pick([0, 30]), seconds: 0, milliseconds: 0 })
        const end = new Date(start.getTime() + minutes * 60_000)
        if (isToday && end > now) break
        dayItems.push({
          ...base(),
          type: 'session',
          status: 'finished',
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          projectId: pick(['p-portfolio', 'p-client', null]),
        })
        hour += 2 + Math.floor(r() * 2)
      }
    }

    // Events
    if (!isWeekend(day) && r() > 0.45) {
      const [title, start, end, link, projectId] = pick(EVENTS)
      dayItems.push({ ...base(), type: 'event', title, start, end, link, projectId })
    }

    // Tasks
    const taskCount = farFuture ? Math.floor(r() * 2) : isWeekend(day) ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 4)
    for (let i = 0; i < taskCount; i++) {
      const [text, projectId] = pick(TASKS)
      const done = isPast ? r() > 0.15 : isToday ? r() > 0.6 : false
      dayItems.push({ ...base(), type: 'task', text, done, projectId })
    }

    // Notes
    if (r() > 0.8) dayItems.push({ ...base(), type: 'note', text: pick(NOTES), projectId: null })

    // Layout: routines, then time-bound items sorted by time, then tasks, then notes
    const minutesOf = (it: Item) =>
      it.type === 'event' ? timeframeMinutes('0:00', it.start) : it.type === 'session' ? isoMinutes(day.toISOString(), it.startedAt) : 0
    const rank = (it: Item) => ({ routine: 0, process: 0, session: 1, event: 1, task: 2, goal: 2, note: 3 })[it.type]
    dayItems
      .sort((a, b) => rank(a) - rank(b) || minutesOf(a) - minutesOf(b))
      .forEach((it, i) => (it.order = i))
    items.push(...dayItems)
  }

  // Weekly cells
  for (const day of eachDayOfInterval({ start: from, end: to })) {
    if (day.getDay() !== 1 && !isSameDay(day, from)) continue
    const monday = startOfWeek(day, { weekStartsOn: 1 })
    const r = rng(`week-${format(monday, 'yyyy-MM-dd')}`)
    const weekPast = isBefore(monday, startOfWeek(today, { weekStartsOn: 1 }))
    const shift = Math.floor(r() * WEEK_GOALS.length)
    const goals = [...WEEK_GOALS.slice(shift), ...WEEK_GOALS.slice(0, shift)].slice(0, 1 + Math.floor(r() * 2))
    goals.forEach((text, i) =>
      items.push({ id: id(), container: weekKey(monday, 'goals'), order: i, type: 'goal', text, done: weekPast && r() > 0.3, projectId: text.includes('portfolio') ? 'p-portfolio' : null }),
    )
    if (r() > 0.5)
      items.push({ id: id(), container: weekKey(monday, 'notes'), order: 0, type: 'note', text: 'Keep mornings for deep work', projectId: null })
    WEEK_BACKLOG.slice(0, 1 + Math.floor(r() * 3)).forEach((text, i) =>
      items.push({ id: id(), container: weekKey(monday, 'backlog'), order: i, type: 'task', text, done: false, projectId: null }),
    )
  }

  // Monthly cells
  for (const offset of [-1, 0, 1]) {
    const month = addMonths(now, offset)
    MONTH_GOALS.forEach((text, i) =>
      items.push({ id: id(), container: monthKey(month, 'goals'), order: i, type: 'goal', text, done: offset < 0 && i !== 1, projectId: i === 0 ? 'p-portfolio' : i === 1 ? 'p-client' : null }),
    )
    items.push({ id: id(), container: monthKey(month, 'notes'), order: 0, type: 'note', text: 'Focus month: fewer meetings, more deep work', projectId: null })
    MONTH_BACKLOG.forEach((text, i) =>
      items.push({ id: id(), container: monthKey(month, 'backlog'), order: i, type: 'task', text, done: false, projectId: null }),
    )
  }

  // Processes: carried over from the day they started until they reach 100%
  const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
  const process = (text: string, startedDaysAgo: number, progress: number, doneDaysAgo: number | null, projectId: string | null) =>
    items.push({
      id: id(),
      container: dayKey(addDays(today, -startedDaysAgo)),
      order: -1,
      type: 'process',
      text,
      progress,
      doneOn: doneDaysAgo === null ? null : ymd(addDays(today, -doneDaysAgo)),
      projectId,
    })
  process('Invoice PC repair claim', 9, 40, null, 'p-admin')
  process('Portfolio case study write-up', 5, 70, null, 'p-portfolio')
  process('Passport renewal', 16, 100, 3, null)

  return items
}
