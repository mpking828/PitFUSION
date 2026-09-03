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
- nowQueuing is the source of truth for active match state
- Nexus permanently leaves all matches at status "On field" after they're played
- Never rely on match status alone — gate on nowQueuing being non-null
- Parts request fields: p.requestedByTeam (team number), p.parts (body text)
- TBA sf matches use set_number as the playoff match number (1-13), match_number is always 1

## Team config
Default team: 88, event key format: e.g. 2025cthar

## Roadmap
Future features: docs/roadmap.md (index) + docs/features/*.md (per-feature design).
Build one feature per PR against main.