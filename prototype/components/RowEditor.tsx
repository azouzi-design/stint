import { useLayoutEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Popover } from 'radix-ui'
import ClockIcon from 'pixelarticons/svg/clock.svg?react'
import LinkIcon from 'pixelarticons/svg/link.svg?react'
import RepeatIcon from 'pixelarticons/svg/repeat.svg?react'
import { cn } from '@/lib/utils'
import { editText, materialize, parseTimeRange, type EditMode } from '../lib/parse'
import { fromDoc, normalizeUrl, toDoc } from '../lib/rich'
import { useStore } from '../store'
import type { Item, Repeat } from '../types'
import { CheckboxMark, ROW_H } from './ItemRow'

// Single line, plain text + links only.
const extensions = [
  StarterKit.configure({
    blockquote: false,
    bold: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    dropcursor: false,
    gapcursor: false,
    hardBreak: false,
    heading: false,
    horizontalRule: false,
    italic: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    strike: false,
    trailingNode: false,
    underline: false,
    link: false,
  }),
  // Non-inclusive: text typed right after a link is not absorbed into it.
  Link.extend({ inclusive: () => false }).configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: 'https',
  }),
]

interface PickerOption {
  label: string
  mode: EditMode
  repeat?: Repeat
}

const PICKER: PickerOption[] = [
  { label: 'Task', mode: 'task' },
  { label: 'Note', mode: 'note' },
  { label: 'Event', mode: 'event' },
  { label: 'Routine · daily', mode: 'routine', repeat: 'daily' },
  { label: 'Routine · weekly', mode: 'routine', repeat: 'weekly' },
  { label: 'Routine · monthly', mode: 'routine', repeat: 'monthly' },
]

const PLACEHOLDER: Record<EditMode, string> = {
  auto: 'Type, or / for more formats',
  task: 'Task',
  note: 'Note',
  event: '10:00-10:30 Title  link (optional)',
  routine: 'Routine',
  goal: 'Add a goal',
}

interface Props {
  container: string
  /** Existing item being edited; undefined = new row. */
  item?: Item
  /** For new rows: insert after this item (null = at the end). */
  afterId: string | null
  /** Day cells allow the `/` picker and the time-range event shortcut. */
  inDay: boolean
  /** Fixed type for weekly/monthly sections. */
  sectionMode?: EditMode
}

export function RowEditor({ container, item, afterId, inDay, sectionMode }: Props) {
  const [mode, setMode] = useState<EditMode>(() => {
    if (item && item.type !== 'session') return item.type === 'task' && inDay ? 'auto' : item.type
    return sectionMode ?? 'auto'
  })
  const [repeat, setRepeat] = useState<Repeat>(item?.type === 'routine' ? item.repeat : 'daily')
  const [text, setText] = useState(() => (item ? editText(item) : ''))
  const [menuIndex, setMenuIndex] = useState(0)
  const [menuDismissed, setMenuDismissed] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [linkDraft, setLinkDraft] = useState<string | null>(null) // non-null = link input open
  const rowRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const finished = useRef(false)
  const keyHandler = useRef<(e: KeyboardEvent) => boolean>(() => false)

  const menuOpen = inDay && !menuDismissed && text.startsWith('/')
  const query = text.slice(1).trim().toLowerCase()
  const options = menuOpen ? PICKER.filter((o) => o.label.toLowerCase().includes(query)) : []

  const editor = useEditor({
    extensions,
    content: toDoc(item ? editText(item) : ''),
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { 'aria-label': 'Edit row' },
      handleKeyDown: (_view, e) => keyHandler.current(e),
      transformPastedText: (t) => t.replace(/\s*\n\s*/g, ' '),
    },
    onUpdate: ({ editor }) => {
      const t = editor.getText()
      setText(t)
      setMenuIndex(0)
      if (!t.startsWith('/')) setMenuDismissed(false)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      setHasSelection(from !== to)
    },
  })

  // Focus synchronously once the editor's DOM is attached, so keystrokes typed
  // right after Enter land in the new row instead of being lost.
  useLayoutEffect(() => {
    editor?.commands.focus('end')
  }, [editor])

  /** Save the row, then optionally move editing elsewhere. */
  function finish(next: 'stop' | 'below' | 'previous') {
    if (finished.current || !editor) return
    finished.current = true
    const s = useStore.getState()
    const md = fromDoc(editor.getJSON()).trim()

    if (!md || md === '/') {
      if (item) s.removeItem(item.id)
      if (next === 'previous') {
        const list = s.items.filter((i) => i.container === container).sort((a, b) => a.order - b.order)
        const anchorId = item?.id ?? afterId
        const idx = anchorId ? list.findIndex((i) => i.id === anchorId) : list.length
        const prev = list
          .slice(0, item ? idx : idx + 1)
          .reverse()
          .find((i) => i.type !== 'session')
        if (prev) return s.startEditing({ container, id: prev.id, afterId: null })
      }
      return s.stopEditing()
    }

    const fields = materialize(mode, md, repeat, item)
    let id = item?.id
    if (item) s.updateItem(item.id, fields)
    else id = s.addItem(container, afterId, fields)
    if (next === 'below' && id) s.startEditing({ container, id: null, afterId: id })
    else s.stopEditing()
  }

  function choose(o: PickerOption) {
    editor?.commands.clearContent(true)
    setMode(o.mode)
    if (o.repeat) setRepeat(o.repeat)
  }

  function openLink() {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to && !editor.isActive('link')) return
    setLinkDraft(editor.getAttributes('link').href ?? '')
  }

  function applyLink(href: string | null) {
    if (!editor) return
    const chain = editor.chain().extendMarkRange('link')
    if (href?.trim()) chain.setLink({ href: normalizeUrl(href.trim()) })
    else chain.unsetLink()
    // Collapse the cursor after the link so the next keystroke doesn't replace it,
    // and focus synchronously (TipTap's focus() waits a frame).
    chain.command(({ tr, commands }) => commands.setTextSelection(tr.selection.to)).run()
    editor.view.focus()
    setLinkDraft(null)
  }

  // Keyboard handling runs before TipTap's own shortcuts (Enter would otherwise split the line).
  // Layout effect: the handler must be current before the next keystroke arrives.
  useLayoutEffect(() => {
    keyHandler.current = (e) => {
      if (menuOpen && options.length) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const d = e.key === 'ArrowDown' ? 1 : -1
          setMenuIndex((i) => (i + d + options.length) % options.length)
          return true
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          choose(options[Math.min(menuIndex, options.length - 1)])
          return true
        }
      }
      if (menuOpen && e.key === 'Escape') {
        setMenuDismissed(true)
        return true
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        openLink()
        return true
      }
      if (e.key === 'Enter') {
        finish('below')
        return true
      }
      if (e.key === 'Escape') {
        finish('stop')
        return true
      }
      if (e.key === 'Backspace' && editor?.isEmpty) {
        finish('previous')
        return true
      }
      return false
    }
  })

  function onBlur(e: React.FocusEvent) {
    const to = e.relatedTarget as Node | null
    if (to && (rowRef.current?.contains(to) || popRef.current?.contains(to))) return
    if (!document.hasFocus()) return // switching apps/tabs keeps the row open
    finish('stop')
  }

  const showLinkUi = linkDraft !== null || hasSelection
  const popoverOpen = (menuOpen && options.length > 0) || showLinkUi
  const preview: EditMode = mode === 'auto' && parseTimeRange(text) ? 'event' : mode

  return (
    <Popover.Root open={popoverOpen}>
      <Popover.Anchor asChild>
        <div
          ref={rowRef}
          onBlur={onBlur}
          className={cn(
            ROW_H,
            'relative flex items-center gap-6 border-b border-border bg-background px-6 text-[0.857rem] leading-none',
            'shadow-[inset_0_0_0_1px_rgb(var(--primitive-neutral-40))]',
          )}
        >
          <ModeMark mode={preview} done={item && 'done' in item ? item.done : false} />
          <div className="row-editor relative min-w-0 flex-1 text-foreground">
            <EditorContent editor={editor} />
            {!text && (
              <span className="pointer-events-none absolute inset-0 flex items-center truncate text-muted-foreground">
                {PLACEHOLDER[mode]}
              </span>
            )}
          </div>
          {mode === 'routine' && (
            <span className="flex shrink-0 items-center gap-2 text-[0.786rem] text-foreground-tertiary">
              <RepeatIcon className="size-12 text-icon" />
              {repeat}
            </span>
          )}
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          ref={popRef}
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-40 rounded-8 border border-border bg-popover p-4 text-[0.857rem] shadow-md"
        >
          {menuOpen && options.length > 0 ? (
            <ul role="listbox" aria-label="Row format" className="min-w-[11rem]">
              {options.map((o, i) => (
                <li
                  key={o.label}
                  role="option"
                  aria-selected={i === menuIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setMenuIndex(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    'flex h-28 cursor-default items-center gap-8 rounded-4 px-8 text-foreground-secondary',
                    i === menuIndex && 'bg-muted text-foreground',
                  )}
                >
                  {o.label}
                </li>
              ))}
            </ul>
          ) : linkDraft !== null ? (
            <form
              className="flex items-center gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                applyLink(linkDraft)
              }}
            >
              <input
                autoFocus
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setLinkDraft(null)
                    editor?.view.focus()
                  }
                }}
                placeholder="Paste a link"
                aria-label="Link URL"
                className="h-28 w-[16rem] rounded-4 bg-muted px-8 text-foreground outline-none placeholder:text-muted-foreground"
              />
              {editor?.isActive('link') && (
                <button
                  type="button"
                  onClick={() => applyLink(null)}
                  className="h-28 rounded-4 px-8 text-foreground-tertiary hover:bg-muted hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </form>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={openLink}
              className="flex h-24 items-center gap-6 rounded-4 px-6 text-foreground-secondary hover:bg-muted hover:text-foreground"
            >
              <LinkIcon className="size-12" />
              Link
              <kbd className="font-geist text-[0.786rem] text-foreground-tertiary">⌘K</kbd>
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Leading marker that previews what the row will become. */
function ModeMark({ mode, done }: { mode: EditMode; done: boolean }) {
  if (mode === 'note') return null
  if (mode === 'event') return <ClockIcon className="size-12 shrink-0 text-icon" aria-label="Event" />
  return <CheckboxMark done={done} round={mode === 'goal'} />
}
