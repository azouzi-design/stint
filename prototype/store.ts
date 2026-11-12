import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, addMonths, addWeeks, format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { dayKey, monthForWeek, monthWeeks, mondayOf, weekInMonth } from './lib/dates'
import { plainText } from './lib/rich'
import { containerDate, ruleDates } from './lib/routines'
import { buildSeed, SEED_PROJECTS, seedRules } from './seed'
import { sessionClock } from './lib/session'
import type { ActiveSession, Clipboard, Editing, Item, ItemFields, Project, Repeat, RoutineRule, Section } from './types'

interface State {
  items: Item[]
  projects: Project[]
  rules: RoutineRule[]

  /** First day of the month being viewed. Not persisted: always opens on today. */
  viewMonth: Date
  shiftMonth: (delta: number) => void
  /** Monday of the week being viewed (mobile). Kept in sync with viewMonth, which always overlaps it:
   *  today's week ↔ today's month; any other week ↔ the month holding its Thursday. */
  viewWeek: Date
  shiftWeek: (delta: number) => void
  goToToday: () => void
  resetToSample: () => void

  /** Row currently being edited (not persisted). */
  editing: Editing | null
  startEditing: (e: Editing) => void
  stopEditing: () => void

  /** Insert after `afterId` (null = at the end). Time-bound items in a day are placed by time. Returns the new id. */
  addItem: (container: string, afterId: string | null, fields: ItemFields, projectId?: string | null) => string
  updateItem: (id: string, fields: ItemFields) => void
  removeItem: (id: string) => void
  toggleDone: (id: string) => void
  setProject: (id: string, projectId: string | null) => void
  /** Drag & drop: move to `container` at `index` (no type conversion). */
  moveItem: (id: string, container: string, index: number) => void
  /** After a drop: convert the item to fit its container (e.g. goal ↔ task). */
  adaptToContainer: (id: string) => void

  clipboard: Clipboard | null
  copyItem: (id: string) => void
  cutItem: (id: string) => void
  /** Paste after `afterId` (null = at the end). Returns false if the item can't go there. */
  paste: (container: string, afterId: string | null) => boolean

  createProject: (name: string, color: string) => string
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'color'>>) => void
  deleteProject: (id: string) => void
  /** Item whose project picker is open from the right-click menu (not persisted). */
  projectPickerFor: string | null
  openProjectPicker: (id: string | null) => void

  /** Turn a day item into the first copy of a repeating routine. */
  makeRoutine: (id: string, repeat: Repeat) => void
  /** Stop a routine after this copy: later copies are removed. */
  stopRoutine: (id: string) => void
  /** Generate missing routine copies for the visible month. */
  ensureRoutines: () => void

  /** The running focus session, if any. */
  activeSession: ActiveSession | null
  /** Creates an active session row in today's cell and starts the countdown. */
  startSession: (minutes: number) => void
  pauseSession: () => void
  resumeSession: () => void
  /** Called when the countdown reaches zero: the session then waits for the user. */
  markTimeUp: () => void
  /** Add minutes (also from the time-up state: the wait isn't counted as focus time). */
  extendSession: (minutes: number) => void
  /** Finish now (stopped early) or at the time-up point. Sessions under a minute are discarded. */
  finishSession: () => void
}

// ─── Pure helpers ──────────────────────────────────────────────────────

const byOrder = (a: Item, b: Item) => a.order - b.order
const listOf = (items: Item[], container: string) => items.filter((i) => i.container === container).sort(byOrder)
const sectionOf = (container: string): Section | null =>
  container.startsWith('day:') ? null : (container.split(':').pop() as Section)

/** Replace one container's list, renumbering order. */
function withList(items: Item[], container: string, list: Item[]): Item[] {
  return [...items.filter((i) => i.container !== container), ...list.map((i, order) => ({ ...i, container, order }))]
}

/** Minutes since midnight for time-bound items (events, sessions), else null. */
function timeOf(i: Item | ItemFields): number | null {
  if (i.type === 'event') {
    const [h, m] = i.start.split(':').map(Number)
    return h * 60 + m
  }
  if (i.type === 'session') {
    const d = parseISO(i.startedAt)
    return d.getHours() * 60 + d.getMinutes()
  }
  return null
}

/** Insert a time-bound item among the day's other time-bound items, in time order. */
function insertByTime(list: Item[], item: Item): Item[] {
  const t = timeOf(item)!
  const rest = list.filter((i) => i.id !== item.id)
  const later = rest.findIndex((i) => (timeOf(i) ?? -1) > t)
  if (later >= 0) return [...rest.slice(0, later), item, ...rest.slice(later)]
  const lastEarlier = rest.reduce((at, i, idx) => (timeOf(i) !== null ? idx : at), -1)
  if (lastEarlier >= 0) return [...rest.slice(0, lastEarlier + 1), item, ...rest.slice(lastEarlier + 1)]
  return [...rest, item]
}

/** Text of any item, for converting between types or the system clipboard. */
function textOf(f: ItemFields): string {
  if (f.type === 'event') return `${f.start}-${f.end} ${f.title}${f.link ? ` ${f.link}` : ''}`
  if (f.type === 'session') return ''
  return f.text
}

/** Convert fields to what a container accepts. null = not allowed there (sessions in weekly/monthly cells). */
function fitFields(f: ItemFields, container: string): ItemFields | null {
  const section = sectionOf(container)
  const done = 'done' in f ? f.done : false
  if (!section) return f.type === 'goal' ? { type: 'task', text: f.text, done } : f
  if (f.type === 'session') return null
  const text = f.type === 'event' ? f.title : f.text
  if (section === 'goals') return f.type === 'goal' ? f : { type: 'goal', text, done }
  if (section === 'notes') return f.type === 'note' ? f : { type: 'note', text }
  return f.type === 'task' ? f : { type: 'task', text, done }
}

function fieldsOf(i: Item): ItemFields {
  const fields: Partial<Item> = { ...i }
  delete fields.id
  delete fields.container
  delete fields.order
  delete fields.projectId
  return fields as ItemFields
}

/** Days routines are generated for: the month grid, plus a week either side (the mobile swipe previews). */
const viewRange = (month: Date) => {
  const weeks = monthWeeks(month)
  return { from: addDays(weeks[0][0], -7), to: addDays(weeks[weeks.length - 1][6], 7) }
}

/** Items with any missing routine copies for [from, to] added at the top of their day. */
function generateRoutines(items: Item[], rules: RoutineRule[], from: Date, to: Date): Item[] {
  const existing = new Set(items.flatMap((i) => (i.type === 'routine' && i.ruleId ? [`${i.ruleId}|${i.ruleDate}`] : [])))
  let next = items
  for (const rule of rules) {
    for (const date of ruleDates(rule, from, to)) {
      if (existing.has(`${rule.id}|${date}`)) continue
      const container = dayKey(parseISO(date))
      const list = listOf(next, container)
      const at = list.findIndex((i) => i.type !== 'routine')
      const copy: Item = {
        id: crypto.randomUUID(),
        container,
        order: 0,
        projectId: rule.projectId,
        type: 'routine',
        text: rule.text,
        done: false,
        repeat: rule.repeat,
        ruleId: rule.id,
        ruleDate: date,
      }
      const pos = at < 0 ? list.length : at
      next = withList(next, container, [...list.slice(0, pos), copy, ...list.slice(pos)])
    }
  }
  return next
}

/** Removing / converting a routine copy: remember the date so it isn't regenerated. */
function skipRoutineCopy(rules: RoutineRule[], item: Item | undefined): RoutineRule[] {
  if (item?.type !== 'routine' || !item.ruleId || !item.ruleDate) return rules
  return rules.map((r) => (r.id === item.ruleId ? { ...r, skip: [...r.skip, item.ruleDate!] } : r))
}

// ─── Store ─────────────────────────────────────────────────────────────

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      items: buildSeed(),
      projects: SEED_PROJECTS,
      rules: seedRules(),

      viewMonth: startOfMonth(new Date()),
      shiftMonth: (delta) => {
        set((s) => {
          const viewMonth = addMonths(s.viewMonth, delta)
          const viewWeek = isSameMonth(viewMonth, new Date()) ? mondayOf(new Date()) : weekInMonth(viewMonth)
          return { viewMonth, viewWeek, editing: null }
        })
        get().ensureRoutines()
      },
      viewWeek: mondayOf(new Date()),
      shiftWeek: (delta) => {
        set((s) => {
          const viewWeek = addWeeks(s.viewWeek, delta)
          return { viewWeek, viewMonth: monthForWeek(viewWeek), editing: null }
        })
        get().ensureRoutines()
      },
      goToToday: () => {
        set({ viewMonth: startOfMonth(new Date()), viewWeek: mondayOf(new Date()), editing: null })
        get().ensureRoutines()
      },
      resetToSample: () => {
        set({ items: buildSeed(), projects: SEED_PROJECTS, rules: seedRules(), editing: null, clipboard: null })
        get().ensureRoutines()
      },

      editing: null,
      startEditing: (editing) => set({ editing }),
      stopEditing: () => set({ editing: null }),

      addItem: (container, afterId, fields, projectId = null) => {
        const id = crypto.randomUUID()
        set((s) => {
          const list = listOf(s.items, container)
          const created = { ...fields, id, container, order: 0, projectId } as Item
          let next: Item[]
          if (container.startsWith('day:') && timeOf(fields) !== null) next = insertByTime(list, created)
          else {
            const pos = afterId ? list.findIndex((i) => i.id === afterId) : -1
            const at = pos >= 0 ? pos + 1 : list.length
            next = [...list.slice(0, at), created, ...list.slice(at)]
          }
          return { items: withList(s.items, container, next) }
        })
        return id
      },

      updateItem: (id, fields) =>
        set((s) => {
          const old = s.items.find((i) => i.id === id)
          if (!old) return {}
          let updated = { id, container: old.container, order: old.order, projectId: old.projectId, ...fields } as Item
          let rules = s.rules
          let items = s.items

          if (old.type === 'routine' && old.ruleId) {
            if (updated.type === 'routine') {
              // Keep the link (a repeat change is handled by makeRoutine), and apply
              // text edits to the rule + this and later copies.
              updated = { ...updated, ruleId: old.ruleId, ruleDate: old.ruleDate }
              if (updated.repeat === old.repeat && updated.text !== old.text) {
                const text = updated.text
                rules = rules.map((r) => (r.id === old.ruleId ? { ...r, text } : r))
                items = items.map((i) =>
                  i.type === 'routine' && i.ruleId === old.ruleId && i.ruleDate! > old.ruleDate! ? { ...i, text } : i,
                )
              }
            } else {
              rules = skipRoutineCopy(rules, old) // converted to something else: don't regenerate it
            }
          }

          items = items.map((i) => (i.id === id ? updated : i))
          const timeChanged = timeOf(updated) !== null && (old.type !== updated.type || timeOf(old) !== timeOf(updated))
          if (old.container.startsWith('day:') && timeChanged) {
            items = withList(items, old.container, insertByTime(listOf(items, old.container), updated))
          }
          return { items, rules }
        }),

      removeItem: (id) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id)
          return { items: s.items.filter((i) => i.id !== id), rules: skipRoutineCopy(s.rules, item) }
        }),

      toggleDone: (id) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id)
          if (!item || !('done' in item)) return {}
          const done = !item.done
          let items = s.items.map((i) => (i.id === id ? ({ ...i, done } as Item) : i))
          // Tentative session ↔ task link: tasks checked off during a session count toward it.
          const a = s.activeSession
          if (a && item.type === 'task') {
            items = items.map((i) => {
              if (i.id !== a.itemId || i.type !== 'session') return i
              const ids = (i.taskIds ?? []).filter((t) => t !== id)
              return { ...i, taskIds: done ? [...ids, id] : ids }
            })
          }
          return { items }
        }),

      setProject: (id, projectId) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id)
          if (item?.type === 'routine' && item.ruleId) {
            // Routines: the project applies to the rule and to this and later copies.
            return {
              rules: s.rules.map((r) => (r.id === item.ruleId ? { ...r, projectId } : r)),
              items: s.items.map((i) =>
                i.id === id || (i.type === 'routine' && i.ruleId === item.ruleId && i.ruleDate! > item.ruleDate!)
                  ? { ...i, projectId }
                  : i,
              ),
            }
          }
          return { items: s.items.map((i) => (i.id === id ? { ...i, projectId } : i)) }
        }),

      moveItem: (id, container, index) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id)
          if (!item) return {}
          let items = s.items
          if (item.container !== container)
            items = withList(items, item.container, listOf(items, item.container).filter((i) => i.id !== id))
          const list = listOf(items, container).filter((i) => i.id !== id)
          const at = Math.max(0, Math.min(index, list.length))
          return { items: withList(items, container, [...list.slice(0, at), { ...item, container }, ...list.slice(at)]) }
        }),

      adaptToContainer: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (!item) return
        const fitted = fitFields(fieldsOf(item), item.container)
        if (fitted && fitted.type !== item.type) get().updateItem(id, fitted)
      },

      clipboard: null,
      copyItem: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (!item) return
        let fields = fieldsOf(item)
        // A copy of a routine copy becomes a plain task (only the rule generates routine copies).
        if (fields.type === 'routine') fields = { type: 'task', text: fields.text, done: false }
        const text = plainText(textOf(fields))
        set({ clipboard: { fields, projectId: item.projectId, text } })
        navigator.clipboard?.writeText(text).catch(() => {})
      },
      cutItem: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (!item) return
        const fields = fieldsOf(item) // cut keeps routine links: the copy is moved, not duplicated
        const text = plainText(textOf(fields))
        set({ clipboard: { fields, projectId: item.projectId, text } })
        navigator.clipboard?.writeText(text).catch(() => {})
        get().removeItem(id)
      },
      paste: (container, afterId) => {
        const clip = get().clipboard
        if (!clip) return false
        const fields = fitFields(clip.fields, container)
        if (!fields) return false
        set((s) => {
          const list = listOf(s.items, container)
          const pos = afterId ? list.findIndex((i) => i.id === afterId) : -1
          const at = pos >= 0 ? pos + 1 : list.length
          const created = { ...fields, id: crypto.randomUUID(), container, order: 0, projectId: clip.projectId } as Item
          return { items: withList(s.items, container, [...list.slice(0, at), created, ...list.slice(at)]) }
        })
        return true
      },

      createProject: (name, color) => {
        const id = crypto.randomUUID()
        set((s) => ({ projects: [...s.projects, { id, name, color, deleted: false }] }))
        return id
      },
      updateProject: (id, patch) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, deleted: true } : p)) })),
      projectPickerFor: null,
      openProjectPicker: (projectPickerFor) => set({ projectPickerFor }),

      makeRoutine: (id, repeat) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id)
          const date = item && containerDate(item.container)
          if (item?.type !== 'routine' || !date) return {}
          let rules = s.rules
          let items = s.items
          if (item.ruleId) {
            // Repeat changed: end the old rule before this date and drop its later copies.
            const end = format(addDays(parseISO(item.ruleDate!), -1), 'yyyy-MM-dd')
            rules = rules.map((r) => (r.id === item.ruleId ? { ...r, end } : r))
            items = items.filter(
              (i) => !(i.type === 'routine' && i.ruleId === item.ruleId && i.ruleDate! > item.ruleDate! && !i.done),
            )
          }
          const rule: RoutineRule = {
            id: crypto.randomUUID(),
            text: item.text,
            repeat,
            projectId: item.projectId,
            start: date,
            end: null,
            skip: [],
          }
          items = items.map((i) => (i.id === id ? { ...item, repeat, ruleId: rule.id, ruleDate: date } : i))
          const { from, to } = viewRange(s.viewMonth)
          return { rules: [...rules, rule], items: generateRoutines(items, [rule], from, to) }
        }),

      stopRoutine: (id) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id)
          if (item?.type !== 'routine' || !item.ruleId) return {}
          return {
            rules: s.rules.map((r) => (r.id === item.ruleId ? { ...r, end: item.ruleDate! } : r)),
            items: s.items.filter((i) => !(i.type === 'routine' && i.ruleId === item.ruleId && i.ruleDate! > item.ruleDate!)),
          }
        }),

      ensureRoutines: () =>
        set((s) => {
          const { from, to } = viewRange(s.viewMonth)
          const items = generateRoutines(s.items, s.rules, from, to)
          return items === s.items ? {} : { items }
        }),

      activeSession: null,
      startSession: (minutes) => {
        if (get().activeSession) return
        const startedAt = new Date().toISOString()
        const itemId = get().addItem(dayKey(new Date()), null, {
          type: 'session',
          status: 'active',
          startedAt,
          endedAt: null,
          taskIds: [],
        })
        set({ activeSession: { itemId, plannedMin: minutes, startedAt, pausedAt: null, pausedMs: 0, timeUpAt: null } })
      },
      pauseSession: () =>
        set((s) => (s.activeSession && !s.activeSession.pausedAt && !s.activeSession.timeUpAt
          ? { activeSession: { ...s.activeSession, pausedAt: new Date().toISOString() } }
          : {})),
      resumeSession: () =>
        set((s) => {
          const a = s.activeSession
          if (!a?.pausedAt) return {}
          return { activeSession: { ...a, pausedAt: null, pausedMs: a.pausedMs + Date.now() - Date.parse(a.pausedAt) } }
        }),
      markTimeUp: () =>
        set((s) => {
          const a = s.activeSession
          if (!a || a.timeUpAt || a.pausedAt) return {}
          // The exact moment it hit zero (the check may run a little late in a background tab).
          const at = Date.parse(a.startedAt) + a.pausedMs + a.plannedMin * 60_000
          return { activeSession: { ...a, timeUpAt: new Date(Math.min(at, Date.now())).toISOString() } }
        }),
      extendSession: (minutes) =>
        set((s) => {
          const a = s.activeSession
          if (!a) return {}
          const waited = a.timeUpAt ? Date.now() - Date.parse(a.timeUpAt) : 0
          return { activeSession: { ...a, plannedMin: a.plannedMin + minutes, pausedMs: a.pausedMs + waited, timeUpAt: null } }
        }),
      finishSession: () => {
        const a = get().activeSession
        if (!a) return
        const { focusedMs } = sessionClock(a)
        const endedAt = a.timeUpAt ?? new Date().toISOString()
        set((s) => ({
          activeSession: null,
          items:
            focusedMs < 60_000
              ? s.items.filter((i) => i.id !== a.itemId) // started by accident: discard
              : s.items.map((i) =>
                  i.id === a.itemId && i.type === 'session'
                    ? { ...i, status: 'finished', endedAt, focusedMin: Math.round(focusedMs / 60_000) }
                    : i,
                ),
        }))
      },
    }),
    {
      name: 'stint-prototype',
      // Bump when the data shape changes: old saved data is discarded and re-seeded.
      version: 3,
      migrate: () => ({ items: buildSeed(), projects: SEED_PROJECTS, rules: seedRules() }) as Partial<State>,
      partialize: (s) => ({
        items: s.items,
        projects: s.projects,
        rules: s.rules,
        clipboard: s.clipboard,
        activeSession: s.activeSession, // a refresh keeps the session running
      }),
      onRehydrateStorage: () => (state) => state?.ensureRoutines(),
    },
  ),
)

/** Items grouped by container, each list sorted by order. */
export function groupByContainer(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>()
  for (const item of items) {
    const list = map.get(item.container)
    if (list) list.push(item)
    else map.set(item.container, [item])
  }
  for (const list of map.values()) list.sort(byOrder)
  return map
}

/** Whether an item can live in this container (sessions can't go into weekly/monthly cells). */
export const canHold = (item: Item, container: string) => fitFields(fieldsOf(item), container) !== null

/** Whether the clipboard item can be pasted into this container. */
export const canPasteInto = (clip: Clipboard | null, container: string) =>
  !!clip && fitFields(clip.fields, container) !== null

/** Is this routine copy still repeating (so "Stop repeating" applies)? */
export const isRepeating = (rules: RoutineRule[], item: Item) =>
  item.type === 'routine' && !!item.ruleId && rules.some((r) => r.id === item.ruleId && (r.end === null || r.end > item.ruleDate!))
