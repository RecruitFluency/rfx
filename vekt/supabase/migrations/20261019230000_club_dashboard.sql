-- The club director's side of VEKT.
--
-- vekt_clubs / club_accounts: a club and the directors and coaches who sign in.
-- club_athletes: the club's roster, each optionally linked to the athlete's own
--   VEKT profile (vekt_athletes). Commitments are recorded here.
-- coach_actions: what college staff actually did with an athlete (opened the
--   profile, played film, saved to a watch list). Invites and Interested replies
--   come from comparison_recruits; together they are the club's engagement data.
-- college_programs: the program research list, loaded from a spreadsheet. Rows with
--   club_id null are the shared VEKT list; a club's own imports carry its club_id.

create table if not exists public.vekt_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text,
  sports text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.club_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  club_id uuid not null references public.vekt_clubs(id) on delete cascade,
  role text not null default 'director' check (role in ('director', 'coach')),
  first_name text not null,
  last_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists club_accounts_email_idx on public.club_accounts (lower(email));

create table if not exists public.club_athletes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.vekt_clubs(id) on delete cascade,
  vekt_athlete_id uuid references public.vekt_athletes(id) on delete set null,
  full_name text not null,
  sport text,
  team text,
  grad_year integer check (grad_year is null or grad_year between 2024 and 2040),
  position text,
  athlete_email text,
  parent_name text,
  parent_email text,
  status text not null default 'active' check (status in ('active', 'committed', 'not_pursuing')),
  committed_program text,
  committed_division text,
  committed_at date,
  invited_at timestamptz,
  -- The family's separate yes to the club seeing college engagement (parent for
  -- minors, the athlete if 18+). Null means the club sees only "on VEKT" or not.
  family_approved_at timestamptz,
  family_consent_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists club_athletes_club_idx on public.club_athletes (club_id, grad_year);
create unique index if not exists club_athletes_one_link on public.club_athletes (club_id, vekt_athlete_id) where vekt_athlete_id is not null;

create table if not exists public.coach_actions (
  id bigint generated always as identity primary key,
  program_id uuid not null references public.program_dna(id) on delete cascade,
  coach_account_id uuid references public.coach_accounts(id) on delete set null,
  athlete_id uuid not null references public.vekt_athletes(id) on delete cascade,
  action text not null check (action in ('profile_view', 'film_play', 'watch_add')),
  created_at timestamptz not null default now()
);
create index if not exists coach_actions_athlete_idx on public.coach_actions (athlete_id, created_at desc);

create table if not exists public.college_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  conference text,
  division text,
  city text,
  state text,
  control text check (control is null or control in ('public', 'private')),
  avg_gpa numeric(3, 2),
  cost_per_year integer,
  acceptance_rate numeric(5, 2),
  enrollment integer,
  sports text[] not null default '{}',
  staff_count integer,
  source text,
  club_id uuid references public.vekt_clubs(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists college_programs_div_idx on public.college_programs (division, state);

alter table public.vekt_clubs enable row level security;
alter table public.club_accounts enable row level security;
alter table public.club_athletes enable row level security;
alter table public.coach_actions enable row level security;
alter table public.college_programs enable row level security;
