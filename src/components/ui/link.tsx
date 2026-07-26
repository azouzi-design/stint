import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Link({ className, ...props }: ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'text-pixel-base rounded-2 text-foreground underline decoration-dotted decoration-[8%] underline-offset-[18%] outline-none transition-opacity hover:opacity-80 active:opacity-60 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className
      )}
      {...props}
    />
  )
}
