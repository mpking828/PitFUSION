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
| 11 | Playoff Bracket sidebar overflow — the Queuing tab's bumper box forces a scroll bar | shipped (#45, #46) | XS–S | — |
| 12 | Playoff Bracket rosters/matches sourced from Nexus (works with no TBA data at all — teams appear as alliance selection happens, instead of waiting on TBA's all-or-nothing post) | shipped (V3.4.0, #73) | M | — |
| 13 | Event-driven cache invalidation — every cache TTL replaced by a version derived from posted scores, client and Worker edge alike | shipped (V3.5.0, #80) | S–M | [features/13-event-driven-cache.md](features/13-event-driven-cache.md) |

Size: XS < half a day · S ~1 session · M ~2–3 sessions · L multi-session, may split.

## Known issues

- **Statbotics has been down since ~July 2026** — HTTP 500 after 9–14s on every
  endpoint, direct and proxied. Expected back around **January 2027**. EPA ranks, the
  EPA line charts and match predictions are therefore blank on every display: this is
  the outage, not a PitFusion bug, and no change here can restore the data. The app
  degrades gracefully (#32) and, since the failure backoff below, no longer hammers a
  dead service. **Two things to re-verify once it returns:** the V3.5.0 event-driven
  cache against real payloads, and the premise behind V3.6.1 — that world/country/state/
  district ranks recompute only once per event. If they move more often, the cost is a
  rank pill lagging until the team's next match (~45 min during quals); EPA correctness is
  unaffected and it reverts by changing one argument in `getTeamYear`.

## Shipped outside the roadmap

No design docs, see the PRs. V3.2.x–V3.3.3 found and fixed live at a real event,
2026mifli2; V3.3.4 onward found by driving a Nexus demo event through states a real
event never holds still for (see "Testing against Nexus — demo events" in `CLAUDE.md`).

- **V3.2.1** — EPA overlay degrades gracefully during a Statbotics outage instead of
  blanking the whole panel (#32); Statbotics probe added to the Settings connection
  check (#33); Our Schedule stopped showing a stale queue time for a played match (#34).
- **V3.2.2** — every Nexus/TBA/Statbotics fetch forces `cache:'no-store'`, after a
  zone-level Browser Cache TTL froze API responses for four hours (#35).
- **V3.3.0** — "played" is now inferred from schedule position, shared by the match
  list, My Team and Our Schedule (#38). Nexus never marks a played match `Completed`
  and TBA scores lag, so position relative to `nowQueuing` is the only reliable signal.
- **V3.3.1** — mobile: match-list scroll lock, Our Schedule chips, countdown clipping
  fixed, drop Upcoming on mobile (#42); match schedule promoted to a full-screen sheet
  like the bracket (#43).
- **V3.3.2** — bracket sidebar: bumper-box overflow fixed, Upcoming compacted with
  times moved onto the bracket cards (#45); queuing card no longer collapses to a
  sliver after hiding the stream in bracket mode (#46).
- **V3.3.3** — My Team RP column could show match scores instead of RP, one shared
  RP map (#48); On Deck always blank, On Field off by one, the on-deck match wrongly
  marked played (#49); Tier 1/2 code-simplifier cleanup — dead code removed,
  `localStorage` guarded, ~11 duplicated constructs collapsed (#50).
- **V3.3.4** — Nexus push webhooks evaluated and rejected (#52); Nexus demo events
  recorded as the project's only integration-test fixture, since there is no test
  harness (#53); Upcoming panel duplicated the queuing card's match and ignored
  practice matches, later corrected further in V3.3.7 (#54); this release also
  starts the break-handling arc below (#55, #56, #58).
- **V3.3.5–V3.3.9 — the break-handling arc.** Found by driving a Nexus demo event
  through every transition a live event never holds still for: reset → posted schedule
  → first queue call → first match → practice/qualification boundary → a scheduled
  break → end of day → alliance selection → playoffs. Each transition surfaced a bug,
  all fixed live against the demo, recorded in `CLAUDE.md`'s Key Nexus API notes:
  - the status strip walks a break through its own slot instead of a stale match
    lingering in "On Field" for the whole break, and a break one step from its own
    slot gets a gold bar so it's never invisible (#55, #58, #68);
  - `Est. Queue`/the header countdown distinguish a real operator-set time from
    Nexus's own clamp-to-now, instead of either discarding it or reprinting the wall
    clock (#56, #60);
  - the event start, a phase gap, and a break are told apart instead of all reading
    "⏸ On Break" (#60); the practice/qualification boundary is keyed off the field,
    not `nowQueuing`, so practice no longer vanishes from every panel before the
    first queue call or reappears wrongly mid-quals (#60, #65);
  - the status strip agreed with Nexus on the very first queue call of the event,
    and a completed queue call is labelled "Queued" rather than "Est. Queue" (#62);
  - a phantom `scheduledQueueTime` field (never in the Nexus schema) removed from the
    schedule-delay pill, which is documented as permanently blank on a demo and
    during playoffs — not a bug (#71).
- **V3.4.0** — returning from the Playoff Bracket to the match list on desktop no
  longer resets scroll position to the top (#74). See #12 above for the bracket's
  main V3.4.0 change.
- **V3.4.1** — the bracket's Nexus/TBA alliance-roster merge was
  all-or-nothing (switched entirely to Nexus's array the moment it had picked any
  seed, even if TBA already had every other seed complete); now compares per seed
  and takes whichever source has more of that seed filled in, matching the per-key
  rule `bracketIndex()` already used for match objects (#77). Statbotics calls now
  route through `worker.js` (`/api/statbotics`, edge-cached 120s) in hosted mode,
  same pattern as Nexus/TBA/YouTube, so multiple displays at one event share one
  cached response instead of each hitting Statbotics directly — found by asking
  directly whether caching was shared across teams at the same event, and confirmed
  worth doing immediately when Statbotics turned out to be live-down (HTTP 500,
  0.9–5.2s response times) while designing it. Self-hosted unaffected (#78).
- **V3.5.0** — cache invalidation is now **event-driven end to end**: every TTL in the app — the
  client's 2h/20m Statbotics SWR windows and the Worker's 120s Statbotics edge window
  — is replaced by `sbVer()`, a version derived from how many matches TBA has posted
  a score for. A `_cb` query param carries that version to the Worker, which strips it
  before calling Statbotics and folds it into the edge cache key instead, so a client
  that knows it is stale can punch through an edge entry without the KV/Durable Object
  binding this project avoids. The same signal fixes three EPA-overlay memos
  (`recordsCache`, `advCache`, `advRankingsCache`) that had no expiry at all and froze
  a team's W–L record and district rank for as long as the display stayed up. Net
  effect: ~5× more Statbotics requests during active play in exchange for one-poll
  freshness, and **zero** requests once play stops, where the old TTLs polled forever
  (#13, see the design doc for the full cost breakdown).

- **V3.5.1** — **failure backoff for Statbotics.** V3.5.0's version cache
  only quiets a display that has data; with a cold cache and a dead upstream every read
  still refetched. Measured live during the outage: two `_sbGet` calls per 30s poll, each
  costing 3 raw requests because Statbotics' 9–14s latency exceeds `getTeamYear`'s 8s
  timeout — up to **720 raw requests/hour per display** at a service down since July, with
  no edge amortization because the Worker never caches a 5xx. A failed key now backs off
  30s → 30m, settling at ~12/hour (**60× cut**), rejects cold reads instantly instead of
  stalling ~14s, still serves stale when warm, and clears itself on any success so
  recovery in January needs no intervention. `bustTeamCache()` clears it too, so the
  overlay's ↺ Retry is not inert during one.

- **V3.6.0** — **weighted connection status.** The header "Live" dot only reflected the
  last Nexus fetch: it ignored TBA and Statbotics, flashed red on one dropped request, and
  said nothing about data age. It is now a Connected / Degraded / Offline pill keyed on the
  age of each source's last success, with a tap-open per-source popover (replacing the
  footer timestamp) and a dismissible red banner once queue data is 3 minutes stale. The
  weighting is deliberate: only Nexus can go red or raise the banner; TBA can only degrade,
  and a TBA 404 reads "no data for this event" so demos stay green; Statbotics is shown but
  never moves the pill (down since July); YouTube is excluded. Verified on production by
  blocking `/api/nexus` in DevTools — amber, Offline + banner, and recovery to green. Help
  gains a Connection status section and a GitHub project link (#86).

- **V3.6.1** — **`getTeamYear` narrowed to the team version.** It shipped in V3.5.0
  taking the EVENT-wide version, on the theory that `team_year`'s world/country/state/
  district ranks move as any team anywhere plays. That premise is false — Statbotics
  recomputes those four ranks only **once per event** — so the event-wide version was
  buying ~8.5 refetches/hour to observe a number that had not changed. Not a freshness
  tradeoff: pure overhead. The only field here that moves at match cadence is the team's
  own `epa.breakdown`, which `sbVer(team)` captures exactly. This matters because
  `getTeamYear` is the **only Statbotics call that scales with display count** —
  `getEventMatches` is one shared URL per event however many displays run, but every
  display polls its own `team_year`. Per event at 40 displays: ~50 req/hr narrowed against
  ~349 event-wide, versus ~23/hr on the old TTLs; across 40 simultaneous events, ~2,000/hr
  rather than ~14,000 on a free community API. So PitFusion now beats the pre-V3.5.0 TTLs
  on freshness *and* stays within ~2× on load instead of 15×. Edge sharing survives
  because `sbVer(team)` keys on the SUBJECT team, not the viewer — keying it on the viewer
  would have fragmented the cache one way per display and been strictly worse (#88).

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
- **#11's first cut hid Upcoming entirely (#45); #46 walked that back.** The times and
  break markers it carries appear nowhere else once the bracket replaces the Match
  Schedule, so Upcoming now stays in a compacted form (chips dropped — the bracket shows
  the alliances) and the scheduled queue time moved onto the bracket cards themselves,
  where it is arguably better placed: every playoff match, not just yours.
- **`rRank()` centres the Rankings panel** on our own team on every poll, the same
  annoyance #10 fixed for the match list. Not yet addressed.
- **End of day reuses the bare "⏸ On Break" badge**, which implies play will resume
  when it won't — the same absent-`nowQueuing` shape as a genuine phase gap, and the
  two aren't currently told apart. Noted, not yet fixed; see `CLAUDE.md`'s Key Nexus
  API notes for the full state breakdown.
- **`replayOf` exists on a replay match and is unused.** Confirmed live on demo4010:
  `replayOf: 'Playoff 4'` on the match labelled "Playoff 4 Replay". `nl()`'s regex
  already collapses a replay onto its original's key everywhere that matters (the
  bracket, `matchPlayed()`), so there's no known bug from ignoring it — just an
  unused field, in case a future view wants to say "replay of Playoff 4" explicitly.
- **#50's TBA-driven paths are only structurally verified.** `teamsOf()`,
  `bracketIndex()`, `scoreMap()` and predictions all read real TBA fields correctly
  by inspection, but a demo event has no TBA counterpart at all, so none of them have
  been exercised end-to-end against a live TBA feed — only against synthetic payloads
  and, as of V3.4.0, against Nexus's own data standing in for TBA's. Needs a real,
  in-season event to close out.
- **Nexus push webhooks — evaluated, rejected.** Nexus offers a live-event-status and a
  match-status webhook, either of which would in principle replace the 15s Nexus poll.
  Three independent blockers:
  1. **No registration API.** The `POST /webhooks` entries in the Nexus spec are OpenAPI
     3.1 *webhook declarations* — the request Nexus sends *you*, not an endpoint you call.
     Registration is dashboard-only (frc.nexus/api), scoped per event and per team, so
     hosted PitFusion cannot subscribe for whatever event code a user types in.
  2. **Selfhosted mode has no server.** `public/index.html` often runs from `file://` or a
     static host; nothing can receive a POST. Polling stays that path regardless, so
     webhooks would add a second data path rather than replace one.
  3. **TBA and Statbotics have no webhooks**, so the 30s loop stays either way.

  Nexus also does not retry failed deliveries and auto-disables endpoints that repeatedly
  fail to return 200 — a polling fallback would be required anyway. `worker.js` is
  stateless with no KV/Durable Object bindings, so a receiver would additionally need new
  Cloudflare resources plus a push channel (DO + SSE/WebSocket) to reach browsers.
  Worth noting for any future revisit: the webhook payload is a full snapshot
  (`nowQueuing`, `matches`, `announcements`, `partsRequests`) matching what `fNexus()`
  already consumes, and Nexus documents no rate limit on the GET endpoints — 15s is not
  straining anything. **Polling stays at 15s.**

## Suggested build order

1. **#2 (2027 season)** — blocked until the Jan 9 2027 kickoff; the non-blocked prep
   (audit for hardcoded `2026`, confirm the year is always dynamic) is already done —
   see the design doc.
2. **#5 (multi-event)** — largest, most invasive to the data model; do it last and
   probably split into its own mini-roadmap.

Shipped: #1, #3, #3b, #3c, #6, #7, #7b, #8, #8b, #9, #10, #11, #12, #13.
