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

1. **Database.** `supabase link --project-ref xpzenyjmpqzmhdeuqmto`, then
   `supabase migration repair --status applied 20261017173246` (marks the baseline as
   already there), then `supabase db push` (applies only the coach dashboard migration).
2. **Function secrets** (Supabase → Edge Functions → Secrets):
   - `VEKT_WEBHOOK_SECRET`: **set this.** Until it is set, `vekt-webhook` still accepts the
     old secret written in its source code, which anyone with the code can use.
   - `VEKT_APP_SECRET` (already used by vekt-fit-read), `ANTHROPIC_API_KEY`, `GHL_PIT`
   - `VEKT_GHL_WEBHOOK_TOKEN` (a long random string), optionally `GHL_WEBHOOK_PUBLIC_KEY`
   - `VEKT_COACH_APP_ORIGIN` = the dashboard URL (locks down CORS)
   - Never set `VEKT_FIT_MOCK` or `VEKT_GHL_MOCK` in production.
3. **Deploy functions**: `supabase functions deploy vekt-invites vekt-webhook vekt-fit-read vekt-coach vekt-ghl-webhook --no-verify-jwt`.
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
7. **Dashboard**: new Vercel project from `vekt/coach` (root directory `vekt/coach`), with
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then set `app_config.coach_app_url`.
8. **First accounts**: insert a `vekt_departments` row, link `program_dna.department_id`,
   and add the department admin to `coach_accounts`; they add the rest of their staff.

## Known limits

- NCAA contact dates in `contact_rules` were verified from third-party summaries
  (SportsRecruits, NCSA), not the NCAA manual. Have a compliance office confirm them.
- Mismatch-cost defaults on the Department page are rounded public NCAA figures, labelled
  as ballpark; departments should enter their own EADA numbers.
- Texts' time zone comes from the recruit's state; unknown states use US Eastern.
