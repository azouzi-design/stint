// One-click sign-in of the desktop app, through the web app (no second email code):
//   1. Desktop "Sign in" opens the web app at /?connect=<state> in the browser.
//   2. Web (signed in, or after signing in) asks the `desktop-link` function for a single-use
//      token for the same account, and the user clicks "Open Stint": stint://auth?state&token_hash.
//   3. The OS hands that link to the desktop app, which checks `state` is the one it started
//      with and redeems the token for its own session.
// The link only ever reaches the app installed on that computer, and `state` makes the app
// ignore links it didn't ask for. Function: supabase/functions/desktop-link.
import { supabase } from './supabase'
import { openStint, showWidget, tauri } from '../widget/tauri'
import { create } from 'zustand'

const STATE_KEY = 'stint-desktop-link'
const STATE_TTL_MS = 15 * 60 * 1000

// ---------- web side ----------

/** The desktop app's request, when the web app was opened from it. */
export const connectState = new URLSearchParams(location.search).get('connect')

/** A stint:// link that signs the desktop app in as the current web user. Throws on failure. */
export async function desktopLinkUrl(state: string): Promise<string> {
  if (!supabase) throw new Error('Sync is not available')
  const { data, error } = await supabase.functions.invoke<{ token_hash: string }>('desktop-link', { method: 'POST' })
  if (error || !data?.token_hash) throw new Error('Couldn’t prepare the link. Try again.')
  return `stint://auth?${new URLSearchParams({ state, token_hash: data.token_hash })}`
}

/** Drops ?connect from the address bar (once handled or dismissed). */
export function clearConnectParam() {
  const url = new URL(location.href)
  url.searchParams.delete('connect')
  history.replaceState(null, '', url)
}

// ---------- desktop side ----------

/** Whether this desktop build can receive stint:// links (0.2.1+). Older ones sign in by code. */
export const canLinkFromWeb = !!tauri?.deepLink

/** idle → waiting (browser opened) → signing in (link received); error = what went wrong. */
export const useDesktopLink = create<{ step: 'idle' | 'waiting' | 'signingIn'; error: string | null }>(() => ({
  step: 'idle',
  error: null,
}))

/** Desktop "Sign in": continue in the browser. */
export function startDesktopSignIn() {
  const state = crypto.randomUUID()
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ state, at: Date.now() }))
  } catch {
    /* the link is then refused: user can try again */
  }
  useDesktopLink.setState({ step: 'waiting', error: null })
  openStint(`?connect=${state}`)
}

export function cancelDesktopSignIn() {
  useDesktopLink.setState({ step: 'idle', error: null })
}

function pendingState(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as { state: string; at: number } | null
    return saved && Date.now() - saved.at < STATE_TTL_MS ? saved.state : null
  } catch {
    return null
  }
}

async function handleLink(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return
  }
  if (url.protocol !== 'stint:') return
  // stint://open (web "Open Stint"): launching the app already shows it; if it was running, bring it up.
  if (url.host === 'open') return showWidget()
  if (url.host !== 'auth') return
  const state = url.searchParams.get('state')
  const tokenHash = url.searchParams.get('token_hash')
  if (!supabase || !tokenHash || !state || state !== pendingState()) {
    // Not the sign-in we started (an old or foreign link): say so only if one is pending.
    if (useDesktopLink.getState().step === 'waiting') {
      showWidget()
      useDesktopLink.setState({ step: 'idle', error: 'That link has expired. Sign in again.' })
    }
    return
  }
  showWidget()
  try {
    localStorage.removeItem(STATE_KEY) // single use
  } catch {
    /* ignore */
  }
  useDesktopLink.setState({ step: 'signingIn', error: null })
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
  useDesktopLink.setState({ step: 'idle', error: error ? 'That link has expired. Sign in again.' : null })
}

/** Desktop: call once. Receives stint:// links, also the one that launched the app. */
export function listenForDesktopLinks() {
  const dl = tauri?.deepLink
  if (!dl) return
  const seen = new Set<string>()
  const onUrls = (urls: string[] | null) => {
    for (const u of urls ?? []) {
      if (seen.has(u)) continue
      seen.add(u)
      void handleLink(u)
    }
  }
  dl.getCurrent().then(onUrls).catch(() => {})
  dl.onOpenUrl(onUrls).catch(() => {})
}
