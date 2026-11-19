import { useState, type SVGProps } from 'react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'
import { cn } from '@/lib/utils'
import { signInWithGoogle } from '../lib/auth'
import { connectState } from '../lib/desktopLink'
import { useSignIn } from '../lib/useSignIn'

export const field =
  'h-32 w-full rounded-8 border border-border bg-background px-12 text-[0.857rem] text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-neutral-40'
export const primary =
  'flex h-32 items-center justify-center rounded-8 bg-foreground px-12 text-[0.857rem] font-medium text-background hover:bg-neutral-80 disabled:bg-neutral-30'

/**
 * Signed out, the web app is only this: Stint requires an account (the calendar syncs, the
 * desktop timer signs in through it). Opened from the desktop app (?connect=…), it says so.
 */
export function SignInScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-16 py-32 font-geist text-foreground">
      <Logomark className="mb-24 size-32 text-foreground" aria-label="Stint" />
      <div className="w-full max-w-[22rem] rounded-12 border border-border bg-background p-20 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.12),0_2px_6px_rgb(0_0_0/0.04)]">
        <SignInForm
          title="Sign in to Stint"
          intro={
            connectState
              ? 'Sign in once here: the desktop timer then connects to the same account.'
              : 'Plan your month, then focus in timed sessions. Your calendar syncs between the web app and the desktop timer.'
          }
        />
      </div>
      <p className="mt-16 max-w-[22rem] text-center text-[0.786rem] text-foreground-tertiary">
        By continuing, you agree to the{' '}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}

/** Continue with Google, or email → 6-digit code. `intro` shows at the email step. */
function SignInForm({ title, intro }: { title: string; intro: string }) {
  const s = useSignIn()
  const [google, setGoogle] = useState<'idle' | 'leaving'>('idle')
  const [googleError, setGoogleError] = useState<string | null>(null)
  const continueWithGoogle = async () => {
    setGoogle('leaving')
    setGoogleError(null)
    const err = await signInWithGoogle() // on success the page navigates away
    if (err) {
      setGoogle('idle')
      setGoogleError(err)
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (s.step === 'email' ? s.canSend : s.canVerify) void (s.step === 'email' ? s.send() : s.verify())
      }}
      className="flex flex-col gap-12"
    >
      <div>
        <h1 className="text-[1rem] font-medium text-foreground">{title}</h1>
        <p className="mt-4 text-[0.857rem] text-foreground-secondary">
          {s.step === 'email'
            ? intro
            : `Enter the 6-digit code sent to ${s.email.trim()}.`}
        </p>
      </div>

      {s.step === 'email' && (
        <>
          <button
            type="button"
            onClick={() => void continueWithGoogle()}
            disabled={google === 'leaving'}
            className="flex h-32 w-full items-center justify-center gap-8 rounded-8 border border-border bg-background text-[0.857rem] font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <GoogleLogo className="size-16" />
            {google === 'leaving' ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {googleError && <p className="-mt-4 text-[0.786rem] text-destructive">{googleError}</p>}
          <div className="flex items-center gap-8 text-[0.786rem] text-foreground-tertiary">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

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

/** Google's "G" (their brand colors, as their sign-in guidelines ask). */
function GoogleLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
