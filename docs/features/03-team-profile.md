# Feature 3 + 4 — Team profile overlay (fold in "My Team") + replacement tab

Status: **designing**. Size: M.

## Context

Today there are two overlapping team views:

- **"My Team" tab** (`rTeam()` → `#team-content`): team identity (nickname, city,
  rookie year, number), event rank / record / RP, next-match alliance breakdown, played
  match history with replay links.
- **"EPA Stats" overlay** (`openEpa()` / `renderEpa()`, `#epa-overlay`): Statbotics EPA
  summary + per-component line charts, current-event toggle, pit-map button.

Plan: move the **identity + event rank/record/RP** blocks into the EPA overlay, delete
the "My Team" tab, and add **world / country / district / state EPA ranks** to the
overlay. Then fill the freed tab slot with something new (feature 4).

## Part A — consolidate into the overlay

Move from `rTeam()` into `renderEpa()`'s header/summary area:
- Team nickname, `city, state_prov, country`, `#number`, rookie year — from `tbaTi`.
- Event **rank**, **record** (W–L–T), **RP** — from `tbaRk.rankings` (same lookup
  `rTeam` does: `r.team_key === 'frc'+myT`). Only render these when the overlay is open
  for *your own* team (`team === C.team`); for other teams there's no event-rank context
  worth showing beyond what's already there.

**New ranks** — all already in the Statbotics `team_year` response, no new calls:
`team_year.epa.ranks.total` (world), `.country`, `.district`, `.state` — each
`{rank, team_count, percentile}`. Render as a small row: `World #142 · USA #38 ·
NE District #9 · MA #4`. Hide any scope Statbotics returns null for (teams outside a
district, non-US teams).

Drop from scope for now: the next-match alliance breakdown and played-match history that
also live in `rTeam` — those are match-flow, not profile. They can move to the feature-4
tab or stay reachable elsewhere. Decide during build.

## Part B — rename the overlay

"EPA Stats" undersells it once it's a full team card. Suggestions:

| Name | Feel |
|------|------|
| **Team Profile** | plainest, clearest — recommended default |
| **Scouting Report** | FRC-native, matches how pit crews talk |
| **Team Card** | short, works in a tab/button |
| **Deep Dive** | casual, less descriptive |

Recommendation: **"Team Profile"** for the header/button, or **"Scouting Report"** if you
want it to sound like a scouting tool. Update: the `📈 EPA Stats` footer button, the
`.epa-title` text ("EPA Stats —"), the "View EPA stats for team N" tooltip in
`makeTeamsClickable()`, and any doc references. Keep the `epa-*` ids/classes as-is
(internal only) to keep the diff small.

## Part C — replacement tab (feature 4)

Left sidebar tabs today: **Rankings · My Team · Alerts** (and in playoffs: Queuing ·
Rankings · Alerts). Removing "My Team" frees one slot. Options:

| Tab | What it shows | Why it fits a pit display |
|-----|---------------|---------------------------|
| **Schedule** *(recommended)* | Your team's matches inline — next few + recent results, auto-scrolled to the active one. | The "📋 Our Schedule" overlay logic already exists; promoting it to an always-visible tab is high value and low effort. |
| **Next Match** | Scout card for the upcoming match: all 6 teams with EPA, records, your alliance highlighted. | Directly useful in the 10 min before a match; pulls together data already loaded. |
| **Notes** | Pit-crew scratchpad, `localStorage`-persisted, per event. | Zero API cost; teams improvise this on paper today. |

Recommendation: **Schedule** as the replacement (reuses `#schedule-overlay` rendering,
clearly useful), with **Next Match** as a strong follow-up candidate.

## Verification

Open the renamed overlay for your own team: identity + event rank/record/RP + the four
EPA rank scopes all render, charts still work, current-event toggle still works. Open it
for another team: no event-rank block, ranks + charts still show. Confirm the old "My
Team" tab is gone and the new tab renders and switches cleanly. Walk playoff mode.
