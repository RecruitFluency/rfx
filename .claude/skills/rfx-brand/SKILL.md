---
name: rfx-brand
description: Apply the RFX visual identity — dark ground, red accent, condensed heavy uppercase Roboto — to any slide deck, landing page, one-pager, report, social graphic or app screen. Use whenever the user asks for something "in RFX branding", "on brand", "like the deck", or for any RFX-facing design where the look should match the recruiting platform. Contains the exact tokens, type scale and component recipes taken from the Lake Nona deck.
---

# RFX brand

The identity is deliberately narrow: **near-black ground, one red, white type, Roboto pushed
to its condensed and heavy extremes.** No second brand colour, no gradients as decoration, no
rounded friendliness. It should read like a piece of sports broadcast furniture — dense,
confident, factual.

## Scope — RFX only

This is the RFX platform identity. It is **not** a club identity.

Decks built for a specific club carry that club's colours in the sections about their
athletes — the Lake Nona deck, for example, switches whole sections to purple and gold
(`--bg:#160A2E`, `--accent:#F1D282`) because those are Orlando City's colours, not RFX's.
Never carry purple or gold into RFX work. If a piece needs club colours, override
`--accent`, `--accent-soft`, `--accent-border`, `--bg`, `--surface` and `--surface2` on that
section only, and let the red base stand everywhere else.

## Tokens

Drop this in as-is. Every recipe below depends on it.

```css
:root {
  /* Ground — three steps, all near-black. Never a mid grey. */
  --bg: #0B0B0D;          /* page */
  --surface: #141416;     /* card on page */
  --surface2: #1C1C1F;    /* inset inside a card: track, plate, well */

  /* The one accent */
  --accent: #E81C2E;
  --accent-soft: rgba(232,28,46,0.14);    /* fills */
  --accent-border: rgba(232,28,46,0.40);  /* hairlines */
  --bar-2: #C4172A;                       /* the darker red, for a second bar in a chart */
  --ghost: rgba(232,28,46,0.07);          /* oversized watermark marks */

  /* Type */
  --text: #FFFFFF;
  --text-2: #A8A8BC;   /* body copy, secondary labels */
  --text-3: #606074;   /* kickers, captions, the quiet half of a pair */

  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.16);

  --font: 'Roboto', system-ui, sans-serif;
  --cond: 75%;    /* font-stretch for display and labels */
  --semi: 87.5%;  /* font-stretch for headings and big numerals */

  /* Type scale — sized for a 1920×1080 canvas; scale down for web */
  --t-display: 132px; --t-hero: 92px; --t-h1: 66px; --t-h2: 44px; --t-h3: 30px;
  --t-stat: 104px; --t-body: 26px; --t-sm: 21px; --t-label: 17px; --t-meta: 19px;

  --px: 120px; --py: 84px;  /* page margins */
}
```

**Roboto must be the variable font, self-hosted.** The whole identity rests on `font-stretch`,
and a static Roboto cannot do it. `assets/roboto-variable.ttf` in this skill folder is the file —
weight 100–900, width 75–100 — and this is the declaration that is known to work, taken from the
deck:

```css
@font-face {
  font-family: 'Roboto';
  src: url("assets/roboto-variable.ttf") format('truetype');
  font-weight: 100 900;
  font-stretch: 75% 125%;
  font-style: normal;
  font-display: swap;
}
```

Do not swap in a Google Fonts `<link>` without testing it. The obvious CSS2 URLs for the width
axis could not be confirmed to deliver a working `wdth` axis, so treat that route as unverified;
self-hosting is the known-good path.

**Check it, every time.** If `font-stretch` silently fails you get plain wide Roboto on black,
which looks like nothing. One line in the console settles it — the first number must be visibly
smaller than the second:

```js
['75%','100%'].map(w => { const s=document.createElement('span');
  s.style.cssText=`font:900 100px Roboto;font-stretch:${w};position:absolute;white-space:nowrap`;
  s.textContent='COACHES'; document.body.append(s);
  const x=Math.round(s.getBoundingClientRect().width); s.remove(); return x; })
// deck renders [398, 455]; two equal numbers mean the axis is not loading
```

## Type

Four roles, and almost nothing else.

```css
.display { font-weight: 900; font-stretch: var(--cond); text-transform: uppercase;
           line-height: 0.86; letter-spacing: -0.01em; }
.h1      { font-size: var(--t-h1); font-weight: 800; font-stretch: var(--semi);
           text-transform: uppercase; line-height: 0.98; letter-spacing: -0.01em; }
.lbl     { font-size: var(--t-label); font-weight: 700; font-stretch: var(--cond);
           text-transform: uppercase; letter-spacing: 0.16em; color: var(--accent); }
.kick    { font-size: var(--t-label); font-weight: 700; font-stretch: var(--cond);
           text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-3); }
.body    { font-size: var(--t-body); font-weight: 400; line-height: 1.5; color: var(--text-2); }
```

- **`.display`** is the headline voice: enormous, condensed, black weight, uppercase, set
  tight at 0.86 line-height so multiple lines lock into a block. Break it across `<span
  style="display:block">` lines and colour **one** line `var(--accent)` — that single red line
  is the strongest move in the system. Never colour two.
- **`.lbl` and `.kick`** are the same widely-tracked uppercase micro-type, red for the eyebrow
  above a headline, `--text-3` for a caption or the right-hand end of a header row. Pairing one
  of each across a row — red label left, grey kicker right — is the standard section header.
- **Body copy is `--text-2`, never white.** White is reserved for headlines and for the
  numeral in a stat.
- **Numerals are the loudest thing on the page**: `font-size: var(--t-stat)`, `font-weight: 900`,
  `font-stretch: var(--semi)`, `line-height: 0.9`. A qualifier inside a number ("1 / 219") drops
  to a third the size in `--text-3`.

## Components

**Card** — a panel on the page.
```html
<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:32px 28px;">
```
Radius stays 6–8px on small things, 18px on a full-bleed hero panel. Never a pill except for
chips and buttons.

**Stat tile** — the workhorse. Numeral, then a kicker beneath it.
```html
<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:32px 28px;">
  <div style="font-size:76px;font-weight:900;font-stretch:var(--semi);color:var(--accent);line-height:0.9;">36</div>
  <div class="kick" style="margin-top:12px;color:var(--text-2);">Interested programs</div>
</div>
```
In a row of tiles, colour **one** numeral `--accent` and leave the rest white. The red one is
the number you want remembered.

**Bar row** — a labelled horizontal bar, for any distribution.
```html
<div style="display:flex;align-items:center;gap:20px;">
  <span style="width:64px;font-weight:800;font-stretch:var(--semi);">D1</span>
  <div style="flex:1;height:26px;background:var(--surface2);border-radius:4px;">
    <div style="width:42%;height:100%;background:var(--accent);border-radius:4px;"></div>
  </div>
  <span style="width:40px;font-weight:800;color:var(--accent);">14</span>
</div>
```
The track is always `--surface2` — that same rounded inset shape is the system's second
signature after the red line, and it is what any inset element should borrow.

**Chip** — a named thing in a set.
```html
<!-- emphasis -->
<span style="background:var(--accent-soft);border:1px solid var(--accent-border);border-radius:6px;
             padding:10px 18px;font-size:var(--t-sm);font-weight:700;">Lafayette College · D1</span>
<!-- default -->
<span style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;
             padding:10px 18px;font-size:var(--t-sm);font-weight:700;color:var(--text-2);">NYU · D3</span>
```

**Status pill** — small, outlined, tracked-out, for a state rather than a name.
```html
<span class="kick" style="font-size:11px;color:var(--accent);border:1px solid var(--accent-border);
      border-radius:3px;padding:3px 8px;letter-spacing:0.14em;">In build · live November</span>
```

**Primary button** — solid `--accent`, white text, 700 weight, uppercase. Secondary is the
same geometry with a `--border-strong` outline and no fill.

**Watermark** — an oversized mark bled off the right edge at `opacity:0.09`, behind the
content, `aria-hidden`. Adds depth without adding a colour.

## Logo

`assets/rfx-mark.png` in this skill folder is the RFX mark: **white on transparent, for dark
grounds only.** It will vanish on white — if a piece needs a light ground, ask for the dark
version rather than recolouring this one.

The lockup is the mark beside the wordmark, the wordmark set as display type:
```html
<div style="display:flex;align-items:center;gap:26px;">
  <img src="assets/rfx-mark.png" alt="RFX" style="width:104px;height:104px;object-fit:contain;">
  <div style="display:flex;flex-direction:column;gap:6px;">
    <span style="font-size:76px;font-weight:900;font-stretch:var(--cond);letter-spacing:-0.01em;line-height:0.85;">RFX</span>
    <span class="lbl" style="font-size:20px;">Recruiting platform</span>
  </div>
</div>
```
On a page that belongs to somebody else — a club's deck, a co-branded page — RFX appears
instead as a quiet corner credit: the mark at 30px beside `POWERED BY RFX` in `.kick` style at
`--text-2`, `opacity:0.92`, top right.

## Motion

One gesture, used everywhere: rise and fade, staggered down the page.

```css
@media (prefers-reduced-motion: no-preference) {
  .fade { animation: fu 0.55s cubic-bezier(.22,1,.36,1) both; }
  .a1 { animation-delay: .06s } .a2 { animation-delay: .14s } .a3 { animation-delay: .22s }
  .a4 { animation-delay: .30s } .a5 { animation-delay: .38s } .a6 { animation-delay: .46s }
}
@keyframes fu { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
```
Elements get `class="fade a1"`, `a2`, `a3` in reading order. Nothing else moves — no parallax,
no hover lifts, no looping animation.

## Getting it wrong

The failure mode is a dark page that looks like every other dark page. It happens when:

- **`font-stretch` isn't applied**, or the static Roboto is loaded. Condensed heavy uppercase is
  the identity; without it this is just Roboto on black. Run the check above — it is the single
  most common way this comes out looking generic.
- **Red is used for more than one thing per view.** One red headline line, or one red numeral, or
  one red button — pick one. Red spread across a page stops meaning anything.
- **Body copy is set white.** It flattens the hierarchy; `--text-2` is what makes the headline read.
- **Greys creep toward mid.** The ground is near-black at every level; `#2A2A2E` already looks wrong.
- **The type is too small.** The scale is aggressive on purpose — a stat at 104px, a headline at
  132px. Timid sizing reads as a generic dashboard.

## Adapting the scale

The numbers above are for a 1920×1080 slide. For web or print, keep every ratio and divide the
type scale by roughly 2 (`--t-display: 64px`, `--t-stat: 52px`, `--t-body: 17px`, `--px: 48px`).
Colours, weights, `font-stretch`, tracking and radii never change.
