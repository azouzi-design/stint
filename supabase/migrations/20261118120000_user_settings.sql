-- Stint: per-user settings (one row per user), synced between the user's devices.
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  tab_timer boolean not null default true, -- show the running session's timer in the browser tab title
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  week_start text not null default 'monday' check (week_start in ('monday', 'sunday')),
  notify boolean not null default true, -- desktop notification at time's up
  origin text, -- which app instance wrote the row (lets it ignore its own realtime echo)
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "Own rows" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.user_settings;
