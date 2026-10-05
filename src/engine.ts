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
// Widened 2026-10-01 (kingdom.encounter-result-fold, V2-ROADMAP R8): the engine's own unit identities, read-only —
// rosterUids is the one rule that numbers a fielding's units, so makeBattleState hands the heroes' uids over
// explicitly (BattleOptions.heroUids) without restating the numbering; isUnitUid is the engine's range check.
export { rosterUids, isUnitUid } from '../../engine/src/core/identity.js'
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
// Widened 2026-10-01 for kingdom.opening-rewards (SWITCHES.md sandboxWoundFielded): the engine's rule-badge roles, so the
// seam fields a campaign wound level as the engine's own Wounded badge without spelling its id.
export { RULE_BADGES } from '../../engine/src/content/index.js'
// Widened 2026-09-03 for the Equip screen (screens.equip-stats): the engine's own
// fielded unit — the bare row with items and progress folded by the one function — so
// the numbers on the card are the numbers the battle would field. Read-only.
export { fieldedDef } from '../../engine/src/core/setup.js'
export type { UnitDef } from '../../engine/src/core/types.js'
// Widened 2026-10-02 (kingdom.reads-engine; engine DECISIONS.md "the duplication review, ruled", findings K1-K18):
// the kingdom stops keeping second copies of engine facts and reads them here. Read-only rows and pure functions:
//   levelTableOf, classOf — the table a hero levels on (a civilian on its type table) and its class (K1)
//   LEVELS (above), SPECIALTIES, SPECIALTY_LEVEL — the level rows, the specialties, the level a specialty is chosen at (K15)
//   fieldedPreview, FieldOptions, UnitMods — the unit as the battle fields it, set bonuses (heroMods) included (K3, K14)
//   ITEMS, ACTIONS, HANDS, HELD_CLASSES, handsOf, splitHandsOf, usesPerBattleOf — the compiled item rows, hands, uses (K2, K4, K8)
//   XP_BY_TIER — XP per kill by enemy tier, the Codex's 2 / 5 / 15 (K7) · fnv1a — the one hash (K12)
export { fieldedPreview, levelTableOf, classOf } from '../../engine/src/core/setup.js'
export type { FieldOptions } from '../../engine/src/core/setup.js'
export type { UnitMods, ItemDef } from '../../engine/src/core/types.js'
export { SPECIALTIES, ITEMS, ACTIONS, XP_BY_TIER } from '../../engine/src/content/index.js'
export { SPECIALTY_LEVEL, HANDS, HELD_CLASSES, handsOf, splitHandsOf, usesPerBattleOf } from '../../engine/src/core/items.js'
export { fnv1a } from '../../engine/src/core/rng.js'
// Human sandbox host: public lifecycle/commands and read-only previews only.
// The passive viewer's separate door remains metadata-only.
export { advanceBattle, completeActionCycle } from '../../engine/src/core/battle.js'
export { runActivation } from '../../engine/src/ai/modes.js'
export { activationChoices, controllerOf, validateBattleCommand, executeBattleCommand } from '../../engine/src/core/commands.js'
export type { BattleCommand, ControlPolicy } from '../../engine/src/core/commands.js'
export { isAttack, isMove, isBurst, staminaCostOf } from '../../engine/src/core/action.js'
// Widened 2026-10-05 (fix.stand-up-does-nothing): grantedActionIds — the ids a unit may use right now: its own list, then any
// action a status it holds grants while held (Stand Up, the prone status's, "only appears while prone"). Read-only, pure. The
// host listed and took a unit's STORED list, so a knocked-down unit's Stand Up was never offered to the engine and its button
// did nothing. What a unit may use is the engine's answer, not the host's.
export { grantedActionIds } from '../../engine/src/core/action.js'
// Widened 2026-10-04 (viewer.move-cost-on-grid): stepCost — the engine's own charge for one step onto a hex, read-only, so
// the battle screen's movement grid shows the engine's number on a tile and adds nothing up.
export { movementOptions, stepCost } from '../../engine/src/core/movement.js'
// Widened 2026-10-05 (viewer.move-cost-on-hex): passableFor — the engine's own answer to "may this unit enter this hex from
// that one" (the board, its props and its structures), read-only, so the battle screen can put an X on a hex beside the
// movement grid that the unit cannot enter at all, without a rule of its own.
export { passableFor } from '../../engine/src/core/structure.js'
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
// Widened 2026-10-02 for fix.opening-levels (engine DECISIONS.md 2026-09-28 'the opening's party levels up; the Flaming
// Longsword is a Warrior's or a Paladin's; the Bridge gives a reward'): the engine's opening party — its six positions, the
// party a replicate drafts and fields at each (given what the earlier battles carried), who may hold a carried item and which
// of three reward cards a player keeps. Read-only content functions; src/sim/opening-run.ts carries XP and levels by the
// kingdom's own rules and hands them back as an OpeningCarry.
export { OPENING_POSITIONS, OPENING_TAKERS, openingPartyOf, openingHolderOf, openingRewardPickOf } from '../../engine/src/content/opening-party.js'
export type { OpeningCarry } from '../../engine/src/content/opening-party.js'
// Widened 2026-10-03 for kingdom.opening-draft-modifiers (engine DECISIONS.md 2026-09-28 'no Health minimum … the first hero
// gets Leadership and a random positive badge; the draft pick is weighted'): the engine's own opening draft, read-only —
// openingHeroesOf (the party a replicate drafts, each hero with its rolled badges and points) and draftScoreOf (the weighted
// score of a rolled offer) — openingHeroesOf draws which rows are offered and takes the best itself, so the run does not
// call it for its own draft. isStatName is the engine's own test of which stats a unit mod may name.
// Widened 2026-10-04 for fix.opening-draft-one-rule (engine queue): the two functions that roll a GIVEN hero, which were
// private to that file — firstHeroDraftOf (the first hero's bonuses for the hero the player chose) and draftHandOf (each
// of the three offered heroes as the Crucible rolls it), on whatever dice the caller hands in (DraftRoller). The run's
// draft is these (src/core/draft-modifiers.ts calls them and rolls nothing itself); the kingdom's own copy of the
// procedure is gone (kingdom SWITCHES.md openingDraftRuleKingdomSide, answered).
export { openingHeroesOf, draftScoreOf, firstHeroDraftOf, draftHandOf } from '../../engine/src/content/opening-party.js'
export type { DraftRoller, DraftBase, DraftRolls } from '../../engine/src/content/opening-party.js'
export { isStatName } from '../../engine/src/core/stats.js'

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
  // widened 2026-10-01 (kingdom.encounter-result-fold): a hero who stood again at the Deathbed is Wounded in the battle
  'deathbed.stood',
  // widened 2026-10-02 (engine rule.afflictions-at-zero-refiled-2): a badge an affliction's 0-Health rule gave a hero
  // (badge.gained with atZeroOf — Rotting Flesh's Fragile) is carried after the battle; a hero that ended the battle
  // transformed onto the enemy side is back to normal after it (unit.transformed, unit.reverted)
  'badge.gained', 'unit.transformed', 'unit.reverted',
] as const
