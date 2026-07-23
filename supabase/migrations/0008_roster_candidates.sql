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
