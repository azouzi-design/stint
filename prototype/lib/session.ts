import type { ActiveSession } from '../types'

export type Phase = 'running' | 'paused' | 'timeUp'

/** Focused time, remaining time and phase of a session at `now`. */
export function sessionClock(a: ActiveSession, now = Date.now()) {
  const start = Date.parse(a.startedAt)
  const end = a.timeUpAt ? Date.parse(a.timeUpAt) : now
  const pausedNow = a.pausedAt ? end - Date.parse(a.pausedAt) : 0
  const focusedMs = Math.max(0, end - start - a.pausedMs - pausedNow)
  const remainingMs = Math.max(0, a.plannedMin * 60_000 - focusedMs)
  const phase: Phase = a.timeUpAt ? 'timeUp' : a.pausedAt ? 'paused' : 'running'
  return { focusedMs, remainingMs, phase }
}

/** Wall-clock time at which a running session reaches zero. */
export function timeUpAt(a: ActiveSession, now = Date.now()) {
  return now + sessionClock(a, now).remainingMs
}

/** 1_453_000 → "24:13", 3_725_000 → "1:02:05" */
export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

// ─── Sound ─────────────────────────────────────────────────────────────
// A soft two-note chime made with Web Audio (no sound file). The context is
// created on the Start click, so browsers allow it to play later.
let audio: AudioContext | null = null

export function primeAudio() {
  audio ??= new AudioContext()
  if (audio.state === 'suspended') audio.resume().catch(() => {})
}

export function chime() {
  if (!audio) return
  const t = audio.currentTime
  for (const [i, freq] of [659.25, 880].entries()) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = t + i * 0.18
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2)
    osc.connect(gain).connect(audio.destination)
    osc.start(start)
    osc.stop(start + 1.3)
  }
}

// ─── Tab highlight ─────────────────────────────────────────────────────
// Browsers can't highlight a tab directly: we change its title and favicon.
const ATTENTION_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#ff990a"/></svg>',
  )

export function setAttentionFavicon(on: boolean) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return
  link.dataset.original ??= link.href
  link.href = on ? ATTENTION_ICON : link.dataset.original
}
