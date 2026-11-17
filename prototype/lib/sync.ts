// Sync of "My calendar" with the database while signed in.
//
// The store stays the app's source of truth and keeps updating instantly. This layer:
//   1. on sign-in, loads the account's data (or uploads this device's calendar if the account is empty);
//   2. watches the store and saves what changed (debounced; the running session right away);
//   3. applies changes made on the user's other devices (realtime), skipping its own echoes.
// Conflicts: last write wins, per row. The sample calendar is never synced.
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useStore } from '../store'
import type { ActiveSession, Item, Project, RoutineRule } from '../types'
import { isDesktopApp, usePresence } from './presence'
import { supabase } from './supabase'

/** This app instance: lets it recognise (and ignore) the realtime echo of its own writes. */
const ORIGIN = crypto.randomUUID()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Row = Record<string, unknown>
type Table = 'projects' | 'routine_rules' | 'items'
const TABLES: Table[] = ['projects', 'routine_rules', 'items'] // save order (foreign keys)
const KEY = { projects: 'projects', routine_rules: 'rules', items: 'items' } as const

// ─── Rows ↔ store ──────────────────────────────────────────────────────
// A project id is only sent if it's a real project of this calendar (pasted sample items can carry others).

const projectRef = (id: string | null, projects: Set<string>) => (id && projects.has(id) ? id : null)

const projectToRow = (p: Project): Row => ({ id: p.id, name: p.name, color: p.color, deleted: p.deleted, origin: ORIGIN })
const projectFromRow = (r: Row): Project => ({
  id: r.id as string,
  name: r.name as string,
  color: r.color as string,
  deleted: r.deleted as boolean,
})

const ruleToRow = (r: RoutineRule, projects: Set<string>): Row => ({
  id: r.id,
  text: r.text,
  repeat: r.repeat,
  project_id: projectRef(r.projectId, projects),
  start_date: r.start,
  end_date: r.end,
  skip: r.skip,
  origin: ORIGIN,
})
const ruleFromRow = (r: Row): RoutineRule => ({
  id: r.id as string,
  text: r.text as string,
  repeat: r.repeat as RoutineRule['repeat'],
  projectId: (r.project_id as string | null) ?? null,
  start: r.start_date as string,
  end: (r.end_date as string | null) ?? null,
  skip: (r.skip as string[] | null) ?? [],
})

function itemToRow(i: Item, projects: Set<string>): Row {
  const { id, container, order, projectId, type, ...fields } = i
  return { id, type, container, position: order, project_id: projectRef(projectId, projects), fields, origin: ORIGIN }
}
const itemFromRow = (r: Row): Item =>
  ({
    ...(r.fields as object),
    id: r.id,
    type: r.type,
    container: r.container,
    order: r.position,
    projectId: r.project_id ?? null,
  }) as Item

const activeToRow = (a: ActiveSession | null): Row => ({
  item_id: a?.itemId ?? null,
  planned_min: a?.plannedMin ?? null,
  started_at: a?.startedAt ?? null,
  paused_at: a?.pausedAt ?? null,
  paused_ms: a?.pausedMs ?? 0,
  time_up_at: a?.timeUpAt ?? null,
  origin: ORIGIN,
})
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)
const activeFromRow = (r: Row | null): ActiveSession | null =>
  r?.item_id
    ? {
        itemId: r.item_id as string,
        plannedMin: (r.planned_min as number | null) ?? null,
        startedAt: iso(r.started_at)!,
        pausedAt: iso(r.paused_at),
        pausedMs: Number(r.paused_ms ?? 0),
        timeUpAt: iso(r.time_up_at),
      }
    : null

const fromRow = { projects: projectFromRow, routine_rules: ruleFromRow, items: itemFromRow }

// ─── Sync ──────────────────────────────────────────────────────────────

type Snapshot = {
  items: Item[]
  projects: Project[]
  rules: RoutineRule[]
  active: ActiveSession | null
  dataset: 'sample' | 'mine'
}
const snap = (): Snapshot => {
  const s = useStore.getState()
  return { items: s.items, projects: s.projects, rules: s.rules, active: s.activeSession, dataset: s.dataset }
}

/** Every row of a table this user can see (pages past the API's 1000-row limit). */
async function fetchAll(table: Table): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase!.from(table).select('*').order('id').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function loadRemote() {
  const [projects, rules, items, active] = await Promise.all([
    fetchAll('projects'),
    fetchAll('routine_rules'),
    fetchAll('items'),
    supabase!.from('active_sessions').select('*').maybeSingle(),
  ])
  if (active.error) throw active.error
  return {
    projects: projects.map(projectFromRow),
    rules: rules.map(ruleFromRow),
    items: items.map(itemFromRow),
    active: activeFromRow(active.data),
  }
}

/** Starts syncing "My calendar" for this user. Returns a function that stops it. */
export async function startSync(userId: string): Promise<() => void> {
  const sb = supabase!
  let stopped = false
  // Unsaved local changes, per table: id → row to upsert, or null to delete.
  const pending: Record<Table, Map<string, Row | null>> = { projects: new Map(), routine_rules: new Map(), items: new Map() }
  let activePending: Row | undefined // the running session's row, when it changed
  let timer: ReturnType<typeof setTimeout> | undefined
  let flushing = false
  let applyingRemote = false

  const hasPending = () => activePending !== undefined || TABLES.some((t) => pending[t].size > 0)

  /** Write remote data into the store without it being saved back. */
  function apply(patch: Partial<ReturnType<typeof useStore.getState>>) {
    applyingRemote = true
    try {
      useStore.setState(patch)
    } finally {
      applyingRemote = false
    }
  }

  function schedule(ms: number) {
    if (stopped) return
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), ms)
  }

  /** Queue what differs between two snapshots. */
  function queueDiff(prev: Snapshot, next: Snapshot) {
    const projects = new Set(next.projects.map((p) => p.id))
    const diff = <T extends { id: string }>(a: T[], b: T[], table: Table, toRow: (x: T) => Row) => {
      if (a === b) return
      const before = new Map(a.map((x) => [x.id, x]))
      for (const x of b) {
        if (before.get(x.id) !== x && UUID.test(x.id)) pending[table].set(x.id, toRow(x))
        before.delete(x.id)
      }
      for (const id of before.keys()) if (UUID.test(id)) pending[table].set(id, null)
    }
    diff(prev.projects, next.projects, 'projects', projectToRow)
    diff(prev.rules, next.rules, 'routine_rules', (r) => ruleToRow(r, projects))
    diff(prev.items, next.items, 'items', (i) => itemToRow(i, projects))
    if (prev.active !== next.active) {
      activePending = activeToRow(next.active)
      schedule(0) // the other apps' timers should follow right away
    } else if (hasPending()) schedule(400)
  }

  async function flush() {
    if (stopped || !hasPending()) return
    if (flushing) return schedule(200)
    flushing = true
    const batch = Object.fromEntries(TABLES.map((t) => [t, new Map(pending[t])])) as Record<Table, Map<string, Row | null>>
    TABLES.forEach((t) => pending[t].clear())
    const active = activePending
    activePending = undefined
    try {
      for (const t of TABLES) {
        const rows = [...batch[t].values()].filter((r): r is Row => r !== null).map((r) => ({ ...r, user_id: userId }))
        if (rows.length) {
          const { error } = await sb.from(t).upsert(rows)
          if (error) throw error
        }
      }
      if (active) {
        const { error } = await sb.from('active_sessions').upsert({ user_id: userId, ...active })
        if (error) throw error
      }
      for (const t of [...TABLES].reverse()) {
        const ids = [...batch[t]].filter(([, r]) => r === null).map(([id]) => id)
        if (ids.length) {
          const { error } = await sb.from(t).delete().in('id', ids)
          if (error) throw error
        }
      }
    } catch (e) {
      console.warn('[sync] saving failed, retrying in 5 s', e)
      // Put back what didn't save, unless something newer replaced it meanwhile.
      for (const t of TABLES) for (const [id, row] of batch[t]) if (!pending[t].has(id)) pending[t].set(id, row)
      if (active && activePending === undefined) activePending = active
      schedule(5000)
    } finally {
      flushing = false
    }
  }

  /** Replace "My calendar" with the database's version (after being away, or switching back to it). */
  async function refresh() {
    await flush()
    const remote = await loadRemote()
    if (stopped || hasPending() || useStore.getState().dataset !== 'mine') return
    apply({ items: remote.items, projects: remote.projects, rules: remote.rules, activeSession: remote.active })
    useStore.getState().ensureRoutines()
  }

  // 1. First load. Signing in shows "My calendar".
  if (useStore.getState().dataset !== 'mine') useStore.getState().switchDataset('mine')
  const remote = await loadRemote()
  if (stopped) return () => {}
  if (!remote.items.length && !remote.projects.length && !remote.rules.length) {
    // A new account: upload this device's calendar.
    queueDiff({ items: [], projects: [], rules: [], active: null, dataset: 'mine' }, snap())
    void flush()
  } else {
    apply({ items: remote.items, projects: remote.projects, rules: remote.rules, activeSession: remote.active })
  }

  // 2. Save local changes.
  let prev = snap()
  const unsubscribe = useStore.subscribe(() => {
    const next = snap()
    const wasMine = prev.dataset === 'mine'
    const before = prev
    prev = next
    if (applyingRemote || next.dataset !== 'mine') return
    if (!wasMine) return void refresh().catch(() => {}) // back on "My calendar"
    queueDiff(before, next)
  })
  useStore.getState().ensureRoutines() // copies missing from the database get saved by the watcher

  // 3. Apply changes from the user's other apps.
  function onChange(payload: RealtimePostgresChangesPayload<Row>) {
    if (stopped || useStore.getState().dataset !== 'mine') return
    const table = payload.table as Table | 'active_sessions'
    if (payload.eventType !== 'DELETE' && payload.new.origin === ORIGIN) return // our own write
    if (table === 'active_sessions') {
      if (payload.eventType === 'DELETE' || activePending !== undefined) return
      apply({ activeSession: activeFromRow(payload.new) })
      return
    }
    const key = KEY[table]
    const list = useStore.getState()[key] as { id: string }[]
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as Row).id as string | undefined
      if (!id || pending[table].has(id) || !list.some((x) => x.id === id)) return
      apply({ [key]: list.filter((x) => x.id !== id) })
      return
    }
    const row = payload.new
    if (pending[table].has(row.id as string)) return // a newer local change is on its way
    const value = fromRow[table](row)
    const at = list.findIndex((x) => x.id === row.id)
    apply({ [key]: at < 0 ? [...list, value] : list.map((x, i) => (i === at ? value : x)) })
  }

  // Presence: each app announces itself, so the web app knows when the desktop widget is running.
  const channel = sb.channel(`sync-${userId}`, { config: { presence: { key: ORIGIN } } })
  channel.on('presence', { event: 'sync' }, () => {
    const apps = Object.values(channel.presenceState<{ app: string }>()).flat()
    usePresence.setState({ desktopOnline: apps.some((p) => p.app === 'desktop'), known: true })
  })
  for (const table of [...TABLES, 'active_sessions']) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `user_id=eq.${userId}` }, onChange)
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `user_id=eq.${userId}` }, onChange)
    // Deletes can't be filtered by user: unknown ids are ignored.
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, onChange)
  }
  let connectedOnce = false
  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return
    void channel.track({ app: isDesktopApp ? 'desktop' : 'web' })
    if (connectedOnce) void refresh().catch(() => {}) // reconnected: catch up on what was missed
    connectedOnce = true
  })

  // Catch up when coming back to the app after a while (sleep, lost connection).
  let hiddenAt = 0
  const onVisibility = () => {
    if (document.hidden) hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 30_000) void refresh().catch(() => {})
  }
  document.addEventListener('visibilitychange', onVisibility)
  const onOnline = () => void refresh().catch(() => {})
  window.addEventListener('online', onOnline)

  return () => {
    stopped = true
    clearTimeout(timer)
    unsubscribe()
    usePresence.setState({ desktopOnline: false, known: false })
    void sb.removeChannel(channel)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
  }
}

/** After signing out: this device keeps no copy of the account's calendar. */
export function clearLocalCalendar() {
  const s = useStore.getState()
  if (s.dataset === 'mine') useStore.setState({ items: [], projects: [], rules: [], activeSession: null, editing: null })
  else useStore.setState({ stash: null })
}
