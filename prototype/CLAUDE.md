# Prototype — Claude Context

Front-end-only sandbox for defining the Stint product before building it for real.

- **Spec:** read `prototype/MVP-SPECS.md` before any work here. It is the source of truth; update it when decisions change.
- **Run:** `npm run proto` → http://localhost:5174 (config: `vite.prototype.config.ts`).
- **No backend:** no Supabase, no env vars, no auth. Data = localStorage + seeded sample data.
- **Shared styling:** import tokens/fonts via `@/index.css` and `cn()` from `@/lib/utils`. Don't edit `src/` from prototype work unless asked.
- **Icons:** use `pixelarticons` (`import X from 'pixelarticons/svg/<name>.svg?react'`). When implementing from Figma, if a layer name matches a pixelarticons filename, import it from the package. Don't redraw it.
- **Code quality bar:** throwaway is OK, but keep it readable. Speed of iteration > architecture.
- Ask before turning open questions in the spec into decisions.
