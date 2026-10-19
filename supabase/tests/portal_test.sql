-- pgTAP tests for the VEKT Coach Portal. Run with: npx supabase test db
-- Relies on supabase/seed.sql (applied by `supabase db reset`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Act as a signed-in user (or as the service role) for the next statements.
create or replace function pg_temp.login(p_user uuid, p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
create or replace function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end $$;

-- Fixed ids from seed.sql
--   reyes  = head coach, Harbor Men's Soccer      lind  = head coach, Harbor Women's Volleyball
--   ad     = Harbor dept admin                     comp  = Harbor compliance
--   berg   = head coach at Lakeside (other school)
\set reyes '''00000000-0000-4000-a000-000000000002'''
\set lind  '''00000000-0000-4000-a000-000000000004'''
\set ad    '''00000000-0000-4000-a000-000000000001'''
\set comp  '''00000000-0000-4000-a000-000000000005'''
\set berg  '''00000000-0000-4000-a000-000000000006'''
\set msoc  '''20000000-0000-4000-a000-000000000001'''
\set wvb   '''20000000-0000-4000-a000-000000000003'''

-- ---------------------------------------------------------------------------
-- RLS: program and department isolation
-- ---------------------------------------------------------------------------
select pg_temp.login(:reyes, 'coach.reyes@harborstate.edu');
select is((select count(*) from portal_prospects), 22::bigint, 'Head coach sees only his program''s 22 prospects');
select is((select count(*) from portal_prospects where program_id = :wvb), 0::bigint, 'Coach cannot see another program in the same school');
select is((select count(*) from portal_prospects where program_id = '20000000-0000-4000-a000-000000000005'), 0::bigint,
  'Coach cannot see another school''s prospects');
select is((select count(*) from portal_departments), 1::bigint, 'Coach sees only their own department');
select is((select count(*) from portal_invitations where program_id <> :msoc), 0::bigint, 'Coach sees only their program''s invitations');

select pg_temp.login(:ad, 'ad@harborstate.edu');
select is((select count(*) from portal_prospects), 40::bigint, 'Department admin sees every Harbor program (40 prospects)');
select is((select count(*) from portal_prospects where program_id = '20000000-0000-4000-a000-000000000005'), 0::bigint,
  'Department admin cannot see another school');

select pg_temp.login(:berg, 'coach.berg@lakeside.edu');
select is((select count(*) from portal_prospects), 1::bigint, 'Other school''s coach sees only their own prospect');
select is((select count(*) from portal_briefs), 0::bigint, 'Other school''s coach cannot read Harbor briefs');

-- ---------------------------------------------------------------------------
-- Triple-blind: no browser role can read raw transcripts
-- ---------------------------------------------------------------------------
select pg_temp.login(:reyes, 'coach.reyes@harborstate.edu');
select is((select count(*) from portal_agent_transcripts), 0::bigint, 'Coach cannot read raw agent transcripts');
select is((select count(*) from portal_briefs where program_id = :msoc), 2::bigint, 'Coach can read their program''s synthesized briefs');
select pg_temp.login(:ad, 'ad@harborstate.edu');
select is((select count(*) from portal_agent_transcripts), 0::bigint, 'Department admin cannot read raw transcripts');
select pg_temp.login(:comp, 'compliance@harborstate.edu');
select is((select count(*) from portal_agent_transcripts), 0::bigint, 'Compliance cannot read raw transcripts');
select is((select count(*) from portal_suppressions), 0::bigint, 'Compliance cannot read the global suppression list');
select pg_temp.as_service();
select is((select count(*) from portal_agent_transcripts), 2::bigint, 'Service role (agent service) can read transcripts');

-- ---------------------------------------------------------------------------
-- Direct writes are blocked; invitations only come from the RPC
-- ---------------------------------------------------------------------------
select pg_temp.login(:reyes, 'coach.reyes@harborstate.edu');
select throws_ok(
  $$insert into portal_invitations (program_id, prospect_id, recipient_type, recipient_name, to_phone, channel, rendered_body)
    values ('20000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000015', 'athlete', 'x', '+12025550100', 'sms', 'x')$$,
  '42501', null, 'Coaches cannot insert invitations directly');
select throws_ok(
  $$insert into portal_prospects (program_id, first_name, last_name, email)
    values ('20000000-0000-4000-a000-000000000003', 'Nope', 'Wrong', 'nope@example.com')$$,
  '42501', null, 'Coaches cannot add prospects to another program');
select throws_ok($$select portal_claim_due_invitations(10)$$, '42501', null, 'Coaches cannot call the dispatcher');
select throws_ok($$select portal_record_message_event('ghl', 'x', 'delivered')$$, '42501', null, 'Coaches cannot forge webhook events');

-- ---------------------------------------------------------------------------
-- Queueing rules
-- ---------------------------------------------------------------------------
-- Prospect 15: grad 2027 (i%3=0), has guardian → contact window open (Jun 15, 2025) → queued.
select is(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000015'::uuid], array['sms']) ->> 'queued')::int,
  2, 'Minor with guardian: athlete invite + guardian copy are queued');
select is((select count(*) from portal_invitations
           where prospect_id = '40000000-0000-4000-a000-000000000015' and recipient_type = 'guardian'), 1::bigint,
  'Guardian receives a copy of a minor''s invitation');

-- Prospect 17: grad 2029 → contact not permitted until Jun 15, 2027 → blocked.
select is(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000017'::uuid], array['sms']) -> 'results' -> 0 ->> 'reason'),
  'Recruiting contact not permitted until Jun 15, 2027', 'Contact-date rule blocks early sends');

-- Prospect 21: every 7th prospect has no guardian; grad 2027 → minor without guardian → blocked.
select is(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000021'::uuid], array['sms']) -> 'results' -> 0 ->> 'reason'),
  'Minor: a parent/guardian contact is required before inviting', 'Minor without guardian contact is blocked');

-- Prospect 9 replied STOP in the seed data.
select is(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000009'::uuid], array['sms'], true, false, null, null, true) -> 'results' -> 0 ->> 'reason'),
  'Recipient has opted out', 'Suppressed number is blocked even when forced');

-- Duplicate protection on prospect 15.
select is(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000015'::uuid], array['sms']) -> 'results' -> 0 ->> 'reason') like 'Already invited on %',
  true, 'Second invite inside 14 days is blocked');
select is(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000018'::uuid], array['sms', 'email'], true, false, null, null, false, true) ->> 'dry_run')::boolean,
  true, 'Dry run returns a preview');
select is((select count(*) from portal_invitations where prospect_id = '40000000-0000-4000-a000-000000000018'), 0::bigint,
  'Dry run writes nothing');
select ok(
  (portal_queue_invitations(array['40000000-0000-4000-a000-000000000018'::uuid], array['sms'], true, false, 'See you at the ID camp!', null, false, true)
     -> 'results' -> 0 ->> 'body') like '%See you at the ID camp!%Reply STOP to opt out.',
  'Personal note is merged and the opt-out line is always appended');

-- Unlicensed program.
select pg_temp.as_postgres();
insert into portal_staff_programs (staff_id, program_id) values ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000004');
insert into portal_prospects (id, program_id, first_name, last_name, mobile, grad_year)
  values ('40000000-0000-4000-a000-000000000201', '20000000-0000-4000-a000-000000000004', 'Unl', 'Icensed', '+12025550177', 2027);
select pg_temp.login(:reyes, 'coach.reyes@harborstate.edu');
select throws_like(
  $$select portal_queue_invitations(array['40000000-0000-4000-a000-000000000201'::uuid], array['sms'])$$,
  '%is not licensed%', 'Unlicensed program cannot send');

-- ---------------------------------------------------------------------------
-- Quiet hours and minor detection
-- ---------------------------------------------------------------------------
select is(portal_next_send_window('2026-10-20 02:00:00+00', 'America/New_York'),
  '2026-10-20 13:00:00+00'::timestamptz, '10pm Eastern is pushed to 9am the next morning');
select is(portal_next_send_window('2026-10-20 11:00:00+00', 'America/New_York'),
  '2026-10-20 13:00:00+00'::timestamptz, '7am Eastern is pushed to 9am the same day');
select is(portal_next_send_window('2026-10-20 18:00:00+00', 'America/Los_Angeles'),
  '2026-10-20 18:00:00+00'::timestamptz, '11am Pacific sends immediately');
select is(portal_is_minor(null, extract(year from current_date)::int + 1), true, 'Next year''s grad counts as a minor');
select is(portal_is_minor('2000-01-01', 2018), false, 'A 26-year-old is not a minor');

-- ---------------------------------------------------------------------------
-- Dispatcher, webhooks, opt-outs (service role)
-- ---------------------------------------------------------------------------
select pg_temp.as_postgres();
update portal_invitations set scheduled_for = now() - interval '1 minute'
  where prospect_id = '40000000-0000-4000-a000-000000000015';
select pg_temp.as_service();
select is((select count(*) from portal_claim_due_invitations(50) where prospect_id = '40000000-0000-4000-a000-000000000015'),
  2::bigint, 'Dispatcher claims due invitations');
select portal_mark_sent(id, 'ghl_c_15', 'ghl_m_15_' || recipient_type) from portal_invitations
  where prospect_id = '40000000-0000-4000-a000-000000000015';
select is(portal_record_message_event('ghl', 'evt-1', 'delivered', 'ghl_m_15_athlete'), true, 'Webhook event recorded');
select is(portal_record_message_event('ghl', 'evt-1', 'delivered', 'ghl_m_15_athlete'), false, 'Duplicate webhook is ignored (idempotent)');
select is((select status from portal_invitations where ghl_message_id = 'ghl_m_15_athlete'), 'delivered', 'Status advanced to delivered');
select portal_record_message_event('ghl', 'evt-2', 'sent', 'ghl_m_15_athlete');
select is((select status from portal_invitations where ghl_message_id = 'ghl_m_15_athlete'), 'delivered',
  'Late, out-of-order events never move status backwards');

-- STOP from prospect 15's guardian blocks every queued send to that number, in every program.
select pg_temp.as_postgres();
insert into portal_invitations (program_id, prospect_id, recipient_type, recipient_name, to_phone, channel, rendered_body, status, scheduled_for)
select '20000000-0000-4000-a000-000000000001', id, 'guardian', 'x', guardian_mobile, 'sms', 'x', 'queued', now() + interval '1 day'
from portal_prospects where id = '40000000-0000-4000-a000-000000000015';
select pg_temp.as_service();
select portal_record_message_event('ghl', 'evt-stop', 'opted_out', null, null, 'sms',
  (select guardian_mobile from portal_prospects where id = '40000000-0000-4000-a000-000000000015'), 'STOP');
select is((select count(*) from portal_suppressions where value =
  (select guardian_mobile from portal_prospects where id = '40000000-0000-4000-a000-000000000015')), 1::bigint, 'STOP adds a suppression');
select is((select count(*) from portal_invitations where status = 'queued' and to_phone =
  (select guardian_mobile from portal_prospects where id = '40000000-0000-4000-a000-000000000015')), 0::bigint,
  'STOP blocks every queued send to that number');

-- ---------------------------------------------------------------------------
-- Audit log is append-only
-- ---------------------------------------------------------------------------
select pg_temp.as_postgres();
select throws_like($$update portal_audit_log set action = 'x'$$, '%append-only%', 'Audit log cannot be edited');

select * from finish();
rollback;
