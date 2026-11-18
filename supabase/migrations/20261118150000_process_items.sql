-- Stint: processes, and items inside focus sessions.
--   process: {text, progress (0–100), doneOn} — lives in the day it started (`day:…`) and is
--            shown on every day from then until it reaches 100% (doneOn), or up to today while open.
--   A focus session's own tasks are ordinary task items in the container `session:<session id>`;
--   events and sessions may also carry `notes` in their fields.
alter table public.items drop constraint items_type_check;
alter table public.items add constraint items_type_check
  check (type in ('task', 'note', 'event', 'session', 'routine', 'goal', 'process'));
