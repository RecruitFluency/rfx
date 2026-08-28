# Orlando Soccer School — Lake Nona · deck roster

What each athlete slide in `deck.source.html` claims, and how it lines up with
the RFX app. Update this table whenever the deck is re-cut so the aggregate
slides (02 Totals, 15 Views Convert, 16 Every Level) can be recomputed from one
place.

The app's "Interest" column is the thumbs-up count on the athlete's coach
review list — not the total number of coaches who looked. That thumbs-up count
is what the slides call "interested programs".

## Athlete slides

| Slide | Athlete | Class | Position | Interests | Views | D1 | D2 | D3 | NAIA | JUCO | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 06 | Anthony Allotta | 2027 | Winger (RW/LW) | 36 | — | 2 | 1 | 21 | 4 | 8 | deck snapshot |
| 07 | Levi Hunt | 2027 | Center back | 23 | 4,240 | 3 | — | 11 | 4 | 5 | deck snapshot |
| 08 | Riley Duncan | 2027 | Center back | 30 | 2,403 | 1 | 1 | 20 | 1 | 7 | verified, all 39 rows |
| 09 | Sam Bassin | 2027 | Right fullback | 18 | 1,490 | 2 | — | 13 | — | 3 | verified, all 21 rows |
| 10 | Jax Leon Juliao | 2027 | Striker | 8 | 1,084 | 2 | 1 | 5 | — | — | deck snapshot |
| 11 | Jose Brito | 2027 | Right fullback | 7 | 4,132 | — | 1 | 3 | 1 | 2 | deck snapshot — stale |
| 12 | Eduardo Marquez Cerezo | 2028 | Striker | 5 | 1,734 | 2 | 1 | 2 | — | — | deck snapshot — stale |
| 13 | Elijah Lee Reed | 2027 | — | 6 | 1,570 | 1 | — | 3 | — | 2 | verified, all 15 rows |
| 14 | Daniel Lai | 2028 | — | 4 | 1,801 | 1 | — | 3 | — | — | verified, all 8 rows |

Riley Duncan's funnel was already correct in the deck — his live rows reproduce
it exactly. Sam Bassin's was 17 with a merged "D3+ 15" bar; it is now 18 split
into D3 13 / JUCO 3.

Elijah and Daniel have no position on their slides because the club roster and
the coach review list do not carry one. Their eyebrow reads class year alone,
which the Sam Bassin slide already does without a badge.

## Still stale

The aggregate slides are **not** yet updated — they still read 126 interests,
17,970 views and seven athletes. They cannot be recomputed until:

- **Jose Brito** — app shows 11 interests, deck has 7. The D2 filter gives 2 and
  the D3 filter gives 5 (9 of the 19 D3 rows still unseen); D1, NAIA and JUCO
  filters are needed for the remaining 4.
- **Eduardo Marquez Cerezo** — app shows 6, deck has 5. Division of the extra
  one is unknown.
- **Anthony Allotta** — does not appear in the club roster view that was
  captured, so his current interests and views are unknown.

Once those land, the totals become: interests 126 → 142 (assuming Anthony holds
at 36), views 17,970 → 21,341 plus whatever the other athletes have gained, and
athletes 7 → 9.

## Notes

- Elijah is the only athlete carrying the "Orlando City Lake Nona" club label
  while the deck is branded "Orlando Soccer School — Lake Nona".
- Levi Hunt's slide reads "Class of 2027"; the app lists him as 2028.

## Distribution history

Coach decisions cluster into distinct sends rather than arriving steadily, and
the sends are per athlete, not roster-wide. For the two athletes whose rows are
fully captured:

| Athlete | Send 1 | Reviewed | Interested | Send 2 | Reviewed | Interested | Running total |
|---|---|---|---|---|---|---|---|
| Riley Duncan | 27 Jan – 12 Feb 2026 | 30 | 25 | 27 – 30 Apr 2026 | 8 | 4 | 29, then 30 with one June add |
| Sam Bassin | 3 – 23 Mar 2026 | 19 | 16 | 29 Jun / 27 Jul 2026 | 2 | 2 | 18 |

Elijah Lee Reed (Aug 2026) and Daniel Lai (Jul – Aug 2026) have been out once
each, so they have no second send to compare against yet.
