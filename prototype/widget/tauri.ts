// Bridge to the desktop shell (prototype/desktop). Tauri injects `window.__TAURI__` into the
// page when it runs inside the desktop app; in a normal browser every call is a no-op, so the
// widget can also be previewed at http://localhost:5174/?widget.

interface TauriWindow {
  setSize(size: unknown): Promise<void>
  show(): Promise<void>
  unminimize(): Promise<void>
  setAlwaysOnTop(on: boolean): Promise<void>
  hide(): Promise<void>
  setFocus(): Promise<void>
}
export interface TauriUpdate {
  version: string
  download(): Promise<void>
  install(): Promise<void>
}
interface TauriGlobal {
  window: { getCurrentWindow(): TauriWindow }
  dpi: { LogicalSize: new (width: number, height: number) => unknown }
  opener?: { openUrl(url: string): Promise<void> }
  // Missing in builds older than 0.2.0 (no updater yet).
  updater?: { check(): Promise<TauriUpdate | null> }
  process?: { relaunch(): Promise<void> }
  // 0.2.1+: stint:// links (one-click sign-in from the web app, see lib/desktopLink.ts).
  deepLink?: {
    getCurrent(): Promise<string[] | null>
    onOpenUrl(handler: (urls: string[]) => void): Promise<unknown>
  }
}

export const tauri = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__
export const inDesktopApp = !!tauri

const win = () => tauri?.window.getCurrentWindow()

/** Fit the window to the widget's content. */
export function resizeWidget(width: number, height: number) {
  if (tauri) win()?.setSize(new tauri.dpi.LogicalSize(Math.ceil(width), Math.ceil(height))).catch(() => {})
}

/** `focus: false` shows it without taking the keyboard from the app the user is typing in. */
export function showWidget({ focus = true } = {}) {
  const w = win()
  w?.unminimize().catch(() => {}) // allowed from 0.2.3 on
  w?.show().then(() => (focus ? w.setFocus() : undefined)).catch(() => {})
}

/** Allowed from 0.2.3 on (older builds stay always on top). */
export function setAlwaysOnTop(on: boolean) {
  win()?.setAlwaysOnTop(on).catch(() => {})
}

export function hideWidget() {
  win()?.hide().catch(() => {})
}

/** Open the full Stint app in the user's browser (`query`: e.g. `?connect=…`). */
export function openStint(query = '') {
  const url = `${location.origin}/${query}`
  if (tauri?.opener) tauri.opener.openUrl(url).catch(() => {})
  else window.open(url, '_blank')
}
