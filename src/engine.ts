// The one door to the engine — THIN-SLICE-IMPLEMENTATION.md §4.5.
//
// Everything the kingdom is allowed to touch in ../engine/src is re-exported
// here, and nothing else in kingdom/src imports an engine path (ISC-003's probe
// scans for exactly that). Widening the door is a one-file diff a reviewer can
// see. The engine is read, never written, from this side: no mutator, no
// pipeline, no registry internals — options in, a Ctx and its events out.
//
// Names are the engine's own. `createBattle` and `runBattle` keep their names
// across the seam because they are the engine's surface, not the kingdom's
// vocabulary; the kingdom's functions (seam.ts) follow GLOSSARY.md's prefixes.

export { createBattle } from '../../engine/src/core/setup.js'
export type { BattleOptions } from '../../engine/src/core/setup.js'
export { runBattle } from '../../engine/src/core/battle.js'
export type { BattleResult } from '../../engine/src/core/battle.js'
export type { Ctx, Event, Outcome, Side, ScenarioDef, HeroProgress, HighProp } from '../../engine/src/core/types.js'
export { SCENARIOS, scenarioOptions, scenarioDef } from '../../engine/src/content/scenarios.js'
// Widened 2026-09-01 for the battle screen (M3): the board's geometry and
// terrain, and the unit rows' display names. Read-only content and geometry —
// no rule, no mutator.
// board.variable-size (engine, 2026-09-04): the constants are gone; the board is the map's and
// the geometry (hexId, colOf, rowOf …) is bound to it on the Ctx as `geo`. Read-only.
export { geometryOf } from '../../engine/src/core/hex.js'
export type { Board, Geometry } from '../../engine/src/core/hex.js'
export { terrainOf, terrainIdOf, isPassable } from '../../engine/src/content/maps.js'
export { UNITS } from '../../engine/src/content/index.js'
// Widened 2026-09-03 for screens.after-battle (G12): the engine's own level tables, read so the
// level-5 pick the kingdom records as an index resolves to the option in the pack's stat names.
export { LEVELS } from '../../engine/src/content/index.js'
// Widened 2026-09-03 for the Equip screen (screens.equip-stats): the engine's own
// fielded unit — the bare row with items and progress folded by the one function — so
// the numbers on the card are the numbers the battle would field. Read-only.
export { fieldedDef } from '../../engine/src/core/setup.js'
export type { UnitDef } from '../../engine/src/core/types.js'

/**
 * The engine's event vocabulary the kingdom READS — the seam's fold and nothing
 * else. Declared here, at the door, for the same reason src/core/events.ts
 * declares the kingdom's own: the landing gate lets src/core name an event and
 * nothing else with a dot in it, and it learns what counts as an event from
 * these two lists. `unit.enter` is a word the engine says; `unit.zombie` is a
 * row. Adding a name here widens the door and shows in the diff.
 */
export const ENGINE_EVENTS = [
  'battle.begin', 'battle.end',
  'map.loaded',
  'unit.enter',
  // widened 2026-09-03 (seam.loadout, G9): what the engine put on each fielded hero, per item
  'unit.equipped',
  'turn.begin', 'turn.end',
  'phase.begin', 'phase.end',
  'damage.applied', 'heal.applied',
  'life.standing', 'life.downed', 'life.dead',
] as const
