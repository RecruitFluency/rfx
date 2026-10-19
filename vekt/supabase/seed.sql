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

-- Player profiles (hard skills, positions, systems) for the demo.
update public.program_dna set systems = '{"formation": ["4-3-3", "3-5-2"], "style": ["High press", "Possession build-out"]}'
where id = 'a0000000-0000-4000-8000-000000000001';

insert into public.athlete_profiles (recruit_id, sport, primary_position, secondary_positions, systems, skills, measurables, attributes, film_links, intended_major, submitted_at) values
  ('20000000-0000-4000-8000-000000000001', 'soccer', 'Center back', '{Defensive midfielder}',
   '{"formation": ["4-3-3", "4-2-3-1"], "style": ["High press", "Possession build-out"]}',
   '{"first_touch": "strength", "passing_range": "strength", "weak_foot": "solid", "scanning_and_decision_speed": "solid", "1v1_defending": "solid", "aerial_duels": "strength", "work_rate_off_the_ball": "strength", "positioning": "strength", "recovery_runs": "developing", "playing_out_under_pressure": "strength", "organizing_the_line": "solid", "finishing": "developing"}',
   '{"height": "74", "weight": "176", "sprint_30m": "4.25", "vertical": "26"}', '{"foot": "Right"}',
   '{https://example.com/film/jordan-ellis}', 'Business', now() - interval '6 days'),
  ('20000000-0000-4000-8000-000000000002', 'soccer', 'Center back', '{Fullback}',
   '{"formation": ["4-4-2", "4-2-3-1"], "style": ["Low block", "Counterattack"]}',
   '{"first_touch": "solid", "passing_range": "solid", "weak_foot": "solid", "1v1_defending": "strength", "aerial_duels": "strength", "positioning": "solid", "recovery_runs": "strength", "playing_out_under_pressure": "solid", "organizing_the_line": "strength"}',
   '{"height": "73", "weight": "185", "sprint_30m": "4.05"}', '{"foot": "Left"}',
   '{}', 'Kinesiology', now() - interval '5 days');

insert into public.club_evaluations (recruit_id, evaluator_name, evaluator_email, team_name, team_level, primary_position, positions_played, systems_played, team_systems, skills, measurables, notes, submitted_at) values
  ('20000000-0000-4000-8000-000000000001', 'Chris Dalton', 'chris.dalton@example.com', 'Lakeshore FC U17', 'MLS NEXT', 'Center back', '{Defensive midfielder}',
   '{"formation": ["4-3-3"], "style": ["High press", "Possession build-out"]}', '{"formation": ["4-3-3"], "style": ["High press", "Possession build-out"]}',
   '{"first_touch": "strength", "passing_range": "strength", "weak_foot": "solid", "scanning_and_decision_speed": "solid", "1v1_defending": "solid", "aerial_duels": "strength", "work_rate_off_the_ball": "strength", "positioning": "strength", "recovery_runs": "developing", "playing_out_under_pressure": "strength", "organizing_the_line": "strength", "finishing": "developing"}',
   '{"height": "74", "sprint_30m": "4.30"}', 'Played every minute at center back this season; covers DM when we chase games.', now() - interval '4 days'),
  ('20000000-0000-4000-8000-000000000002', 'Ana Ferreira', 'ana.ferreira@example.com', 'Metro United U17', 'ECNL', 'Center back', '{}',
   '{"formation": ["4-4-2"], "style": ["Low block"]}', '{"formation": ["4-4-2"], "style": ["Low block", "Counterattack"]}',
   '{"first_touch": "developing", "passing_range": "developing", "weak_foot": "solid", "1v1_defending": "strength", "aerial_duels": "strength", "positioning": "solid", "recovery_runs": "strength", "playing_out_under_pressure": "developing", "organizing_the_line": "solid"}',
   '{"height": "73", "sprint_30m": "4.10"}', 'Elite athlete. Still learning to play out of pressure; we mostly play direct.', now() - interval '3 days');

update public.app_config set value = 'http://localhost:5174' where key = 'profile_base_url';

-- Athlete-owned profiles and the coach feed (fictional athletes; video links are placeholders).
insert into public.vekt_athletes (id, full_name, sport, team_gender, grad_year, state, club, athlete_email, parent_name, parent_email, is_minor, parent_approved_at, feed_visible, feed_approved_at, profile) values
  ('30000000-0000-4000-8000-000000000001', 'Jordan Ellis', 'soccer', 'men', 2028, 'OH', 'Lakeshore FC', 'jordan.ellis@example.com', 'Morgan Ellis', 'morgan.ellis@example.com', true, now() - interval '6 days', false, null,
   (select to_jsonb(p) - 'id' - 'recruit_id' - 'sport' - 'submitted_at' - 'created_at' - 'updated_at' from public.athlete_profiles p where recruit_id = '20000000-0000-4000-8000-000000000001')),
  ('30000000-0000-4000-8000-000000000002', 'Mateo Reyes', 'soccer', 'men', 2029, 'OH', 'Lakeshore FC', 'mateo.reyes@example.com', 'Ana Reyes', 'ana.reyes@example.com', true, now() - interval '20 days', true, now() - interval '20 days',
   '{"primary_position": "Center back", "secondary_positions": ["Defensive midfielder"], "systems": {"formation": ["4-3-3", "3-5-2"], "style": ["High press"]}, "skills": {"first_touch": "solid", "aerial_duels": "strength"}, "measurables": {"height": "74", "sprint_30m": "4.18"}, "attributes": {"foot": "Left"}}'),
  ('30000000-0000-4000-8000-000000000003', 'Kai Thompson', 'soccer', 'men', 2030, 'CA', 'Ridgeway SC', null, 'Lee Thompson', 'lee.thompson@example.com', true, now() - interval '9 days', true, now() - interval '9 days',
   '{"primary_position": "Center back", "systems": {"formation": ["4-3-3"], "style": ["Possession build-out"]}, "skills": {"first_touch": "strength"}, "measurables": {"height": "71"}}'),
  ('30000000-0000-4000-8000-000000000004', 'Eli Brooks', 'soccer', 'men', 2028, 'OH', 'Lakeshore F.C.', 'eli.brooks@example.com', 'Dana Brooks', 'dana.brooks@example.com', true, now() - interval '30 days', true, now() - interval '30 days',
   '{"primary_position": "Striker", "systems": {"formation": ["4-3-3", "4-2-3-1"], "style": ["High press"]}, "measurables": {"height": "70", "sprint_30m": "3.98"}}'),
  ('30000000-0000-4000-8000-000000000005', 'Ava Lindqvist', 'soccer', 'women', 2029, 'WA', 'Sound FC', 'ava.l@example.com', 'Erik Lindqvist', 'erik.l@example.com', true, now() - interval '12 days', true, now() - interval '12 days',
   '{"primary_position": "Central midfielder"}');

insert into public.athlete_shares (athlete_id, recruit_id, status, last_synced_at) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'shared', now() - interval '6 days');
update public.comparison_recruits set vekt_athlete_id = '30000000-0000-4000-8000-000000000001' where id = '20000000-0000-4000-8000-000000000001';

insert into public.athlete_videos (athlete_id, kind, url, youtube_id, title, recorded_on, notes, sort_order, created_at) values
  ('30000000-0000-4000-8000-000000000001', 'highlight', 'https://www.youtube.com/watch?v=VEKTdemo001', 'VEKTdemo001', 'Fall season highlights', '2026-10-01', '#4, white', 0, now() - interval '6 days'),
  ('30000000-0000-4000-8000-000000000001', 'full_game', 'https://www.youtube.com/watch?v=VEKTdemo002', 'VEKTdemo002', 'vs. Metro United', '2026-09-20', '#4, white', 1, now() - interval '6 days'),
  ('30000000-0000-4000-8000-000000000002', 'highlight', 'https://www.youtube.com/watch?v=VEKTdemo003', 'VEKTdemo003', 'Sophomore season', '2026-10-05', '#5, blue', 0, now() - interval '3 days'),
  ('30000000-0000-4000-8000-000000000002', 'every_touch', 'https://www.youtube.com/watch?v=VEKTdemo004', 'VEKTdemo004', 'Every touch vs. Sound FC', '2026-09-27', '#5, blue', 1, now() - interval '3 days'),
  ('30000000-0000-4000-8000-000000000003', 'highlight', 'https://www.youtube.com/watch?v=VEKTdemo005', 'VEKTdemo005', 'Freshman year so far', '2026-10-10', '#14, red', 0, now() - interval '1 day'),
  ('30000000-0000-4000-8000-000000000004', 'half_game', 'https://www.hudl.com/video/3/0000/demo', null, 'Second half vs. Lakeshore', '2026-09-13', '#9, black', 0, now() - interval '10 days'),
  ('30000000-0000-4000-8000-000000000005', 'highlight', 'https://www.youtube.com/watch?v=VEKTdemo006', 'VEKTdemo006', 'Highlights', '2026-10-02', '#8', 0, now() - interval '2 days');

insert into public.watch_list (program_id, athlete_id, added_by, note) values
  ('a0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Left-sided CB with real composure. Check again at the spring showcase.');

-- Roster planning demo (fictional players).
update public.program_dna set roster_limit = 28,
  roster_targets = '{"Goalkeeper": 3, "Center back": 5, "Fullback": 4, "Defensive midfielder": 3, "Central midfielder": 4, "Attacking midfielder": 2, "Winger": 4, "Striker": 3}'
where id = 'a0000000-0000-4000-8000-000000000001';

insert into public.program_roster (program_id, name, position, final_season, status, designated, aid_dollars) values
  ('a0000000-0000-4000-8000-000000000001', 'Owen Hale', 'Goalkeeper', 2026, 'returning', false, 12000),
  ('a0000000-0000-4000-8000-000000000001', 'Luis Ortega', 'Goalkeeper', 2028, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Ben Carver', 'Goalkeeper', 2029, 'returning', true, null),
  ('a0000000-0000-4000-8000-000000000001', 'Isaac Moore', 'Center back', 2026, 'returning', false, 18000),
  ('a0000000-0000-4000-8000-000000000001', 'Tariq Bello', 'Center back', 2026, 'returning', false, 15000),
  ('a0000000-0000-4000-8000-000000000001', 'Gavin Shaw', 'Center back', 2027, 'transfer_risk', false, 9000),
  ('a0000000-0000-4000-8000-000000000001', 'Rory Quinn', 'Center back', 2029, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Sam Ito', 'Fullback', 2027, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Drew Patel', 'Fullback', 2028, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Nico Ferrer', 'Fullback', 2026, 'returning', false, 6000),
  ('a0000000-0000-4000-8000-000000000001', 'Jalen Ross', 'Defensive midfielder', 2027, 'returning', false, 10000),
  ('a0000000-0000-4000-8000-000000000001', 'Theo Grant', 'Defensive midfielder', 2029, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Max Albright', 'Central midfielder', 2026, 'leaving', false, 14000),
  ('a0000000-0000-4000-8000-000000000001', 'Cole Vance', 'Central midfielder', 2028, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Ari Levin', 'Central midfielder', 2029, 'undecided', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Kenji Mori', 'Attacking midfielder', 2027, 'returning', false, 8000),
  ('a0000000-0000-4000-8000-000000000001', 'Dev Sharma', 'Winger', 2026, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Elias Brandt', 'Winger', 2028, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Marco Silva', 'Winger', 2029, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Andre Wells', 'Striker', 2026, 'returning', false, 16000),
  ('a0000000-0000-4000-8000-000000000001', 'Felix Nunez', 'Striker', 2028, 'returning', false, null),
  ('a0000000-0000-4000-8000-000000000001', 'Pete Okoro', 'Striker', 2029, 'transfer_risk', false, null);

-- Club director demo: a fictional club, its director, roster and what college staff did.
-- Lakeshore FC here is a made-up demo club. Extra programs below are fictional too.
insert into public.program_dna (id, coach_name, institution, sport, division, team_gender, licensed, session_type, profile_confirmed) values
  ('a0000000-0000-4000-8000-000000000003', 'Kim Alvarez', 'Harbor Point College', 'soccer', 'D3', 'men', true, 'program_profile', true),
  ('a0000000-0000-4000-8000-000000000004', 'Sean Doyle', 'Eastlake University', 'soccer', 'D2', 'men', true, 'program_profile', true),
  ('a0000000-0000-4000-8000-000000000005', 'Tess Monroe', 'Prairie View Tech', 'soccer', 'NAIA', 'men', true, 'program_profile', true);

insert into public.recruit_comparisons (id, program_id, kind, status, sport, division, team_gender, coach_name, coach_email, coach_attested_at) values
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'board', 'invites_sent', 'soccer', 'D3', 'men', 'Kim Alvarez', 'kim.alvarez@harborpoint.example.edu', now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'board', 'invites_sent', 'soccer', 'D2', 'men', 'Sean Doyle', 'sean.doyle@eastlake.example.edu', now() - interval '5 days');

insert into public.comparison_recruits (id, comparison_id, program_id, source, recruit_name, position, grad_year, club_or_school, state, athlete_email, parent_name, parent_email,
  contact_status, athlete_invited_at, decision, decision_at, vekt_athlete_id) values
  ('20000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'feed', 'Jordan Ellis', 'Center back', 2028, 'Lakeshore FC', 'OH', null, null, null,
   'cleared', now() - interval '9 days', 'interested', now() - interval '3 days', '30000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'feed', 'Eli Brooks', 'Striker', 2028, 'Lakeshore FC', 'FL', null, null, null,
   'cleared', now() - interval '5 days', null, null, '30000000-0000-4000-8000-000000000004');

insert into public.vekt_clubs (id, name, state, sports) values
  ('40000000-0000-4000-8000-000000000001', 'Lakeshore FC', 'OH', '{soccer}');
insert into public.club_accounts (club_id, role, first_name, last_name, email) values
  ('40000000-0000-4000-8000-000000000001', 'director', 'Jamie', 'Porter', 'jamie.porter@lakeshorefc.example.com'),
  ('40000000-0000-4000-8000-000000000001', 'coach', 'Riley', 'Shaw', 'riley.shaw@lakeshorefc.example.com');

insert into public.club_athletes (club_id, vekt_athlete_id, full_name, sport, team, grad_year, position, parent_name, parent_email, status, committed_program, committed_division, committed_at, invited_at, family_approved_at, family_consent_text) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Jordan Ellis', 'soccer', 'U17 MLS NEXT', 2028, 'Center back', 'Morgan Ellis', 'morgan.ellis@example.com', 'active', null, null, null, now() - interval '30 days', now() - interval '28 days', 'Demo consent'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'Eli Brooks', 'soccer', 'U17 MLS NEXT', 2028, 'Striker', 'Dana Brooks', 'dana.brooks@example.com', 'active', null, null, null, now() - interval '30 days', now() - interval '27 days', 'Demo consent'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Mateo Reyes', 'soccer', 'U16 MLS NEXT', 2029, 'Center back', 'Ana Reyes', 'ana.reyes@example.com', 'active', null, null, null, now() - interval '25 days', now() - interval '20 days', 'Demo consent'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'Kai Thompson', 'soccer', 'U15', 2030, 'Center back', 'Lee Thompson', 'lee.thompson@example.com', 'active', null, null, null, now() - interval '10 days', null, null),
  ('40000000-0000-4000-8000-000000000001', null, 'Chris Vance', 'soccer', 'U16 MLS NEXT', 2029, 'Winger', 'Jo Vance', 'jo.vance@example.com', 'active', null, null, null, null, null, null),
  ('40000000-0000-4000-8000-000000000001', null, 'Ryan Cole', 'soccer', 'U19', 2027, 'Goalkeeper', 'Pat Cole', 'pat.cole@example.com', 'committed', 'Harbor Point College', 'D3', current_date - 40, null, null, null),
  ('40000000-0000-4000-8000-000000000001', null, 'Diego Santos', 'soccer', 'U19', 2027, 'Central midfielder', 'Rosa Santos', 'rosa.santos@example.com', 'committed', 'Eastlake University', 'D2', current_date - 12, null, null, null),
  ('40000000-0000-4000-8000-000000000001', null, 'Noah Kim', 'soccer', 'U19', 2027, 'Fullback', null, null, 'not_pursuing', null, null, null, null, null, null),
  ('40000000-0000-4000-8000-000000000001', null, 'Liam Foster', 'soccer', 'U17 MLS NEXT', 2028, 'Defensive midfielder', 'Kate Foster', 'kate.foster@example.com', 'active', null, null, null, null, null, null),
  ('40000000-0000-4000-8000-000000000001', null, 'Owen Price', 'soccer', 'U16 MLS NEXT', 2029, 'Fullback', null, null, 'active', null, null, null, null, null, null);

-- What college staff did with linked athletes over the last few weeks.
insert into public.coach_actions (program_id, coach_account_id, athlete_id, action, created_at)
select p, null, a, act, now() - (d || ' days')::interval from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'profile_view', 20), ('a0000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'film_play', 19),
  ('a0000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'profile_view', 12), ('a0000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'film_play', 12),
  ('a0000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'watch_add', 11), ('a0000000-0000-4000-8000-000000000005'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'profile_view', 4),
  ('a0000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000004'::uuid, 'film_play', 8), ('a0000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000004'::uuid, 'profile_view', 7),
  ('a0000000-0000-4000-8000-000000000005'::uuid, '30000000-0000-4000-8000-000000000004'::uuid, 'film_play', 2), ('a0000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, 'film_play', 15),
  ('a0000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, 'watch_add', 15), ('a0000000-0000-4000-8000-000000000005'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, 'film_play', 1),
  ('a0000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000003'::uuid, 'film_play', 6)
) v(p, a, act, d);

-- A few sample research rows, clearly labelled. Load the real list from a spreadsheet.
insert into public.college_programs (name, conference, division, city, state, control, avg_gpa, cost_per_year, acceptance_rate, enrollment, sports, staff_count, source) values
  ('Harbor Point College (sample)', 'Demo Coast Conference', 'D3', 'Harbor Point', 'ME', 'private', 3.55, 61000, 48.0, 2100, '{soccer,lacrosse,swimming_diving}', 3, 'Sample row, not real data'),
  ('Eastlake University (sample)', 'Demo Lakes Conference', 'D2', 'Eastlake', 'MI', 'public', 3.30, 24000, 71.0, 14000, '{soccer,basketball,volleyball,baseball}', 3, 'Sample row, not real data'),
  ('Prairie View Tech (sample)', 'Demo Plains Conference', 'NAIA', 'Prairie View', 'KS', 'private', 3.10, 32000, 64.0, 3800, '{soccer,wrestling,track_field}', 2, 'Sample row, not real data'),
  ('Northfield State (sample)', 'Demo Conference', 'D1', 'Northfield', 'OH', 'public', 3.45, 27000, 58.0, 26000, '{soccer,volleyball,football,basketball}', 4, 'Sample row, not real data'),
  ('Western Ridge College (sample)', 'Demo Junior College League', 'NJCAA', 'Western Ridge', 'CO', 'public', 2.90, 9000, 100.0, 6000, '{soccer,baseball,softball}', 2, 'Sample row, not real data');
update public.app_config set value = '25' where key = 'club_free_families'; -- local demo only
