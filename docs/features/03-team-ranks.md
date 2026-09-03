# Feature 3 — rank data on My Team tab + EPA overlay

Status: **built** (`feat/team-ranks`). Size: S–M.

## What & why

The original feature 3 (fold "My Team" into the EPA overlay, delete the tab, rename it)
was **scrapped** — the tab has next-match and match-history functionality not duplicated
elsewhere. Feature 4 (replacement tab) scrapped with it.

Rescoped to **add-only**: surface Statbotics rank data PitFusion already has access to.

- **My Team tab** (`rTeam()`): new "EPA Ranks" row — World / `<country>` / `<state>` /
  `<district>` EPA ranks for our own team.
- **EPA overlay** (`renderEpaShell()`): new stat strip — Event Rank, RP, the same four
  EPA ranks, and District Points (FIRST season points + points standing).

## Data sources (all already reachable)

| Field | Source |
|-------|--------|
| World / Country / District / State EPA rank | Statbotics `team_year/<team>/<year>` → `epa.ranks.{total,country,district,state}.rank`; labels from `country` / `state` / `district` (`district` null → hide that cell) |
| Event Rank + RP | global `tbaRk.rankings` → `r.team_key === 'frc'+team` → `r.rank`, `r.sort_orders[0]` |
| District Points + points rank | `tbaEvent.district.key` → `/district/<key>/rankings` → `frc<team>` → `point_total`, `rank`. One call per event, cached in `districtRankCache`. |

## Implementation (`public/index.html`)

- New globals: `tbaEvent` (the full event object — `fEv` used to discard it), `sbMyYear`,
  `districtRankCache`.
- `fMyYear()` — fetches our team's `team_year` via `fetchWithRetry`; added to the
  `Promise.all` in `init()`, **not** the 30s loop (ranks move ~once per match day).
- `rTeam()` — appends an `EPA Ranks` `.str` row (dynamic column count) when
  `sbMyYear.epa.ranks` exists.
- `renderEpaShell()` — builds an `.epa-stats` pill strip before the toggle buttons;
  each pill omitted when its datum is missing. District Pts pill (`#epa-dpts`) fills
  async via `fillDistrictPoints(team)`, which self-removes the pill on no-district /
  team-not-found / error.
- `.epa-stat-pill` CSS added near the other `#epa-overlay` rules, incl. a TJ² override.

## Verification

Preview deploy, team 88, a district event (2025 NE) and a regional (2025 non-district):

- My Team tab: "EPA Ranks" row shows World/USA/MA/NE at NE; no NE cell at the regional;
  row absent if Statbotics has no season data.
- EPA overlay (own team + another team via a ranking row): Event Rank + RP match the
  Rankings tab; World/Country/State pills present; District pill only for district
  teams; District Pts fills ("276 · #10") at NE, absent at the regional; current-event
  toggle and ↻ Reload keep the strip.
- Dark / light / TJ² legible; no My Team row overflow at 380px.

## Drive-by flagged

`openEpa()` has dead code — `if(forceReload) delete epaCache[cacheKey];` after a
`return`, inside the cache-hit `if`. Harmless; not fixed here.

---

## Follow-up (feature 3b) — real FRC advancement points

Feature 3's district figures were the **Statbotics EPA** district rank plus a TBA
district-points pill gated on the *event*. 3b adds the **FRC** advancement standing
proper, on both views, and handles regional teams.

- **Which pool a team is in:** `GET /team/frc<team>/districts` → an entry with
  `year === currentYear` means district; none means regional pool.
- **District points/rank:** `GET /district/<key>/rankings` → `point_total`, `rank`.
- **Regional pool points/rank:** `GET /regional_advancement/<year>/rankings` → same row
  shape (`point_total`, `rank`), ~1600 teams. (Per-event: `/event/<key>/advancement_points`
  and `/event/<key>/regional_champs_pool_points`.)
- `getAdvancement(team)` returns `{label, rank, points}` — `label` is `"<ABBR> District"`
  or `"Regional Pool"`. Fast path reuses the event-district rankings list before any
  per-team `/districts` call.
- **Never polled.** Cached per team and per rankings URL for the session;
  `fMyAdv()` runs once after `fEv()`; `rTeam()` reads the cached `sbMyAdv`.
- My Team tab: new "FRC Advancement" row. Overlay: the old "District Pts" pill became
  the "FRC Advancement" pill (label + `#rank · pts` set async; self-removes if unranked),
  no longer event-gated.
- `hasRealDistrict` → `epaDistrictMeaningful` — now **only** gates the Statbotics EPA
  district-rank pill. Fixes 2026 (FIRST California is a real district `2026ca` that the
  old `district !== state` check would have suppressed).
