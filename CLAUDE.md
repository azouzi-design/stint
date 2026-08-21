# Stint — Claude Context

A productivity web app for real users.

## Stack
- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand (global state)
- TipTap (block editor for task editing)
- dnd-kit (drag and drop)
- Supabase (database only — no auth)
- Vercel (hosting + deployment)

## Pages
- **Today** — task list + Focus Session widget + today's completed sessions
- **Later** — task holding list for future work
- **History** — week-grid view of past Focus Sessions

## Key rules from the spec
- Blocks have two types: `task` and `title`. Titles are non-checkable.
- Tasks have exactly two states: `default` and `done`. No others.
- When a task enters a Focus Session, `in_session` is set to `true` — it disappears from the Today list and lives only inside the widget.
- When a session ends or the task is dragged back, `in_session` resets to `false`.
- History records only the COUNT of completed tasks per session, not the task text.
- No Supabase auth — the client is initialized with the anon key and used purely for DB reads/writes.
- All database column names use snake_case.

## Icons (Figma → code)
- All icons come from the `pixelarticons` package (`node_modules/pixelarticons/svg/`), imported like:
  `import CheckIcon from 'pixelarticons/svg/check.svg?react'`
- In Figma, each icon is its own component, named exactly after its pixelarticons kebab-case filename (e.g. a component named `human-arms-down` corresponds to `pixelarticons/svg/human-arms-down.svg`).
- When implementing a design from Figma: if a layer/component name matches a file in `node_modules/pixelarticons/svg/`, import that icon from the package — do NOT hand-draw the SVG markup from the Figma node, even if it would visually match.
- Only fall back to generating markup if no matching filename exists in `pixelarticons/svg/`.

## Full spec
See `docs/SPEC.md` for the complete product specification.
See `docs/schema.sql` for the database schema.
