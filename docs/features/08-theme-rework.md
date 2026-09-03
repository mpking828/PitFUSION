# Feature 8 — Theme rework + in-app Custom theme editor

Status: **built** (`feat/theme-rework`, Parts A–D). Size: M–L. One PR.
Follow-up (aggressive TJ² collapse) tracked separately in [../roadmap.md](../roadmap.md).

## Goals

1. **Generalise the theme engine** — the TJ² theme carries a background image,
   frosted-glass panels and accent-on-dark buttons via ~200 bespoke
   `[data-theme="tj2"]` rules. Promote that treatment into theme-neutral CSS
   variables so *any* theme — especially Custom — can use it.
2. **Theme picker in Settings** — the picker only exists on the setup screen. Add it
   to the runtime `#settings-overlay` (Appearance section); selecting applies live.
3. **In-app Custom theme editor** — edit every Custom colour, the glass treatment and
   a background image (URL or uploaded file → data URL), live preview, saved to
   `localStorage`. No more editing the CSS by hand.

## Part A — generalised tokens  ✅ done (`60d8f9c`)

New `:root` tokens, all no-op by default (dark/light byte-identical, verified via
computed styles):

| Token(s) | Purpose |
|---|---|
| `--page-bg-image` `--page-bg-pos` `--page-bg-washout` `--page-bg-washout-color` | full-page fixed background image + wash overlay |
| `--hdr-bg-image` `--hdr-bg-pos` `--hdr-bg-washout` `--hdr-bg-washout-color` | header-only background image + wash |
| `--glass-bg` `--glass-border` `--glass-blur` | frosted panel treatment, applied under `body.page-has-bg` |
| `--on-accent` | text/icon colour on accent-filled buttons |

- `body` background layering + the frosted-panel group are theme-agnostic now.
  `body[data-theme="custom"]` / `.custom-has-bg` replaced by the generic
  `--page-bg-*` path + `body.page-has-bg`.
- `.hdr` consumes `--hdr-bg-*`; TJ² sets the tokens instead of a bespoke rule.
- Custom block renamed `--custom-bg-*` → `--page-bg-*`, gained `--glass-*` /
  `--on-accent`; still the hand-editable fallback.
- JS: `applyCustomHasBg` → `applyPageBg` (any theme), called from `applyTheme`.

### Deferred: aggressive TJ² collapse

Part A did **not** touch the ~195 remaining fine-grained `[data-theme="tj2"]` rules
(text colours, chip tints, pill backgrounds on the bracket / rankings / My Team
views). Many map onto `--text` / `--text-mid` / `--text-dim` / `--glass-*` and could
move into the base rules. That needs a full running-app visual regression pass
(Nexus + TBA keys, every tab + overlay) — tracked as a follow-up PR in
[../roadmap.md](../roadmap.md), separate from the editor work.

## Part B — theme picker in Settings  ✅ done (`83fa5db`)

- `THEMES` array (`{id, name, swatch}`) + `renderThemeSwatches(container)` — the setup
  screen and the new Settings section both render from it; no duplicated markup.
- `#settings-overlay` `.help-card` gains an **Appearance** `<h3>` (shown in both
  hosted and self-hosted; only the API-keys block is mode-gated).
- Selecting a swatch → existing `selectTheme()` → live apply, persists
  `pitfusion_theme`, keeps the setup-screen group in sync.
- **"Edit Custom theme…"** button → selects Custom + opens the editor (Part C).

## Part C — Custom theme editor  ✅ done (`3950da8`)

- Storage: `localStorage['pitfusion_custom_theme']` — `{v, colors, glass, bg}`.
- `applyCustomTheme(cfg)` writes one `<style id="custom-theme-style">` block of
  `[data-theme="custom"]{ --x: … }`; wins by source order. Pre-paint injection folded
  into the line-41 IIFE (no flash); try/catch → static fallback.
- UI: `<input type=color>` + text field per token (Base / Accents / Status /
  Alliance groups); frosted-glass toggle + opacity/blur sliders; background image via
  URL **or** file upload → data URL (2 MB cap, rejected with a message) + washout
  slider/colour; live preview on every change; **Save / Reset / Copy CSS**.
- Override selector is `html[data-theme="custom"],body[data-theme="custom"]`
  (applyTheme sets the attribute on both) so it beats the static block everywhere.

## Part D — docs  ✅ done

- `docs/custom-theme.md` rewritten around the in-app editor (+ "bake into file"
  section and the updated `--page-bg-*` / `--glass-*` variable reference).
- Help overlay gains a **Themes** section.
- `CLAUDE.md` gains a **Themes** section (token model, `pitfusion_custom_theme`).

## Verification

- dark / light / TJ² visually unchanged vs `main` (setup + main screen + one overlay).
- Custom editor: change accent → whole UI updates live; upload ~500 KB image → fixed
  page background with washout; reload → persists, no flash; Reset → static defaults;
  >2 MB upload → rejected.
- Appearance section present in both hosted and self-hosted; keys block still
  mode-gated. localStorage disabled → app still loads, editor shows a "can't save"
  notice.
- Single `public/index.html`, no build step, no new network origins.
