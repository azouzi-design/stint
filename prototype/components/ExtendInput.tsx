import { useState } from 'react'
import { cn } from '@/lib/utils'
import { parseDuration } from '../lib/session'
import { useStore } from '../store'

/** Time's up: type any duration ("20", "20m", "1.5h") and press Enter to keep going. */
export function ExtendInput({ compact = false }: { compact?: boolean }) {
  const [text, setText] = useState('')
  const minutes = parseDuration(text)

  return (
    <form
      className={cn(
        'flex items-center rounded-6 bg-muted focus-within:ring-1 focus-within:ring-neutral-40',
        compact ? 'h-24 pr-4 pl-6' : 'h-28 pr-2 pl-8',
      )}
      onSubmit={(e) => {
        e.preventDefault()
        if (minutes) useStore.getState().extendSession(minutes)
      }}
    >
      <span className="text-[0.857rem] font-medium text-foreground-tertiary">+</span>
      <input
        data-extend-input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 6))}
        onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        placeholder={compact ? '20m' : 'e.g. 20m'}
        aria-label="Extend by (minutes, or hours with h)"
        title="Extend by: type minutes (20) or hours (1.5h), then Enter"
        autoComplete="off"
        className={cn(compact ? 'w-[2.75rem]' : 'w-[4.5rem]', 'min-w-0 bg-transparent px-4 text-[0.857rem] text-foreground tabular-nums outline-none placeholder:text-muted-foreground')}
      />
      {/* Compact (desktop widget): Enter submits, no button. */}
      <button
        type="submit"
        hidden={compact}
        disabled={!minutes}
        className="flex h-24 items-center rounded-4 px-6 text-[0.857rem] font-medium text-foreground-secondary enabled:hover:bg-background enabled:hover:text-foreground disabled:text-neutral-30"
      >
        Extend
      </button>
    </form>
  )
}
