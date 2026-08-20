# RFX Landing Page — Master Design Specification

**Reference:** uploaded full-page mockup (sports SaaS college athletic recruitment platform, dark mode, multi-layer parallax).
**Purpose:** deconstruct the reference completely — visual language, typography, color, parallax layer architecture, and the PNG asset inventory — before any rebuild code is written.

---

## 1. Design DNA — the perspective behind the page

This page is built on **movement**. Everything in the reference communicates velocity and athletic dynamics, even at rest:

1. **Diagonal energy.** The hero's red light streak cuts the frame at roughly 30–35°, mirroring a sprint vector. Nothing sits on a lazy horizontal — light, glow, and gradient all travel corner-to-corner.
2. **Depth = speed.** The parallax model is a broadcast-camera metaphor: a slow, distant stadium (grid + light wash) behind a fast, near subject (athlete + floating data cards). Foreground moves faster than the scroll; background moves slower. The eye reads this as motion even in a static screenshot.
3. **Stadium-at-night contrast.** Jet black is the stadium bowl; matte white is the floodlit content; electric red is the broadcast graphic package. Red is *rationed* — it never exceeds ~10% of any viewport, which is exactly why it reads as electric.
4. **Data as decoration.** Metric cards, speed graphs, and video modules aren't just features — they float as foreground objects, treating athlete data the way a sports broadcast treats stat overlays.
5. **Matte, not glossy.** Whites are slightly dimmed (#F5F5F3-range), blacks are near-black with visible grain, glows are diffuse. Premium dark-mode restraint, not neon cyberpunk.

---

## 2. Color system

### 2.1 Core tokens

| Token | Value | Usage |
|---|---|---|
| `--ink-0` | `#050505` | Page base (jet black, hero + footer) |
| `--ink-1` | `#0A0A0B` | Section alternation base |
| `--ink-2` | `#101012` | Card / surface fill |
| `--ink-3` | `#16161A` | Elevated surface (dashboard chrome, inputs) |
| `--paper-0` | `#F5F5F3` | Primary headline white (matte — never `#FFF`) |
| `--paper-1` | `#C9C9CE` | Body copy |
| `--paper-2` | `#8A8A93` | Secondary copy, captions, footer links |
| `--paper-3` | `#5A5A63` | Muted labels, disabled |
| `--red-500` | `#E5192C` | Primary CTA fill, active accents |
| `--red-400` | `#FF2E3F` | Hover state, glow cores, chart lines |
| `--red-700` | `#8F0E1B` | Gradient tails, pressed state |
| `--red-900` | `#3D060C` | Deep gradient falloff into black |
| `--cobalt-500` | `#3D5AFE` | Secondary glow (club/white-label section only) |

### 2.2 Alpha / line tokens

| Token | Value | Usage |
|---|---|---|
| `--line-1` | `rgba(245,245,243,0.08)` | Default card borders, dividers |
| `--line-2` | `rgba(245,245,243,0.14)` | Hover borders, chips |
| `--line-red` | `rgba(229,25,44,0.35)` | Red accent borders (featured cards, active chips) |
| `--grid-line` | `rgba(245,245,243,0.05)` | Background digital grid strokes |
| `--glow-red` | `rgba(255,46,63,0.22)` | Box-shadow glow on CTAs / featured cards |

### 2.3 Gradients

| Name | Definition | Where |
|---|---|---|
| Hero light wash | `linear-gradient(215deg, #FF2E3F 0%, #8F0E1B 34%, transparent 62%)` | Behind hero athlete, top-right origin |
| Featured card | `linear-gradient(140deg, #E5192C 0%, #8F0E1B 55%, #1A0407 100%)` | Bento highlight card, premium pricing tier, app-banner |
| Section vignette | `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(229,25,44,0.10), transparent 70%)` | Top of red-accented sections |
| Club glow | `radial-gradient(closest-side, rgba(61,90,254,0.25), transparent)` + red twin | Behind the 3 club-value cards |
| Fade-to-black | every image/screenshot gets a `linear-gradient(180deg, transparent 60%, #050505 100%)` mask | Seamless screenshot-to-background blends |

**Rule:** red gradients always terminate in black, never in another hue. That is what keeps the palette "jet black accented with red" instead of "red-themed."

---

## 3. Typography

### 3.1 Families

| Role | Family | Fallback stack | Why |
|---|---|---|---|
| Display / headlines | **Space Grotesk** (600, 500) | `'Space Grotesk', 'Inter Tight', system-ui, sans-serif` | Squared terminals + slightly condensed width = engineered, athletic voice matching the reference's grotesque headline face |
| Body / UI | **Inter** (400, 500, 600) | `'Inter', system-ui, sans-serif` | Neutral matte body face; matches the mockup's UI copy |
| Data / eyebrow labels | **IBM Plex Mono** (500) | `'IBM Plex Mono', ui-monospace, monospace` | Stat overlays and section eyebrows read as telemetry |

Both display and body load from Google Fonts; subset `latin`; `font-display: swap`.

### 3.2 Scale (desktop, 1440 frame)

| Style | Size / line-height | Weight | Tracking | Case |
|---|---|---|---|---|
| `display-xl` (hero H1) | 72 / 1.02 | 600 | −0.03em | Sentence |
| `display-lg` (section H2) | 56 / 1.05 | 600 | −0.025em | Sentence |
| `display-md` (banner H2, split H3) | 40 / 1.1 | 600 | −0.02em | Sentence |
| `heading-sm` (card titles) | 20 / 1.3 | 600 (Inter) | −0.01em | Sentence |
| `body-lg` (hero sub, section intro) | 18 / 1.6 | 400 | 0 | Sentence |
| `body-md` (card copy, FAQ) | 15 / 1.6 | 400 | 0 | Sentence |
| `eyebrow` (section tags) | 12 / 1 | 500 (Mono) | +0.14em | UPPERCASE |
| `stat-value` (metric cards) | 28 / 1 | 600 (Space Grotesk) | −0.02em | — |
| `caption` | 12 / 1.5 | 400 | +0.01em | Sentence |

### 3.3 Headline treatment rules

- Headlines are matte white with **one emphasized phrase** per headline — emphasized either in `--red-400` or as a stroke-only outline (`-webkit-text-stroke: 1px rgba(245,245,243,0.55); color: transparent`). Never both treatments in one headline.
- Max headline width: 14 words / ~640px. The reference keeps every H2 at 2 lines max.
- Eyebrow chips: mono uppercase inside a `--line-2` bordered pill, 6px dot in `--red-500` at left. Every section opens with one — it is the page's wayfinding system.

---

## 4. Parallax architecture — the layer stack

The scene is a 5-plane camera rig. Scroll speed is expressed as a multiplier of natural scroll (1.0 = moves with content; <1 = distant/slow; >1 = near/fast).

| Plane | Z | Content | Scroll speed | Extra motion |
|---|---|---|---|---|
| **L0 — Void** | furthest | `--ink-0` fill + film grain overlay | fixed | grain shifts 1–2px on a 8s loop (opacity 0.03) |
| **L1 — Grid** | far | faint matte-white digital grid (perspective grid in hero, flat 80px grid elsewhere) | 0.15× | none — stillness sells distance |
| **L2 — Stadium light** | mid-far | red volumetric light streaks + blurred glow orbs (the "abstract stadium lighting") | 0.3× | 6s breathing opacity 0.8→1.0 |
| **L3 — Content** | base | all sections, copy, screenshots | 1.0× | scroll-reveal (see §6) |
| **L4 — Floating cards** | near | athlete metric cards, speed graph, video player module, chips | 1.15–1.3× | mouse-parallax ±12px, hover lift+tilt |

Additional depth cue: the hero athlete cutout sits between L2 and L3 at **0.85×** with a subtle scale 1.0→1.06 over the first 600px of scroll — the subject "approaches the camera" as you scroll into the page.

**Implementation:** `framer-motion` `useScroll` + `useTransform` (already a dependency). Wrap each plane in a `will-change: transform` container; translate with `translate3d` only. Mouse parallax on L4 via a single `pointermove` listener on the hero, spring-smoothed (`stiffness: 60, damping: 20`). All parallax collapses to static under `prefers-reduced-motion: reduce`.

---

## 5. PNG / image asset inventory

Every parallax layer that isn't pure CSS is a transparent PNG (export twin WebP; PNG-24 with alpha as fallback). Naming: `public/parallax/<layer>-<name>@2x.png`.

### 5.1 Background planes (L1–L2)

| Asset | Size (@2x) | Format | Notes |
|---|---|---|---|
| `l1-grid-perspective` | 2880×1600 | SVG preferred, PNG fallback | Hero: one-point perspective floor grid, `--grid-line` strokes, horizon at 38% height, radial fade mask at edges |
| `l1-grid-flat` | 800×800 tile | SVG/CSS `background-image` | 80px square grid, tileable; used behind bento + pricing |
| `l2-lightwash-hero` | 2400×1800 | PNG-24 alpha | The diagonal red floodlight: large gaussian-blurred streak, 215° angle. Bake blur into asset (cheaper than CSS `filter: blur(120px)` on mobile GPUs) |
| `l2-glow-orb-red` | 1200×1200 | PNG-24 alpha | Radial red glow, reused at multiple scales (bento featured card, CTA banner, pricing premium) |
| `l2-glow-orb-cobalt` | 1200×1200 | PNG-24 alpha | Blue-violet twin for club/white-label section |
| `l2-stadium-beams` | 2400×1200 | PNG-24 alpha | 3–4 crossing light beams, 6–10% opacity, for mid-page section tops |
| `grain` | 512×512 tile | PNG-8 | Monochrome noise, 3% opacity overlay on L0 |

### 5.2 Subject & foreground planes (L4 + hero)

| Asset | Size (@2x) | Format | Notes |
|---|---|---|---|
| `hero-athlete-cutout` | ~1600×2000 | PNG-24 alpha | Background-removed athlete (red kit, mid-sprint or ball-carry pose, cropped at waist by hero edge). Rim-lit from top-right so the red light wash reads as the light source. Slight motion blur on trailing limb sells velocity |
| `l4-card-speed-graph` | 720×480 | Live DOM preferred; PNG only if static | Sprint-speed line chart, red line on `--ink-2`, mono axis labels |
| `l4-card-metrics` | 640×400 | Live DOM preferred | Athlete data metrics: top speed, distance, sprint count as stat tiles |
| `l4-card-video` | 760×460 | Live DOM preferred | Video player module: 16:9 thumb, red play button, scrub bar at 30% |
| `phone-highlight-reel` | 900×1800 | PNG (framed screenshot) | Phone mockup: "Assistance & Experts" + Highlight Reel card + red CTA |
| `phone-whitelabel` | 900×1800 | PNG | Phone with theme/color-picker UI (white-label section) |
| `dashboard-desktop` | 2600×1600 | PNG (framed) | Browser-chromed dark dashboard: sidebar, athlete profile "Liam Carter", stats table, red accent bars. Bottom 25% fades to `--ink-0` via CSS mask |
| `chat-screens-pair` | 2×(800×1700) | PNG | Two tall messaging screenshots, side-by-side, staggered vertically |
| `app-banner-phone` | 1000×1900 | PNG-24 alpha | Angled phone (−8° rotation) breaking the top edge of the red CTA banner |

**Foreground rule:** floating cards should be *live DOM* wherever possible (crisp at any DPI, animatable, theme-consistent); PNG is the fallback for anything photographic or pre-composed. The athlete cutout and light washes are always raster.

---

## 6. Motion system

| Behavior | Spec |
|---|---|
| Scroll reveal | `opacity 0→1`, `translateY 28px→0`, 650ms, `cubic-bezier(0.22, 1, 0.36, 1)` (decelerating — objects *arrive*, they don't drift) |
| Stagger | Siblings (bento cards, pricing tiers) cascade at 80ms intervals, order = reading order |
| CTA hover | 150ms: background `--red-500`→`--red-400`, glow shadow `0 0 24px var(--glow-red)` intensifies, `translateY(-1px)` |
| Card hover | border `--line-1`→`--line-2`, `translateY(-4px)`, 250ms; featured cards add glow intensify |
| L4 mouse parallax | ±12px, spring-smoothed; deeper cards move less (±6px) than nearer ones (±12px) |
| Number counters | Stat values count up over 900ms when entering viewport (once) |
| Accordion (FAQ/white-label) | height auto-animate 300ms, chevron rotate 180°, active question gains `--red-400` left rule |
| Reduced motion | All transforms/parallax off; opacity-only reveals at 200ms |

Easing voice: **fast attack, long decay** — the timing signature of athletic movement (explosive start, controlled finish). Never use ease-in-out symmetric easing on reveals.

---

## 7. Page anatomy (section-by-section, from the reference)

1. **Nav** — transparent over hero, blurs to `rgba(5,5,5,0.7)` + `--line-1` bottom border after 80px scroll. Logo left; "Login" ghost link + red "Get Started" pill right.
2. **Hero** — L1 perspective grid, L2 red light wash from top-right, athlete cutout right ~45% width, copy left: eyebrow chip, `display-xl` headline, `body-lg` sub, App Store + Google Play badges. L4 floating metric card + speed graph overlap the athlete's lower half.
3. **"Getting recruited has never been easier."** — centered `display-lg` + eyebrow; sets up the 3 alternating feature rows.
4. **Feature rows ×3** (profile builder / connect with coaches / turn connections into opportunities) — alternating text-left/media-right, media = phone mockups with floating chips; 96px vertical rhythm.
5. **"Unlock your full potential!"** — centered heading + red CTA; **bento grid 6 cards** (2 rows: featured red-gradient card double-width, then 4–5 standard `--ink-2` cards: Athletic Scholarships, Insights, Global Network, Personalized Dashboard, Feedback Loop). Icons: 1.5px stroke, `--paper-2`, red on hover.
6. **"Your digital roadmap"** — full-width `dashboard-desktop` screenshot, top edge glowing red, bottom fading to black.
7. **Chat pair** — two staggered tall screenshots, copy blocks alternating beside them.
8. **"Real results from real athletes"** — testimonial cards (avatar, name, role, quote) on `--ink-2`, 2–3 columns.
9. **App download banner** — full-bleed red-gradient rounded card (radius 24), "Take your game to new heights", store badges, angled phone breaking the card's top edge.
10. **White-label section** — "Power up your club's value proposition with white labelling": accordion left (Centralized Recruitment / Revenue / Custom Branded Platform), phone with color-picker right.
11. **"Your club, your platform, your success"** — 3 cards with cobalt+red glow orbs behind (only section where blue appears).
12. **Pricing** — "Affordable options for every athlete": monthly/yearly toggle; free tier ("Explore for free", dark), **Premium** (red gradient, elevated, "most popular"), Basic (dark). Feature checklists with red check icons.
13. **FAQ** — split layout: heading + support CTA left, accordion right.
14. **Final CTA** — "Take Your Club to New Heights": dark card with red/cobalt corner glows + dashboard screenshot cropped at right edge.
15. **Footer** — logo + one-line mission, 3–4 link columns, contact + socials, `--line-1` top rule, copyright bar in `--paper-3`.

Layout constants: content max-width **1200px**; section padding **120px** top/bottom (hero 160px top); card radius **16px**, bento featured & banners **24px**; grid gutter **24px**.

---

## 8. Build order (when we re-create)

1. Tokens → extend `tailwind.config.js` + `src/index.css` with §2/§3 (replace the current 4-variable set).
2. Fonts → Space Grotesk / Inter / IBM Plex Mono via Google Fonts in `index.html`.
3. Parallax primitives → `<ParallaxPlane speed={n}>` and `<Reveal>` wrappers on framer-motion.
4. Background assets → generate L1/L2 PNGs (§5.1) before any section work; hero is blocked without the light wash + grid.
5. Hero (full 5-plane stack proves the rig) → then sections in page order.
6. Reduced-motion + mobile pass (planes L1/L2 persist static on mobile; L4 cards dock into the flow below 768px).
