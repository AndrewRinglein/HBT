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
export type { ActionDef, BadgeDef } from '../../engine/src/core/types.js'
/* ONE ACTION TYPE (engine 26fa562, §11): ACTIONS is the registry; ATTACKS/ABILITIES are views over it */
export { UNITS, ACTIONS, ATTACKS, ABILITIES, BADGES } from '../../engine/src/content/index.js'
export { MOVES } from '../../engine/src/content/moves.js'
export { STATUSES } from '../../engine/src/content/statuses.js'
export { MAPS, terrainOf, terrainIdOf, isPassable, LAYER_IDS, boardOf, deployOf } from '../../engine/src/content/maps.js'   // LAYER_IDS: the ground layers by number; boardOf/deployOf: a map's board and edges (2026-09-04)
/* THE BOARD IS THE MAP'S (engine 5603c40, EVENTS-FOR-THE-VIEWER §10): no WIDTH/HEIGHT constants,
   no free hex functions — geometryOf({width, height}) for the board a log's map.loaded names */
export { geometryOf, FORMATS } from '../../engine/src/core/hex.js'
export type { Board, Edge, Geometry } from '../../engine/src/core/hex.js'
export { prepareBattleField, initialMapId } from '../../engine/src/view/field.js'
