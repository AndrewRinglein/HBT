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

// pack.moves (2026-09-02) — THE ROWS COME FROM THE CODEX. The nine hand-
// transcribed rows that lived here (Move, Sidestep, Side Roll, Leap, Focus,
// Devotion, the flight ladder) are gone: content/mkenginepack.mjs compiles
// the Codex's movementAction power rows into MoveDefs by exact phrase, and
// the loader below validates them. The transcriptions were already faithful —
// the swap moved no control baseline, which is the proof. Two Codex rows the
// engine cannot express are named gaps in content/gen/enemy-pack-gaps.json:
// power.pray (no Faith quantity) and power.charging-run (a stat mod that ends
// with the Activation). Sprint is still nobody's: GAME-DESIGN lists it with
// no grantor and no Codex row exists.
import { omitDisabled } from './disable.js'
import { packMoves } from './pack.js'

// The kill-switch seam (disable.ts): byte-identical objects when nothing is
// disabled; the Iron Gauntlet disables rows here to prove tests are not
// tautological.
export const MOVES = omitDisabled(packMoves())
