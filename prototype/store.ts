import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addMonths, startOfMonth } from 'date-fns'
import { buildSeed, SEED_PROJECTS } from './seed'
import type { Item, Project } from './types'

interface State {
  items: Item[]
  projects: Project[]
  /** First day of the month being viewed. Not persisted: always opens on today. */
  viewMonth: Date
  shiftMonth: (delta: number) => void
  goToToday: () => void
  resetToSample: () => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      items: buildSeed(),
      projects: SEED_PROJECTS,
      viewMonth: startOfMonth(new Date()),
      shiftMonth: (delta) => set((s) => ({ viewMonth: addMonths(s.viewMonth, delta) })),
      goToToday: () => set({ viewMonth: startOfMonth(new Date()) }),
      resetToSample: () => set({ items: buildSeed(), projects: SEED_PROJECTS }),
    }),
    {
      name: 'stint-prototype',
      // Bump when the data shape changes: old saved data is discarded and re-seeded.
      version: 2,
      migrate: () => ({ items: buildSeed(), projects: SEED_PROJECTS }) as Partial<State>,
      partialize: (s) => ({ items: s.items, projects: s.projects }),
    },
  ),
)

/** Items grouped by container, each list sorted by order. */
export function groupByContainer(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>()
  for (const item of items) {
    const list = map.get(item.container)
    if (list) list.push(item)
    else map.set(item.container, [item])
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order)
  return map
}
