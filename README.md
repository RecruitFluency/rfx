# RFX

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/RecruitFluency/rfx)

Two things live in this repo:

- **`/`** — the RFX marketing landing page
- **`/app`** — the **Coach Database**: the internal tool that automates the monthly chore of
  updating the master list of college coaches from vendor spreadsheets

## What the Coach Database does

1. **Monthly Sync Engine** (`/app/sync`) — drag & drop the vendor `.xlsx`/`.csv`. The first upload
   becomes the baseline; every later upload is diffed against the master list *inside Postgres*,
   so huge files are handled server-side. Coaches are tracked by their permanent **Unique ID**,
   never by email — when a coach moves schools or changes email, their history and notes move with them.
2. **Review Queue** (`/app/review`) — the safety net. Suspicious data never touches the master list
   automatically: a "new" coach whose email we already know, rows with no unique ID, duplicate IDs,
   or a mass disappearance (>15% of active coaches vanishing at once — usually a truncated vendor
   file) all pause here for approval.
3. **Coach & Program Directories** (`/app/coaches`, `/app/programs`) — searchable master list with
   full job history, notes, and email logs per coach; program pages with academic stats and the
   current coaching roster.
4. **Command Center** (`/app`) — Jen's home screen: what needs attention, last sync results, recent
   changes, and a slide-out assistant for quick stats and navigation.

## Going live (one-time, ~10 minutes)

The app is a static Vite/React frontend backed by **Supabase** (hosted Postgres). The entire sync
engine runs as SQL functions in the database — no separate Python/Render server is needed.

1. **Create the database** — [supabase.com](https://supabase.com) → New project (free tier is fine).
2. **Install the schema** — in Supabase's *SQL Editor*, paste and run
   [`supabase/migrations/0001_coach_database.sql`](supabase/migrations/0001_coach_database.sql).
   This creates all tables and the `process_sync_batch` / `resolve_review_item` functions.
3. **Connect the app** — in Supabase *Project Settings → API*, copy the Project URL and anon key,
   then add them where the app is hosted:
   - **Vercel**: Project → Settings → Environment Variables →
     `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
   - **Locally**: copy `.env.example` to `.env` and fill in both values.
4. **Load the baseline** — open `/app/sync` and drop your current master spreadsheet.

The `/app/setup` page inside the app shows live connection status and walks through the same steps.

> **Note on access:** the app currently ships without a login and the database policies are
> permissive — anyone with the URL can use it. Fine for a private/internal link; before sharing
> widely, add Supabase Auth and tighten the RLS policies noted in the migration file.

## Development

```bash
npm install
npm run dev      # landing page at /, app at /app
npm run build    # production build (deployed via Vercel, SPA rewrites in vercel.json)
```

Vendor file columns are matched flexibly (`Coach ID`/`Unique ID`, `First Name`, `School`/`Institution`,
etc. — see `src/lib/excel.ts`). A unique-ID column is required; unrecognized columns are ignored.
