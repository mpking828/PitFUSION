# PitFusion hosting migration — plan (V3.0.0)

Status: **planning / not started**. Last updated 2026-09-02.

## Context

Single-file HTML app (`PitFUSION.html`), no build step. Currently self-hosted with
Nexus, TBA, and YouTube API keys embedded in client code. Cloudflare account +
`pitfusion.com` owned. Repo was just restructured into `local/` + `hosted/`
(commit `9409917` on `main`) and a V2.0.1 transition release was cut.

The migration moves hosting to **Cloudflare Pages + Pages Functions**, keeps a
self-hostable mode with bring-your-own keys, and ships as **V3.0.0** (breaking
config change).

## Decisions locked in

1. **Single codebase with runtime mode detection** — not two entry points.
2. Keep a **self-hostable mode**, using bring-your-own (BYO) keys.
3. All three keys (Nexus, TBA, YouTube) follow the same model: Cloudflare secret
   in hosted mode, `localStorage` (settings panel) in self-hosted mode. Never in
   the repo.
4. No `stable` shim, no back-compat concerns — V2.0.1 is hours old, offseason,
   zero users.
5. Delete the `stable` branch and the `v2.0.1` tag + release (optional cleanup;
   the restructure commit on `main` stays).
6. Retire `hosted/` and `local/` folders — replace with `public/` (Pages-served)
   + `functions/` (Cloudflare-mandated name).
7. Back to plain `vX.Y.Z` tags — single codebase = single release stream. Drop
   the `local-v*` / `hosted-v*` prefix idea.
8. Call the migration **V3.0.0**.
9. Proxy services via **Pages Functions** (one project), not a standalone Worker.
10. Abuse protection on day one: **Cloudflare WAF rate-limit rule** on `/api/*`
    (plus an `Origin`/`Referer` check in the Function). No Cloudflare Access.

## Target layout

```
/
  public/            PitFUSION.html, config.js, version.json, *.png
                     (check.html folded into PitFUSION.html as a settings overlay — see open items)
  functions/api/     _proxy.js  (shared helper: cache + key injection + Origin check)
                     nexus/[[path]].js
                     tba/[[path]].js
                     youtube/[[path]].js
  wrangler.toml
  _headers           (static asset cache/security headers)
  .dev.vars.example
  .gitignore         (+ .dev.vars, + local config.js if we go the example-file route)
  docs/  README.md  CLAUDE.md  LICENSE
```

## Architecture

- **Mode detection:** `hosted` iff
  `hostname === 'pitfusion.com' || hostname.endsWith('.pitfusion.com') || hostname.endsWith('.pages.dev')`;
  else `selfhosted`. `config.js` `forceMode` override for testing.
  (Note: bare `*.pitfusion.com` does **not** match the apex, and Pages issues both
  `<project>.pages.dev` and per-deploy `<hash>.<project>.pages.dev` — hence the
  explicit apex + suffix checks.)
- **One API helper:** hosted → `fetch('/api/<svc>/<path>')`; self-hosted → direct
  call to the real API with the user's key (header for Nexus/TBA, `?key=` for
  YouTube).
- **config.js:** non-secret only (team #, event key, refresh intervals, optional
  `forceMode`). YouTube constant removed from HTML; does not become a literal in
  config.js. Scrub tracked `config.js` back to defaults (team 88) in the V3
  commit, or switch to `config.example.js` + gitignored `config.js`.
- **BYO-key UX:** settings panel with 3 fields, "get your key" links, test
  buttons, `localStorage`. Graceful degradation when a key is missing (hide
  YouTube panel / hide EPA / block on missing Nexus).
- **Functions:** read secret from `env`, forward upstream with key injected, add
  `Cache-Control` (Nexus ~10s, TBA ~30s, YouTube ~60s) and use the Cache API so
  multiple displays at one event share one upstream hit. `Origin`/`Referer`
  check + WAF rate-limit rule on `/api/*`.
- **Update check:** self-hosted fetches `https://pitfusion.com/version.json`;
  hosted skips. (`checkForUpdate()` in `PitFUSION.html` currently points at
  `raw.githubusercontent.com/.../stable/local/version.json` — repoint to
  `https://pitfusion.com/version.json` and drop the `stable` branch.)
- **Statbotics** (`api.statbotics.io`, EPA data, keyless) is a 4th external
  source. No proxy needed now; candidate for a caching passthrough later if
  rate-limited.

## Cloudflare Pages setup (do this when implementing)

1. Connect the GitHub repo. Build output dir `public/`, root `/`, **no build
   command**.
2. Add encrypted env vars for **Production and Preview**:
   `NEXUS_API_KEY`, `TBA_API_KEY`, `YOUTUBE_API_KEY`.
3. Add `pitfusion.com` as a custom domain (Cloudflare handles DNS + cert since
   the domain is already on the account).
4. Add a WAF rate-limit rule scoped to `/api/*`.
5. Local dev: `wrangler pages dev` with a gitignored `.dev.vars`.

Deploy model: Claude edits `public/` + `functions/` → user reviews diff →
commit + push → Cloudflare CI auto-deploys (`main` = production, branches =
preview URLs). Claude needs **no** Cloudflare credentials for this path. A scoped
`CLOUDFLARE_API_TOKEN` would enable `wrangler deploy` directly but the
git-integration path is the default.

## Cost

~$0/month expected. Cloudflare free tier: Pages unlimited requests + bandwidth;
Workers/Functions 100,000 requests/day. $5/month ceiling only if very popular
(10M requests). Domain/DNS/SSL already free on the account.

## Investigation results (2026-09-02)

### YouTube quota — not a blocker

- `PitFUSION.html` calls `youtube/v3/videos?part=liveStreamingDetails` — that is
  `videos.list`, **1 unit per call**, not `search.list` (100 units).
- Called from `isYouTubeLive()` → `rStream()`, once per YouTube webcast (usually
  1, sometimes 2 per event).
- `rStream()` is **not on a polling timer**. `fEv()` populates the webcast list
  and calls `rStream()` **once in `init()`**. Other `rStream()` calls are
  user-triggered (toggle stream panel, exit replay, manual switch).
- Realistic usage: ~1–5 units per page load + a unit or two per interaction,
  against a 10,000/day default quota. A 30–60s Function cache removes even that.
- **Conclusion:** drop YouTube quota as a blocker. No manual per-event stream
  config fallback needed. Function-side caching stays nice-to-have.

### Exposed YouTube API key — action needed regardless of migration

- `PitFUSION.html` contains a hardcoded `YT_KEY` (`AIzaSy…`), committed and in git
  history — permanently disclosed on a public repo.
- Nexus + TBA keys are **not** committed — repo `config.js` ships
  `YOUR_NEXUS_KEY` / `YOUR_TBA_KEY` placeholders. But the tracked `config.js` is
  the same file edited locally with real keys, so it is one `git add -A` from
  leaking. The V3 move to `localStorage` / `.dev.vars` fixes this structurally.
- **Recommended now:** rotate the YouTube key in Google Cloud Console (delete +
  reissue — referrer restrictions don't help once public). New key goes only into
  the Cloudflare secret; self-hosters supply their own.

### TBA attribution — missing

- No "Powered by The Blue Alliance" wordmark. The Help overlay names the sources
  in prose only, which is not what TBA's API terms ask for.
- Statbotics is covered (there is a "View full profile on Statbotics →" link).
- **Fix during V3.0.0:** add `Powered by The Blue Alliance · Data from Nexus FRC`
  to the footer with links.

## Open items

- `check.html`: fold into `PitFUSION.html` as a settings overlay (matches the
  existing EPA/help/schedule overlay pattern and the single-codebase decision),
  or keep as a second static file in `public/`. Leaning: fold in.
- `config.js` tracked-file strategy: scrub to defaults vs. `config.example.js` +
  gitignore.
- Whether to set up `wrangler pages dev` local testing in the first PR or later.
- Exact `Cache-Control` / Cache API TTLs per service (start: Nexus 10s, TBA 30s,
  YouTube 60s).
