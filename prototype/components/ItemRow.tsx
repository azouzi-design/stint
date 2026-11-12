import CheckIcon from 'pixelarticons/svg/check.svg?react'
import ExternalLinkIcon from 'pixelarticons/svg/external-link.svg?react'
import RepeatIcon from 'pixelarticons/svg/repeat.svg?react'
import { cn } from '@/lib/utils'
import { clock, formatDuration, isoMinutes, timeframeMinutes } from '../lib/dates'
import { DELETED_PROJECT_COLOR, PROJECT_COLORS } from '../lib/projects'
import { useStore } from '../store'
import type { Item } from '../types'
import { RichText } from './RichText'

export const ROW_H = 'h-24' // 24px — shared by filled, empty, and editing rows

const rowBase = cn(ROW_H, 'flex items-center gap-6 border-b border-border px-6 text-[0.857rem] leading-none')

export function EmptyRow({ onClick }: { onClick: () => void }) {
  return <div className={cn(rowBase, 'cursor-text hover:bg-neutral-5')} onClick={onClick} />
}

export function ItemRow({ item }: { item: Item }) {
  const startEditing = useStore((s) => s.startEditing)
  const editable = item.type !== 'session'
  return (
    <div
      className={cn(rowBase, 'bg-muted', editable && 'cursor-text')}
      onClick={editable ? () => startEditing({ container: item.container, id: item.id, afterId: null }) : undefined}
    >
      <Content item={item} />
      <ProjectDot projectId={item.projectId} />
    </div>
  )
}

function Content({ item }: { item: Item }) {
  switch (item.type) {
    case 'task':
      return (
        <>
          <Checkbox item={item} />
          <Text done={item.done}>
            <RichText value={item.text} />
          </Text>
        </>
      )
    case 'goal':
      return (
        <>
          <Checkbox item={item} round />
          <Text done={item.done} className="font-medium text-foreground">
            <RichText value={item.text} />
          </Text>
        </>
      )
    case 'routine':
      return (
        <>
          <Checkbox item={item} />
          <Text done={item.done}>
            <RichText value={item.text} />
          </Text>
          <RepeatIcon className="size-12 shrink-0 text-icon" aria-label={`Repeats ${item.repeat}`} />
        </>
      )
    case 'note':
      return (
        <Text className="text-foreground-tertiary">
          <RichText value={item.text} />
        </Text>
      )
    case 'event':
      return (
        <>
          <Time>
            {item.start}–{item.end}
          </Time>
          <Text>
            <RichText value={item.title} />
          </Text>
          <span className="sr-only">{formatDuration(timeframeMinutes(item.start, item.end))}</span>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              title={`Join: ${item.link}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-2 text-icon hover:text-foreground"
            >
              <ExternalLinkIcon className="size-12" />
            </a>
          )}
        </>
      )
    case 'session':
      return <SessionContent item={item} />
  }
}

function SessionContent({ item }: { item: Extract<Item, { type: 'session' }> }) {
  const active = item.status === 'active'
  const end = item.endedAt ?? new Date().toISOString()
  return (
    <>
      <span
        className={cn('size-6 shrink-0 bg-foreground', active && 'animate-pulse bg-success')}
        aria-label={active ? 'Focus session, active' : 'Focus session'}
      />
      <Time className="text-foreground-secondary">
        {clock(item.startedAt)}–{active ? '…' : clock(end)}
        <span className="text-foreground-tertiary"> / {formatDuration(isoMinutes(item.startedAt, end))}</span>
      </Time>
    </>
  )
}

/** Visual checkbox (also used by the row editor as a type preview). */
export function CheckboxMark({ done, round }: { done: boolean; round?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center border',
        round ? 'rounded-full' : 'rounded-2',
        done ? 'border-neutral-40 bg-neutral-40 text-background' : 'border-neutral-40 bg-background',
      )}
    >
      {done && <CheckIcon className="size-8" />}
    </span>
  )
}

function Checkbox({ item, round }: { item: Item & { done: boolean }; round?: boolean }) {
  const toggleDone = useStore((s) => s.toggleDone)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.done}
      aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
      onClick={(e) => {
        e.stopPropagation()
        toggleDone(item.id)
      }}
      className="shrink-0 rounded-2 hover:opacity-70"
    >
      <CheckboxMark done={item.done} round={round} />
    </button>
  )
}

function Text({ done, className, children }: { done?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'min-w-0 flex-1 truncate leading-[1.4] text-foreground-secondary',
        className,
        done && 'text-foreground-tertiary line-through decoration-neutral-40',
      )}
    >
      {children}
    </span>
  )
}

function Time({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('shrink-0 tabular-nums text-foreground-tertiary', className)}>{children}</span>
}

function ProjectDot({ projectId }: { projectId: string | null }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))
  if (!project) return null
  const color = project.deleted ? DELETED_PROJECT_COLOR : PROJECT_COLORS[project.color]
  const name = project.deleted ? `~deleted-${project.name}` : project.name
  return <span title={name} aria-label={`Project: ${name}`} className="size-6 shrink-0 rounded-full" style={{ background: color }} />
}
