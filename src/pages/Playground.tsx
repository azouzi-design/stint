import type { ReactNode } from 'react'
import PlayIcon from 'pixelarticons/svg/play.svg?react'
import PowerIcon from 'pixelarticons/svg/power.svg?react'
import UserIcon from 'pixelarticons/svg/user.svg?react'
import { NavbarButtonGroup } from '@/components/navbar/navbar-button-group'
import { NavigationLink } from '@/components/navbar/navigation-link'
import { Link } from '@/components/ui/link'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { ShortcutChip } from '@/components/ui/shortcut-chip'
import CustomCrossIcon from '@/assets/icons/custom-cross.svg?react'
import CustomPauseIcon from '@/assets/icons/custom-pause.svg?react'

function PlaygroundSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-8 border-b border-border pb-24">
      <div className="flex flex-col gap-4">
        <h2 className="text-group-title text-foreground">{title}</h2>
        {description && <p className="text-body text-foreground-tertiary">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-16">{children}</div>
    </section>
  )
}

export default function Playground() {
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-32 px-24 py-32">
      <h1 className="text-pixel-heading text-foreground">Playground</h1>

      <PlaygroundSection
        title="Navbar button group"
        description="Segmented date toggle + new task action, from the navbar."
      >
        <NavbarButtonGroup dateLabel="Today" onDateClick={() => {}} onNewTaskClick={() => {}} />
      </PlaygroundSection>

      <PlaygroundSection
        title="Navigation link"
        description="Inactive: text-icon. Active: text-foreground. Hover: opacity 0.8. Press: opacity 0.6."
      >
        <NavigationLink>Today</NavigationLink>
        <NavigationLink>Later</NavigationLink>
        <NavigationLink isActive>History</NavigationLink>
      </PlaygroundSection>

      <PlaygroundSection
        title="Link"
        description="text-pixel-base, text-foreground, dotted underline (8% thickness, auto offset). Hover: opacity 0.8. Press: opacity 0.6."
      >
        <Link href="#">Learn more</Link>
      </PlaygroundSection>

      <PlaygroundSection title="Button" description="primary, secondary, run, cancel, shade (multipurpose, not tied to any single action).">
        <Button variant="primary">Button</Button>
        <Button variant="secondary">Button</Button>
        <Button variant="run">
          <PlayIcon className="size-12" />
          Button
        </Button>
        <Button variant="cancel">
          <PowerIcon className="size-12" />
          Button
        </Button>
        <Button variant="shade">
          <CustomPauseIcon className="size-12" />
          Button
        </Button>
      </PlaygroundSection>

      <PlaygroundSection
        title="Icon button"
        description="outline (40px, bordered, flexible content — icon, text, or illustration) and ghost (32px, borderless)."
      >
        <IconButton variant="outline">
          <UserIcon className="size-16" />
        </IconButton>
        <IconButton variant="outline">
          <span className="text-interactive">Aa</span>
        </IconButton>
        <IconButton variant="ghost">
          <CustomCrossIcon className="size-20" />
        </IconButton>
      </PlaygroundSection>

      <PlaygroundSection title="Shortcut chip" description="Keyboard-shortcut hint for inline editing — confirm (enter) and cancel (esc).">
        <ShortcutChip variant="confirm" keyLabel="enter" />
        <ShortcutChip variant="cancel" keyLabel="esc" />
      </PlaygroundSection>
    </div>
  )
}
