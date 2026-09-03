# Feature 6 — Help overlay

Status: **building**. Size: XS.

## Context

Panel resizing already works and **already resets on double-click** of a divider — but
it's undiscoverable on a 5px handle. Rather than add a reset button, turn the existing
"?" button's overlay into a small **Help** document that explains it (and is a home for
future help topics).

## Changes (`public/index.html`)

- `#help-overlay` card title: `<h2>Data Integrity</h2>` → `<h2>Help</h2>`.
- "Data Integrity" becomes an `<h3>` heading; its three existing paragraphs stay under it.
- New `<h3>Resizing panels</h3>` section:
  > Drag the divider bars between panels to resize them on the fly — the sidebar, the
  > stream, and the match list all adjust. Double-click any divider to snap the layout
  > back to its default.
- `.help-card h3` CSS added (uppercase, `--fs-lbl`, weight 900); `.help-card` gets
  `max-height:85vh; overflow-y:auto` so it can grow with future topics.
- The "?" button `title` → "Help".

## Future

This overlay is now the place to add more help topics (themes, what the queuing states
mean, keyboard shortcuts if any get added, etc.).

## Verification

Open the "?" button: title reads "Help", "Data Integrity" is a sub-heading with its
paragraphs, "Resizing panels" section present. Card scrolls if it exceeds the viewport.
Check dark / light / TJ² themes.
