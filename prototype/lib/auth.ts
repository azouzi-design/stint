// Sign-in by email code (no passwords, no redirects: works the same in the desktop widget).
// Signed out: data stays in this browser only. Signed in: "My calendar" syncs (see sync.ts).
import { create } from 'zustand'
import { supabase } from './supabase'
import { startSettingsSync } from './settings'
import { clearLocalCalendar, startSync } from './sync'

type Status = 'loading' | 'signedOut' | 'signedIn' | 'unavailable'

/** Whether the "Sign in to sync" dialog is open (web). */
export const useSignInOpen = create<boolean>(() => false)

export const useAuth = create<{ status: Status; email: string | null }>(() => ({
  status: supabase ? 'loading' : 'unavailable',
  email: null,
}))

let stopSync: (() => void) | null = null
let syncedUser: string | null = null

/** Call once at startup. */
export function initAuth() {
  if (!supabase) return
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null
    useAuth.setState({ status: user ? 'signedIn' : 'signedOut', email: user?.email ?? null })
    if (user?.id === syncedUser) return
    stopSync?.()
    stopSync = null
    if (syncedUser && !user) clearLocalCalendar() // signed out
    syncedUser = user?.id ?? null
    // Outside the auth callback: Supabase calls made inside it can deadlock.
    if (user)
      setTimeout(() => {
        const both = Promise.all([startSync(user.id), startSettingsSync(user.id)]).then(
          ([a, b]) => () => (a(), b()),
        )
        void both.then((stop) => (syncedUser === user.id ? (stopSync = stop) : stop()))
      })
  })
}

/** Sends a 6-digit code by email. Returns an error message, or null. */
export async function sendCode(email: string): Promise<string | null> {
  if (!supabase) return 'Sync is not available'
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  return error ? friendly(error.message) : null
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  if (!supabase) return 'Sync is not available'
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  return error ? friendly(error.message) : null
}

export async function signOut() {
  await supabase?.auth.signOut()
}

/** Deletes the signed-in account and all its synced data, then signs out here. Returns an error message, or null. */
export async function deleteAccount(): Promise<string | null> {
  if (!supabase) return 'Sync is not available'
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (error) return 'Couldn’t delete your account. Try again.'
  // The account is gone: drop the local session too (the server one no longer exists).
  await supabase.auth.signOut({ scope: 'local' })
  return null
}

function friendly(message: string) {
  if (/rate limit|too many/i.test(message)) return 'Too many emails for now. Try again in a little while.'
  if (/expired|invalid/i.test(message)) return 'That code is wrong or expired.'
  return message
}
