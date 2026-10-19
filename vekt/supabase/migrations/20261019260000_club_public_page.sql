-- A public page per club (off until the director turns it on): its placement record
-- by level and class, its Founding VEKT teams (3+ families on VEKT), and, for families
-- who opted in, a first name and last initial next to where they committed.

alter table public.vekt_clubs
  add column if not exists slug text unique check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  add column if not exists public_page boolean not null default false;

alter table public.club_athletes
  add column if not exists placement_public boolean not null default false,
  add column if not exists placement_consent_at timestamptz;
