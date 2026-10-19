# VEKT Coach Portal

College coaches add prospects (and each prospect's club coach/director),
send SMS and email invitations through **GoHighLevel** to start a VEKT
conversation, and track every invitation from send to finished **Prospect
Brief**. Athletic directors see every program; compliance approves sends,
reviews blocks and reads every message.

Lives at **`/portal`** in this app. The database (`supabase/migrations/0002_vekt_coach_portal.sql`)
is the system of record. GHL is only the messaging engine.

## How it fits together

```
Coach (browser, RLS-scoped)
  └─ portal_queue_invitations()  ← every pre-send rule enforced in Postgres
        └─ portal_invitations (queued / pending_approval / blocked)
              └─ portal-dispatch (cron, every minute) ── GHL: upsert contact, send SMS/email
                    └─ portal-ghl-webhook ← GHL: delivered / failed / opened / clicked / STOP / DND
                    └─ portal-start ← recipient taps the start link → hand-off to the agent service
                    └─ portal-agent-webhook ← agent: started / completed / brief_ready
                          └─ portal_briefs (the only conversation-derived data coaches can read)
```

| Piece | Where |
|---|---|
| Schema, RLS, send rules, service functions | `supabase/migrations/0002_vekt_coach_portal.sql` |
| Demo data (local only) | `supabase/seed.sql` |
| Edge functions | `supabase/functions/portal-*` (shared code in `_shared/`) |
| Coach portal UI | `src/portal/` |
| Tests | `supabase/tests/portal_test.sql` (pgTAP), `**/*.test.ts` (vitest), `scripts/portal-e2e.mjs` |

## Rules the database enforces

Coaches can't write invitations directly. `portal_queue_invitations()` checks, per recipient and channel:

- **License**: the program is licensed (or the department has the all-sports license), the term is current, and billing isn't overdue.
- **Opt-outs**: no send to any number or email on the global suppression list. A STOP, unsubscribe, spam complaint, bounce or DND in GHL suppresses that address immediately and blocks every unsent invitation to it, in every program.
- **Minors**: a prospect is treated as a minor unless their DOB shows 18+ (or, with no DOB, they graduated before this year). Minors can't be invited without a parent/guardian contact, and the guardian always gets a copy.
- **Recruiting-contact dates**: a per-division/sport table (`portal_contact_rules`) says when contact opens for each grad year. Sends before that date are blocked. With no matching rule, the send is blocked in `enforce` mode. Compliance can release a blocked send with a logged reason.
- **Quiet hours**: texts only go out 9am–8pm in the recipient's local time (from their state, else the department's time zone).
- **Duplicates**: no repeat invite to the same recipient and channel within 14 days unless the coach resends.
- **Approval mode**: when the department turns it on, every send waits for compliance.
- **Message content**: VEKT-approved templates. Coaches add a 280-character personal note. The opt-out line is always appended and can't be edited.

**Triple-blind:** `portal_agent_transcripts` has RLS on and no policies, so only the service role (the agent service) can read raw conversations. Coaches, ADs and compliance see the synthesized brief only. One school never sees another school's prospects or interest.

## Roles

| Role | Can do |
|---|---|
| VEKT super admin (`portal_super_admins`) | Everything; licenses, templates, pricing, global suppression list |
| Department admin | All programs' dashboards and briefs, staff management, approval mode |
| Head coach | Own program: prospects, invitations, briefs, coaching-style profile, reminder cadence |
| Assistant coach | Own program: prospects, invitations, briefs, coaching-style profile |
| Compliance | Read-only on everything in the department, approve/reject/release sends, contact rules, audit log |

Access is invite-only: a department admin adds a staff row with the person's `.edu` email; their first sign-in (magic link) links the account.

## Pricing

Stored in `portal_pricing` (cents per year), not in code: all sports **$25,000**, single sport **$5,000**, each additional sport **$2,500**. A department pays the lower of all-sports and the per-sport total (`portal_quote_cents`). If NCAA rules require recruiting services to publish identical rates for every institution, keep any discount as a published tier.

## Run it locally

Needs Docker and Node 20+.

```bash
npm install
npx supabase start            # local Postgres, auth, REST, edge functions, mail catcher
npx supabase db reset         # applies migrations + seed.sql
cp supabase/functions/.env.example supabase/functions/.env   # mock GHL by default
# then restart so functions pick up the env:  npx supabase stop && npx supabase start
printf 'VITE_SUPABASE_URL=http://127.0.0.1:54321\nVITE_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>\n' > .env.local
npm run dev                   # http://localhost:5173/portal
```

Demo logins (password `vekt-demo-2026`; the password form only appears in dev builds):
`coach.reyes@harborstate.edu` (head coach), `coach.okafor@harborstate.edu` (assistant),
`coach.lind@harborstate.edu` (volleyball head coach), `ad@harborstate.edu` (department admin),
`compliance@harborstate.edu` (compliance), `coach.berg@lakeside.edu` (another school), `admin@vekt.ai` (super admin).

Send queued invitations (what the cron job does):

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/portal-dispatch -H "x-cron-secret: <PORTAL_CRON_SECRET>"
```

Tests:

```bash
npm test             # unit tests (GHL client, webhook mapping, signatures, CSV import)
npm run test:db      # pgTAP: RLS isolation, triple-blind, send rules, webhooks, audit log
npm run test:e2e     # full flow over HTTP against the local stack (run db reset first)
```

## Go live checklist

**Supabase**
1. Apply `0002_vekt_coach_portal.sql` to the production project (`npx supabase db push`). Do **not** run `seed.sql` in production.
2. Auth → URL configuration: set the site URL and add `https://<your-domain>/portal` as a redirect URL. Configure a production SMTP sender for magic links.
3. Set `portal_settings.start_link_base` to `https://<project-ref>.supabase.co/functions/v1/portal-start` (or a branded short domain that forwards there).
4. Insert the first super admin into `portal_super_admins`, then create departments, programs and the first department admin.
5. Deploy functions: `npx supabase functions deploy portal-dispatch portal-ghl-webhook portal-agent-webhook portal-start`.
6. Set secrets: `npx supabase secrets set GHL_MODE=live GHL_PRIVATE_TOKEN=… GHL_LOCATION_ID=… GHL_EMAIL_FROM=… GHL_WEBHOOK_TOKEN=… PORTAL_CRON_SECRET=… AGENT_WEBHOOK_SECRET=… AGENT_START_URL=… AGENT_INBOUND_URL=…` (generate tokens/secrets with `openssl rand -hex 32`).
7. Schedule `portal-dispatch` every minute (Supabase Dashboard → Integrations → Cron, HTTP POST with header `x-cron-secret`).

**GoHighLevel**
1. Use a dedicated VEKT sub-account. Create a Private Integration token with contacts and conversations (read/write) scopes. That token and the location id become `GHL_PRIVATE_TOKEN` / `GHL_LOCATION_ID`.
2. Register **A2P 10DLC** (brand + campaign) for the sending number before any texts go out. Unregistered traffic gets filtered by carriers.
3. Verify the sending email domain (SPF/DKIM/DMARC) and set `GHL_EMAIL_FROM`.
4. Point webhooks at `https://<project-ref>.supabase.co/functions/v1/portal-ghl-webhook?token=<GHL_WEBHOOK_TOKEN>` for: inbound messages, outbound message status, email stats (LCEmailStats), and contact DND updates. If you use a marketplace app instead, set `GHL_WEBHOOK_PUBLIC_KEY` to GHL's published key and the RSA signature (`x-wh-signature`) is verified.
5. Confirm GHL's STOP handling is on for the number. The portal also suppresses on STOP so both sides agree.
6. Before switching `GHL_MODE=live`, check the endpoint paths, `Version` headers and webhook payload fields in `_shared/ghl.ts` and `_shared/events.ts` against GHL's current API docs.

**Compliance (before the first live send)**
- Replace the demo contact rules (marked *Not verified*) with dates from a compliance professional for each division and sport.
- Have counsel review the invitation and guardian-consent wording in the templates (`portal_templates`), the minor-consent flow, and the recruiting-service question for each division.

## Integration points still to connect

- **Agent service**: `portal-start` redirects to `AGENT_START_URL?invitation_id=…&recipient_type=…` when set (otherwise it shows a confirmation page). Inbound replies are forwarded to `AGENT_INBOUND_URL`. The agent posts back to `portal-agent-webhook`, signed with HMAC-SHA256 over `${x-vekt-timestamp}.${body}` using `AGENT_WEBHOOK_SECRET`.
- **Guardian consent page**: the guardian copy's link currently lands on a placeholder page in `portal-start`.
- **Coach notification emails**: brief-ready notifications are in-app (`portal_notifications`); email delivery can be added via GHL.

## Known limits

- Field-level encryption isn't applied to contact fields. Data is encrypted at rest by Supabase's disk encryption. Column encryption would break dedupe and search, so decide with counsel whether it's required.
- The retention setting (`retention_days`) is stored but no automatic purge job runs yet.
- Prospect deletion removes the portal record. The GHL contact ids it returns still need deleting in GHL (the UI doesn't call GHL from the browser).
