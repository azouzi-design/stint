import { useState } from 'react'
import PencilIcon from 'pixelarticons/svg/pencil.svg?react'
import PlusIcon from 'pixelarticons/svg/plus.svg?react'
import { cn } from '@/lib/utils'
import { DELETED_PROJECT_COLOR, PROJECT_COLORS } from '../lib/projects'
import { useStore } from '../store'
import type { Project } from '../types'

interface Props {
  /** Project currently on the item (may be a deleted one). */
  value: string | null
  initialQuery?: string
  onPick: (projectId: string | null) => void
  /** Escape / dismiss. Receives the typed query so the editor can restore it as text. */
  onCancel: (query: string) => void
}

type Option = { kind: 'project'; project: Project } | { kind: 'create' } | { kind: 'none' }
type Form = { id: string | null; name: string; color: string } // id null = new project

const item = 'flex h-28 cursor-default items-center gap-8 rounded-4 px-8 text-foreground-secondary'
const input =
  'h-28 w-full rounded-4 bg-muted px-8 text-foreground outline-none placeholder:text-muted-foreground'

/** Project list with search, inline create, and inline edit (rename / recolor / delete). */
export function ProjectPicker({ value, initialQuery = '', onPick, onCancel }: Props) {
  const projects = useStore((s) => s.projects)
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(0)
  const [form, setForm] = useState<Form | null>(null)

  const live = projects.filter((p) => !p.deleted)
  const q = query.trim().toLowerCase()
  const options: Option[] = [
    ...live.filter((p) => p.name.toLowerCase().includes(q)).map((project) => ({ kind: 'project' as const, project })),
    { kind: 'create' },
    ...(value ? [{ kind: 'none' as const }] : []),
  ]
  const unusedColor = Object.keys(PROJECT_COLORS).find((c) => !live.some((p) => p.color === c)) ?? 'blue'

  function select(o: Option) {
    if (o.kind === 'project') onPick(o.project.id)
    else if (o.kind === 'none') onPick(null)
    else setForm({ id: null, name: query.trim(), color: unusedColor })
  }

  if (form) {
    return (
      <ProjectForm
        form={form}
        onChange={setForm}
        onBack={() => setForm(null)}
        onSaved={(id) => {
          if (form.id === null) onPick(id)
          else setForm(null)
        }}
      />
    )
  }

  return (
    <div className="w-[15rem]" role="dialog" aria-label="Project">
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const d = e.key === 'ArrowDown' ? 1 : -1
            setActive((i) => (i + d + options.length) % options.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            select(options[Math.min(active, options.length - 1)])
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel(query)
          }
        }}
        placeholder="Project…"
        aria-label="Search projects"
        className={input}
      />
      <ul role="listbox" className="mt-4">
        {options.map((o, i) => (
          <li
            key={o.kind === 'project' ? o.project.id : o.kind}
            role="option"
            aria-selected={i === active}
            onMouseMove={() => setActive(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(o)}
            className={cn(item, 'group', i === active && 'bg-muted text-foreground')}
          >
            {o.kind === 'project' && (
              <>
                <Dot color={PROJECT_COLORS[o.project.color]} />
                <span className="min-w-0 flex-1 truncate">{o.project.name}</span>
                {o.project.id === value && <span className="text-[0.786rem] text-foreground-tertiary">Current</span>}
                <button
                  type="button"
                  aria-label={`Edit ${o.project.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setForm({ id: o.project.id, name: o.project.name, color: o.project.color })
                  }}
                  className="invisible -mr-4 flex size-20 items-center justify-center rounded-4 text-icon group-hover:visible hover:bg-neutral-20 hover:text-foreground [@media(hover:none)]:visible"
                >
                  <PencilIcon className="size-12" />
                </button>
              </>
            )}
            {o.kind === 'create' && (
              <>
                <PlusIcon className="size-12 text-icon" />
                <span className="truncate">{q && !live.some((p) => p.name.toLowerCase() === q) ? `Create “${query.trim()}”` : 'Create project'}</span>
              </>
            )}
            {o.kind === 'none' && (
              <>
                <Dot color={DELETED_PROJECT_COLOR} hollow />
                <span className="text-foreground-tertiary">Remove project</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProjectForm({
  form,
  onChange,
  onBack,
  onSaved,
}: {
  form: Form
  onChange: (f: Form) => void
  onBack: () => void
  onSaved: (id: string) => void
}) {
  const createProject = useStore((s) => s.createProject)
  const updateProject = useStore((s) => s.updateProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const isNew = form.id === null

  function save() {
    const name = form.name.trim()
    if (!name) return
    if (form.id) {
      updateProject(form.id, { name, color: form.color })
      onSaved(form.id)
    } else onSaved(createProject(name, form.color))
  }

  return (
    <form
      className="flex w-[15rem] flex-col gap-8"
      aria-label={isNew ? 'Create project' : 'Edit project'}
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <input
        autoFocus
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onBack()
          }
        }}
        placeholder="Project name"
        aria-label="Project name"
        className={input}
      />
      <div className="flex items-center justify-between px-2" role="radiogroup" aria-label="Color">
        {Object.entries(PROJECT_COLORS).map(([key, color]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={form.color === key}
            aria-label={key}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()} // keep focus in the name field, so Enter still saves
            onClick={() => onChange({ ...form, color: key })}
            className={cn(
              'flex size-20 items-center justify-center rounded-full',
              form.color === key ? 'ring-1 ring-foreground-tertiary' : 'hover:ring-1 hover:ring-border',
            )}
          >
            <span className="size-12 rounded-full" style={{ background: color }} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {!isNew && (
          <button
            type="button"
            onClick={() => {
              deleteProject(form.id!)
              onBack()
            }}
            className="h-24 rounded-4 px-6 text-destructive hover:bg-muted"
          >
            Delete
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onBack} className="h-24 rounded-4 px-6 text-foreground-tertiary hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!form.name.trim()}
          className="h-24 rounded-4 bg-foreground px-8 text-background disabled:opacity-40"
        >
          {isNew ? 'Create' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function Dot({ color, hollow }: { color: string; hollow?: boolean }) {
  return (
    <span
      className={cn('size-8 shrink-0 rounded-full', hollow && 'border border-dashed bg-transparent')}
      style={hollow ? { borderColor: color } : { background: color }}
    />
  )
}
