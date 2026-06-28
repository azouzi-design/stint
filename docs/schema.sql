-- Stint — Database Schema
-- Run this in the Supabase SQL editor to set up the database.

-- Blocks (tasks and titles)
create table blocks (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('task', 'title')),
  content       text not null default '',
  list_type     text not null check (list_type in ('today', 'later')),
  "order"       float8 not null default 0,
  state         text check (
                  (type = 'task' and state in ('default', 'done')) or
                  (type = 'title' and state is null)
                ),
  in_session    boolean not null default false
);

-- Focus sessions
create table focus_sessions (
  id                    uuid primary key default gen_random_uuid(),
  date                  date not null,
  planned_duration_min  integer not null,
  started_at            timestamptz not null,
  ended_at              timestamptz,
  status                text not null check (status in ('running', 'paused', 'completed', 'canceled')),
  completed_task_count  integer not null default 0
);

-- Allow full access via anon key (no auth in MVP)
alter table blocks enable row level security;
alter table focus_sessions enable row level security;

create policy "allow all" on blocks for all using (true) with check (true);
create policy "allow all" on focus_sessions for all using (true) with check (true);
