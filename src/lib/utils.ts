import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Custom text-style utilities from index.css (font-family + size + weight + line-height
// bundled per Figma text style). tailwind-merge doesn't know about them out of the box,
// so it classifies e.g. `text-pixel-base` as a `text-color` utility and silently drops it
// when a real color utility like `text-foreground` appears later in the same class list.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-text-style': [
        'text-timer-sm',
        'text-timer-lg',
        'text-body',
        'text-interactive',
        'text-group-title',
        'text-pixel-stat',
        'text-pixel-heading',
        'text-pixel-base',
        'text-pixel-sm',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
