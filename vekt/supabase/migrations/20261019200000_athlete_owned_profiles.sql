-- One profile the athlete (and parent) controls, shared program by program.
--
-- vekt_athletes: the athlete's own record. Managed through a private link
--   (manage_token) emailed to the athlete and parent; a parent link (parent_token)
--   approves the profile for minors and, separately, whether verified college
--   coaches can find their videos in the coach feed (feed_visible).
-- athlete_shares: one row per program that asked. "Yes" copies the profile into
--   that program's athlete_profiles row; later updates can go to every program
--   that has a "yes" at once.
-- athlete_videos: YouTube / Hudl / Vimeo links by kind (highlight, every touch,
--   half game, full game, or the sport's own kinds).
-- watch_list: college staff keep underclassmen they found in the feed until the
--   NCAA contact date opens.

create table if not exists public.vekt_athletes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  sport text not null,
  grad_year integer check (grad_year is null or grad_year between 2024 and 2040),
  state text,
  club text,
  athlete_email text,
  parent_name text,
  parent_email text,
  is_minor boolean not null default true,
  manage_token uuid not null unique default gen_random_uuid(),
  parent_token uuid not null unique default gen_random_uuid(),
  parent_approved_at timestamptz,
  parent_consent_text text,
  feed_visible boolean not null default false,
  feed_approved_at timestamptz,
  profile jsonb not null default '{}',   -- same shape as athlete_profiles (positions, systems, skills, measurables...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vekt_athletes_minor_parent check (not is_minor or parent_email is not null)
);
create index if not exists vekt_athletes_athlete_email_idx on public.vekt_athletes (lower(athlete_email));
create index if not exists vekt_athletes_parent_email_idx on public.vekt_athletes (lower(parent_email));
create index if not exists vekt_athletes_feed_idx on public.vekt_athletes (sport, grad_year) where feed_visible;

create table if not exists public.athlete_videos (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.vekt_athletes(id) on delete cascade,
  kind text not null,
  url text not null,
  youtube_id text,
  title text,
  recorded_on date,
  notes text,          -- e.g. "#4, white jersey"
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists athlete_videos_athlete_idx on public.athlete_videos (athlete_id, sort_order);
create index if not exists athlete_videos_recent_idx on public.athlete_videos (created_at desc);

create table if not exists public.athlete_shares (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.vekt_athletes(id) on delete cascade,
  recruit_id uuid not null unique references public.comparison_recruits(id) on delete cascade,
  status text not null check (status in ('shared', 'declined')),
  decided_at timestamptz not null default now(),
  last_synced_at timestamptz
);
create index if not exists athlete_shares_athlete_idx on public.athlete_shares (athlete_id);

alter table public.comparison_recruits add column if not exists vekt_athlete_id uuid references public.vekt_athletes(id) on delete set null;
alter table public.comparison_recruits drop constraint if exists comparison_recruits_source_check;
alter table public.comparison_recruits add constraint comparison_recruits_source_check check (source in ('voice', 'dashboard', 'csv', 'feed'));

create table if not exists public.watch_list (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.program_dna(id) on delete cascade,
  athlete_id uuid not null references public.vekt_athletes(id) on delete cascade,
  added_by uuid references public.coach_accounts(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (program_id, athlete_id)
);

alter table public.vekt_athletes enable row level security;
alter table public.athlete_videos enable row level security;
alter table public.athlete_shares enable row level security;
alter table public.watch_list enable row level security;
