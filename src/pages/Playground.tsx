import type { ReactNode } from 'react'
import { NavbarButtonGroup } from '@/components/navbar/navbar-button-group'
import { NavigationLink } from '@/components/navbar/navigation-link'
import { Link } from '@/components/ui/link'

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
    </div>
  )
}
