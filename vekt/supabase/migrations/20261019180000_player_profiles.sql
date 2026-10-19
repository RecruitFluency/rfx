-- Hard skills, positions and systems for every sport.
--
-- athlete_profiles: what the athlete (after a parent approves) says about their
--   game: positions, systems they're comfortable in, hard skills, measurables,
--   personal bests, film.
-- club_evaluations: the club director's own read of the same things, given
--   separately, so VEKT can show where the two agree.
-- program_dna.systems: the formations and schemes the college program runs.
--
-- One profile and one evaluation per recruit row: each program the family
-- agreed to share with sees only its own copy. RLS on, no policies, as everywhere.

create table if not exists public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  recruit_id uuid not null unique references public.comparison_recruits(id) on delete cascade,
  sport text,
  primary_position text,
  secondary_positions text[] not null default '{}',
  systems jsonb not null default '{}',       -- {"formation": ["4-3-3"], "style": ["High press"]}
  skills jsonb not null default '{}',        -- {"first_touch": "strength"}; levels are words, never numbers
  measurables jsonb not null default '{}',   -- {"height": "73", "sprint_30m": "4.10"}
  attributes jsonb not null default '{}',    -- {"foot": "Left", "pitches": ["Slider"]}
  marks jsonb not null default '[]',         -- [{"event": "400m", "mark": "48.9", "date": "2026-05-01", "meet": "State"}]
  film_links text[] not null default '{}',
  intended_major text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_evaluations (
  id uuid primary key default gen_random_uuid(),
  recruit_id uuid not null unique references public.comparison_recruits(id) on delete cascade,
  evaluator_name text,
  evaluator_email text,
  team_name text,
  team_level text,
  primary_position text,
  positions_played text[] not null default '{}',
  systems_played jsonb not null default '{}',  -- systems this athlete has played in for them
  team_systems jsonb not null default '{}',    -- what the club team runs
  skills jsonb not null default '{}',
  measurables jsonb not null default '{}',     -- numbers the director has seen measured
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists club_evaluations_email_idx on public.club_evaluations (lower(evaluator_email));

alter table public.program_dna add column if not exists systems jsonb not null default '{}';

alter table public.athlete_profiles enable row level security;
alter table public.club_evaluations enable row level security;

insert into public.app_config (key, value, note) values
  ('profile_base_url', '', 'Public URL for athlete profile and club director pages (the coach app), no trailing slash')
on conflict (key) do nothing;
