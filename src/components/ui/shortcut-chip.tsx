import type { ReactNode } from 'react'
import CheckIcon from 'pixelarticons/svg/check.svg?react'
import CrossIcon from '@/assets/icons/custom-cross.svg?react'
import { cn } from '@/lib/utils'

interface ShortcutChipProps {
  variant: 'confirm' | 'cancel'
  keyLabel: ReactNode
  className?: string
}

const variantConfig = {
  confirm: { bg: 'bg-success', icon: CheckIcon },
  cancel: { bg: 'bg-destructive', icon: CrossIcon },
} as const

export function ShortcutChip({ variant, keyLabel, className }: ShortcutChipProps) {
  const { bg, icon: Icon } = variantConfig[variant]

  return (
    <div
      data-slot="shortcut-chip"
      data-variant={variant}
      className={cn(
        'inline-flex h-24 shrink-0 items-center gap-2 rounded-8 p-4 text-background inset-shadow-button',
        bg,
        className
      )}
    >
      <Icon className="size-16" />
      <span className="text-pixel-sm flex items-center rounded-4 bg-white/20 px-4">{keyLabel}</span>
    </div>
  )
}
