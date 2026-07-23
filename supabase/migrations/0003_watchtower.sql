-- The Watchtower: an around-the-clock agent that lives inside Postgres.
-- Run this in the Supabase SQL editor after 0002_multisport.sql.
--
-- Once a day it scans the database for anything worth flagging — coaching
-- movement across every sport, review items going stale, data drifting out
-- of shape — and writes alerts the app surfaces under the bell icon. It runs
-- via pg_cron inside Supabase, so no external server is needed.

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('movement_digest', 'review_reminder', 'stale_data', 'mass_departure')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists alerts_unread_idx on alerts (read, created_at desc);

alter table alerts enable row level security;
drop policy if exists alerts_all on alerts;
create policy alerts_all on alerts for all using (true) with check (true);

create or replace function run_watchtower()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hired int;
  v_moved int;
  v_departed int;
  v_sports int;
  v_pending_old int;
  v_stale int;
  v_created int := 0;
begin
  -- 1. Movement digest: what changed across the country in the last 24h.
  select
    count(*) filter (where change_type = 'hired'),
    count(*) filter (where change_type = 'moved'),
    count(*) filter (where change_type = 'departed'),
    count(distinct coalesce(sport, 'unknown'))
  into v_hired, v_moved, v_departed, v_sports
  from coach_history
  where changed_at > now() - interval '24 hours';

  if v_hired + v_moved + v_departed > 0 then
    insert into alerts (kind, title, body, payload)
    values (
      'movement_digest',
      'Coaching movement in the last 24 hours',
      v_hired || ' hired, ' || v_moved || ' moved schools, ' || v_departed ||
      ' departed across ' || v_sports || ' sport(s). Open the Coach Tracker for the full feed.',
      jsonb_build_object('hired', v_hired, 'moved', v_moved, 'departed', v_departed)
    );
    v_created := v_created + 1;
  end if;

  -- 2. Review items sitting unresolved for 48h+ (only nag once a day).
  select count(*) into v_pending_old
  from review_items
  where status = 'pending' and created_at < now() - interval '48 hours';

  if v_pending_old > 0 and not exists (
    select 1 from alerts
    where kind = 'review_reminder' and created_at > now() - interval '23 hours'
  ) then
    insert into alerts (kind, title, body, payload)
    values (
      'review_reminder',
      v_pending_old || ' review item(s) waiting more than 2 days',
      'Flagged changes are paused until you approve or reject them — the master list is out of date until then.',
      jsonb_build_object('pending', v_pending_old)
    );
    v_created := v_created + 1;
  end if;

  -- 3. Stale-data drift: active coaches unseen for 60+ days (weekly nudge).
  select count(*) into v_stale
  from coaches
  where status = 'active' and last_seen_at < now() - interval '60 days';

  if v_stale > 0 and not exists (
    select 1 from alerts
    where kind = 'stale_data' and created_at > now() - interval '7 days'
  ) then
    insert into alerts (kind, title, body, payload)
    values (
      'stale_data',
      v_stale || ' active coach(es) unseen for 60+ days',
      'They are still marked active but have not appeared in any vendor file in two months — they may have quietly left. Review them in Data Health.',
      jsonb_build_object('stale', v_stale)
    );
    v_created := v_created + 1;
  end if;

  return jsonb_build_object('alerts_created', v_created);
end;
$$;

grant execute on function run_watchtower() to anon, authenticated;

-- Schedule the agent to run every day at 13:00 UTC (morning US time).
-- pg_cron ships with Supabase; if the extension is unavailable on this plan,
-- the schema still works — the app can trigger run_watchtower() manually.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('rfx-watchtower');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('rfx-watchtower', '0 13 * * *', 'select run_watchtower()');
exception when others then
  raise notice 'pg_cron not available — run_watchtower() can still be called manually.';
end $$;
