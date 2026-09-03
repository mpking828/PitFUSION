// ============================================================
//  PitFUSION Configuration
//  Edit this file to configure your keys and settings.
//  Place this file in the same folder as PitFUSION.html
// ============================================================

// ── API Keys ─────────────────────────────────────────────────
const NEXUS_KEY = 'YOUR_NEXUS_KEY';
const TBA_KEY   = 'YOUR_TBA_KEY';

// ── EPA Field Definitions by Year ────────────────────────────
// Each year maps to the EPA breakdown fields returned by Statbotics.
// The REST API endpoint is:
//   https://api.statbotics.io/v3/team_year/{team}/{year}
// Response structure: data.epa.breakdown contains game-specific components.
// To update for a new season:
//   1. Look up the new year's breakdown field names in the Statbotics API docs
//   2. Add a new entry below using the year as the key
//
// Fields:
//   key   — dot-notation path into the API response (e.g. "epa.total" or "epa.breakdown.auto_notes")
//   label — display label shown in PitFUSION
//   color — bar color for the chart (any CSS color)

// Field paths use dot-notation into the API response.
// team_year:  data.epa.breakdown.{field}
// team_match: data.epa.breakdown.{field}
const EPA_FIELDS = {
  2026: [
    { key: 'epa.breakdown.total_points',   label: 'Total EPA',           color: '#00d4ff' },
    { key: 'epa.breakdown.auto_points',    label: 'Auto EPA',            color: '#00e676' },
    { key: 'epa.breakdown.teleop_points',  label: 'Teleop EPA',          color: '#ffd600' },
    { key: 'epa.breakdown.endgame_points', label: 'Endgame EPA',         color: '#ff6b35' },
    { key: 'epa.breakdown.energized_rp',   label: 'Energized RP EPA',    color: '#a78bfa' },
    { key: 'epa.breakdown.supercharged_rp',label: 'Supercharged RP EPA', color: '#f472b6' },
  ],
  2025: [
    { key: 'epa.breakdown.total_points',   label: 'Total EPA',           color: '#00d4ff' },
    { key: 'epa.breakdown.auto_points',    label: 'Auto EPA',            color: '#00e676' },
    { key: 'epa.breakdown.teleop_points',  label: 'Teleop EPA',          color: '#ffd600' },
    { key: 'epa.breakdown.endgame_points', label: 'Endgame EPA',         color: '#ff6b35' },
    { key: 'epa.breakdown.rp_1',           label: 'Coral RP EPA',        color: '#a78bfa' },
    { key: 'epa.breakdown.rp_2',           label: 'Barge RP EPA',        color: '#f472b6' },
  ],
  // Add future years here. Check field names at:
  //   https://api.statbotics.io/v3/team_year/{team}/{year}  → epa.breakdown
};
