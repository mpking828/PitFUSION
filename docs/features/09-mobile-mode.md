# Feature 9 — Mobile display mode

Status: **built** (`feat/mobile-mode`). Size: M.

## What & why

PitFusion's layout targets a fixed-viewport pit display: `#app` is a `100vw × 100vh`
grid (`--hdr-h` / `1fr` / `--ftr-h`), `.body` is a three-column grid
(video + queuing + match list | drag handle | sidebar), the page itself never scrolls,
and each panel scrolls internally. On a phone none of that works — the 75%/25%
stream-vs-queuing split, the 380px sidebar, and the always-on Match Schedule panel all
assume a wide screen.

Mobile mode reflows to a single column and moves the lower-priority surfaces behind a
menu. **The desktop cascade is untouched** — everything is either inside one
`@media (max-width:768px)` block or additive markup/JS that is inert above the
breakpoint.

Decisions locked with the user:
- **Activation:** automatic breakpoint, no manual toggle.
- **Header:** *only* the Queue-Now pill, the schedule-delay pill, and the live indicator.
- **Dropped on mobile:** the "Bigger Text" and "Hide Stream" footer toggles.

Visible stack: compact header → video → queuing → tabs (Rankings / My Team / Alerts) →
Upcoming. Behind ☰: Match Schedule, EPA Stats, Playoff Bracket, Our Schedule, Help,
Settings.

## Implementation (`public/index.html`)

### CSS — one `@media (max-width:768px)` block at the end of the stylesheet

- **`--hdr-h:46px` / `--ftr-h:0px`.** These already drive `#app`'s grid rows, `.footer`,
  and every overlay's `top:` offset and header-bar height (`#schedule-overlay`,
  `#epa-overlay`, `#alliance-overlay`, `#pitmap-overlay`), so overriding the two
  variables re-flows the shell *and* makes all four existing overlays correct for free.
- **Type scale re-tuned.** The `--fs-*` tokens are `clamp(min,vw,max)` sized for a pit
  TV; at 375px the `vw` term is tiny so every one of them pins to its large minimum
  (`--fs-pit` → 1.4rem). Overriding them to phone values is what actually frees the
  vertical space the stack needs — it fixed both the clipped rankings table and the
  squeezed tab pane at once.
- **Stack:** `.body` → flex column, drag handles hidden, `.top-row` → flex column,
  `.panel-m` hidden, `.sidebar` takes the remainder.
- **Space budget at 375×812:** header 46 + video 195 + queuing 260 + tab bar 52 +
  tabs 97 + Upcoming 161 = 811.
  - The queuing card's two section labels ("Queuing Status" / "Your Next Match") are
    hidden — the hero text and the header's queue pill already say it. That bought the
    ~44px that took the video from 162 → 195 (`max-height:24vh`).
  - The queuing card still overflows slightly (260 visible / 333 natural) and scrolls
    internally. That's the accepted cost of the larger video.
- **Upcoming** is compacted so two *whole* matches fit: the alliance chips go on one
  wrapped line instead of two stacked rows (row 80px → 53px), the header and row padding
  shrink, and `rUpcoming()` renders 2 instead of 3 on mobile. Sizing it by a `max-height`
  alone clipped a match pill in half, which is what it looked like to the user —
  `scrollHeight` (159) is now ≤ the visible height (161), so nothing is cut.
- **Version and attribution**, which live in the desktop footer, move into the menu: the
  version prints under the menu rows (mirroring the self-hosted update badge when one is
  raised), and an **About & Credits** row opens `#about-overlay` with the Nexus / Blue
  Alliance / Statbotics attribution and the project link.
- **Match rows** (`.mr`) reflow from the desktop grid (220px label + chips + score +
  badge) to flex-wrap: label + score on one line, six team chips wrapping beneath.
  Switching to flex also neutralises `body.pit-xl .mr{grid-template-columns:… !important}`.
- **Promotion:** `body.mobile-panel-open .panel-m` becomes `position:fixed` full-screen.
  Because that rule lives inside the media query, a promoted panel automatically
  un-promotes on a desktop viewport even before any JS runs.

### Markup — three additive elements, hidden on desktop by a plain rule

`#mobile-menu-btn` (☰, in `.hdr-r`), `#mobile-panel-close` (in `#panel-m`'s title row),
`#mobile-menu-overlay` and `#about-overlay` (both built on the existing
`.help-overlay`/`.help-card` pattern).

Both buttons are hidden via a real CSS rule — `#mobile-menu-btn,#mobile-panel-close{display:none}`
— **not** `style="display:none"`. An inline style outranks the media query, which is
exactly why the first pass rendered no hamburger at all.

### JS

- `MOBILE_MQ` / `isMobile()`, `openMobileMenu()` / `closeMobileMenu()`.
- `openMobilePanel('matches'|'bracket')` / `closeMobilePanel()` — toggles the body class
  and which child of `#panel-m` is visible. **Deliberately does not call
  `toggleBracket()`**: that function is desktop-specific (moves `#stream-half` between
  containers, rewrites `#panel-m`'s `cssText`, rebuilds the tab bar, swaps the sidebar to
  the Queuing tab) and would corrupt the stacked layout. `rBracket()` renders into
  `#bracket-panel` independently of that shuffle, so calling it directly is all mobile
  needs.
- `syncMobileState()` — reconciles on an actual breakpoint crossing (guarded by
  `_wasMobile`). Entering mobile exits desktop bracket mode; leaving mobile closes any
  promoted panel and menu; either way `applyLayout()` re-runs.
- `applyLayout()` gained a mobile early-return that **clears** its own inline
  `grid-template-columns`/`height` — inline styles outrank the media query — and is now
  exposed as `window.applyLayout` so `syncMobileState()` can reach it from outside the IIFE.
- Both poll intervals refresh a mobile bracket (`bracketView || mobilePanel==='bracket'`),
  and the 15s poll also calls `syncMobileState()`.

`syncMobileState` is wired to the `matchMedia` change event, `window.resize`, **and** the
15s poll. Belt and braces on purpose: some embedded/emulated viewports dispatch neither
event on a size change (the browser tooling used to verify this feature is one of them),
and a mobile panel left promoted on a desktop viewport hides the match list.

Untouched: `rMl()`, `rBracket()`, `rQ()`, `rTeam()`, `switchTab()`, `rebuildTabBar()`,
`toggleBracket()`, and every overlay.

## Verification

Verified at 375×812 and 1440×900 against a local server with mocked Nexus/TBA data.

- Mobile: stack renders as specified; header shows only Queue-Now + delay + live + ☰;
  no footer, no drag handles; menu opens with the `#33 · <event>` context line and all
  six rows; Match Schedule promotes full-screen with working team chips, status badges
  and Close; Playoff Bracket renders and scrolls.
- Desktop unchanged: three-column layout, drag handles, footer buttons, and a full
  `toggleBracket()` enter/exit round-trip all behave exactly as before.
- Breakpoint crossing verified both directions — `mobilePanel`, the body class, `#ml`'s
  inline display, the panel title, and the inline layout sizes all reconcile.
- Dark / light / TJ² all legible at 375px.

Not yet exercised on a real phone against live event data.

## Out of scope

- Manual mobile/desktop override (auto breakpoint only).
- "Bigger Text" / "Hide Stream" on mobile.
- Landscape-specific tuning — portrait is the target.
