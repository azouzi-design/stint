// Bridge to the desktop shell (prototype/desktop). Tauri injects `window.__TAURI__` into the
// page when it runs inside the desktop app; in a normal browser every call is a no-op, so the
// widget can also be previewed at http://localhost:5174/?widget.

interface TauriWindow {
  setSize(size: unknown): Promise<void>
  show(): Promise<void>
  hide(): Promise<void>
  setFocus(): Promise<void>
}
interface TauriGlobal {
  window: { getCurrentWindow(): TauriWindow }
  dpi: { LogicalSize: new (width: number, height: number) => unknown }
  opener?: { openUrl(url: string): Promise<void> }
}

const tauri = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__
export const inDesktopApp = !!tauri

const win = () => tauri?.window.getCurrentWindow()

/** Fit the window to the widget's content. */
export function resizeWidget(width: number, height: number) {
  if (tauri) win()?.setSize(new tauri.dpi.LogicalSize(Math.ceil(width), Math.ceil(height))).catch(() => {})
}

export function showWidget() {
  const w = win()
  w?.show().then(() => w.setFocus()).catch(() => {})
}

export function hideWidget() {
  win()?.hide().catch(() => {})
}

/** Open the full Stint app in the user's browser. */
export function openStint() {
  const url = `${location.origin}/`
  if (tauri?.opener) tauri.opener.openUrl(url).catch(() => {})
  else window.open(url, '_blank')
}
