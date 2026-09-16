# Feature 13 — Event-driven cache invalidation

Status: **shipped** (V3.5.0, #80). Size: S–M.

Deferred from #78 ("Statbotics caching is time-based (TTL); the right model is
event-based"). Replaces every cache duration in the app with one signal.

## The problem

A team's Statbotics EPA is only ever wrong for the *instant after one of its matches
is scored*. Every other second, a cached value is exactly right no matter how old it
is. The app was approximating that with three unrelated durations:

| cache | old TTL | what it actually cost |
|---|---|---|
| `_sb.year` (`team_year`) | 2 h | EPA up to 2 h stale during play; refetched all night with nothing changing |
| `_sb.matches` (`/v3/matches`) | 20 min | predictions up to 20 min stale; polled forever after the last match |
| Worker edge (`/api/statbotics`) | 120 s | a client that *knew* it was stale still got the edge's copy |

`bustTeamCache()` already did the real invalidation, but only ever fired from a manual
"Retry" click.

The audit done alongside this found the same disease in a worse form on three
TBA-backed caches in the EPA overlay — `recordsCache`, `advCache` and
`advRankingsCache` were **session-lifetime memos with no expiry at all**. On a pit TV
that runs all weekend, a team's W–L–T record and district rank froze at whatever they
were the first time anyone opened the overlay.

## The signal

`sbVer()` counts matches TBA has posted a score for. That count *is* the cache version.
It bumps at exactly the moment Statbotics recomputes, and stays put the rest of the time.

```js
sbVer()      // -> "2026mifli2:41"      all scored matches at this event
sbVer(88)    // -> "2026mifli2:88:12"   scored matches team 88 played
```

Three properties carry the design:

1. **Read-time and lazy.** Nothing is pushed or diffed. A version mismatch is computed
   when a cache is *read*, so there is no "detect which teams were affected" step and no
   ordering hazard against the poll. This is why it replaced the original sketch of
   `detect new score → call bustTeamCache(team)`.
2. **Derived from shared upstream state, never local history.** Two displays at the same
   event compute the same string, so they still share the Worker's edge cache entry.
   (They can differ for one poll while TBA's own 30 s edge entry drains — one extra
   upstream fetch, self-correcting.)
3. **Two widths.** Event-wide where any result moves the value; team-narrowed where only
   that team's own play does — roughly a 6× cut in refetches for identical correctness.

### Which width each cache uses

| cache | version | why |
|---|---|---|
| `getEventMatches` (predictions) | `sbVer()` | match 39's result changes match 40's `pred` |
| `getTeamYear` | `sbVer(team)` | its only match-cadence field is the team's own `epa.breakdown`. Shipped event-wide by mistake — see below |
| `getTeamMatches(team)` | `sbVer(team)` | only that team's matches appear in it |
| `recordsCache(team)` | `sbVer(team)` | W–L–T is that team's results only |
| `advCache`, `advRankingsCache` | `sbVer()` | ⚠️ a **proxy**, not an exact trigger — see Known limits |
| `teamDistrictCache`, `teamInfoCache`, `eventTypeCache` | none | district membership, team identity and event types are fixed for the season. Audited and deliberately left alone |

## What changed

**`public/index.html`**

- `hasScore(m)` factored out of `scoreMap()` — one definition of "both alliances
  reported a non-negative score", shared with `sbVer()`.
- `sbVer(team)` added beside it; reuses `hasScore()` and `teamsOf()`.
- `SB_TTL_YEAR` / `SB_TTL_MATCHES` **deleted**. `_sbGet()` loses its `ttl` parameter and
  gains `ver`; entries are `{d, ts, v}` and freshness is `hit.v === ver`, full stop.
  `ts` survives only to order the existing `SB_MAX` LRU eviction.
- A version mismatch still behaves as stale-while-revalidate (paint instantly, correct
  via `onFresh`) — a known-stale EPA for one render beat beats a blank panel.
- `_sbPending` in-flight dedup added. One version bump can wake several callers of the
  same key at once (the 30 s poll, an open EPA overlay, the prediction rebuild); without
  it they each fired their own request for the same URL. `onFresh` is attached *outside*
  the shared promise so every caller is still notified when they collapse onto one fetch.
- `sbUrl(u, ver)` appends `_cb=<version>` — **hosted mode only**. Self-hosted talks to
  Statbotics directly and must not be handed a parameter the API never declared.
- `memoGet` / `memoPut` — the same idea minus persistence and SWR, for the three TBA
  memos. Returning the `{v, d}` wrapper rather than the value keeps a cached `null`
  (a team with no district) distinguishable from a miss, which the old `team in cache`
  test handled and a truthiness check would not.
- **Poll ordering (30 s loop):** `fMx()` is now awaited *before* `fMyYear()`/`fPred()`
  instead of racing them inside one `Promise.all`. They read `tbaMx` to compute their
  version, so racing meant a posted score took two polls (up to 60 s) to reach the EPA
  and prediction panels instead of one.

**`worker.js`**

- `_cb` is stripped from the params before `upstreamUrl` is built, then re-appended when
  building `cacheKey`. The version therefore partitions the edge cache without ever being
  sent to the API. That cache URL is only ever a key; it is never fetched.
- `/api/statbotics` gains `bustCache: 3600`, used *only* when `_cb` is present — a
  versioned URL is immutable by construction, so it can be held far longer than the blind
  120 s a plain URL gets. A client on a stale cached `index.html` sends no `_cb` and
  correctly falls back to 120 s.
- Nexus / TBA / YouTube are untouched at 10/30/60 s: they declare no `bustCache`, so even
  a stray `_cb` only strips, never extends.

This is the piece the original deferral called "the harder part". Cloudflare's Cache API
has no push invalidation — only lazy `match`/`put` by URL — so a varying key is the only
way to punch through an edge entry without adding a KV or Durable Object binding, which
this project has deliberately stayed without (see the Nexus webhooks rejection).

## Cost

Only two things read a versioned cache on a loop: `fMyYear()` → `getTeamYear` and
`fPred()` → `getEventMatches`. Everything else is read only when a human opens the EPA
overlay. So a scored match costs **2 automatic requests, once**; between matches, zero.

At a ~7-minute qual cycle that is **~17 requests/hour against the old ~3.5** — about 5×
more during active play, in exchange for staleness capped at one poll instead of 20
minutes (predictions) or 2 hours (EPA). It drops to **zero** during breaks, overnight and
between events, where the old TTLs kept polling every 20 minutes forever. In hosted mode
every display shares one edge entry, so 17/hr is the cost for the whole event no matter
how many pit displays are running.

## Known limits

- **A Nexus demo event cannot exercise any of this.** No TBA counterpart means `tbaMx` is
  empty, `sbVer()` pins at `<key>:0`, and nothing ever invalidates. Correct degradation,
  but it means the project's only integration fixture is blind here — which is why this
  landed with the browser-console suite described below instead.
- **If TBA is down, Statbotics data stops refreshing.** `tbaMx` holds its last value, so
  the version freezes. Previously the TTL would have forced a refetch. Acceptable — with
  TBA down no scores are visible anyway — but it is a real consequence of dropping TTLs.
- **An idle event freezes `team_year` world ranks.** Overnight, nothing at this event is
  scored, so ranks shifted by other time zones won't appear until play resumes.
- **`advCache`'s trigger is a proxy.** District points really move when an *event ends*,
  which no signal here tracks; this refreshes them as *our* event plays. A rank can still
  lag another district's event by a cycle. Strictly better than the previous "never".

## Failure backoff (added after V3.5.0)

The version cache only quiets a display that **has** data. With a cold cache and a dead
upstream there is nothing to serve stale, so every read takes the cold path and
refetches. Measured live on V3.5.0 during the Statbotics outage: two `_sbGet` calls per
30s poll, and because Statbotics answers in 9–14s while `getTeamYear` allows 8s, every
attempt aborts and `fetchWithRetry` burns all three retries — **up to 720 raw requests
per hour, per display**, at a service that has been down since ~July 2026. The Worker
deliberately never caches a 5xx, so the shared edge cache amortizes none of it either:
every display generates its own live subrequest.

`SB_BACKOFF` fixes this. A failed key refuses to retry until a deadline, backing off
30s → 1m → 2m → 5m → 15m → 30m and then holding. At the cap that is 4 `_sbGet` calls
per hour across both polled keys — **a 60× cut**. Three properties matter:

- **A cold read under backoff rejects immediately** instead of hanging ~14s, so the EPA
  overlay's error state appears at once rather than after a stall.
- **A warm read under backoff still serves stale** — never blank.
- **Any success clears the entry**, so recovery needs no intervention when Statbotics
  returns. `bustTeamCache()` clears it too, or the overlay's manual ↺ Retry would be
  silently inert for up to 30 minutes — the one moment the user has explicitly asked.

Deliberately **not** persisted: a page reload is a user action and earns one fresh
attempt. ⚙ Settings ▸ Run connection check bypasses it entirely (it does its own
fetch), so the outage stays diagnosable on demand.

**Known amplifier, not addressed here:** `getTeamYear`'s 8s timeout is shorter than
Statbotics' current latency, so each permitted attempt still costs 3 raw requests rather
than 1. Raising the timeout or making timeouts non-retryable would recover another 3×,
but it changes retry semantics for every caller, so it was left alone.

## Correction: `getTeamYear` was event-wide, and shouldn't have been

It shipped in V3.5.0 taking the **event-wide** version, justified like this: `team_year`
carries world/country/state/district ranks, which move as any team anywhere plays, so
narrowing it would freeze the My Team rank row between our own matches.

**That premise is false.** Statbotics recomputes those four ranks only **once per event**.
They do not move at match cadence, so the event-wide version was buying ~8.5 refetches
per hour to observe a number that had not changed. It was not a freshness tradeoff — it
was pure overhead with no correctness benefit at all.

The app surfaces exactly two things from `team_year`:

| field | changes |
|---|---|
| `epa.ranks.{total,country,state,district}.rank` — the four pills | once per event |
| `epa.breakdown` — the EPA value behind the charts | when **that team** plays |
| `country` / `state` / `district` — label strings | never, within a season |

So `sbVer(team)` captures 100% of what actually moves.

### Why it matters more than it looks

`getTeamYear` is the **only Statbotics call that scales with display count**.
`getEventMatches` is one shared URL per event however many displays are running, but
every display polls its own `team_year`. The single-display "~5x more requests during
play" figure quoted above therefore understates the fleet picture badly:

| displays at one event | before V3.5.0 | event-wide | team-narrowed |
|---|---|---|---|
| 1 | 3.5/hr | 17/hr (4.9×) | ~10/hr (2.9×) |
| 40 | 23/hr | 349/hr (15.2×) | **~50/hr (~2×)** |

Across 40 simultaneous events with 40 displays each, that is ~2,000 req/hr rather than
~14,000 — on a free community API. Narrowed, PitFusion is better than the old TTLs on
freshness *and* within ~2× on load, instead of 15×.

### The part that could have gone wrong

`sbVer(team)` keys on the **subject** team, not the **viewing** team, so every display at
an event computes the same `_cb` when opening the EPA overlay on team X. Edge-cache
sharing is fully preserved. Had it keyed on the viewer, narrowing would have fragmented
the cache one way per display and made things strictly worse.

### Caveat

The once-per-event rank cadence came from the project owner and could not be verified
against live data — Statbotics has been down since ~July 2026. If it turns out ranks move
more often, the cost is a rank pill lagging until the team's next match (~45 min during
quals); EPA correctness is unaffected, and it reverts by changing one argument. On the
January re-verification list.

## Verification

No test harness exists and no Node runtime is installed on the dev machine, so this was
verified by driving the real code in a browser — which suited it better than the usual
demo-event pass, since a demo cannot reach these paths at all.

**74 assertions, all passing**, run from the console against `public/index.html`:

- `hasScore` / `sbVer` (16) — unplayed `-1`/`null` rejected, `0–0` accepted as a real
  score, event-wide vs team-narrowed counts, scoring a match bumps exactly the teams that
  played in it, empty `tbaMx` pins at `:0`.
- `scoreMap` regression (5) — output unchanged after the `hasScore` refactor.
- `_sbGet` (18) — cold fetch; same version = zero network; a **24 h-old entry with an
  unchanged version still issues no request** (the TTL really is gone); a version bump
  serves stale instantly then fires `onFresh`; 4 concurrent callers collapse to 1 request
  and the pending map is cleaned up; a failed revalidate keeps serving stale while a cold
  failure rejects so the caller can show Retry; `bustTeamCache()` still forces a refetch.
- `memoGet` / `memoPut` (6) — including that a cached `null` is a hit, not a miss.
- `sbUrl` + the three getters end-to-end (11) — self-hosted sends **no** `_cb`; hosted
  proxies through `/api/statbotics` with `_cb` appended using `?` or `&` as appropriate
  and the version URL-encoded; `getTeamMatches` uses the team-narrowed version while
  `getTeamYear` / `getEventMatches` use the event-wide one.
- `worker.js` (18) — imported as a module with a stubbed edge cache and upstream:
  `_cb` never reaches Statbotics and leaves no stray `?`; it *is* in the cache key; real
  query params survive the strip; `max-age=3600` with `_cb` and `120` without; the same
  version = 1 upstream fetch for 2 requests while a bump punches through; Nexus/TBA/
  YouTube keep their own TTLs and key injection; upstream errors are `no-store` and never
  cached.

A consolidated 49-assertion subset was re-run against the final file after the last
edits; 49 passed, 0 failed.

Note `?forceMode=hosted` needs a real HTTP origin — the desktop preview pane snapshots a
`file://` page to a `data:` URL and drops the query string. `python -m http.server` from
`public/` is enough.

Still outstanding, needing a real in-season event (the same gap as #50's TBA-driven
paths): end-to-end confirmation against live TBA + Statbotics + a deployed Worker. The
highest-value manual check there is the **quiet-period check** — park the display on a
finished event for ~10 minutes with the Network tab filtered to `statbotics` and confirm
it is silent. That is the headline behaviour change and the easiest regression to spot.
