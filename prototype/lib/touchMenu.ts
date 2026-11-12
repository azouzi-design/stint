/**
 * Touch: long-press is shared by drag and the row menu (the iOS / Notion pattern).
 * Press and hold → the row lifts (drag). Move → drag. Release without moving → the menu opens.
 * So the context menu's own long-press (radix, and Android's native `contextmenu`) is turned off on
 * item rows, and the drag end opens the menu instead.
 */

let lastPointer = 'mouse'
let opening = false
let lastDragEnd = 0

/** Props for the context-menu trigger of an item row. */
export const touchMenuGuard = {
  onPointerDown: (e: React.PointerEvent) => {
    lastPointer = e.pointerType
    if (e.pointerType !== 'mouse') e.preventDefault() // radix skips its long-press timer
  },
  onContextMenu: (e: React.MouseEvent) => {
    if (lastPointer !== 'mouse' && !opening) e.preventDefault() // Android long-press; radix skips it too
  },
}

/** Open the row's menu at the touch point (after a long-press that didn't move). */
export function openRowMenu(itemId: string, x: number, y: number) {
  const el = document.querySelector(`[data-item-id="${itemId}"]`)
  if (!el) return
  opening = true
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  opening = false
}

/** A tap right after a touch drag (some browsers still fire `click`) shouldn't open the editor. */
export const markDragEnd = () => (lastDragEnd = Date.now())
export const justDragged = () => Date.now() - lastDragEnd < 400
