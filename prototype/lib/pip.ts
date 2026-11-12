// Pop-out timer: Document Picture-in-Picture (Chromium browsers). The window
// stays on top of other apps. It must be opened from a click.
import { create } from 'zustand'

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  window: Window | null
}
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

export const pipSupported = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window

export const usePip = create<{ win: Window | null }>(() => ({ win: null }))

/** Open the pop-out (call from a click handler). Resolves to null when unsupported. */
export async function openPip(): Promise<Window | null> {
  const api = window.documentPictureInPicture
  if (!api) return null
  if (api.window) return api.window
  const win = await api.requestWindow({ width: 240, height: 136 })
  // Copy the page's styles (tokens, fonts, Tailwind) into the new window.
  for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    win.document.head.appendChild(node.cloneNode(true))
  }
  win.document.title = 'Stint'
  win.document.body.className = 'm-0 bg-background font-geist text-foreground'
  win.addEventListener('pagehide', () => usePip.setState({ win: null }))
  usePip.setState({ win })
  return win
}

export function closePip() {
  usePip.getState().win?.close()
  usePip.setState({ win: null })
}
