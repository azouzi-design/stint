import { useState } from 'react'
import { sendCode, verifyCode } from './auth'

/** Two steps: email → 6-digit code. Shared by the web dialog and the desktop widget. */
export function useSignIn(onDone?: () => void) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<string | null>, next: () => void) => {
    setBusy(true)
    setError(null)
    const err = await fn()
    setBusy(false)
    if (err) setError(err)
    else next()
  }

  return {
    step,
    email,
    setEmail,
    code,
    setCode: (v: string) => setCode(v.replace(/\D/g, '').slice(0, 6)),
    busy,
    error,
    canSend: /^\S+@\S+\.\S+$/.test(email.trim()) && !busy,
    canVerify: code.length === 6 && !busy,
    send: () => run(() => sendCode(email.trim()), () => setStep('code')),
    verify: () => run(() => verifyCode(email.trim(), code), () => onDone?.()),
    back: () => {
      setStep('email')
      setCode('')
      setError(null)
    },
  }
}
