# PitFUSION

**A real-time FRC pit display that fuses Nexus and The Blue Alliance into one screen.**

Created by Mike King — [Team 88 TJ²](https://www.tj2.org/)

![PitFUSION interface overview](docs/annotated.png)

---

## Features

- 📺 **Livestream** — auto-detects all available streams for the event with a dropdown selector
- ⏱ **Queuing Status** — live match queue with On Field / On Deck / Queuing indicators. Clicking any team number opens their EPA stats
- 🚨 **Queue Countdown** — header countdown timer to your next match queue time, turns red under 5 minutes
- 🎨 **Bumper Color** — prominently displays your alliance bumper color for your next match
- ☕ **Break Mode** — shows your next upcoming match from TBA even when Nexus isn't actively queuing
- 📋 **Match Schedule** — full qual and playoff schedule with scores, W/L/T result, and auto-scroll to active match
- 🏆 **Playoff Bracket** — full double-elimination bracket view with connector lines and alliance legend
- 📊 **Event Rankings** — live rankings table with your team highlighted. Clicking any team number opens their EPA stats
- 👕 **My Team** — team info, current ranking, record, RP, next match alliance breakdown, and played match history with W/L/T
- 📢 **Alerts** — Nexus announcements (📢) and parts requests (🔧) with separate counts. Parts requests show pit location when available
- 📈 **EPA Stats** — full-screen EPA overlay powered by Statbotics showing per-match line charts for every component across the season
- 🖼 **Logo Support** — automatically loads `logo.png/jpg/jpeg/svg/webp` from the same folder as the HTML file
- 🎨 **4 Themes** — Dark, Light, TJ² (Team 88 tye-dye), and fully customizable Custom theme
- 💾 **Persistent Settings** — team number, event, theme, and font size remembered across reloads
- 🔤 **Font Size Toggle** — footer button switches between readable and extra-large pit display sizes
- 🔌 **No Install Required** — single HTML file, no framework, no build step, no dependencies

---

## Quick Start

### 1. Get API Keys

| Key | Where to get it |
|---|---|
| **Nexus API Key** | [frc.nexus/api](https://frc.nexus/api) |
| **The Blue Alliance API Key** | [thebluealliance.com/apidocs](https://www.thebluealliance.com/apidocs) |

### 2. Edit config.js

Open `config.js` in any text editor and add your API keys:

```js
const NEXUS_KEY = 'YOUR_NEXUS_KEY';
const TBA_KEY   = 'YOUR_TBA_KEY';
```

This is the only file you need to edit for initial setup. The version number lives in `PitFUSION.html` and updates automatically on each release.

### 3. Add a Logo (Optional)

Place any of these files in the **same folder** as `PitFUSION.html` and it will appear automatically on the setup screen above the wordmark:

`logo.png` · `logo.jpg` · `logo.jpeg` · `logo.svg` · `logo.webp`

### 4. Serve the File

Browsers block local API calls from `file://` URLs, so you need a simple local web server.

**If you have Python installed:**

```bash
# Navigate to your PitFUSION folder, then run:
python -m http.server 8080
```

Then open your browser to: **http://localhost:8080/PitFUSION.html**

> **Don't have Python?**
> Download from [python.org/downloads](https://www.python.org/downloads/) and run the installer with default settings.
> On Windows you can also type `python` in a Command Prompt and Windows will prompt you to install it via the Microsoft Store.

### 5. Launch

On first load the **setup screen** appears. Enter your team number, select your event from the dropdown (it automatically filters to events your team is registered at this week), choose a theme, and click **Launch PitFUSION**.

Your team number, event code, theme, and font size are saved automatically and restored on the next reload.

---

## Files

| File | Purpose |
|---|---|
| `PitFUSION.html` | The entire application |
| `config.js` | API keys and EPA field configuration — **edit this file** |
| `logo.png` (optional) | Team logo shown on setup screen |
| `FRC88Background.png` (optional) | Required only for the TJ² theme |
| `[your-bg-image]` (optional) | Background image for the Custom theme |

All files must be in the same folder.

---

## EPA Stats

PitFUSION integrates with [Statbotics](https://statbotics.io) to display EPA (Expected Points Added) stats for any team at the event.

### Opening EPA Stats

There are three ways to open the EPA overlay:

- Click **📈 EPA Stats** in the footer (opens for your own team)
- Click any team number in the **Event Rankings** tab
- Click any team number in the **Queuing Status** alliance grid

### What's Shown

The overlay displays a full-season line chart for each EPA component, with match number on the X axis and EPA value on the Y axis:

| Chart | Field |
|---|---|
| Total EPA | Overall scoring contribution |
| Auto EPA | Autonomous period contribution |
| Teleop EPA | Teleoperated period contribution |
| Endgame EPA | Endgame contribution |
| Energized RP EPA | First ranking point contribution |
| Supercharged RP EPA | Second ranking point contribution |

**Tooltips** — hover any data point to see the event/match label and exact value.

**Event dividers** — vertical dashed lines and alternating background shading mark where each event begins, so you can see how a team's EPA evolved across the season.

**Current event toggle** — click **Show Current Event Only** to filter all charts to just the active event.

The header remains visible while the overlay is open, so the queue countdown stays in view.

### Caching

Each team's data is cached for 30 minutes per session. Repeated clicks on the same team are instant. If Statbotics times out, a Retry button appears — the fetch uses an 8-second timeout with one automatic retry before giving up.

### Updating EPA Fields for a New Season

The EPA breakdown field names change each year. To update for a new season, add an entry to `config.js`:

```js
const EPA_FIELDS = {
  2027: [
    { key: 'epa.breakdown.total_points',    label: 'Total EPA',           color: '#00d4ff' },
    { key: 'epa.breakdown.auto_points',     label: 'Auto EPA',            color: '#00e676' },
    { key: 'epa.breakdown.teleop_points',   label: 'Teleop EPA',          color: '#ffd600' },
    { key: 'epa.breakdown.endgame_points',  label: 'Endgame EPA',         color: '#ff6b35' },
    { key: 'epa.breakdown.rp_1',            label: 'RP 1 EPA',            color: '#a78bfa' },
    { key: 'epa.breakdown.rp_2',            label: 'RP 2 EPA',            color: '#f472b6' },
  ],
  // existing years...
};
```

To find the correct field names for a new year, call the Statbotics API directly:

```
https://api.statbotics.io/v3/team_year/{team}/{year}
```

Look at the `epa.breakdown` object in the response — the keys there are the field names to use.

---

## Themes

| Theme | Description |
|---|---|
| **Dark** | Default — deep navy with cyan accents |
| **Light** | Clean white/grey with navy accents |
| **TJ²** | Team 88's real tye-dye photo background with frosted glass panels and team colors |
| **Custom** | Fully configurable — edit colors and optional background image directly in the HTML |

### Custom Theme

Edit the `[data-theme="custom"]` block near the top of the `<style>` section (around line 100).

**Key variables:**

| Variable | Default | What it does |
|---|---|---|
| `--bg` | `#0d0d0d` | Main background color |
| `--surface` | `#141414` | Card and panel background |
| `--surface2` | `#1c1c1c` | Secondary panel background |
| `--accent` | `#ff9900` | Primary highlight color |
| `--text` | `#f0f0f0` | Primary text color |
| `--text-dim` | `#707070` | Dimmed/secondary text |
| `--custom-bg-image` | `none` | Background image, e.g. `url('myimage.jpg')` |
| `--custom-bg-washout` | `0.0` | Overlay opacity: `0.0` (none) → `1.0` (solid) |
| `--custom-bg-washout-color` | `0,0,0` | Overlay RGB — use `255,255,255` for light themes |

See the full [Custom Theme Guide](docs/PitFusion_Custom_Theme.md) for all variables and examples.

---

## Screenshots

| | |
|---|---|
| [![Main Screen](docs/MainScreen1.png)](docs/MainScreen1.png) | [![Bracket View](docs/BracketView1.png)](docs/BracketView1.png) |
| Main display | Playoff bracket |
| [![Team View](docs/TeamView1.png)](docs/TeamView1.png) | [![Alerts View](docs/AlertsView1.png)](docs/AlertsView1.png) |
| My Team tab | Alerts tab |

---

## Acknowledgements

Built on the shoulders of these excellent tools and communities:

- [Nexus](https://frc.nexus/) — real-time FRC event queuing data
- [The Blue Alliance](https://thebluealliance.com/) — match schedules, rankings, and results
- [Statbotics](https://statbotics.io) — EPA statistics and team performance data
- [Pulse - Pit Display](https://pulsefrc.app/) — original inspiration
- [Team 88 TJ²](https://www.tj2.org/) — home team

---

## License

MIT — free to use, modify, and share. Attribution appreciated.
