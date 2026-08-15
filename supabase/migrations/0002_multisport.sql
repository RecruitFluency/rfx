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
