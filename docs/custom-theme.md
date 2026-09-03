# PitFusion — Custom Theme Guide

The **Custom** theme lets you set your own colours, a background image, and
frosted-panel styling — no code required.

---

## Editing in the app

1. Open **⚙ Settings** (gear icon in the header, or on the setup screen).
2. Under **Appearance**, choose **Custom**.
3. Click **Edit Custom theme…**.

Every change previews live on the display. Click **Save** to keep it — the theme
is stored in this browser's `localStorage` (key `pitfusion_custom_theme`) and
reloads automatically next time. **Reset to defaults** clears it.

### Colours

Each colour has a swatch (click to pick) and a text field. The text field also
accepts `rgba(…)` or named colours like `navy` if you want transparency or
something the picker can't express.

| Field | Controls |
|---|---|
| Page background | The area behind all panels |
| Panel / Panel — inner | Card and inner-card fills (header, match rows, tab bars) |
| Divider / Border — strong | Hairlines and heavier borders |
| Text / Text — mid / Text — dim | Primary, secondary, and label text |
| Accent / Accent 2 | Primary highlight (team number, links, active elements) and the secondary highlight |
| Text on accent | Text colour on accent-filled buttons (keep it readable on your Accent) |
| Good / win · Your team · Alert | Green "on" states, your-team gold highlight, urgent red |
| Blue alliance / Red alliance | Alliance colours |

Tips:

- **Dark theme:** dark Page/Panel, bright Accent and Text.
- **Light theme:** light Page/Panel, dark Text, muted Text — dim; set *Text on
  accent* dark or light to contrast your Accent.
- *Panel* should sit slightly lighter or darker than *Page background* so cards
  stand out.
- *Your team* is your highlight colour in match lists and rankings — keep it bright.

### Frosted panels

These apply **only when a background image is set**. *Panel tint* + *Panel
opacity* set the translucent fill over the image; *Panel blur* is the glass
blur (0 = off).

### Background image

- **Image URL** — a link (`https://…`) or, for a self-hosted copy, a filename in
  the same folder as `index.html`.
- **…or upload** — pick a local file; it's stored inline in the theme (max
  **2 MB** — larger files are rejected, use a URL instead).
- **Position** — how the image is anchored (`center`, `top`, …).
- **Wash strength / Wash colour** — a solid overlay that dims the image so text
  stays readable. `0` = full image; `1` = image fully covered by the wash colour.
  Use black for dark themes, white for light.

The image is fixed to the viewport and shows behind the panels (like the TJ²
tye-dye). It does not appear on the setup screen.

---

## Advanced: bake it into a self-hosted file

If you maintain your own copy of `index.html` and want the theme to ship with it
(no per-browser Save), click **Copy CSS** in the editor and paste the block over
the existing `[data-theme="custom"]{ … }` rule near the top of the `<style>`
section. A saved `localStorage` theme still overrides the file block if present.

### Variable reference

| Variable | Default | Meaning |
|---|---|---|
| `--bg` | `#0d0d0d` | Page background |
| `--surface` / `--surface2` | `#141414` / `#1c1c1c` | Panel / inner panel |
| `--border` / `--border2` | `#2a2a2a` / `#3a3a3a` | Divider / strong border |
| `--accent` / `--accent2` | `#ff9900` / `#cc3300` | Primary / secondary highlight |
| `--on-accent` | `#000` | Text on accent-filled buttons |
| `--green` / `--yellow` / `--red` | `#00cc44` / `#ffcc00` / `#ff2244` | Good / your team / alert |
| `--blue-a` / `--red-a` | `#1976d2` / `#c62828` | Blue / red alliance |
| `--text` / `--text-mid` / `--text-dim` | `#f0f0f0` / `#a0a0a0` / `#707070` | Text tiers |
| `--glass-bg` / `--glass-border` | `rgba(20,20,20,.72)` / `rgba(255,255,255,.14)` | Frosted panel fill / border (with image) |
| `--glass-blur` | `12px` | Frosted panel blur |
| `--page-bg-image` | `none` | `url('file.jpg')` or `none` |
| `--page-bg-pos` | `center` | Background position |
| `--page-bg-washout` | `0` | Wash overlay strength, `0`–`1` |
| `--page-bg-washout-color` | `0,0,0` | Wash overlay colour as `r,g,b` (no `rgb()` wrapper) |

These same tokens exist on every theme, so `--page-bg-image` / `--hdr-bg-image`
also work if you're hand-editing `dark`, `light`, or `tj2`.

---

## Notes

- The theme choice and Custom values are per-browser. Set them on each display.
- If a background image doesn't show, check the filename/URL and that an
  uploaded file was under 2 MB. Browser storage being full or disabled also
  blocks Save — the editor tells you, and **Copy CSS** still works.
