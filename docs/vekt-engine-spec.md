# Vekt Voice Engine — Engineering Spec v1

Owner: Elliot Leonard · Prepared for: technical partner engineering staff
Status: DRAFT FOR ESTIMATION · Target: v1 pilot with existing platform clubs

## 1. What we are building

The Vekt engine turns a 3-minute conversational voice audit into a structured
**Cultural Dossier** by triangulating three streams:

1. **Athlete stream** — a scenario-driven voice interview with the athlete.
2. **Club-coach stream** — an independent, blind verification pass with the
   athlete's club coach (rapid scenario questions; neither side sees the
   other's answers before triangulation).
3. **Program culture model** — per-program "non-negotiables" (correction
   style, scheme, locker-room standards) retrieved from the culture vault at
   interview time, so the interview adapts to the programs the athlete targets.

Output: a C.A.L.M. Index reading (Conscious / Aligned / Lacking / Mismatched),
a gap-variance measure between self-perception and coach verification, and a
short qualitative tactical/coachability analysis.

This layers on top of the live Stage-1 platform (structured intake + capped
outreach + coach responses returned by name). The coach-response stream is
Stage-1 ground truth and should be joinable to dossiers from day one.

## 2. Architecture (server-side, no model calls from clients)

```
mobile app (record)                club coach (mobile, async)
      │ audio                            │ audio / taps
      ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│  Vekt API (server)                                      │
│  1. STT → transcript (per-turn, streamed)               │
│  2. Retrieval: culture vault (pgvector on Supabase)     │
│     → program non-negotiables for the athlete's targets │
│  3. Interview loop: Claude generates the next scenario  │
│     probe conditioned on transcript + retrieved culture │
│  4. Triangulation: single structured-output call        │
│     (athlete transcript + coach transcript + culture    │
│     model) → dossier JSON, schema-validated             │
│  5. Persist dossier; emit telemetry (tokens, cost,      │
│     latency) per call                                   │
└─────────────────────────────────────────────────────────┘
```

Stack decisions (locked, matching the existing email-generation service):

- **Inference**: Anthropic Messages API. Interview-loop turns on
  `claude-haiku-4-5` (latency-sensitive, cheap); the final triangulation /
  dossier synthesis on the strongest available Claude model (quality-critical,
  once per audit). Key from `ANTHROPIC_API_KEY` env only; provider behind the
  same single swappable adapter as the email service.
- **Structured output**: dossier produced via a tool/JSON schema; validated;
  one retry on malformed output; **fails closed** — no dossier is stored or
  shown if validation fails.
- **Retrieval**: Supabase Postgres + pgvector. Culture vault documents are
  per-program records (seeded from the 2,993-program database + coach intake
  forms), chunked and embedded. Retrieval by athlete's target-program list.
- **STT**: pluggable (same adapter philosophy). v1 can use any hosted STT;
  transcripts are the system of record, raw audio retention is minimized
  (see §4).
- **Telemetry**: per-call token counts, cost, latency to the same telemetry
  sink as the email service. Exponential backoff on 429/5xx.

## 3. The C.A.L.M. computation

- Interview and coach streams are scored on the same scenario dimensions
  (ownership, response to correction, blame displacement, leadership under
  adversity). The triangulation call receives both transcripts and produces:
  - per-dimension readings (short text, coach-voiced),
  - a gap variance (athlete self-assessment vs. coach verification),
  - the C.A.L.M. tier, with the model's rationale.
- Tier boundaries are deterministic post-processing on the structured output
  (gap 0 & high self-rating → C; gap 0 → A; gap ≤2 → L; else M), so the tier
  is reproducible and auditable — the model supplies readings, not the final
  tier arithmetic.
- Prompts live in versioned files; every dossier records the prompt version
  and model IDs used.

## 4. Product rules wired in as engineering requirements

These are requirements because they are what let clubs and colleges sign, not
compliance garnish. Most subjects are minors.

1. **Consent-gated**: no audit runs without recorded guardian consent (under
   18) and club enrollment. Consent state is checked server-side per session.
2. **Athlete-visible**: the athlete (and guardian) can view their full
   dossier — every reading a college sees. No hidden scores.
3. **Explicit sharing**: dossiers are released to a college program only on
   an explicit share action (athlete/guardian or club per its agreement),
   logged.
4. **Minimum retention**: raw audio deleted after transcription + QA window;
   transcripts and dossiers retained; a delete request purges all three.
5. **Minimum fields to the model**: prompts carry first name, sport,
   position, class year, and scenario content — no contact info, no school
   records beyond what the reading requires.
6. **No dossier auto-send**: v1 dossiers are reviewed by the club (VIS flow)
   before first release to any college. Mirrors the email service's
   "20 samples reviewed before send" rule.

## 5. v1 scope for estimation

In: athlete voice interview (3 scenario probes, adaptive), coach verification
(3 rapid questions, async), culture vault seeded for the athlete's target
list, triangulation → dossier JSON → rendered dossier view in the Club
Command Center, share flow, telemetry.

Out (v1): real-time voice synthesis back to the athlete (text prompts read by
the app are fine), multi-language, non-soccer sports, college-side dashboard
(they receive shared dossiers as rendered pages).

Milestone shape (from the deck): v1 with pilot clubs in Q2; VIS accreditation
launch Q3.

## 6. Open questions for engineering

1. STT choice and per-minute cost at pilot volume; on-device vs. hosted.
2. Interview session transport: streamed turn-by-turn vs. record-then-process
   (v1 bias: record-then-process per probe — simpler, good enough at 3 probes).
3. Culture vault authoring UI: coach intake form vs. internal-only seeding
   for pilots (v1 bias: internal seeding).
4. Where dossier rendering lives: Club Command Center route vs. standalone
   share link (v1 bias: both — CCC for clubs, tokenized link for colleges).
5. Estimated eng-weeks for v1 scope, split app / API / data.
