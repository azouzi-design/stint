// Row text is stored as a plain string where inline links use markdown
// syntax: "Call [Jon](https://…) about the invoice". Easy to store and copy,
// and convertible to/from the TipTap document used while editing.
import type { JSONContent } from '@tiptap/react'

export interface Segment {
  text: string
  href?: string
}

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g

export function segments(md: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of md.matchAll(LINK_RE)) {
    if (m.index > last) out.push({ text: md.slice(last, m.index) })
    out.push({ text: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < md.length) out.push({ text: md.slice(last) })
  return out
}

export const plainText = (md: string) => segments(md).map((s) => s.text).join('')

export function toDoc(md: string): JSONContent {
  const content: JSONContent[] = segments(md)
    .filter((s) => s.text)
    .map((s) =>
      s.href ? { type: 'text', text: s.text, marks: [{ type: 'link', attrs: { href: s.href } }] } : { type: 'text', text: s.text },
    )
  return { type: 'doc', content: [{ type: 'paragraph', content }] }
}

export function fromDoc(doc: JSONContent): string {
  return (doc.content ?? [])
    .map((p) =>
      (p.content ?? [])
        .map((n) => {
          if (n.type !== 'text') return ' '
          const text = n.text ?? ''
          const link = n.marks?.find((m) => m.type === 'link')
          if (!link) return text
          const href = String(link.attrs?.href ?? '').replace(/\)/g, '%29').replace(/\s/g, '%20')
          return `[${text.replace(/[[\]]/g, '')}](${href})`
        })
        .join(''),
    )
    .join(' ')
}

/** "meet.google.com/x" → "https://meet.google.com/x" */
export const normalizeUrl = (s: string) => (/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`)

/** Only allow safe protocols to be rendered as clickable links. */
export function safeHref(href: string): string | null {
  try {
    const url = new URL(normalizeUrl(href))
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
