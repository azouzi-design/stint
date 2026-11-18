# Prototype — Claude Context

Sandbox for defining the Stint product before building it for real.

- **Spec:** read `prototype/MVP-SPECS.md` before any work here. It is the source of truth; update it when decisions change.
- **Run:** `npm run proto` → http://localhost:5174 (config: `vite.prototype.config.ts`).
- **Data:** signed out = localStorage + seeded sample data, as before. Signed in (email code) = "My calendar" syncs with the project's Supabase **dev** database (`lib/sync.ts`), shared by the web app and the desktop widget. The sample calendar is never synced. The widget requires sign-in and gets it from the web app in one click (`lib/desktopLink.ts` + `supabase/functions/desktop-link`).
- **Database:** schema = SQL migrations in `/supabase/migrations` (repo root: the real product will reuse them). Change it with a new migration, never by hand in the dashboard. Env: the root `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); without it the prototype runs offline.
- **Desktop widget:** `prototype/widget` (the page, `/?widget`) + `prototype/desktop` (Tauri shell). See `prototype/desktop/README.md`.
- **Shared styling:** import tokens/fonts via `@/index.css` and `cn()` from `@/lib/utils`. Don't edit `src/` from prototype work unless asked.
- **Icons:** use `pixelarticons` (`import X from 'pixelarticons/svg/<name>.svg?react'`). When implementing from Figma, if a layer name matches a pixelarticons filename, import it from the package. Don't redraw it.
- **Code quality bar:** throwaway is OK, but keep it readable. Speed of iteration > architecture.
- Ask before turning open questions in the spec into decisions.
