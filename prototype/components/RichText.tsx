import { Fragment } from 'react'
import { safeHref, segments } from '../lib/rich'

/** Static rendering of row text, with inline links clickable in one click. */
export function RichText({ value }: { value: string }) {
  return (
    <>
      {segments(value).map((s, i) => {
        const href = s.href ? safeHref(s.href) : null
        if (!href) return <Fragment key={i}>{s.text}</Fragment>
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={href}
            onClick={(e) => e.stopPropagation()}
            className="underline decoration-neutral-40 underline-offset-2 hover:text-foreground hover:decoration-foreground"
          >
            {s.text}
          </a>
        )
      })}
    </>
  )
}
