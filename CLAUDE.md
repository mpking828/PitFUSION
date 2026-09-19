# PitFusion — Project Context

## What this is
FRC pit display built on Nexus and The Blue Alliance APIs.
Single HTML file, no framework, no build step.

## Current state (V3.0.0, feat/v3-cloudflare)
- Single codebase. `public/index.html` is the whole app; `public/config.js`
  is non-secret config only (EPA field defs + optional `FORCE_MODE`).
- Runtime `MODE`: `hosted` on pitfusion.com / *.workers.dev / *.pages.dev, else
  `selfhosted`. `?forceMode=hosted|selfhosted` and `config.js` `FORCE_MODE` override.
- Hosting = **Cloudflare Worker with static assets** (new accounts have no Pages).
  `wrangler.toml` `[assets]` serves `public/`; `run_worker_first = ["/api/*"]`
  routes only the API paths to `worker.js`.
- hosted: data requests are rewritten (see `apiUrl()`) to same-origin `/api/nexus`,
  `/api/tba`, `/api/youtube`, `/api/statbotics`; `worker.js` injects the key from
  secrets (`NEXUS_API_KEY`, `TBA_API_KEY`, `YOUTUBE_API_KEY` — Statbotics is keyless,
  no secret to inject), origin-allowlists, and edge-caches (10/30/60/120s). The
  edge cache is keyed on the upstream URL alone, so every viewer of the same event
  shares one cached response — team number is a client-side filter, never sent to
  any of these APIs.
- selfhosted: direct calls with keys from the ⚙ Settings panel (localStorage
  `pitfusion_keys`). Nexus + TBA required (gated in `setupLaunch`), YouTube optional.
- No build step. `public/index.html` is served at `/` natively; `public/_headers`
  sets security headers (honored by Workers static assets).

## Connection status
- Header pill (Connected / Degraded / Offline) + tap-open `#status-pop` + `#stale-banner`,
  all driven by `feed` (`feedOk`/`feedFail`/`feedNA`) and `connState()`, re-rendered every
  second off the header-clock interval.
- **Deliberately weighted — don't make every feed count equally.** Nexus is the only
  source that can go red (last success ≥ 180s) or raise the banner; ≥ 45s is amber. TBA
  can only degrade to amber (failing ≥ 120s), and a TBA 404 is `na` ("no data for this
  event" — demos, unlisted off-season events), not a failure. **An offseason event TBA
  has listed but not yet ingested is a different case and does NOT reach that rule**:
  2026cc returned HTTP 200 with `[]` for `/event/2026cc/matches` while the event record
  itself resolved fine, so it reads as `feedOk` with zero matches. Same practical blackout
  as a demo — `sbVer()` pinned at `2026cc:0`, empty `scoreMap()`, no predictions — by a
  different route. Statbotics is listed but never moves the pill (it's been down for
  months; counting it = amber all season).
  YouTube is excluded: probed once at stream render, so its status would be stale.
- Colour is keyed on the AGE of the last success, not the last attempt, so one dropped
  request doesn't flash the pill. `stamp()` now only records `lastRender` for the popover.

## Themes
- Four themes via `data-theme` on `<html>`+`<body>`: `dark` `light` `tj2` `custom`.
  Picker in Settings ▸ Appearance and on the setup screen (`renderThemeSwatches`,
  `THEMES` array). Choice in localStorage `pitfusion_theme`.
- Colours + a background image + frosted panels are driven by CSS custom
  properties. Generalised tokens (`--page-bg-*`, `--hdr-bg-*`, `--glass-*`,
  `--on-accent`) default to no-ops on `:root`; a theme opts in. `body.page-has-bg`
  (set by `applyPageBg()`) gates the frosted-panel treatment.
- Custom theme: built-in `[data-theme="custom"]` block is the fallback; the
  in-app editor (Settings ▸ Appearance ▸ Edit Custom theme) saves JSON to
  localStorage `pitfusion_custom_theme` and `buildCustomThemeCss()` injects an
  override into `<style id="custom-theme-style">` (pre-paint in the head script,
  no flash). Uploaded background images are downscaled to 1920 px and re-encoded
  as JPEG; input over 30 MB is rejected, as is a stored data URL over 3.5 MB.
- `tj2` still carries ~195 fine-grained overrides — see docs/features/08 for the
  planned collapse. User-facing guide: docs/custom-theme.md.

## Update check / releases
- checkForUpdate() runs in selfhosted mode only; fetches
  https://pitfusion.com/version.json and shows a footer badge if newer.
- VERSION constant is at the top of public/index.html; keep it equal to
  "version" in public/version.json.
- Release: bump both, merge to main (Cloudflare Workers Builds auto-deploys `main`
  to pitfusion.com), tag `vX.Y.Z`, GitHub release with public/index.html
  attached. No `stable` branch, no channel-prefixed tags.

## Domain
pitfusion.com — Cloudflare managed

## Key Nexus API notes
- nowQueuing gates whether the event is active at all — but it is **not** the match
  on the field. Play order is `On field → On deck → Now queuing → Queuing soon`, so
  nowQueuing is the FURTHEST-OUT active match (the queue call for a match several
  slots ahead). `matches[indexOf(nowQueuing) - 1]` is the **on-deck** match.
  **That arithmetic holds only while the pipeline is two deep**, and there is a normal
  state where it isn't: On field, **nothing at "On deck"**, the next match "Now queuing",
  so `indexOf - 1` resolves to the match on the FIELD. Seen at two events:
  - 2026cc mid-practice — Practice 1 on field, Practice 2 queuing. Practice 2's
    `estimatedOnDeckTime` was clamped (overdue), so this one was the operator running
    late, and it cleared on the next call.
  - 2026mibig1 (FSR) at the **first match of quals** — Q1 on field, Q2 queuing, Q1 and Q2
    queued three seconds apart. Nothing was late; there had simply been no earlier match
    to occupy the On deck slot.
  So treat one-deep as **structural at the start of a phase** and transient elsewhere, not
  as a symptom either way. Nothing broke at either event because `fieldState()` reads
  statuses, never the index — which is the reason to keep using it rather than
  re-deriving from nowQueuing.
- Nexus permanently leaves all matches at status "On field" after they're played
- Stale "On field" entries are always EARLIER in play order than the live one, so the
  **last** "On field" is the real one — self-correcting, no staleness heuristic needed.
  `fieldState()` is the single source of truth; use it rather than re-deriving.
  Confirmed at 2026cc **three minutes into the event**: Practice 1 and Practice 2 both
  at "On field" at the second match played. The pileup starts immediately, not late in
  the weekend — which is exactly what the old `activeCount<=3` guard got wrong.
- Never rely on match status alone — gate on nowQueuing being non-null
- **Absent nowQueuing means "not queuing", not "on a break".** FOUR states share it, all
  observed on a demo event:
  1. **the event hasn't started** — nothing has ever been at "On field". `eventNotStarted()`.
  2. **a scheduled break** — the last "On field" match carries a `breakAfter`. `activeBreak()`
     names it.
  3. **a phase gap** — practice finished, quals not queued yet. Every practice match is
     "On field", every qual "Queuing soon", and no `breakAfter` anywhere. Renders as the
     bare "On Break" badge, which is fair: play really is paused.
  4. **end of day** — same shape as (3) with nothing left to queue.
  Tell (1) apart by the field, (2) by `breakAfter`. (3) and (4) are not currently
  distinguished, and the bare badge implies play resumes — a known gap at end of day.
- **The queue pipeline stops at any interruption — a phase change or a scheduled break.**
  It normally runs two deep (with Practice 1 on deck, Practice 2 is already "Now queuing"),
  then stops dead at the last match before the interruption. Observed twice:
  - *phase change* — Practice 6 on deck, Qualification 1 still "Queuing soon", never
    queued. So nowQueuing is never a qualification while a practice match is unplayed,
    which is why keying phase on nowQueuing is safe at that seam.
    **Confirmed at a real event.** At 2026cc, with the full 70-match qual schedule posted
    in both Nexus and TBA, `nowQueuing` was still `"Practice 11"` and Qualification 1 sat
    at "Queuing soon", unqueued. The rule was derived entirely from a demo; this is the
    first time real FMS scheduling and a real queue crew have been held against it.
  - *break* — Q19 on field, Q20 on deck with `breakAfter: "End of day"`, and **nowQueuing
    collapsed onto Q20 itself with nothing at "Now queuing" at all**. Q21 was not queued
    and would not be until the break ended.

  So when a break follows the on-deck match there IS no queuing match, and the Queuing
  slot must not invent one — the break occupies that slot instead. An early instinct that
  the strip should read `Q19 | Q20 | Q21` there was wrong for this reason: it would assert
  a queue call Nexus never made. See `rQ()`'s sequence model.
- **Real `breakAfter` strings, from 2026cc's posted qual schedule** — the names are free
  text from the event, so match them loosely, never by equality:
  `Qualification 16 → "Lunch"`, `Qualification 35 → "Lunch"` (two, on the same day),
  `Qualification 56 → "End of day"`, `Qualification 70 → "Alliance selection"`.
  `alliancesPosted()` keys on that last one with `/alliance/i`; note it sits after the
  LAST qualification, so the "selection break played" and "every qualification played"
  arms of that gate open at the same moment rather than one racing the other.
  Confirmed at a second event the same weekend — 2026mibig1 (FSR), a 27-qual one-dayer:
  `Qualification 10 → "Lunch"`, `Qualification 27 → "Alliance selection"`. Same spelling,
  same position after the final qualification.
- **The On Field slot is the sequence position BEFORE the on-deck match, and it can be -1.**
  On the first queue call of the event the on-deck match is the first match in the
  schedule, so that slot falls off the front and belongs empty. Don't clamp it to 0 — that
  puts the on-deck match on the field and shifts the whole strip (fixed in #62).
- **actualQueueTime is set the moment Nexus makes the queue call**, so its presence means
  the call is history, not a forecast. Label it "Queued", never "Est. Queue".
- **The full `times` key set is nine fields** — five `actual*`, four `estimated*`.
  Recorded at 2026cc (practice); `actualOnFieldTime`, `actualStartTime` and
  `actualCommitTime` had never been seen before that.
  ```
  actualQueueTime  actualOnDeckTime  actualOnFieldTime  actualStartTime  actualCommitTime
  estimatedQueueTime  estimatedOnDeckTime  estimatedOnFieldTime  estimatedStartTime
  ```
  **An `actual*` is stamped only if the match actually passes through that stage, so the
  presence of one never implies another.** Two gaps in one 2026cc feed, both structural:
  Practice 1 has no `actualOnFieldTime` (first match of the event — the stamp comes off the
  PREVIOUS match's commit, and there was no previous match), and Practice 2 has no
  `actualOnDeckTime` (it jumped straight from "Now queuing" to "On field" during the
  one-deep transient above, never occupying the On deck slot). Don't gate on a field you
  haven't seen on that specific match. Note the corollary: a missing `actual*` does NOT
  mean the stage is still ahead — Practice 2 lacked `actualStartTime` for six minutes
  simply because it had not started yet, then got one at 22:26:02.
- **`matches[]` grows during the event — it is not the fixed schedule it looks like.**
  2026cc went from 8 practice matches to 11 mid-session as the queue crew extended
  practice. Appends land at the end, so the positional reasoning in `matchPlayed()` is
  unaffected, but nothing may assume the array length or a match's index is stable
  across polls.
- **`actualCommitTime` has so far appeared on every played match and on no unplayed one**
  (2026cc: Practice 1 and 2 committed, Practice 3 on the field with a start but no
  commit). That makes it a candidate Nexus-native "this match is done" signal for
  `matchPlayed()`, which is otherwise positional and blind without TBA — it would close
  the last-match-of-a-phase and end-of-day cases. Practice only so far; confirm on quals
  and playoffs before relying on it.
- **`estimatedStartTime` collapses onto `actualStartTime` the moment a match starts**, and
  the whole remaining schedule rigidly shifts by the same delta — no per-match recompute.
  At 2026cc, Practice 1's projected 22:18:07 was overwritten to 22:15:51 (its actual start)
  and every later match moved 2m16s earlier in one step.
- **`scheduledStartTime` is a QUALIFICATION field.** Observed for the first time at 2026cc
  the moment the qual schedule posted: all 70 quals carry it, every practice match still
  has none — confirmed across five samples including practice matches that had started
  *and* committed. So the field is not absent at a real event, it is absent from the
  phases that have no FMS schedule behind them: practice, playoffs (per the API docs'
  "not set for playoffs" clause) and demos. 2026cc's quals run on a ~7.5–8.5 min cadence,
  Q1 at 09:45 PT and Q70 two days later.
  Confirmed at a second event the same weekend — 2026mibig1 (FSR): 27 quals, all with
  `scheduledStartTime`, none of the other phases present at all.
  This is what the "Nm behind / Nm ahead" pill measures `estimatedStartTime` against —
  see the demo-section note, including what a day-shifted schedule does to it.
- **Nexus never publishes an estimate in the past.** When a queue time comes due and the
  operator hasn't queued, Nexus replaces the estimate with `dataAsOfTime` exactly; the
  operator's dashboard labels such a match "Expected soon". That single clamp explains
  both the mid-break collapse and the overdue pre-event start. So the test for a usable
  time is "is it ahead of `dataAsOfTime`" (`queueTimeOf()`) — **not** a minimum lead; a
  threshold discards real operator-set times as they approach.
  **The clamp applies only while the matching `actual*` is absent.** Once the actual
  exists the estimate mirrors it and is allowed to sit in the past — 2026cc Practice 2
  had `estimatedOnFieldTime` = `actualOnFieldTime`, two minutes old. `queueTimeOf()` is
  safe here only because it checks `actualQueueTime` separately.
  Corollary: a match with no `actual*` for a given stage has that estimate rewritten to
  `dataAsOfTime` on **every** poll, forever, even after the match is over. Practice 1's
  `estimatedOnFieldTime` walked with the clock long after it was played and committed,
  ending up LATER than its own `estimatedStartTime`. Treat such a value as "not a time".
- Phase (practice vs quals) comes from what the field is doing, never from "are there
  unplayed practice matches" — an event that cuts practice short leaves them at
  "Queuing soon" forever. `eventInPractice()`.
- Parts request fields: p.requestedByTeam (team number), p.parts (body text)
- TBA sf matches use set_number as the playoff match number (1-13), match_number is always 1
- **Partially-null `redTeams`/`blueTeams` are expected on practice matches** — teams sign
  up for practice slots, so an unfilled slot is `null` and a whole alliance can be null
  while the other is full (2026cc Practice 3: red complete, blue all null). Not a bug, and
  distinct from the playoff-alliance null slots below. `e(null)` renders `''`, so unfilled
  slots show as empty chips.
- **Playoff alliances and rosters come from Nexus, not just TBA.** `GET /event/{key}/alliances`
  returns `Array<Array<string|null>|null>`, positional by seed (index 0 = seed 1), each
  `[captain, 1stPick, 2ndPick]` — null slots while a pick is still open, confirmed live
  fully-populated post-selection. Separately, `matches[]`'s own `Playoff N`/`Final N`
  entries carry `redTeams`/`blueTeams` progressively DURING selection (captain + 1st pick,
  `null` third slot) — both arrive well before TBA's alliances, which are all-or-nothing,
  never partial. A replay match is labelled `"Playoff N Replay"`; `nl()`'s regex matches
  the leading `"Playoff N"` and collapses it onto the same bracket key as the original.
  Nexus never reports a score or `winning_alliance` — that stays TBA-only. Precedence:
  TBA wins any bracket key it has an entry for at all; Nexus fills every key TBA doesn't
  have yet. `bracketIndex()` rebuilds from scratch every render, so a later TBA correction
  simply wins on the next poll — nothing here is cached across renders.

## Deliberate display choices — do not "fix" these
Both look like bugs on sight. Both were examined against live data and kept on purpose;
confirm with the owner before changing either.
- **The Practice section stays visible through the phase gap, fully dimmed.** Practice has
  finished, quals are not queued, and `eventInPractice()` is still true because the last
  match on the field is a practice match. Reads as a stale panel; it isn't. Tightening it
  would mean keying on "are there unplayed practice matches", which is exactly the rule
  the bullet above forbids — an event that cuts practice short leaves them at
  "Queuing soon" forever and they would haunt the list all weekend.
- **Three match-list rows carry the active glow, not one.** `isAct` covers "On field",
  "On deck" and "Now queuing", so all three light up. Long-standing behaviour for
  qualifications; practice inherits it unchanged (verified byte-identical in #65). Narrowing
  it to the on-field match alone would silently change quals and playoffs too.

## Testing against Nexus — demo events
There is no test harness. A Nexus **demo event** is the only way to exercise real queue
states without waiting for a competition, and it is how the play-order rules above were
confirmed.

**Never design against a payload you constructed.** Every rule above that was inferred from
the schema turned out wrong when the real feed arrived — a 90s lead that discarded real
times, a pre-event payload assumed to contain quals when a reset demo is practice-only, and
a practice→qual seam assumed to queue straight through when it stops dead. Step the demo
into the state and record it (`curl` the proxy; Python `urllib` is 403'd by Cloudflare's
user-agent check), then design. Recording at 2s intervals across a transition is what
settled the break design.
- Create one at frc.nexus (guide: https://guides.frc.nexus/guides/demo-event); you drive
  the queue yourself, advancing matches through On deck → Now queuing → On field.
- It is served by the **public API** exactly like a real event:
  `GET /v1/event/<key>` returns `nowQueuing`, `matches`, `announcements`, `partsRequests`,
  `dataAsOfTime`. Works through the hosted `/api/nexus` proxy.
- Enter the key manually in the setup screen's Event Code field — demo events never appear
  in the this-week dropdown, which is populated from TBA.
- **Limits.** There is no TBA counterpart, so `fMx`/`fRk`/`fAlliances`/`fEv` all fail and
  scores, rankings and EPA stay empty — `scoreMap()` and predictions are NOT exercised.
  Teams are randomly generated, and demo events are reset periodically, so don't hardcode
  a key. **The Playoff Bracket is the exception**: rosters populate from Nexus's own
  `matches[].redTeams/blueTeams` and `/alliances` even with no TBA at all (see the Nexus
  API notes above) — only scores, `winning_alliance` and alliance `status` (record/
  won/eliminated) stay TBA-only and so remain absent on a demo.
- **The "Nm behind / Nm ahead" pill never renders on a demo, and that is correct.** It
  measures Nexus's `estimatedStartTime` against `scheduledStartTime`, which the API docs
  say is "not set for playoffs and whenever scheduled match times are not available".
  A demo has no FMS schedule, so `scheduledStartTime` is absent from every match —
  confirmed on a live demo feed: 42 matches, all four `estimated*` present, no
  `scheduled*` at all. Nothing to do with TBA. It is also permanently blank during
  playoffs at a real event, per the same clause — **and through all of practice at a real
  event too**, confirmed at 2026cc. So a demo is not the only thing that can't exercise it.
  **Qualifications are the one window where it can render**, which is why it looks broken
  in every test setup this project has. It is NOT unvalidated: the owner has watched it
  behave correctly at real events across 13 months. An earlier revision of this note
  claimed it had "never rendered anywhere" — that was inferred from this file's own
  records, which only ever cover demos and practice, and it is wrong.
- **A day-shifted `scheduledStartTime` makes the pill read in the thousands of minutes.**
  Seen once, at 2026mibig1 (FSR) on 2026-09-19: every qual's `scheduledStartTime` landed
  on 2026-09-18 while play ran on the 19th, so the header showed `+1449m behind` in red.
  The arithmetic in `updateScheduleDelay()` is right and the feed is what is wrong —
  subtract exactly 1440 minutes and the residual is a textbook delay curve (+8.3, +8.5,
  +7.8, +7.0 … decaying as the crew caught up, then slightly negative after lunch). Only
  the DATE is wrong; the time of day is correct. 2026cc's quals the same weekend were
  dated correctly, so the field itself is sound.
  **Deliberately not fixed** — first occurrence in 13 months of use, at a small offseason
  event, and the defect is upstream. If it recurs, the fix is a sanity ceiling in
  `updateScheduleDelay()` (hide beyond ~3h, which no real event slip reaches), NOT
  detecting and subtracting the day offset: that would invent a number from data already
  known to be untrustworthy and hide exactly the upstream error worth noticing.
- Practice matches are included, and since #65 `playedList()` keeps them so the match list
  can dim them correctly. `matchPlayed()`'s positional rule therefore applies to practice
  too; practice precedes the whole schedule, so qual/playoff indices are unaffected.
- **"Reset demo" (events page) is the pre-event fixture** — the only way to reach a state
  no live event will sit still for. A reset demo is **practice-only**: 6 practice matches,
  no qualifications, all at "Queuing soon", `nowQueuing` key absent, nothing at "On field".
  Add quals from the demo dashboard to get a posted schedule with nothing queued, and set
  "Practice 1 queues at" in the past or future to produce a clamped vs. projected estimate.
  Both pre-event bugs fixed in #60 were found here and nowhere else.
- **Transitions worth stepping**, none of which a live event holds still for. Each one has
  produced a bug:
  | step | what it exercises |
  |---|---|
  | reset, before adding quals | practice-only schedule, absent nowQueuing |
  | add quals, still nothing queued | posted schedule, nothing started (#60) |
  | "Queue first matches" | on-deck match at sequence position 0 (#62) |
  | first match to field | strip advancing off the front |
  | last practice to field | the phase gap — absent nowQueuing with play behind it |
  | a break mid-quals | break walking the strip; the post-break queue time prompt |
  | stop with a break right after the on-deck match | nowQueuing collapses onto the on-deck match, nothing at "Now queuing" |
  | a break two past the on-deck match | the one step where a break shows nowhere — the gold bar (#68) |
- Set the team number to one that is **actually in the match under test** — teams are
  randomly generated per reset, so read them off the queue page first.

## Team config
Default team: 88, event key format: e.g. 2025cthar

## Statbotics data
- Persisted SWR cache `_sb` (`localStorage['pitfusion_sb_<year>']`): `getTeamYear()`,
  `getTeamMatches()`, `getEventMatches()`. Stale entries paint instantly + revalidate
  in the background; never polled on a fixed cadence.
- **There are no cache TTLs anywhere in the app — invalidation is event-driven.**
  `sbVer()` counts matches TBA has posted a score for and that count IS the cache
  version; an entry is fresh while its version matches, however old it is. Bare
  `sbVer()` is event-wide (any result moves the value); `sbVer(team)` narrows to that
  team's own matches. **Only `getEventMatches` takes the event-wide version** — a
  prediction for match 40 changes when 39 is scored. Everything else is team-narrowed.
  `getTeamYear` shipped event-wide on the theory that its world/country/state/district
  ranks move as anyone plays; that is wrong, Statbotics recomputes those four ranks only
  once per event, so it was paying ~8.5 refetches/hour for a number that had not moved.
  Its only match-cadence field is the team's own `epa.breakdown`. The version must always be
  derived from shared upstream state, never local history — otherwise two displays at
  one event disagree and each punches its own hole in the Worker's shared edge cache.
- **`getTeamYear` is the only Statbotics call that scales with display count.**
  `getEventMatches` is one shared URL per event however many displays run; every display
  polls its own `team_year`. That makes its version width the dominant cost at scale —
  ~50 req/hr per 40-display event narrowed vs ~349 event-wide. `sbVer(team)` keys on the
  SUBJECT team, not the viewer, so edge sharing is preserved; keying on the viewer would
  fragment the cache one way per display.
- **Hosted mode appends `_cb=<version>` to Statbotics URLs** (`sbUrl()`); `worker.js`
  strips it before calling Statbotics and folds it into the edge cache key instead, so
  a versioned URL gets `bustCache: 3600` instead of the blind 120s. Self-hosted must
  NOT send it — Statbotics never declared the param. This is the only way to punch
  through a Cloudflare edge entry on demand: the Cache API has no push invalidation.
- **`recordsCache` / `advCache` / `advRankingsCache` are version-stamped memos**
  (`memoGet`/`memoPut`, storing `{v, d}`). They used to be once-per-session with no
  expiry, which froze W–L records and district rank for a whole weekend on a pit TV.
  The `{v,d}` wrapper is load-bearing: `advCache[team]` can legitimately be `null`
  (no district), so a cached null must stay distinguishable from a miss.
  `teamDistrictCache`/`teamInfoCache`/`eventTypeCache` are deliberately NOT versioned —
  season-static.
- **`fMx()` must be awaited BEFORE `fMyYear()`/`fPred()` in the 30s loop.** They read
  `tbaMx` to compute their version; racing them in one `Promise.all` made a posted
  score take two polls to land. Don't fold it back in.
- None of this is exercised by a Nexus demo event — no TBA means `tbaMx` is empty and
  `sbVer()` pins at `<key>:0` forever. See docs/features/13.
- **`SB_BACKOFF` / `_sbFail` guard the COLD-cache case**, which version-keying cannot:
  with nothing cached and Statbotics down, every read refetches forever. A failed key
  now backs off 30s → 30m. Any success clears it, and `bustTeamCache()` clears it too —
  without that the overlay's ↺ Retry would be inert for up to 30 minutes. Not persisted
  (a reload earns one fresh attempt); the Settings connection check bypasses it.
- **Statbotics has been down since ~July 2026** (HTTP 500 after 9–14s), expected back
  around January 2027. EPA ranks, EPA charts and match predictions are all blank until
  then — that is the outage, not a PitFusion bug. Note 9–14s exceeds `getTeamYear`'s 8s
  timeout, so each attempt aborts and burns all 3 `fetchWithRetry` retries.
- EPA overlay charts read per-match EPA from `/v3/matches` → `m.epas["<team>"]`.
- **Match predictions** (feature #1): opt-in, **off by default**, `localStorage`
  `pitfusion_predictions` (`'1'`/`'0'`), toggled on the setup screen + ⚙ Settings ▸
  Display. Win probability + favored alliance from `/v3/matches` → `m.pred`
  (`red_win_prob`, `winner`). `predMap` keyed like `nl(label)` (`qual_N`/`sf_N`/`f_N`);
  shown on the queuing card, match list, and My Team next-match for unplayed matches
  only. No predicted scores.
- The EPA overlay degrades gracefully when Statbotics is down: `openEpa()` never
  returns early on a `team_year` failure — Identity/Event/Records/FRC Advancement
  (all TBA data) still render; only the EPA Ranks section shows an "unavailable" +
  Retry in their place. ⚙ Settings ▸ Run connection check includes a Statbotics probe
  (`team_year/254/<year>`, keyless; proxied through `/api/statbotics` in hosted mode
  via `apiUrl()` for the shared edge cache, direct in self-hosted) alongside
  Nexus/TBA/YouTube.

## Mobile mode
- Automatic at `<=768px` — one `@media` block at the end of the stylesheet plus
  additive markup/JS; the desktop cascade is untouched. See docs/features/09.
- Overriding `--hdr-h`/`--ftr-h` re-flows `#app` *and* every overlay (they all use
  `top:var(--hdr-h)`). The `--fs-*` tokens are also re-tuned: they're
  `clamp(min,vw,max)` sized for a pit TV and pin to their large minimum on a phone.
- Stack: header (Queue-Now + delay + live + ☰) → video → queuing → tabs → Upcoming.
  `#panel-m` (Match Schedule) and the Bracket are promoted to a fixed full-screen
  panel from the ☰ menu via `openMobilePanel()` — which must **not** call
  `toggleBracket()` (desktop-only DOM shuffle).
- Mobile-only controls hide via a real CSS rule, never `style="display:none"` —
  inline styles outrank the media query. Same trap applies to `applyLayout()`'s
  inline grid sizes, which it now clears on mobile.

## Roadmap
Future features: docs/roadmap.md (index) + docs/features/*.md (per-feature design).
Build one feature per PR against main.