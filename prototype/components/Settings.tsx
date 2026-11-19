import { useState } from 'react'
import { Dialog, Switch, ToggleGroup } from 'radix-ui'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import CloseIcon from 'pixelarticons/svg/close.svg?react'
import WarningIcon from 'pixelarticons/svg/warning-diamond.svg?react'
import { cn } from '@/lib/utils'
import { deleteAccount, useAuth } from '../lib/auth'
import { isPhoneOrTablet } from '../lib/device'
import { DOWNLOAD } from '../lib/download'
import { isDesktopApp, usePresence } from '../lib/presence'
import { isMac } from '../lib/startOverlay'
import {
  setSetting,
  useNotificationPermission,
  useSettings,
  useSettingsOpen,
  type TimeFormat,
  type WeekStart,
} from '../lib/settings'
import { useIsMobile } from '../lib/useMedia'
import { primary } from './SignIn'

const AMBER_CHIP = 'bg-[oklch(0.97_0.04_75)] text-[oklch(0.45_0.09_65)]'
const GREEN_CHIP = 'bg-[oklch(0.96_0.04_170)] text-[oklch(0.42_0.08_170)]'
const secondary =
  'flex h-28 shrink-0 items-center rounded-6 border border-border px-12 text-[0.786rem] font-medium whitespace-nowrap text-foreground-secondary hover:bg-muted'

/** Web: the Settings dialog (navbar menu → Settings). */
export function SettingsDialog() {
  const open = useSettingsOpen()
  const onOpenChange = (o: boolean) => useSettingsOpen.setState(o)
  const auth = useAuth()
  if (isDesktopApp) return null
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--primitive-neutral-10)/0.82)] backdrop-blur-[6px] start-overlay" />
        <Dialog.Content className="start-bar fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 flex-col rounded-12 border border-border bg-background shadow-[0_24px_64px_-16px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.05)] outline-none">
          <header className="flex items-start justify-between gap-12 px-20 pt-20 pb-12">
            <div>
              <Dialog.Title className="text-[1rem] font-medium text-foreground">Settings</Dialog.Title>
              <Dialog.Description className="mt-2 text-[0.786rem] text-foreground-tertiary">
                {auth.status === 'signedIn' ? `Synced to ${auth.email}` : 'Saved in this browser. Sign in to sync them.'}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mt-2 -mr-6 flex size-28 shrink-0 items-center justify-center rounded-6 text-icon hover:bg-muted hover:text-foreground"
            >
              <CloseIcon className="size-16" />
            </Dialog.Close>
          </header>

          <div className="overflow-y-auto px-20 pb-20">
            {open && <SettingsBody />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SettingsBody() {
  const signedIn = useAuth((s) => s.status === 'signedIn')
  return (
    <div className="flex flex-col gap-20">
      <Group title="General">
        <TabTimerRow />
        <TimeFormatRow />
        <WeekStartRow />
      </Group>
      <Group title="Notifications">
        <NotificationsRow />
      </Group>
      <Group title="Desktop timer">
        <DesktopRow />
      </Group>
      {signedIn && <DangerZone />}
      <div className="flex gap-16 text-[0.786rem] text-foreground-tertiary">
        <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-foreground">
          Privacy Policy
        </a>
        <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-foreground">
          Terms of Use
        </a>
      </div>
    </div>
  )
}

// ─── Layout ────────────────────────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="pb-4 text-group-title text-foreground-tertiary">{title}</h3>
      <div className="divide-y divide-border border-y border-border">{children}</div>
    </section>
  )
}

function Row({
  label,
  hint,
  control,
  children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  control?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="py-12">
      <div className="flex min-h-28 items-center justify-between gap-12">
        <div className="min-w-0">
          <div className="text-[0.857rem] text-foreground">{label}</div>
          {hint && <div className="mt-2 text-[0.786rem] text-foreground-tertiary">{hint}</div>}
        </div>
        {control}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative h-20 w-32 shrink-0 rounded-full bg-neutral-30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-40 data-[state=checked]:bg-foreground"
    >
      <Switch.Thumb className="block size-16 translate-x-2 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-[14px]" />
    </Switch.Root>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className="flex shrink-0 rounded-8 bg-muted p-2"
    >
      {options.map(([v, text]) => (
        <ToggleGroup.Item
          key={v}
          value={v}
          className="h-24 rounded-6 px-12 text-[0.786rem] font-medium text-foreground-tertiary outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-neutral-40 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {text}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

function Chip({ tone, children }: { tone: 'amber' | 'green'; children: React.ReactNode }) {
  const Icon = tone === 'green' ? CheckIcon : WarningIcon
  return (
    <span
      className={cn(
        'inline-flex h-20 items-center gap-4 rounded-full pr-8 pl-6 text-[0.714rem] font-medium whitespace-nowrap',
        tone === 'green' ? GREEN_CHIP : AMBER_CHIP,
      )}
    >
      <Icon className="size-12 shrink-0" />
      {children}
    </span>
  )
}

// ─── General ───────────────────────────────────────────────────────────

function TabTimerRow() {
  const on = useSettings((s) => s.tabTimer)
  return (
    <Row
      label="Timer in browser tab"
      hint={on ? 'The tab title shows the time left, e.g. “24:13 · Stint”.' : 'The tab title stays “Stint” while a session runs.'}
      control={<Toggle checked={on} onChange={(v) => setSetting('tabTimer', v)} label="Timer in browser tab" />}
    />
  )
}

function TimeFormatRow() {
  const f = useSettings((s) => s.timeFormat)
  return (
    <Row
      label="Time format"
      hint={f === '12h' ? 'Events and sessions show as 2:30pm.' : 'Events and sessions show as 14:30.'}
      control={
        <Segmented<TimeFormat>
          label="Time format"
          value={f}
          onChange={(v) => setSetting('timeFormat', v)}
          options={[
            ['12h', '12h'],
            ['24h', '24h'],
          ]}
        />
      }
    />
  )
}

function WeekStartRow() {
  const w = useSettings((s) => s.weekStart)
  return (
    <Row
      label="Week starts on"
      control={
        <Segmented<WeekStart>
          label="Week starts on"
          value={w}
          onChange={(v) => setSetting('weekStart', v)}
          options={[
            ['monday', 'Monday'],
            ['sunday', 'Sunday'],
          ]}
        />
      }
    />
  )
}

// ─── Notifications ─────────────────────────────────────────────────────

function NotificationsRow() {
  const notify = useSettings((s) => s.notify)
  const { permission, request } = useNotificationPermission()
  const toggle = (v: boolean) => {
    setSetting('notify', v)
    if (v) void request() // asks the browser if it hasn't been asked yet
  }

  let status: React.ReactNode = null
  if (permission === 'unsupported') {
    status = <p className="text-[0.786rem] text-foreground-tertiary">This browser can’t show notifications.</p>
  } else if (notify && permission === 'default') {
    status = (
      <Notice
        title="Not allowed yet"
        action={
          <button type="button" onClick={() => void request()} className={secondary}>
            Allow
          </button>
        }
      >
        Your browser will ask once. Without it, only the sound and the tab alert you.
      </Notice>
    )
  } else if (notify && permission === 'denied') {
    status = (
      <Notice title="Blocked by your browser">
        You turned them off for Stint earlier. To allow them: click the icon left of the address bar →{' '}
        <Strong>Notifications</Strong> → <Strong>Allow</Strong>
        {isMac ? '. Also check System Settings → Notifications for your browser.' : '.'}
      </Notice>
    )
  }

  return (
    <Row
      label="Notify me when time’s up"
      hint="A desktop notification when a focus session ends, so you don’t miss it."
      control={
        <Toggle
          checked={notify && permission !== 'unsupported'}
          onChange={toggle}
          label="Notify me when time’s up"
        />
      }
    >
      {status && <div className="mt-8">{status}</div>}
    </Row>
  )
}

function Notice({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-8 rounded-8 bg-[oklch(0.985_0.02_75)] p-12">
      <WarningIcon className="mt-2 size-12 shrink-0 text-[oklch(0.55_0.11_65)]" />
      <div className="min-w-0 flex-1 text-[0.786rem]">
        <p className="font-medium text-[oklch(0.42_0.09_65)]">{title}</p>
        <p className="mt-2 text-foreground-secondary">{children}</p>
      </div>
      {action}
    </div>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

// ─── Desktop timer ─────────────────────────────────────────────────────

function DesktopRow() {
  const status = useAuth((s) => s.status)
  const { desktopOnline, known } = usePresence()
  const mobile = useIsMobile()

  if (mobile || isPhoneOrTablet || !DOWNLOAD) {
    return <Row label="Stint for desktop" hint="The floating timer is available for Mac and Windows." />
  }
  if (status === 'signedIn' && desktopOnline) {
    return (
      <Row
        label="Stint for desktop"
        hint="Running and signed in with this account. Sessions show in the floating timer."
        control={<Chip tone="green">Connected</Chip>}
      />
    )
  }
  if (!known) return <Row label="Stint for desktop" hint="Checking…" />
  return (
    <Row
      label={
        <span className="flex items-center gap-8">
          Stint for desktop <Chip tone="amber">Not installed</Chip>
        </span>
      }
      hint="A small timer that floats above your other apps. Already installed? Open it and click Sign in."
      control={
        <a href={DOWNLOAD.url} className={cn(primary, 'h-28 rounded-6 px-12 text-[0.786rem] whitespace-nowrap')}>
          {DOWNLOAD.label.replace('Download', 'Install')}
        </a>
      }
    />
  )
}

// ─── Danger zone ───────────────────────────────────────────────────────

function DangerZone() {
  const email = useAuth((s) => s.email)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = typed.trim().toUpperCase() === 'DELETE' && !busy

  async function onDelete() {
    setBusy(true)
    setError(null)
    const err = await deleteAccount()
    setBusy(false)
    if (err) return setError(err)
    useSettingsOpen.setState(false)
  }

  return (
    <section>
      <h3 className="pb-4 text-group-title text-destructive">Danger zone</h3>
      <div className="rounded-8 border border-[oklch(0.88_0.06_25)] p-12">
        <div className="flex items-center justify-between gap-12">
          <div className="min-w-0">
            <div className="text-[0.857rem] text-foreground">Delete account</div>
            <div className="mt-2 text-[0.786rem] text-foreground-tertiary">
              Permanently deletes {email} and everything synced to it: calendar, projects, routines and settings.
            </div>
          </div>
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex h-28 shrink-0 items-center rounded-6 border border-[oklch(0.88_0.06_25)] px-12 text-[0.786rem] font-medium whitespace-nowrap text-destructive hover:bg-[oklch(0.97_0.02_25)]"
            >
              Delete account
            </button>
          )}
        </div>

        {confirming && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (ready) void onDelete()
            }}
            className="mt-12 flex flex-col gap-8 border-t border-border pt-12"
          >
            <label className="text-[0.786rem] text-foreground-secondary" htmlFor="delete-confirm">
              This can’t be undone. Type <Strong>DELETE</Strong> to confirm.
            </label>
            <input
              id="delete-confirm"
              autoFocus
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
              className="h-32 w-full rounded-8 border border-border bg-background px-12 text-[0.857rem] text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-[oklch(0.7_0.12_25)]"
            />
            {error && <p className="text-[0.786rem] text-destructive">{error}</p>}
            <div className="flex items-center justify-end gap-8">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setTyped('')
                  setError(null)
                }}
                className="h-28 px-8 text-[0.786rem] text-foreground-tertiary hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!ready}
                className="flex h-28 items-center rounded-6 bg-destructive px-12 text-[0.786rem] font-medium whitespace-nowrap text-white hover:opacity-90 disabled:bg-neutral-30"
              >
                {busy ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
