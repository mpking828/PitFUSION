# PitFusion

FRC pit display built on the Nexus and The Blue Alliance APIs. Single HTML file,
no framework, no build step.

## Repository layout

| Path       | What it is |
|------------|------------|
| `local/`   | Self-hosted version. Open `local/PitFUSION.html` directly in a browser; API keys are embedded as constants at the top of the file. See [`local/readme.md`](local/readme.md) for full setup and usage. |
| `hosted/`  | Cloud version (Cloudflare Pages + Workers), in progress. API keys live as Worker Secrets and never reach browser-visible code. |
| `hosted/workers/` | API proxy Workers. The HTML calls `/api/nexus/*` and `/api/tba/*`, which the Workers proxy to the real APIs with injected keys. |

## License

See [LICENSE](LICENSE).
