# RFX

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/RecruitFluency/rfx)

This repo is the **RFX Coach Database** (served at `/app`; the root URL redirects there) — the
internal tool that keeps the master list of college coaches up to date from vendor spreadsheets,
across every sport and level (NCAA D1/D2/D3, NAIA, junior college). It is the source of truth
that feeds the RFX app: what Jen approves here is what the app sees.

## What the Coach Database does

1. **Monthly Sync Engine** (`/app/sync`) — drag & drop the vendor `.xlsx`/`.csv` and tag which
   **sport** the file covers. The first upload for a sport becomes that sport's baseline; every
   later upload is diffed against the master list *inside Postgres*, so huge files are handled
   server-side. Departure detection is scoped to the file's sport — a women's soccer file can
   never mark a basketball coach departed. Coaches are tracked by their permanent **Unique ID**,
   never by email — when a coach moves schools or changes email, their history and notes move
   with them.
2. **Review Queue** (`/app/review`) — the safety net. Suspicious data never touches the master list
   automatically: a "new" coach whose email we already know, rows with no unique ID, duplicate IDs,
   or a mass disappearance (>15% of the sport's active coaches vanishing at once — usually a
   truncated vendor file) all pause here for approval.
3. **Coach & Program Directories** (`/app/coaches`, `/app/programs`) — searchable master list with
   sport and division filters, full job history, notes, and email logs per coach; program pages
   with academic stats and the current coaching roster. Coaches can also be **added and edited by
   hand** (`Add coach`, and Edit / Mark departed on each profile) for corrections between vendor
   files — manual changes are logged to the same history timeline.
4. **Data Health** (`/app/health`) — is the list clean enough to push to the app? Flags active
   coaches with no email/school/sport, coaches missing from every vendor file for 60+ days, and
   duplicate emails (usually one person under two vendor IDs).
5. **Export / App Feed** (`/app/export`) — download the current verified contact list as CSV or
   JSON, filtered by sport/division/status. (The RFX app can also read the `coaches` table live
   from Supabase with the same URL + anon key — filter to `status = 'active'`.)
6. **Coach Tracker** (`/app/tracker`) — the movement feed: every hire, school move, departure, and
   title change across the country, filterable by sport and type, tied to each coach's permanent ID.
   Its **News Radar** tab watches external coaching-news RSS feeds (swept every 6 hours by pg_cron
   inside Postgres, no API keys) and matches headlines to coaches in the database — catching moves
   before they reach a vendor file.
7. **Insights** (`/app/insights`) — patterns across the coaching landscape: monthly movement trends,
   breakdowns by sport/division/state, and the programs with the most churn in the last 90 days.
8. **The Watchtower** (bell icon) — an around-the-clock agent that runs *inside* Postgres via
   pg_cron: it scans daily for coaching movement, review items going stale, and data drift, and
   posts alerts in the app. No external server needed.
9. **Command Center** (`/app`) — Jen's home screen opens on a guided monthly checklist (upload →
   clear the queue → check health → push to the app), each step computed live from the data, plus
   a slide-out assistant that answers questions about the actual data ("who is missing an email?",
   "who moved recently?", "how many soccer coaches?").

## Going live (one-time, ~10 minutes)

The app is a static Vite/React frontend backed by **Supabase** (hosted Postgres). The entire sync
engine runs as SQL functions in the database — no separate Python/Render server is needed.

1. **Create the database** — [supabase.com](https://supabase.com) → New project (free tier is fine).
2. **Install the schema** — in Supabase's *SQL Editor*, paste and run, in order:
   - [`supabase/migrations/0001_coach_database.sql`](supabase/migrations/0001_coach_database.sql) —
     all tables plus the `process_sync_batch` / `resolve_review_item` functions.
   - [`supabase/migrations/0002_multisport.sql`](supabase/migrations/0002_multisport.sql) —
     per-sport sync scoping (the app detects whether this has been run and reminds you if not).
   - [`supabase/migrations/0003_watchtower.sql`](supabase/migrations/0003_watchtower.sql) —
     the Watchtower alert agent and its daily pg_cron schedule.
   - [`supabase/migrations/0004_radar.sql`](supabase/migrations/0004_radar.sql) —
     the National Radar news sweep (external coaching-news feeds, every 6 hours).
3. **Connect the app** — the production Supabase URL and anon key are baked in as defaults, so a
   fresh deploy is already connected. To point at a different project, set
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`:
   - **Vercel**: Project → Settings → Environment Variables, then redeploy.
   - **Locally**: copy `.env.example` to `.env` and fill in both values.
4. **Load the baseline** — open `/app/sync` and drop your current master spreadsheet (tag the
   sport if the file only covers one).

The `/app/setup` page inside the app shows live connection status and walks through the same steps.

> **Note on access:** the app currently ships without a login and the database policies are
> permissive — anyone with the URL can use it. Fine for a private/internal link; before sharing
> widely, add Supabase Auth and tighten the RLS policies noted in the migration file.

## Development

```bash
npm install
npm run dev      # app at /app (root redirects there)
npm run build    # production build (deployed via Vercel, SPA rewrites in vercel.json)
```

Vendor file columns are matched flexibly (`Coach ID`/`Unique ID`, `First Name`, `School`/`Institution`,
etc. — see `src/lib/excel.ts`). A unique-ID column is required; unrecognized columns are ignored.
