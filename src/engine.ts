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
export type { Ctx, Event, Outcome, Side, ScenarioDef, HeroProgress, HighProp, Prop, AuthoredMap } from '../../engine/src/core/types.js'
export { SCENARIOS, scenarioOptions, scenarioDef } from '../../engine/src/content/scenarios.js'
// Widened 2026-09-28 (kingdom.encounter-battles): the engine's encounters, read-only, so the sandbox can
// field one (its map, setup, schedule and civilians) through the same createBattle and commands.
export { encounterDef } from '../../engine/src/content/scenarios.js'
export { ENCOUNTERS } from '../../engine/src/content/index.js'
export type { EncounterDef } from '../../engine/src/core/types.js'
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
// Read-only combat badge IDs at the campaign seam; story badges stay in the roster.
export { BADGES } from '../../engine/src/content/index.js'
// Widened 2026-09-03 for the Equip screen (screens.equip-stats): the engine's own
// fielded unit — the bare row with items and progress folded by the one function — so
// the numbers on the card are the numbers the battle would field. Read-only.
export { fieldedDef } from '../../engine/src/core/setup.js'
export type { UnitDef } from '../../engine/src/core/types.js'
// Human sandbox host: public lifecycle/commands and read-only previews only.
// The passive viewer's separate door remains metadata-only.
export { advanceBattle, completeActionCycle } from '../../engine/src/core/battle.js'
export { runActivation } from '../../engine/src/ai/modes.js'
export { activationChoices, controllerOf, validateBattleCommand, executeBattleCommand } from '../../engine/src/core/commands.js'
export type { BattleCommand, ControlPolicy } from '../../engine/src/core/commands.js'
export { isAttack, isMove, isBurst, staminaCostOf } from '../../engine/src/core/action.js'
export { movementOptions } from '../../engine/src/core/movement.js'
export { preview } from '../../engine/src/core/pipeline.js'
export { burstCentres, previewBurst } from '../../engine/src/core/burst.js'
export { previewPower } from '../../engine/src/core/ability.js'
export { saveBattle, restoreBattle } from '../../engine/src/core/snapshot.js'
// Widened 2026-09-24 for the sandbox Swap (V2 R6, engine v2.loadout-swap dd78ff1): the swap's
// stamina cost, read-only. Legality is validateBattleCommand's (canSwap inside it); performSwap
// stays closed — the swap is issued as the engine's own `swap` battle command.
export { swapCostOf } from '../../engine/src/core/swap.js'
// Widened 2026-09-24 for V2 R7 (engine v2.prop-attack e049b15, COMBAT-V2 §12.2 "Props can be
// targeted directly"): the hexes an attack with Destroy may be aimed at, read-only. Legality is
// validateBattleCommand's (canAttackHex inside it); attackProp stays closed — the blow is issued
// as the engine's own { hex } action command.
export { propAttackHexes } from '../../engine/src/core/prop-attack.js'
// Widened 2026-09-28 (plumbing.vocabulary-export; DECISIONS.md "the duplication review, ruled",
// findings K6 K13): the engine's ONE vocabulary — its outcomes, life states and every event type it
// emits — read here instead of kept as copies. Names only; no rule.
export { engineVocabulary } from '../../engine/src/core/vocabulary.js'
export type { EngineVocabulary } from '../../engine/src/core/vocabulary.js'
export { OUTCOMES, LIFE_STATES } from '../../engine/src/core/types.js'
// Widened 2026-09-30 for viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7; engine preview.from-planned-hex aaacea8):
// the ghost's forecast (forecastFrom, previewFrom — reach, provoke points, the attack from where the hero WOULD stand),
// the enemy reach query (threatOf — "pointing at an enemy lights up where it can move and hit") and who holds a zone
// of control over a hex (zocHoldersAt — the hatching). Read-only lookaheads on forks; no rule, no mutator.
export { forecastFrom, previewFrom, threatOf, actionReach } from '../../engine/src/core/forecast.js'   // actionReach: the aim arrow's length (engine fix.aim-reach; SWITCHES playInputAimReach)
export type { Forecast, PlannedMove } from '../../engine/src/core/forecast.js'
export { zocHoldersAt } from '../../engine/src/core/movement.js'
// Widened 2026-09-30 for viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8; engine command.end-player-phase ad3f1cb):
// the heroes that have not acted — the End Turn pop-up's question ("If you have anybody who has not acted, it should pop
// up"). A read-only query; End Turn itself is the engine's `end-player-phase` command.
export { heroesYetToAct } from '../../engine/src/core/commands.js'

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
  'activation.begin', // t=0 shared-viewer seam probe reads the established engine event
  // Sandbox burst command probes consume the engine's existing payment/result vocabulary.
  'action.spent', 'stamina.spent', 'burst.declared', 'attack.hit',
  'map.loaded',
  'unit.enter',
  // widened 2026-09-03 (seam.loadout, G9): what the engine put on each fielded hero, per item
  'unit.equipped',
  'turn.begin', 'turn.end',
  // 'phase.end' left 2026-09-28: the engine never emits it (it is a cause id); test/vocabulary.test.ts
  // checks this list against the engine's own (plumbing.vocabulary-export, review finding K13).
  'phase.begin',
  // seam.ts folds the item uses a battle spent (capability.charges)
  'charge.spent',
  'damage.applied', 'heal.applied',
  'life.standing', 'life.downed', 'life.dead',
] as const
