# Feature 14 — match13 as a second ratings provider

Status: **designing**. Size: M–L (likely two PRs: provider + selector, then the new
displays).

Prompted by Statbotics going down again (2026-10-09: every `/v3` endpoint tried —
`team_year` for 2025 and 2026, `team_event`, `matches`, `event` — answers 500). The last
outage ran ~July–October 2026. Statbotics also tracks **no offseason events at all**, so
even when it is up, every offseason event PitFusion runs at gets no EPA and no
predictions.

[match13](https://www.match13.com/docs/api) publishes its own rating model (**xP**), match
forecasts, and event simulations through a keyed read API. This doc covers adding it as
a second provider, selectable as **Statbotics**, **match13**, or **Both**.

## What was verified, and how

Everything below the API summary was checked against live responses from a throwaway
key on 2026-10-09 (11 requests), not inferred from the OpenAPI schema. Per this
project's rule — never design against a payload you constructed — the schema was
treated as a hint and the responses as the truth. Where they disagree it is noted.

| request | result |
|---|---|
| `GET /v1/years` | 200 — 2002–2026 (no 2021) |
| `GET /v1/teams/88/years/2026` | 200 — `xp` 156.1, `rank` 230, `percentile` 93.8 |
| `GET /v1/teams/88/years/2026?scope=all` | 200 — `xp` 201.0, `rank` 86. **Scope moves the numbers a lot** |
| `GET /v1/teams/88/years/2026/events?scope=all` | 200 — per-event start/end/mean/max, `sos`, `districtPoints` |
| `GET /v1/events/2026mndu2/teams` | 200 — 42 teams |
| `GET /v1/events/2026mndu2/matches` | 200 — 93 matches: 77 `qm`, 13 `sf`, 3 `f` |
| `GET /v1/events/2026mndu2/sim` | 200 — 25 000 iterations, simmed today, settled (p5 = p50 = p95) |
| `GET /v1/events/2026cc/matches?scope=all` | 200 — **offseason event**, 86 matches, all forecast |
| `GET /v1/events/2026cc/teams` | 200 |
| `GET /v1/events/2026mibig1/matches?scope=all` | **404** — not carried. Not every offseason event is covered |
| `GET /v1/years/2026/events?scope=all` | 200 — 351 events, **127 offseason** (incl. 2026cc, 2026mnros1) |

Observations that matter for the design:

- **Match keys are TBA's** (`2026cc_qm1`, `sf11m1`, `f1m2`), so they map straight onto
  `nl()`'s `qual_N` / `sf_N` / `f_N`. The predictions feature needs no new matching logic.
- **Unplayed matches carry a forecast.** 2026cc `f1m3` (never played — the final went 2–0)
  has a full `pred` with every `*Post` value `null`, exactly as documented.
- **`epa` is match13's own value, not a passthrough of Statbotics.** It is populated for
  2026cc (254 → 303.3), an event Statbotics has never tracked, while Statbotics is down.
  It can't be used as a stand-in for "Statbotics' EPA"; it is a third model.
- **`matches[]` is not in play order** — 2026cc lists `f1m3` before `f1m1`. Sort by key
  (via `nl()`), never by array position.
- **`bye` is in the schema as a required boolean but absent from all 179 matches seen.**
  Treat as optional.
- **`components` is `{}` for 2026** — the season publishes no gamepiece estimates.
- **The sim survives the event.** The docs say it 404s "once the season it belongs to is
  over"; 2026 isn't over in match13's terms, so a completed event's sim is still served.

## API summary

Base `https://actions.match13.com`. Bearer key (`Authorization: Bearer m13_live_…`),
read-only, `application/problem+json` errors (RFC 9457).

- **No CORS headers.** A browser page cannot read it. This alone decides the
  hosted/self-hosted split below.
- **Rate limit is per account, shared by every key on it:** 60/min, 1 000/hr,
  30 000/week. **Every request counts — a 304 and an error included.** `X-RateLimit-*` and
  `RateLimit-Policy` headers report all three windows; a 429 carries `Retry-After`.
- One request costs 1, except `/v1/years/{y}/matches`, which costs 1 per 100 of `limit`.
- `Cache-Control: private, max-age=60` for the current season, `max-age=86400` for a
  finished one. ETag / `If-None-Match` supported, but a 304 still costs 1, so it saves
  bandwidth, never quota.
- `scope=season` (default) excludes offseason play; `scope=all` includes it. Event-level
  routes for an offseason event need `all`.
- Terms: "All rights reserved"; keys revocable without notice; gambling and faux-gambling
  apps prohibited.

## Field mapping

What PitFusion reads from Statbotics today, and its match13 equivalent.

| PitFusion use | Statbotics | match13 | |
|---|---|---|---|
| Win probability | `/v3/matches?event=` → `m.pred.red_win_prob` | `/v1/events/{k}/matches` → `pred.winProb` (red) | ✅ |
| Favored alliance | `m.pred.winner` | derived: `winProb >= 0.5 ? 'red' : 'blue'` | ✅ |
| Current total / auto / teleop / endgame | `team_year.epa.breakdown.{total,auto,teleop,endgame}_points` | `xp`, `xAuto`, `xTele`, `xEnd` | ✅ |
| RP rates | `breakdown.rp_1..3` | `xRp1..3` (season and event level) | ✅ |
| Per-match chart: total / auto / teleop / endgame | `m.epas[team].{epa,auto_epa,teleop_epa,endgame_epa}` | `teams[team].{xpPost,xAutoPost,xTelePost,xEndPost}` | ✅ |
| Per-match chart: RP lines | `m.epas[team].rp_N_epa` | — | ❌ no per-match RP rating; those lines are omitted |
| World rank | `epa.ranks.total.rank` | `rank`, plus `percentile` | ✅ |
| Country / state rank | `epa.ranks.{country,state}.rank` | — | ❌ |
| District rank | `epa.ranks.district.rank` | — directly; **computable** (see Ranks) | ⚠️ |
| Team's season history (chart, "all" scope) | `/v3/matches?team=&year=` | no per-team match route; `/v1/teams/{t}/years/{y}/events` gives per-event start/end/mean/max | ⚠️ step chart per event, or one call per event |

`EPA_FIELDS` in `config.js` stays keyed on Statbotics field names. A sibling map in
`index.html` (beside `SB_YEAR_FIELD`) translates each key to its match13 field, and a key
with no equivalent (`rp_*_epa`) is simply skipped when the source is match13.

**The numbers are not interchangeable.** xP and EPA are both in points and land close
(team 88, 2026 season: xP 156.1, match13's own `epa` 156.8), but they are different
models. Labels must name the source — "xP" and "EPA" — and the footer credit gains
"xP by match13" whenever match13 data is shown.

## What match13 adds

None of this exists in Statbotics.

1. **Offseason coverage.** 127 offseason events in 2026. This is the main reason to do the
   feature at all: today every offseason event is an EPA and prediction blackout.
   Coverage is not total (2026mibig1 404s) — a 404 is `na`, same as TBA's.
2. **Projected final rank** — `/v1/events/{k}/sim` → `p5` / `p50` / `p95`, `meanRps`.
   My Team: "Projected #4 (2–7)". Only meaningful during quals; settles when the last qual
   is scored.
3. **RP chances per match** — `pred.redRp1..3` / `blueRp1..3`. Queuing card, under the win
   probability: "Energized 92% · Supercharged 31%" for our alliance, labelled from
   `EPA_FIELDS`' existing RP labels.
4. **Predicted scores with variance** — `pred.redScore` / `blueScore`, `redVar` / `blueVar`.
   Feature #1 deliberately shows no predicted scores; this doesn't change that by default,
   but it makes "predicted 645–570" available if the owner wants it.
5. **Strength of schedule** (`sos`) and **trend** (`xpFast` vs `xpSlow` — improving or
   fading) per team per event. EPA overlay, Event section.
6. **`xpPrePlayoff`** — rating at alliance selection. Useful on the bracket.
7. **District / regional seat forecasts** — `/v1/districts/{code}/{y}/teams`,
   `/v1/regionals/{y}/teams`. Would extend the FRC Advancement section with a
   qualification probability. Out of scope for the first PR.

## The selector

One setting, `localStorage` `pitfusion_ratings`: `'sb'` | `'m13'` | `'both'`. Default
`'sb'` — today's behaviour, unchanged for everyone who doesn't touch it. Lives in
⚙ Settings ▸ Display beside the predictions toggle, and on the setup screen.

| choice | meaning |
|---|---|
| **Statbotics** | today's app, byte-for-byte |
| **match13** | every rating, rank, chart and prediction comes from match13 |
| **Both** | each surface shows both where it has room; where it doesn't, it shows one with the other as fallback. Either source being down or not covering the event leaves the other showing on its own — so Both is also the outage-proof setting |

### Self-hosted mode cannot use match13

match13 sends no CORS headers, and self-hosted mode calls every API directly from the
browser. There is no way around that from a single HTML file. In self-hosted mode the
match13 and Both options render **disabled** with a one-line reason ("needs the
pitfusion.com proxy — match13 doesn't allow browser calls"), and a stored `'m13'` / `'both'`
reads as `'sb'`.

Rejected alternative: letting self-hosted displays call `pitfusion.com/api/match13`. The
Worker's origin allowlist refuses them, and it would spend the hosted deployment's quota
on displays we can't see or count.

### What "Both" shows, per surface

| surface | Both |
|---|---|
| Queuing card prediction | both probabilities, labelled ("EPA 62% · xP 58%"). Favored-alliance highlight **only when they agree**; when they disagree, no highlight — an honest toss-up |
| Queuing card RP chances | match13 only (no Statbotics equivalent) |
| Match list prediction | one number — no room for two. Statbotics, falling back to match13 (decided 2026-10-24) |
| My Team | EPA ranks row and xP ranks row; projected rank from the sim |
| EPA overlay — ranks | two sections, "Statbotics EPA" and "match13 xP" |
| EPA overlay — chart | a source toggle rather than both sets of lines on one axis; ten lines on two similar-but-different scales reads as one confusing chart |

## Architecture

### Worker route

```js
'/api/match13': { upstream: 'https://actions.match13.com', header: 'Authorization',
                  headerPrefix: 'Bearer ', env: 'MATCH13_API_KEY',
                  cache: 60, bustCache: 3600, negCache: 30 },
```

- `headerPrefix` is new: every existing route sends the bare secret.
- `Cache-Control: private` from upstream is already overwritten with `public` for 2xx.
  Doing so is redistribution of a "private" response — allowed (Open question 1).
- `MATCH13_API_KEY` is a new Worker secret. It should come from an account opened for
  PitFusion, not a personal one, since the quota is per account.

### Client

- `apiUrl()` rewrites `https://actions.match13.com` → `/api/match13`.
- A provider-generic version of the existing SWR layer: `_sbGet()` already takes a store,
  key, URL and version. match13 gets its own persisted store (`pitfusion_m13_<year>`) and
  its own `_m13Fail` backoff map, reusing `SB_BACKOFF`.
- **Same versions as Statbotics.** `sbVer()` derives from TBA's scored matches, and both
  models recompute exactly when a match is scored. Nothing about Feature 13's
  event-driven cache needs rethinking — `_cb` already works for any route that declares
  `bustCache`.
- `feed.match13` beside `feed.statbotics`, listed in the status popover, and like
  Statbotics it **never moves the pill**.
- ⚙ Settings ▸ Run connection check gains a match13 probe: `GET /v1/years` (1 request),
  hosted only.
- `scope`: `all` when TBA's event type is offseason (`eventTypeCache` already holds it),
  `season` otherwise.

### Which calls, and who makes them

The design goal is that **no match13 call scales with the number of displays.** Every
URL below is either shared by every display at an event, or only fired when a human
opens something.

| call | when | version | shared by |
|---|---|---|---|
| `/v1/events/{k}/matches` | 30 s poll (predictions, current xP for every team, chart data at this event) | `sbVer()` | every display at the event |
| `/v1/events/{k}/sim` | 30 s poll, **quals only** — stop once every qual is scored | `sbVer()` | every display at the event |
| `/v1/years/{y}/teams?limit=1000&page=1..N` | world rank + percentile, for the leaderboard | blind 3600 s at the Worker | every display at **every event** in that Cloudflare colo |
| `/v1/events/{k}/teams` | EPA overlay open (sos, `xpPrePlayoff`, event `xRp*`, district points) | `sbVer()` | every display at the event |
| `/v1/teams/{t}/years/{y}/events` | EPA overlay open, season-history chart | `sbVer(t)` | every display opening that team |

The current-xP-for-every-team point is what makes this work: `/v1/events/{k}/matches`
carries every team's `xpPost` after every match, so a team's current rating is its
latest `xpPost`. The Statbotics design has to poll `team_year` per display for the same
number — the one cost in that design that grows with display count (`getTeamYear`, see
`CLAUDE.md`). match13 lets us drop it.

Never on a poll: `/v1/teams/{t}/years/{y}` (per-team; only needed for `components`, which
is empty) and `/v1/matches/{key}` (the event route already has every match).

### Ranks

match13 has world rank and percentile only. The leaderboard route returns every team's
`rank` in a few pages (≈3 700 teams at `limit=1000`, 1 request a page). **District xP rank**
is computable from it: TBA's `/district/{key}/teams` (one call, season-static, already the
kind of thing `teamDistrictCache` holds) gives the members, and their order on the
leaderboard is the rank. Country and state would need every team's location — eight TBA
pages — and are left out.

The leaderboard is the one place this design uses a blind TTL rather than a version, an
exception to Feature 13's "no TTLs anywhere". World rank moves when *any* team in the world
plays, and nothing PitFusion polls observes that, so there is no shared upstream signal
to version on. An hour's lag on a world rank is fine; Feature 13 already accepts the same
lag for Statbotics ranks overnight.

## How the rate limit scales

The limit is per account, so every hosted display at every event draws on one
allowance. Two Cloudflare facts set the shape:

1. **The Worker's edge cache (`caches.default`) is per data center, not global.** Displays
   share an entry only if they hit the same colo. Displays at one venue on the venue's
   network almost always do. Phones in the stands on cellular may not. So the true
   multiplier per event is **the number of colos its displays reach, typically 1–3**, not
   the number of displays.
2. **Versioned URLs are immutable**, so a colo fetches each one once per score.

### Per event, per hour of quals

Assume a ~7.5-minute qual cycle (2026cc ran 7.5–8.5), so ~8 scored matches an hour,
and each team plays ~1.3 times an hour.

| design | cost per event per hour | 10 displays | 40 displays |
|---|---|---|---|
| Naive port of the Statbotics shape (shared event matches + per-display `team_year` equivalent) | 8 + 1.3 × D | 21 | 60 |
| **This design** (event matches + sim, both shared) | **16 flat**, + overlay opens | **~20** | **~20** |
| … plus each extra colo the event's displays reach | × colos | ~40 at 2 | ~40 at 2 |
| Leaderboard (world rank) | 4 pages per colo per hour, shared by **every event** in that colo | — | — |

Display count drops out entirely. During playoffs the sim stops and the cycle slows, so it
falls to ~6–8/hr. Between matches, overnight, and during breaks it is **zero** — nothing
is versioned on a clock.

### Against the three windows

| window | limit | what it allows |
|---|---|---|
| **per hour** | 1 000 | the binding one on a busy Saturday. At ~20/hr per event plus the leaderboard (4/hr × ~20 colos US-wide = 80): **~45 events at once**, single colo each; **~23** if every event's displays split across two colos |
| **per week** | 30 000 | an event weekend (~90 scored matches) costs about 90 (matches) + 70 (sim) + overlay opens and cold starts (~50) + its share of the leaderboard ≈ **300**. That is **~100 event-weekends a week** — not binding |
| **per minute** | 60 | only at startup. Day 1 morning, the first display at each event costs 2 (matches + sim) + the leaderboard per colo. On day 2, a display that ran on day 1 costs **nothing**: the overnight version hasn't moved, so its `localStorage` SWR entry is still fresh and no request is made (a brand-new display costs one per URL per colo, since the edge entry expired overnight). ~25 events cold-starting in the same minute is the ceiling, and SWR plus `Retry-After` turns overflow into data arriving a minute late |

For scale: PitFusion would have to be running at roughly two-thirds of a peak
regular-season weekend's events, simultaneously, before the hourly window bites. That is
far beyond current use, but it is the number to watch — and match13's docs invite asking
for more ("Lmk if you have a weird use case").

**Both** costs the same match13 quota as match13-only. The Statbotics half is keyless and
unmetered.

### The real risk: failure amplification

The steady-state numbers above are small. What can blow the allowance is an outage,
because **a 429 and a 5xx each cost 1**:

- `fetchWithRetry` makes 3 attempts, and the Worker deliberately never caches a non-2xx,
  so every display's every retry reaches upstream. Measured during the Statbotics outage
  (Feature 13, "Failure backoff"): up to **720 requests/hour per display** before
  `SB_BACKOFF` existed. One display behaving like that would spend the entire hourly
  allowance on its own.
- A 429 answered with more requests extends the lockout for every event at once.

So, required, not optional:

1. **Negative-cache at the Worker.** Cache a 429 for `Retry-After` seconds and a 5xx / 404
   for `negCache` (30 s) per colo, keyed on the same URL. One display learns the answer for
   every display behind that colo. A 404 (`sim` not run yet, event not carried) is a
   *stable* answer and can be held for the versioned `bustCache` instead.
2. **Per-colo circuit breaker.** On any 429, the Worker writes a marker into
   `caches.default` (`/__m13_backoff`, `max-age = Retry-After`) and answers every match13
   request in that colo with a synthetic 429 until it expires, without touching
   upstream. Cache API only — no KV or Durable Object, matching this project's existing
   constraint. It can't stop *other* colos from each spending one request to learn the
   same thing, but it bounds them to one each.
3. **Client: one attempt, not three,** for match13, and honour `Retry-After` as the
   backoff floor. `SB_BACKOFF` (30 s → 30 m) on top.
4. **Log `X-RateLimit-Remaining`** from the Worker so headroom is visible before it
   runs out.

## Open questions — for the owner and for match13

1. ~~**Permission to edge-cache and redistribute.**~~ **Resolved 2026-10-24: allowed**
   (confirmed by the owner). Sharing one cached response among every display at an event
   is the whole cost model, so this was the blocker to building. Also settled with
   match13 the same day: a pit display showing win probabilities is **clear of the
   faux-gambling clause**, and **no limit increase up front** — match13 want to see
   whether PitFusion actually gets rate-limited before raising it. So the stock
   60/min · 1 000/hr · 30 000/week applies at launch, and the failure-amplification
   guards and `X-RateLimit-Remaining` logging above are what will show whether an
   increase is needed.
2. ~~**Both on the match list**~~ **Decided 2026-10-24: Statbotics first**, falling back to
   match13, as proposed.
3. **Predicted scores** *(owner wants a mock-up before deciding)* — show them in match13 mode, or keep Feature #1's "no predicted
   scores" rule for both sources?
4. **Season-history chart** *(owner wants a mock-up before deciding)* — per-event step chart from `/teams/{t}/years/{y}/events`
   (1 request), or per-match from each event's matches route (3–6 requests, but those URLs
   are finished events and cache for a day)?
5. ~~**Default for offseason events.**~~ **Decided 2026-10-24: yes, fall back.** With the selector on Statbotics, an offseason event
   shows nothing. Should Statbotics mode silently fall back to match13 when Statbotics
   doesn't cover the event? That makes the default useful at offseasons without anyone
   finding a setting — but it means "Statbotics" no longer strictly means Statbotics.
   Accepted: the selector reads as "preferred source". Labels and the footer credit must
   still name match13 / xP whenever the fallback is what is showing.

## Testing

- **A Nexus demo event cannot exercise this** (no TBA → `sbVer()` pinned, and no match13
  event exists for a demo key). Same limit as Feature 13.
- **Unlike Statbotics, it can be tested live right now.** match13 covers offseason
  events, and the fall offseason is running. Pick one from
  `/v1/years/2026/events?scope=all` that TBA is ingesting this weekend and watch the
  version bump land a new `pred` through the Worker.
- Completed fixtures: **2026mndu2** (official, 93 matches, settled sim) and **2026cc**
  (offseason, 86 matches, one unplayed final with a forecast and null `*Post`s).
- Exercise the failure path deliberately: point `MATCH13_API_KEY` at a revoked key for one
  colo and confirm one upstream 401 per `negCache` window, not one per display per poll.
- Budget the test key: every probe costs quota, and the hourly window is shared with
  whatever else uses that account.
