# Feature 1 — Enhanced Statbotics mode (predicted match winners)

Status: **built** (`feat/match-predictions`). Size: M.

## Shipped (V3.2.0)

Opt-in win-probability display, **off by default**, toggled from the setup screen and
⚙ Settings ▸ Display (live, no reload). Decisions locked via Q&A:

- **Shows:** a win-probability split bar (`Blue 62% — 38% Red`) with a favored-alliance
  highlight on the queuing card / My Team next-match card, and a compact favored-only
  chip (`● Red 63%`) on match-list rows. **No predicted scores** (deliberately — they
  read as more authoritative than they are).
- **Where:** queuing "Your Next Match" card, match-list rows, My Team "Next Match" card.
- **Coverage:** quals **and** playoffs.

### Implementation (`public/index.html`)

- State: `PREDICT` + `localStorage['pitfusion_predictions']` (`'1'`/`'0'`), near
  `pitFontXL`. `setPredict(on)` persists, syncs every `.pred-toggle-cb`, and either
  `fPred().then(paintPred)` or clears `predMap` + `paintPred()`.
- Data: `getEventMatches(evKey)` — new getter on the existing `_sb.matches` SWR store
  (key `event|<key>`, 20-min TTL, stale-while-revalidate). `bustTeamCache` ignores it
  (only strips `team|` keys).
- `fPred()` runs in `init()`'s `Promise.all` and on the 30 s TBA loop — cheap: served
  from cache with no network until the TTL, then one background revalidate + `paintPred`
  via the `onFresh` callback (same pattern as `fMyYear` in feature 7). **No new polling.**
- `buildPredMap(list)` → `{ <normKey>: {rp, winner, played} }`. `sbMl(m)` produces the
  same normalized key (`qual_N` / `sf_N` / `f_N`) that the existing `nl(label)` derives
  from a Nexus/TBA label, so the lookup is `predMap[nl(match.label)]` everywhere.
- `predFor(label)` returns the prediction only when `PREDICT`, not played, and `rp` is
  numeric. `predBar(p, size)` renders `'lg'` (split bar) or `'sm'` (favored chip).
- Render hooks: `rQ()` (after `.a-row`, plus `.fav` on the winning `.a-blk`), `rMl()`
  `mkRow` (replaces the empty `.mtime` cell), `rTeam()` (inside `.nm-card`).
- Toggle UI: a `.setup-field` checkbox on the setup screen and a new "Display" section
  in Settings (both `.pred-toggle-cb`, `onchange="setPredict(this.checked)"`);
  `openSettings()` + the setup `DOMContentLoaded` handler sync `.checked` from `PREDICT`.
- CSS: `.pred-bar` / `.pred-track` / `.pb-seg` / `.pb-l` / `.pred-cap` / `.pb-dot` /
  `.a-blk.fav`, with `[data-theme="light"]` and `[data-theme="tj2"]` tweaks.

### Verification done

Logic tested against `2025necmp2` (has playoffs): `getEventMatches` → 112 matches,
`buildPredMap` keys `qual_N`/`sf_N`/`f_N` match `nl()` output; played matches → `predFor`
returns null. `predBar` renders legibly in dark / light / TJ². Setup + Settings toggles
persist and stay in sync. Not yet exercised against live Nexus data at an event.

---

## Original design notes (kept for reference)

## Context

Team 88 does not want match predictions on their pit display, but other teams running
PitFusion have asked for them. So this is an **opt-in** mode, **off by default**, toggled
from both the setup screen and the ⚙ Settings panel (no reload needed).

## Data source

Statbotics has predictions built in — no new provider:

- `GET https://api.statbotics.io/v3/matches?event=<eventKey>` → every match with a `pred`
  object: `pred.winner` (`"red"`/`"blue"`), `pred.red_win_prob` (0–1), `pred.red_score`,
  `pred.blue_score`.
- Or per-match `GET /v3/match/<matchKey>`.

Keyless, same as the existing EPA calls — goes direct in both hosted and self-hosted mode.

## Open questions (decide before building)

1. **What to show.** Options, roughly increasing busyness:
   - a. Win probability bar only ("RED 68%") on the queuing card / match list.
   - b. Predicted winner highlight (subtle border/glow on the favored alliance).
   - c. Predicted score ("68% · 52–41").
   - Recommendation: **a + b** as the default look; predicted score behind a second
     sub-toggle for teams that want the detail. Predicted scores read as more
     authoritative than they are and invite "you said we'd win" conversations.
2. **Where.** The Queuing Status "now / on deck" card is the natural home (that's the
   match everyone's looking at). Also the match list rows? Also My Team's "Next Match"
   card? Start with the queuing card only; expand later.
3. **Playoff vs quals.** Predictions matter most in quals. In playoffs the bracket is
   short and emotionally charged — consider suppressing predictions once `comp_level`
   leaves `qm`, or make that a sub-option.
4. **Staleness / honesty.** Show a small "prediction" label and maybe the model's own
   confidence so it doesn't read as fact. Never show a prediction for a match that's
   already been played (show the real result instead).
5. **Setting persistence.** New key in `localStorage` (e.g. `pitfusion_predictions` =
   `"on"|"off"`), separate from the API-key store. Setup screen checkbox + Settings
   panel checkbox both read/write it; Settings-panel change re-renders live (call the
   relevant `r*()` functions, no reload).

## Rough approach

- Add `PREDICT` state + `localStorage` persistence near the other UI-pref toggles
  (`epaShowCurrentOnly`, `pitFontXL`).
- Fetch `/v3/matches?event=<key>` once per session (+ on the 30s TBA loop, or less
  often — predictions barely move), cache in a `predMap` keyed by match key. Reuse the
  #7 caching work.
- In `rQ()` (queuing render) and optionally `rMl()` (match list), when `PREDICT` is on
  and the match is unplayed, render the win-prob bar / favored-alliance highlight.
- Setup screen: a checkbox row near the theme picker. Settings panel: a checkbox in a
  new "Display" section (shown in both hosted and self-hosted mode).

## Verification

Toggle on at setup and from Settings mid-session; confirm the queuing card shows a
win-prob bar for the upcoming match, nothing for played matches, and that turning it
off removes everything without a reload. Check an event with playoff matches.
