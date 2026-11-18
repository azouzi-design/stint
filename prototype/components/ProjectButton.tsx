// The project dot as a button: click it to assign, change, or remove the item's project, or to
// create / rename / recolor / delete projects (the full ProjectPicker). Used on calendar rows and
// inside the details popups. With no project, it shows an empty dot (on hover, or always with a label).
import { useState } from 'react'
import { Popover } from 'radix-ui'
import { cn } from '@/lib/utils'
import { DELETED_PROJECT_COLOR, PROJECT_COLORS } from '../lib/projects'
import { useStore } from '../store'
import { popoverClass } from './ItemRow'
import { ProjectPicker } from './ProjectPicker'

// The picker is portaled, but React still bubbles its events to the row it sits in:
// keep them from opening the row, starting a drag, or opening the row's right-click menu.
const halt = (e: React.SyntheticEvent) => e.stopPropagation()
const stop = { onClick: halt, onPointerDown: halt, onMouseDown: halt, onTouchStart: halt, onContextMenu: halt }

interface Props {
  itemId: string
  projectId: string | null
  /** Show the project's name next to the dot ("Add project" when there's none). */
  withName?: boolean
  /** Classes for the empty dot (no project), e.g. only visible while the row / line is hovered. */
  emptyClass?: string
}

export function ProjectButton({ itemId, projectId, withName, emptyClass }: Props) {
  const [open, setOpen] = useState(false)
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))
  const color = project ? (project.deleted ? DELETED_PROJECT_COLOR : PROJECT_COLORS[project.color]) : null
  const name = project ? (project.deleted ? `~deleted-${project.name}` : project.name) : null

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={name ?? 'Add project'}
          aria-label={name ? `Project: ${name}. Change project` : 'Add project'}
          // Don't open the row (editing / details) or start a drag from the dot.
          {...stop}
          className={cn(
            'flex shrink-0 items-center rounded-4 outline-none focus-visible:ring-1 focus-visible:ring-foreground',
            withName ? 'h-24 gap-8 pr-8 hover:bg-muted' : 'size-12 justify-center hover:bg-neutral-10',
            !color && !withName && emptyClass,
            'data-[state=open]:opacity-100',
          )}
        >
          <span className="flex size-12 shrink-0 items-center justify-center">
            <span
              className={cn('size-6 rounded-full', !color && 'border border-neutral-40')}
              style={color ? { background: color } : undefined}
            />
          </span>
          {withName && <span className={cn(name ? 'text-foreground-secondary' : 'text-muted-foreground')}>{name ?? 'Add project'}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onEscapeKeyDown={(e) => e.preventDefault()} // the picker handles Escape itself (form → list → close)
          {...stop}
          className={popoverClass}
        >
          <ProjectPicker
            value={projectId}
            onPick={(id) => {
              useStore.getState().setProject(itemId, id)
              setOpen(false)
            }}
            onCancel={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
