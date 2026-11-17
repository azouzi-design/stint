import { useEffect, useState } from 'react'

/** Current time, refreshed every `ms` while `enabled`. */
export function useNow(ms: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms, enabled])
  return now
}
