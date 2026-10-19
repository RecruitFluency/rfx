-- Teammate invites. Every athlete profile gets a short share code; a profile started
-- from someone's link records who shared it. Only counts are ever shown back (how many
-- teammates joined), never names, and a teammate counts once their own profile is
-- approved (by a parent if they're under 18).

alter table public.vekt_athletes
  add column if not exists ref_code text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  add column if not exists referred_by uuid references public.vekt_athletes(id) on delete set null;
create index if not exists vekt_athletes_referred_by_idx on public.vekt_athletes (referred_by) where referred_by is not null;
