-- Roster planning under roster limits.
--
-- program_dna.roster_limit: the program's limit (D1 opt-in schools have House
--   settlement limits; others set their own). program_dna.roster_targets: how
--   many players the staff wants at each position.
-- program_roster: the current roster with the last season each player is
--   expected to play, so VEKT can show open spots by position for a future season
--   and which recruits on the board fill them.

alter table public.program_dna
  add column if not exists roster_limit integer check (roster_limit is null or roster_limit between 1 and 200),
  add column if not exists roster_targets jsonb not null default '{}';  -- {"Center back": 5, "Goalkeeper": 3}

create table if not exists public.program_roster (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.program_dna(id) on delete cascade,
  name text not null,
  position text,
  final_season integer not null check (final_season between 2020 and 2040),  -- last fall/season they're expected to play
  status text not null default 'returning' check (status in ('returning', 'leaving', 'transfer_risk', 'undecided')),
  designated boolean not null default false,   -- House "designated student-athlete": does not count toward the limit
  aid_dollars integer check (aid_dollars is null or aid_dollars between 0 and 500000),  -- optional, for the cost view
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists program_roster_program_idx on public.program_roster (program_id, position);
alter table public.program_roster enable row level security;
