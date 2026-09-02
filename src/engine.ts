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
export type { Ctx, Event, Outcome, Side, ScenarioDef } from '../../engine/src/core/types.js'
export { SCENARIOS, scenarioOptions, scenarioDef } from '../../engine/src/content/scenarios.js'

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
  'turn.begin', 'turn.end',
  'phase.begin', 'phase.end',
  'damage.applied', 'heal.applied',
  'life.standing', 'life.downed', 'life.dead',
] as const
