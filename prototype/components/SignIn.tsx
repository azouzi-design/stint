import { Dialog } from 'radix-ui'
import { cn } from '@/lib/utils'
import { useSignInOpen } from '../lib/auth'
import { useSignIn } from '../lib/useSignIn'

export const field =
  'h-32 w-full rounded-8 border border-border bg-background px-12 text-[0.857rem] text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-neutral-40'
export const primary =
  'flex h-32 items-center justify-center rounded-8 bg-foreground px-12 text-[0.857rem] font-medium text-background hover:bg-neutral-80 disabled:bg-neutral-30'

/** Web: "Sign in to sync" dialog (opened from the menu or the desktop notice). */
export function SignInDialog() {
  const open = useSignInOpen()
  const onOpenChange = (o: boolean) => useSignInOpen.setState(o)
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--primitive-neutral-10)/0.82)] backdrop-blur-[6px] start-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="start-bar fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-12 border border-border bg-background p-20 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.05)] outline-none"
        >
          {open && <SignInForm onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** `intro`: what signing in is for, in place of the default (shown at the email step). */
export function SignInForm({ onDone, title = 'Sync your calendar', intro }: { onDone?: () => void; title?: string; intro?: string }) {
  const s = useSignIn(onDone)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (s.step === 'email' ? s.canSend : s.canVerify) void (s.step === 'email' ? s.send() : s.verify())
      }}
      className="flex flex-col gap-12"
    >
      <div>
        <Dialog.Title className="text-[1rem] font-medium text-foreground">{title}</Dialog.Title>
        <p className="mt-4 text-[0.857rem] text-foreground-secondary">
          {s.step === 'email'
            ? (intro ?? 'Sign in with your email to keep Stint in sync across the web app and the desktop timer.')
            : `Enter the 6-digit code sent to ${s.email.trim()}.`}
        </p>
      </div>

      {s.step === 'email' ? (
        <input
          autoFocus
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={s.email}
          onChange={(e) => s.setEmail(e.target.value)}
          className={field}
        />
      ) : (
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={s.code}
          onChange={(e) => s.setCode(e.target.value)}
          className={cn(field, 'font-dseg7 text-[1.143rem] tracking-[0.2em]')}
        />
      )}

      {s.error && <p className="text-[0.786rem] text-destructive">{s.error}</p>}

      <div className="flex items-center justify-between gap-8">
        {s.step === 'code' ? (
          <button type="button" onClick={s.back} className="text-[0.786rem] text-foreground-tertiary hover:text-foreground">
            Use another email
          </button>
        ) : (
          <span className="text-[0.786rem] text-foreground-tertiary">No password needed</span>
        )}
        <button type="submit" disabled={s.step === 'email' ? !s.canSend : !s.canVerify} className={primary}>
          {s.busy ? '…' : s.step === 'email' ? 'Send code' : 'Sign in'}
        </button>
      </div>
    </form>
  )
}
