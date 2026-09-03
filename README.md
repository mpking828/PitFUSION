# PitFusion

A real-time FRC pit display that fuses [Nexus](https://frc.nexus/) and
[The Blue Alliance](https://www.thebluealliance.com/) into one screen — live queuing,
countdown, bumper color, rankings, alerts, pit map, EPA stats, and the event livestream.

Single HTML file, no framework, no build step.

## Use it

**[pitfusion.com](https://pitfusion.com)** — nothing to install or configure. Runs on a
Cloudflare Worker; API keys are held server-side, so nothing sensitive is in the page.

## Run your own copy

Download `public/` and open `PitFUSION.html` through a local web server. On first launch,
open **⚙ Settings** and enter your own Nexus and Blue Alliance API keys (a YouTube Data
API key is optional — it's only used to auto-detect a live webcast). Keys are stored only
in your browser.

Full guide: **[docs/self-hosting.md](docs/self-hosting.md)**.

## Repository layout

| Path | What it is |
|------|------------|
| `public/` | Static assets served directly by the Worker — `PitFUSION.html`, `config.js` (non-secret config only), images, `_headers`, `_redirects`. |
| `worker.js` | The Cloudflare Worker. Runs only for `/api/*` (`run_worker_first`); proxies `/api/nexus/*`, `/api/tba/*`, `/api/youtube/*` to the real APIs, injecting keys from secrets. |
| `wrangler.toml`, `.dev.vars.example` | Worker config; the three secrets are `NEXUS_API_KEY`, `TBA_API_KEY`, `YOUTUBE_API_KEY`. |
| `docs/` | Self-hosting guide, custom-theme guide, the hosting-migration design doc. |

One codebase runs both ways: it detects **hosted** mode on `pitfusion.com` / `*.workers.dev`
(calls go through the proxy) and **self-hosted** mode everywhere else (calls go direct
with your keys).

## Credits

Powered by [The Blue Alliance](https://www.thebluealliance.com/) · data from
[Nexus](https://frc.nexus/) · EPA from [Statbotics](https://www.statbotics.io/) ·
inspired by [Pulse](https://pulsefrc.app/). Home team: [Team 88 TJ²](https://www.tj2.org/).

## License

[MIT](LICENSE).
