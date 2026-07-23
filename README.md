# RFX Coach Database

**The end goal: RFX owns the single source of truth for every college coach in America — kept
current by one person in under 30 minutes a month.** Multi-sport, every level (NCAA D1/D2/D3,
NAIA, junior college), always verified, feeding the RFX app live. The movement history and
patterns the database accumulates are themselves the asset the company shows investors.

The app lives at `/app` (the root URL redirects there).

## The monthly routine (what Jen does)

1. **Drop the vendor file(s)** in Monthly Sync, tagged by sport. The engine diffs them against the
   master list inside Postgres — hires, moves, departures, all worked out automatically. A file
   tagged for one sport can never touch another sport's coaches.
2. **Approve/reject the flags** in the Review Queue — anything suspicious (identity conflicts,
   missing IDs, mass disappearances from truncated files) pauses for a human call. Nothing bad
   ever auto-applies.
3. **Glance at Data Health** — missing emails, stale records, duplicates, each drillable to the
   exact coaches, fixable inline on their profiles.
4. **The app gets the clean list** — CSV/JSON export by sport/division, or the RFX app reads the
   `coaches` table live from Supabase (filter `status = 'active'`).

The Command Center opens on this exact checklist with live green checks, and the in-app **Guide**
page (`/app/guide`) is the 2-minute manual.

## Working around the clock (no extra servers)

- **The Watchtower** — a daily in-database agent (pg_cron): flags movement, review items aging
  past 2 days, and stale data. Surfaced under the bell icon.
- **The National Radar** — sweeps coaching-news RSS feeds every 6 hours from inside Postgres,
  matches headlines to coaches in the database, and often catches moves months before a vendor
  file does. Coach Tracker → News Radar.

## The intelligence layer

- **Coach Tracker** (`/app/tracker`) — every recorded hire/move/departure, filterable, tied to
  each coach's permanent ID so careers survive school and email changes.
- **Insights** (`/app/insights`) — movement trends by month, coverage by sport/division/state,
  hottest programs by churn. The investor page.
- **Assistant** — answers live-data questions: "who is missing an email?", "who moved recently?",
  "how many soccer coaches?", "what's our turnover trend?"

## Setup (one time, ~5 minutes)

The frontend is static Vite/React on Vercel; everything else is **Supabase** (hosted Postgres).
The production credentials are baked in, so a deploy is connected out of the box
(`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars override them if you ever need a
different project).

**Install the database with ONE file:** in Supabase's *SQL Editor*, paste and run
[`supabase/setup_all.sql`](supabase/setup_all.sql). It creates every table, the sync engine, both
agents, and their schedules — and it's idempotent, so re-running it any time repairs whatever is
missing. The in-app **Settings** page shows a live per-component install status and links to this
file.

(The same SQL also exists as ordered steps in [`supabase/migrations/`](supabase/migrations/) for
anyone who prefers incremental migrations.)

Then upload your current master spreadsheet in Monthly Sync — that's the baseline.

> **Note on access:** the app ships without a login and the database policies are permissive —
> anyone with the URL can use it. Fine for a private/internal link; before sharing widely, add
> Supabase Auth and tighten the RLS policies noted in the migration files.

## Development

```bash
npm install
npm run dev      # app at /app (root redirects there)
npm run build    # production build (SPA rewrites in vercel.json)
```

Vendor file columns are matched flexibly (`Coach ID`/`Unique ID`, `First Name`,
`School`/`Institution`, etc. — see `src/lib/excel.ts`). A unique-ID column is required;
unrecognized columns are ignored.
