# Feature 5 — Multi-event support (districts, Worlds divisions)

Status: **designing**. Size: L — likely split into phases.

## Context

Some competitions are several events that run semi-independently and then converge:

- **District Championships** with multiple divisions/fields, or a DCMP that's really
  qualifying pools feeding one playoff.
- **FIRST Championship**: 8 divisions (Archimedes, Curie, …) each run their own quals +
  division playoff; division winners go to **Einstein** (the final round).

Today PitFusion is single-event: one `C.event`, one `C.nexusEvent`, one set of
`tbaMx/tbaRk/tbaWc/tbaAlliances`. Nexus queuing is per-field. A team at Worlds cares
about *their division* for quals/playoffs, then *Einstein* for the final round.

## The hard parts

1. **Event identity.** TBA models these as distinct event keys (`2026arc` = Archimedes,
   `2026cmptx` = Einstein/championship). Nexus keys them per field. Need a way — manual
   selection, or derived from a "championship" grouping — to know "I'm in division X,
   final round is Einstein."
2. **Which event's data feeds which panel.** Quals + division bracket → division event.
   The livestream, the Einstein bracket, and the "is my division still alive" state →
   Einstein event. Rankings are division-scoped. The queuing card follows wherever the
   team physically is right now (division field during division play, Einstein field
   after).
3. **Transition.** When does the display flip from "division" to "Einstein" context?
   Probably: division playoffs complete → if your alliance advanced, switch playoff/
   bracket/stream panels to Einstein while keeping division rankings visible.
4. **Nexus coverage.** Confirm Nexus even exposes Einstein / all division fields the way
   the code expects (`nowQueuing`, match list). If not, TBA-only fallback for that leg.

## Possible phasing

- **Phase 1 — division only.** Just make sure picking a division event key
  (`2026arc`) works end to end. Probably already does; verify and fix edge cases
  (bracket labelling for a division of 8 alliances, ranking display).
- **Phase 2 — manual "final round" event.** Optional second event key in setup /
  Settings ("Championship final round: `2026cmptx`"). When set, add an "Einstein" view
  (bracket + stream) reachable from a tab or toggle, independent of the division data.
- **Phase 3 — automatic transition.** Detect division-playoff completion and your
  alliance's advancement; auto-surface the Einstein view.

## Open questions

- Is the priority Worlds specifically, or also multi-division district champs?
- Manual event entry vs. trying to auto-discover the grouping from TBA
  (`event.parent_event_key` / `division_keys` exist on TBA championship events — worth
  checking; that could make it automatic).
- How much of the UI needs to show *both* contexts at once vs. a switch between them.

## Next step

Before building: pick the target (Worlds? district champs? both) and the phase-1 scope.
Then a focused session to verify current single-division behavior and list the concrete
breakages. TBA's `division_keys` / `parent_event_key` fields on championship events are
the thing to investigate first — they may remove most of the manual-config need.
