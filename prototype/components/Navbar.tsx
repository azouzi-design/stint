import { format } from 'date-fns'
import { DropdownMenu } from 'radix-ui'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import ChevronLeftIcon from 'pixelarticons/svg/chevron-left.svg?react'
import ChevronRightIcon from 'pixelarticons/svg/chevron-right.svg?react'
import BookIcon from 'pixelarticons/svg/book-open.svg?react'
import MenuIcon from 'pixelarticons/svg/menu.svg?react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'
import { cn } from '@/lib/utils'
import { weekLabel, weekName, weekNumberLabel } from '../lib/dates'
import { signOut, useAuth } from '../lib/auth'
import { useNotificationsNeedAttention, useSettingsOpen } from '../lib/settings'
import { useIsMobile } from '../lib/useMedia'
import { useStore, type Dataset } from '../store'
import { SessionControls } from './SessionControls'
import { DesktopNotice } from './DesktopNotice'

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
        <div className="flex shrink-0 items-center gap-2">
          <GuideLink compact />
          <Menu />
        </div>
      </div>
      <nav className="flex h-40 items-center gap-4 border-t border-border pr-8 pl-12" aria-label="Week navigation">
        <span className="text-interactive text-foreground tabular-nums">{weekLabel(week)}</span>
        {weekName(week) !== weekLabel(week) && (
          <span className="text-[0.786rem] text-foreground-tertiary" title={weekNumberLabel(week)}>
            {weekName(week)}
          </span>
        )}
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
        <DesktopNotice />
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

      {/* Right: guide + menu */}
      <div className="flex items-center justify-end gap-4">
        <GuideLink />
        <Menu />
      </div>
    </header>
  )
}

/** The user guide (install steps, basics), in a new tab so the calendar stays put. */
function GuideLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="/guide"
      target="_blank"
      rel="noreferrer"
      className={compact ? iconBtn : cn(ghost, 'text-foreground-tertiary hover:text-foreground')}
      aria-label={compact ? 'Guide' : undefined}
      title="How to install the desktop timer and use Stint"
    >
      <BookIcon className="size-16" />
      {!compact && 'Guide'}
    </a>
  )
}

const dot = 'size-6 rounded-full bg-[oklch(0.75_0.15_70)]'
const menuItem =
  'flex h-28 cursor-default items-center gap-8 rounded-4 px-8 text-[0.857rem] text-foreground-secondary outline-none data-[highlighted]:bg-muted'

function Menu() {
  const dataset = useStore((s) => s.dataset)
  const switchDataset = useStore((s) => s.switchDataset)
  const resetToSample = useStore((s) => s.resetToSample)
  const auth = useAuth()
  // Time's-up notifications are wanted but the browser hasn't allowed them: keep a reminder on the menu.
  const remind = useNotificationsNeedAttention()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={cn(iconBtn, 'relative')} aria-label={remind ? 'Menu (notifications are off)' : 'Menu'}>
        <MenuIcon className="size-16" />
        {remind && <span className={cn(dot, 'absolute top-4 right-4 ring-2 ring-background')} />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-30 min-w-[12rem] rounded-8 border border-border bg-popover p-4 shadow-md"
        >
          <DropdownMenu.Label className="px-8 pt-4 pb-2 text-[0.786rem] text-foreground-tertiary">Calendar</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={dataset} onValueChange={(v) => switchDataset(v as Dataset)}>
            {DATASETS.map(([value, label]) => (
              <DropdownMenu.RadioItem key={value} value={value} className={menuItem}>
                <span className="flex size-16 shrink-0 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <CheckIcon className="size-16 text-foreground" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {label}
                {value === 'mine' && auth.status === 'signedIn' && (
                  <span className="ml-auto text-[0.714rem] text-foreground-tertiary">Synced</span>
                )}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          {dataset === 'sample' && (
            <>
              <DropdownMenu.Separator className="-mx-4 my-4 h-px bg-border" />
              <DropdownMenu.Item onSelect={resetToSample} className={menuItem}>
                Reset sample data
              </DropdownMenu.Item>
            </>
          )}
          <DropdownMenu.Separator className="-mx-4 my-4 h-px bg-border" />
          <DropdownMenu.Item onSelect={() => useSettingsOpen.setState(true)} className={menuItem}>
            <span className="size-16 shrink-0" />
            Settings
            {remind && (
              <span className="ml-auto flex items-center gap-4 text-[0.714rem] text-[oklch(0.5_0.1_65)]">
                <span className={dot} />
                Notifications off
              </span>
            )}
          </DropdownMenu.Item>
          {auth.status === 'signedIn' && (
            <>
              <DropdownMenu.Separator className="-mx-4 my-4 h-px bg-border" />
              <DropdownMenu.Label className="truncate px-8 pt-2 pb-2 text-[0.786rem] text-foreground-tertiary">
                {auth.email}
              </DropdownMenu.Label>
              <DropdownMenu.Item onSelect={() => void signOut()} className={menuItem}>
                Sign out
              </DropdownMenu.Item>
            </>
          )}
          <DropdownMenu.Separator className="-mx-4 my-4 h-px bg-border" />
          <div className="flex gap-12 px-8 pt-2 pb-4">
            {LEGAL.map(([href, label]) => (
              <DropdownMenu.Item key={href} asChild>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-4 text-[0.786rem] text-foreground-tertiary outline-none hover:text-foreground data-[highlighted]:text-foreground data-[highlighted]:underline"
                >
                  {label}
                </a>
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const LEGAL: [string, string][] = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Use'],
]

const DATASETS: [Dataset, string][] = [
  ['sample', 'Sample data'],
  ['mine', 'My calendar'],
]
