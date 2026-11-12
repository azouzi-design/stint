import { createContext, useMemo } from 'react'
import { groupByContainer, useStore } from '../store'
import type { Item, Section } from '../types'

export const SECTION_LABEL: Record<Section, string> = { goals: 'Goals', notes: 'Notes', backlog: 'Backlog' }
export const SECTIONS: Section[] = ['goals', 'notes', 'backlog']

export type SectionCells = Record<Section, { container: string; items: Item[] }>

/** Inside a swipe preview (the weeks either side of the current one on mobile): rows are static —
 *  no editing, no drag targets (the same lists may be live in the current week). */
export const PreviewContext = createContext(false)

const EMPTY: Item[] = []

/** Items per list (grouped once per items change) and the three section lists for a week / month. */
export function useLists() {
  const items = useStore((s) => s.items)
  const byContainer = useMemo(() => groupByContainer(items), [items])
  const get = (key: string) => byContainer.get(key) ?? EMPTY
  const sections = (keyFor: (s: Section) => string): SectionCells => {
    const cell = (s: Section) => ({ container: keyFor(s), items: get(keyFor(s)) })
    return { goals: cell('goals'), notes: cell('notes'), backlog: cell('backlog') }
  }
  return { get, sections }
}
