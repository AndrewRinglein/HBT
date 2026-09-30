// THE AI MODE ROWS — ai.scorer (AI-DESIGN.md §3C, ruled 2026-09-26: "a mode per
// unit type = characteristic rules + scoring").
//
// A row is a unit type's characteristics as fixed rules (`rules`: the procedure
// in src/ai/modes.ts) plus the scoring it chooses with: whom to attack
// (`target`), what its movement is measured against (`anchor`), and the tiers
// for its other choices (`weights`). A new mode is a new row; a row that reuses
// a procedure with other weights costs no code at all.
//
// These ten re-express the modes that were hand rules until 2026-09-26, number
// for number: the control battles are byte-identical. Every tier below is the
// rule it replaced, and the comment says which. Keyed bare ('dumb-melee' — what
// a unit's `ai` field holds); the id carries the kind ('ai.dumb-melee').
import type { AiModeRow, AiTier } from '../core/types.js'
import { omitDisabled } from './disable.js'

/** Lowest Health first — the targeting every mode has used since 2026-08 (ties: lower id). */
const WEAKEST: readonly AiTier[] = [{ targetHealth: -1 }]
/** Close on the anchor: nearest the anchor wins, ties to the order listed. */
const CLOSE: readonly AiTier[] = [{ anchorDistance: -1 }]
/** A support heal goes to whoever is missing the most (ties: lower id). */
const HEAL: readonly AiTier[] = [{ missing: 1 }]
/** A burst is worth its net forecast (ties: action order, then centre). */
const BURST: readonly AiTier[] = [{ burstValue: 1 }]
/** The kite's hex, in strict priority: safe, then a shot, then height, then spacing. */
const POSITION: readonly AiTier[] = [{ safe: 1 }, { canShoot: 1 }, { highGround: 1 }, { spacing: 1 }]
/**
 * The kite's hex when NO melee ally of its side stands (encounter.opening.bridge-ai, 2026-09-30;
 * SWITCHES.md aiKiteAlone): a safe shot first, then ANY shot, then height, then spacing. The
 * screened ladder above holds its distance while an ally holds the line; with nobody holding it,
 * the shot is the point — a warband of kiters against walkers it can never safely shoot (an Imp's
 * Blast reaches 4, a walking hero threatens Movement + 1) fled forever and the Bridge never ended.
 * The shot here is the legality geometry's (clearShot: reach, line), not distance alone.
 */
const POSITION_ALONE: readonly AiTier[] = [{ safe: 1, clearShot: 1 }, { clearShot: 1 }, { highGround: 1 }, { spacing: 1 }]

const common = { heal: HEAL, burst: BURST }

const rows: Record<string, AiModeRow> = {
  // never attacks; the reachable hex farthest from the nearest enemy
  'flee': { id: 'ai.flee', rules: 'flee', target: WEAKEST, anchor: 'away',
    weights: { ...common, move: [{ enemyDistance: 1 }] } },
  // straight at the nearest enemy: closest to it, then the cheaper path, then the shorter
  'dumb-melee': { id: 'ai.dumb-melee', rules: 'dumb-melee', target: WEAKEST, anchor: 'nearest-enemy',
    weights: { ...common, move: [{ anchorDistance: -1 }, { pathCost: -1 }, { pathLength: -1 }] } },
  // ends adjacent to the weakest enemy it can reach; else closes on the nearest
  'melee-aggressive': { id: 'ai.melee-aggressive', rules: 'melee-aggressive', target: WEAKEST, anchor: 'target',
    weights: { ...common, move: CLOSE } },
  // holds at reach and shoots the weakest thing it can see
  'ranged-kite': { id: 'ai.ranged-kite', rules: 'ranged-kite', target: WEAKEST, anchor: 'range-band',
    weights: { ...common, move: CLOSE, position: POSITION, positionAlone: POSITION_ALONE } },
  // stays by the nearest ally under half Health (else the nearest ally)
  'defender': { id: 'ai.defender', rules: 'defender', target: WEAKEST, anchor: 'ward',
    weights: { ...common, move: CLOSE } },
  // allies first — heals, powers — then fights like a kiter
  'support': { id: 'ai.support', rules: 'support', target: WEAKEST, anchor: 'range-band',
    weights: { ...common, move: CLOSE, position: POSITION, positionAlone: POSITION_ALONE } },
  // the whole side on one target: the weakest standing enemy
  'focused-fire': { id: 'ai.focused-fire', rules: 'focused-fire', target: WEAKEST, anchor: 'target',
    weights: { ...common, move: CLOSE } },
  // damage or healing, whichever is worth more — ONE tier, the two summed
  'value-hunter': { id: 'ai.value-hunter', rules: 'value-hunter', target: WEAKEST, anchor: 'nearest-enemy',
    weights: { ...common, move: CLOSE, value: [{ heal: 1, damage: 1 }] } },
  // stays adjacent to the nearest ally that is not itself a follower
  'follow': { id: 'ai.follow', rules: 'follow', target: WEAKEST, anchor: 'lead',
    weights: { ...common, move: CLOSE } },
  // picks the weakest enemy when it first acts and pursues it until it falls
  'hunter': { id: 'ai.hunter', rules: 'hunter', target: WEAKEST, anchor: 'quarry',
    weights: { ...common, move: CLOSE } },
}

/** The registry. Order is the Confusion order (capability.confusion: the next mode stands in). */
export const AI_MODE_ROWS: Readonly<Record<string, AiModeRow>> = omitDisabled(rows, 'ai.')
