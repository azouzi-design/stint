import { create } from 'zustand'

/** Whether the start overlay is open (opened by the navbar button or ⌘K / Ctrl+K). */
export const useStartOverlay = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

/** The time's-up overlay shows while the session is at time's up, unless hidden with Esc.
 *  Keyed by the session's timeUpAt, so the next time's up shows it again. */
export const useTimeUpOverlay = create<{ hiddenFor: string | null }>(() => ({ hiddenFor: null }))

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
/** Label of the start shortcut for this platform. */
export const START_SHORTCUT = isMac ? '⌘K' : 'Ctrl K'
