import { create } from 'zustand'

/** True inside the desktop widget (Tauri injects `__TAURI__`). */
export const isDesktopApp = typeof window !== 'undefined' && '__TAURI__' in window

/**
 * Whether the user's desktop widget is running and signed in (realtime presence, see sync.ts).
 * `known`: presence has been received at least once (until then, don't assume either way).
 */
export const usePresence = create<{ desktopOnline: boolean; known: boolean }>(() => ({ desktopOnline: false, known: false }))
