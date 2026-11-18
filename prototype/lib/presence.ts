import { create } from 'zustand'

/** True inside the desktop widget (Tauri injects `__TAURI__`). */
export const isDesktopApp = typeof window !== 'undefined' && '__TAURI__' in window

/**
 * Whether the user's desktop widget is running and signed in (realtime presence, see sync.ts).
 * `known`: presence has been received at least once (until then, don't assume either way).
 */
export const usePresence = create<{ desktopOnline: boolean; known: boolean }>(() => ({ desktopOnline: false, known: false }))

// Whether the desktop app is installed on this computer, as far as this browser knows: it was
// connected or opened from here (presence can't tell: it's per account, across devices). Only
// then does the web app launch it, since an unknown stint:// link makes some browsers show an error.
const INSTALLED_KEY = 'stint-desktop-installed'

export function markDesktopInstalled() {
  try {
    localStorage.setItem(INSTALLED_KEY, '1')
  } catch {
    /* ignore */
  }
}

/**
 * Web, starting a session: if the desktop app is installed here but not running, open it
 * (stint://open). It's signed in already and picks up the session. Call from the click (browsers
 * need one). The browser may ask "Open Stint?" once; "Always allow" makes it silent.
 */
export function openDesktopIfClosed() {
  const { desktopOnline, known } = usePresence.getState()
  if (isDesktopApp || !known || desktopOnline) return
  try {
    if (localStorage.getItem(INSTALLED_KEY) !== '1') return
  } catch {
    return
  }
  location.href = 'stint://open'
}
