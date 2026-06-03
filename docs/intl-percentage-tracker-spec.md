# D1 International Percentage Tracker — Product & Feature Specification

> **Status:** Draft spec (pre-build). Purpose of this document is to enumerate every
> feature, intricacy, edge case, and decision *before* implementation so we build the
> right thing once.
> **Owner:** RFX (RecruitFluency)
> **Last updated:** 2026-06-03

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

### Decisions to confirm (see §16 open questions)
- Men's first, then Women's — or both at launch?
- How many seasons of history at launch (snapshot vs. 2-yr trend vs. 3–5 yr trend)?

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
- **Position-aware view (stretch):** intl % within each position group per program —
  this is the single most valuable cut for a family (a striker cares about FWD intl %,
  not roster-wide %).

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

### 6.5 Versioning & corrections
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
- Position-group intl % (stretch, see §5).
- Confidence threshold (default hides low-confidence; toggle to show all w/ badge).

### 8.3 Program detail
- Big number: current **Intl %** and **Domestic %** with roster size + unknown count.
- **Trend chart** across available seasons.
- Position-group breakdown (stretch).
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

### 8.5 Trust & transparency surfaces (non-negotiable)
- Always-visible **"data as of" date** and **methodology** link.
- Per-number provenance (source URL, confidence).
- "Report a correction" affordance.

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
- **Data as a static, versioned artifact** (JSON in `public/` or a hosted CDN file)
  consumed client-side → no server needed for MVP. Table/filter/sort done client-side.
- Charting: lightweight lib compatible with the stack (e.g. Recharts/visx) or
  hand-rolled SVG sparklines to avoid heavy deps — **decision in §16.**
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

**MVP (v1)**
- D1 soccer (gender per §16), current-season snapshot **+ at least one prior season for
  trend**, browse/filter/sort table, program detail, CSV + branded PDF export, email
  gate on download, in-product methodology + glossary, source/provenance, corrections
  link.

**v1.1**
- Position-group intl % • "movers" report • conference & national rollups • compare view
  • histogram/leaderboards.

**v2+**
- Deeper history (3–5 seasons) • email alerts on changes • D2/D3/NAIA expansion •
  other sports • map view • optional paid tier • API.

---

## 16. Open questions / decisions needed before build

1. **Gender at launch:** Men's only first (highest international intensity, clearest
   story) or Men's + Women's together?
2. **History depth at launch:** snapshot-only, 2-season trend, or 3–5 season trend?
   (Drives data-collection effort the most.)
3. **Gating:** is *browsing* open with *download* email-gated, or is the whole tool
   behind an email gate?
4. **Default sort/framing:** rank by lowest intl %, or by *most-improving domestic
   trend*? (Recommend the trend framing — it's the differentiated story.)
5. **Denominator:** confirm "% of resolved players, unknowns shown separately" (§6.3).
6. **Data source:** official-roster scraping vs. a licensed roster-data provider — and
   the compliance posture for either.
7. **Charting dependency:** add a chart lib (Recharts/visx) or keep zero-dep hand-rolled
   SVG?
8. **Where the data artifact lives:** committed in `public/`, or hosted on a CDN/endpoint
   the static app fetches?
9. **Refresh ownership & cadence:** who runs the seasonal refresh, and how is a new
   snapshot reviewed/approved before publish?
10. **Territories & dual-national edge rules:** confirm the §6.1 defaults.

---

## 17. Success metrics
- **Distribution:** downloads, PDF shares, inbound links/press (it's "data nobody
  published").
- **Conversion:** email signups from the gate → entries into RFX core funnel.
- **Trust:** correction volume trending down; source/methodology engagement.
- **Engagement:** filter usage, compare usage, return visits around refresh windows.

---

*This spec is intentionally exhaustive on intricacies (methodology, denominators, PII,
sourcing, provenance, export self-description) because those details — not the table UI —
are what make the tracker credible and defensible. Resolve §16 before implementation.*
