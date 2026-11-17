import { useEffect } from 'react'
import { chime, formatClock, notifyTimeUp, sessionClock, setAttentionFavicon, timeUpAt } from '../lib/session'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'

const BASE_TITLE = document.title

/** Renders nothing: detects time-up, plays the chime, and drives the tab title + favicon. */
export function SessionController() {
  const session = useStore((s) => s.activeSession)
  const now = useNow(1000, !!session)
  const timeUp = !!session?.timeUpAt

  // One timeout for the exact end time. A single timeout (unlike a repeating timer) isn't
  // heavily throttled in background tabs.
  useEffect(() => {
    if (!session || session.pausedAt || session.timeUpAt) return
    const at = timeUpAt(session)
    if (at === null) return // no timecap
    const t = setTimeout(() => useStore.getState().markTimeUp(), Math.max(0, at - Date.now()))
    return () => clearTimeout(t)
  }, [session])

  useEffect(() => {
    if (!timeUp) return
    chime()
    setAttentionFavicon(true)
    const notification = notifyTimeUp(useStore.getState().activeSession?.plannedMin ?? null)
    // Done / extend in the app: the notification is no longer relevant.
    return () => {
      setAttentionFavicon(false)
      notification?.close()
    }
  }, [timeUp])

  useEffect(() => {
    if (!session) {
      document.title = BASE_TITLE
      return
    }
    const { displayMs, phase } = sessionClock(session, now)
    if (phase === 'timeUp') document.title = Math.floor(now / 1000) % 2 ? "Time's up · Stint" : "● Time's up"
    else document.title = `${phase === 'paused' ? 'Paused · ' : ''}${formatClock(displayMs)} · Stint`
  }, [session, now])

  return null
}
