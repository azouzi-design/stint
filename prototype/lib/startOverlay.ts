import { create } from 'zustand'

/** Whether the start overlay is open (opened by the navbar button or ⌘K / Ctrl+K). */
export const useStartOverlay = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
/** Label of the start shortcut for this platform. */
export const START_SHORTCUT = isMac ? '⌘K' : 'Ctrl K'
