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
