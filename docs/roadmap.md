# PitFusion roadmap

Feature backlog. Status: **idea** → **designing** → **ready** → **building** → **shipped**.
One design doc per non-trivial feature under `docs/features/`. Build one per PR against
`main` (Cloudflare auto-deploys on merge). Statuses below cite the PR that landed them.

| # | Feature | Status | Size | Design doc |
|---|---------|--------|------|------------|
| 1 | Enhanced Statbotics mode — predicted match winners (opt-in) | shipped (V3.2.0, #31) | M | [features/01-statbotics-predictions.md](features/01-statbotics-predictions.md) |
| 2 | 2027 season support | designing — blocked until kickoff, 2027-01-09 | S–M | [features/02-2027-season.md](features/02-2027-season.md) |
| 3 | Rank data on My Team tab + EPA overlay (World/Country/District/State EPA ranks; overlay also gets event rank, RP, district points) | shipped (#21) | S–M | [features/03-team-ranks.md](features/03-team-ranks.md) |
| 3b | FRC advancement points — real district points/rank **and** regional-championship-pool points/rank, on both views | shipped (#25) | S | [features/03-team-ranks.md](features/03-team-ranks.md) |
| 3c | EPA overlay redesign (labelled sections: identity / Event / Records / EPA Ranks / FRC Advancement) + remove the team-info card from the My Team tab | shipped (#26, #29) | M | [features/03-team-ranks.md](features/03-team-ranks.md) |
| 4 | ~~Replacement tab for the freed "My Team" slot~~ | scrapped | — | My Team tab stays (has next-match + match history not duplicated elsewhere); #3 rescoped to add-only |
| 5 | Multi-event support (district playoffs, Worlds divisions → merged playoffs) | designing | L | [features/05-multi-event.md](features/05-multi-event.md) |
| 6 | Help overlay (repurpose the "?" button) — documents panel resizing | shipped (#17) | XS | [features/06-help-overlay.md](features/06-help-overlay.md) |
| 7 | Better Statbotics caching (persist + revalidate) | shipped (#27) | S–M | [features/07-statbotics-caching.md](features/07-statbotics-caching.md) |
| 7b | Migrate off the removed `/v3/team_matches` → `/v3/matches` (fixes the broken EPA line charts) | shipped (#28) | M | [features/07-statbotics-caching.md](features/07-statbotics-caching.md) |
| 8 | Theme rework — generalised tokens, in-app Custom theme editor, theme picker in Settings | shipped (V3.1.0, #20) | M–L | [features/08-theme-rework.md](features/08-theme-rework.md) |
| 8b | TJ² CSS collapse — fold hand-written `[data-theme="tj2"]` overrides into tokens | shipped (#23, 197→166 rules) | S | [features/08-theme-rework.md](features/08-theme-rework.md) |
| 9 | Mobile display mode — single-column stack under 768px, secondary surfaces behind a ☰ menu | shipped (#37) | M | [features/09-mobile-mode.md](features/09-mobile-mode.md) |
| 10 | Match Schedule scroll lock — polls stop yanking you back; ⇩ Current button | shipped (#39) | S | [features/10-match-list-scroll-lock.md](features/10-match-list-scroll-lock.md) |
| 11 | Playoff Bracket sidebar overflow — the Queuing tab's bumper box forces a scroll bar | idea | XS–S | — |

Size: XS < half a day · S ~1 session · M ~2–3 sessions · L multi-session, may split.


## Known issues

- **#11 Bracket-mode sidebar scroll bar.** In Playoff Bracket mode the Queuing
  tab (`#tab-queuing` — `#q-display-sidebar` + `#bumper-box-sidebar`, see
  `syncQueueingToSidebar()` / `updateBumperBox()` in `public/index.html`)
  overflows the sidebar and forces a scroll bar. Gets worse as the queuing card
  above it grows — e.g. 4 finalist alliances. Likely a sizing/flex fix on the
  tab panel + bumper box rather than anything structural; no design doc needed.

## Shipped outside the roadmap

Found and fixed live at 2026mifli2; no design docs, see the PRs:

- **V3.2.1** — EPA overlay degrades gracefully during a Statbotics outage instead of
  blanking the whole panel (#32); Statbotics probe added to the Settings connection
  check (#33); Our Schedule stopped showing a stale queue time for a played match (#34).
- **V3.2.2** — every Nexus/TBA/Statbotics fetch forces `cache:'no-store'`, after a
  zone-level Browser Cache TTL froze API responses for four hours (#35).
- **Unreleased on `main`** — "played" is now inferred from schedule position, shared by
  the match list, My Team and Our Schedule (#38). Nexus never marks a played match
  `Completed` and TBA scores lag, so position relative to `nowQueuing` is the only
  reliable signal.

## Deferred / follow-up

- **#8b done in #23.** A *deeper* collapse is possible but is not planned. The
  first PR removed 31 rules that were
  either structural (overlay backgrounds → `--overlay-*` tokens) or provably
  redundant (value already equalled the TJ² token). ~165 remain; most are
  deliberate per-component tuning for contrast over the tye-dye photo (alliance
  chips, bracket cards, match rows) or values intentionally a hair off the token
  (`0.6` vs `0.5`). Going further means editing shared base rules and accepting
  small TJ²-only visual shifts — needs a full running-app visual regression pass
  (Nexus + TBA keys, every tab + overlay). Low priority: pure cleanup, no user value.
- **`rRank()` centres the Rankings panel** on our own team on every poll, the same
  annoyance #10 fixed for the match list. Not yet addressed.

## Suggested build order

1. **#11 (bracket sidebar overflow)** — small, self-contained, and visible during
   playoffs when the display matters most.
2. **#2 (2027 season)** — blocked until the Jan 9 2027 kickoff; the non-blocked prep
   (audit for hardcoded `2026`, confirm the year is always dynamic) is already done —
   see the design doc.
3. **#5 (multi-event)** — largest, most invasive to the data model; do it last and
   probably split into its own mini-roadmap.

Shipped: #1, #3, #3b, #3c, #6, #7, #7b, #8, #8b, #9, #10.
