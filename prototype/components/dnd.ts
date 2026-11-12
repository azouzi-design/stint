import type { SortingStrategy } from '@dnd-kit/sortable'

/** Rows don't shift with transforms: the store reorders live, and the faded placeholder shows the spot. */
export const noShift: SortingStrategy = () => null
