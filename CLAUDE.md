# PitFusion — Project Context

## What this is
FRC pit display built on Nexus and The Blue Alliance APIs.
Single HTML file, no framework, no build step.

## Current state (V3.0.0, feat/v3-cloudflare)
- Single codebase. `public/PitFUSION.html` is the whole app; `public/config.js`
  is non-secret config only (EPA field defs + optional `FORCE_MODE`).
- Runtime `MODE`: `hosted` on pitfusion.com / *.pages.dev, else `selfhosted`.
  `?forceMode=hosted|selfhosted` and `config.js` `FORCE_MODE` override.
- hosted: data requests are rewritten (see `apiUrl()`) to same-origin `/api/nexus`,
  `/api/tba`, `/api/youtube`; `functions/api/*` inject the key from env vars
  (`NEXUS_API_KEY`, `TBA_API_KEY`, `YOUTUBE_API_KEY`) and edge-cache the response.
- selfhosted: direct calls with keys from the ⚙ Settings panel (localStorage
  `pitfusion_keys`). Nexus + TBA required (gated in `setupLaunch`), YouTube optional.
- `functions/api/_proxy.js` — shared: origin allowlist, prefix strip, key inject,
  `caches.default`. Route files are 4-line wrappers.
- No build step. `public/_redirects` serves PitFUSION.html at `/`.

## Update check / releases
- checkForUpdate() runs in selfhosted mode only; fetches
  https://pitfusion.com/version.json and shows a footer badge if newer.
- VERSION constant is at the top of public/PitFUSION.html; keep it equal to
  "version" in public/version.json.
- Release: bump both, merge to main (Cloudflare auto-deploys `main` to
  pitfusion.com), tag `vX.Y.Z`, GitHub release with public/PitFUSION.html attached.
  No `stable` branch, no channel-prefixed tags.

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