# 15 — Import Custom theme from frc-colors

Status: **shipped (V3.7.0, #101)** · Size: **S** · Depends on: #8 (Custom theme editor, shipped)

Owner decisions (2026-10-09): palette derived **locally**, no thecolorapi; avatar sits
**next to the team number** (right side), not by the wordmark; Import sets the panel
tint to match and leaves any background image alone.

## Goal

One button in Settings ▸ Appearance ▸ Edit Custom theme: type a team number, press
**Import from frc-colors**, and the editor's draft is filled with a full palette built
from that team's colours, plus the team's avatar for the header. Nothing is fetched
until the button is pressed, and nothing is saved until the user presses the editor's
existing **Save** — the import is just another edit to `_cteDraft`.

## What the services actually return (probed 2026-10-09)

**frc-colors** — `GET https://api.frc-colors.com/v1/team/<n>`
- Keyless, `access-control-allow-origin: *`, Apache-2.0 project
  (github.com/jonahsnider/frc-colors.com). Callable straight from the browser in both
  modes, so **no Worker route** is needed for a one-shot, user-initiated fetch.
- `200 {"primaryHex":"#e66e05","secondaryHex":"#002e5d","verified":true}` (team 88).
- `404 {"code":"E_TEAM_NOT_FOUND"}` when it has no colours (9999).
- `400 E_VALIDATION` for numbers > 50000.
- `verified:false` means the colours were auto-extracted from the avatar, not
  team-submitted — show that in the status message, don't block on it.
- **Primary is not always a usable accent.** Team 751: `primary #ffffff`,
  secondary `#264ba4`. Any palette rule must handle a white/black/grey primary.

**Avatar** — `GET https://avatars.frc.sh/teams/<n>.png` (the host frc-colors' own site
uses; there is no avatar route on `api.frc-colors.com`)
- 40×40 RGBA PNG (FIRST's avatar), `Access-Control-Allow-Origin: *`,
  `Cross-Origin-Resource-Policy: cross-origin`, 24 h cache. 404 (JSON) when a team has
  no avatar (team 2) — common, so absence is normal, not an error.
- Exposes `X-Avatar-Year`, i.e. it serves the most recent year's avatar.

**thecolorapi.com** — also keyless and CORS-open, but see "Palette generation" for why
it's not recommended.

`public/_headers` sets no CSP, so neither host needs allowlisting.

## UI

Inserted at the **top** of the editor (above "Base"), its own group header:

```
FRC COLORS
[ 88      ]  [ Import from frc-colors ]
Fills the colours below from this team's frc-colors entry. Preview only until you Save.
```

- Text box pre-filled with the configured team number (`TEAM`), `inputmode="numeric"`.
- Button disabled + "Importing…" while in flight; Enter in the box triggers it.
- Result goes through the existing `_cteMsg()`:
  - `Imported team 88 — #e66e05 / #002e5d (verified). Press Save to keep it.`
  - `… (auto-extracted from the team avatar — check it)` when `verified:false`
  - `frc-colors has no colours for team 9999.` (404, draft untouched)
  - `Couldn't reach frc-colors.` (network/5xx, draft untouched)
- Avatar row appears once one is in the draft: 40px thumbnail (pixelated), a
  **Show in header** checkbox, and **Remove avatar**.
- Colours partially failing is not a state: the colour fetch is the gate. The avatar
  fetch runs in parallel and its failure just means no avatar.

## Palette generation

### Recommendation: derive locally, don't call thecolorapi

thecolorapi's schemes are fixed HSL arithmetic — its `complement` for `#0066B3` is two
lightness steps of hue 26° and three of hue 206°, nothing more. Calling it would add a
second network dependency (Heroku-hosted, no published terms or SLA) to produce numbers
~20 lines of local HSL code yield identically, offline, with rules tuned to *this* UI —
which a generic 5-swatch scheme can't know (it doesn't know which slot is a dark panel
background and which is text on an accent).

More importantly, frc-colors already gives the second colour: a team's **real** secondary
beats any computed complement.

### Mapping (dark base — this is a pit-TV display)

| token | source |
|---|---|
| `--accent` | primary (or secondary — see neutral rule) |
| `--accent2` | the other team colour. If it's neutral **and** under 3:1 on `--bg` (254's `#232323`), the accent's hue rotated 180° at S 65 L 45 instead. A neutral that does show up (751's white) is kept: it's the team's own colour |
| `--on-accent` | `#000` or `#fff`, whichever has the higher WCAG contrast against `--accent` |
| `--bg` `--surface` `--surface2` | accent hue, S ≈ 18%, L = 5 / 8 / 11% |
| `--border` `--border2` | same hue, S ≈ 15%, L = 17 / 24% |
| `--text` `--text-mid` `--text-dim` | unchanged neutrals (team-tinting text hurts legibility) |
| `--green` `--yellow` `--red` | **unchanged** — status semantics |
| `--blue-a` `--red-a` | **unchanged** — alliance colours must never become team colours (team 88's blue would read as an alliance) |
| `glass.bg` | `--surface` |
| background image, wash, blur | untouched |

**Neutral rule.** A colour is *neutral* if HSL saturation < 15% or lightness > 90% or
< 8%. If primary is neutral and secondary isn't, swap them (751 → accent `#264ba4`). If
both are neutral (black/white teams), keep primary as accent and render the surfaces as
plain greys (S = 0).

For two neutral colours (black and white), whichever contrasts more with `--bg` is the
accent.

**Contrast guard.** Each accent under 3:1 against `--bg` (the WCAG non-text minimum) is
lightened in HSL until it reaches 3:1. A navy colour would otherwise vanish on a
near-black page; team 88's `#002e5d` secondary becomes `#0060c3`. `--accent2` is only a
left-border stripe, but it still has to be visible. The message says "a dark team colour
lightened for contrast" so the change isn't silent.

As built, checked in the browser:

| team | frc-colors | accent / accent 2 | notes |
|---|---|---|---|
| 88 | `#e66e05` / `#002e5d` | `#e66e05` / `#0060c3` | secondary lightened |
| 751 | `#ffffff` / `#264ba4` | `#2e5ac5` / `#ffffff` | swapped, blue lightened |
| 254 | `#0070ff` / `#232323` | `#0070ff` / `#bd7c28` | black secondary → complement |
| (b/w) | `#000000` / `#ffffff` | `#ffffff` / `#737373` | grey surfaces |

All of this is a pure function `paletteFromTeamColors(primary, secondary) → colors{}`,
easy to eyeball against a list of real teams before shipping.

## Avatar in the header

- Stored **in the theme config** as a data URL, `cfg.avatar = { image:'data:image/png;…',
  team:88, show:true }` — fetched once on import, ~2–4 KB, so the header never makes a
  third-party request at runtime and works offline in the pit. Well under the existing
  3.5 MB image guard. `mergedCustomTheme()` gains an `avatar` key (default
  `{image:'', team:null, show:false}`).
- Rendered as an `<img id="hdr-avatar">` immediately before `#hdr-team` in `.hdr-r`.
  Height matches the team pill (`calc(var(--fs-hdr) * 1.2 + 10px)`, 34 px at 1280 wide),
  `image-rendering: pixelated`. A 40 px image upscaled smoothly looks muddy;
  nearest-neighbour reads as intentional pixel art, which is what FRC avatars are.
- Shown only when `data-theme="custom"` **and** `cfg.avatar.show` **and** an image exists.
  Toggled by `applyCustomTheme()` / `applyTheme()` so switching themes hides it.
  Hidden by default via CSS, revealed by a class — not inline `style`, per the mobile
  rule in CLAUDE.md.
- Mobile: hidden along with `.hdr-team`, which the mobile header already drops. The
  rule is `.hdr-avatar.on`, since a bare `.hdr-avatar` loses to the `.on` reveal.
- "Copy CSS" ignores the avatar (it's markup, not a CSS token) — say so in its hint.

## Code touch points (`public/index.html`)

- `DEFAULT_CUSTOM_THEME` / `mergedCustomTheme()` — add `avatar`.
- New: `fetchFrcColors(team)`, `fetchFrcAvatar(team)` (→ data URL via `blob` +
  `FileReader`), `paletteFromTeamColors()`, small HSL helpers next to `_hexToRgb`.
- `renderCustomEditor()` — FRC Colors group at the top; avatar row.
- `applyCustomTheme()` / `applyTheme()` — `applyHeaderAvatar()`.
- Header markup — `<img id="hdr-avatar" class="hdr-avatar" alt="">`.
- Fetches use `cache:'no-store'` like every other call (#35); do **not** route through
  `apiUrl()` — not proxied, not edge-cached; one call per button press needs neither.
- docs/custom-theme.md — a short section on the import.

## Out of scope

- Auto-import on team change or at startup — explicitly button-only.
- A light-base variant of the generated palette (could be a second button later).
- TBA's `/team/frc<n>/media/<year>` avatar (base64, needs a key) as a fallback when
  avatars.frc.sh 404s — possible later; frc-colors' host already serves the same FIRST
  avatars.

## Behaviour notes

- A failed lookup (404, network) leaves the draft untouched, avatar included. A
  successful one **replaces** the avatar, or clears it if the new team has none, so a
  previous team's avatar never survives an import.
- Like every other editor change, an unsaved import is dropped if you switch to another
  theme and back, because `applyTheme()` reads the stored config.
