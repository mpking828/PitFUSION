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
  no flash). Uploaded background images are data URLs, capped at 2 MB.
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
- Parts request fields: p.requestedByTeam (team number), p.parts (body text)
- TBA sf matches use set_number as the playoff match number (1-13), match_number is always 1

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