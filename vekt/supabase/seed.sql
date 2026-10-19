-- Local demo data. Fictional school, staff and athletes; never load into production.
-- Northfield State is not a real program. Contact info uses reserved test ranges
-- (example.com / example.edu, 555-01xx numbers).

insert into public.vekt_departments (id, name, division, conference, license_type, license_start, license_end, billing_status) values
  ('d0000000-0000-4000-8000-000000000001', 'Northfield State Athletics', 'D1', 'Demo Conference', 'all_sports', '2026-08-01', '2027-07-31', 'paid');

insert into public.program_dna (id, coach_name, institution, sport, division, team_gender, licensed, department_id, session_type, profile_confirmed,
  tactical_identity, position_prototypes, red_flags, green_flags, locker_room_norms, trait_ranking,
  style_feedback, style_motivation, style_closeness, style_setbacks, must_haves) values
  ('a0000000-0000-4000-8000-000000000001', 'Dana Whitfield', 'Northfield State', 'soccer', 'D1', 'men', true, 'd0000000-0000-4000-8000-000000000001', 'program_profile', true,
   'High press, build out from the back. Center backs step into midfield and organize the line.',
   '{"center_back": "Comfortable on the ball under pressure, talks constantly, wins first contact"}',
   '["Goes quiet after a mistake", "Needs to be told why before every change"]',
   '["Asks for film on their own", "Owns errors in front of the group"]',
   'Seniors run the locker room. Phones away an hour before games. Nobody is above carrying the gear.',
   '["coachability", "response to setbacks", "compete level", "team orientation"]',
   'Direct and immediate, on the field, in front of the group.',
   'Clear standards and earned minutes.',
   'Professional, door open, not a friend.',
   'Tells them why once, then expects a response in training.',
   '{"positions": ["Center back"], "min_grad_year": 2028, "max_grad_year": 2029, "club_levels": ["MLS NEXT", "ECNL"], "min_gpa": 3.0, "max_family_cost": 22000}'),
  ('a0000000-0000-4000-8000-000000000002', 'Renee Calder', 'Northfield State', 'volleyball', 'D1', 'women', true, 'd0000000-0000-4000-8000-000000000001', 'program_profile', true,
   'Fast tempo offense, serve tough.', null, null, null, null, null, null, null, null, null, '{}');

insert into public.coach_accounts (id, department_id, role, first_name, last_name, title, email) values
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'head_coach', 'Dana', 'Whitfield', 'Head Coach, Men''s Soccer', 'dana.whitfield@northfield.example.edu'),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'assistant_coach', 'Marco', 'Ruiz', 'Assistant Coach', 'marco.ruiz@northfield.example.edu'),
  ('c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'dept_admin', 'Alex', 'Mercer', 'Deputy AD', 'alex.mercer@northfield.example.edu'),
  ('c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'compliance', 'Priya', 'Nand', 'Compliance Director', 'priya.nand@northfield.example.edu');
insert into public.coach_account_programs (coach_account_id, program_id) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001');

insert into public.program_staff (program_id, coach_account_id, name, title, focus, feedback_style, motivation_style, closeness_style, setbacks_style, traits, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Dana Whitfield', 'Head coach', 'The whole team',
   'Direct, on the spot, in front of the group.', 'Standards and earned minutes.', 'Professional, door open.', 'Explains once, then expects a response.', '{Direct,Demanding,Standards}', 0),
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'Marco Ruiz', 'Assistant coach', 'Defenders',
   'Private, with clips, the next morning.', 'Individual goals and progress.', 'Close, checks in often.', 'Sits down with the player the same day.', '{Film-first,Patient,Detail}', 1),
  ('a0000000-0000-4000-8000-000000000001', null, 'Lee Okafor', 'Assistant coach', 'Academics and recruiting',
   'Calm and encouraging.', 'Purpose beyond soccer.', 'Mentor.', 'Talks through the long view.', '{Calm,Mentor}', 2);

-- The program's board (dashboard recruits live here).
insert into public.recruit_comparisons (id, program_id, kind, status, sport, division, team_gender, coach_name, coach_email, coach_attested_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'board', 'invites_sent', 'soccer', 'D1', 'men', 'Dana Whitfield', 'dana.whitfield@northfield.example.edu', now() - interval '12 days');

-- Three athletes who finished their conversation (two with a club director read).
insert into public.athlete_vetting (id, athlete_name, sport, primary_position, current_team, grad_year, is_minor, parent_name, entry_path, inviting_program_id, closing_answer, pronoun) values
  ('e0000000-0000-4000-8000-000000000001', 'Jordan Ellis', 'soccer', 'Center back', 'Lakeshore FC', '2028', true, 'Morgan Ellis', 'coach_invite', 'a0000000-0000-4000-8000-000000000001', 'Tell me straight. I can take it if you tell me why.', 'he'),
  ('e0000000-0000-4000-8000-000000000002', 'Marcus Hill', 'soccer', 'Center back', 'Metro United', '2028', true, 'Tanya Hill', 'coach_invite', 'a0000000-0000-4000-8000-000000000001', 'I work hardest for coaches who know me.', 'he'),
  ('e0000000-0000-4000-8000-000000000003', 'Theo Brandt', 'soccer', 'Center back', 'Ridgeway SC', '2028', true, 'Hana Brandt', 'coach_invite', 'a0000000-0000-4000-8000-000000000001', 'Give me a role and I''ll own it.', null);

insert into public.coach_verifications (id, athlete_id, club_coach_name, club_name, coaching_context, development_trajectory, next_coach_advice, link_method, entry_path) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Chris Dalton', 'Lakeshore FC', 'Coached him three seasons.', 'Grew into the loudest voice on the back line.', 'Give him the why once.', 'invite_token', 'coach_invite'),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'Ana Ferreira', 'Metro United', 'Two seasons.', 'Steadier every year.', 'Build the relationship first.', 'invite_token', 'coach_invite');

insert into public.scenario_responses (respondent_type, athlete_id, coach_verification_id, program_id, sport, scenario_id, response_text)
select 'athlete', a.id, null::uuid, null::uuid, 'soccer', sc.id, 'Demo athlete answer for ' || sc.id
from (values ('e0000000-0000-4000-8000-000000000001'::uuid), ('e0000000-0000-4000-8000-000000000002'::uuid), ('e0000000-0000-4000-8000-000000000003'::uuid)) a(id),
     (values ('T1'),('T2'),('T3'),('T4'),('T5'),('C1'),('C2'),('C3'),('C4'),('S1'),('S2')) sc(id)
union all
select 'club_coach', v.athlete_id, v.id, null::uuid, 'soccer', sc.id, 'Demo club director prediction for ' || sc.id
from public.coach_verifications v, (values ('T1'),('T2'),('T3'),('T4'),('T5'),('C1'),('C2'),('C3'),('C4'),('S1'),('S2')) sc(id)
where v.id in ('f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002')
union all
select 'college_coach', null::uuid, null::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'soccer', sc.id, 'Demo staff answer for ' || sc.id
from (values ('T1'),('T2'),('T3'),('T4'),('T5'),('C1'),('C2'),('C3'),('C4'),('S1'),('S2')) sc(id);

insert into public.interview_consents (id, interview_type, athlete_name, sport, grad_year, is_minor, parent_name, consent_text, sms_opt_in) values
  ('10000000-0000-4000-8000-000000000001', 'athlete', 'Jordan Ellis', 'soccer', '2028', true, 'Morgan Ellis', 'Demo consent', true),
  ('10000000-0000-4000-8000-000000000002', 'athlete', 'Marcus Hill', 'soccer', '2028', true, 'Tanya Hill', 'Demo consent', false),
  ('10000000-0000-4000-8000-000000000003', 'athlete', 'Theo Brandt', 'soccer', '2028', true, 'Hana Brandt', 'Demo consent', false);

insert into public.comparison_recruits (id, comparison_id, program_id, source, added_by, recruit_name, position, grad_year, club_or_school, club_level, state, gpa,
  family_cost_min, family_cost_max, priority, athlete_email, athlete_phone, parent_name, parent_email, parent_phone,
  club_coach_name, club_coach_email, club_coach_phone, contact_status, contact_clear_date, contact_rule_text,
  athlete_invited_at, club_invited_at, consent_id, sms_opt_in, athlete_id, athlete_done, coach_verification_id, club_coach_done, coach_open_question) values
  ('20000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'dashboard', 'c0000000-0000-4000-8000-000000000001',
   'Jordan Ellis', 'Center back', 2028, 'Lakeshore FC', 'MLS NEXT', 'OH', 3.6, 18000, 25000, 'A', 'jordan.ellis@example.com', '+12025550101', 'Morgan Ellis', 'morgan.ellis@example.com', '+12025550102',
   'Chris Dalton', 'chris.dalton@example.com', '+12025550103', 'cleared', '2026-06-15', 'June 15 after sophomore year',
   now() - interval '12 days', now() - interval '12 days', '10000000-0000-4000-8000-000000000001', true, 'e0000000-0000-4000-8000-000000000001', true, 'f0000000-0000-4000-8000-000000000001', true,
   'Can he lead a back four as a sophomore?'),
  ('20000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'dashboard', 'c0000000-0000-4000-8000-000000000001',
   'Marcus Hill', 'Center back', 2028, 'Metro United', 'ECNL', 'TX', 3.2, 12000, 15000, 'A', 'marcus.hill@example.com', null, 'Tanya Hill', 'tanya.hill@example.com', null,
   'Ana Ferreira', 'ana.ferreira@example.com', null, 'cleared', '2026-06-15', 'June 15 after sophomore year',
   now() - interval '10 days', now() - interval '10 days', '10000000-0000-4000-8000-000000000002', false, 'e0000000-0000-4000-8000-000000000002', true, 'f0000000-0000-4000-8000-000000000002', true, null),
  ('20000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'csv', 'c0000000-0000-4000-8000-000000000002',
   'Theo Brandt', 'Center back', 2028, 'Ridgeway SC', 'Regional club', 'CA', 2.9, null, null, 'B', 'theo.brandt@example.com', null, 'Hana Brandt', 'hana.brandt@example.com', null,
   'Pat Lowe', 'pat.lowe@example.com', null, 'cleared', '2026-06-15', 'June 15 after sophomore year',
   now() - interval '8 days', now() - interval '8 days', '10000000-0000-4000-8000-000000000003', false, 'e0000000-0000-4000-8000-000000000003', true, null, false, null),
  ('20000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'dashboard', 'c0000000-0000-4000-8000-000000000001',
   'Sam Ortiz', 'Center back', 2028, 'Bayside Academy', 'MLS NEXT', 'FL', 3.4, null, null, 'B', null, null, 'Lucia Ortiz', 'lucia.ortiz@example.com', '+12025550104',
   null, null, null, 'cleared', '2026-06-15', 'June 15 after sophomore year',
   now() - interval '4 days', null, null, false, null, false, null, false, null),
  ('20000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'dashboard', 'c0000000-0000-4000-8000-000000000001',
   'Chris Vance', 'Winger', 2029, 'Lakeshore FC', 'MLS NEXT', 'MI', null, null, null, 'C', 'chris.vance@example.com', null, 'Jo Vance', 'jo.vance@example.com', null,
   'Chris Dalton', 'chris.dalton@example.com', null, 'pending', null, null,
   null, null, null, false, null, false, null, false, null);

insert into public.invite_events (comparison_id, recruit_id, recipient_role, channel, status, detail, created_at) values
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'parent', 'email', 'dry_run', 'Demo invite', now() - interval '12 days'),
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'athlete', 'email', 'dry_run', 'Demo invite', now() - interval '12 days'),
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'club_coach', 'email', 'dry_run', 'Demo invite', now() - interval '12 days'),
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'parent', 'email', 'dry_run', 'Demo invite', now() - interval '4 days');

update public.app_config set value = 'http://localhost:5174' where key = 'coach_app_url';
