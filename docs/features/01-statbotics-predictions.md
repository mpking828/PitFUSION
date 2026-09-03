# Feature 1 — Enhanced Statbotics mode (predicted match winners)

Status: **designing**. Size: M.

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
