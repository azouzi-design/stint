import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Popover } from 'radix-ui'
import ClockIcon from 'pixelarticons/svg/clock.svg?react'
import LoaderIcon from 'pixelarticons/svg/loader.svg?react'
import LinkIcon from 'pixelarticons/svg/link.svg?react'
import RepeatIcon from 'pixelarticons/svg/repeat.svg?react'
import { cn } from '@/lib/utils'
import { hasDetails } from '../lib/details'
import { containerDate } from '../lib/routines'
import { editText, materialize, parseTimeRange, type EditMode } from '../lib/parse'
import { fromDoc, normalizeUrl, toDoc } from '../lib/rich'
import { formatDuration, formatTime, timeframeMinutes } from '../lib/dates'
import { useSettings } from '../lib/settings'
import { useStore } from '../store'
import type { Item, Repeat } from '../types'
import { CheckboxMark, popoverClass, ProjectDot, ROW_H } from './ItemRow'
import { EventTimeFields } from './EventTime'
import { ProjectPicker } from './ProjectPicker'

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
  { label: 'Process', mode: 'process' },
]

const PLACEHOLDER: Record<EditMode, string> = {
  auto: 'Type, or / for more formats',
  task: 'Task',
  note: 'Note',
  event: '5pm 1h Meeting with Dave',
  routine: 'Routine',
  process: 'Process 10%',
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
  const [projectId, setProjectId] = useState<string | null>(item?.projectId ?? null)
  const [projectOpen, setProjectOpen] = useState(false) // `#` project picker
  const [eventLink, setEventLink] = useState('') // link field of the event popup
  const startRef = useRef<HTMLSelectElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const finished = useRef(false)
  const keyHandler = useRef<(e: KeyboardEvent) => boolean>(() => false)
  const pasteHandler = useRef<(e: ClipboardEvent) => boolean>(() => false)

  const menuOpen = inDay && !menuDismissed && text.startsWith('/')
  const query = text.slice(1).trim().toLowerCase()
  const options = menuOpen ? PICKER.filter((o) => o.label.toLowerCase().includes(query)) : []
  const typedTime = parseTimeRange(text)
  const preview: EditMode = mode === 'auto' && typedTime ? 'event' : mode
  // Creating an event in a day: from `/event`, or as soon as a typed time is recognised.
  const eventPopup = inDay && !item && preview === 'event' && !menuOpen

  const editor = useEditor({
    extensions,
    content: toDoc(item ? editText(item) : ''),
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { 'aria-label': 'Edit row' },
      handleKeyDown: (_view, e) => keyHandler.current(e),
      handlePaste: (_view, e) => pasteHandler.current(e),
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

  // A blur caused by this editor unmounting isn't the user leaving the row. (On touch devices TipTap
  // focuses synchronously, so StrictMode's dev-only unmount/remount would otherwise close the row.)
  const mounted = useRef(false)
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

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
          .find((i) => i.type !== 'session' && i.type !== 'routine' && i.type !== 'process' && !hasDetails(i)) // rows edited in a popup (or grouped) are skipped
        if (prev) return s.startEditing({ container, id: prev.id, afterId: null })
      }
      return s.stopEditing()
    }

    let fields = materialize(mode, md, repeat, item, containerDate(container))
    // The event popup's link field (a link typed at the end of the row wins).
    if (fields.type === 'event' && !fields.link && eventLink.trim()) fields = { ...fields, link: normalizeUrl(eventLink.trim()) }
    let id: string
    if (item) {
      id = item.id
      s.updateItem(id, fields)
      if (projectId !== item.projectId) s.setProject(id, projectId)
    } else id = s.addItem(container, afterId, fields, projectId)

    // New routine, or its repeat changed: (re)start the repeating rule from this day.
    const sameRule = item?.type === 'routine' && item.ruleId && item.repeat === repeat
    if (fields.type === 'routine' && inDay && !sameRule) s.makeRoutine(id, repeat)

    if (next === 'below') s.startEditing({ container, id: null, afterId: id })
    else s.stopEditing()
  }

  function closeProjectPicker(restoreText?: string) {
    setProjectOpen(false)
    if (restoreText !== undefined) editor?.commands.insertContent(`#${restoreText}`)
    editor?.view.focus()
  }

  function choose(o: PickerOption) {
    editor?.commands.clearContent(true)
    setMode(o.mode)
    if (o.repeat) setRepeat(o.repeat)
  }

  /** Event popup: put the picked time at the start of the row (replacing a typed one), keep the rest. */
  function setEventTime(start: string, end: string) {
    if (!editor) return
    const md = fromDoc(editor.getJSON()).trimStart()
    const typed = parseTimeRange(md)
    const body = typed ? md.slice(typed.prefix.length).trimStart() : md
    // Written the way rows show it: start + length ("17:00 30m …", "5pm 1.5h …").
    const next = `${formatTime(start, useSettings.getState().timeFormat)} ${formatDuration(timeframeMinutes(start, end))} ${body}`
    const hadFocus = editor.isFocused
    editor.commands.setContent(toDoc(next))
    setText(editor.getText())
    if (hadFocus) editor.commands.focus('end')
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
      // Tab: from the row into the event popup's fields.
      if (e.key === 'Tab' && !e.shiftKey && eventPopup) {
        startRef.current?.focus()
        return true
      }
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        openLink()
        return true
      }
      // `#` at the start or after a space opens the project picker.
      if (e.key === '#' && !mod && editor) {
        const { $from, empty } = editor.state.selection
        const before = $from.parent.textContent.slice(0, $from.parentOffset)
        if (empty && (before === '' || /\s$/.test(before))) {
          setProjectOpen(true)
          return true
        }
      }
      // ⌘C / ⌘X with nothing selected: copy / cut the whole row.
      if (mod && item && editor?.state.selection.empty && (e.key === 'c' || e.key === 'x')) {
        const s = useStore.getState()
        if (e.key === 'c') s.copyItem(item.id)
        else {
          finished.current = true
          s.cutItem(item.id)
          s.stopEditing()
        }
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

  // ⌘V of a copied row into an empty row pastes the row itself (not just its text).
  useLayoutEffect(() => {
    pasteHandler.current = (e) => {
      const s = useStore.getState()
      const clip = s.clipboard
      if (!clip || !editor?.isEmpty || e.clipboardData?.getData('text/plain') !== clip.text) return false
      if (!s.paste(container, item?.id ?? afterId)) return false
      finished.current = true
      if (item) s.removeItem(item.id) // the row was emptied: the pasted row replaces it
      s.stopEditing()
      return true
    }
  })

  function onBlur(e: React.FocusEvent) {
    if (!mounted.current) return
    const to = e.relatedTarget as HTMLElement | null
    // The popover is checked by attribute, not ref: an input that autofocuses while the
    // popover mounts receives focus before the popover's ref is attached.
    if (to && (rowRef.current?.contains(to) || to.closest?.('[data-row-editor-popover]'))) return
    if (!document.hasFocus()) return // switching apps/tabs keeps the row open
    finish('stop')
  }

  const showLinkUi = linkDraft !== null || hasSelection
  const popoverOpen = projectOpen || (menuOpen && options.length > 0) || showLinkUi || eventPopup

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
          <ProjectDot projectId={projectId} />
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
          data-row-editor-popover=""
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // While this popover is open, Radix takes Escape (in the row too), so it's handled here.
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            if (projectOpen || linkDraft !== null) return // they handle Escape themselves
            if (menuOpen) return setMenuDismissed(true)
            finish('stop')
          }}
          onBlur={onBlur} // leaving the popup's fields for elsewhere also saves and closes the row
          className={popoverClass}
        >
          {projectOpen ? (
            <ProjectPicker
              value={projectId}
              onPick={(id) => {
                setProjectId(id)
                closeProjectPicker()
              }}
              onCancel={(q) => closeProjectPicker(q)}
            />
          ) : menuOpen && options.length > 0 ? (
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
          ) : !showLinkUi && eventPopup ? (
            <EventPopup
              ref={startRef}
              start={typedTime?.start ?? null}
              end={typedTime?.end ?? null}
              onTime={setEventTime}
              link={eventLink}
              onLink={setEventLink}
              onSave={() => finish('below')}
              onClose={() => finish('stop')}
            />
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

/** Fields shown under a row while an event is being created: time (start list + length chips), link. */
const EventPopup = forwardRef<
  HTMLSelectElement,
  {
    start: string | null
    end: string | null
    onTime: (start: string, end: string) => void
    link: string
    onLink: (link: string) => void
    onSave: () => void
    onClose: () => void
  }
>(function EventPopup({ start, end, onTime, link, onLink, onSave, onClose }, ref) {
  return (
    <div
      className="flex w-[18rem] flex-col gap-8 p-4"
      // Clicks on the popup's background mustn't take the focus away from the row.
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('input, select, textarea')) e.preventDefault()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault()
          onSave()
        }
      }}
    >
      <EventTimeFields ref={ref} start={start} end={end} onChange={onTime} />
      <div className="flex h-24 items-center gap-8">
        <LinkIcon className="size-12 shrink-0 text-icon" aria-hidden />
        <input
          value={link}
          onChange={(e) => onLink(e.target.value)}
          placeholder="Meeting link (optional)"
          aria-label="Meeting link"
          className="h-24 min-w-0 flex-1 rounded-4 bg-muted px-6 text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-[0.786rem] text-foreground-tertiary">
        {start ? 'Enter to save' : 'Type the title in the row, then pick a time'} · <kbd className="font-geist">Tab</kbd> to edit here
      </p>
    </div>
  )
})

/** Leading marker that previews what the row will become. */
function ModeMark({ mode, done }: { mode: EditMode; done: boolean }) {
  if (mode === 'note') return null
  if (mode === 'event') return <ClockIcon className="size-12 shrink-0 text-icon" aria-label="Event" />
  if (mode === 'process') return <LoaderIcon className="size-12 shrink-0 text-icon" aria-label="Process" />
  return <CheckboxMark done={done} round={mode === 'goal'} />
}
