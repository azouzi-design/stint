// Fixed project palette. Every color shares the same OKLCH lightness and
// chroma, so they all carry the same visual weight; only the hue changes.
const L = 0.7
const C = 0.13

export const PROJECT_COLORS: Record<string, string> = {
  red: `oklch(${L} ${C} 25)`,
  orange: `oklch(${L} ${C} 60)`,
  yellow: `oklch(${L} ${C} 95)`,
  green: `oklch(${L} ${C} 145)`,
  teal: `oklch(${L} ${C} 190)`,
  blue: `oklch(${L} ${C} 250)`,
  violet: `oklch(${L} ${C} 295)`,
  pink: `oklch(${L} ${C} 345)`,
}

export const DELETED_PROJECT_COLOR = 'oklch(0.78 0 0)'
