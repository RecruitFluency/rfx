-- VEKT Coach Portal — schema, row-level security and server-side send rules.
--
-- College coaches add prospects (and the prospects' club coaches/directors),
-- send SMS/email invitations through GoHighLevel to start a VEKT conversation,
-- and track each invitation through to the finished Prospect Brief.
--
-- Everything here is prefixed `portal_` so it never collides with the Coach
-- Database tables from 0001. Unlike 0001, every table is locked down by RLS:
-- a coach sees only their own program, a department never sees another
-- department, and nobody but the service role can read raw agent transcripts
-- (triple-blind). Coaches never write invitations directly; they call
-- portal_queue_invitations(), which enforces every pre-send rule.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tenancy: departments, programs, staff
-- ---------------------------------------------------------------------------

create table portal_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  division text not null check (division in ('NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA')),
  conference text,
  time_zone text not null default 'America/New_York',
  license_type text not null default 'per_sport' check (license_type in ('all_sports', 'per_sport')),
  license_start date,
  license_end date,
  billing_status text not null default 'invoiced' check (billing_status in ('trial', 'invoiced', 'paid', 'overdue')),
  -- When on, every send waits for a Compliance Officer to approve it.
  approval_mode boolean not null default false,
  -- 'enforce' blocks sends with no matching contact rule; 'warn' allows them.
  contact_rule_mode text not null default 'enforce' check (contact_rule_mode in ('enforce', 'warn')),
  retention_days integer not null default 730 check (retention_days > 0),
  created_at timestamptz not null default now()
);

create table portal_programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references portal_departments(id) on delete cascade,
  sport text not null,
  gender text not null check (gender in ('mens', 'womens', 'coed')),
  licensed boolean not null default false,
  -- Days after the first invite to send a reminder if the prospect hasn't started.
  reminder_days integer[] not null default '{3,7}',
  created_at timestamptz not null default now(),
  unique (department_id, sport, gender)
);

create table portal_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  department_id uuid not null references portal_departments(id) on delete cascade,
  role text not null check (role in ('dept_admin', 'head_coach', 'assistant_coach', 'compliance')),
  first_name text not null,
  last_name text not null,
  title text,
  email text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint portal_staff_edu_email check (lower(email) ~ '^[^@\s]+@[^@\s]+\.edu$')
);
create unique index portal_staff_email_idx on portal_staff (lower(email));

create table portal_staff_programs (
  staff_id uuid not null references portal_staff(id) on delete cascade,
  program_id uuid not null references portal_programs(id) on delete cascade,
  primary key (staff_id, program_id)
);

-- VEKT employees who administer every department.
create table portal_super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- How the staff coaches; feeds the Coach Agent's read of each program.
create table portal_coach_style_profiles (
  program_id uuid primary key references portal_programs(id) on delete cascade,
  coaching_style text,
  accountability text,
  culture text,
  locker_room text,
  updated_by uuid references portal_staff(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Prospects and club contacts
-- ---------------------------------------------------------------------------

create table portal_prospects (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references portal_programs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  mobile text,
  email text,
  grad_year integer check (grad_year between 2000 and 2100),
  dob date,
  positions text[] not null default '{}',
  sport_details jsonb not null default '{}',
  high_school text,
  club_team text,
  club_level text,
  city text,
  state text,
  time_zone text,
  film_links text[] not null default '{}',
  gpa numeric(3, 2) check (gpa is null or gpa between 0 and 5),
  guardian_name text,
  guardian_mobile text,
  guardian_email text,
  guardian_relationship text,
  priority text not null default 'B' check (priority in ('A', 'B', 'C')),
  tags text[] not null default '{}',
  notes text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'api')),
  created_by uuid references portal_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_prospects_mobile_e164 check (mobile is null or mobile ~ '^\+[1-9][0-9]{7,14}$'),
  constraint portal_prospects_guardian_mobile_e164 check (guardian_mobile is null or guardian_mobile ~ '^\+[1-9][0-9]{7,14}$')
);
create unique index portal_prospects_mobile_idx on portal_prospects (program_id, mobile) where mobile is not null;
create unique index portal_prospects_email_idx on portal_prospects (program_id, lower(email)) where email is not null;
create index portal_prospects_program_idx on portal_prospects (program_id, grad_year);

create table portal_club_contacts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references portal_programs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null default 'club_director' check (role in ('club_director', 'club_coach')),
  club text,
  mobile text,
  email text,
  time_zone text,
  created_at timestamptz not null default now(),
  constraint portal_club_contacts_mobile_e164 check (mobile is null or mobile ~ '^\+[1-9][0-9]{7,14}$')
);
create unique index portal_club_contacts_mobile_idx on portal_club_contacts (program_id, mobile) where mobile is not null;

create table portal_prospect_club_contacts (
  prospect_id uuid not null references portal_prospects(id) on delete cascade,
  club_contact_id uuid not null references portal_club_contacts(id) on delete cascade,
  primary key (prospect_id, club_contact_id)
);

-- ---------------------------------------------------------------------------
-- Messaging: templates, contact rules, suppressions, invitations, events
-- ---------------------------------------------------------------------------

create table portal_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('sms', 'email')),
  recipient_type text not null check (recipient_type in ('athlete', 'guardian', 'club_contact')),
  kind text not null default 'invite' check (kind in ('invite', 'reminder')),
  subject text,
  -- Merge fields: {{first_name}} {{coach_name}} {{program_name}} {{school}}
  -- {{athlete_name}} {{start_link}} {{personal_note}}
  body text not null,
  active boolean not null default true,
  approved_by text,
  created_at timestamptz not null default now()
);

-- When a division/sport allows recruiting contact for a given grad year:
-- contact opens on (grad_year - years_before_grad)-month-day.
-- Values must come from a compliance professional; rows seeded for demos
-- carry verified = false.
create table portal_contact_rules (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references portal_departments(id) on delete cascade, -- null = VEKT default for every department
  division text not null check (division in ('NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA')),
  sport text, -- null = every sport in the division
  gender text check (gender in ('mens', 'womens', 'coed')),
  years_before_grad integer not null check (years_before_grad between 0 and 6),
  permitted_month integer not null check (permitted_month between 1 and 12),
  permitted_day integer not null check (permitted_day between 1 and 31),
  verified boolean not null default false,
  source_note text,
  updated_by uuid references portal_staff(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table portal_suppressions (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('sms', 'email')),
  value text not null,
  reason text not null check (reason in ('stop', 'bounce', 'complaint', 'manual', 'deletion')),
  source text,
  created_at timestamptz not null default now(),
  unique (channel, value)
);

create table portal_invitation_batches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references portal_programs(id) on delete cascade,
  sent_by uuid references portal_staff(id) on delete set null,
  channels text[] not null,
  personal_note text,
  requested_for timestamptz,
  created_at timestamptz not null default now()
);

create table portal_invitations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references portal_invitation_batches(id) on delete set null,
  program_id uuid not null references portal_programs(id) on delete cascade,
  prospect_id uuid not null references portal_prospects(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('athlete', 'guardian', 'club_contact')),
  club_contact_id uuid references portal_club_contacts(id) on delete cascade,
  recipient_name text not null,
  to_phone text,
  to_email text,
  channel text not null check (channel in ('sms', 'email')),
  template_id uuid references portal_templates(id) on delete set null,
  rendered_subject text,
  rendered_body text not null,
  personal_note text,
  scheduled_for timestamptz not null default now(),
  status text not null default 'queued' check (status in (
    'pending_approval', 'queued', 'sending', 'sent', 'delivered', 'clicked', 'replied',
    'started', 'completed', 'failed', 'blocked', 'cancelled', 'rejected', 'opted_out')),
  status_detail text,
  start_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  token_expires_at timestamptz not null default now() + interval '30 days',
  token_used_at timestamptz,
  ghl_contact_id text,
  ghl_message_id text,
  sent_by uuid references portal_staff(id) on delete set null,
  sent_at timestamptz,
  delivered_at timestamptz,
  clicked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  reminder_of uuid references portal_invitations(id) on delete cascade,
  reminder_number integer not null default 0,
  approved_by uuid references portal_staff(id) on delete set null,
  approved_at timestamptz,
  compliance_override boolean not null default false,
  override_reason text,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_invitations_target check (
    (channel = 'sms' and to_phone is not null) or (channel = 'email' and to_email is not null)
    or status = 'blocked')
);
create index portal_invitations_program_idx on portal_invitations (program_id, created_at desc);
create index portal_invitations_prospect_idx on portal_invitations (prospect_id, created_at desc);
create index portal_invitations_due_idx on portal_invitations (scheduled_for) where status = 'queued';
create index portal_invitations_ghl_msg_idx on portal_invitations (ghl_message_id) where ghl_message_id is not null;

create table portal_message_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references portal_invitations(id) on delete cascade,
  event text not null check (event in (
    'queued', 'approved', 'rejected', 'blocked', 'released', 'cancelled', 'sending', 'sent', 'delivered',
    'failed', 'bounced', 'opened', 'clicked', 'replied', 'started', 'completed', 'opted_out', 'opted_in')),
  provider text not null default 'system' check (provider in ('system', 'ghl', 'agent')),
  provider_event_id text,
  detail text,
  payload jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index portal_message_events_provider_idx on portal_message_events (provider, provider_event_id)
  where provider_event_id is not null;
create index portal_message_events_invitation_idx on portal_message_events (invitation_id, occurred_at);

-- ---------------------------------------------------------------------------
-- VEKT read results. Coaches see reads and briefs; never transcripts.
-- ---------------------------------------------------------------------------

create table portal_reads (
  prospect_id uuid primary key references portal_prospects(id) on delete cascade,
  program_id uuid not null references portal_programs(id) on delete cascade,
  athlete_status text not null default 'not_started' check (athlete_status in ('not_started', 'invited', 'in_progress', 'complete')),
  director_status text not null default 'not_started' check (director_status in ('not_started', 'invited', 'in_progress', 'complete')),
  brief_status text not null default 'none' check (brief_status in ('none', 'in_progress', 'ready')),
  brief_id uuid,
  updated_at timestamptz not null default now()
);

create table portal_briefs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references portal_prospects(id) on delete cascade,
  program_id uuid not null references portal_programs(id) on delete cascade,
  version integer not null default 1,
  plays text,
  takes_coaching text,
  locker_room text,
  against_staff text,
  summary text,
  created_at timestamptz not null default now(),
  unique (prospect_id, version)
);

-- Raw agent conversations. RLS is enabled with NO policies, so only the
-- service role (the agent service) can read or write them. This is the
-- database-level guarantee behind "triple-blind".
create table portal_agent_transcripts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references portal_prospects(id) on delete cascade,
  agent text not null check (agent in ('athlete', 'director', 'coach')),
  transcript jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table portal_notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references portal_staff(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index portal_notifications_staff_idx on portal_notifications (staff_id, created_at desc);

create table portal_audit_log (
  id bigint generated always as identity primary key,
  department_id uuid references portal_departments(id) on delete cascade,
  actor_user_id uuid,
  actor_staff_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index portal_audit_log_dept_idx on portal_audit_log (department_id, created_at desc);

create or replace function portal_audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'portal_audit_log is append-only';
end $$;
create trigger portal_audit_log_no_update before update or delete on portal_audit_log
  for each row execute function portal_audit_log_immutable();

-- Prices are configuration, not code. Amounts in US cents per year.
create table portal_pricing (
  key text primary key check (key in ('all_sports', 'single_sport', 'additional_sport')),
  amount_cents integer not null check (amount_cents >= 0),
  updated_at timestamptz not null default now()
);
insert into portal_pricing (key, amount_cents) values
  ('all_sports', 2500000), ('single_sport', 500000), ('additional_sport', 250000);

create table portal_settings (
  key text primary key,
  value text not null
);
insert into portal_settings (key, value) values
  ('start_link_base', 'http://127.0.0.1:54321/functions/v1/portal-start'),
  ('dedupe_days', '14'),
  ('max_reminders', '2'),
  ('max_send_attempts', '5');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function portal_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger portal_prospects_touch before update on portal_prospects
  for each row execute function portal_touch_updated_at();
create trigger portal_invitations_touch before update on portal_invitations
  for each row execute function portal_touch_updated_at();

-- US-first phone normalization to E.164. Returns null when it can't be sure.
create or replace function portal_normalize_phone(p text) returns text
language plpgsql immutable as $$
declare digits text;
begin
  if p is null or btrim(p) = '' then return null; end if;
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  if btrim(p) like '+%' then
    if length(digits) between 8 and 15 and left(digits, 1) <> '0' then return '+' || digits; end if;
    return null;
  end if;
  if length(digits) = 10 then return '+1' || digits; end if;
  if length(digits) = 11 and left(digits, 1) = '1' then return '+' || digits; end if;
  return null;
end $$;

create or replace function portal_normalize_email(p text) returns text
language sql immutable as $$
  select case when lower(btrim(p)) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(btrim(p)) end
$$;

-- Primary time zone for a US state (or DC). Used when a recipient has none.
create or replace function portal_state_time_zone(p_state text) returns text
language sql immutable as $$
  select case upper(btrim(coalesce(p_state, '')))
    when 'HI' then 'Pacific/Honolulu'
    when 'AK' then 'America/Anchorage'
    when 'AZ' then 'America/Phoenix'
    when 'WA' then 'America/Los_Angeles' when 'OR' then 'America/Los_Angeles'
    when 'CA' then 'America/Los_Angeles' when 'NV' then 'America/Los_Angeles'
    when 'ID' then 'America/Boise' when 'MT' then 'America/Denver' when 'WY' then 'America/Denver'
    when 'UT' then 'America/Denver' when 'CO' then 'America/Denver' when 'NM' then 'America/Denver'
    when 'ND' then 'America/Chicago' when 'SD' then 'America/Chicago' when 'NE' then 'America/Chicago'
    when 'KS' then 'America/Chicago' when 'OK' then 'America/Chicago' when 'TX' then 'America/Chicago'
    when 'MN' then 'America/Chicago' when 'IA' then 'America/Chicago' when 'MO' then 'America/Chicago'
    when 'AR' then 'America/Chicago' when 'LA' then 'America/Chicago' when 'WI' then 'America/Chicago'
    when 'IL' then 'America/Chicago' when 'MS' then 'America/Chicago' when 'AL' then 'America/Chicago'
    when 'TN' then 'America/Chicago'
    when '' then null
    else 'America/New_York'
  end
$$;

-- Next moment SMS may go out: 9:00–20:00 in the recipient's local time.
create or replace function portal_next_send_window(p_at timestamptz, p_tz text) returns timestamptz
language plpgsql stable as $$
declare
  tz text := coalesce(p_tz, 'America/New_York');
  local_ts timestamp := p_at at time zone tz;
begin
  if extract(hour from local_ts) < 9 then
    return (date_trunc('day', local_ts) + interval '9 hours') at time zone tz;
  elsif extract(hour from local_ts) >= 20 then
    return (date_trunc('day', local_ts) + interval '1 day 9 hours') at time zone tz;
  end if;
  return p_at;
end $$;

-- Conservative: a prospect counts as a minor unless their DOB shows 18+,
-- or (with no DOB) they graduated high school before this calendar year.
create or replace function portal_is_minor(p_dob date, p_grad_year integer) returns boolean
language sql stable as $$
  select case
    when p_dob is not null then p_dob > (current_date - interval '18 years')::date
    when p_grad_year is not null then p_grad_year >= extract(year from current_date)::int
    else true
  end
$$;

create or replace function portal_status_rank(p_status text) returns integer
language sql immutable as $$
  select case p_status
    when 'pending_approval' then 0 when 'queued' then 1 when 'sending' then 2
    when 'sent' then 3 when 'delivered' then 4 when 'clicked' then 5 when 'replied' then 5
    when 'started' then 6 when 'completed' then 7
    else 100 -- terminal: failed, blocked, cancelled, rejected, opted_out
  end
$$;

create or replace function portal_quote_cents(p_sports integer) returns integer
language sql stable as $$
  select least(
    (select amount_cents from portal_pricing where key = 'all_sports'),
    case when p_sports <= 0 then 0 else
      (select amount_cents from portal_pricing where key = 'single_sport')
      + (p_sports - 1) * (select amount_cents from portal_pricing where key = 'additional_sport')
    end)
$$;

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create or replace function portal_is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from portal_super_admins where user_id = auth.uid())
$$;

create or replace function portal_my_staff() returns portal_staff
language sql stable security definer set search_path = public as $$
  select * from portal_staff where user_id = auth.uid() and active limit 1
$$;

create or replace function portal_my_department_id() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from portal_staff where user_id = auth.uid() and active limit 1
$$;

create or replace function portal_can_access_program(p_program_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select portal_is_super_admin() or exists (
    select 1 from portal_staff s
    join portal_programs p on p.department_id = s.department_id
    where s.user_id = auth.uid() and s.active and p.id = p_program_id
      and (s.role in ('dept_admin', 'compliance')
           or exists (select 1 from portal_staff_programs sp where sp.staff_id = s.id and sp.program_id = p.id)))
$$;

create or replace function portal_can_edit_program(p_program_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select portal_is_super_admin() or exists (
    select 1 from portal_staff s
    join portal_staff_programs sp on sp.staff_id = s.id
    where s.user_id = auth.uid() and s.active and sp.program_id = p_program_id
      and s.role in ('head_coach', 'assistant_coach'))
$$;

create or replace function portal_has_dept_role(p_department_id uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select portal_is_super_admin() or exists (
    select 1 from portal_staff
    where user_id = auth.uid() and active and department_id = p_department_id and role = any (p_roles))
$$;

create or replace function portal_program_licensed(p_program_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from portal_programs p join portal_departments d on d.id = p.department_id
    where p.id = p_program_id
      and (d.license_type = 'all_sports' or p.licensed)
      and d.license_start is not null and d.license_start <= current_date
      and (d.license_end is null or d.license_end >= current_date)
      and d.billing_status <> 'overdue')
$$;

create or replace function portal_audit(p_department_id uuid, p_action text, p_entity text, p_entity_id uuid, p_detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into portal_audit_log (department_id, actor_user_id, actor_staff_id, action, entity, entity_id, detail)
  values (p_department_id, auth.uid(), (portal_my_staff()).id, p_action, p_entity, p_entity_id, coalesce(p_detail, '{}'))
$$;

-- On first sign-in, link the auth user to the staff row a department admin
-- created for their (.edu) email. Access is invite-only.
create or replace function portal_claim_staff() returns portal_staff
language plpgsql security definer set search_path = public as $$
declare
  me portal_staff;
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into me from portal_staff where user_id = auth.uid();
  if found then return me; end if;
  update portal_staff set user_id = auth.uid()
    where lower(email) = my_email and user_id is null and active
    returning * into me;
  if found then
    perform portal_audit(me.department_id, 'staff.claimed', 'staff', me.id, jsonb_build_object('email', my_email));
  end if;
  return me;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table portal_departments enable row level security;
alter table portal_programs enable row level security;
alter table portal_staff enable row level security;
alter table portal_staff_programs enable row level security;
alter table portal_super_admins enable row level security;
alter table portal_coach_style_profiles enable row level security;
alter table portal_prospects enable row level security;
alter table portal_club_contacts enable row level security;
alter table portal_prospect_club_contacts enable row level security;
alter table portal_templates enable row level security;
alter table portal_contact_rules enable row level security;
alter table portal_suppressions enable row level security;
alter table portal_invitation_batches enable row level security;
alter table portal_invitations enable row level security;
alter table portal_message_events enable row level security;
alter table portal_reads enable row level security;
alter table portal_briefs enable row level security;
alter table portal_agent_transcripts enable row level security; -- no policies: service role only
alter table portal_notifications enable row level security;
alter table portal_audit_log enable row level security;
alter table portal_pricing enable row level security;
alter table portal_settings enable row level security;

create policy portal_departments_select on portal_departments for select to authenticated
  using (portal_is_super_admin() or id = portal_my_department_id());
create policy portal_departments_admin on portal_departments for all to authenticated
  using (portal_is_super_admin()) with check (portal_is_super_admin());

create policy portal_programs_select on portal_programs for select to authenticated
  using (portal_can_access_program(id));
create policy portal_programs_admin on portal_programs for all to authenticated
  using (portal_is_super_admin()) with check (portal_is_super_admin());

create policy portal_staff_select on portal_staff for select to authenticated
  using (portal_is_super_admin() or department_id = portal_my_department_id());
create policy portal_staff_manage on portal_staff for all to authenticated
  using (portal_has_dept_role(department_id, array['dept_admin']))
  with check (portal_has_dept_role(department_id, array['dept_admin']));

create policy portal_staff_programs_select on portal_staff_programs for select to authenticated
  using (portal_can_access_program(program_id));
create policy portal_staff_programs_manage on portal_staff_programs for all to authenticated
  using (portal_has_dept_role((select department_id from portal_programs where id = program_id), array['dept_admin']))
  with check (portal_has_dept_role((select department_id from portal_programs where id = program_id), array['dept_admin']));

create policy portal_super_admins_select on portal_super_admins for select to authenticated
  using (user_id = auth.uid());

create policy portal_style_select on portal_coach_style_profiles for select to authenticated
  using (portal_can_access_program(program_id));
create policy portal_style_write on portal_coach_style_profiles for all to authenticated
  using (portal_can_edit_program(program_id)) with check (portal_can_edit_program(program_id));

create policy portal_prospects_select on portal_prospects for select to authenticated
  using (portal_can_access_program(program_id));
create policy portal_prospects_write on portal_prospects for all to authenticated
  using (portal_can_edit_program(program_id)) with check (portal_can_edit_program(program_id));

create policy portal_club_contacts_select on portal_club_contacts for select to authenticated
  using (portal_can_access_program(program_id));
create policy portal_club_contacts_write on portal_club_contacts for all to authenticated
  using (portal_can_edit_program(program_id)) with check (portal_can_edit_program(program_id));

create policy portal_pcc_select on portal_prospect_club_contacts for select to authenticated
  using (portal_can_access_program((select program_id from portal_prospects where id = prospect_id)));
create policy portal_pcc_write on portal_prospect_club_contacts for all to authenticated
  using (portal_can_edit_program((select program_id from portal_prospects where id = prospect_id)))
  with check (
    portal_can_edit_program((select program_id from portal_prospects where id = prospect_id))
    and (select program_id from portal_prospects where id = prospect_id)
      = (select program_id from portal_club_contacts where id = club_contact_id));

create policy portal_templates_select on portal_templates for select to authenticated
  using (active or portal_is_super_admin());
create policy portal_templates_admin on portal_templates for all to authenticated
  using (portal_is_super_admin()) with check (portal_is_super_admin());

create policy portal_contact_rules_select on portal_contact_rules for select to authenticated
  using (department_id is null or portal_is_super_admin() or department_id = portal_my_department_id());
create policy portal_contact_rules_write on portal_contact_rules for all to authenticated
  using (case when department_id is null then portal_is_super_admin()
              else portal_has_dept_role(department_id, array['compliance']) end)
  with check (case when department_id is null then portal_is_super_admin()
                   else portal_has_dept_role(department_id, array['compliance']) end);

create policy portal_suppressions_admin on portal_suppressions for select to authenticated
  using (portal_is_super_admin());

create policy portal_batches_select on portal_invitation_batches for select to authenticated
  using (portal_can_access_program(program_id));

create policy portal_invitations_select on portal_invitations for select to authenticated
  using (portal_can_access_program(program_id));

create policy portal_events_select on portal_message_events for select to authenticated
  using (portal_can_access_program((select program_id from portal_invitations where id = invitation_id)));

create policy portal_reads_select on portal_reads for select to authenticated
  using (portal_can_access_program(program_id));

create policy portal_briefs_select on portal_briefs for select to authenticated
  using (portal_can_access_program(program_id));

create policy portal_notifications_own on portal_notifications for select to authenticated
  using (staff_id = (portal_my_staff()).id);
create policy portal_notifications_mark_read on portal_notifications for update to authenticated
  using (staff_id = (portal_my_staff()).id) with check (staff_id = (portal_my_staff()).id);

create policy portal_audit_select on portal_audit_log for select to authenticated
  using (portal_is_super_admin() or portal_has_dept_role(department_id, array['dept_admin', 'compliance']));

create policy portal_pricing_select on portal_pricing for select to authenticated using (true);
create policy portal_pricing_admin on portal_pricing for all to authenticated
  using (portal_is_super_admin()) with check (portal_is_super_admin());

create policy portal_settings_admin on portal_settings for all to authenticated
  using (portal_is_super_admin()) with check (portal_is_super_admin());

-- Keep a read row in step with each prospect.
create or replace function portal_prospects_init_read() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into portal_reads (prospect_id, program_id) values (new.id, new.program_id)
  on conflict (prospect_id) do nothing;
  return new;
end $$;
create trigger portal_prospects_read_row after insert on portal_prospects
  for each row execute function portal_prospects_init_read();

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------

create or replace function portal_render(p_text text, p_vars jsonb) returns text
language plpgsql immutable as $$
declare
  out text := coalesce(p_text, '');
  k text;
begin
  for k in select jsonb_object_keys(p_vars) loop
    out := replace(out, '{{' || k || '}}', coalesce(p_vars ->> k, ''));
  end loop;
  -- Drop any merge field nobody filled, then tidy blank lines it leaves.
  out := regexp_replace(out, '\{\{[a-z_]+\}\}', '', 'g');
  out := regexp_replace(out, E'\n{3,}', E'\n\n', 'g');
  return btrim(out);
end $$;

-- Legal text coaches cannot edit, appended to every message.
create or replace function portal_legal_footer(p_channel text) returns text
language sql immutable as $$
  select case p_channel
    when 'sms' then 'Reply STOP to opt out.'
    else E'You received this because a college coaching staff invited you to VEKT.\nReply "unsubscribe" or use the link below to stop these emails. VEKT AI Inc.'
  end
$$;

-- ---------------------------------------------------------------------------
-- Pre-send checks + queueing (the only way invitations get created)
-- ---------------------------------------------------------------------------

-- First date recruiting contact is permitted for this prospect, or null when
-- no rule matches. Department rules win over VEKT defaults; sport-specific
-- rules win over division-wide ones.
create or replace function portal_contact_permitted_from(p_program_id uuid, p_grad_year integer) returns date
language sql stable security definer set search_path = public as $$
  select make_date(p_grad_year - r.years_before_grad, r.permitted_month, r.permitted_day)
  from portal_programs p
  join portal_departments d on d.id = p.department_id
  join portal_contact_rules r on r.division = d.division
    and (r.department_id = d.id or r.department_id is null)
    and (r.sport is null or lower(r.sport) = lower(p.sport))
    and (r.gender is null or r.gender = p.gender)
  where p.id = p_program_id and p_grad_year is not null
  order by (r.department_id is not null) desc, (r.sport is not null) desc, (r.gender is not null) desc
  limit 1
$$;

create or replace function portal_queue_invitations(
  p_prospect_ids uuid[],
  p_channels text[],
  p_include_athlete boolean default true,
  p_include_club boolean default false,
  p_personal_note text default null,
  p_scheduled_for timestamptz default null,
  p_force boolean default false,
  p_dry_run boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me portal_staff := portal_my_staff();
  pr portal_prospects;
  prog portal_programs;
  dept portal_departments;
  cc portal_club_contacts;
  ch text;
  note text := nullif(left(btrim(coalesce(p_personal_note, '')), 280), '');
  batch uuid;
  results jsonb := '[]';
  queued_count integer := 0;
  blocked_count integer := 0;
  dedupe_days integer := (select value::int from portal_settings where key = 'dedupe_days');
  link_base text := (select value from portal_settings where key = 'start_link_base');
  coach_name text;
  permitted date;
  minor boolean;
  base_status text;
  rec record;
  r jsonb;
begin
  if me.id is null and not portal_is_super_admin() then
    raise exception 'Not a VEKT portal user';
  end if;
  if p_channels is null or cardinality(p_channels) = 0
     or not p_channels <@ array['sms', 'email'] then
    raise exception 'Choose SMS, email or both';
  end if;
  if cardinality(p_prospect_ids) > 500 then
    raise exception 'Send to at most 500 prospects at a time';
  end if;
  coach_name := btrim(coalesce(me.first_name, '') || ' ' || coalesce(me.last_name, ''));

  for pr in select * from portal_prospects where id = any (p_prospect_ids) order by last_name, first_name loop
    if not portal_can_edit_program(pr.program_id) then
      raise exception 'You do not have access to prospect %', pr.id;
    end if;
    select * into prog from portal_programs where id = pr.program_id;
    select * into dept from portal_departments where id = prog.department_id;
    if not portal_program_licensed(prog.id) then
      raise exception '% % is not licensed. Contact your athletic department or VEKT.',
        initcap(prog.gender), prog.sport;
    end if;

    if batch is null and not p_dry_run then
      insert into portal_invitation_batches (program_id, sent_by, channels, personal_note, requested_for)
      values (prog.id, me.id, p_channels, note, p_scheduled_for) returning id into batch;
    end if;

    minor := portal_is_minor(pr.dob, pr.grad_year);
    permitted := portal_contact_permitted_from(prog.id, pr.grad_year);
    base_status := case when dept.approval_mode then 'pending_approval' else 'queued' end;

    -- Build the recipient list for this prospect: athlete (+ guardian copy
    -- for minors) and, optionally, each linked club contact.
    for rec in
      select 'athlete'::text as rtype, null::uuid as club_id,
             btrim(coalesce(pr.preferred_name, pr.first_name) || ' ' || pr.last_name) as rname,
             pr.mobile as phone, pr.email as email,
             coalesce(pr.time_zone, portal_state_time_zone(pr.state), dept.time_zone) as tz,
             coalesce(pr.preferred_name, pr.first_name) as first
      where p_include_athlete
      union all
      select 'guardian', null, coalesce(pr.guardian_name, 'Parent/guardian of ' || pr.first_name),
             pr.guardian_mobile, pr.guardian_email,
             coalesce(pr.time_zone, portal_state_time_zone(pr.state), dept.time_zone),
             coalesce(nullif(split_part(coalesce(pr.guardian_name, ''), ' ', 1), ''), 'there')
      where p_include_athlete and minor and (pr.guardian_mobile is not null or pr.guardian_email is not null)
      union all
      select 'club_contact', c.id, btrim(c.first_name || ' ' || c.last_name), c.mobile, c.email,
             coalesce(c.time_zone, dept.time_zone), c.first_name
      from portal_prospect_club_contacts pcc join portal_club_contacts c on c.id = pcc.club_contact_id
      where p_include_club and pcc.prospect_id = pr.id
    loop
      foreach ch in array p_channels loop
        declare
          target text := case when ch = 'sms' then rec.phone else rec.email end;
          reason text := null;
          tpl portal_templates;
          vars jsonb;
          body text;
          subj text;
          send_at timestamptz;
          tok text := encode(extensions.gen_random_bytes(18), 'hex');
          inv_id uuid;
          last_sent timestamptz;
        begin
          select * into tpl from portal_templates
            where active and kind = 'invite' and channel = ch and recipient_type = rec.rtype
            order by created_at limit 1;

          if target is null then
            -- Missing a channel for one recipient isn't worth a blocked row
            -- when they can be reached on another channel in this batch.
            if exists (select 1 from unnest(p_channels) c2
                       where c2 <> ch and (case when c2 = 'sms' then rec.phone else rec.email end) is not null) then
              continue;
            end if;
            reason := case when ch = 'sms' then 'No mobile number on file' else 'No email on file' end;
          elsif tpl.id is null then
            reason := 'No approved template for this recipient and channel';
          elsif exists (select 1 from portal_suppressions s where s.channel = ch
                        and s.value = case when ch = 'email' then lower(target) else target end) then
            reason := 'Recipient has opted out';
          elsif rec.rtype = 'athlete' and minor and pr.guardian_mobile is null and pr.guardian_email is null then
            reason := 'Minor: a parent/guardian contact is required before inviting';
          elsif rec.rtype in ('athlete', 'guardian') and permitted is null and dept.contact_rule_mode = 'enforce' then
            reason := 'No recruiting-contact rule configured for this sport. Compliance must add one.';
          elsif rec.rtype in ('athlete', 'guardian') and permitted is not null and current_date < permitted
                and coalesce(p_scheduled_for, now())::date < permitted then
            reason := 'Recruiting contact not permitted until ' || to_char(permitted, 'Mon DD, YYYY');
          end if;

          if reason is null and not p_force then
            select max(i.created_at) into last_sent from portal_invitations i
              where i.prospect_id = pr.id and i.recipient_type = rec.rtype and i.channel = ch
                and coalesce(i.club_contact_id, '00000000-0000-0000-0000-000000000000'::uuid)
                    = coalesce(rec.club_id, '00000000-0000-0000-0000-000000000000'::uuid)
                and i.status not in ('failed', 'blocked', 'cancelled', 'rejected')
                and i.created_at > now() - make_interval(days => dedupe_days);
            if last_sent is not null then
              reason := 'Already invited on ' || to_char(last_sent, 'Mon DD') || '. Use resend to send again.';
            end if;
          end if;

          vars := jsonb_build_object(
            'first_name', rec.first,
            'athlete_name', coalesce(pr.preferred_name, pr.first_name),
            'coach_name', nullif(coach_name, ''),
            'program_name', initcap(prog.gender) || ' ' || prog.sport,
            'school', dept.name,
            'start_link', link_base || '?t=' || tok,
            'personal_note', note);
          body := portal_render(tpl.body, vars) || E'\n\n' || portal_legal_footer(ch);
          subj := portal_render(tpl.subject, vars);
          send_at := coalesce(p_scheduled_for, now());
          if ch = 'sms' then send_at := portal_next_send_window(send_at, rec.tz); end if;

          if not p_dry_run then
            insert into portal_invitations (
              batch_id, program_id, prospect_id, recipient_type, club_contact_id, recipient_name,
              to_phone, to_email, channel, template_id, rendered_subject, rendered_body, personal_note,
              scheduled_for, status, status_detail, start_token, sent_by)
            values (
              batch, prog.id, pr.id, rec.rtype, rec.club_id, rec.rname,
              case when ch = 'sms' then target end, case when ch = 'email' then target end, ch, tpl.id,
              subj, coalesce(nullif(body, ''), '(blocked)'), note, send_at,
              case when reason is null then base_status else 'blocked' end, reason, tok, me.id)
            returning id into inv_id;
            insert into portal_message_events (invitation_id, event, detail)
            values (inv_id, case when reason is null then 'queued' else 'blocked' end, reason);
            if reason is null and rec.rtype = 'athlete' then
              update portal_reads set athlete_status = 'invited', updated_at = now()
                where prospect_id = pr.id and athlete_status = 'not_started';
            elsif reason is null and rec.rtype = 'club_contact' then
              update portal_reads set director_status = 'invited', updated_at = now()
                where prospect_id = pr.id and director_status = 'not_started';
            end if;
          end if;

          r := jsonb_build_object(
            'invitation_id', inv_id, 'prospect_id', pr.id, 'prospect_name', pr.first_name || ' ' || pr.last_name,
            'recipient_type', rec.rtype, 'recipient_name', rec.rname, 'channel', ch, 'to', target,
            'status', case when reason is null then base_status else 'blocked' end,
            'reason', reason, 'scheduled_for', send_at, 'subject', subj, 'body', body);
          results := results || r;
          if reason is null then queued_count := queued_count + 1; else blocked_count := blocked_count + 1; end if;
        end;
      end loop;
    end loop;
  end loop;

  if not p_dry_run and batch is not null then
    perform portal_audit(dept.id, 'invitations.queued', 'invitation_batch', batch,
      jsonb_build_object('queued', queued_count, 'blocked', blocked_count, 'channels', p_channels,
                         'prospects', cardinality(p_prospect_ids), 'forced', p_force));
  end if;

  return jsonb_build_object('batch_id', batch, 'queued', queued_count, 'blocked', blocked_count,
                            'dry_run', p_dry_run, 'results', results);
end $$;

create or replace function portal_cancel_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare inv portal_invitations;
begin
  select * into inv from portal_invitations where id = p_invitation_id;
  if inv.id is null or not portal_can_edit_program(inv.program_id) then raise exception 'Invitation not found'; end if;
  if inv.status not in ('pending_approval', 'queued') then
    raise exception 'Only invitations that have not been sent can be cancelled';
  end if;
  update portal_invitations set status = 'cancelled', status_detail = 'Cancelled by coach' where id = inv.id;
  insert into portal_message_events (invitation_id, event) values (inv.id, 'cancelled');
  perform portal_audit((select department_id from portal_programs where id = inv.program_id),
    'invitation.cancelled', 'invitation', inv.id, '{}');
end $$;

create or replace function portal_resend_invitation(p_invitation_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv portal_invitations;
begin
  select * into inv from portal_invitations where id = p_invitation_id;
  if inv.id is null or not portal_can_edit_program(inv.program_id) then raise exception 'Invitation not found'; end if;
  return portal_queue_invitations(
    array[inv.prospect_id], array[inv.channel],
    inv.recipient_type in ('athlete', 'guardian'), inv.recipient_type = 'club_contact',
    inv.personal_note, null, true, false);
end $$;

-- Compliance: approve/reject a pending send, or release a blocked one with a
-- logged reason (e.g. a contact-rule override). Opt-outs can never be released.
create or replace function portal_review_invitation(p_invitation_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv portal_invitations;
  dept_id uuid;
  me portal_staff := portal_my_staff();
begin
  select * into inv from portal_invitations where id = p_invitation_id;
  dept_id := (select department_id from portal_programs where id = inv.program_id);
  if inv.id is null or not portal_has_dept_role(dept_id, array['compliance']) then
    raise exception 'Only a compliance officer can review sends';
  end if;
  if p_decision = 'approve' and inv.status = 'pending_approval' then
    update portal_invitations set status = 'queued', approved_by = me.id, approved_at = now() where id = inv.id;
    insert into portal_message_events (invitation_id, event) values (inv.id, 'approved');
  elsif p_decision = 'reject' and inv.status in ('pending_approval', 'blocked') then
    update portal_invitations set status = 'rejected', status_detail = p_reason, approved_by = me.id, approved_at = now()
      where id = inv.id;
    insert into portal_message_events (invitation_id, event, detail) values (inv.id, 'rejected', p_reason);
  elsif p_decision = 'release' and inv.status = 'blocked' then
    if coalesce(btrim(p_reason), '') = '' then raise exception 'A reason is required to override a block'; end if;
    if inv.status_detail like 'Recipient has opted out%' or inv.status_detail like 'No %'
       or inv.status_detail like 'Minor:%' then
      raise exception 'This block cannot be overridden: %', inv.status_detail;
    end if;
    update portal_invitations set status = 'queued', compliance_override = true, override_reason = p_reason,
      approved_by = me.id, approved_at = now(),
      scheduled_for = case when channel = 'sms' then portal_next_send_window(now(),
        (select coalesce(pr.time_zone, portal_state_time_zone(pr.state)) from portal_prospects pr where pr.id = inv.prospect_id))
        else now() end
      where id = inv.id;
    insert into portal_message_events (invitation_id, event, detail) values (inv.id, 'released', p_reason);
  else
    raise exception 'Cannot % an invitation that is %', p_decision, inv.status;
  end if;
  perform portal_audit(dept_id, 'invitation.' || p_decision, 'invitation', inv.id,
    jsonb_build_object('reason', p_reason, 'previous_status', inv.status, 'block_reason', inv.status_detail));
end $$;

-- CSV import: rows already mapped to prospect fields by the client. Validates
-- and dedupes server-side; returns per-row outcomes.
create or replace function portal_import_prospects(p_program_id uuid, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me portal_staff := portal_my_staff();
  row jsonb;
  idx integer := 0;
  phone text; email text; gphone text; gemail text;
  existing uuid;
  new_id uuid;
  cc_id uuid;
  cc_phone text;
  inserted integer := 0; skipped integer := 0; failed integer := 0;
  outcomes jsonb := '[]';
begin
  if not portal_can_edit_program(p_program_id) then raise exception 'You do not have access to this program'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'Import at most 2,000 rows at a time'; end if;

  for row in select * from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    phone := portal_normalize_phone(row ->> 'mobile');
    email := portal_normalize_email(row ->> 'email');
    gphone := portal_normalize_phone(row ->> 'guardian_mobile');
    gemail := portal_normalize_email(row ->> 'guardian_email');
    begin
      if coalesce(btrim(row ->> 'first_name'), '') = '' or coalesce(btrim(row ->> 'last_name'), '') = '' then
        raise exception 'First and last name are required';
      end if;
      if nullif(btrim(row ->> 'mobile'), '') is not null and phone is null then
        raise exception 'Mobile number "%" is not a valid phone number', row ->> 'mobile';
      end if;
      if nullif(btrim(row ->> 'email'), '') is not null and email is null then
        raise exception 'Email "%" is not valid', row ->> 'email';
      end if;
      if phone is null and email is null then raise exception 'A mobile number or email is required'; end if;

      select id into existing from portal_prospects p
        where p.program_id = p_program_id
          and ((phone is not null and p.mobile = phone)
               or (email is not null and lower(p.email) = email)
               or (lower(p.first_name) = lower(btrim(row ->> 'first_name'))
                   and lower(p.last_name) = lower(btrim(row ->> 'last_name'))
                   and p.grad_year is not distinct from nullif(row ->> 'grad_year', '')::int))
        limit 1;
      if existing is not null then
        skipped := skipped + 1;
        outcomes := outcomes || jsonb_build_object('row', idx, 'status', 'duplicate', 'prospect_id', existing);
        continue;
      end if;

      insert into portal_prospects (
        program_id, first_name, last_name, preferred_name, mobile, email, grad_year, dob, positions,
        high_school, club_team, club_level, city, state, film_links, gpa, guardian_name, guardian_mobile,
        guardian_email, guardian_relationship, priority, tags, notes, source, created_by)
      values (
        p_program_id, btrim(row ->> 'first_name'), btrim(row ->> 'last_name'), nullif(btrim(row ->> 'preferred_name'), ''),
        phone, email, nullif(row ->> 'grad_year', '')::int, nullif(row ->> 'dob', '')::date,
        coalesce((select array_agg(btrim(x)) from jsonb_array_elements_text(coalesce(row -> 'positions', '[]')) x where btrim(x) <> ''), '{}'),
        nullif(btrim(row ->> 'high_school'), ''), nullif(btrim(row ->> 'club_team'), ''), nullif(btrim(row ->> 'club_level'), ''),
        nullif(btrim(row ->> 'city'), ''), nullif(upper(btrim(row ->> 'state')), ''),
        coalesce((select array_agg(btrim(x)) from jsonb_array_elements_text(coalesce(row -> 'film_links', '[]')) x where btrim(x) <> ''), '{}'),
        nullif(row ->> 'gpa', '')::numeric, nullif(btrim(row ->> 'guardian_name'), ''), gphone, gemail,
        nullif(btrim(row ->> 'guardian_relationship'), ''),
        coalesce(nullif(upper(btrim(row ->> 'priority')), ''), 'B'),
        coalesce((select array_agg(btrim(x)) from jsonb_array_elements_text(coalesce(row -> 'tags', '[]')) x where btrim(x) <> ''), '{}'),
        nullif(btrim(row ->> 'notes'), ''), 'csv', me.id)
      returning id into new_id;

      -- Optional club contact on the same row.
      if coalesce(btrim(row ->> 'club_contact_name'), '') <> '' then
        cc_phone := portal_normalize_phone(row ->> 'club_contact_mobile');
        select id into cc_id from portal_club_contacts
          where program_id = p_program_id and cc_phone is not null and mobile = cc_phone limit 1;
        if cc_id is null then
          insert into portal_club_contacts (program_id, first_name, last_name, role, club, mobile, email)
          values (p_program_id,
                  split_part(btrim(row ->> 'club_contact_name'), ' ', 1),
                  coalesce(nullif(btrim(substr(btrim(row ->> 'club_contact_name'),
                    length(split_part(btrim(row ->> 'club_contact_name'), ' ', 1)) + 1)), ''), '-'),
                  case when lower(coalesce(row ->> 'club_contact_role', '')) like '%coach%' then 'club_coach' else 'club_director' end,
                  nullif(btrim(row ->> 'club_team'), ''), cc_phone, portal_normalize_email(row ->> 'club_contact_email'))
          returning id into cc_id;
        end if;
        insert into portal_prospect_club_contacts (prospect_id, club_contact_id) values (new_id, cc_id)
          on conflict do nothing;
        cc_id := null;
      end if;

      inserted := inserted + 1;
      outcomes := outcomes || jsonb_build_object('row', idx, 'status', 'imported', 'prospect_id', new_id);
    exception when others then
      failed := failed + 1;
      outcomes := outcomes || jsonb_build_object('row', idx, 'status', 'error', 'error', sqlerrm);
    end;
  end loop;

  perform portal_audit((select department_id from portal_programs where id = p_program_id), 'prospects.imported',
    'program', p_program_id, jsonb_build_object('imported', inserted, 'duplicates', skipped, 'errors', failed));
  return jsonb_build_object('imported', inserted, 'duplicates', skipped, 'errors', failed, 'rows', outcomes);
end $$;

create or replace function portal_update_program_settings(p_program_id uuid, p_reminder_days integer[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from portal_staff s join portal_staff_programs sp on sp.staff_id = s.id
                 where s.user_id = auth.uid() and s.active and s.role = 'head_coach' and sp.program_id = p_program_id)
     and not portal_is_super_admin() then
    raise exception 'Only the head coach can change program settings';
  end if;
  if cardinality(p_reminder_days) > 2 or exists (select 1 from unnest(p_reminder_days) d where d < 1 or d > 30) then
    raise exception 'Up to two reminders, each 1–30 days after the invite';
  end if;
  update portal_programs set reminder_days = (select coalesce(array_agg(d order by d), '{}') from unnest(p_reminder_days) d)
    where id = p_program_id;
  perform portal_audit((select department_id from portal_programs where id = p_program_id), 'program.settings',
    'program', p_program_id, jsonb_build_object('reminder_days', p_reminder_days));
end $$;

create or replace function portal_set_approval_mode(p_department_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not portal_has_dept_role(p_department_id, array['dept_admin', 'compliance']) then
    raise exception 'Only the athletic department or compliance can change approval mode';
  end if;
  update portal_departments set approval_mode = p_on where id = p_department_id;
  perform portal_audit(p_department_id, 'department.approval_mode', 'department', p_department_id,
    jsonb_build_object('on', p_on));
end $$;

-- Deletion request: removes the prospect everywhere in the portal, suppresses
-- their contact details, and returns GHL contact ids for the caller to delete.
create or replace function portal_delete_prospect(p_prospect_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pr portal_prospects;
  ghl_ids text[];
begin
  select * into pr from portal_prospects where id = p_prospect_id;
  if pr.id is null or not (portal_can_edit_program(pr.program_id)
     or portal_has_dept_role((select department_id from portal_programs where id = pr.program_id), array['dept_admin'])) then
    raise exception 'Prospect not found';
  end if;
  select array_agg(distinct ghl_contact_id) filter (where ghl_contact_id is not null) into ghl_ids
    from portal_invitations where prospect_id = pr.id;
  delete from portal_prospects where id = pr.id;
  perform portal_audit((select department_id from portal_programs where id = pr.program_id), 'prospect.deleted',
    'prospect', pr.id, jsonb_build_object('name', pr.first_name || ' ' || pr.last_name));
  return jsonb_build_object('ghl_contact_ids', coalesce(ghl_ids, '{}'));
end $$;

-- ---------------------------------------------------------------------------
-- Service-role functions: dispatcher, webhooks, agent callbacks, reminders
-- (EXECUTE is revoked from anon/authenticated below.)
-- ---------------------------------------------------------------------------

-- Claim due invitations for sending. Re-checks suppression and quiet hours at
-- the last moment, and skips rows another worker already holds.
create or replace function portal_claim_due_invitations(p_limit integer default 50) returns setof portal_invitations
language plpgsql security definer set search_path = public as $$
begin
  -- Suppressed since queueing: block instead of sending.
  update portal_invitations i set status = 'blocked', status_detail = 'Recipient has opted out'
  where i.status = 'queued' and exists (
    select 1 from portal_suppressions s where s.channel = i.channel
      and s.value = case when i.channel = 'email' then lower(i.to_email) else i.to_phone end);

  return query
  with due as (
    select i.id from portal_invitations i
    where i.status = 'queued' and i.scheduled_for <= now()
      and (i.next_attempt_at is null or i.next_attempt_at <= now())
      and portal_program_licensed(i.program_id)
    order by i.scheduled_for
    limit p_limit
    for update skip locked
  )
  update portal_invitations i set status = 'sending', attempt_count = i.attempt_count + 1
  from due where i.id = due.id
  returning i.*;
end $$;

create or replace function portal_mark_sent(p_invitation_id uuid, p_ghl_contact_id text, p_ghl_message_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update portal_invitations set status = 'sent', sent_at = now(), ghl_contact_id = p_ghl_contact_id,
    ghl_message_id = p_ghl_message_id, last_error = null, next_attempt_at = null
  where id = p_invitation_id and status = 'sending';
  if found then
    insert into portal_message_events (invitation_id, event, detail) values (p_invitation_id, 'sent', p_ghl_message_id);
  end if;
end $$;

-- Retry with exponential backoff (2, 4, 8, 16 min…) until max attempts, then fail.
create or replace function portal_mark_failed(p_invitation_id uuid, p_error text, p_retryable boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv portal_invitations;
  max_attempts integer := (select value::int from portal_settings where key = 'max_send_attempts');
begin
  select * into inv from portal_invitations where id = p_invitation_id;
  if p_retryable and inv.attempt_count < max_attempts then
    update portal_invitations set status = 'queued', last_error = left(p_error, 500),
      next_attempt_at = now() + make_interval(mins => (2 ^ inv.attempt_count)::int)
    where id = inv.id;
  else
    update portal_invitations set status = 'failed', status_detail = left(p_error, 500), last_error = left(p_error, 500)
    where id = inv.id;
    insert into portal_message_events (invitation_id, event, detail) values (inv.id, 'failed', left(p_error, 500));
  end if;
end $$;

-- Idempotent webhook ingestion. Returns false for an event already recorded.
-- Status only ever moves forward, so out-of-order webhooks are harmless.
create or replace function portal_record_message_event(
  p_provider text, p_provider_event_id text, p_event text,
  p_ghl_message_id text default null, p_invitation_id uuid default null,
  p_channel text default null, p_address text default null,
  p_detail text default null, p_payload jsonb default null, p_occurred_at timestamptz default now()
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  inv portal_invitations;
  new_status text;
  addr text;
begin
  if p_invitation_id is not null then
    select * into inv from portal_invitations where id = p_invitation_id;
  elsif p_ghl_message_id is not null then
    select * into inv from portal_invitations where ghl_message_id = p_ghl_message_id limit 1;
  end if;
  if inv.id is null and p_address is not null then
    -- Inbound replies/STOPs reference the sender, not a message we sent.
    select * into inv from portal_invitations
      where (p_channel = 'sms' and to_phone = p_address) or (p_channel = 'email' and lower(to_email) = lower(p_address))
      order by created_at desc limit 1;
  end if;

  begin
    insert into portal_message_events (invitation_id, event, provider, provider_event_id, detail, payload, occurred_at)
    values (inv.id, p_event, p_provider, p_provider_event_id, p_detail, p_payload, coalesce(p_occurred_at, now()));
  exception when unique_violation then
    return false;
  end;

  addr := coalesce(p_address, case when inv.channel = 'sms' then inv.to_phone else inv.to_email end);

  if p_event in ('opted_out', 'bounced') and addr is not null then
    insert into portal_suppressions (channel, value, reason, source)
    values (coalesce(p_channel, inv.channel), case when coalesce(p_channel, inv.channel) = 'email' then lower(addr) else addr end,
            case when p_event = 'opted_out' then 'stop' else 'bounce' end, p_provider)
    on conflict (channel, value) do nothing;
    -- Block every unsent invitation to this address, across every program.
    update portal_invitations set status = 'blocked', status_detail = 'Recipient has opted out'
      where status in ('queued', 'pending_approval')
        and ((coalesce(p_channel, inv.channel) = 'sms' and to_phone = addr)
             or (coalesce(p_channel, inv.channel) = 'email' and lower(to_email) = lower(addr)));
  elsif p_event = 'opted_in' and addr is not null then
    delete from portal_suppressions where channel = coalesce(p_channel, inv.channel) and value = addr and reason = 'stop';
  end if;

  if inv.id is null then return true; end if;

  new_status := case p_event
    when 'delivered' then 'delivered' when 'clicked' then 'clicked' when 'replied' then 'replied'
    when 'started' then 'started' when 'completed' then 'completed'
    when 'failed' then 'failed' when 'bounced' then 'failed' when 'opted_out' then 'opted_out'
    else null end;

  if new_status is not null and (
       (new_status in ('failed', 'opted_out') and inv.status not in ('started', 'completed', 'opted_out'))
       or (portal_status_rank(new_status) > portal_status_rank(inv.status) and portal_status_rank(inv.status) < 100)) then
    update portal_invitations set
      status = new_status,
      status_detail = case when new_status in ('failed', 'opted_out') then coalesce(p_detail, status_detail) else status_detail end,
      delivered_at = case when new_status = 'delivered' then coalesce(delivered_at, p_occurred_at) else delivered_at end,
      clicked_at = case when new_status in ('clicked', 'replied') then coalesce(clicked_at, p_occurred_at) else clicked_at end,
      started_at = case when new_status = 'started' then coalesce(started_at, p_occurred_at) else started_at end,
      completed_at = case when new_status = 'completed' then coalesce(completed_at, p_occurred_at) else completed_at end
    where id = inv.id;
  end if;
  return true;
end $$;

-- Start link: single-use per invitation, expires after 30 days.
create or replace function portal_consume_start_token(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv portal_invitations;
begin
  select * into inv from portal_invitations where start_token = p_token;
  if inv.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if inv.token_expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  if inv.status in ('opted_out', 'cancelled', 'rejected', 'blocked') then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;
  if inv.token_used_at is null then
    update portal_invitations set token_used_at = now() where id = inv.id;
    perform portal_record_message_event('system', 'click:' || inv.id, 'clicked', null, inv.id);
  end if;
  return jsonb_build_object('ok', true, 'invitation_id', inv.id, 'prospect_id', inv.prospect_id,
    'program_id', inv.program_id, 'recipient_type', inv.recipient_type, 'already_used', inv.token_used_at is not null);
end $$;

-- Agent service callbacks: conversation started/completed, director read
-- complete, brief ready. Brief content is the only conversation-derived data
-- that ever reaches coaches.
create or replace function portal_record_agent_event(
  p_event_id text, p_invitation_id uuid, p_event text, p_brief jsonb default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  inv portal_invitations;
  b_id uuid;
  b_version integer;
  s record;
begin
  select * into inv from portal_invitations where id = p_invitation_id;
  if inv.id is null then raise exception 'Unknown invitation %', p_invitation_id; end if;
  if p_event not in ('started', 'completed', 'brief_ready') then raise exception 'Unknown agent event %', p_event; end if;

  if p_event in ('started', 'completed') then
    if not portal_record_message_event('agent', p_event_id, p_event, null, inv.id) then return false; end if;
    if inv.recipient_type = 'club_contact' then
      update portal_reads set director_status = case when p_event = 'started' then 'in_progress' else 'complete' end,
        brief_status = case when brief_status = 'none' then 'in_progress' else brief_status end, updated_at = now()
        where prospect_id = inv.prospect_id;
    elsif inv.recipient_type = 'athlete' then
      update portal_reads set athlete_status = case when p_event = 'started' then 'in_progress' else 'complete' end,
        brief_status = case when brief_status = 'none' then 'in_progress' else brief_status end, updated_at = now()
        where prospect_id = inv.prospect_id;
    end if;
    return true;
  end if;

  -- brief_ready
  begin
    insert into portal_message_events (invitation_id, event, provider, provider_event_id, detail)
    values (inv.id, 'completed', 'agent', p_event_id, 'brief_ready');
  exception when unique_violation then
    return false;
  end;
  select coalesce(max(version), 0) + 1 into b_version from portal_briefs where prospect_id = inv.prospect_id;
  insert into portal_briefs (prospect_id, program_id, version, plays, takes_coaching, locker_room, against_staff, summary)
  values (inv.prospect_id, inv.program_id, b_version, p_brief ->> 'plays', p_brief ->> 'takes_coaching',
          p_brief ->> 'locker_room', p_brief ->> 'against_staff', p_brief ->> 'summary')
  returning id into b_id;
  update portal_reads set brief_status = 'ready', brief_id = b_id, updated_at = now() where prospect_id = inv.prospect_id;

  -- Notify everyone on the program's staff, starting with whoever sent it.
  for s in select distinct st.id from portal_staff st
           left join portal_staff_programs sp on sp.staff_id = st.id
           where st.active and (st.id = inv.sent_by or sp.program_id = inv.program_id) loop
    insert into portal_notifications (staff_id, kind, title, body, link)
    select s.id, 'brief_ready', 'Prospect brief ready',
           pr.first_name || ' ' || pr.last_name || '''s brief is ready.', '/portal/prospects/' || pr.id
    from portal_prospects pr where pr.id = inv.prospect_id;
  end loop;
  return true;
end $$;

-- Create reminder invitations for athletes who haven't started, per each
-- program's reminder_days. Idempotent: one reminder per (invite, number).
create or replace function portal_schedule_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  tpl portal_templates;
  created integer := 0;
  max_reminders integer := (select value::int from portal_settings where key = 'max_reminders');
  link_base text := (select value from portal_settings where key = 'start_link_base');
  tok text;
  vars jsonb;
begin
  for inv in
    select i.*, p.reminder_days, p.sport, p.gender, d.name as school, d.time_zone as dept_tz,
           pr.first_name as athlete_first, pr.preferred_name, pr.state, pr.time_zone as pr_tz,
           st.first_name as coach_first, st.last_name as coach_last,
           (select count(*) from portal_invitations r where r.reminder_of = i.id) as reminders_sent
    from portal_invitations i
    join portal_programs p on p.id = i.program_id
    join portal_departments d on d.id = p.department_id
    join portal_prospects pr on pr.id = i.prospect_id
    left join portal_staff st on st.id = i.sent_by
    join portal_reads rd on rd.prospect_id = i.prospect_id
    where i.recipient_type = 'athlete' and i.reminder_of is null
      and i.status in ('sent', 'delivered', 'clicked')
      and rd.athlete_status in ('invited', 'not_started')
      and portal_program_licensed(i.program_id)
  loop
    if inv.reminders_sent >= least(max_reminders, cardinality(inv.reminder_days)) then continue; end if;
    if inv.sent_at + make_interval(days => inv.reminder_days[inv.reminders_sent + 1]) > now() then continue; end if;
    if exists (select 1 from portal_suppressions s where s.channel = inv.channel
               and s.value = case when inv.channel = 'email' then lower(inv.to_email) else inv.to_phone end) then
      continue;
    end if;
    select * into tpl from portal_templates where active and kind = 'reminder' and channel = inv.channel
      and recipient_type = 'athlete' order by created_at limit 1;
    if tpl.id is null then continue; end if;
    tok := encode(extensions.gen_random_bytes(18), 'hex');
    vars := jsonb_build_object('first_name', coalesce(inv.preferred_name, inv.athlete_first),
      'coach_name', nullif(btrim(coalesce(inv.coach_first, '') || ' ' || coalesce(inv.coach_last, '')), ''),
      'program_name', initcap(inv.gender) || ' ' || inv.sport, 'school', inv.school,
      'start_link', link_base || '?t=' || tok);
    insert into portal_invitations (batch_id, program_id, prospect_id, recipient_type, recipient_name, to_phone, to_email,
      channel, template_id, rendered_subject, rendered_body, scheduled_for, status, start_token, sent_by,
      reminder_of, reminder_number)
    values (inv.batch_id, inv.program_id, inv.prospect_id, 'athlete', inv.recipient_name, inv.to_phone, inv.to_email,
      inv.channel, tpl.id, portal_render(tpl.subject, vars),
      portal_render(tpl.body, vars) || E'\n\n' || portal_legal_footer(inv.channel),
      case when inv.channel = 'sms'
        then portal_next_send_window(now(), coalesce(inv.pr_tz, portal_state_time_zone(inv.state), inv.dept_tz))
        else now() end,
      'queued', tok, inv.sent_by, inv.id, inv.reminders_sent + 1);
    created := created + 1;
  end loop;
  return created;
end $$;

-- ---------------------------------------------------------------------------
-- Prospect status view for lists and dashboards (respects caller's RLS).
-- ---------------------------------------------------------------------------

create or replace view portal_prospect_overview with (security_invoker = true) as
select
  p.*,
  r.athlete_status, r.director_status, r.brief_status, r.brief_id,
  li.status as last_invite_status,
  li.created_at as last_invited_at,
  li.channel as last_invite_channel,
  (select count(*) from portal_invitations i where i.prospect_id = p.id and i.status not in ('blocked', 'cancelled', 'rejected')) as invites_sent,
  (select count(*) from portal_prospect_club_contacts c where c.prospect_id = p.id) as club_contacts
from portal_prospects p
left join portal_reads r on r.prospect_id = p.id
left join lateral (
  select i.status, i.created_at, i.channel from portal_invitations i
  where i.prospect_id = p.id and i.recipient_type = 'athlete'
  order by i.created_at desc limit 1
) li on true;

-- ---------------------------------------------------------------------------
-- VEKT default templates (approved copy; coaches add only a personal note).
-- ---------------------------------------------------------------------------

insert into portal_templates (name, channel, recipient_type, kind, subject, body, approved_by) values
('Athlete invite — SMS', 'sms', 'athlete', 'invite', null,
 E'Hi {{first_name}}, {{coach_name}} from {{school}} {{program_name}} would like to learn more about you through VEKT. It''s a short text conversation about how you play and train. Start here: {{start_link}}\n\n{{personal_note}}', 'VEKT'),
('Athlete invite — Email', 'email', 'athlete', 'invite', '{{school}} {{program_name}} invited you to VEKT',
 E'Hi {{first_name}},\n\n{{coach_name}} from {{school}} {{program_name}} would like to get to know you better through VEKT.\n\nVEKT is a short, private text conversation about how you play, how you train and what you''re looking for in a program. There are no scores and nothing to download.\n\n{{personal_note}}\n\nStart your conversation: {{start_link}}', 'VEKT'),
('Guardian copy — SMS', 'sms', 'guardian', 'invite', null,
 E'Hi {{first_name}}, {{coach_name}} from {{school}} {{program_name}} has invited {{athlete_name}} to a short VEKT conversation. As their parent/guardian you''ll be asked for consent before it begins. Details: {{start_link}}', 'VEKT'),
('Guardian copy — Email', 'email', 'guardian', 'invite', '{{athlete_name}} was invited to VEKT by {{school}}',
 E'Hi {{first_name}},\n\n{{coach_name}} from {{school}} {{program_name}} has invited {{athlete_name}} to a short conversation with VEKT.\n\nBecause {{athlete_name}} is under 18, VEKT asks a parent or guardian for consent before the conversation begins. Nothing is collected until you agree.\n\nReview and give consent: {{start_link}}', 'VEKT'),
('Club director invite — SMS', 'sms', 'club_contact', 'invite', null,
 E'Hi {{first_name}}, {{coach_name}} from {{school}} {{program_name}} is recruiting {{athlete_name}} and would value your read on them through VEKT. It''s a short, confidential text conversation: {{start_link}}\n\n{{personal_note}}', 'VEKT'),
('Club director invite — Email', 'email', 'club_contact', 'invite', 'Your read on {{athlete_name}}: {{school}} {{program_name}}',
 E'Hi {{first_name}},\n\n{{coach_name}} from {{school}} {{program_name}} is recruiting {{athlete_name}} and would value your honest read on them: how they take coaching, handle adversity and fit a team.\n\nVEKT keeps your answers confidential. The college staff never sees what you said, only VEKT''s overall read.\n\n{{personal_note}}\n\nShare your read: {{start_link}}', 'VEKT'),
('Athlete reminder — SMS', 'sms', 'athlete', 'reminder', null,
 E'Hi {{first_name}}, a reminder that {{coach_name}} from {{school}} {{program_name}} invited you to a short VEKT conversation: {{start_link}}', 'VEKT'),
('Athlete reminder — Email', 'email', 'athlete', 'reminder', 'Reminder: {{school}} {{program_name}} invited you to VEKT',
 E'Hi {{first_name}},\n\nA quick reminder that {{coach_name}} from {{school}} {{program_name}} invited you to a short VEKT conversation.\n\nStart here: {{start_link}}', 'VEKT');

-- ---------------------------------------------------------------------------
-- Function privileges. Postgres grants EXECUTE to PUBLIC by default, so take
-- every portal function away from anon, give the browser-facing ones to
-- signed-in users, then lock the service-role ones down further.
-- ---------------------------------------------------------------------------

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'portal\_%' and p.prokind = 'f' loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- Lock service-role functions away from browser roles.
revoke execute on function portal_claim_due_invitations(integer) from public, anon, authenticated;
revoke execute on function portal_mark_sent(uuid, text, text) from public, anon, authenticated;
revoke execute on function portal_mark_failed(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function portal_record_message_event(text, text, text, text, uuid, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function portal_consume_start_token(text) from public, anon, authenticated;
revoke execute on function portal_record_agent_event(text, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function portal_schedule_reminders() from public, anon, authenticated;
revoke execute on function portal_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

grant execute on function portal_claim_due_invitations(integer) to service_role;
grant execute on function portal_mark_sent(uuid, text, text) to service_role;
grant execute on function portal_mark_failed(uuid, text, boolean) to service_role;
grant execute on function portal_record_message_event(text, text, text, text, uuid, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function portal_consume_start_token(text) to service_role;
grant execute on function portal_record_agent_event(text, uuid, text, jsonb) to service_role;
grant execute on function portal_schedule_reminders() to service_role;
