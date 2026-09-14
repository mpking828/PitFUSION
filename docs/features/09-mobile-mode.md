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
- **Space budget at 375×812:** header 46 + video 211 + queuing 195 + tab bar 52 +
  tabs 146 + Upcoming 161 = 811.
  - The queuing card's two section labels ("Queuing Status" / "Your Next Match") are
    hidden — the hero text and the header's queue pill already say it.
  - The card is then **deliberately cut just under the alliance blocks**: they end at
    193 in card coordinates and the On Field/On Deck/Queuing strip starts at 197, so
    `max-height:min(24vh, 196px)` puts that strip (and the bumper-colour box) below the
    scroll line. The px term pins the boundary on tall phones; the vh term shrinks the
    card on short ones. Scrolling the card still reaches both.
  - That reclaimed 64px: the video reaches its full 16:9 height (211 — `max-height:28vh`
    never binds at this viewport, it only protects short phones), and the remaining ~48px
    went to the tabs pane, which was cramped at 97.
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

## Follow-up fixes (first real-device pass)

Six issues came back from using it on a phone; five are fixed here, the sixth
(Playoff Bracket) needs its own design.

- **Scroll lock did nothing on mobile, and the sheet didn't scroll to the current
  match on open.** Same root cause: in the promoted sheet `.panel-m` is a flex column,
  so **`#ml` becomes the scroller** while `.panel-m` doesn't scroll at all — but the
  listener and all the scroll maths were hardcoded to `#panel-m`. `mlPanel()` now
  resolves the real scroller at call time and the listener is attached to both. Opening
  the sheet also calls `scrollToCurrentMatch()`, since `rMl()`'s scroll at render time
  was a no-op while the sheet was `display:none`.
- **The `requestAnimationFrame` wrapper around `scrollIntoView` is gone.**
  `scrollIntoView` forces its own layout so the rAF bought nothing, and rAF never fires
  in a backgrounded or non-rendering tab — which silently killed the auto-scroll.
- **Upcoming dropped on mobile.** Even compacted it cost ~161px and squeezed the tabs to
  ~146; they now get 307. Its content is already covered by the queuing card and the
  Match Schedule sheet. (`rUpcoming()`'s mobile 2-row limit reverted — now dead.)
- **"NOW!" was clipped in the urgent countdown.** With the delay pill present the pill
  gets 137px but needs 178; `.cd-lbl` and `.cd-val` are both `flex-shrink:0` and
  `.cd-match` has already collapsed, so `.cd-pill{overflow:hidden}` clipped the value —
  the one word that matters. Mobile hides `.cd-match` (the queuing card repeats it
  directly below) and lets `.cd-lbl` truncate first.
- **Our Schedule numbers ran together.** The alliance cells hardcoded
  `grid-template-columns:repeat(4,minmax(0,1fr))` for 3-team alliances — throwing away a
  quarter of the cell and giving each chip a track narrower than its own text. Now a
  `.sched-alliance` flex row, which also widens the chips on desktop (121px vs a cramped
  grid track). Mobile additionally tightens table padding and drops the chips a size, so
  the table fits 359px instead of overflowing at 475.

## Mobile Playoff Bracket (dedicated view)

The desktop bracket is a fixed ~1400×580 canvas of absolutely-positioned cards joined by
SVG bezier connectors, with geometry from hardcoded constants (`CARD_W 172`, 6 columns,
4 bands). There is no width at which that reads on a phone — scaling it down makes the
text unreadable and panning a 1400px canvas is what made it unusable. So mobile gets a
**separate renderer over the same data**, `rBracketMobile()`, rather than a restyling.

- **`BKT_ROUNDS`** is now the single source of truth for the double-elim structure
  (R1 `M1 1v8`/`M2 4v5`/`M3 2v7`/`M4 3v6` → R5 → Finals). The desktop canvas maps it to
  columns; the mobile view walks it top to bottom. `rBracket()`'s inline `colDefs` was
  replaced by it — that's the only change to the desktop renderer.
- **Your path** (pinned at top): your alliance's seed, its three teams, and its live
  state and record straight from TBA's `alliances[].status` (`double_elim_round`,
  `record`, `eliminated`/`won`) — no need to derive it. Then every match your alliance
  has played or is about to, with W/L, score and opponent seed.
  Sorted by **play order, not bracket order** — Round 2 runs M7, M8, M5, M6, so the
  bracket's own ordering reads wrong as a timeline.
- **Full bracket** below: each round as a header plus vertical cards, reusing the
  existing `.bkt-card` / `.bkt-row` styling (they were already vertical — only the
  desktop layout absolutely-positions them), so the two views stay visually consistent
  for free. Your matches get the accent border; the on-field match is flagged live using
  the app's positional `nowQueuing` logic rather than Nexus statuses.

`openMobilePanel('bracket')` and both poll intervals route to `rBracketMobile()`; desktop
still calls `rBracket()`.

**Scroll position across the poll.** Both brackets re-render every 15s/30s, and both were
snapping you back to the top mid-scroll — the same class of bug #39 fixed for the match
list. The mobile sheet's `.bkt-mob` was the scroller *and* the node being replaced, so the
position died with it; it's now a plain content wrapper and `#bracket-panel` (which
survives the swap) scrolls instead. The desktop canvas has the same problem in both axes,
so its scrolling wrapper got an id (`#bkt-scroll`) and its `scrollLeft`/`scrollTop` are
saved and restored around the render.

**Full-screen sheet.** The bracket sheet drops the 48px title bar — that band is the same
wasted space the match list's sticky header was. The header collapses to a zero-height
strip with Close floating over the top-right, `.panel-m`'s padding is zeroed, and the
bracket runs edge to edge for the full height below the app header (which stays, since it
carries the queue countdown). `updateMlJumpBtn()` also suppresses the ⇩ Current button
while the bracket sheet is open — it shares the same header and had been leaking through.

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
