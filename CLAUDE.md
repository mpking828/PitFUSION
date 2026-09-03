# PitFusion — Project Context

## What this is
FRC pit display built on Nexus and The Blue Alliance APIs.
Single HTML file, no framework, no build step.

## Current state
- local/PitFUSION.html — self-hosted version, API keys embedded as constants at top of file
- hosted/ — cloud version to be built (Cloudflare Pages + Workers proxy)

## Architecture decision
Moving to Cloudflare Pages + Pages Functions so API keys live as encrypted
secrets, never in browser-visible code. HTML calls /api/nexus/*, /api/tba/*,
/api/youtube/* which Functions proxy to the real APIs with injected keys.
Single codebase with runtime mode detection: hosted (pitfusion.com / *.pages.dev)
uses the proxy; self-hosted uses bring-your-own keys from a settings panel
(localStorage). Ships as V3.0.0 (breaking config change).

Full plan, target layout, Cloudflare setup steps, and investigation notes:
docs/hosting-migration.md

## Update check / releases
- Only the self-hosted build (local/PitFUSION.html) has an update check.
  The hosted build auto-updates on Cloudflare deploy, so it has no check.
- VERSION constant lives at the top of local/PitFUSION.html.
- checkForUpdate() fetches local/version.json from the `stable` branch
  (raw.githubusercontent.com) and shows a footer badge if it's newer.
- Release process for the self-hosted build:
  1. Bump VERSION in local/PitFUSION.html and "version" in local/version.json
     (keep them equal; set version.json "url" to the release tag), merge to main.
  2. Fast-forward `stable` to that commit and push — this is what triggers the
     update badge on running displays.
  3. Tag the release local-vX.Y.Z and attach the HTML on GitHub Releases.
  `stable` is decoupled from main on purpose: main can churn without notifying.

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