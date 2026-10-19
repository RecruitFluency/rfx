-- VEKT coach dashboard: accounts, staff, must-haves, reports, delivery tracking.
--
-- Additive only: new tables and new nullable/defaulted columns. Nothing
-- existing is renamed, dropped or rewritten, so the live invite flow,
-- webhooks and fit reads keep working unchanged. Every new table follows the
-- production pattern: RLS on, no policies. Only edge functions (service role)
-- read or write; the dashboard talks to the vekt-coach function, which scopes
-- every query to the signed-in coach's programs.

-- ---------------------------------------------------------------------------
-- Departments, licensing, coach accounts
-- ---------------------------------------------------------------------------

create table if not exists public.vekt_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  division text,
  conference text,
  license_type text not null default 'per_sport' check (license_type in ('all_sports', 'per_sport')),
  license_start date,
  license_end date,
  billing_status text not null default 'invoiced' check (billing_status in ('trial', 'invoiced', 'paid', 'overdue')),
  created_at timestamptz not null default now()
);

alter table public.program_dna
  add column if not exists department_id uuid references public.vekt_departments(id) on delete set null,
  add column if not exists team_gender text check (team_gender is null or team_gender in ('men', 'women')),
  add column if not exists licensed boolean not null default false,
  add column if not exists reminder_days integer[] not null default '{3,7}',
  -- The program's must-haves, checked in code against each recruit:
  -- {"positions": ["Center back"], "min_grad_year": 2028, "max_grad_year": 2029,
  --  "club_levels": ["Elite regional academy", "National league"], "min_gpa": 3.0,
  --  "max_family_cost": 25000}
  add column if not exists must_haves jsonb not null default '{}';

create table if not exists public.coach_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  department_id uuid references public.vekt_departments(id) on delete cascade,
  role text not null check (role in ('head_coach', 'assistant_coach', 'dept_admin', 'compliance', 'vekt_admin')),
  first_name text not null,
  last_name text not null,
  title text,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint coach_accounts_school_email check (role = 'vekt_admin' or lower(email) ~ '^[^@\s]+@[^@\s]+\.edu$')
);
create unique index if not exists coach_accounts_email_idx on public.coach_accounts (lower(email));

create table if not exists public.coach_account_programs (
  coach_account_id uuid not null references public.coach_accounts(id) on delete cascade,
  program_id uuid not null references public.program_dna(id) on delete cascade,
  primary key (coach_account_id, program_id)
);

-- ---------------------------------------------------------------------------
-- Program staff: each coach's personality, for "how they'll respond to each
-- coach on your staff". The Coach Agent profile covers the head coach; the
-- rest of the staff are described here (or by their own agent conversation).
-- ---------------------------------------------------------------------------

create table if not exists public.program_staff (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.program_dna(id) on delete cascade,
  coach_account_id uuid references public.coach_accounts(id) on delete set null,
  name text not null,
  title text,
  focus text,                -- e.g. "Defenders", "Academics and recruiting"
  feedback_style text,       -- how they correct players
  motivation_style text,     -- how they get effort
  closeness_style text,      -- how close they get to players
  setbacks_style text,       -- how they handle a benched starter
  traits text[] not null default '{}',  -- short labels shown on the card, e.g. {"Direct","Demanding","Film-first"}
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists program_staff_program_idx on public.program_staff (program_id, sort_order);

-- ---------------------------------------------------------------------------
-- Recruits added from the dashboard live on a standing "board" comparison per
-- program, so the existing invite, consent and conversation flow works for
-- them unchanged.
-- ---------------------------------------------------------------------------

alter table public.recruit_comparisons
  add column if not exists kind text not null default 'comparison' check (kind in ('comparison', 'board'));
create unique index if not exists recruit_comparisons_one_board on public.recruit_comparisons (program_id) where kind = 'board';

alter table public.comparison_recruits
  add column if not exists program_id uuid references public.program_dna(id) on delete cascade,
  add column if not exists source text not null default 'voice' check (source in ('voice', 'dashboard', 'csv')),
  add column if not exists added_by uuid references public.coach_accounts(id) on delete set null,
  add column if not exists state text,
  add column if not exists club_level text,
  add column if not exists gpa numeric(3, 2) check (gpa is null or gpa between 0 and 5),
  -- What the family says it can pay per year after aid (asked of the parent, not guessed).
  add column if not exists family_cost_min integer,
  add column if not exists family_cost_max integer,
  add column if not exists priority text not null default 'B' check (priority in ('A', 'B', 'C')),
  add column if not exists notes text,
  add column if not exists reminders_sent integer not null default 0,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists decision text check (decision is null or decision in ('interested', 'not_a_fit')),
  add column if not exists decision_at timestamptz,
  add column if not exists decision_by uuid references public.coach_accounts(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.comparison_recruits r set program_id = c.program_id
from public.recruit_comparisons c
where c.id = r.comparison_id and r.program_id is null and c.program_id is not null;

create index if not exists comparison_recruits_program_idx on public.comparison_recruits (program_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

-- The structured Fit Read (short answer, self-awareness traits, staff
-- one-to-one, each coach, open questions). Text columns stay as they are.
alter table public.asset_matches
  add column if not exists report jsonb,
  add column if not exists report_version integer;

-- Side-by-Side: 2 to 4 recruits at one position, compared, not ranked.
create table if not exists public.side_by_sides (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.program_dna(id) on delete cascade,
  position text,
  recruit_ids uuid[] not null check (cardinality(recruit_ids) between 2 and 4),
  status text not null default 'pending' check (status in ('pending', 'ready', 'error')),
  report jsonb,
  error text,
  requested_by uuid references public.coach_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists side_by_sides_program_idx on public.side_by_sides (program_id, created_at desc);

-- Season-one check: did the read hold up? (The table exists; these columns
-- tie it to the recruit and the coach who answered.)
alter table public.season_one_checks
  add column if not exists recruit_id uuid references public.comparison_recruits(id) on delete set null,
  add column if not exists checked_by uuid references public.coach_accounts(id) on delete set null,
  add column if not exists season text,
  add column if not exists still_on_roster boolean;

-- Club director track record (internal only): how often a director's reads
-- held up in season one. Used to weight reads, never shown as a leaderboard.
create or replace view public.club_director_track_record with (security_invoker = true) as
select
  lower(trim(cv.club_coach_name)) as director_key,
  max(cv.club_coach_name) as club_coach_name,
  max(cv.club_name) as club_name,
  count(distinct cv.id) as reads_given,
  count(distinct s.id) as season_checks,
  count(distinct s.id) filter (where s.read_held_up = 'yes') as held_up,
  count(distinct s.id) filter (where s.read_held_up = 'partly') as partly,
  count(distinct s.id) filter (where s.read_held_up = 'no') as missed
from public.coach_verifications cv
left join public.season_one_checks s on s.athlete_id = cv.athlete_id and cv.athlete_id is not null
where cv.club_coach_name is not null
group by lower(trim(cv.club_coach_name));
revoke all on public.club_director_track_record from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Delivery: outbox (quiet hours, retries), GHL tracking, opt-outs
-- ---------------------------------------------------------------------------

create table if not exists public.vekt_outbox (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid references public.recruit_comparisons(id) on delete cascade,
  recruit_id uuid references public.comparison_recruits(id) on delete cascade,
  recipient_role text not null,
  kind text not null default 'invite' check (kind in ('invite', 'reminder', 'decision', 'coach')),
  channel text not null check (channel in ('email', 'sms')),
  to_address text not null,
  recipient_name text,
  subject text,
  html text,
  body_text text,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'blocked', 'dry_run', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  ghl_contact_id text,
  ghl_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists vekt_outbox_due_idx on public.vekt_outbox (scheduled_for) where status = 'pending';
create index if not exists vekt_outbox_recruit_idx on public.vekt_outbox (recruit_id, created_at desc);
create index if not exists vekt_outbox_ghl_idx on public.vekt_outbox (ghl_message_id) where ghl_message_id is not null;

alter table public.invite_events
  add column if not exists recipient text,
  add column if not exists outbox_id uuid references public.vekt_outbox(id) on delete set null,
  add column if not exists ghl_message_id text,
  add column if not exists provider_event_id text,
  add column if not exists occurred_at timestamptz default now();
create unique index if not exists invite_events_provider_event_idx on public.invite_events (provider_event_id) where provider_event_id is not null;
create index if not exists invite_events_recruit_idx on public.invite_events (recruit_id, created_at desc);

create table if not exists public.vekt_suppressions (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  value text not null,
  reason text not null check (reason in ('stop', 'unsubscribe', 'complaint', 'bounce', 'manual')),
  source text,
  created_at timestamptz not null default now(),
  unique (channel, value)
);

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.vekt_audit_log (
  id bigint generated always as identity primary key,
  coach_account_id uuid,
  department_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists vekt_audit_log_dept_idx on public.vekt_audit_log (department_id, created_at desc);

create or replace function public.vekt_audit_log_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'vekt_audit_log is append-only';
end $$;
drop trigger if exists vekt_audit_log_no_update on public.vekt_audit_log;
create trigger vekt_audit_log_no_update before update or delete on public.vekt_audit_log
  for each row execute function public.vekt_audit_log_immutable();

-- ---------------------------------------------------------------------------
-- Lock-down (production also auto-enables RLS on new tables)
-- ---------------------------------------------------------------------------

alter table public.vekt_departments enable row level security;
alter table public.coach_accounts enable row level security;
alter table public.coach_account_programs enable row level security;
alter table public.program_staff enable row level security;
alter table public.side_by_sides enable row level security;
alter table public.vekt_outbox enable row level security;
alter table public.vekt_suppressions enable row level security;
alter table public.vekt_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- Settings (values only where safe to ship; secrets stay in function env)
-- ---------------------------------------------------------------------------

insert into public.app_config (key, value, note) values
  ('quiet_hours_start', '9', 'Texts go out no earlier than this local hour (recipient time zone)'),
  ('quiet_hours_end', '20', 'Texts go out no later than this local hour'),
  ('max_reminders', '2', 'Reminders per recruit who has not started'),
  ('coach_app_url', '', 'Public URL of the coach dashboard, no trailing slash'),
  ('price_all_sports_cents', '2500000', 'Annual all-sports department license'),
  ('price_single_sport_cents', '500000', 'Annual single-sport license'),
  ('price_additional_sport_cents', '250000', 'Each additional sport')
on conflict (key) do nothing;
