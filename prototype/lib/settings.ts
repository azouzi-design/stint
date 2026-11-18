// User settings. Saved in this browser; while signed in, also synced to the account
// (table `user_settings`), so every device gets the same ones. Last write wins.
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type TimeFormat = '12h' | '24h'
export type WeekStart = 'monday' | 'sunday'

export interface Settings {
  /** Show the running session's timer in the browser tab title. */
  tabTimer: boolean
  timeFormat: TimeFormat
  weekStart: WeekStart
  /** Desktop notification at time's up (also needs the browser's permission). */
  notify: boolean
}

export const DEFAULT_SETTINGS: Settings = { tabTimer: true, timeFormat: '24h', weekStart: 'monday', notify: true }

export const useSettings = create<Settings>()(persist(() => DEFAULT_SETTINGS, { name: 'stint-settings', version: 1 }))

export const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => useSettings.setState({ [key]: value })

/** Whether the Settings dialog is open. */
export const useSettingsOpen = create<boolean>(() => false)

// ─── Sync ──────────────────────────────────────────────────────────────

const ORIGIN = crypto.randomUUID()
type Row = Record<string, unknown>

const toRow = (s: Settings): Row => ({
  tab_timer: s.tabTimer,
  time_format: s.timeFormat,
  week_start: s.weekStart,
  notify: s.notify,
  origin: ORIGIN,
})
const fromRow = (r: Row): Settings => ({
  tabTimer: r.tab_timer as boolean,
  timeFormat: r.time_format as TimeFormat,
  weekStart: r.week_start as WeekStart,
  notify: r.notify as boolean,
})
const pick = (s: Settings): Settings => ({ tabTimer: s.tabTimer, timeFormat: s.timeFormat, weekStart: s.weekStart, notify: s.notify })
const same = (a: Settings, b: Settings) => (Object.keys(a) as (keyof Settings)[]).every((k) => a[k] === b[k])

/** Starts syncing settings for this user. Returns a function that stops it. */
export async function startSettingsSync(userId: string): Promise<() => void> {
  const sb = supabase!
  let stopped = false
  let applying = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const apply = (s: Settings) => {
    if (same(s, pick(useSettings.getState()))) return
    applying = true
    useSettings.setState(s)
    applying = false
  }
  const save = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      if (stopped) return
      const { error } = await sb.from('user_settings').upsert({ user_id: userId, ...toRow(useSettings.getState()) })
      if (error) {
        console.warn('[settings] saving failed, retrying in 5 s', error)
        timer = setTimeout(save, 5000)
      }
    }, 300)
  }

  // The account's settings win on sign-in; a new account takes this browser's.
  const { data, error } = await sb.from('user_settings').select('*').maybeSingle()
  if (stopped) return () => {}
  if (error) console.warn('[settings] loading failed', error)
  else if (data) apply(fromRow(data))
  else save()

  const unsubscribe = useSettings.subscribe((next, prev) => {
    if (!applying && !same(pick(next), pick(prev))) save()
  })

  const channel = sb
    .channel(`settings-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
      (p: RealtimePostgresChangesPayload<Row>) => {
        if (p.eventType !== 'DELETE' && p.new.origin !== ORIGIN) apply(fromRow(p.new))
      },
    )
    .subscribe()

  return () => {
    stopped = true
    clearTimeout(timer)
    unsubscribe()
    void sb.removeChannel(channel)
  }
}

// ─── Notification permission ───────────────────────────────────────────

export type Permission = NotificationPermission | 'unsupported'

const currentPermission = (): Permission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'

/** The browser's notification permission, kept up to date (changes made in site settings too). */
export function useNotificationPermission() {
  const [permission, setPermission] = useState(currentPermission)
  useEffect(() => {
    const update = () => setPermission(currentPermission())
    let status: PermissionStatus | null = null
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((s) => {
        status = s
        s.addEventListener('change', update)
      })
      .catch(() => {})
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      status?.removeEventListener('change', update)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  const request = async () => {
    if (currentPermission() !== 'default') return
    await Notification.requestPermission().catch(() => {})
    setPermission(currentPermission())
  }
  return { permission, request }
}

/** The "notify at time's up" setting is on but the browser won't show them: worth a reminder. */
export function useNotificationsNeedAttention() {
  const notify = useSettings((s) => s.notify)
  const { permission } = useNotificationPermission()
  return notify && (permission === 'default' || permission === 'denied')
}
