-- Local demo data for the VEKT Coach Portal. Runs on `supabase db reset`
-- (local only — never run against production). Every person, school and
-- phone number here is fictional; phone numbers use the reserved 555-01xx range.
--
-- Demo logins (password for all: vekt-demo-2026)
--   ad@harborstate.edu           Athletic department admin
--   coach.reyes@harborstate.edu  Head coach, Men's Soccer
--   coach.okafor@harborstate.edu Assistant coach, Men's Soccer
--   coach.lind@harborstate.edu   Head coach, Women's Volleyball
--   compliance@harborstate.edu   Compliance officer
--   coach.berg@lakeside.edu      Head coach at a second school (isolation demo)
--   admin@vekt.ai                VEKT super admin

do $$
declare
  pw text := crypt('vekt-demo-2026', gen_salt('bf'));
  u record;
begin
  for u in select * from (values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'ad@harborstate.edu'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'coach.reyes@harborstate.edu'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'coach.okafor@harborstate.edu'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'coach.lind@harborstate.edu'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'compliance@harborstate.edu'),
    ('00000000-0000-4000-a000-000000000006'::uuid, 'coach.berg@lakeside.edu'),
    ('00000000-0000-4000-a000-000000000009'::uuid, 'admin@vekt.ai')) as t(id, email)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, pw, now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now());
  end loop;
end $$;

insert into portal_super_admins (user_id) values ('00000000-0000-4000-a000-000000000009');

insert into portal_departments (id, name, division, conference, time_zone, license_type, license_start, license_end, billing_status)
values
  ('10000000-0000-4000-a000-000000000001', 'Harbor State University', 'NCAA D1', 'Coastal Athletic Conference',
   'America/New_York', 'per_sport', '2026-08-01', '2027-07-31', 'paid'),
  ('10000000-0000-4000-a000-000000000002', 'Lakeside College', 'NCAA D3', 'North Shore Conference',
   'America/Chicago', 'all_sports', '2026-08-01', '2027-07-31', 'invoiced');

insert into portal_programs (id, department_id, sport, gender, licensed) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Soccer', 'mens', true),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Soccer', 'womens', true),
  ('20000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Volleyball', 'womens', true),
  ('20000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001', 'Basketball', 'mens', false),
  ('20000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000002', 'Soccer', 'mens', false);

insert into portal_staff (id, user_id, department_id, role, first_name, last_name, title, email) values
  ('30000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001',
   'dept_admin', 'Dana', 'Whitfield', 'Deputy Athletic Director', 'ad@harborstate.edu'),
  ('30000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001',
   'head_coach', 'Marco', 'Reyes', 'Head Coach, Men''s Soccer', 'coach.reyes@harborstate.edu'),
  ('30000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001',
   'assistant_coach', 'Tobi', 'Okafor', 'Assistant Coach, Men''s Soccer', 'coach.okafor@harborstate.edu'),
  ('30000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001',
   'head_coach', 'Kara', 'Lind', 'Head Coach, Women''s Volleyball', 'coach.lind@harborstate.edu'),
  ('30000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000001',
   'compliance', 'Priya', 'Natarajan', 'Director of Compliance', 'compliance@harborstate.edu'),
  ('30000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000002',
   'head_coach', 'Erik', 'Berg', 'Head Coach, Men''s Soccer', 'coach.berg@lakeside.edu'),
  ('30000000-0000-4000-a000-000000000007', null, '10000000-0000-4000-a000-000000000001',
   'head_coach', 'Alana', 'Pierce', 'Head Coach, Women''s Soccer', 'coach.pierce@harborstate.edu');

insert into portal_staff_programs (staff_id, program_id) values
  ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000003'),
  ('30000000-0000-4000-a000-000000000006', '20000000-0000-4000-a000-000000000005'),
  ('30000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000002');

insert into portal_coach_style_profiles (program_id, coaching_style, accountability, culture, locker_room, updated_by) values
  ('20000000-0000-4000-a000-000000000001',
   'Demanding and high-volume. Possession-based, high press.',
   'Public accountability in film sessions; standards are posted.',
   'Tight senior leadership group; freshmen earn minutes in training.',
   'Competitive, vocal locker room. Thrives on players who respond to direct challenge.',
   '30000000-0000-4000-a000-000000000002'),
  ('20000000-0000-4000-a000-000000000003',
   'Detail-driven, teaching-first. Lots of individual video.',
   'Private feedback first, team standards second.',
   'Close-knit, low-ego culture.',
   'Quiet, steady locker room. Values consistency over flash.',
   '30000000-0000-4000-a000-000000000004');

-- Demo recruiting-contact rules. NOT verified — compliance must replace these.
insert into portal_contact_rules (department_id, division, sport, gender, years_before_grad, permitted_month, permitted_day, verified, source_note)
values
  (null, 'NCAA D1', null, null, 2, 6, 15, false, 'Demo value for local testing only. Not verified by compliance.'),
  (null, 'NCAA D3', null, null, 3, 6, 15, false, 'Demo value for local testing only. Not verified by compliance.');

-- ---------------------------------------------------------------------------
-- Prospects (40 at Harbor State, 3 at Lakeside)
-- ---------------------------------------------------------------------------

do $$
declare
  firsts text[] := array['Mateo','Liam','Noah','Elijah','Julian','Theo','Gabriel','Caleb','Isaac','Adrian',
                         'Marcus','Dominic','Rafael','Owen','Sebastian','Diego','Kai','Andre','Luca','Jonah',
                         'Nico','Malik'];
  wfirsts text[] := array['Sofia','Ava','Maya','Isla','Chloe','Naomi','Elena','Harper','Zoe','Lucia',
                          'Grace','Amara','Leah','Talia','Nora','Ivy','Camila','Jada'];
  lasts text[] := array['Alvarez','Bennett','Carter','Dawson','Ellis','Foster','Garza','Hayes','Ibarra','Jensen',
                        'Kowalski','Lopez','Mensah','Nolan','Ortega','Park','Quinn','Rivera','Sato','Torres',
                        'Underwood','Vega','Walsh','Xu','Young','Zamora','Brooks','Cruz','Diaz','Evans',
                        'Fischer','Grant','Hughes','Iverson','Jordan','Kim','Lambert','Moreno','Nash','Owens'];
  soccer_pos text[] := array['Center Midfielder','Striker','Winger','Center Back','Fullback','Goalkeeper','Attacking Midfielder','Defensive Midfielder'];
  vb_pos text[] := array['Outside Hitter','Setter','Middle Blocker','Libero','Opposite'];
  states text[] := array['NJ','NY','FL','TX','CA','NC','GA','PA','OH','IL','VA','MD','AZ','CO','WA'];
  clubs text[] := array['Garden State FC','Metro United Academy','Coastal Elite SC','Lone Star Premier','Pacific Rise FC',
                        'Triangle Select','Peachtree Academy','Keystone United','Buckeye Premier','Lakefront SC'];
  vb_clubs text[] := array['Summit Volleyball Club','Ironbound VBC','Gulf Coast Elite VB','Rocky Mountain Juniors','Harbor City VBC'];
  i integer;
  prog uuid;
  fname text;
  grad integer;
  minor_guardian boolean;
  st text;
begin
  for i in 1..40 loop
    if i <= 22 then
      prog := '20000000-0000-4000-a000-000000000001'; fname := firsts[i];
    elsif i <= 30 then
      prog := '20000000-0000-4000-a000-000000000002'; fname := wfirsts[i - 22];
    else
      prog := '20000000-0000-4000-a000-000000000003'; fname := wfirsts[i - 22];
    end if;
    grad := case i % 3 when 0 then 2027 when 1 then 2028 else 2029 end;
    st := states[1 + (i % array_length(states, 1))];
    minor_guardian := i % 7 <> 0; -- every 7th prospect is missing guardian details
    insert into portal_prospects (id, program_id, first_name, last_name, mobile, email, grad_year, positions,
      high_school, club_team, club_level, city, state, film_links, gpa, guardian_name, guardian_mobile, guardian_email,
      guardian_relationship, priority, tags, source, created_by)
    values (
      ('40000000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid, prog, fname, lasts[i],
      '+1' || (201 + i)::text || '55501' || lpad((i % 100)::text, 2, '0'),
      lower(fname) || '.' || lower(lasts[i]) || i || '@example.com',
      grad,
      case when prog = '20000000-0000-4000-a000-000000000003'
           then array[vb_pos[1 + (i % 5)]]
           else array[soccer_pos[1 + (i % 8)], soccer_pos[1 + ((i + 3) % 8)]] end,
      st || ' Regional High School',
      case when prog = '20000000-0000-4000-a000-000000000003' then vb_clubs[1 + (i % 5)] else clubs[1 + (i % 10)] end,
      case when prog = '20000000-0000-4000-a000-000000000003' then 'Open 17s' else 'MLS NEXT / ECNL' end,
      'Hometown', st,
      array['https://example.com/film/' || i],
      round((3.0 + (i % 10) * 0.09)::numeric, 2),
      case when minor_guardian then 'Pat ' || lasts[i] end,
      case when minor_guardian then '+1' || (301 + i)::text || '55502' || lpad((i % 100)::text, 2, '0') end,
      case when minor_guardian then 'pat.' || lower(lasts[i]) || i || '@example.com' end,
      case when minor_guardian then 'Parent' end,
      (array['A','B','C'])[1 + (i % 3)],
      case when i % 5 = 0 then array['summer ID camp'] else '{}' end,
      case when i % 4 = 0 then 'csv' else 'manual' end,
      case when prog = '20000000-0000-4000-a000-000000000003' then '30000000-0000-4000-a000-000000000004'::uuid
           else '30000000-0000-4000-a000-000000000002'::uuid end);
  end loop;

  -- Lakeside's own prospect — Harbor staff must never see it.
  insert into portal_prospects (id, program_id, first_name, last_name, mobile, email, grad_year, positions, state, created_by)
  values ('40000000-0000-4000-a000-000000000101', '20000000-0000-4000-a000-000000000005', 'Felix', 'Hart',
          '+16125550101', 'felix.hart@example.com', 2027, '{Striker}', 'MN', '30000000-0000-4000-a000-000000000006');
end $$;

-- Club contacts (10), each linked to a few prospects in their program.
insert into portal_club_contacts (id, program_id, first_name, last_name, role, club, mobile, email) values
  ('50000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 'Sam', 'Delgado', 'club_director', 'Metro United Academy', '+12015550190', 'sam.delgado@example.com'),
  ('50000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', 'Chris', 'Moyo', 'club_coach', 'Coastal Elite SC', '+13055550191', 'chris.moyo@example.com'),
  ('50000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001', 'Jordan', 'Pike', 'club_director', 'Lone Star Premier', '+12145550192', 'jordan.pike@example.com'),
  ('50000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000001', 'Ana', 'Ruiz', 'club_coach', 'Pacific Rise FC', null, 'ana.ruiz@example.com'),
  ('50000000-0000-4000-a000-000000000005', '20000000-0000-4000-a000-000000000001', 'Ben', 'Sterling', 'club_director', 'Garden State FC', '+19735550193', null),
  ('50000000-0000-4000-a000-000000000006', '20000000-0000-4000-a000-000000000002', 'Rosa', 'Klein', 'club_director', 'Triangle Select', '+19195550194', 'rosa.klein@example.com'),
  ('50000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000002', 'Devon', 'Ash', 'club_coach', 'Peachtree Academy', '+14045550195', 'devon.ash@example.com'),
  ('50000000-0000-4000-a000-000000000008', '20000000-0000-4000-a000-000000000003', 'Mia', 'Larsen', 'club_director', 'Summit Volleyball Club', '+13035550196', 'mia.larsen@example.com'),
  ('50000000-0000-4000-a000-000000000009', '20000000-0000-4000-a000-000000000003', 'Theo', 'Grant', 'club_coach', 'Ironbound VBC', '+18625550197', 'theo.grant@example.com'),
  ('50000000-0000-4000-a000-000000000010', '20000000-0000-4000-a000-000000000003', 'Lena', 'Voss', 'club_director', 'Gulf Coast Elite VB', '+17135550198', 'lena.voss@example.com');

insert into portal_prospect_club_contacts (prospect_id, club_contact_id)
select ('40000000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       ('50000000-0000-4000-a000-' || lpad((case
          when i <= 22 then 1 + (i % 5)
          when i <= 30 then 6 + (i % 2)
          else 8 + (i % 3) end)::text, 12, '0'))::uuid
from generate_series(1, 40) i
where i % 2 = 1 or i <= 6;

-- ---------------------------------------------------------------------------
-- Invitations in every status, with an event history for each.
-- ---------------------------------------------------------------------------

do $$
declare
  spec record;
  pr portal_prospects;
  inv_id uuid;
  t0 timestamptz;
  ev text;
  k integer;
  evs text[];
begin
  for spec in select * from (values
    -- prospect #, status, channel, recipient, days ago, events after 'queued'
    (1,  'completed', 'sms',   'athlete', 12, array['sent','delivered','clicked','started','completed']),
    (2,  'completed', 'sms',   'athlete', 10, array['sent','delivered','clicked','started','completed']),
    (3,  'started',   'sms',   'athlete', 4,  array['sent','delivered','clicked','started']),
    (4,  'clicked',   'email', 'athlete', 3,  array['sent','delivered','opened','clicked']),
    (5,  'delivered', 'sms',   'athlete', 2,  array['sent','delivered']),
    (6,  'sent',      'email', 'athlete', 1,  array['sent']),
    (7,  'failed',    'sms',   'athlete', 5,  array['sent','failed']),
    (8,  'replied',   'sms',   'athlete', 6,  array['sent','delivered','replied']),
    (9,  'opted_out', 'sms',   'athlete', 8,  array['sent','delivered','opted_out']),
    (10, 'queued',    'sms',   'athlete', 0,  array[]::text[]),
    (11, 'pending_approval', 'email', 'athlete', 0, array[]::text[]),
    (12, 'cancelled', 'email', 'athlete', 2,  array['cancelled']),
    (14, 'blocked',   'sms',   'athlete', 1,  array[]::text[]),
    (31, 'completed', 'sms',   'athlete', 9,  array['sent','delivered','clicked','started','completed']),
    (32, 'delivered', 'email', 'athlete', 2,  array['sent','delivered','opened']),
    (33, 'started',   'sms',   'athlete', 3,  array['sent','delivered','clicked','started']),
    (23, 'delivered', 'sms',   'athlete', 1,  array['sent','delivered'])
  ) as t(n, status, channel, rtype, days_ago, events)
  loop
    select * into pr from portal_prospects where id = ('40000000-0000-4000-a000-' || lpad(spec.n::text, 12, '0'))::uuid;
    t0 := now() - make_interval(days => spec.days_ago, hours => 2);
    insert into portal_invitations (program_id, prospect_id, recipient_type, recipient_name, to_phone, to_email, channel,
      template_id, rendered_subject, rendered_body, scheduled_for, status, status_detail, sent_by, sent_at, delivered_at,
      clicked_at, started_at, completed_at, ghl_contact_id, ghl_message_id, created_at)
    values (pr.program_id, pr.id, 'athlete', pr.first_name || ' ' || pr.last_name,
      case when spec.channel = 'sms' then pr.mobile end, case when spec.channel = 'email' then pr.email end, spec.channel,
      (select id from portal_templates where kind = 'invite' and recipient_type = 'athlete' and channel = spec.channel limit 1),
      case when spec.channel = 'email' then 'Harbor State University Mens Soccer invited you to VEKT' end,
      'Hi ' || pr.first_name || ', Marco Reyes from Harbor State University Mens Soccer would like to learn more about you through VEKT. Start here: http://127.0.0.1:54321/functions/v1/portal-start?t=demo' || spec.n
        || E'\n\n' || portal_legal_footer(spec.channel),
      case when spec.status = 'queued' then now() + interval '2 hours' else t0 end,
      spec.status,
      case spec.status
        when 'failed' then 'Carrier rejected: unreachable number'
        when 'opted_out' then 'Recipient replied STOP'
        when 'blocked' then 'Recruiting contact not permitted until Jun 15, 2027'
        when 'cancelled' then 'Cancelled by coach' end,
      case when pr.program_id = '20000000-0000-4000-a000-000000000003' then '30000000-0000-4000-a000-000000000004'::uuid
           else '30000000-0000-4000-a000-000000000002'::uuid end,
      case when 'sent' = any (spec.events) then t0 + interval '1 minute' end,
      case when 'delivered' = any (spec.events) then t0 + interval '2 minutes' end,
      case when 'clicked' = any (spec.events) or 'replied' = any (spec.events) then t0 + interval '3 hours' end,
      case when 'started' = any (spec.events) then t0 + interval '3 hours 5 minutes' end,
      case when 'completed' = any (spec.events) then t0 + interval '1 day' end,
      case when 'sent' = any (spec.events) then 'ghl_contact_demo_' || spec.n end,
      case when 'sent' = any (spec.events) then 'ghl_msg_demo_' || spec.n end,
      t0)
    returning id into inv_id;

    insert into portal_message_events (invitation_id, event, detail, occurred_at)
    values (inv_id, case when spec.status = 'blocked' then 'blocked' else 'queued' end,
            case when spec.status = 'blocked' then 'Recruiting contact not permitted until Jun 15, 2027' end, t0);
    if spec.status = 'pending_approval' then
      update portal_invitations set status_detail = 'Waiting for compliance approval' where id = inv_id;
    end if;
    k := 0;
    foreach ev in array spec.events loop
      k := k + 1;
      insert into portal_message_events (invitation_id, event, provider, provider_event_id, detail, occurred_at)
      values (inv_id, ev, case when ev in ('started','completed') then 'agent' when ev = 'cancelled' then 'system' else 'ghl' end,
              'seed:' || spec.n || ':' || ev,
              case ev when 'failed' then 'Carrier rejected: unreachable number' when 'opted_out' then 'STOP' end,
              t0 + make_interval(mins => k * case when ev in ('started','completed') then 200 else 1 end));
    end loop;

    update portal_reads set
      athlete_status = case
        when spec.status = 'completed' then 'complete'
        when spec.status = 'started' then 'in_progress'
        when spec.status in ('blocked', 'cancelled') then 'not_started'
        else 'invited' end,
      brief_status = case when spec.status = 'started' then 'in_progress' else brief_status end
    where prospect_id = pr.id;
  end loop;

  -- Prospect #9 replied STOP: keep them suppressed everywhere.
  insert into portal_suppressions (channel, value, reason, source)
  select 'sms', mobile, 'stop', 'ghl' from portal_prospects where id = '40000000-0000-4000-a000-000000000009';

  -- Club director invites for prospects #1, #2, #31.
  insert into portal_invitations (program_id, prospect_id, recipient_type, club_contact_id, recipient_name, to_phone, channel,
    template_id, rendered_body, scheduled_for, status, sent_by, sent_at, delivered_at, started_at, completed_at, created_at)
  select px.program_id, px.id, 'club_contact', c.id, c.first_name || ' ' || c.last_name, c.mobile, 'sms',
    (select id from portal_templates where kind = 'invite' and recipient_type = 'club_contact' and channel = 'sms' limit 1),
    'Hi ' || c.first_name || ', Marco Reyes from Harbor State University is recruiting ' || px.first_name
      || ' and would value your read through VEKT. Reply STOP to opt out.',
    now() - interval '11 days', 'completed',
    case when px.program_id = '20000000-0000-4000-a000-000000000003' then '30000000-0000-4000-a000-000000000004'::uuid
         else '30000000-0000-4000-a000-000000000002'::uuid end,
    now() - interval '11 days', now() - interval '11 days', now() - interval '10 days', now() - interval '9 days',
    now() - interval '11 days'
  from portal_prospects px
  join portal_prospect_club_contacts pcc on pcc.prospect_id = px.id
  join portal_club_contacts c on c.id = pcc.club_contact_id and c.mobile is not null
  where px.id in ('40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000031');

  update portal_reads set director_status = 'complete'
  where prospect_id in ('40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000031');
end $$;

-- Three finished briefs (plain English, no scores).
with b as (
  insert into portal_briefs (prospect_id, program_id, plays, takes_coaching, locker_room, against_staff, summary) values
  ('40000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
   'Elite on the ball. Reads pressing triggers early and plays forward under pressure. Conditioning will need work in his first preseason.',
   'Director: responds to clear expectations and one-on-one feedback. Disengages under public criticism or punishment-style conditioning.',
   'Confident, sometimes reads as ego. Leads once his role is defined; needs that role conversation early.',
   'Your staff runs demanding, high-volume sessions with public accountability. Expect friction in year one unless his plan is individualized.',
   'Talent: elite. Fit with your staff: conditional. It works if the role and feedback style are set before he arrives.'),
  ('40000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001',
   'Two-way fullback with real recovery pace. Final-ball quality is still developing for this level.',
   'Director: thrives on direct challenge and competition in training. Asks for more film, not less.',
   'Quiet but steady. The player teammates go to when things go wrong.',
   'Strong match for a demanding, high-accountability staff. Likely to respond well to public standards.',
   'Strong fit with your staff. Development area is end product, not mentality.'),
  ('40000000-0000-4000-a000-000000000031', '20000000-0000-4000-a000-000000000003',
   'Reads the block well and is suited to a fast-tempo offense. Serve-receive is the gap for your system.',
   'Director: steady after errors and responds to private, specific feedback.',
   'Values a close team culture; low-ego, consistent presence.',
   'Thrives under the detail-driven, teaching-first style your staff uses. Strong locker-room match.',
   'Strong fit for this program. Serve-receive development decides a year-one role.')
  returning id, prospect_id
)
update portal_reads r set brief_status = 'ready', brief_id = b.id from b where r.prospect_id = b.prospect_id;

-- Raw transcripts exist only for the agent service. Coaches can never read these.
insert into portal_agent_transcripts (prospect_id, agent, transcript) values
  ('40000000-0000-4000-a000-000000000001', 'athlete', '[{"from":"pulse","text":"What sport and position do you play?"},{"from":"athlete","text":"Center mid."}]'),
  ('40000000-0000-4000-a000-000000000001', 'director', '[{"from":"agent","text":"How does he take hard coaching?"},{"from":"director","text":"Best one-on-one."}]');

insert into portal_notifications (staff_id, kind, title, body, link)
select '30000000-0000-4000-a000-000000000002', 'brief_ready', 'Prospect brief ready',
       first_name || ' ' || last_name || '''s brief is ready.', '/portal/prospects/' || id
from portal_prospects where id in ('40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002');

insert into portal_audit_log (department_id, actor_user_id, actor_staff_id, action, entity, entity_id, detail, created_at) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', '30000000-0000-4000-a000-000000000002',
   'invitations.queued', 'invitation_batch', null, '{"queued": 12, "blocked": 1, "channels": ["sms"]}', now() - interval '12 days'),
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', '30000000-0000-4000-a000-000000000002',
   'prospects.imported', 'program', '20000000-0000-4000-a000-000000000001', '{"imported": 10, "duplicates": 0, "errors": 0}', now() - interval '13 days');
