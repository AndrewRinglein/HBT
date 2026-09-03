// The one door into the engine — THREE-PACKAGES-PLAN.md §3, mirroring
// kingdom/src/engine.ts.
//
// Everything the viewer is allowed to touch in ../../engine/src is re-exported
// here, and nothing else in viewer/ imports an engine path (tools/gate.mjs
// probes for exactly that). The door exports TYPES and READ-ONLY CONTENT —
// unit definitions, attack/ability/move/status tables, maps and hex geometry.
// It never exports a rule: no mutator, no pipeline, no preview(), no AI. The
// viewer reads events[]; every quantity on screen is in the log, in this
// content, or the engine owes an event (plan §6, §8.3).
//
// Widening the door is a one-file diff a reviewer can see.

export type { Ctx, Event, Outcome, Side, UnitDef, AttackDef, AbilityDef, MoveDef } from '../../engine/src/core/types.js'
export type { StatusDef } from '../../engine/src/core/status.js'
export { UNITS, ATTACKS, ABILITIES } from '../../engine/src/content/index.js'
export { MOVES } from '../../engine/src/content/moves.js'
export { STATUSES } from '../../engine/src/content/statuses.js'
export { MAPS, terrainOf, terrainIdOf, isPassable } from '../../engine/src/content/maps.js'
export { WIDTH, HEIGHT, hexId, colOf, rowOf } from '../../engine/src/core/hex.js'
