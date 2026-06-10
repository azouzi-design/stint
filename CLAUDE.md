# Stint — Claude Context

A local-first productivity web app. No auth, no user accounts in the MVP.
Supabase is used purely as the database — no login flow.

## Stack
- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand (global state)
- TipTap (rich text block editor)
- dnd-kit (drag and drop)
- Supabase (database only — no auth for MVP)

## Pages
- **Today** — task list + Focus Session widget + today's completed sessions
- **Later** — task holding list for future work
- **History** — week-grid view of past Focus Sessions

## Key rules from the spec
- Tasks have exactly two states: `default` and `done`. No others.
- When a task enters a Focus Session, `inSession` is set to `true` — it disappears from the Today list and lives only inside the widget.
- When a session ends or the task is dragged back, `inSession` resets to `false`.
- History records only completed tasks (`completedInSession: true`). Unchecked tasks return to Today silently.
- No Supabase auth — the client is initialized with the anon key and used purely for DB reads/writes.

## Full spec
See `docs/SPEC.md` for the complete product specification.
