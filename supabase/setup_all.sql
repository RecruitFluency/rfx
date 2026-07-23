-- RFX Coach Database — COMPLETE one-file setup.
-- Paste this whole file into the Supabase SQL editor and click Run.
-- Safe to re-run any time: it installs anything missing and repairs the rest.
-- (Equivalent to running migrations 0001–0008 in order.)

-- ===========================================================================
-- From migrations/0001_coach_database.sql
-- ===========================================================================
-- RecruitFluency Coach Database — schema + monthly sync engine
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Master tables
-- ---------------------------------------------------------------------------

create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  master_id text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  school text,
  sport text,
  title text,
  division text,
  conference text,
  state text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coaches_email_idx on coaches (lower(email));
create index if not exists coaches_school_idx on coaches (school);
create index if not exists coaches_status_idx on coaches (status);
create index if not exists coaches_name_idx on coaches (last_name, first_name);

create table if not exists coach_history (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  change_type text not null check (change_type in
    ('hired', 'moved', 'title_change', 'email_change', 'departed', 'reinstated', 'merged')),
  school text,
  title text,
  sport text,
  email text,
  previous_school text,
  previous_title text,
  previous_email text,
  batch_id uuid,
  changed_at timestamptz not null default now()
);

create index if not exists coach_history_coach_idx on coach_history (coach_id, changed_at desc);

create table if not exists coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  body text not null,
  author text not null default 'Jen',
  created_at timestamptz not null default now()
);

create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  subject text not null,
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  notes text,
  sent_at timestamptz not null default now()
);

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  sport text not null,
  division text,
  conference text,
  state text,
  enrollment int,
  tuition numeric,
  acceptance_rate numeric,
  sat_range text,
  avg_gpa numeric,
  academic_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school, sport)
);

-- ---------------------------------------------------------------------------
-- Sync machinery
-- ---------------------------------------------------------------------------

create table if not exists sync_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  is_baseline boolean not null default false,
  row_count int not null default 0,
  status text not null default 'uploading' check (status in
    ('uploading', 'processing', 'needs_review', 'completed', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists staging_rows (
  id bigint generated always as identity primary key,
  batch_id uuid not null references sync_batches(id) on delete cascade,
  master_id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  school text,
  sport text,
  title text,
  division text,
  conference text,
  state text
);

create index if not exists staging_rows_batch_idx on staging_rows (batch_id);

create table if not exists review_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references sync_batches(id) on delete cascade,
  coach_id uuid references coaches(id) on delete set null,
  item_type text not null check (item_type in
    ('identity_conflict', 'mass_departure', 'duplicate_id', 'missing_id')),
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists review_items_status_idx on review_items (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security (internal tool: permissive for now; tighten when auth
-- is added — swap `true` for `auth.role() = 'authenticated'`).
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['coaches','coach_history','coach_notes','email_logs',
                           'programs','sync_batches','staging_rows','review_items']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Sync engine: compares a staged vendor file against the master list,
-- applies safe changes, and queues suspicious ones for review.
-- ---------------------------------------------------------------------------

create or replace function process_sync_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch sync_batches%rowtype;
  v_row record;
  v_coach coaches%rowtype;
  v_added int := 0;
  v_updated int := 0;
  v_moved int := 0;
  v_departed int := 0;
  v_unchanged int := 0;
  v_reinstated int := 0;
  v_queued int := 0;
  v_active_before int;
  v_missing_count int;
  v_mass_departure boolean := false;
  v_changed boolean;
  v_stats jsonb;
begin
  select * into v_batch from sync_batches where id = p_batch_id;
  if not found then
    raise exception 'batch % not found', p_batch_id;
  end if;

  update sync_batches set status = 'processing' where id = p_batch_id;

  -- Rows without a unique ID can't be matched safely: queue for review.
  insert into review_items (batch_id, item_type, summary, payload)
  select p_batch_id, 'missing_id',
         'Row has no unique coach ID: ' || coalesce(s.first_name, '') || ' ' ||
         coalesce(s.last_name, '') || ' (' || coalesce(s.email, 'no email') || ')',
         to_jsonb(s)
  from staging_rows s
  where s.batch_id = p_batch_id and (s.master_id is null or btrim(s.master_id) = '');
  get diagnostics v_missing_count = row_count;
  v_queued := v_queued + v_missing_count;

  -- Duplicate IDs inside the same file: keep the first occurrence, flag the rest.
  insert into review_items (batch_id, item_type, summary, payload)
  select p_batch_id, 'duplicate_id',
         'Unique ID ' || d.master_id || ' appears ' || d.n || ' times in this file',
         jsonb_build_object('master_id', d.master_id, 'occurrences', d.n)
  from (
    select master_id, count(*) as n
    from staging_rows
    where batch_id = p_batch_id and master_id is not null and btrim(master_id) <> ''
    group by master_id
    having count(*) > 1
  ) d;
  get diagnostics v_missing_count = row_count;
  v_queued := v_queued + v_missing_count;

  select count(*) into v_active_before from coaches where status = 'active';

  -- Walk each usable staged row (first occurrence per master_id).
  for v_row in
    select distinct on (btrim(master_id))
           btrim(master_id) as master_id,
           nullif(btrim(coalesce(first_name, '')), '') as first_name,
           nullif(btrim(coalesce(last_name, '')), '') as last_name,
           nullif(lower(btrim(coalesce(email, ''))), '') as email,
           nullif(btrim(coalesce(phone, '')), '') as phone,
           nullif(btrim(coalesce(school, '')), '') as school,
           nullif(btrim(coalesce(sport, '')), '') as sport,
           nullif(btrim(coalesce(title, '')), '') as title,
           nullif(btrim(coalesce(division, '')), '') as division,
           nullif(btrim(coalesce(conference, '')), '') as conference,
           nullif(btrim(coalesce(state, '')), '') as state
    from staging_rows
    where batch_id = p_batch_id and master_id is not null and btrim(master_id) <> ''
    order by btrim(master_id), id
  loop
    select * into v_coach from coaches where master_id = v_row.master_id;

    if not found then
      -- Vendor says this coach is new. If their email already belongs to a
      -- known coach under a different ID, that's suspicious: queue it.
      if v_row.email is not null and exists (
        select 1 from coaches c
        where lower(c.email) = v_row.email and c.master_id <> v_row.master_id
      ) then
        insert into review_items (batch_id, coach_id, item_type, summary, payload)
        select p_batch_id, c.id, 'identity_conflict',
               'File says ' || coalesce(v_row.first_name, '') || ' ' || coalesce(v_row.last_name, '') ||
               ' (ID ' || v_row.master_id || ') is new, but ' || c.first_name || ' ' || c.last_name ||
               ' (ID ' || c.master_id || ') already has email ' || v_row.email,
               jsonb_build_object('incoming', to_jsonb(v_row), 'existing_coach_id', c.id,
                                  'existing_master_id', c.master_id)
        from coaches c
        where lower(c.email) = v_row.email and c.master_id <> v_row.master_id
        limit 1;
        v_queued := v_queued + 1;
      else
        insert into coaches (master_id, first_name, last_name, email, phone, school,
                             sport, title, division, conference, state, status, last_seen_at)
        values (v_row.master_id, coalesce(v_row.first_name, ''), coalesce(v_row.last_name, ''),
                v_row.email, v_row.phone, v_row.school, v_row.sport, v_row.title,
                v_row.division, v_row.conference, v_row.state, 'active', now())
        returning * into v_coach;

        insert into coach_history (coach_id, change_type, school, title, sport, email, batch_id)
        values (v_coach.id, 'hired', v_row.school, v_row.title, v_row.sport, v_row.email, p_batch_id);
        v_added := v_added + 1;
      end if;
    else
      v_changed := false;

      if v_coach.status = 'inactive' then
        insert into coach_history (coach_id, change_type, school, title, sport, email, batch_id)
        values (v_coach.id, 'reinstated', v_row.school, v_row.title, v_row.sport, v_row.email, p_batch_id);
        v_reinstated := v_reinstated + 1;
        v_changed := true;
      end if;

      if v_row.school is distinct from v_coach.school and v_row.school is not null then
        insert into coach_history (coach_id, change_type, school, title, sport, email,
                                   previous_school, previous_title, batch_id)
        values (v_coach.id, 'moved', v_row.school, v_row.title, v_row.sport, v_row.email,
                v_coach.school, v_coach.title, p_batch_id);
        v_moved := v_moved + 1;
        v_changed := true;
      elsif v_row.title is distinct from v_coach.title and v_row.title is not null then
        insert into coach_history (coach_id, change_type, school, title, sport, email,
                                   previous_title, batch_id)
        values (v_coach.id, 'title_change', v_coach.school, v_row.title, v_row.sport,
                v_row.email, v_coach.title, p_batch_id);
        v_changed := true;
      end if;

      if v_row.email is distinct from lower(coalesce(v_coach.email, '')) and v_row.email is not null
         and lower(coalesce(v_coach.email, '')) <> '' then
        insert into coach_history (coach_id, change_type, school, title, email,
                                   previous_email, batch_id)
        values (v_coach.id, 'email_change', coalesce(v_row.school, v_coach.school),
                coalesce(v_row.title, v_coach.title), v_row.email, v_coach.email, p_batch_id);
        v_changed := true;
      end if;

      update coaches set
        first_name = coalesce(v_row.first_name, first_name),
        last_name  = coalesce(v_row.last_name, last_name),
        email      = coalesce(v_row.email, email),
        phone      = coalesce(v_row.phone, phone),
        school     = coalesce(v_row.school, school),
        sport      = coalesce(v_row.sport, sport),
        title      = coalesce(v_row.title, title),
        division   = coalesce(v_row.division, division),
        conference = coalesce(v_row.conference, conference),
        state      = coalesce(v_row.state, state),
        status     = 'active',
        last_seen_at = now(),
        updated_at = now()
      where id = v_coach.id;

      if v_changed then
        v_updated := v_updated + 1;
      else
        v_unchanged := v_unchanged + 1;
      end if;
    end if;
  end loop;

  -- Departures: active coaches missing from this file. Baselines never
  -- depart anyone. A mass disappearance (>15% of the active list, on a list
  -- of 50+) is suspicious — likely a truncated vendor file — so it goes to
  -- the review queue instead of being applied.
  if not v_batch.is_baseline then
    select count(*) into v_missing_count
    from coaches c
    where c.status = 'active'
      and not exists (
        select 1 from staging_rows s
        where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
      );

    if v_active_before >= 50 and v_missing_count > v_active_before * 0.15 then
      v_mass_departure := true;
      insert into review_items (batch_id, coach_id, item_type, summary, payload)
      select p_batch_id, c.id, 'mass_departure',
             c.first_name || ' ' || c.last_name || ' (' || coalesce(c.school, 'unknown school') ||
             ') disappeared from the file — part of a suspicious ' || v_missing_count ||
             '-coach drop (' || round(100.0 * v_missing_count / v_active_before) || '% of the list)',
             jsonb_build_object('master_id', c.master_id, 'school', c.school, 'title', c.title,
                                'missing_total', v_missing_count, 'active_before', v_active_before)
      from coaches c
      where c.status = 'active'
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );
      v_queued := v_queued + v_missing_count;
    else
      insert into coach_history (coach_id, change_type, previous_school, previous_title, batch_id)
      select c.id, 'departed', c.school, c.title, p_batch_id
      from coaches c
      where c.status = 'active'
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );

      update coaches c set status = 'inactive', updated_at = now()
      where c.status = 'active'
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );
      v_departed := v_missing_count;
    end if;
  end if;

  -- Keep the program directory in sync with what the file shows.
  insert into programs (school, sport, division, conference, state)
  select distinct on (btrim(school), btrim(coalesce(sport, 'General')))
         btrim(school), btrim(coalesce(sport, 'General')),
         nullif(btrim(coalesce(division, '')), ''),
         nullif(btrim(coalesce(conference, '')), ''),
         nullif(btrim(coalesce(state, '')), '')
  from staging_rows
  where batch_id = p_batch_id and school is not null and btrim(school) <> ''
  on conflict (school, sport) do update set
    division   = coalesce(excluded.division, programs.division),
    conference = coalesce(excluded.conference, programs.conference),
    state      = coalesce(excluded.state, programs.state),
    updated_at = now();

  v_stats := jsonb_build_object(
    'added', v_added, 'updated', v_updated, 'moved', v_moved,
    'departed', v_departed, 'unchanged', v_unchanged, 'reinstated', v_reinstated,
    'queued_for_review', v_queued, 'mass_departure_flagged', v_mass_departure);

  update sync_batches set
    stats = v_stats,
    status = case when v_queued > 0 then 'needs_review' else 'completed' end,
    processed_at = now()
  where id = p_batch_id;

  -- Staged rows are no longer needed once processed.
  delete from staging_rows where batch_id = p_batch_id;

  return v_stats;
exception when others then
  update sync_batches set status = 'failed', error = sqlerrm where id = p_batch_id;
  raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- Review queue resolution. Approve = apply what the vendor file implied;
-- reject = keep the master list as-is.
-- ---------------------------------------------------------------------------

create or replace function resolve_review_item(p_item_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item review_items%rowtype;
  v_incoming jsonb;
begin
  select * into v_item from review_items where id = p_item_id and status = 'pending';
  if not found then
    raise exception 'pending review item % not found', p_item_id;
  end if;

  if p_approve then
    if v_item.item_type = 'mass_departure' and v_item.coach_id is not null then
      insert into coach_history (coach_id, change_type, previous_school, previous_title, batch_id)
      select id, 'departed', school, title, v_item.batch_id
      from coaches where id = v_item.coach_id and status = 'active';
      update coaches set status = 'inactive', updated_at = now() where id = v_item.coach_id;

    elsif v_item.item_type = 'identity_conflict' and v_item.coach_id is not null then
      -- Same person under a new vendor ID: keep their history, adopt the new
      -- ID and details.
      v_incoming := v_item.payload -> 'incoming';
      insert into coach_history (coach_id, change_type, school, title, email,
                                 previous_school, previous_email, batch_id)
      select id, 'merged', v_incoming ->> 'school', v_incoming ->> 'title',
             v_incoming ->> 'email', school, email, v_item.batch_id
      from coaches where id = v_item.coach_id;

      update coaches set
        master_id  = coalesce(v_incoming ->> 'master_id', master_id),
        first_name = coalesce(nullif(v_incoming ->> 'first_name', ''), first_name),
        last_name  = coalesce(nullif(v_incoming ->> 'last_name', ''), last_name),
        email      = coalesce(nullif(v_incoming ->> 'email', ''), email),
        phone      = coalesce(nullif(v_incoming ->> 'phone', ''), phone),
        school     = coalesce(nullif(v_incoming ->> 'school', ''), school),
        sport      = coalesce(nullif(v_incoming ->> 'sport', ''), sport),
        title      = coalesce(nullif(v_incoming ->> 'title', ''), title),
        division   = coalesce(nullif(v_incoming ->> 'division', ''), division),
        conference = coalesce(nullif(v_incoming ->> 'conference', ''), conference),
        state      = coalesce(nullif(v_incoming ->> 'state', ''), state),
        status = 'active', last_seen_at = now(), updated_at = now()
      where id = v_item.coach_id;

    elsif v_item.item_type = 'missing_id' then
      -- Approving a row with no ID creates the coach with a generated ID.
      insert into coaches (master_id, first_name, last_name, email, phone, school,
                           sport, title, division, conference, state, status)
      values ('RFX-' || substr(gen_random_uuid()::text, 1, 8),
              coalesce(v_item.payload ->> 'first_name', ''),
              coalesce(v_item.payload ->> 'last_name', ''),
              nullif(v_item.payload ->> 'email', ''),
              nullif(v_item.payload ->> 'phone', ''),
              nullif(v_item.payload ->> 'school', ''),
              nullif(v_item.payload ->> 'sport', ''),
              nullif(v_item.payload ->> 'title', ''),
              nullif(v_item.payload ->> 'division', ''),
              nullif(v_item.payload ->> 'conference', ''),
              nullif(v_item.payload ->> 'state', ''), 'active');
    end if;
    -- duplicate_id: informational; approving simply acknowledges it.
  end if;

  update review_items
  set status = case when p_approve then 'approved' else 'rejected' end,
      resolved_at = now()
  where id = p_item_id;

  -- Close out the batch once its queue is empty.
  if v_item.batch_id is not null and not exists (
    select 1 from review_items where batch_id = v_item.batch_id and status = 'pending'
  ) then
    update sync_batches set status = 'completed'
    where id = v_item.batch_id and status = 'needs_review';
  end if;
end;
$$;

grant execute on function process_sync_batch(uuid) to anon, authenticated;
grant execute on function resolve_review_item(uuid, boolean) to anon, authenticated;

-- ===========================================================================
-- From migrations/0002_multisport.sql
-- ===========================================================================
-- Multi-sport sync scoping.
-- Run this in the Supabase SQL editor after 0001_coach_database.sql.
--
-- A vendor file that covers only one sport must not touch coaches in other
-- sports. This adds a `sport` tag to each sync batch; when set, departure
-- detection (and the mass-departure alarm) only look at coaches in that
-- sport. A batch with no sport behaves exactly as before (covers everyone).

alter table sync_batches add column if not exists sport text;

create index if not exists coaches_sport_idx on coaches (sport);

create or replace function process_sync_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch sync_batches%rowtype;
  v_sport text;
  v_row record;
  v_coach coaches%rowtype;
  v_added int := 0;
  v_updated int := 0;
  v_moved int := 0;
  v_departed int := 0;
  v_unchanged int := 0;
  v_reinstated int := 0;
  v_queued int := 0;
  v_active_before int;
  v_missing_count int;
  v_mass_departure boolean := false;
  v_changed boolean;
  v_stats jsonb;
begin
  select * into v_batch from sync_batches where id = p_batch_id;
  if not found then
    raise exception 'batch % not found', p_batch_id;
  end if;
  v_sport := nullif(btrim(coalesce(v_batch.sport, '')), '');

  update sync_batches set status = 'processing' where id = p_batch_id;

  -- Rows without a unique ID can't be matched safely: queue for review.
  insert into review_items (batch_id, item_type, summary, payload)
  select p_batch_id, 'missing_id',
         'Row has no unique coach ID: ' || coalesce(s.first_name, '') || ' ' ||
         coalesce(s.last_name, '') || ' (' || coalesce(s.email, 'no email') || ')',
         to_jsonb(s)
  from staging_rows s
  where s.batch_id = p_batch_id and (s.master_id is null or btrim(s.master_id) = '');
  get diagnostics v_missing_count = row_count;
  v_queued := v_queued + v_missing_count;

  -- Duplicate IDs inside the same file: keep the first occurrence, flag the rest.
  insert into review_items (batch_id, item_type, summary, payload)
  select p_batch_id, 'duplicate_id',
         'Unique ID ' || d.master_id || ' appears ' || d.n || ' times in this file',
         jsonb_build_object('master_id', d.master_id, 'occurrences', d.n)
  from (
    select master_id, count(*) as n
    from staging_rows
    where batch_id = p_batch_id and master_id is not null and btrim(master_id) <> ''
    group by master_id
    having count(*) > 1
  ) d;
  get diagnostics v_missing_count = row_count;
  v_queued := v_queued + v_missing_count;

  select count(*) into v_active_before
  from coaches
  where status = 'active' and (v_sport is null or sport = v_sport);

  -- Walk each usable staged row (first occurrence per master_id).
  for v_row in
    select distinct on (btrim(master_id))
           btrim(master_id) as master_id,
           nullif(btrim(coalesce(first_name, '')), '') as first_name,
           nullif(btrim(coalesce(last_name, '')), '') as last_name,
           nullif(lower(btrim(coalesce(email, ''))), '') as email,
           nullif(btrim(coalesce(phone, '')), '') as phone,
           nullif(btrim(coalesce(school, '')), '') as school,
           nullif(btrim(coalesce(sport, '')), '') as sport,
           nullif(btrim(coalesce(title, '')), '') as title,
           nullif(btrim(coalesce(division, '')), '') as division,
           nullif(btrim(coalesce(conference, '')), '') as conference,
           nullif(btrim(coalesce(state, '')), '') as state
    from staging_rows
    where batch_id = p_batch_id and master_id is not null and btrim(master_id) <> ''
    order by btrim(master_id), id
  loop
    select * into v_coach from coaches where master_id = v_row.master_id;

    if not found then
      -- Vendor says this coach is new. If their email already belongs to a
      -- known coach under a different ID, that's suspicious: queue it.
      if v_row.email is not null and exists (
        select 1 from coaches c
        where lower(c.email) = v_row.email and c.master_id <> v_row.master_id
      ) then
        insert into review_items (batch_id, coach_id, item_type, summary, payload)
        select p_batch_id, c.id, 'identity_conflict',
               'File says ' || coalesce(v_row.first_name, '') || ' ' || coalesce(v_row.last_name, '') ||
               ' (ID ' || v_row.master_id || ') is new, but ' || c.first_name || ' ' || c.last_name ||
               ' (ID ' || c.master_id || ') already has email ' || v_row.email,
               jsonb_build_object('incoming', to_jsonb(v_row), 'existing_coach_id', c.id,
                                  'existing_master_id', c.master_id)
        from coaches c
        where lower(c.email) = v_row.email and c.master_id <> v_row.master_id
        limit 1;
        v_queued := v_queued + 1;
      else
        -- Rows in a sport-tagged file inherit the batch sport when the row
        -- itself doesn't say.
        insert into coaches (master_id, first_name, last_name, email, phone, school,
                             sport, title, division, conference, state, status, last_seen_at)
        values (v_row.master_id, coalesce(v_row.first_name, ''), coalesce(v_row.last_name, ''),
                v_row.email, v_row.phone, v_row.school, coalesce(v_row.sport, v_sport),
                v_row.title, v_row.division, v_row.conference, v_row.state, 'active', now())
        returning * into v_coach;

        insert into coach_history (coach_id, change_type, school, title, sport, email, batch_id)
        values (v_coach.id, 'hired', v_row.school, v_row.title,
                coalesce(v_row.sport, v_sport), v_row.email, p_batch_id);
        v_added := v_added + 1;
      end if;
    else
      v_changed := false;

      if v_coach.status = 'inactive' then
        insert into coach_history (coach_id, change_type, school, title, sport, email, batch_id)
        values (v_coach.id, 'reinstated', v_row.school, v_row.title, v_row.sport, v_row.email, p_batch_id);
        v_reinstated := v_reinstated + 1;
        v_changed := true;
      end if;

      if v_row.school is distinct from v_coach.school and v_row.school is not null then
        insert into coach_history (coach_id, change_type, school, title, sport, email,
                                   previous_school, previous_title, batch_id)
        values (v_coach.id, 'moved', v_row.school, v_row.title, v_row.sport, v_row.email,
                v_coach.school, v_coach.title, p_batch_id);
        v_moved := v_moved + 1;
        v_changed := true;
      elsif v_row.title is distinct from v_coach.title and v_row.title is not null then
        insert into coach_history (coach_id, change_type, school, title, sport, email,
                                   previous_title, batch_id)
        values (v_coach.id, 'title_change', v_coach.school, v_row.title, v_row.sport,
                v_row.email, v_coach.title, p_batch_id);
        v_changed := true;
      end if;

      if v_row.email is distinct from lower(coalesce(v_coach.email, '')) and v_row.email is not null
         and lower(coalesce(v_coach.email, '')) <> '' then
        insert into coach_history (coach_id, change_type, school, title, email,
                                   previous_email, batch_id)
        values (v_coach.id, 'email_change', coalesce(v_row.school, v_coach.school),
                coalesce(v_row.title, v_coach.title), v_row.email, v_coach.email, p_batch_id);
        v_changed := true;
      end if;

      update coaches set
        first_name = coalesce(v_row.first_name, first_name),
        last_name  = coalesce(v_row.last_name, last_name),
        email      = coalesce(v_row.email, email),
        phone      = coalesce(v_row.phone, phone),
        school     = coalesce(v_row.school, school),
        sport      = coalesce(v_row.sport, sport, v_sport),
        title      = coalesce(v_row.title, title),
        division   = coalesce(v_row.division, division),
        conference = coalesce(v_row.conference, conference),
        state      = coalesce(v_row.state, state),
        status     = 'active',
        last_seen_at = now(),
        updated_at = now()
      where id = v_coach.id;

      if v_changed then
        v_updated := v_updated + 1;
      else
        v_unchanged := v_unchanged + 1;
      end if;
    end if;
  end loop;

  -- Departures: active coaches missing from this file — but ONLY within the
  -- sport this batch covers. A women's soccer file can never depart a
  -- basketball coach. Baselines never depart anyone. A mass disappearance
  -- (>15% of the sport's active list, on a list of 50+) is suspicious —
  -- likely a truncated vendor file — so it goes to review instead.
  if not v_batch.is_baseline then
    select count(*) into v_missing_count
    from coaches c
    where c.status = 'active'
      and (v_sport is null or c.sport = v_sport)
      and not exists (
        select 1 from staging_rows s
        where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
      );

    if v_active_before >= 50 and v_missing_count > v_active_before * 0.15 then
      v_mass_departure := true;
      insert into review_items (batch_id, coach_id, item_type, summary, payload)
      select p_batch_id, c.id, 'mass_departure',
             c.first_name || ' ' || c.last_name || ' (' || coalesce(c.school, 'unknown school') ||
             ') disappeared from the file — part of a suspicious ' || v_missing_count ||
             '-coach drop (' || round(100.0 * v_missing_count / v_active_before) || '% of the list)',
             jsonb_build_object('master_id', c.master_id, 'school', c.school, 'title', c.title,
                                'missing_total', v_missing_count, 'active_before', v_active_before)
      from coaches c
      where c.status = 'active'
        and (v_sport is null or c.sport = v_sport)
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );
      v_queued := v_queued + v_missing_count;
    else
      insert into coach_history (coach_id, change_type, previous_school, previous_title, batch_id)
      select c.id, 'departed', c.school, c.title, p_batch_id
      from coaches c
      where c.status = 'active'
        and (v_sport is null or c.sport = v_sport)
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );

      update coaches c set status = 'inactive', updated_at = now()
      where c.status = 'active'
        and (v_sport is null or c.sport = v_sport)
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );
      v_departed := v_missing_count;
    end if;
  end if;

  -- Keep the program directory in sync with what the file shows.
  insert into programs (school, sport, division, conference, state)
  select distinct on (btrim(school), btrim(coalesce(sport, v_sport, 'General')))
         btrim(school), btrim(coalesce(sport, v_sport, 'General')),
         nullif(btrim(coalesce(division, '')), ''),
         nullif(btrim(coalesce(conference, '')), ''),
         nullif(btrim(coalesce(state, '')), '')
  from staging_rows
  where batch_id = p_batch_id and school is not null and btrim(school) <> ''
  on conflict (school, sport) do update set
    division   = coalesce(excluded.division, programs.division),
    conference = coalesce(excluded.conference, programs.conference),
    state      = coalesce(excluded.state, programs.state),
    updated_at = now();

  v_stats := jsonb_build_object(
    'added', v_added, 'updated', v_updated, 'moved', v_moved,
    'departed', v_departed, 'unchanged', v_unchanged, 'reinstated', v_reinstated,
    'queued_for_review', v_queued, 'mass_departure_flagged', v_mass_departure);

  update sync_batches set
    stats = v_stats,
    status = case when v_queued > 0 then 'needs_review' else 'completed' end,
    processed_at = now()
  where id = p_batch_id;

  -- Staged rows are no longer needed once processed.
  delete from staging_rows where batch_id = p_batch_id;

  return v_stats;
exception when others then
  update sync_batches set status = 'failed', error = sqlerrm where id = p_batch_id;
  raise;
end;
$$;

grant execute on function process_sync_batch(uuid) to anon, authenticated;

-- ===========================================================================
-- From migrations/0003_watchtower.sql
-- ===========================================================================
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

-- ===========================================================================
-- From migrations/0004_radar.sql
-- ===========================================================================
-- The National Radar: watches external news sources around the clock for
-- coaching changes across the country, before they show up in vendor files.
-- Run this in the Supabase SQL editor after 0003_watchtower.sql.
--
-- Sources are keyless RSS feeds (Google News searches per sport). A pg_cron
-- job fetches them every 6 hours via the `http` extension, dedupes by link,
-- tries to match each headline to a coach already in the database, and posts
-- a Watchtower alert when new items land. Findings appear on the Coach
-- Tracker page under "News Radar".

create extension if not exists http;

create table if not exists radar_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  sport text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists radar_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references radar_sources(id) on delete cascade,
  title text not null,
  link text not null unique,
  published_at timestamptz,
  matched_coach_id uuid references coaches(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists radar_items_status_idx on radar_items (status, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['radar_sources', 'radar_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_all', t);
  end loop;
end $$;

-- Let the Watchtower announce radar findings too.
alter table alerts drop constraint if exists alerts_kind_check;
alter table alerts add constraint alerts_kind_check check (kind in
  ('movement_digest', 'review_reminder', 'stale_data', 'mass_departure', 'radar_news'));

-- Default sources: one Google News RSS search per major sport, plus a
-- catch-all. Add or disable rows in radar_sources to tune coverage.
insert into radar_sources (name, url, sport) values
  ('College coaching changes (all sports)',
   'https://news.google.com/rss/search?q=%22named+head+coach%22+college&hl=en-US&gl=US&ceid=US:en', null),
  ('College soccer coaching news',
   'https://news.google.com/rss/search?q=college+soccer+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Soccer'),
  ('College basketball coaching news',
   'https://news.google.com/rss/search?q=college+basketball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Basketball'),
  ('College football coaching news',
   'https://news.google.com/rss/search?q=college+football+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Football'),
  ('College baseball coaching news',
   'https://news.google.com/rss/search?q=college+baseball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Baseball'),
  ('College volleyball coaching news',
   'https://news.google.com/rss/search?q=college+volleyball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Volleyball'),
  ('College lacrosse coaching news',
   'https://news.google.com/rss/search?q=college+lacrosse+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Lacrosse'),
  ('College softball coaching news',
   'https://news.google.com/rss/search?q=college+softball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Softball'),
  ('College ice hockey coaching news',
   'https://news.google.com/rss/search?q=college+hockey+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Ice Hockey')
on conflict (url) do nothing;

create or replace function run_radar()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_src radar_sources%rowtype;
  v_body text;
  v_xml xml;
  v_titles xml[];
  v_links xml[];
  v_dates xml[];
  v_title text;
  v_link text;
  v_pub timestamptz;
  v_new int := 0;
  v_sources_ok int := 0;
  v_inserted boolean;
  i int;
begin
  for v_src in select * from radar_sources where enabled loop
    begin
      select content into v_body from http_get(v_src.url);
      v_xml := v_body::xml;
      v_titles := xpath('//item/title/text()', v_xml);
      v_links := xpath('//item/link/text()', v_xml);
      v_dates := xpath('//item/pubDate/text()', v_xml);
      v_sources_ok := v_sources_ok + 1;

      for i in 1 .. coalesce(array_length(v_titles, 1), 0) loop
        v_title := v_titles[i]::text;
        v_link := v_links[i]::text;
        begin
          v_pub := (v_dates[i]::text)::timestamptz;
        exception when others then
          v_pub := null;
        end;

        insert into radar_items (source_id, title, link, published_at, matched_coach_id)
        values (
          v_src.id, v_title, v_link, v_pub,
          -- Best-effort match: an active coach whose full name appears in the
          -- headline (both names required, short names skipped to avoid noise).
          (select c.id from coaches c
           where c.status = 'active'
             and length(c.first_name) > 2 and length(c.last_name) > 2
             and position(lower(c.first_name || ' ' || c.last_name) in lower(v_title)) > 0
           limit 1)
        )
        on conflict (link) do nothing
        returning true into v_inserted;
        if v_inserted then v_new := v_new + 1; end if;
        v_inserted := null;
      end loop;
    exception when others then
      -- One bad feed never stops the sweep.
      continue;
    end;
  end loop;

  if v_new > 0 then
    insert into alerts (kind, title, body, payload)
    values (
      'radar_news',
      v_new || ' new coaching-news item(s) on the radar',
      'The National Radar picked up new coaching-change headlines. Review them on the Coach Tracker page under News Radar.',
      jsonb_build_object('new_items', v_new)
    );
  end if;

  return jsonb_build_object('new_items', v_new, 'sources_scanned', v_sources_ok);
end;
$$;

grant execute on function run_radar() to anon, authenticated;

-- Sweep every 6 hours, offset from the daily Watchtower run.
do $$
begin
  perform cron.unschedule('rfx-radar');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('rfx-radar', '15 */6 * * *', 'select run_radar()');
exception when others then
  raise notice 'pg_cron not available — run_radar() can still be called manually.';
end $$;

-- ===========================================================================
-- From migrations/0005_radar_timeout_fix.sql
-- ===========================================================================
-- Radar fix: sweep one source per call so it fits inside Supabase's
-- per-request statement timeout. Run this after 0004_radar.sql.
--
-- The app now calls run_radar(source_id) once per source; the pg_cron job
-- (which runs with a longer timeout) still sweeps everything in one call.
-- Each feed fetch is also capped at 2.5s so one slow site can't hang a call.

drop function if exists run_radar();
drop function if exists run_radar(uuid);

create or replace function run_radar(p_source_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_src radar_sources%rowtype;
  v_body text;
  v_xml xml;
  v_titles xml[];
  v_links xml[];
  v_dates xml[];
  v_title text;
  v_link text;
  v_pub timestamptz;
  v_new int := 0;
  v_sources_ok int := 0;
  v_inserted boolean;
  i int;
begin
  -- Cap each outbound fetch so a slow feed can't blow the statement timeout.
  begin
    perform http_set_curlopt('CURLOPT_TIMEOUT_MS', '2500');
  exception when others then null;
  end;

  for v_src in
    select * from radar_sources
    where enabled and (p_source_id is null or id = p_source_id)
  loop
    begin
      select content into v_body from http_get(v_src.url);
      v_xml := v_body::xml;
      v_titles := xpath('//item/title/text()', v_xml);
      v_links := xpath('//item/link/text()', v_xml);
      v_dates := xpath('//item/pubDate/text()', v_xml);
      v_sources_ok := v_sources_ok + 1;

      for i in 1 .. coalesce(array_length(v_titles, 1), 0) loop
        v_title := v_titles[i]::text;
        v_link := v_links[i]::text;
        begin
          v_pub := (v_dates[i]::text)::timestamptz;
        exception when others then
          v_pub := null;
        end;

        insert into radar_items (source_id, title, link, published_at, matched_coach_id)
        values (
          v_src.id, v_title, v_link, v_pub,
          (select c.id from coaches c
           where c.status = 'active'
             and length(c.first_name) > 2 and length(c.last_name) > 2
             and position(lower(c.first_name || ' ' || c.last_name) in lower(v_title)) > 0
           limit 1)
        )
        on conflict (link) do nothing
        returning true into v_inserted;
        if v_inserted then v_new := v_new + 1; end if;
        v_inserted := null;
      end loop;
    exception when others then
      -- One bad feed never stops the sweep.
      continue;
    end;
  end loop;

  if v_new > 0 then
    insert into alerts (kind, title, body, payload)
    values (
      'radar_news',
      v_new || ' new coaching-news item(s) on the radar',
      'The National Radar picked up new coaching-change headlines. Review them on the Coach Tracker page under News Radar.',
      jsonb_build_object('new_items', v_new)
    );
  end if;

  return jsonb_build_object('new_items', v_new, 'sources_scanned', v_sources_ok);
end;
$$;

grant execute on function run_radar(uuid) to anon, authenticated;

-- ===========================================================================
-- From migrations/0006_radar_performance.sql
-- ===========================================================================
-- Radar fix, part 2. Run this after 0005_radar_timeout_fix.sql.
--
-- Two things:
-- 1. This project cancels app-initiated queries after ~3 seconds — barely
--    enough for a single news-feed fetch. Raise the ceiling to 20s for the
--    app's roles (fine for an internal tool; every other query is <100ms).
-- 2. Make the sweep leaner: bulk-insert headlines in one statement, then
--    match coaches in one pass, instead of row-by-row work.

alter role anon set statement_timeout = '20s';
alter role authenticated set statement_timeout = '20s';
notify pgrst, 'reload config';

-- Safe timestamp parse for RSS pubDates ("Sat, 18 Jul 2026 17:21:05 GMT").
create or replace function try_timestamptz(p text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return p::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function run_radar(p_source_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_src radar_sources%rowtype;
  v_body text;
  v_xml xml;
  v_new int := 0;
  v_cnt int;
  v_sources_ok int := 0;
begin
  -- Cap each outbound fetch so a slow feed can't blow the statement timeout.
  begin
    perform http_set_curlopt('CURLOPT_TIMEOUT_MS', '2500');
  exception when others then null;
  end;

  for v_src in
    select * from radar_sources
    where enabled and (p_source_id is null or id = p_source_id)
  loop
    begin
      select content into v_body from http_get(v_src.url);
      v_xml := v_body::xml;
      v_sources_ok := v_sources_ok + 1;

      insert into radar_items (source_id, title, link, published_at)
      select v_src.id, u.t::text, u.l::text, try_timestamptz(u.d::text)
      from unnest(
        xpath('//item/title/text()', v_xml),
        xpath('//item/link/text()', v_xml),
        xpath('//item/pubDate/text()', v_xml)
      ) as u(t, l, d)
      where u.t is not null and u.l is not null
      on conflict (link) do nothing;

      get diagnostics v_cnt = row_count;
      v_new := v_new + v_cnt;
    exception when others then
      -- One bad feed never stops the sweep.
      continue;
    end;
  end loop;

  -- Match fresh headlines to active coaches in one pass (full name required,
  -- short names skipped to avoid noise).
  if v_new > 0 then
    update radar_items ri
    set matched_coach_id = c.id
    from coaches c
    where ri.status = 'new'
      and ri.matched_coach_id is null
      and c.status = 'active'
      and length(c.first_name) > 2 and length(c.last_name) > 2
      and position(lower(c.first_name || ' ' || c.last_name) in lower(ri.title)) > 0;

    insert into alerts (kind, title, body, payload)
    values (
      'radar_news',
      v_new || ' new coaching-news item(s) on the radar',
      'The National Radar picked up new coaching-change headlines. Review them on the Coach Tracker page under News Radar.',
      jsonb_build_object('new_items', v_new)
    );
  end if;

  return jsonb_build_object('new_items', v_new, 'sources_scanned', v_sources_ok);
end;
$$;

grant execute on function run_radar(uuid) to anon, authenticated;

-- ===========================================================================
-- From migrations/0007_email_hunter.sql
-- ===========================================================================
-- The Email Hunter: fills contact gaps from public program pages.
-- Run this in the Supabase SQL editor after 0006_radar_performance.sql.
--
-- Adds a landing-page URL to each coach (the vendor files already carry one),
-- and a proposed_changes queue. A nightly GitHub Action visits the landing
-- page for each active coach missing an email, tries to find their address,
-- and writes a PROPOSAL here — never straight into the master list. Jen
-- approves or rejects in the app, exactly like the review queue.

alter table coaches add column if not exists landing_page text;
alter table staging_rows add column if not exists landing_page text;

create table if not exists proposed_changes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  field text not null check (field in ('email', 'phone')),
  current_value text,
  proposed_value text not null,
  source_url text,
  source text not null default 'email_hunter',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (coach_id, field, proposed_value)
);

create index if not exists proposed_changes_status_idx on proposed_changes (status, created_at desc);

alter table proposed_changes enable row level security;
drop policy if exists proposed_changes_all on proposed_changes;
create policy proposed_changes_all on proposed_changes for all using (true) with check (true);

-- Approve = write the proposed value onto the coach (logging an email/phone
-- change to their history when it's an email). Reject = just close it.
create or replace function resolve_proposed_change(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pc proposed_changes%rowtype;
  v_coach coaches%rowtype;
begin
  select * into v_pc from proposed_changes where id = p_id and status = 'pending';
  if not found then
    raise exception 'pending proposed change % not found', p_id;
  end if;

  if p_approve then
    select * into v_coach from coaches where id = v_pc.coach_id;
    if found then
      if v_pc.field = 'email' then
        if v_coach.email is not null and lower(v_coach.email) <> lower(v_pc.proposed_value) then
          insert into coach_history (coach_id, change_type, school, title, email, previous_email)
          values (v_coach.id, 'email_change', v_coach.school, v_coach.title, lower(v_pc.proposed_value), v_coach.email);
        end if;
        update coaches set email = lower(v_pc.proposed_value), updated_at = now() where id = v_coach.id;
      elsif v_pc.field = 'phone' then
        update coaches set phone = v_pc.proposed_value, updated_at = now() where id = v_coach.id;
      end if;
    end if;
  end if;

  update proposed_changes
  set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now()
  where id = p_id;
end;
$$;

grant execute on function resolve_proposed_change(uuid, boolean) to anon, authenticated;

-- Carry landing_page through the monthly sync so it stays fresh. This is the
-- 0002 engine with landing_page added in the four places a field flows.
create or replace function process_sync_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch sync_batches%rowtype;
  v_sport text;
  v_row record;
  v_coach coaches%rowtype;
  v_added int := 0;
  v_updated int := 0;
  v_moved int := 0;
  v_departed int := 0;
  v_unchanged int := 0;
  v_reinstated int := 0;
  v_queued int := 0;
  v_active_before int;
  v_missing_count int;
  v_mass_departure boolean := false;
  v_changed boolean;
  v_stats jsonb;
begin
  select * into v_batch from sync_batches where id = p_batch_id;
  if not found then
    raise exception 'batch % not found', p_batch_id;
  end if;
  v_sport := nullif(btrim(coalesce(v_batch.sport, '')), '');

  update sync_batches set status = 'processing' where id = p_batch_id;

  insert into review_items (batch_id, item_type, summary, payload)
  select p_batch_id, 'missing_id',
         'Row has no unique coach ID: ' || coalesce(s.first_name, '') || ' ' ||
         coalesce(s.last_name, '') || ' (' || coalesce(s.email, 'no email') || ')',
         to_jsonb(s)
  from staging_rows s
  where s.batch_id = p_batch_id and (s.master_id is null or btrim(s.master_id) = '');
  get diagnostics v_missing_count = row_count;
  v_queued := v_queued + v_missing_count;

  insert into review_items (batch_id, item_type, summary, payload)
  select p_batch_id, 'duplicate_id',
         'Unique ID ' || d.master_id || ' appears ' || d.n || ' times in this file',
         jsonb_build_object('master_id', d.master_id, 'occurrences', d.n)
  from (
    select master_id, count(*) as n
    from staging_rows
    where batch_id = p_batch_id and master_id is not null and btrim(master_id) <> ''
    group by master_id
    having count(*) > 1
  ) d;
  get diagnostics v_missing_count = row_count;
  v_queued := v_queued + v_missing_count;

  select count(*) into v_active_before
  from coaches
  where status = 'active' and (v_sport is null or sport = v_sport);

  for v_row in
    select distinct on (btrim(master_id))
           btrim(master_id) as master_id,
           nullif(btrim(coalesce(first_name, '')), '') as first_name,
           nullif(btrim(coalesce(last_name, '')), '') as last_name,
           nullif(lower(btrim(coalesce(email, ''))), '') as email,
           nullif(btrim(coalesce(phone, '')), '') as phone,
           nullif(btrim(coalesce(school, '')), '') as school,
           nullif(btrim(coalesce(sport, '')), '') as sport,
           nullif(btrim(coalesce(title, '')), '') as title,
           nullif(btrim(coalesce(division, '')), '') as division,
           nullif(btrim(coalesce(conference, '')), '') as conference,
           nullif(btrim(coalesce(state, '')), '') as state,
           nullif(btrim(coalesce(landing_page, '')), '') as landing_page
    from staging_rows
    where batch_id = p_batch_id and master_id is not null and btrim(master_id) <> ''
    order by btrim(master_id), id
  loop
    select * into v_coach from coaches where master_id = v_row.master_id;

    if not found then
      if v_row.email is not null and exists (
        select 1 from coaches c
        where lower(c.email) = v_row.email and c.master_id <> v_row.master_id
      ) then
        insert into review_items (batch_id, coach_id, item_type, summary, payload)
        select p_batch_id, c.id, 'identity_conflict',
               'File says ' || coalesce(v_row.first_name, '') || ' ' || coalesce(v_row.last_name, '') ||
               ' (ID ' || v_row.master_id || ') is new, but ' || c.first_name || ' ' || c.last_name ||
               ' (ID ' || c.master_id || ') already has email ' || v_row.email,
               jsonb_build_object('incoming', to_jsonb(v_row), 'existing_coach_id', c.id,
                                  'existing_master_id', c.master_id)
        from coaches c
        where lower(c.email) = v_row.email and c.master_id <> v_row.master_id
        limit 1;
        v_queued := v_queued + 1;
      else
        insert into coaches (master_id, first_name, last_name, email, phone, school,
                             sport, title, division, conference, state, landing_page, status, last_seen_at)
        values (v_row.master_id, coalesce(v_row.first_name, ''), coalesce(v_row.last_name, ''),
                v_row.email, v_row.phone, v_row.school, coalesce(v_row.sport, v_sport),
                v_row.title, v_row.division, v_row.conference, v_row.state, v_row.landing_page, 'active', now())
        returning * into v_coach;

        insert into coach_history (coach_id, change_type, school, title, sport, email, batch_id)
        values (v_coach.id, 'hired', v_row.school, v_row.title,
                coalesce(v_row.sport, v_sport), v_row.email, p_batch_id);
        v_added := v_added + 1;
      end if;
    else
      v_changed := false;

      if v_coach.status = 'inactive' then
        insert into coach_history (coach_id, change_type, school, title, sport, email, batch_id)
        values (v_coach.id, 'reinstated', v_row.school, v_row.title, v_row.sport, v_row.email, p_batch_id);
        v_reinstated := v_reinstated + 1;
        v_changed := true;
      end if;

      if v_row.school is distinct from v_coach.school and v_row.school is not null then
        insert into coach_history (coach_id, change_type, school, title, sport, email,
                                   previous_school, previous_title, batch_id)
        values (v_coach.id, 'moved', v_row.school, v_row.title, v_row.sport, v_row.email,
                v_coach.school, v_coach.title, p_batch_id);
        v_moved := v_moved + 1;
        v_changed := true;
      elsif v_row.title is distinct from v_coach.title and v_row.title is not null then
        insert into coach_history (coach_id, change_type, school, title, sport, email,
                                   previous_title, batch_id)
        values (v_coach.id, 'title_change', v_coach.school, v_row.title, v_row.sport,
                v_row.email, v_coach.title, p_batch_id);
        v_changed := true;
      end if;

      if v_row.email is distinct from lower(coalesce(v_coach.email, '')) and v_row.email is not null
         and lower(coalesce(v_coach.email, '')) <> '' then
        insert into coach_history (coach_id, change_type, school, title, email,
                                   previous_email, batch_id)
        values (v_coach.id, 'email_change', coalesce(v_row.school, v_coach.school),
                coalesce(v_row.title, v_coach.title), v_row.email, v_coach.email, p_batch_id);
        v_changed := true;
      end if;

      update coaches set
        first_name = coalesce(v_row.first_name, first_name),
        last_name  = coalesce(v_row.last_name, last_name),
        email      = coalesce(v_row.email, email),
        phone      = coalesce(v_row.phone, phone),
        school     = coalesce(v_row.school, school),
        sport      = coalesce(v_row.sport, sport, v_sport),
        title      = coalesce(v_row.title, title),
        division   = coalesce(v_row.division, division),
        conference = coalesce(v_row.conference, conference),
        state      = coalesce(v_row.state, state),
        landing_page = coalesce(v_row.landing_page, landing_page),
        status     = 'active',
        last_seen_at = now(),
        updated_at = now()
      where id = v_coach.id;

      if v_changed then
        v_updated := v_updated + 1;
      else
        v_unchanged := v_unchanged + 1;
      end if;
    end if;
  end loop;

  if not v_batch.is_baseline then
    select count(*) into v_missing_count
    from coaches c
    where c.status = 'active'
      and (v_sport is null or c.sport = v_sport)
      and not exists (
        select 1 from staging_rows s
        where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
      );

    if v_active_before >= 50 and v_missing_count > v_active_before * 0.15 then
      v_mass_departure := true;
      insert into review_items (batch_id, coach_id, item_type, summary, payload)
      select p_batch_id, c.id, 'mass_departure',
             c.first_name || ' ' || c.last_name || ' (' || coalesce(c.school, 'unknown school') ||
             ') disappeared from the file — part of a suspicious ' || v_missing_count ||
             '-coach drop (' || round(100.0 * v_missing_count / v_active_before) || '% of the list)',
             jsonb_build_object('master_id', c.master_id, 'school', c.school, 'title', c.title,
                                'missing_total', v_missing_count, 'active_before', v_active_before)
      from coaches c
      where c.status = 'active'
        and (v_sport is null or c.sport = v_sport)
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );
      v_queued := v_queued + v_missing_count;
    else
      insert into coach_history (coach_id, change_type, previous_school, previous_title, batch_id)
      select c.id, 'departed', c.school, c.title, p_batch_id
      from coaches c
      where c.status = 'active'
        and (v_sport is null or c.sport = v_sport)
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );

      update coaches c set status = 'inactive', updated_at = now()
      where c.status = 'active'
        and (v_sport is null or c.sport = v_sport)
        and not exists (
          select 1 from staging_rows s
          where s.batch_id = p_batch_id and btrim(coalesce(s.master_id, '')) = c.master_id
        );
      v_departed := v_missing_count;
    end if;
  end if;

  insert into programs (school, sport, division, conference, state)
  select distinct on (btrim(school), btrim(coalesce(sport, v_sport, 'General')))
         btrim(school), btrim(coalesce(sport, v_sport, 'General')),
         nullif(btrim(coalesce(division, '')), ''),
         nullif(btrim(coalesce(conference, '')), ''),
         nullif(btrim(coalesce(state, '')), '')
  from staging_rows
  where batch_id = p_batch_id and school is not null and btrim(school) <> ''
  on conflict (school, sport) do update set
    division   = coalesce(excluded.division, programs.division),
    conference = coalesce(excluded.conference, programs.conference),
    state      = coalesce(excluded.state, programs.state),
    updated_at = now();

  v_stats := jsonb_build_object(
    'added', v_added, 'updated', v_updated, 'moved', v_moved,
    'departed', v_departed, 'unchanged', v_unchanged, 'reinstated', v_reinstated,
    'queued_for_review', v_queued, 'mass_departure_flagged', v_mass_departure);

  update sync_batches set
    stats = v_stats,
    status = case when v_queued > 0 then 'needs_review' else 'completed' end,
    processed_at = now()
  where id = p_batch_id;

  delete from staging_rows where batch_id = p_batch_id;

  return v_stats;
exception when others then
  update sync_batches set status = 'failed', error = sqlerrm where id = p_batch_id;
  raise;
end;
$$;

grant execute on function process_sync_batch(uuid) to anon, authenticated;


-- ===========================================================================
-- From migrations/0008_roster_candidates.sql
-- ===========================================================================
-- Roster Candidates: staging area for coaches discovered by the Roster Builder
-- (conference-by-conference scraping of athletics staff pages). Every candidate
-- is reviewed by a human before it becomes a real coach — nothing scraped
-- enters the master list automatically. Run after 0007_email_hunter.sql.

create table if not exists roster_candidates (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  title text,
  sport text,
  email text,
  phone text,
  school text not null,
  division text,
  conference text,
  state text,
  landing_page text,
  source_url text,
  source text not null default 'roster_builder',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- de-dupe within a build: same person, same school
  unique (school, sport, email)
);

create index if not exists roster_candidates_status_idx on roster_candidates (status, conference, school);

alter table roster_candidates enable row level security;
drop policy if exists roster_candidates_all on roster_candidates;
create policy roster_candidates_all on roster_candidates for all using (true) with check (true);

-- Approve = create the coach from the (possibly human-edited) candidate row,
-- log a 'hired' history entry, and ensure the program exists. Reject = close.
create or replace function resolve_roster_candidate(p_id uuid, p_approve boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c roster_candidates%rowtype;
  v_coach_id uuid;
  v_master text;
begin
  select * into v_c from roster_candidates where id = p_id and status = 'pending';
  if not found then
    raise exception 'pending roster candidate % not found', p_id;
  end if;

  if p_approve then
    if btrim(coalesce(v_c.first_name, '')) = '' and btrim(coalesce(v_c.last_name, '')) = '' then
      raise exception 'candidate needs a first or last name before approval';
    end if;
    v_master := 'RFX-' || substr(gen_random_uuid()::text, 1, 8);
    insert into coaches (master_id, first_name, last_name, email, phone, school,
                         sport, title, division, conference, state, landing_page, status, last_seen_at)
    values (v_master, coalesce(v_c.first_name, ''), coalesce(v_c.last_name, ''),
            nullif(lower(btrim(coalesce(v_c.email, ''))), ''), v_c.phone, v_c.school,
            v_c.sport, v_c.title, v_c.division, v_c.conference, v_c.state, v_c.landing_page, 'active', now())
    returning id into v_coach_id;

    insert into coach_history (coach_id, change_type, school, title, sport, email)
    values (v_coach_id, 'hired', v_c.school, v_c.title, v_c.sport, v_c.email);

    -- Keep the program directory in step.
    if v_c.school is not null and v_c.sport is not null then
      insert into programs (school, sport, division, conference, state)
      values (v_c.school, v_c.sport, v_c.division, v_c.conference, v_c.state)
      on conflict (school, sport) do update set
        division = coalesce(programs.division, excluded.division),
        conference = coalesce(programs.conference, excluded.conference),
        state = coalesce(programs.state, excluded.state),
        updated_at = now();
    end if;
  end if;

  update roster_candidates
  set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now()
  where id = p_id;

  return v_coach_id;
end;
$$;

grant execute on function resolve_roster_candidate(uuid, boolean) to anon, authenticated;
