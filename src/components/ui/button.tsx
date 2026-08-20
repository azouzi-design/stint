import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'h-40 gap-8 rounded-12 px-12 bg-foreground text-interactive text-background',
        secondary: 'h-40 gap-8 rounded-12 px-12 bg-muted text-interactive text-foreground',
        run: 'h-32 gap-4 rounded-12 px-12 bg-success text-pixel-base text-background inset-shadow-button',
        cancel: 'h-32 gap-4 rounded-12 px-12 bg-destructive text-pixel-base text-background inset-shadow-button',
        shade: 'h-32 gap-4 rounded-12 px-12 bg-button-shade text-pixel-base text-background inset-shadow-button',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  )
}

export { buttonVariants }
