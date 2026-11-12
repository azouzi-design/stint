import { format } from 'date-fns'
import { DropdownMenu } from 'radix-ui'
import ChevronLeftIcon from 'pixelarticons/svg/chevron-left.svg?react'
import ChevronRightIcon from 'pixelarticons/svg/chevron-right.svg?react'
import MenuIcon from 'pixelarticons/svg/menu.svg?react'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'
import { cn } from '@/lib/utils'
import { useStore } from '../store'

const ghost = 'flex h-28 items-center gap-6 rounded-6 px-8 text-[0.857rem] font-medium text-foreground-secondary hover:bg-muted'
const iconBtn = 'flex size-28 items-center justify-center rounded-6 text-icon hover:bg-muted hover:text-foreground'

export function Navbar() {
  const month = useStore((s) => s.viewMonth)
  const shiftMonth = useStore((s) => s.shiftMonth)
  const goToToday = useStore((s) => s.goToToday)
  const resetToSample = useStore((s) => s.resetToSample)

  return (
    <header className="sticky top-0 z-20 grid h-48 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-12">
      {/* Left: logomark + start */}
      <div className="flex items-center gap-8">
        <Logomark className="size-24 text-foreground" aria-label="Stint" />
        {/* Focus sessions come in Part 4 */}
        <button type="button" className={ghost} title="Focus sessions arrive in Part 4">
          <PlayIcon className="size-12" />
          Start a Stint
        </button>
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
      </div>
    </header>
  )
}
