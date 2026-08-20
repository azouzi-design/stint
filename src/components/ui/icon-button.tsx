import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center outline-none transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        outline: 'size-40 rounded-12 border border-border bg-background text-foreground shadow-sm',
        ghost: 'size-32 rounded-12 text-icon',
      },
    },
    defaultVariants: {
      variant: 'ghost',
    },
  }
)

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof iconButtonVariants> {}

export function IconButton({ className, variant, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      data-slot="icon-button"
      data-variant={variant}
      className={cn(iconButtonVariants({ variant, className }))}
      {...props}
    />
  )
}

export { iconButtonVariants }
