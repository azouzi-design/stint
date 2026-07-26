import type { ReactNode } from 'react'
import ChevronsVerticalIcon from 'pixelarticons/svg/chevrons-vertical.svg?react'
import PlusIcon from 'pixelarticons/svg/plus.svg?react'
import { cn } from '@/lib/utils'

interface NavbarButtonGroupProps {
  dateLabel: string
  onDateClick?: () => void
  onNewTaskClick?: () => void
}

function GroupSegment({
  icon,
  textClassName,
  onClick,
  children,
}: {
  icon: ReactNode
  textClassName?: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-24 items-center justify-center gap-4 rounded-6 px-6 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {icon}
      <span className={cn('text-pixel-base whitespace-nowrap', textClassName)}>{children}</span>
    </button>
  )
}

export function NavbarButtonGroup({ dateLabel, onDateClick, onNewTaskClick }: NavbarButtonGroupProps) {
  return (
    <div className="flex items-center rounded-6" data-slot="navbar-button-group">
      <GroupSegment
        icon={<ChevronsVerticalIcon className="size-16 text-icon" />}
        textClassName="text-foreground-tertiary"
        onClick={onDateClick}
      >
        {dateLabel}
      </GroupSegment>
      <span className="text-interactive text-muted-foreground select-none" aria-hidden="true">
        /
      </span>
      <GroupSegment
        icon={<PlusIcon className="size-16 text-foreground" />}
        textClassName="text-foreground"
        onClick={onNewTaskClick}
      >
        New task
      </GroupSegment>
    </div>
  )
}
