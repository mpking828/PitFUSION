# PitFusion roadmap

Feature backlog. Status: **idea** → **designing** → **ready** → **building** → **done**.
One design doc per non-trivial feature under `docs/features/`. Build one per PR against
`main` (Cloudflare auto-deploys on merge).

| # | Feature | Status | Size | Design doc |
|---|---------|--------|------|------------|
| 1 | Enhanced Statbotics mode — predicted match winners (opt-in) | designing | M | [features/01-statbotics-predictions.md](features/01-statbotics-predictions.md) |
| 2 | 2027 season support | designing | S–M | [features/02-2027-season.md](features/02-2027-season.md) |
| 3 | Fold "My Team" into the EPA overlay + rename it + add multi-scope ranks | designing | M | [features/03-team-profile.md](features/03-team-profile.md) |
| 4 | Replacement tab for the freed "My Team" slot | designing | S–M | covered in #3 doc |
| 5 | Multi-event support (district playoffs, Worlds divisions → merged playoffs) | designing | L | [features/05-multi-event.md](features/05-multi-event.md) |
| 6 | Help overlay (repurpose the "?" button) — documents panel resizing | done | XS | [features/06-help-overlay.md](features/06-help-overlay.md) |
| 7 | Better Statbotics caching (persist + revalidate) | designing | S–M | [features/07-statbotics-caching.md](features/07-statbotics-caching.md) |
| 8 | Theme rework — generalised tokens, in-app Custom theme editor, theme picker in Settings | building | M–L | [features/08-theme-rework.md](features/08-theme-rework.md) |

Size: XS < half a day · S ~1 session · M ~2–3 sessions · L multi-session, may split.

## Deferred / follow-up

- **#8 follow-up — aggressive TJ² CSS collapse.** Part A generalised the theme
  *tokens*; the ~195 fine-grained `[data-theme="tj2"]` text/pill re-tint rules are
  still hand-written. Fold the ones that map cleanly onto `--text` / `--text-mid` /
  `--text-dim` / `--glass-*` into the base rules and delete them. Needs a full
  running-app visual regression pass (Nexus + TBA keys, every tab + overlay), so it's
  its own PR — **not** part of the #8 editor work.

## Suggested build order

1. **#2 (2027 season)** — but it's *blocked until the Jan 9 2027 kickoff*; do the
   non-blocked prep now (audit for hardcoded `2026`, confirm year is always dynamic).
2. **#7 (caching)** — small, isolated, improves the worst current pain (EPA load time),
   and #1 and #3 both lean on Statbotics so they benefit.
3. **#6 (reset layout)** — trivial, ship alongside anything.
4. **#3 + #4 (team profile + new tab)** — self-contained UI refactor.
5. **#1 (predictions)** — builds on #7's caching; needs the UX decision first.
6. **#5 (multi-event)** — largest, most invasive to the data model; do it last and
   probably split into its own mini-roadmap.

See [features/06-help-overlay.md](features/06-help-overlay.md).
