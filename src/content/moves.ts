// Movement powers — content rows, not code.
//
// Angela 2026-08-21: "Movement is supposed to be a type of activation. There
// are different abilities in movement, like the sidestep, the regular move, or
// the flight. Movement is a choice, and that movement choice can have a
// modifier. It can cost stamina. It shouldn't be hard-coded. It should be
// content-driven."
//
// PUBLISHED SOURCE — the Codex (content/settled.json `powers`, movementAction
// rows, Angela 2026-08-21) and GAME-DESIGN.md §"Movement actions are a family".
// Ids live under the existing `power.` kind: Angela 2026-08-20 (Codex): "flight
// is a granted movement POWER, never a property. Grants power.flight."
//
// WHO GRANTS WHAT is unit data, never a default in core. Codex 2026-08-21:
// power.move is universal to all units; Sidestep goes to Warrior/Mage/Priest/
// Paladin, Side Roll to Rogue/Ranger; "Beasts and Civilians get neither";
// an enemy row carries exactly ONE movement power (Angela 2026-08-21).
//
// Sprint is NOT here: GAME-DESIGN lists it with no grantor and marks it "Not
// ruled" — a row nobody grants would be invented content. The flight ladder
// (labored/standard/swift, Codex 2026-08-20) joins with backlog movement.flight.

import type { MoveDef } from '../core/types.js'
import { omitDisabled } from './disable.js'

const RAW_MOVES: Readonly<Record<string, MoveDef>> = {
  'power.move': {
    // Codex row verbatim: "Move up to your Movement, hex by hex, paying each
    // hex's terrain cost. Provokes attacks of opportunity normally." stamina 1,
    // cooldown 0, universalToAllUnits. (Provokes wait on AoO — not in the
    // baseline; the step loop has their beat reserved. Enemies run no stamina,
    // so the cost is inert on their side — see moveStaminaCost.)
    id: 'power.move', name: 'Move', shape: 'path', staminaCost: 1, budgetMod: 0, cooldown: 0,
  },
  'power.sidestep': {
    // Codex row verbatim (Angela 2026-08-21): "Move exactly 1 hex in any
    // direction. It provokes nothing, and the destination's terrain cost is
    // irrelevant... Costs no Stamina, and it is usable every other Turn."
    // stamina 0, COOLDOWN 1 — her ruling: "it does break this statement of
    // 'it's always available.' No, it's available every other turn." Still a
    // Step, so ground effects on entry fire — only Flight has zero Steps.
    id: 'power.sidestep', name: 'Sidestep', shape: 'sidestep', staminaCost: 0, budgetMod: 0, cooldown: 1,
  },
  'power.side-roll': {
    // Codex row verbatim (Angela 2026-08-21): "the same half-step, priced the
    // other way round" — 1 Stamina, no cooldown, always there. Rogues and
    // Rangers take this INSTEAD of Sidestep. The second sidestep-shaped row:
    // the shape is a mechanism, these two rows are pure data.
    id: 'power.side-roll', name: 'Side Roll', shape: 'sidestep', staminaCost: 1, budgetMod: 0, cooldown: 0,
  },
  // ── the class bonus moves — Codex rows, S17 half-step split (settled.json
  // powers, movementAction:true, 2026-08-25). Each is a sidestep-shaped power
  // with a stepRange and riders; the MECHANISM is MoveDef.effects
  // (movement.bonus-actions) and these three rows are pure data.
  'power.leap': {
    // Codex row verbatim: "Move exactly 2 hexes in any direction. It provokes
    // nothing, and the destination's terrain cost is irrelevant. You gain +2
    // Strength until the end of the Turn. It costs 2 Stamina and there is no
    // cooldown. It is a bonus move, so it does NOT add your Movement stat.
    // Warriors only." Entry ground beat fires at the DESTINATION only — see
    // SWITCHES.md leapCrossesIntermediateHex.
    id: 'power.leap', name: 'Leap', shape: 'sidestep', stepRange: 2,
    staminaCost: 2, budgetMod: 0, cooldown: 0,
    effects: [{ kind: 'statMod', stat: 'strength', value: 2, until: 'endOfTurn' }],
  },
  'power.focus': {
    // Codex row verbatim: "Do not move at all. Gain 1 Stamina. It costs no
    // Stamina and there is no cooldown. It is a bonus move... it moves you
    // zero hexes on purpose. Mages only."
    id: 'power.focus', name: 'Focus', shape: 'sidestep', stepRange: 0,
    staminaCost: 0, budgetMod: 0, cooldown: 0,
    effects: [{ kind: 'gainStamina', value: 1 }],
  },
  'power.devotion': {
    // Codex row verbatim: "Do not move at all. Lose 1 Stamina Max for the rest
    // of the Battle, and gain 2 Stamina. There is no cooldown... it moves you
    // zero hexes on purpose. Priests only." Max floor 1 — the wounds precedent
    // (3-UNITS-NOTES: "Wounds dock Max Stamina, never Regen (floor 1)").
    id: 'power.devotion', name: 'Devotion', shape: 'sidestep', stepRange: 0,
    staminaCost: 0, budgetMod: 0, cooldown: 0,
    effects: [{ kind: 'loseMaxStamina', value: 1 }, { kind: 'gainStamina', value: 2 }],
  },
  // ── the flight ladder — Codex rows, Angela 2026-08-20: "labored 2 stamina
  // and Movement -1, standard 1 stamina and full Movement, swift 0 stamina and
  // Movement +1." A targeted ATOMIC jump: over units and obstructions, no
  // terrain cost, no entry beats (zero Steps); where you LAND is a hex like
  // any other — its End-of-Activation ladder fires normally. Grantors today:
  // the Green Drake carries the standard rung (her dictated "flight movement
  // power that moves +0 and costs 1 stamina"); swift is granted by
  // item.aegis-of-the-fleet (no engine loadout yet); labored has no grantor.
  'power.flight': {
    id: 'power.flight', name: 'Flight', shape: 'flight', staminaCost: 1, budgetMod: 0, cooldown: 0,
  },
  'power.flight-swift': {
    id: 'power.flight-swift', name: 'Flight (Swift)', shape: 'flight', staminaCost: 0, budgetMod: 1, cooldown: 0,
  },
  'power.flight-labored': {
    id: 'power.flight-labored', name: 'Flight (Labored)', shape: 'flight', staminaCost: 2, budgetMod: -1, cooldown: 0,
  },
}

// The kill-switch seam (disable.ts): byte-identical objects when nothing is
// disabled; the Iron Gauntlet disables rows here to prove tests are not
// tautological.
export const MOVES = omitDisabled(RAW_MOVES)
