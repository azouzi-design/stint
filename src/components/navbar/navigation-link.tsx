import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface NavigationLinkProps extends ComponentProps<'button'> {
  isActive?: boolean
}

export function NavigationLink({ isActive = false, className, ...props }: NavigationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'text-body whitespace-nowrap rounded-2 outline-none transition-opacity hover:opacity-80 active:opacity-60 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        isActive ? 'text-foreground' : 'text-icon',
        className
      )}
      {...props}
    />
  )
}
