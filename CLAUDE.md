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
  `/api/tba`, `/api/youtube`; `worker.js` injects the key from secrets
  (`NEXUS_API_KEY`, `TBA_API_KEY`, `YOUTUBE_API_KEY`), origin-allowlists, and
  edge-caches (10/30/60s).
- selfhosted: direct calls with keys from the ⚙ Settings panel (localStorage
  `pitfusion_keys`). Nexus + TBA required (gated in `setupLaunch`), YouTube optional.
- No build step. `public/index.html` is served at `/` natively; `public/_headers`
  sets security headers (honored by Workers static assets).

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
- Nexus permanently leaves all matches at status "On field" after they're played
- Stale "On field" entries are always EARLIER in play order than the live one, so the
  **last** "On field" is the real one — self-correcting, no staleness heuristic needed.
  `fieldState()` is the single source of truth; use it rather than re-deriving.
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
- **The queue pipeline does not cross a phase boundary.** It runs two deep inside a phase
  (with Practice 1 on deck, Practice 2 is already "Now queuing"), then stops dead at the
  last match of that phase: with Practice 6 on deck, Qualification 1 was still "Queuing
  soon" and had never been queued. So nowQueuing is never a qualification while a practice
  match is unplayed — which is why keying phase on nowQueuing is safe at that seam.
- **The On Field slot is the sequence position BEFORE the on-deck match, and it can be -1.**
  On the first queue call of the event the on-deck match is the first match in the
  schedule, so that slot falls off the front and belongs empty. Don't clamp it to 0 — that
  puts the on-deck match on the field and shifts the whole strip (fixed in #62).
- **actualQueueTime is set the moment Nexus makes the queue call**, so its presence means
  the call is history, not a forecast. Label it "Queued", never "Est. Queue".
- **Nexus never publishes an estimate in the past.** When a queue time comes due and the
  operator hasn't queued, Nexus replaces the estimate with `dataAsOfTime` exactly; the
  operator's dashboard labels such a match "Expected soon". That single clamp explains
  both the mid-break collapse and the overdue pre-event start. So the test for a usable
  time is "is it ahead of `dataAsOfTime`" (`queueTimeOf()`) — **not** a minimum lead; a
  threshold discards real operator-set times as they approach.
- Phase (practice vs quals) comes from what the field is doing, never from "are there
  unplayed practice matches" — an event that cuts practice short leaves them at
  "Queuing soon" forever. `eventInPractice()`.
- Parts request fields: p.requestedByTeam (team number), p.parts (body text)
- TBA sf matches use set_number as the playoff match number (1-13), match_number is always 1

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
  scores, rankings, alliances, the bracket and EPA stay empty — TBA-driven code paths
  (`teamsOf`, `bracketIndex`, `scoreMap`, predictions) are NOT exercised. Teams are randomly
  generated, and demo events are reset periodically, so don't hardcode a key.
- Practice matches are included and are filtered out by `playedList()`, so `matchPlayed()`'s
  positional rule only engages once the queue reaches qualifications.
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
- Set the team number to one that is **actually in the match under test** — teams are
  randomly generated per reset, so read them off the queue page first.

## Team config
Default team: 88, event key format: e.g. 2025cthar

## Statbotics data
- Persisted SWR cache `_sb` (`localStorage['pitfusion_sb_<year>']`): `getTeamYear()`,
  `getTeamMatches()`, `getEventMatches()`. Stale entries paint instantly + revalidate
  in the background; never polled on a fixed cadence.
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
  (`team_year/254/<year>`, keyless, same in both modes) alongside Nexus/TBA/YouTube.

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