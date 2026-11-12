import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addMonths, startOfMonth } from 'date-fns'
import { buildSeed, SEED_PROJECTS } from './seed'
import type { Editing, Item, ItemFields, Project } from './types'

interface State {
  items: Item[]
  projects: Project[]
  /** First day of the month being viewed. Not persisted: always opens on today. */
  viewMonth: Date
  shiftMonth: (delta: number) => void
  goToToday: () => void
  resetToSample: () => void

  /** Row currently being edited (not persisted). */
  editing: Editing | null
  startEditing: (e: Editing) => void
  stopEditing: () => void
  /** Insert after `afterId` (null = at the end). Returns the new id. */
  addItem: (container: string, afterId: string | null, fields: ItemFields) => string
  updateItem: (id: string, fields: ItemFields) => void
  removeItem: (id: string) => void
  toggleDone: (id: string) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      items: buildSeed(),
      projects: SEED_PROJECTS,
      viewMonth: startOfMonth(new Date()),
      shiftMonth: (delta) => set((s) => ({ viewMonth: addMonths(s.viewMonth, delta) })),
      goToToday: () => set({ viewMonth: startOfMonth(new Date()) }),
      resetToSample: () => set({ items: buildSeed(), projects: SEED_PROJECTS, editing: null }),

      editing: null,
      startEditing: (editing) => set({ editing }),
      stopEditing: () => set({ editing: null }),

      addItem: (container, afterId, fields) => {
        const id = crypto.randomUUID()
        set((s) => {
          const list = s.items.filter((i) => i.container === container).sort((a, b) => a.order - b.order)
          const pos = afterId ? list.findIndex((i) => i.id === afterId) : -1
          const at = pos >= 0 ? pos + 1 : list.length
          const created = { ...fields, id, container, order: 0, projectId: null } as Item
          const reordered = [...list.slice(0, at), created, ...list.slice(at)].map((i, order) => ({ ...i, order }))
          return { items: [...s.items.filter((i) => i.container !== container), ...reordered] }
        })
        return id
      },
      updateItem: (id, fields) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? ({ id, container: i.container, order: i.order, projectId: i.projectId, ...fields } as Item) : i,
          ),
        })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      toggleDone: (id) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id && 'done' in i ? { ...i, done: !i.done } : i)) })),
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
