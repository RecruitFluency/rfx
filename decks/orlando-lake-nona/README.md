# Orlando Soccer School — Lake Nona recruiting deck

Source for the club recruiting deck deployed at
`rfx-sports-recruiting-deck-9a538891-eight.vercel.app`.

The deck ships as a single self-contained HTML file — fonts, scripts and images
are embedded in it, so it works offline and can be handed to a club as one file.
That bundle is generated, not edited. It was previously only available as the
deployed artefact; the pieces are checked in here so the slides can be edited
and re-cut.

## Layout

| Path | What it is |
|---|---|
| `deck.source.html` | The slides. This is the file you edit. |
| `assets/` | Fonts, the RFX and club marks, and the deck runtime, referenced from the slides by uuid. |
| `assets/index.json` | Maps each uuid to its file, mime type and whether it is gzipped in the bundle. |
| `shell.html` | The loader page that unpacks the bundle in the browser. Generated output only — no slide content. |
| `bundle.py` | Stitches the three back into the deployable single file. |
| `roster.md` | Per-athlete figures behind the slides, and how they compare to the RFX app. |

## Editing

1. Edit `deck.source.html`. Each slide is one `<section>` carrying
   `data-label`, `data-screen-label` (the `NN Name` running order) and
   `data-speaker-notes`. Athlete slides all follow the same two-column layout:
   eyebrow + name + two stat tiles on the left, division funnel + spotlight
   program chips on the right.
2. Update the aggregate slides — `02 Totals`, `13 Views Convert`,
   `14 Every Level` — and `roster.md` alongside any roster change.
3. Rebuild and check it renders:

   ```
   python3 bundle.py     # -> dist/index.html
   ```

4. Deploy `dist/index.html` as the project's `index.html`.

`dist/` is generated and not checked in.

## Deploy target

Vercel scope `rfx-5d1a850d`, project
`rfx-sports-recruiting-deck-9a538891-792b-42bb-8ab3-f95785994181`
(`prj_YK2Y8mqhCgenuYIETtTdSByb0Hc5`), serving
`rfx-sports-recruiting-deck-9a538891-eight.vercel.app`. Note this is a
different scope from the RFX Team that hosts `rfx-landing` and the other
product projects.

The project has no git remote connected, so deploys are manual uploads of
`dist/index.html`.

A second project in the same scope, `rfx-sports-recruiting-orlando`
(`prj_1lEHiBVhQIrOOYdTmEjPzplNvgJl`), serves
`rfx-sports-recruiting-deck-9a538891.vercel.app` — an earlier cut of this same
deck, from before the texture layer was added. It is superseded; the two
projects hold no content that differs beyond that.

## Funnel bar widths

The bar next to each division is sized by hand as a percentage of the athlete's
own largest division, not of the roster. Keep the largest bar at `width:100%`
and scale the rest against it so the shape of the funnel stays readable.
