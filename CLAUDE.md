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

## Full spec
See `docs/SPEC.md` for the complete product specification.
See `docs/schema.sql` for the database schema.
