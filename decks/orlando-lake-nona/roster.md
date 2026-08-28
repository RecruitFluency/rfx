# Orlando Soccer School — Lake Nona · deck roster

What each athlete slide in `deck.source.html` claims, and how it lines up with
the RFX app. Update this table whenever the deck is re-cut so the aggregate
slides (02 Totals, 15 Views Convert, 16 Every Level, 18 Closing CTA) can be
recomputed from one place.

The app's "Interest" column is the thumbs-up count on the athlete's coach
review list — not the number of coaches who looked. That thumbs-up count is
what the slides call "interested programs". A thumbs-down is a coach who
reviewed the profile and passed, and must never appear as a spotlight program.

## Athlete slides

| Slide | Athlete | Class | Position | Interests | Views | D1 | D2 | D3 | NAIA | JUCO | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 06 | Anthony Allotta | 2027 | Winger (RW/LW) | 36 | — | 2 | 1 | 21 | 4 | 8 | deck snapshot |
| 07 | Levi Hunt | 2027 | Center back | 23 | 4,240 | 3 | — | 11 | 4 | 5 | deck snapshot |
| 08 | Riley Duncan | 2027 | Center back | 30 | 2,403 | 1 | 1 | 20 | 1 | 7 | verified, 39 rows |
| 09 | Sam Bassin | 2027 | Right fullback | 18 | 1,490 | 2 | — | 13 | — | 3 | verified, 21 rows |
| 10 | Jax Leon Juliao | 2027 | Striker | 8 | 1,084 | 2 | 1 | 5 | — | — | deck snapshot |
| 11 | Jose Brito | 2027 | Right fullback | 7 | 4,132 | — | 1 | 3 | 1 | 2 | deck snapshot — stale |
| 12 | Eduardo Marquez Cerezo | 2028 | Striker | 6 | 1,734 | 2 | — | 4 | — | — | verified, 7 rows |
| 13 | Elijah Lee Reed | 2027 | — | 6 | 1,570 | 1 | — | 3 | — | 2 | verified, 15 rows |
| 14 | Daniel Lai | 2028 | — | 4 | 1,801 | 1 | — | 3 | — | — | verified, 8 rows |

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

## Still open

### Jose Brito — 2 of 11 interests unaccounted

His badge reads 11 likes / 16 dislikes across 27 rows. Filter views supplied
cover D3 (5 likes, 14 passes), D2 (2, 1) and JUCO (2, 1) — 9 likes and all 16
passes. The 2 missing rows are therefore both interests, in **D1 and/or NAIA**;
the D1 and NAIA filter views are needed to place them.

His slide also still carries "Carroll College · NAIA" from the old snapshot,
which no supplied filter view confirms — the same shape of error as Eduardo's
West Chester chip. His slide is left untouched until the NAIA view settles it.

### Anthony Allotta — no current data

Absent from the roster view that was captured, so his current interests and
views are unknown. His slide still holds deck-snapshot figures.

## Aggregate slides

Not yet updated — they still read 126 interests, 17,970 views and seven
athletes. With Anthony held at his snapshot 36, the roster totals **142
interests across 9 athletes**:

| | D1 | D2 | D3 | NAIA | JUCO | Total |
|---|---|---|---|---|---|---|
| Determined | 14 | 5 | 85 | 9 | 27 | 140 |
| Jose's unplaced 2 | ? | — | — | ? | — | 2 |
| **Total** | **14–16** | **5** | **85** | **9–11** | **27** | **142** |

Views for the eight athletes with current figures sum to 18,493; the total
needs Anthony's number.

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
