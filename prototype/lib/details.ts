// Calendar items that open a details popup when clicked (instead of being edited in the row).
import { format } from 'date-fns'
import { containerDate } from './routines'
import type { Item, ProcessItem, Repeat, RoutineItem } from '../types'

export const hasDetails = (item: Item) => item.type === 'note' || item.type === 'event' || item.type === 'session'

/** Container of a focus session's own tasks. */
export const sessionTasksKey = (sessionId: string) => `session:${sessionId}`

/** A note's row shows only its first sentence (the popup has the whole text). */
export function firstSentence(text: string): string {
  const line = text.trim().split('\n')[0].trim()
  return line.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? line
}

// ─── Routine groups ────────────────────────────────────────────────────
// A day shows its routine copies as one row per repeat (monthly, then weekly, then daily);
// the row's popup lists them. The row counts as finished once all of them are.

export const ROUTINE_ORDER: Repeat[] = ['monthly', 'weekly', 'daily']
export const ROUTINE_LABEL: Record<Repeat, string> = { daily: 'Daily routine', weekly: 'Weekly routine', monthly: 'Monthly routine' }

/** Id of a routine group's popup (detailsFor). */
export const routineGroupId = (container: string, repeat: Repeat) => `routines:${container}:${repeat}`
/** 'routines:day:2026-11-18:daily' → { container: 'day:2026-11-18', repeat: 'daily' } */
export function parseRoutineGroupId(id: string): { container: string; repeat: Repeat } {
  const parts = id.split(':')
  return { container: parts.slice(1, -1).join(':'), repeat: parts.at(-1) as Repeat }
}

/** A day's routine copies, grouped by repeat in display order (empty groups left out). */
export function routineGroups(items: Item[]): { repeat: Repeat; tasks: RoutineItem[] }[] {
  const routines = items.filter((i): i is RoutineItem => i.type === 'routine')
  return ROUTINE_ORDER.map((repeat) => ({ repeat, tasks: routines.filter((r) => r.repeat === repeat) })).filter((g) => g.tasks.length)
}

// ─── Processes ─────────────────────────────────────────────────────────

export const processGroupId = (container: string) => `processes:${container}`
export const today = () => format(new Date(), 'yyyy-MM-dd')

/** Processes shown on a day: started on or before it, and not finished before it.
 *  Open ones carry over up to today (not into the future, except on the day they start). */
export function processesOn(items: Item[], date: string, now = today()): ProcessItem[] {
  return items.filter((i): i is ProcessItem => {
    if (i.type !== 'process') return false
    const start = containerDate(i.container)
    if (!start || start > date) return false
    const last = i.doneOn ?? (start > now ? start : now)
    return date <= last
  })
}

/** Finished as of that day (it reached 100% on or before it). */
export const processDoneBy = (p: ProcessItem, date: string) => !!p.doneOn && p.doneOn <= date
