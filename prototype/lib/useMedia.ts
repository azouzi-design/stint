import { useSyncExternalStore } from 'react'

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

/** Below Tailwind's `md` breakpoint: the weekly (mobile) layout. */
export const useIsMobile = () => useMedia('(max-width: 767px)')
