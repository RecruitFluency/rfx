# Shh! badge assets

The badge is the shush: a pointer finger held vertically over closed lips. Full
specification — lockups, clear space, colour, placement, misuse — is in
[`../shh-brand-and-social-strategy.md`](../shh-brand-and-social-strategy.md) §3.1.

## Files

| File | Cut | Use |
|---|---|---|
| `shh-badge-display.svg` | Display | 48px and up. Fine lip taper. Web, print, apparel, film. |
| `shh-badge-icon.svg` | Icon | 32px and below. Thickened mouth and finger. Favicons, app icons, embroidery, stencil, cut vinyl. |
| `shh-badge-solid.svg` | Solid | No knockout gap — one continuous silhouette. Stamps, single-hit foil, laser etch. |

All three are drawn on the same 120×120 grid, so they swap without re-positioning.

## Colour

The mark inherits `currentColor`, so set the colour on the element or a parent:

```html
<img src="shh-badge-display.svg" alt="Shh." width="48">   <!-- inherits nothing; recolour via CSS mask or inline the SVG -->
```

```html
<!-- inlined: the badge takes the programme accent -->
<svg class="badge" viewBox="0 0 120 120"><!-- paste file contents --></svg>
<style>.badge { color: #CBFF00; }</style>   /* girls: Voltage · boys: Siren #FF0F7B */
```

The knockout gap in the display and icon cuts is **transparent**, not filled — the mark
sits correctly on any background with no per-background variant.

Never render the badge in two colours at once, never outline or hollow it, and never place
it inside a shield, circle, or roundel.
