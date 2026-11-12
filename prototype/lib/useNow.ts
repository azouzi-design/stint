import { useEffect, useState } from 'react'

/** Current time, refreshed every `ms` while `enabled`. Pass the pop-out's window so its
 *  timer isn't throttled when the main tab is in the background. */
export function useNow(ms: number, enabled = true, win: Window = window) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = win.setInterval(() => setNow(Date.now()), ms)
    return () => win.clearInterval(id)
  }, [ms, enabled, win])
  return now
}
