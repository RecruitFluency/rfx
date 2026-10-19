# VEKT backend and coach dashboard

The source for VEKT's Supabase backend (project "College Coach_DNA_2027") and the
college coach dashboard.

| Path | What |
| --- | --- |
| `supabase/migrations/20261017173246_baseline_from_production.sql` | Production schema as it was on 2026-10-17. **Never apply to production**: it is already there. |
| `supabase/migrations/20261019120000_coach_dashboard.sql` | New: coach accounts, staff profiles, must-haves, structured reports, Side-by-Side, outbox, opt-outs, audit log. Additive only. |
| `supabase/functions/vekt-webhook` | ElevenLabs voice webhook (existing). Now also writes a Fit Read for dashboard recruits. |
| `supabase/functions/vekt-fit-read` | Fit Reads (existing). Now writes the structured Fit Read and the Side-by-Side. |
| `supabase/functions/vekt-invites` | Invite pages and sending (existing). Now sends everything through `vekt_outbox`, with reminders, dashboard invites and decisions. |
| `supabase/functions/vekt-coach` | New: the dashboard API. |
| `supabase/functions/vekt-ghl-webhook` | New: GoHighLevel delivery, STOP, unsubscribe and bounce events. |
| `supabase/migrations/20261019180000_player_profiles.sql` | New: athlete profiles, club director evaluations, program systems. |
| `supabase/functions/_shared/sports.ts` | The sport catalog: positions, systems, hard skills, measurables and events for 18 sports. |
| `coach/` | New: the coach dashboard (Vite + React), deployed on Vercel. Also serves the athlete (`/athlete/<token>`) and club director (`/club/<token>`) pages. |

Every table keeps the production pattern: row-level security on, no policies.
Only the functions (service role) touch data; `vekt-coach` scopes each request
to the signed-in coach's programs and role.

## How the reports are built

The model writes the words. The facts a coach would check are computed in code
(`supabase/functions/_shared/report.ts`), so they are consistent and auditable:

- **Self-awareness**: the athlete's own answers against the club director's blind
  read, trait by trait. High = no contradictions and at least 3 in 4 covered traits
  tell the same story. Big gaps = two or more contradictions, or fewer than half
  the same. Pending until the director answers. Moderate otherwise.
- **Must-haves**: position, grad year, club level, club team, GPA, family budget,
  checked against the program's settings.

## Player profiles: athletes and club directors

No accounts. Each person uses the private link from their invite email:

- **Athlete** (`/athlete/<invite token>`): opens once a parent approves. Positions, the systems
  they're comfortable in, hard skills (Strength / Solid / Developing / Not yet, never numbers),
  measurables, personal bests for individual sports, film, intended major.
- **Club director** (`/club/<club invite token>`): their own read of the same skills, the positions
  and systems the athlete has played, what their team runs (remembered for their other athletes),
  and the numbers they've seen measured. They see their other VEKT athletes by name and can have
  every link emailed to them; one link never opens another athlete.
- **College staff** pick the systems they run (Staff & must-haves). The Fit Read and Side-by-Side
  show, computed in code: systems played against yours, the hard-skills read (where athlete and
  director agree, and where the athlete rates themselves higher), and measurables marked
  confirmed when the director's number matches.

Each program gets its own copy of the profile, matching what the parent agreed to share.
Set `app_config.profile_base_url` to the dashboard URL so invite emails include these links.

## Athlete-owned profile, film feed, watch list

- **One profile the athlete controls** (`/me/<manage token>`, emailed to athlete and parent). When a new
  program invites them, the invite page asks "Share your VEKT profile with this program?" Yes loads it
  in; then any update can go to every program they share with at once. They can stop sharing anytime.
- **Join without an invite** (`/join`), for freshmen and sophomores. Under 18, a parent approves the
  profile (`/parent/<token>`) before anything is visible, and separately decides whether verified college
  coaches can see their videos.
- **Video links** by the kind each sport recruits on (highlight, every touch, half game, full game; race,
  swing or routine video for individual sports). YouTube, Hudl and Vimeo links only; nothing is hosted.
- **Film feed** for college staff: newest video from opted-in athletes in their sport and team, with the
  date NCAA contact opens. No contact details. **Watch list** keeps underclassmen until contact opens;
  then "Invite" sends the family the normal invite, and their details stay hidden until they share.

## Roster plan and export

- **Roster plan** (`/roster`): the current roster with each player's last season, the program's roster
  limit (D1 House limits suggested where sourced: football 105, baseball 34, basketball 15, soccer 28,
  softball 25) and position targets. For any fall it shows open spots, gaps by position, players at risk,
  aid freed, and how many recruits of that incoming class are on the board and marked Interested.
  Recruits who fill an open need are badged on the board.
- **Export** on the Recruits page: one CSV with the columns Teamworks, Front Rush or a spreadsheet import,
  including each recruit's VEKT Fit Read link. A live Teamworks sync needs their API through a partner
  agreement.

## Club director dashboard

Club directors sign in at the same login; a club account opens `/director` instead of the coach app.
Data comes from `vekt-club` (same pattern: RLS on, no policies, scoping in code, writes in `vekt_audit_log`).

- **Club health**: players, on VEKT, programs engaging, coach actions, Interested, committed; 12-week
  college activity; interest by level; every player with views, saves, invites and Interested.
- **Player pipeline**: one column per stage (not on VEKT, profile live, seen by coaches, invited, Fit Read
  done, Interested, committed). Click a player to record a commitment or mark them not pursuing college.
- **Coach engagement**: each college program and what it did (views, film plays, saves, invites, Interested).
- **Recruiting funnel**: how many players reached each step, overall and by class. Counts, not percentages.
- **Commitments**: placement record by class and level, plus the players closest to a decision.
- **Program research**: filter colleges by level, state, public/private, cost and sport. The list loads from
  a spreadsheet (CSV/XLSX); a club's own imports are visible only to that club. The seeded rows are labelled
  samples, not real data.
- **Roster & export**: add or paste players, invite each family to VEKT, and export a CSV (formula-safe).

**Consent.** Inviting a player starts *their own* VEKT profile. The club sees college engagement only after
the family says yes to the club specifically (`club_athletes.family_approved_at`), separate from approving
the profile and from the coach film feed. A parent decides for a minor (the athlete can only turn it off);
an athlete 18+ decides themselves. The club never sees Fit Reads. Coach activity is logged in
`coach_actions` when staff open a profile, play film or save to a watch list.

Demo sign-in (local only): `jamie.porter@lakeshorefc.example.com` / `demo-password-1` (Lakeshore FC is fictional).

## Sharing and teammate invites

One share button (`coach/src/components/ShareButton.tsx`) shows up across the app. On phones it opens the
native share sheet; elsewhere it offers copy link, text and email. People send it from their own phone or
inbox. VEKT never messages anyone's contacts.

- **Athlete profile** (`/me`): "Invite teammates", in its own section and as a floating button. The link is
  `/join?ref=<code>`. A profile started from it records who shared it (`vekt_athletes.referred_by`). The
  athlete sees only a count of teammates who joined, and a teammate counts once their own profile is
  approved (by a parent if under 18).
- **Parent page**: "Share with parents", using the same link.
- **Coach and club sidebars**: "Share with a coach" / "Share with a director".
- **Team unlock** (`_shared/team.ts`): once 3 approved profiles from the same club (same sport and side,
  grad years within one) are on VEKT, each athlete sees the systems at least 2 teammates say the team plays
  and can add them in one tap. Only agreed-on options are shown, never who picked them.
- **Club free tier**: the club sidebar shows "Free while you grow · N of M families" when
  `app_config.club_free_families` holds a number. It's empty in production until you set the terms.

## Run it locally

```bash
npm install
npm run db:start                 # local Supabase (Docker)
npm run db:reset                 # schema + demo data (fictional school)
npm run functions                # functions under Deno on :54331, model and GHL mocked
node scripts/demo-reports.mjs    # realistic demo Fit Reads + a Side-by-Side
cd coach && npm install && cp .env.example .env.local   # add the local anon key
npm run dev                      # http://localhost:5174
```

Demo sign-in (dev build only): `dana.whitfield@northfield.example.edu` / `demo-password-1`.

Tests: `npm test` (unit), `npm run test:e2e` (50 checks against the local stack),
`cd coach && npm test`.

## Going live: checklist

Nothing here has been applied to production. Each step needs a go-ahead.

1. **Database. Done on 2026-10-19.** All five migrations were applied to production (in smaller
   pieces through the Supabase tool, so production's migration history shows different version names).
   The share-link migration (`20261019240000`) is applied too.
   Everything uses `if not exists`, so a later `supabase db push` would be harmless, but to keep the
   history tidy mark the local files as applied first:
   `supabase migration repair --status applied 20261017173246 20261019120000 20261019180000 20261019200000 20261019220000 20261019230000 20261019240000 20261019250000`.
2. **Function secrets** (Supabase → Edge Functions → Secrets):
   - `VEKT_WEBHOOK_SECRET`: **set this.** Until it is set, `vekt-webhook` still accepts the
     old secret written in its source code, which anyone with the code can use. Set it at the same
     time as you update the ElevenLabs agents' webhook header to the new value, or voice interviews
     stop saving.
   - `VEKT_APP_SECRET` (already used by vekt-fit-read), `ANTHROPIC_API_KEY`, `GHL_PIT`
   - `VEKT_GHL_WEBHOOK_TOKEN` (a long random string), optionally `GHL_WEBHOOK_PUBLIC_KEY`
   - `VEKT_COACH_APP_ORIGIN` = the dashboard URL (locks down CORS)
   - Never set `VEKT_FIT_MOCK` or `VEKT_GHL_MOCK` in production.
3. **Deploy functions**: `supabase functions deploy vekt-invites vekt-webhook vekt-fit-read vekt-coach vekt-club vekt-ghl-webhook --no-verify-jwt`.
4. **Schedules** (Supabase cron or GHL): every 5 minutes call `vekt-invites` with
   `{"action":"dispatch"}`; daily call `release_due` and `send_reminders`. Each needs the
   header `x-vekt-internal: <service role key>`.
5. **Auth**: Supabase → Authentication: turn off public sign-ups, set the Site URL and
   redirect URL to the dashboard URL, set up custom SMTP for login codes, and change the
   email template to show the 6-digit code (`{{ .Token }}`).
6. **GoHighLevel**: set `app_config.ghl_location_id` (and `ghl_email_from`). Point GHL
   webhooks (OutboundMessage, InboundMessage, LCEmailStats, ContactDndUpdate) at
   `.../functions/v1/vekt-ghl-webhook?token=<VEKT_GHL_WEBHOOK_TOKEN>`. Keep
   `app_config.invites_live = false` until a test send to your own number and email works.
7. **Dashboard. Done on 2026-10-19.** It runs on Vercel only: project `vekt-dashboard` (RFX Team),
   root directory `vekt/coach`, live at https://vekt-dashboard.vercel.app. `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` are set. `app_config.coach_app_url` and `profile_base_url` point at it.
   Pushes to `main` deploy it after PR #18 merges. The Netlify previews on this repo come from a
   separate Netlify integration; disconnect it in Netlify.
8. **First accounts**: insert a `vekt_departments` row, link `program_dna.department_id`,
   and add the department admin to `coach_accounts`; they add the rest of their staff. For a club,
   insert a `vekt_clubs` row and its director in `club_accounts`.
9. **Program research list**: load your sourced spreadsheet into `college_programs` (club_id null for the
   shared list) and delete the five sample rows.

## Known limits

- NCAA contact dates in `contact_rules` were verified from third-party summaries
  (SportsRecruits, NCSA), not the NCAA manual. Have a compliance office confirm them.
- Mismatch-cost defaults on the Department page are rounded public NCAA figures, labelled
  as ballpark; departments should enter their own EADA numbers.
- Texts' time zone comes from the recruit's state; unknown states use US Eastern.
