# Orlando Soccer School — Lake Nona · deck roster

What each athlete slide in `deck.source.html` claims, and how it lines up with
the RFX app. Update this table whenever the deck is re-cut so the aggregate
slides (02 Totals, 19 Every View, 20 Every Level, 26 Closing CTA footer) can
be recomputed from one place.

**Read the two columns carefully — conflating them caused a real error.**
*Views* is the number of college coaches who reviewed the athlete's profile
(Riley: 2,403). The athlete's coach review list holds only the coaches who
gave an explicit answer (Riley: 39 rows, 30 up / 9 down); every other coach
who reviewed and did not respond counts as not interested. So the review-row
count is NOT "how many coaches saw him" — it is how many replied.

The app's "Interest" column is the thumbs-up count on the athlete's coach
review list — not the number of coaches who looked. That thumbs-up count is
what the slides call "interested programs". A thumbs-down is a coach who
reviewed the profile and passed, and must never appear as a spotlight program.

## Athlete slides

| Slide | Athlete | Class | Position | Interests | Views | D1 | D2 | D3 | NAIA | JUCO | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | Anthony Allotta | 2027 | Winger (RW/LW) | 36 | — | 2 | 1 | 21 | 4 | 8 | deck snapshot |
| 11 | Levi Hunt | 2027 | Center back | 23 | 4,240 | 3 | — | 11 | 4 | 5 | deck snapshot |
| 12 | Riley Duncan | 2027 | Center back | 30 | 2,403 | 1 | 1 | 20 | 1 | 7 | verified, 39 rows |
| 13 | Sam Bassin | 2027 | Right fullback | 18 | 1,490 | 2 | — | 13 | — | 3 | verified, 21 rows |
| 14 | Jax Leon Juliao | 2027 | Striker | 8 | 1,084 | 2 | 1 | 5 | — | — | deck snapshot |
| 15 | Jose Brito | 2027 | Right fullback | 9 | 4,132 | — | 2 | 5 | — | 2 | filter views, 9 of 11 placed |
| 16 | Eduardo Marquez Cerezo | 2028 | Striker | 6 | 1,734 | 2 | — | 4 | — | — | verified, 7 rows |
| 17 | Elijah Lee Reed | 2027 | — | 6 | 1,570 | 1 | — | 3 | — | 2 | verified, 15 rows |
| 18 | Daniel Lai | 2028 | — | 4 | 1,801 | 1 | — | 3 | — | — | verified, 8 rows |
| | | | **Totals** | **140** | **18,454** | **14** | **5** | **85** | **9** | **27** | 9 athletes |

Every row's division figures sum to that row's interest count, and the column
sums are what the aggregate slides publish. `bundle.py` does not check this —
re-run the audit in "Verifying" below after any change to an athlete slide.

Riley Duncan's funnel was already correct — his live rows reproduce it exactly.

Elijah and Daniel have no position on their slides because neither the club
roster nor the coach review list carries one. Their eyebrow reads class year
alone, which the Sam Bassin slide already does.

### Corrections made against live data

- **Sam Bassin** — 17 → 18 interests, 1,488 → 1,490 views, merged "D3+ 15" bar
  split into D3 13 / JUCO 3.
- **Eduardo Marquez Cerezo** — 5 → 6 interests. His D2 bar was wrong: the only
  D2 coach on his list, West Chester, **passed**, and was being shown as a
  spotlight program. Removed; the funnel is D1 2 / D3 4 with no D2.
- **Jose Brito** — 7 → 9 interests, funnel rebuilt from the filter views as
  D2 2 / D3 5 / JUCO 2. His NAIA bar and the "Carroll College · NAIA" spotlight
  chip were **removed**: no supplied filter view shows an NAIA row at all, the
  same shape of error as Eduardo's West Chester chip.
- **Aggregate slides** — 126 → 140 interests, 17,970+ → 18,454+ views,
  seven → nine athletes, D1 12 → 14, D3 77 → 85, NAIA 10 → 9, JUCO 22 → 27.

## Still open

### Jose Brito — 2 of 11 interests unplaced

His badge reads 11 likes / 16 dislikes across 27 rows. The supplied filter views
cover D3 (5 likes, 14 passes), D2 (2, 1) and JUCO (2, 1) — 9 likes and all 16
passes. The 2 missing rows are therefore both interests, in **D1 and/or NAIA**;
the D1 and NAIA filter views are needed to place them.

His slide shows the 9 that are placed. That is the safe direction: the deck
understates him by 2 rather than claiming a division he may not have. Wingate
(D2) and Houghton (D3) are kept as spotlight chips — both sit inside a division
the filter views confirm — but the program names themselves still come from the
deck snapshot and are not independently verified.

### Anthony Allotta — no current view count

Absent from the roster view that was captured, so his profile views are unknown
and his 36 interests remain the deck-snapshot figure. The roster view total is
therefore a floor, which is why the deck publishes **18,454+** rather than a
flat number.

## Aggregate slides

Updated and self-consistent. Every athlete slide's funnel bars sum to its stated
interest count, and those columns sum to what these four slides publish (slide numbers current as of the 28-slide cut):

| Slide | Reads |
|---|---|
| 02 Totals | 18,454+ views · 140 combined program interests · 9 athletes |
| 19 Every View Is An Answer | 18,454+ · 140 · 14 Division I |
| 20 Every Level | D1 14 · D2 5 · D3 85 · NAIA 9 · JUCO 27, subhead 140 |
| 26 Closing CTA footer | 18,454+ views · 140 program interests |

The deck total and the true roster total differ by Jose's two unplaced rows:

| | D1 | D2 | D3 | NAIA | JUCO | Total |
|---|---|---|---|---|---|---|
| **Published in the deck** | **14** | **5** | **85** | **9** | **27** | **140** |
| Jose's unplaced 2 (not shown) | ? | — | — | ? | — | 2 |
| True roster total | 14–16 | 5 | 85 | 9–11 | 27 | 142 |

Views for the eight athletes with current figures sum to **18,454**
(4,240 + 2,403 + 1,490 + 1,084 + 4,132 + 1,734 + 1,570 + 1,801). An earlier
revision of this file recorded 18,493; that was an addition error, now fixed.
Anthony's views are still missing, so 18,454 is a floor and the deck says "+".

## Verifying

After any change to an athlete slide, re-run the reconciliation — it parses the
funnel bars straight out of the markup and checks them against each slide's
stated interest count and against the aggregate slides:

```python
import re
body = open('deck.source.html').read().split('</helmet>', 1)[1]
BAR = re.compile(r'width:64px;[^"]*">(D1|D2|D3|NAIA|JUCO)</span>.*?width:40px;[^"]*">(\d+)</span>', re.S)
INT = re.compile(r'>(\d[\d,]*)</div>\s*<div class="kick"[^>]*>Interested programs</div>')
tot = {}
for sec in re.split(r'(?=<section )', body):
    m = re.search(r'data-screen-label="(\d\d)[^"]*"', sec)
    if not m or not 10 <= int(m.group(1)) <= 18: continue
    bars = [(k, int(v)) for k, v in BAR.findall(sec)]
    stated = int(INT.search(sec).group(1).replace(',', ''))
    assert stated == sum(v for _, v in bars), (m.group(1), stated, bars)
    for k, v in bars: tot[k] = tot.get(k, 0) + v
print(tot, sum(tot.values()))   # expect D1 14 D2 5 D3 85 NAIA 9 JUCO 27, 140
```

This is the check that caught the stray `15` left behind when Sam Bassin's
merged bar was split, so it earns its keep.

## Slide 21 Committed — a different scope, deliberately

The nine athletes above are this club's roster. Slide 21 publishes a
**company-wide** figure and must never be blended with them:

| Figure | Source |
|---|---|
| 76 athletes committed, under 365 days | `gorfx.app` — "See all 76 committed athletes", "Under 365 Days" |
| Catelyn De Moor · Baylor (D1) | commitment graphic on `gorfx.app` |
| Kruz Held · Portland (D1) | commitment graphic |
| Kamden Held · Wisconsin–Green Bay (D1) | commitment graphic |
| Nerlyn Munoz · Roosevelt (NAIA, national rank #10) | commitment graphic |
| Patrick Bohan · John Carroll (D3) | commitment graphic |

The division labels on the slide are the programmes' known NCAA/NAIA
classifications, not something the site states. The slide's footer says out
loud that these five are from across RFX rather than this club, because
conflating a company total with a club roster is the same error shape that
produced the Riley Duncan mistake.

The site also publishes 2,993 programmes indexed, 2,400+ families and 25+
average responses per athlete. **None of those are in the deck** — they are
site marketing copy with no counted source behind them here, and the deck's
standing rule is that every number on a client-facing slide traces to rows
somebody can show. The 76 is in because it is an outcome the graphics
corroborate; the rest stay out until they can be reconciled.

## Slides 07 and 08 — the two worked examples

Both slides used to be invented. They are now built from rows in this file.

**07 Match Brief — Levi Hunt to Lafayette College.**

The brief is built as **matched pairs**: a blue row for what the program needs,
a red row directly under it for what this athlete answers with. Four dimensions
— athletics, academics, location, culture.

The athlete is Levi rather than Riley because Levi makes the academics pair
real. He is a center back in the 2027 class with a **verified 4.0 GPA**, and
Lafayette is already a published spotlight interest on his own slide. Riley has
the 6'4" but no 4.0 — this deck's academics slide puts the two 4.0s on Anthony
and Levi, so pairing a 4.0 with Riley would have contradicted screen 22.

| Pair | Program side | Athlete side |
|---|---|---|
| Athletics | Two defenders graduate in May, 6'0" and 6'2" ([roster](https://goleopards.com/sports/mens-soccer/roster)) | Levi: center back, 2027 — **real** |
| Academics | Undergraduate-only, 2,775 students, 10:1; Patriot League academic standard | Levi: 4.0 GPA — **real** |
| Location | Easton PA; ~90 min from New York City, ~1,000 miles from Orlando | **Not yet his** — needs his stated region preference |
| Culture | Dennis Bohn, head coach since 2001 | **Not yet his** — needs what his club staff say about him |

Head coach confirmed as **Dennis Bohn** (in post since 2001), not "Bond".

**Two values would finish this slide** and both are in the app: Levi's stated
location preference, and one line from his club coach on how he plays. Until
they arrive, the red rows on Location and Culture describe what the brief does
rather than what Levi is — honest, but the weaker half of the slide, and the
speaker notes say to move through those two quickly.

Nothing about Levi's height is claimed: his slide does not carry one.

**08 Do It Yourself — Levi Hunt, and why a small sample cannot answer the question.**

The slide used to argue about hours. It now argues about **sample size**, which
is the stronger and more honest point.

| Figure | Source |
|---|---|
| 37½ hours | 50 programs × the slide's own 45 min |
| 4,240 reviewed / 23 said yes | Levi's row in the table above |
| D1 3 · D3 11 · NAIA 4 · JUCO 5 | Levi's funnel, sums to 23 |

The argument: fifty emails is a working week, and if nobody answers the family
has learned nothing. Even three replies — a no at D1, a yes at D2, a yes at D3 —
is three coaches speaking for three entire divisions, which cannot tell a family
what level to target. The shape of Levi's 23 across four levels can. That is
what the deck sells, and it is the same claim screen 20 makes.

The in-state Florida figure is retained as a run-sheet challenge-handler rather
than slide copy:

Sources for the 12: the [Sunshine State Conference men's soccer standings](https://sunshinestateconference.com/standings.aspx?path=msoc)
(Eckerd, Embry-Riddle, Florida Southern, Rollins, Lynn, Palm Beach Atlantic,
Florida Tech, Saint Leo, Tampa, Nova Southeastern, Barry) and the
[Wikipedia list of NCAA D2 men's soccer programmes](https://en.wikipedia.org/wiki/List_of_NCAA_Division_II_men%27s_soccer_programs),
which adds Flagler and agrees at 12. Edward Waters is a Florida D2 institution
but does not appear on the men's-soccer list, so it is excluded.

**The slide deliberately makes no claim about Florida Division III.** Research
suggested there is little or no D3 men's soccer in the state, but it could not
be established to the standard the rest of this deck holds, so the argument
rests on the D2 count alone — which is stronger anyway, because "none of his 23
is on that list" is true without needing the D3 claim at all.

## Slide 23 App Store proof — which reviews, and why

Three complete App Store reviews were on this slide. The **Director of Coaching
review (EHORT1986, 12 Jul 2025) was removed**: it describes running RFX
club-wide, which is the job of the people being presented to, not the parents
being sold to. Quoting a director's testimonial at a room that *is* the club
argues the wrong case.

The two that remain are the right voices for a parent audience:

| Reviewer | Why it stays |
|---|---|
| Joel Willard Recruiting, 8 Oct 2025 | A father counting 19 coach emails in the first six hours, offering receipts. This is the load-bearing one — screen 05 promises results at 6/24/48 hours, and until this review that promise was ours alone |
| CJ_357, 15 Apr 2025 | An athlete in an athlete's words |

The 4.9 and the "21 ratings" are stated plainly rather than rounded away. If
more reviews are supplied, the third slot is free and the layout takes a third
card without change.

## Slide 25 Why Tonight — where its claims come from

The urgency slide makes three factual claims beyond the roster. All are
checkable; none is scarcity we invented.

| Claim | Source |
|---|---|
| 121 of the roster's 140 interests are D3 / NAIA / JUCO | This file: 85 + 9 + 27 = 121, from the reconciliation below |
| D1 and D2 staff may contact an athlete directly from 15 June after sophomore year | [NCSA men's soccer calendar](https://www.ncsasports.org/mens-soccer/recruiting-rules-calendar), [SportsRecruits contact periods](https://sportsrecruits.com/resources/contacting-college-coaches/ncaa-contact-periods) |
| D3, NAIA and JUCO carry no such contact restriction | same two sources |

The class-year framing is a function of the presentation date: on 30 August
2026 the class of 2027 are seniors, 2028 juniors, 2029 sophomores. **If this
deck is ever presented in a later school year, that slide is wrong and has to
be shifted a year.** It is the only slide in the deck whose accuracy depends on
when it is shown.

The slide deliberately promises cycles rather than places: "We cannot promise
anybody a place. We can promise the cycles." No seat limits, no deadlines, no
"only N spots" — the calendar pressure is real on its own and inventing more
would put the one unfalsifiable claim in a deck built on countable rows.

## Slides 26 and 28 — the store QR codes

Both ask slides carry two QR codes, generated with `segno` at error level H
from the URLs published on `gorfx.app`:

- App Store — `https://apps.apple.com/us/app/rfx-soccer-recruit/id6739776891`
- Google Play — `https://play.google.com/store/apps/details?id=com.recruitfluency.rfx.rfx`

They render at 168px (slide 26) and 124px (slide 28) on the 1920 canvas, on a
white plate with a quiet zone — a QR on the deck's near-black ground will not
scan. Both were verified by screenshotting the `<img>` elements out of the
built deck at 2x and decoding them with OpenCV; all four decode to the intended
store URL. Re-run that check if the codes are ever regenerated.

## Notes

- Elijah is the only athlete carrying the "Orlando City Lake Nona" club label
  while the deck is branded "Orlando Soccer School — Lake Nona".
- Levi Hunt's slide reads "Class of 2027"; the app lists him as 2028.

## Distribution history

Coach decisions cluster into distinct sends rather than arriving steadily, and
the sends are per athlete, not roster-wide. For the athletes whose rows are
fully captured:

| Athlete | Send 1 | Reviewed | Interested | Send 2 | Reviewed | Interested | Running total |
|---|---|---|---|---|---|---|---|
| Riley Duncan | 27 Jan – 12 Feb 2026 | 30 | 25 | 27 – 30 Apr 2026 | 8 | 4 | 29, then 30 with one June add |
| Sam Bassin | 3 – 23 Mar 2026 | 19 | 16 | 29 Jun / 27 Jul 2026 | 2 | 2 | 18 |

Riley's second send converted at 50% against 83% on the first — the expected
shape, the first pass taking the readiest coaches. It still produced his only
D1 interest (Lafayette, 29 Apr).

Elijah Lee Reed (Aug 2026), Daniel Lai (Jul – Aug 2026) and Eduardo Marquez
Cerezo (Jun – Aug 2026) have been out once each, so they have no second send to
compare against yet.
