// Auto-update of the desktop app (the native shell; the timer page itself updates with the website).
// Checks at launch and every few hours. Downloads in the background, and only installs + restarts
// while no session is running, so an update never interrupts a focus session.
// Releases: GitHub Actions builds them (.github/workflows/desktop-release.yml) with latest.json.
import { useEffect } from 'react'
import { useStore } from '../store'
import { tauri, type TauriUpdate } from './tauri'

const FIRST_CHECK_MS = 10_000 // after launch, or after a session ends (lets "Saved" show first)
const CHECK_EVERY_MS = 3 * 60 * 60 * 1000

let downloaded: TauriUpdate | null = null

const busy = () => !!useStore.getState().activeSession

async function checkAndUpdate() {
  if (!tauri?.updater || !tauri.process || busy()) return
  try {
    if (!downloaded) {
      const update = await tauri.updater.check()
      if (!update) return
      await update.download()
      downloaded = update
    }
    if (busy()) return // a session started meanwhile: install once it ends
    await downloaded.install() // Windows: the installer closes the app and reopens it
    await tauri.process.relaunch()
  } catch (e) {
    console.warn('[update] failed, will retry later', e)
    downloaded = null
  }
}

/** Mount once in the widget. */
export function useAutoUpdate() {
  const running = useStore((s) => !!s.activeSession)
  useEffect(() => {
    if (!tauri?.updater || running) return
    const first = setTimeout(() => void checkAndUpdate(), FIRST_CHECK_MS)
    const every = setInterval(() => void checkAndUpdate(), CHECK_EVERY_MS)
    return () => {
      clearTimeout(first)
      clearInterval(every)
    }
  }, [running])
}
