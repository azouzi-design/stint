// Pop-out timer: Document Picture-in-Picture (Chromium browsers). The window stays on top
// of other apps. It must be opened from a click. The browser's own frame (title bar with the
// site name) can't be removed: browsers keep it so a site can't pass itself off as another app.
import { create } from 'zustand'

interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number
    height?: number
    disallowReturnToOpener?: boolean
    preferInitialWindowPlacement?: boolean
  }): Promise<Window>
  window: Window | null
}
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

export const pipSupported = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window

export const usePip = create<{ win: Window | null }>(() => ({ win: null }))

// As small as Chrome allows: it won't go narrower than 240 px. With preferInitialWindowPlacement
// Chrome counts the height differently: the content area is HEIGHT − 56 px (measured), so
// 84 leaves a 28 px row, just enough for the 24 px buttons.
const WIDTH = 240
const HEIGHT = 84

/** Copy the page's styles (tokens, fonts, Tailwind) into the new window and track it. */
function adopt(win: Window) {
  for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    win.document.head.appendChild(node.cloneNode(true))
  }
  win.document.title = 'Stint'
  win.document.body.className = 'm-0 overflow-hidden bg-background font-geist text-foreground'
  win.addEventListener('pagehide', () => {
    if (usePip.getState().win === win) usePip.setState({ win: null })
  })
  usePip.setState({ win })
  return win
}

/** Open the always-on-top pop-out (call from a click). Resolves to null when unsupported. */
export async function openPip(): Promise<Window | null> {
  const api = window.documentPictureInPicture
  if (!api) return null
  if (api.window) return api.window
  // Our own "back to tab" button replaces the browser's.
  // preferInitialWindowPlacement: always open at this size; Chrome otherwise reuses the last size.
  const win = await api.requestWindow({
    width: WIDTH,
    height: HEIGHT,
    disallowReturnToOpener: true,
    preferInitialWindowPlacement: true,
  })
  return adopt(win)
}

export function closePip() {
  usePip.getState().win?.close()
  usePip.setState({ win: null })
}

/** From a click inside the pop-out: bring the Stint tab back to the front. */
export function backToTab() {
  const win = usePip.getState().win as (Window & { opener: Window | null }) | null
  try {
    win?.opener?.focus()
  } catch {
    /* not allowed: fall through */
  }
  window.focus()
}
