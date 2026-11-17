-- Stint: initial schema.
-- A user's data: projects, routine rules, calendar items, and their running focus session.
-- Every table is private to its owner (row level security) and streams changes (realtime),
-- so the web app and the desktop widget stay in sync.

-- The previous product's tables (empty, no longer used).
drop table if exists public.blocks cascade;
drop table if exists public.focus_sessions cascade;

-- updated_at is maintained by the database.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Projects ──────────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  deleted boolean not null default false, -- soft delete: items keep showing the project's name
  origin text, -- which app instance wrote the row (lets it ignore its own realtime echo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Routine rules ─────────────────────────────────────────────────────
-- A repeating routine; its copies on each day/week/month are rows in `items`.
create table public.routine_rules (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  repeat text not null check (repeat in ('daily', 'weekly', 'monthly')),
  project_id uuid references public.projects (id) on delete set null,
  start_date date not null, -- also sets the weekday / day of month
  end_date date, -- last scheduled date (inclusive); null = still repeating
  skip date[] not null default '{}', -- dates whose copy was deleted or converted
  origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Items ─────────────────────────────────────────────────────────────
-- Everything shown in the calendar. `container` is where it lives:
--   day:2026-11-12 · week:2026-11-09:goals · month:2026-11:backlog
-- `fields` holds the type's own content, e.g.
--   task / goal: {text, done} · note: {text} · event: {title, start, end, link}
--   session: {status, startedAt, endedAt, focusedMin, taskIds}
--   routine: {text, done, repeat, ruleId, ruleDate}
create table public.items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('task', 'note', 'event', 'session', 'routine', 'goal')),
  container text not null,
  position double precision not null default 0,
  project_id uuid references public.projects (id) on delete set null,
  fields jsonb not null default '{}',
  origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_user_container on public.items (user_id, container);

-- ─── Active session ────────────────────────────────────────────────────
-- One row per user: the running focus session (item_id null = none running).
-- The row is kept (never deleted) so its changes always reach the user's other apps.
create table public.active_sessions (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  planned_min integer, -- null = no timecap
  started_at timestamptz,
  paused_at timestamptz,
  paused_ms bigint not null default 0,
  time_up_at timestamptz,
  origin text,
  updated_at timestamptz not null default now()
);

-- ─── Shared setup ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['projects', 'routine_rules', 'items', 'active_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create index projects_user on public.projects (user_id);
create index routine_rules_user on public.routine_rules (user_id);
create index routine_rules_project on public.routine_rules (project_id);
create index items_project on public.items (project_id);
create index active_sessions_item on public.active_sessions (item_id);
