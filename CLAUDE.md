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