import { format, getISOWeek } from 'date-fns'
import { DropdownMenu } from 'radix-ui'
import ChevronLeftIcon from 'pixelarticons/svg/chevron-left.svg?react'
import ChevronRightIcon from 'pixelarticons/svg/chevron-right.svg?react'
import MenuIcon from 'pixelarticons/svg/menu.svg?react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'
import { cn } from '@/lib/utils'
import { weekLabel } from '../lib/dates'
import { useIsMobile } from '../lib/useMedia'
import { useStore } from '../store'
import { SessionControls } from './SessionControls'

const ghost = 'flex h-28 items-center gap-6 rounded-6 px-8 text-[0.857rem] font-medium text-foreground-secondary hover:bg-muted'
const iconBtn = 'flex size-28 items-center justify-center rounded-6 text-icon hover:bg-muted hover:text-foreground'

export function Navbar() {
  return useIsMobile() ? <MobileNavbar /> : <DesktopNavbar />
}

/** Mobile: logomark + session on top, week navigation in a second row. */
function MobileNavbar() {
  const week = useStore((s) => s.viewWeek)
  const shiftWeek = useStore((s) => s.shiftWeek)
  const goToToday = useStore((s) => s.goToToday)
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="flex h-48 items-center justify-between gap-8 px-12">
        <div className="flex min-w-0 items-center gap-8">
          <Logomark className="size-24 shrink-0 text-foreground" aria-label="Stint" />
          <SessionControls />
        </div>
        <Menu />
      </div>
      <nav className="flex h-40 items-center gap-4 border-t border-border pr-8 pl-12" aria-label="Week navigation">
        <span className="text-interactive text-foreground tabular-nums">{weekLabel(week)}</span>
        <span className="text-[0.786rem] text-foreground-tertiary tabular-nums">W{getISOWeek(week)}</span>
        <span className="flex-1" />
        <button type="button" className={ghost} onClick={goToToday}>
          Today
        </button>
        <button type="button" className={iconBtn} onClick={() => shiftWeek(-1)} aria-label="Previous week">
          <ChevronLeftIcon className="size-16" />
        </button>
        <button type="button" className={iconBtn} onClick={() => shiftWeek(1)} aria-label="Next week">
          <ChevronRightIcon className="size-16" />
        </button>
      </nav>
    </header>
  )
}

function DesktopNavbar() {
  const month = useStore((s) => s.viewMonth)
  const shiftMonth = useStore((s) => s.shiftMonth)
  const goToToday = useStore((s) => s.goToToday)

  return (
    <header className="sticky top-0 z-20 grid h-48 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-12">
      {/* Left: logomark + start */}
      <div className="flex items-center gap-8">
        <Logomark className="size-24 text-foreground" aria-label="Stint" />
        <SessionControls />
      </div>

      {/* Center: month navigation */}
      <nav className="flex items-center gap-4" aria-label="Month navigation">
        <button type="button" className={iconBtn} onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeftIcon className="size-16" />
        </button>
        <span className="w-[9rem] text-center text-interactive text-foreground tabular-nums">
          {format(month, 'MMMM yyyy')}
        </span>
        <button type="button" className={iconBtn} onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRightIcon className="size-16" />
        </button>
        <button type="button" className={cn(ghost, 'ml-4')} onClick={goToToday}>
          Today
        </button>
      </nav>

      {/* Right: menu */}
      <div className="flex justify-end">
        <Menu />
      </div>
    </header>
  )
}

function Menu() {
  const resetToSample = useStore((s) => s.resetToSample)
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={iconBtn} aria-label="Menu">
        <MenuIcon className="size-16" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-30 min-w-[12rem] rounded-8 border border-border bg-popover p-4 shadow-md"
        >
          <DropdownMenu.Item
            onSelect={resetToSample}
            className="flex h-28 cursor-default items-center rounded-4 px-8 text-[0.857rem] text-foreground-secondary outline-none data-[highlighted]:bg-muted"
          >
            Reset sample data
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
