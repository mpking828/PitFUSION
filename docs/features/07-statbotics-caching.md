# Feature 7 — Better Statbotics caching

Status: **built** (PR open — `feat/statbotics-cache`). Size: S–M.

## Shipped

Persisted stale-while-revalidate store replacing the in-memory `epaCache` + the
one-shot `sbMyYear` fetch:

- `_sb = {year, matches}` → `localStorage['pitfusion_sb_<year>']` (year-namespaced;
  last season self-evicts). LRU cap 40 per sub-store, debounced save, all guarded.
- `_sbGet()` — fresh hit returns; **stale hit returns instantly and revalidates in
  the background** (`onFresh` callback); cold awaits. A failed revalidate keeps the
  stale entry (never poisons).
- `getTeamYear(team)` / `getTeamMatches(team, scope)` — every Statbotics caller now
  routes through these (EPA overlay, alliance EPA ×6, current-event toggle, My Team
  rank row). `bustTeamCache(team)` backs the ↻ Reload button.
- `fMyYear()` added to the 30 s loop — a no-network hit until the 2 h `team_year`
  TTL, then one background revalidate + `rTeam()` re-render. Fixes the My Team rank
  row going stale for the whole session, with **no** new polling.

Verified: warm EPA-overlay open ≈ 5 ms (paints from `localStorage`); `team_year`
is not re-fetched after a reload or on refresh ticks while fresh.

## ⚠️ Discovered during this work — `team_matches` endpoint removed

Statbotics has **removed `/v3/team_matches`** (404 for every team/year). The new
endpoint is `/v3/matches?team=<t>&year=<y>` with a different shape:
- per-match team EPA is now `m.epas[<teamNumber>]` — `{epa, auto_epa, teleop_epa,
  endgame_epa, comp_0_epa … comp_9_epa, rp_1_epa …}` (was `m.epa.breakdown.*`).
- `m.pred` (`red_win_prob`, `red_score`, `blue_score`) is included — this is the
  data **feature #1 (match predictions)** needs.
- `alliances.{red,blue}.team_keys` are bare ints; `m.key`, `m.match_name`.

Impact: the EPA **per-match line charts are already broken on production** — every
"Match history unavailable" message is this, not an offseason data gap. The EPA
*summary* numbers, ranks, and records (all from `team_year`) are unaffected.

**Migrated in 7b** (`feat/statbotics-matches`): `getTeamMatches` now hits
`/v3/matches`; new helpers `matchEpa` / `curEpa` / `matchHasEpa` / `matchLabelOf`;
`EPA_FIELDS` keys are the new per-match field names (now year-agnostic). The
`pred` object rides the same response and is cached in `_sb.matches` — feature #1
(predictions) just needs to read it.

## Original design notes (kept for reference)

## Current implementation

`public/index.html`:
- `epaCache = {}` — plain in-memory object, **session-only** (lost on reload).
- `EPA_CACHE_MS = 30 * 60 * 1000` — 30-minute TTL.
- Keyed per team+scope, e.g. `88` and `88_current`.
- `fetchWithRetry(url, timeoutMs, retries)` — timeout + retry wrapper; `team_year` gets
  8s, `team_matches` 12s.
- Two endpoints per team: `team_year/<t>/<year>` (fast, ~250 ms) and
  `team_matches?team=<t>&year=<year>&limit=200` (slow / sometimes times out / 404s
  offseason). Alliance EPA fetches 6 teams' worth at once.

Pain: first open of the EPA overlay is the slowest interaction in the app, and a reload
throws the whole cache away, so a pit reboot mid-event re-pays the cost for every team
someone looks at.

## Improvements (roughly in priority order)

1. **Persist the cache to `localStorage`.** Write `epaCache` entries under a namespaced
   key (`pitfusion_epa_<year>`), load on startup. Keep the 30-min TTL for freshness but
   let a reload reuse still-valid entries. Cap size (e.g. last ~40 teams, LRU) and
   guard every read/write in try/catch (quota, private mode).
2. **Stale-while-revalidate.** If a cached entry exists but is past TTL, render it
   immediately with a subtle "updating…" marker and fetch fresh in the background,
   swapping in when it lands. Turns a 10 s wait into an instant paint.
3. **Split TTLs.** `team_year` (season aggregates) barely moves during an event — 6 h
   TTL is fine. `team_matches` changes as matches are played — keep ~15–30 min, but
   only during the current event; historical data can cache for days.
4. **Warm the cache.** After the rankings load, kick off low-priority background fetches
   for the top ~8 ranked teams (and your alliance partners) so the common clicks are
   instant. Throttle so it doesn't stampede Statbotics.
5. **Consider a Worker proxy + edge cache (hosted mode only).** Add `/api/statbotics/*`
   to `worker.js` exactly like the other three, with a longer `cacheSeconds` (e.g. 300).
   Then every PitFusion display at an event shares one warm cache instead of each
   hammering Statbotics. Self-hosted mode keeps calling direct. This is the biggest win
   for multi-display venues but also the most work — could be its own PR.

## Recommendation

Ship **1 + 2 + 3** as one PR (client-only, no Worker change) — that removes most of the
felt latency. Do **5** later if multi-display venues report Statbotics slowness.

## Verification

Open the EPA overlay for several teams, reload, reopen — cached teams paint instantly.
Let an entry go stale (or shorten the TTL for testing) and confirm stale-while-revalidate
shows old data then updates. Check `localStorage` stays under the size cap after viewing
many teams. Confirm offseason 404s on `team_matches` don't poison the cache.
