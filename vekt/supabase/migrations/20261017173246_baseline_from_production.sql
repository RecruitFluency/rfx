-- Baseline: the production schema of the VEKT Supabase project
-- ("College Coach_DNA_2027", xpzenyjmpqzmhdeuqmto) as of 2026-10-19, read
-- from its catalog. Production already has all of this (its 8 migrations,
-- latest 20261017173246_vekt_app_config). This file exists so a local stack
-- matches production. NEVER apply it to production.
--
-- Before using `supabase db push` against production, mark it as applied:
--   npx supabase migration repair --status applied 20261017173246

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Production enables RLS automatically on every new public table.
create or replace function public.rls_auto_enable()
returns event_trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$function$;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end $$;

create table public.app_config (
  key text not null,
  value text,
  note text,
  updated_at timestamp with time zone default now(),
  constraint app_config_pkey primary key (key)
);

create table public.program_dna (
  id uuid default gen_random_uuid() not null,
  conversation_id text,
  coach_name text,
  institution text,
  sport text,
  tactical_assets text,
  psychological_assets text,
  coaching_style text,
  roster_needs jsonb,
  created_at timestamp with time zone default now(),
  division text,
  session_type text,
  tactical_identity text,
  position_prototypes jsonb,
  red_flags jsonb,
  green_flags jsonb,
  locker_room_norms text,
  trait_ranking jsonb,
  style_feedback text,
  style_motivation text,
  style_closeness text,
  style_setbacks text,
  profile_confirmed boolean default false,
  recruits_raw text,
  constraint program_dna_pkey primary key (id),
  constraint program_dna_session_type_check check (((session_type is null) or (session_type = any (array['program_profile'::text, 'recruit_comparison'::text]))))
);

create table public.athlete_vetting (
  id uuid default gen_random_uuid() not null,
  conversation_id text,
  athlete_name text,
  sport text,
  primary_position text,
  current_team text,
  positional_context jsonb,
  created_at timestamp with time zone default now(),
  metacognition_narrative text,
  feedback_receptivity_narrative text,
  locus_of_control_narrative text,
  social_intelligence_narrative text,
  cognitive_load_narrative text,
  grad_year text,
  is_minor boolean,
  parent_name text,
  consent_id uuid,
  entry_path text,
  inviting_program_id uuid,
  coachability_read text,
  setbacks_read text,
  compete_level_read text,
  team_orientation_read text,
  need_feedback text,
  need_motivation text,
  need_closeness text,
  need_setbacks text,
  closing_answer text,
  safety_flag boolean default false,
  inviting_program_name text,
  pronoun text,
  constraint athlete_vetting_pkey primary key (id),
  constraint athlete_vetting_entry_path_check check (((entry_path is null) or (entry_path = any (array['intake'::text, 'coach_invite'::text]))))
);

create table public.coach_verifications (
  id uuid default gen_random_uuid() not null,
  conversation_id text,
  athlete_id uuid,
  club_coach_name text,
  self_awareness_alignment text,
  maturity_index_rating text,
  created_at timestamp with time zone default now(),
  club_name text,
  team_name text,
  verified_metacognition text,
  verified_feedback_receptivity text,
  verified_locus_of_control text,
  verified_social_intelligence text,
  verified_cognitive_load text,
  athlete_name text,
  sport text,
  grad_year text,
  coach_role text,
  coach_email text,
  years_coached text,
  link_method text,
  entry_path text,
  coachability_read text,
  setbacks_read text,
  compete_level_read text,
  team_orientation_read text,
  need_feedback text,
  need_motivation text,
  need_closeness text,
  need_setbacks text,
  development_trajectory text,
  comparison_answer text,
  next_coach_advice text,
  low_specificity boolean default false,
  inviting_program_name text,
  "position" text,
  coaching_context text,
  anchor_example text,
  constraint coach_verifications_pkey primary key (id),
  constraint coach_verifications_entry_path_check check (((entry_path is null) or (entry_path = any (array['intake'::text, 'coach_invite'::text])))),
  constraint coach_verifications_maturity_index_rating_check check (((maturity_index_rating is null) or (maturity_index_rating = any (array['Self-Reflective'::text, 'Aligned'::text, 'Developing'::text, 'Not Yet Aware'::text]))))
);

create table public.asset_matches (
  id uuid default gen_random_uuid() not null,
  athlete_id uuid,
  program_id uuid,
  maturity_report text,
  asset_correlations jsonb,
  gaps_identified jsonb,
  fit_narrative text,
  created_at timestamp with time zone default now(),
  verification_level text,
  why_fit text,
  how_they_take_coaching text,
  watch_for text,
  disagreements jsonb,
  coach_verification_id uuid,
  athlete_read text,
  inputs_signature text,
  model text,
  updated_at timestamp with time zone default now(),
  constraint asset_matches_pkey primary key (id),
  constraint asset_matches_verification_level_check check (((verification_level is null) or (verification_level = any (array['self_reported'::text, 'verified'::text, 'proven'::text]))))
);

create table public.coach_contacts (
  id uuid default gen_random_uuid() not null,
  coach_name text,
  institution text,
  sport text,
  email text,
  mobile text,
  whatsapp text,
  channels text[] default '{}'::text[] not null,
  cadence text,
  sms_consent boolean default false not null,
  sms_consent_text text,
  sms_consent_at timestamp with time zone,
  ghl_contact_id text,
  ghl_synced_at timestamp with time zone,
  ghl_error text,
  source text,
  created_at timestamp with time zone default now() not null,
  constraint coach_contacts_pkey primary key (id),
  constraint coach_contacts_cadence_check check ((cadence = any (array['daily'::text, 'weekly'::text])))
);

create table public.recruit_comparisons (
  id uuid default gen_random_uuid() not null,
  program_id uuid,
  "position" text,
  status text default 'requested'::text,
  comparison_read text,
  created_at timestamp with time zone default now(),
  request_notes text,
  updated_at timestamp with time zone default now(),
  sport text,
  division text,
  team_gender text,
  coach_name text,
  coach_email text,
  confirm_token uuid default gen_random_uuid(),
  coach_attested_at timestamp with time zone,
  constraint recruit_comparisons_pkey primary key (id),
  constraint recruit_comparisons_status_check check ((status = any (array['requested'::text, 'invites_sent'::text, 'in_progress'::text, 'complete'::text])))
);

create table public.interview_consents (
  id uuid default gen_random_uuid() not null,
  interview_type text not null,
  athlete_name text not null,
  sport text,
  grad_year text,
  is_minor boolean not null,
  parent_name text,
  consent_text text not null,
  page_url text,
  user_agent text,
  conversation_id text,
  created_at timestamp with time zone default now() not null,
  recruit_id uuid,
  sms_opt_in boolean default false,
  constraint interview_consents_pkey primary key (id),
  constraint interview_consents_interview_type_check check ((interview_type = any (array['athlete'::text, 'club'::text]))),
  constraint minor_needs_parent check (((not is_minor) or (coalesce(length(trim(both from parent_name)), 0) > 0)))
);

create table public.comparison_recruits (
  id uuid default gen_random_uuid() not null,
  comparison_id uuid,
  athlete_id uuid,
  recruit_name text,
  club_or_school text,
  club_coach_name text,
  club_coach_contact text,
  coach_open_question text,
  athlete_done boolean default false,
  club_coach_done boolean default false,
  created_at timestamp with time zone default now(),
  grad_year integer,
  "position" text,
  athlete_email text,
  athlete_phone text,
  parent_name text,
  parent_email text,
  parent_phone text,
  club_coach_email text,
  club_coach_phone text,
  contact_status text default 'pending'::text,
  contact_clear_date date,
  contact_rule_text text,
  invite_token uuid default gen_random_uuid(),
  club_invite_token uuid default gen_random_uuid(),
  consent_id uuid,
  sms_opt_in boolean default false,
  coach_verification_id uuid,
  athlete_invited_at timestamp with time zone,
  club_invited_at timestamp with time zone,
  constraint comparison_recruits_pkey primary key (id),
  constraint comparison_recruits_contact_status_check check ((contact_status = any (array['pending'::text, 'cleared'::text, 'hold'::text])))
);

create table public.contact_rules (
  id uuid default gen_random_uuid() not null,
  division text not null,
  sport text not null,
  gender text default 'any'::text not null,
  rule_kind text not null,
  year_offset integer,
  month integer,
  day integer,
  rule_text text not null,
  source_url text,
  verified_on date,
  constraint contact_rules_division_sport_gender_key unique (division, sport, gender),
  constraint contact_rules_pkey primary key (id),
  constraint contact_rules_rule_kind_check check ((rule_kind = any (array['anytime'::text, 'fixed_date'::text, 'wed_after_labor_day'::text])))
);

create table public.fit_read_requests (
  id uuid default gen_random_uuid() not null,
  athlete_id uuid,
  program_id uuid,
  comparison_id uuid,
  force boolean default false not null,
  status text default 'pending'::text not null,
  result_id uuid,
  error text,
  created_at timestamp with time zone default now() not null,
  finished_at timestamp with time zone,
  constraint fit_read_requests_pkey primary key (id),
  constraint fit_read_requests_status_check check ((status = any (array['pending'::text, 'running'::text, 'done'::text, 'error'::text])))
);

create table public.invite_events (
  id uuid default gen_random_uuid() not null,
  comparison_id uuid,
  recruit_id uuid,
  recipient_role text,
  channel text,
  status text,
  detail text,
  created_at timestamp with time zone default now(),
  constraint invite_events_pkey primary key (id)
);

create table public.scenario_responses (
  id uuid default gen_random_uuid() not null,
  conversation_id text,
  respondent_type text not null,
  athlete_id uuid,
  coach_verification_id uuid,
  program_id uuid,
  sport text,
  scenario_id text not null,
  response_text text,
  followup_text text,
  anchor_example text,
  created_at timestamp with time zone default now(),
  constraint scenario_responses_pkey primary key (id),
  constraint scenario_responses_respondent_type_check check ((respondent_type = any (array['athlete'::text, 'club_coach'::text, 'college_coach'::text])))
);

create table public.season_one_checks (
  id uuid default gen_random_uuid() not null,
  match_id uuid,
  program_id uuid,
  athlete_id uuid,
  read_held_up text,
  what_we_missed text,
  created_at timestamp with time zone default now(),
  constraint season_one_checks_pkey primary key (id),
  constraint season_one_checks_read_held_up_check check (((read_held_up is null) or (read_held_up = any (array['yes'::text, 'partly'::text, 'no'::text]))))
);

alter table public.asset_matches add constraint asset_matches_athlete_id_fkey foreign key (athlete_id) references athlete_vetting(id);
alter table public.asset_matches add constraint asset_matches_coach_verification_id_fkey foreign key (coach_verification_id) references coach_verifications(id);
alter table public.asset_matches add constraint asset_matches_program_id_fkey foreign key (program_id) references program_dna(id);
alter table public.athlete_vetting add constraint athlete_vetting_inviting_program_id_fkey foreign key (inviting_program_id) references program_dna(id);
alter table public.coach_verifications add constraint coach_verifications_athlete_id_fkey foreign key (athlete_id) references athlete_vetting(id);
alter table public.comparison_recruits add constraint comparison_recruits_athlete_id_fkey foreign key (athlete_id) references athlete_vetting(id);
alter table public.comparison_recruits add constraint comparison_recruits_coach_verification_id_fkey foreign key (coach_verification_id) references coach_verifications(id);
alter table public.comparison_recruits add constraint comparison_recruits_comparison_id_fkey foreign key (comparison_id) references recruit_comparisons(id) on delete cascade;
alter table public.comparison_recruits add constraint comparison_recruits_consent_id_fkey foreign key (consent_id) references interview_consents(id);
alter table public.fit_read_requests add constraint fit_read_requests_athlete_id_fkey foreign key (athlete_id) references athlete_vetting(id) on delete cascade;
alter table public.fit_read_requests add constraint fit_read_requests_comparison_id_fkey foreign key (comparison_id) references recruit_comparisons(id) on delete cascade;
alter table public.fit_read_requests add constraint fit_read_requests_program_id_fkey foreign key (program_id) references program_dna(id) on delete cascade;
alter table public.interview_consents add constraint interview_consents_recruit_id_fkey foreign key (recruit_id) references comparison_recruits(id) on delete set null;
alter table public.invite_events add constraint invite_events_comparison_id_fkey foreign key (comparison_id) references recruit_comparisons(id) on delete cascade;
alter table public.invite_events add constraint invite_events_recruit_id_fkey foreign key (recruit_id) references comparison_recruits(id) on delete cascade;
alter table public.recruit_comparisons add constraint recruit_comparisons_program_id_fkey foreign key (program_id) references program_dna(id);
alter table public.scenario_responses add constraint scenario_responses_athlete_id_fkey foreign key (athlete_id) references athlete_vetting(id);
alter table public.scenario_responses add constraint scenario_responses_coach_verification_id_fkey foreign key (coach_verification_id) references coach_verifications(id);
alter table public.scenario_responses add constraint scenario_responses_program_id_fkey foreign key (program_id) references program_dna(id);
alter table public.season_one_checks add constraint season_one_checks_athlete_id_fkey foreign key (athlete_id) references athlete_vetting(id);
alter table public.season_one_checks add constraint season_one_checks_match_id_fkey foreign key (match_id) references asset_matches(id);
alter table public.season_one_checks add constraint season_one_checks_program_id_fkey foreign key (program_id) references program_dna(id);

create index coach_contacts_email_idx on public.coach_contacts using btree (lower(email));
create index scenario_responses_lookup on public.scenario_responses using btree (respondent_type, scenario_id);
create index scenario_responses_athlete on public.scenario_responses using btree (athlete_id);
create index scenario_responses_cv on public.scenario_responses using btree (coach_verification_id);
create index scenario_responses_program on public.scenario_responses using btree (program_id);

-- Every table: RLS on, no policies. Only the service role (edge functions) reads and writes.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Reference data that production has (12 rows, verified_on 2026-10-17).
insert into public.contact_rules (division, sport, gender, rule_kind, year_offset, month, day, rule_text, source_url, verified_on) values
  ('D1', 'baseball', 'any', 'fixed_date', -2, 8, 1, 'August 1 entering junior year', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D1', 'basketball', 'men', 'fixed_date', -2, 6, 15, 'June 15 after sophomore year', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D1', 'basketball', 'women', 'fixed_date', -2, 6, 1, 'June 1 after sophomore year', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D1', 'lacrosse', 'men', 'wed_after_labor_day', -2, 9, null, 'Wednesday after Labor Day entering junior year', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D1', 'lacrosse', 'women', 'fixed_date', -2, 9, 1, 'September 1 entering junior year', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D1', 'soccer', 'any', 'fixed_date', -2, 6, 15, 'June 15 after sophomore year', 'https://www.ncsasports.org/ncaa-eligibility-center/recruiting-rules', '2026-10-17'),
  ('D1', 'softball', 'any', 'fixed_date', -2, 9, 1, 'September 1 of junior year', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D1', 'volleyball', 'any', 'fixed_date', -2, 6, 15, 'June 15 after sophomore year', 'https://www.ncsasports.org/ncaa-eligibility-center/recruiting-rules', '2026-10-17'),
  ('D2', '*', 'any', 'anytime', null, null, null, 'Electronic contact allowed at any time', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('D3', '*', 'any', 'anytime', null, null, null, 'Electronic contact allowed at any time', 'https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-rules-and-regulations', '2026-10-17'),
  ('NAIA', '*', 'any', 'anytime', null, null, null, 'No NCAA contact calendar (verify with compliance)', null, '2026-10-17'),
  ('NJCAA', '*', 'any', 'anytime', null, null, null, 'No NCAA contact calendar (verify with compliance)', null, '2026-10-17');

insert into public.app_config (key, value, note) values
  ('elevenlabs_athlete_agent_id', null, 'Public agent ID of the Vekt Athlete agent'),
  ('elevenlabs_club_agent_id', null, 'Public agent ID of the Vekt Club Coach agent'),
  ('ghl_email_from', null, 'Optional From address for GHL emails'),
  ('ghl_location_id', '', 'GoHighLevel location (sub-account) ID'),
  ('invite_base_url', 'https://vekt-invite.vercel.app', 'Public site that hosts the invite pages, no trailing slash'),
  ('invites_live', 'false', 'When false, invites are logged as dry_run and nothing is sent');
