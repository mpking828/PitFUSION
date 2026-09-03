# PitFusion — Custom Theme Guide

The **Custom** theme lets you fully control the colors and background of PitFusion
without touching any CSS beyond a single block near the top of `PitFusion.html`.

---

## Where to Edit

Open `PitFusion.html` in any text editor and search for:

```
[data-theme="custom"]{
```

It appears near the top of the `<style>` block, around **line 100**.
Everything you need to change is inside that block.

---

## Color Variables

| Variable | Default | What it controls |
|---|---|---|
| `--bg` | `#0d0d0d` | Main page background color |
| `--surface` | `#141414` | Card and panel backgrounds (header, match rows, etc.) |
| `--surface2` | `#1c1c1c` | Secondary panel backgrounds (tab bars, inner cards) |
| `--border` | `#2a2a2a` | Subtle dividing lines |
| `--border2` | `#3a3a3a` | More prominent borders |
| `--accent` | `#ff9900` | Primary highlight color (team number, active elements, links) |
| `--accent2` | `#cc3300` | Secondary highlight (announcements, stream labels) |
| `--green` | `#00cc44` | "On" indicators, winners, positive values |
| `--yellow` | `#ffcc00` | Your team highlight, gold/RP values |
| `--red` | `#ff2244` | Urgent alerts, red alliance |
| `--blue-a` | `#1976d2` | Blue alliance color |
| `--red-a` | `#c62828` | Red alliance color (darker variant) |
| `--text` | `#f0f0f0` | Primary text color |
| `--text-dim` | `#707070` | Dimmed/secondary text (labels, timestamps) |
| `--text-mid` | `#a0a0a0` | Mid-brightness text (table data, scores) |

### Tips for choosing colors
- For a **dark theme**: keep `--bg` and `--surface` dark, use bright `--accent` and `--text`
- For a **light theme**: use light `--bg`/`--surface`, dark `--text`, and muted `--text-dim`
- `--surface` should be slightly lighter/darker than `--bg` so cards are distinguishable
- `--accent` is used heavily — pick your most important team color here
- `--yellow` controls your team's highlight in match lists and rankings — keep it bright

---

## Background Image

You can use any image file as the background, with a washout overlay to keep
text readable.

### Step 1 — Add the image
Place your image file in the **same directory** as `PitFusion.html`.
Supported formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`

### Step 2 — Set the variable
Change `--custom-bg-image` from `none` to your filename:

```css
--custom-bg-image: url('myteamphoto.jpg');
```

### Step 3 — Adjust the washout
`--custom-bg-washout` controls how much a solid color overlay dims the image:

| Value | Effect |
|---|---|
| `0.0` | No washout — full image, no overlay |
| `0.3` | Light wash — image still very visible |
| `0.5` | Medium wash — image visible but subdued |
| `0.65` | Default — good for dark themes |
| `0.8` | Heavy wash — image barely visible |
| `1.0` | Fully covered — just the `--bg` color shows |

### Step 4 — Set the washout color
`--custom-bg-washout-color` is an RGB triplet (no `rgb()` wrapper):

```css
--custom-bg-washout-color: 0,0,0;      /* black overlay — for dark themes */
--custom-bg-washout-color: 255,255,255; /* white overlay — for light themes */
--custom-bg-washout-color: 0,30,80;     /* dark blue overlay — for team colors */
```

---

## Example: Team Colors Dark Theme

```css
[data-theme="custom"]{
  --bg:#0a0a1a;
  --surface:#10102a;
  --surface2:#181830;
  --border:#252545;
  --border2:#353560;
  --accent:#00aaff;        /* team blue */
  --accent2:#ff6600;       /* team orange */
  --green:#00e676;
  --yellow:#ffd600;
  --red:#ff1744;
  --blue-a:#1976d2;
  --red-a:#c62828;
  --text:#eef0f8;
  --text-dim:#6b7899;
  --text-mid:#9ba8cc;
  --custom-bg-image: none;
  --custom-bg-washout: 0.65;
  --custom-bg-washout-color: 0,0,0;
}
```

## Example: Light Theme with Background Image

```css
[data-theme="custom"]{
  --bg:#f5f5f5;
  --surface:#ffffff;
  --surface2:#eeeeee;
  --border:#cccccc;
  --border2:#aaaaaa;
  --accent:#003087;        /* team navy */
  --accent2:#c8102e;       /* team red */
  --green:#1a7a3a;
  --yellow:#b38000;
  --red:#cc1133;
  --blue-a:#1565c0;
  --red-a:#b71c1c;
  --text:#111111;
  --text-dim:#555555;
  --text-mid:#333333;
  --custom-bg-image: url('field.jpg');
  --custom-bg-washout: 0.75;
  --custom-bg-washout-color: 255,255,255;  /* white overlay for light theme */
}
```

---

## Notes

- After saving the file, reload the page and select **Custom** from the theme
  switcher on the setup screen.
- The theme choice is remembered between reloads, so you only need to select it once.
- If the background image isn't showing, make sure the image file is in the
  **exact same folder** as `PitFusion.html` and the filename matches exactly
  (including capitalization).
- Color values can be in any valid CSS format: `#rrggbb`, `#rgb`,
  `rgba(r,g,b,a)`, or named colors like `navy`. The washout color must use
  the plain `r,g,b` format without the `rgb()` wrapper.
