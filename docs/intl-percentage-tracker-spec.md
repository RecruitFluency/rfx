# D1 International Percentage Tracker — Product & Feature Specification

> **Status:** **v1 specified (2026-06-04).** §16 items 1–10 accepted. By-position
> breakdown and an athlete's-perspective view (§8.6) are now v1 features; they open three
> follow-on choices (§16 items 11–13, each with a recommended default). Two human action
> items in §18 (compliance read + named refresh owner) remain the only hard blockers
> before build. This document enumerates every feature, intricacy, edge case, and
> decision so we build the right thing once.
> **Owner:** RFX (RecruitFluency)
> **Last updated:** 2026-06-04

---

## 1. One-line summary

A downloadable, sortable breakdown of **international vs. domestic (American) roster
percentages for every NCAA Division I soccer program**, with year-over-year trends, so
recruiting families can identify the schools where **American/domestic spots are
growing or shrinking** before they spend time and money chasing the wrong programs.

This is **pure, original data nobody has published in one place** — that's the wedge.

---

## 2. Why this exists (problem & value)

### The problem for families
- D1 soccer rosters have become heavily international at many programs (especially
  men's). A program that lists 28 players but recruits 18 internationals offers a very
  different opportunity than its "28-man roster" suggests.
- Families have **no way to see this** without manually opening each school's roster,
  reading hometowns one by one, and guessing nationality. Nobody does it at scale.
- The result: athletes waste outreach, camp money, and visits on programs that are
  structurally unlikely to recruit a domestic player at their position.

### The value we deliver
- **Transparency:** one number per program — `% international` — plus the trend.
- **Direction matters more than the snapshot:** "American spots increasing/decreasing"
  is the headline. A program at 50% international but trending *down* may be a better
  target than one at 30% trending *up*.
- **Actionable targeting:** families build a smarter outreach list; this feeds directly
  into RFX's core recruitment workflow (the tracker is a top-of-funnel lead magnet).

### Why it's defensible
- The data requires real collection, cleaning, and a defensible **nationality
  methodology** (see §6). The methodology *is* the moat. Competitors can scrape a
  roster; they can't easily reproduce trustworthy, trended, position-aware nationality
  classification.

---

## 3. Scope

### In scope (v1 / MVP)
- **NCAA Division I only.**
- **Soccer only**, both **Men's** and **Women's** (separate datasets; never blended).
- Per-program metrics: total roster size, international count, domestic count,
  international %, domestic %, and the most recent prior-season comparison.
- Browse + search + filter + sort UI on the RFX site.
- **Downloadable export** (the headline feature) — see §7.
- Lead capture / gating tied to RFX (see §11).

### Explicitly out of scope for v1 (candidate for later — see §15)
- D2 / D3 / NAIA / NJCAA (architecture must not preclude adding them).
- Other sports (basketball, etc.).
- Individual-player profiles or names exposed in the product (see §13 — PII/legal).
- Predictive modeling of "your odds at school X."
- Coach-contact data (already part of RFX core; link out, don't duplicate).

### Locked decisions (v1)
- **Gender at launch:** **Men's + Women's D1 together.** Two separate datasets, never
  blended (see §6 — men's and women's intl intensity differ materially, so every view,
  average, and export is gender-scoped).
- **History depth at launch:** **2 seasons — current + immediately prior.** This is the
  minimum that supports the headline "American spots increasing/decreasing" trend
  (a single YoY Δ). Deeper history (3–5 seasons) is a v2 item (§15). Implication: the
  collection pipeline must capture *two* clean snapshots per program before launch.

---

## 4. Target users & jobs-to-be-done

| User | Job-to-be-done |
|------|----------------|
| **Recruiting parent** | "Show me which D1 programs actually recruit domestic players at my kid's position, and which direction they're trending, so I don't waste a year." |
| **High-school athlete** | "Build a realistic target list ranked by domestic opportunity." |
| **Club / HS coach / advisor** | "Hand families credible, sourced data to set expectations." |
| **RFX (us)** | "Publish original data that earns trust + email signups and routes athletes into the core RFX product." |

Primary persona for UX decisions: **the recruiting parent on a phone**, not a data
analyst. Default views must be legible at a glance; power features (full table, raw
export) are one tap away but not the default.

---

## 5. Data model (conceptual)

The tracker is fundamentally a small, **read-only, periodically-refreshed dataset**.
No live user-generated data in v1.

### Entities

**Program**
- `program_id` (stable internal id)
- `school_name`, `common_name`/aliases
- `conference`
- `gender` (`mens` | `womens`) — a program is gender-specific
- `division` (= `D1` in v1)
- `state`, `region`
- `roster_url` (source), `official_site`

**RosterSnapshot** (one per program per season)
- `program_id`
- `season` (e.g. `2025`) and `season_label` (e.g. `2025–26`)
- `roster_size`
- `intl_count`, `domestic_count`, `unknown_count`
- `intl_pct`, `domestic_pct` (derived; see §6 for denominator rules)
- `collected_at` (timestamp), `source_url`, `methodology_version`
- `confidence` (per-snapshot data-quality score)

**RosterEntry** (internal only — **not exposed publicly**, see §13)
- `snapshot_id`
- `class_year` (Fr/So/Jr/Sr/Grad)
- `position_group` (GK / DEF / MID / FWD / unknown)
- `hometown_raw`, `country_resolved`, `nationality_basis` (how we classified — see §6)
- `is_international` (bool | null when unknown)
- `confidence`

### Derived / aggregate objects (what the UI and export consume)
- **ProgramTrend:** ordered list of snapshots → `intl_pct` over time, plus
  `direction` (`increasing_domestic` | `decreasing_domestic` | `stable`) and
  `delta_pct` (most recent vs. prior season).
- **Conference rollups**, **state rollups**, **national averages** (men's vs women's).
- **Position-aware view (v1 — first-class):** intl % within each position group
  (GK / DEF / MID / FWD) per program. This is **the single most valuable cut for a
  family** — a striker cares about FWD intl %, not roster-wide %. A program can be 50%
  international overall yet recruit *zero* domestic forwards; the roster-wide number
  hides exactly the thing the family needs. See §6.5 for grouping rules and the
  small-sample handling that keeps these numbers honest.
- **Position depth (v1):** count of players at each position group per program (and vs.
  the typical depth for that position) — a domestic-friendly position that's already 8
  deep is still a buried opportunity. Derived from the same per-player position capture.
- **Projected openings / roster churn (v1):** per position group, count of upperclassmen
  (Jr / Sr / Grad) likely to depart → an *indicator* of spots opening up. Derived from
  the `class_year` we already capture. **Estimate, not a guarantee** — soccer eligibility
  is messy (redshirts, COVID-era years, grad transfers, portal moves), so this is framed
  as "graduating/upperclassmen at your position," never a precise headcount of openings.

---

## 6. Methodology — the hard part (must be rigorous & disclosed)

The credibility of the whole product rests here. Every published number must be
**reproducible and defensible**, and the methodology must be **publicly documented**
inside the product.

### 6.1 What counts as "international"?
Default definition for v1 (**must be stated in-product**):
- **International = a player whose pre-college home country is outside the United
  States**, as indicated by the program's official roster hometown/“last club”/country
  field.
- **Domestic (American spot) = U.S. hometown.**

Edge cases to define explicitly (these will be challenged, so document the call):
- **U.S. territories** (Puerto Rico, Guam, USVI): default **domestic** (U.S.), flagged.
- **Dual nationals / Americans who played club abroad:** classified by **stated
  hometown country**, not citizenship (we cannot know citizenship; we only know what the
  roster lists). This must be stated as a known limitation.
- **Canadians/Mexicans** etc.: international (non-U.S.), but we should be able to filter
  "North American" vs "overseas" because families perceive these differently.
- **Prep schools / IMG-type academies:** a foreign player listing a U.S. prep school as
  hometown can be miscoded domestic. Mitigation: capture **both** hometown and
  high-school/club fields when available; flag mismatches for review.

### 6.2 How we determine country
Tiered, with the basis recorded per entry (`nationality_basis`):
1. **Explicit country field** on the roster (highest confidence).
2. **Hometown string parse** → `City, ST` (U.S.) vs `City, Country`.
3. **Flag/emoji or "previous club" country**, where listed.
4. **Unresolved → `unknown`** (never guessed silently).

### 6.3 The denominator question (must be decided & disclosed)
- `intl_pct` denominator options: (a) full roster, (b) roster **excluding unknowns**,
  (c) **scholarship-eligible/active** players only.
- **Default decision:** report **% of resolved players** (exclude unknowns from
  denominator) **and always show the unknown count** so the number isn't silently
  inflated. Show roster-size and unknowns next to every percentage.

### 6.4 Data quality & confidence
- Per-snapshot `confidence` driven by: % resolved, source freshness, parse ambiguity.
- **Suppress or badge** any program below a confidence threshold rather than publish a
  misleading number.
- Every program page links to its **source roster URL** and **collection date**.

### 6.5 Position classification & small-sample handling (for the by-position view)
Because the by-position cut is now a v1 feature, it needs its own rules — it's where
the data is most useful **and** most easily misread.

**Grouping.** Normalize each roster's position labels into four groups:
**GK, DEF, MID, FWD**, plus `unknown`. Roster pages vary wildly (e.g. "Outside Back",
"Holding Mid", "Forward/Winger", "M/F"). Maintain a **mapping table** from raw labels →
group, with anything unmapped routed to `unknown` for review (never silently bucketed).
- **Hybrids (e.g. "M/F", "D/M"):** default to the **first/primary** listed position;
  record the raw label so the call is auditable.
- Position is captured per player alongside hometown (§10), so this adds **no extra data
  source** — it's the same scrape, classified one extra way. Collection cost is low; the
  intricacy is in classification and presentation.

**The small-sample problem (must handle, or the feature misleads).** Position groups are
tiny — a roster may have only **3–5 forwards**. At n=4, every player is 25 percentage
points, so one international forward reads as "75% domestic" and a single roster change
swings the number violently. Rules:
- **Show raw counts, never bare percentages, at the position level** — e.g. "FWD: 3 of 5
  international" *with* the % as secondary, so the reader sees the denominator.
- **Minimum-sample gate:** below a threshold group size (default **n < 4**), display the
  count but **suppress or grey out the percentage and any trend**, badged "small sample."
- **No position-level YoY trend on tiny groups** — a 2-season delta on n=4 is noise.
  Position trend shown only when both seasons clear the sample gate.
- The **roster-wide number remains the headline**; position is an expandable detail, so
  we don't lead with the noisiest figure.

### 6.6 Versioning & corrections
- `methodology_version` stamped on every snapshot so historical numbers remain
  reproducible even as rules evolve.
- Public **changelog** + a **"report a correction"** path (families and coaches will
  catch errors — turn that into a trust signal, not a liability).

---

## 7. The headline feature — downloadable breakdown

This is the thing people came for. It must feel like a **credible published dataset**,
not a teaser.

### Formats
- **CSV** (power users / spreadsheets) — always available.
- **PDF one-pager** per cut (e.g. "Men's D1, sorted by domestic opportunity") —
  shareable, RFX-branded, includes methodology footer + source date.
- **XLSX** (stretch) with multiple tabs (data, methodology, glossary).

### What a download contains (columns)
`School, Conference, State, Gender, Season, Roster Size, Intl Count, Domestic Count,
Unknown Count, Intl %, Domestic %, Prior-Season Intl %, YoY Δ (pp), Trend Direction,
Confidence, Source URL, Collected Date`.

**Per-position columns (v1):** for each group, `GK Intl/Total`, `DEF Intl/Total`,
`MID Intl/Total`, `FWD Intl/Total` (counts), plus the % where the group clears the
small-sample gate (§6.5) — below it, the % cell reads `n/a (small sample)` rather than a
misleading number. Also per group: **`Depth` (count carried)** and **`Upperclassmen`
(Jr/Sr/Grad count = projected-openings indicator, §5).** A "by position" tab/PDF lets a
family export the cut for just their spot.

### Export intricacies (don't skip these)
- **Respects current filters/sort** (what you see is what you download) **and** offers
  "download full dataset."
- **Methodology + glossary + "data as of" date embedded** in every export (PDF footer /
  CSV header comment / XLSX tab) — so a forwarded file is still self-explanatory and
  still attributes RFX.
- **Branding & attribution** on PDF/XLSX (logo, URL) for organic distribution.
- **Versioned filename:** `rfx-d1-intl-tracker_mens_2025-26_v1_2026-06-03.csv`.
- **Gating:** email required to download (see §11); the *view* can be partially open,
  the *download* is the conversion event. Decision to confirm in §16.
- **Stable public methodology page** the export links back to.

---

## 8. Core application features (UI)

### 8.1 Program directory / table (primary surface)
- Searchable, sortable table of all D1 programs for the selected gender.
- **Default sort: "most domestic opportunity"** — i.e. lowest international %, or better,
  **most-improving domestic trend** (this reframes the product around the family's goal,
  not just a static ranking).
- Columns: School, Conference, State, Roster size, **Intl %**, **YoY trend (▲/▼ + pp)**,
  sparkline.
- Row → program detail.

### 8.2 Filters
- Gender (Men's / Women's) — top-level, mutually exclusive.
- Conference (multi-select).
- State / region.
- Intl % range (slider).
- **Trend direction** (increasing domestic / decreasing / stable) — high value.
- **Position-group filter (v1):** "show me programs by FWD/MID/DEF/GK domestic
  opportunity" — the athlete picks *their* position and the whole table re-ranks to that
  lens (see §5, §6.5, §8.6).
- Confidence threshold (default hides low-confidence; toggle to show all w/ badge).

### 8.3 Program detail
- Big number: current **Intl %** and **Domestic %** with roster size + unknown count.
- **Trend chart** across available seasons.
- **Position-group breakdown (v1):** GK/DEF/MID/FWD shown as "X of Y international"
  with % secondary and small-sample badging (§6.5) — so the athlete sees the opportunity
  at *their* spot, not just the roster-wide number.
- Conference + national average comparison ("this program vs. D1 men's average").
- Source link, collection date, confidence badge, methodology link.
- CTA into RFX core product ("build your outreach list", "see coach contacts").

### 8.4 Comparison & context views
- **Compare up to N programs** side-by-side.
- **Conference leaderboards** (most/least domestic opportunity).
- **National snapshot:** D1 men's vs women's average intl %, distribution histogram,
  biggest YoY movers (the "American spots increasing" highlight list — likely the most
  shared screenshot).
- **"Movers" list:** programs with the largest domestic-opportunity swings — strong
  social/marketing artifact.

### 8.6 Athlete's-perspective view ("is this program worth a look *for me*?")
The core job isn't "what % international is this program" — it's **"is it worth my time,
money, and outreach to pursue this program, given who I am?"** Everything above should
roll up into a per-athlete read. Driven by a lightweight, no-account **"set your
profile"** step (position required; the rest optional):

- **Position (required):** re-ranks every view to the athlete's spot (§8.2). A forward
  sees FWD domestic opportunity, not the roster average.
- **Worth-a-look signal (the headline output):** combine, *for the athlete's position*,
  (a) current domestic opportunity, (b) the 2-season trend direction, and (c) roster
  churn (how many of that position graduate / how many spots realistically open). Surface
  a plain-language read — e.g. *"FWD spots here are limited and trending more
  international — likely a reach for a domestic forward"* vs. *"DEF is majority domestic
  and opening up — worth a look."* **Always sourced, always with the underlying numbers
  and small-sample caveat visible** — a signal, never a verdict.
- **Roster-churn / openings context (v1):** class-year breakdown by position (we already
  capture class year, §5) → how many at the athlete's position are upperclassmen likely
  to leave. "Spots opening" matters as much as the current split. Framed as an indicator,
  not a guaranteed headcount (eligibility is messy — see §5).
- **Position depth (v1):** how many players the program carries at the athlete's position
  (vs. typical), so a domestic-friendly-but-crowded spot reads honestly.
- **Save / build-a-list:** let the athlete tag programs into a target list (the bridge
  into the RFX core funnel) ranked by *their* opportunity, not a generic ranking.

> **Decided (2026-06-04):** the tracker itself surfaces **position %, 2-yr trend, roster
> churn/openings, and position depth** — all derived from data we already collect.
> **Scholarship structure, competitive/level fit, geography, and class timing** stay
> *link-outs to the RFX core product*, not data the tracker collects (§3 out-of-scope).
> The discipline holds: the tracker stays **the international/domestic-opportunity lens**,
> *frames* the worth-it question, and hands off to RFX for the rest.

---

## 9. Visualizations
- **Sparklines** in the table (compact trend).
- **Trend line chart** on detail pages.
- **Distribution histogram** (how programs spread across intl %).
- **Conference bar charts.**
- **Map view (stretch):** choropleth of domestic opportunity by state.
- Keep charts legible on mobile first; respect the RFX dark theme
  (`#121212`/`#000` backgrounds, `#FF0000` accent) and existing `framer-motion` motion
  language already used across the site.

---

## 10. Data sourcing, refresh & pipeline

### Sourcing
- Primary source: **official program roster pages** (and/or a licensed roster data
  provider if available — evaluate before scraping at scale).
- Capture: name (internal only), class year, position, hometown, country, prev. club,
  high school — whatever the page exposes.
- **Respect each site's Terms of Service and `robots.txt`;** prefer official/licensed
  feeds; rate-limit; cache; store source HTML/URL + timestamp for auditability.

### Refresh cadence
- Rosters change seasonally (and mid-year). Plan a **preseason full refresh (Aug–Sep)**
  + periodic spot refresh. Every snapshot is timestamped; the product never implies
  data is more current than it is.

### Pipeline stages
1. **Collect** (fetch + store raw) → 2. **Parse** (extract fields) → 3. **Classify**
   (nationality methodology §6) → 4. **Review** (low-confidence queue, human spot-check)
   → 5. **Publish** (write the aggregate JSON the front-end reads) → 6. **Snapshot &
   version** (immutable historical record).
- For v1 the front-end can consume a **static, versioned JSON/CSV artifact** committed
  or hosted as a static asset — no live backend required (fits the current Vite/React
  static-site stack). A backend/DB is a later optimization, not an MVP requirement.

---

## 11. Lead capture & monetization (fits RFX model)

- The tracker is a **top-of-funnel lead magnet**, not a standalone paid product (v1).
- **View vs. download split:** open or partial browse; **email gate on download** and on
  premium cuts (position-level data, full historical trend, "movers" report).
- Captured leads route into the existing RFX recruitment funnel (the site already sells
  the core app). Every program page CTAs into that product.
- Possible later tiers: free snapshot vs. paid full-history + position-level + alerts.
- **Email/notification opt-in:** "alert me when a target school's domestic % changes."

---

## 12. Tech approach (fit the existing stack)

Current stack (from repo): **Vite + React 18 + TypeScript + Tailwind + framer-motion +
lucide-react**, static marketing site, dark RFX brand theme.

- Build the tracker as a **route/section within this app** (e.g. `/tracker`), reusing
  brand components, theme tokens, and motion patterns already present.
- **Data as a static, versioned artifact** — *recommended: committed JSON in `public/`*
  (§16.8) — consumed client-side → no server needed for MVP. Table/filter/sort
  client-side.
- Charting: *recommended (§16.7)* hand-rolled SVG sparklines for the table, adding a
  small lib (Recharts) only if the detail-page trend/histogram needs it.
- CSV/PDF export client-side (CSV trivial; PDF via a small client lib or pre-rendered
  branded template).
- **The data pipeline (§10) is a separate concern** from this front-end repo; keep the
  collection/classification tooling in its own project/folder so the marketing app stays
  a thin consumer of a clean published artifact.
- Accessibility: keyboard-navigable table, sortable headers, screen-reader labels on
  trend arrows, sufficient contrast on the dark theme.
- Performance: lazy-load the dataset; the full D1 soccer set is small (hundreds of
  programs) so client-side filtering is fine.

---

## 13. Legal, ethical & PII considerations (read before building)

- **Do not publish individual players' names/PII** in the product or exports. We
  aggregate to the **program** level. Player-level rows stay internal to the pipeline.
  This sidesteps the bulk of privacy/likeness concerns and keeps the product about
  *structural opportunity*, not surveilling teenagers.
- **No protected-characteristic framing.** Nationality of a roster is public roster
  information; we report **opportunity for domestic recruits**, factually and
  neutrally. Avoid any language that could read as xenophobic — the framing is
  *"where are American roster spots growing"*, sourced and unemotional.
- **Sourcing compliance:** honor ToS/`robots.txt`, prefer licensed/official data,
  store provenance. Get a quick legal/compliance read before large-scale collection.
- **Accuracy disclaimer + corrections process** prominently shown (methodology §6.5).
- **"Data as of" dating everywhere** so we never overstate currency.

---

## 14. Definitions / glossary (ship this in-product)
- **International player:** non-U.S. stated home country (per official roster). See §6.1.
- **Domestic / American spot:** U.S. stated home country.
- **Intl %:** international ÷ resolved players (unknowns excluded from denominator,
  shown separately). See §6.3.
- **YoY Δ (pp):** change in intl % vs. prior season, in percentage points.
- **Trend direction:** increasing / decreasing / stable **domestic** opportunity.
- **Confidence:** data-quality score for a snapshot (resolution rate + freshness).
- **Resolved / Unknown:** whether we could classify a player's country.

---

## 15. Roadmap (MVP → later)

**MVP (v1)** *(scope locked: Men's + Women's D1, 2 seasons)*
- **Men's + Women's D1 soccer**, **2 seasons (current + prior)** so every program shows a
  YoY trend, browse/filter/sort table, program detail, CSV + branded PDF export, email
  gate on download, in-product methodology + glossary, source/provenance, corrections
  link.
- **By-position breakdown (GK/DEF/MID/FWD)** with small-sample handling (§6.5) — *promoted
  into v1*, since the per-position cut is what makes the tool answer the athlete's actual
  question.
- **Athlete's-perspective view (§8.6):** set-your-position re-ranking + a sourced
  "worth-a-look" read + save-to-list hand-off into RFX.
- **Roster churn / "spots opening" + position depth** by position group (derived from
  class-year + position we already capture) — *promoted into v1* per the athlete's-
  perspective decision.

**v1.1**
- "Movers" report • conference & national rollups • compare view • histogram/leaderboards
  • scholarship/fit link-outs to RFX core.

**v2+**
- Deeper history (3–5 seasons) • email alerts on changes • D2/D3/NAIA expansion •
  other sports • map view • optional paid tier • API.

---

## 16. Open questions / decisions needed before build

**Resolved**
- ✅ **Gender at launch:** Men's + Women's D1 together (separate, gender-scoped
  datasets). — *decided 2026-06-04*
- ✅ **History depth at launch:** 2 seasons (current + prior) to support YoY trend;
  3–5 seasons deferred to v2. — *decided 2026-06-04*

**Accepted** *(2026-06-04)* — the recommended defaults below were approved as v1
decisions. Each retains its rationale for the record. Two items still require a *human
assignment/action* (not a product decision) and are tracked in §18.

3. ✅ **Gating.** *Options:* whole tool gated vs. browse-open / download-gated.
   **→ Accepted: browse open, email-gate the download (and premium cuts).**
   Open browsing lets the data get discovered, screenshotted, and linked (the whole
   "data nobody published" distribution play); the **download is the conversion event**
   where we capture the email into the RFX funnel. A hard gate on the whole tool would
   kill the organic-distribution upside. *Risk:* lower email capture per visitor —
   mitigated by also gating the high-value cuts (full export, position-level, "movers").

4. ✅ **Default sort / framing.** *Options:* rank by lowest intl % (static snapshot) vs.
   most-improving domestic trend. **→ Accepted: most-improving domestic
   trend (largest positive YoY Δ in domestic %), with intl % as a secondary sortable
   column.** The trend *is* the differentiated story ("where American spots are
   increasing") and reframes the product around the family's goal rather than a static
   ranking anyone could approximate. *Caveat:* with only 2 seasons, a single YoY Δ can
   be noisy for small rosters — pair the sort with roster-size context and the
   confidence badge so a 1-player swing on a 22-player roster isn't oversold.

5. ✅ **Denominator.** **→ Accepted: confirm §6.3 — intl % = international ÷
   *resolved* players (unknowns excluded from the denominator), with roster size and
   unknown count always shown next to the percentage.** Excluding unknowns avoids
   silently deflating intl %; showing them keeps it honest. No change needed — this just
   ratifies the §6.3 default.

6. ✅ **Data source.** *Options:* scrape official roster pages vs. license a roster-data
   provider. **→ Accepted: start with official roster pages (polite,
   rate-limited, provenance stored), and run a parallel evaluation of ≥1 licensed
   provider before scaling.** Official pages are the authoritative, free source and let
   us validate the methodology immediately; a licensed feed (if affordable and it
   carries clean country/hometown fields) becomes the durable supply once proven.
   **Compliance gate:** honor ToS/`robots.txt`, get the quick legal read flagged in §13
   *before* large-scale collection. This is the single biggest external dependency —
   treat it as a go/no-go checkpoint, not an assumption. *(Compliance read tracked in §18 as a hard gate.)*

7. ✅ **Charting dependency.** *Options:* add a chart lib (Recharts/visx) vs. hand-rolled
   SVG. **→ Accepted: hand-rolled SVG sparklines for the table + one small
   chart lib (Recharts) only if the detail-page trend/histogram needs it.** With just 2
   seasons, "trend" is effectively two points + an arrow — a charting lib is overkill for
   the table. Keep the bundle lean (the site is a lightweight Vite static app); revisit
   when deeper history (v2) makes real time-series charts worthwhile.

8. ✅ **Where the data artifact lives.** *Options:* committed JSON in `public/` vs.
   hosted CDN/endpoint. **→ Accepted: committed, versioned JSON in `public/`
   for v1.** The dataset is small (hundreds of programs), updates seasonally not live,
   and a committed artifact gives free versioning, diff-able review of each refresh, and
   zero infra. Move to a CDN/endpoint only if/when refresh frequency or size demands it.

9. ✅ **Refresh ownership & cadence.** **→ Accepted: preseason full refresh
   (Aug–Sep) as the anchor, owned by a named RFX data owner, with every new snapshot
   passing the §10 review queue (low-confidence spot-check) before it's committed and
   published.** Publishing = opening a PR that updates the `public/` artifact, so each
   refresh is reviewed and reversible. *To assign:* the human owner of the seasonal
   refresh — needs a name, not just a process.

10. ✅ **Territories & dual-national edge rules.** **→ Accepted: confirm the
    §6.1 defaults — U.S. territories (PR/Guam/USVI) = domestic (flagged); dual
    nationals classified by *stated hometown country*, not citizenship; provide a
    "North American (CAN/MEX)" vs. "overseas" filter since families read those
    differently.** All defensible and already documented; this item just ratifies them.

**New — opened by the by-position / athlete-perspective additions (need decisions)**

11. **Small-sample threshold.** Confirm the position-group cutoff below which we show the
    count but suppress the % (§6.5). **→ Recommended default: n < 4** (hide % and trend,
    badge "small sample"). Drives how often the marquee per-position number is visible.
12. **"Worth-a-look" signal (§8.6) — how prescriptive?** *Options:* (a) show only the raw
    per-position numbers + trend and let the family judge; (b) add a plain-language,
    sourced read ("limited / opening up / reach"). **→ Recommended default: (b), but
    clearly a *signal, not a verdict*** — always with the underlying numbers and
    small-sample caveat visible. Keeps it useful without overstepping into "your odds."
13. **Position grouping standard.** Confirm the 4-group model (GK/DEF/MID/FWD) + a raw→
    group mapping table with `unknown` for unmapped, hybrids → primary listed position
    (§6.5). **→ Recommended default: as written.** Low risk; just ratify.

> **Net:** items 1–10 remain **accepted**. The by-position cut and the athlete's-
> perspective view (§8.6) are now **v1**, and they open three follow-on choices (11–13),
> all with recommended defaults above. The two *human* items in §18 (compliance read,
> refresh owner) are still the only hard blockers to starting the build.

---

## 17. Success metrics
- **Distribution:** downloads, PDF shares, inbound links/press (it's "data nobody
  published").
- **Conversion:** email signups from the gate → entries into RFX core funnel.
- **Trust:** correction volume trending down; source/methodology engagement.
- **Engagement:** filter usage, compare usage, return visits around refresh windows.

---

## 18. Pre-build action items (human owners needed)

All §16 product decisions are accepted; these two require a person, not a choice, and
**gate the start of collection/build:**

1. **Legal / compliance read on sourcing (hard gate).** Confirm the official-roster
   collection approach (and any licensed-provider eval) is compliant — ToS/`robots.txt`,
   rate-limiting, provenance, no player PII published (§13). *Build of the collection
   pipeline should not scale until this clears.* — **Owner: TBD**
2. **Named data/refresh owner.** The person accountable for the preseason refresh and the
   review-before-publish step (§10, §16.9). — **Owner: TBD**

---

*This spec is intentionally exhaustive on intricacies (methodology, denominators, PII,
sourcing, provenance, export self-description) because those details — not the table UI —
are what make the tracker credible and defensible. **Status: v1 fully specified
(2026-06-04); §18 human action items outstanding before build.***
