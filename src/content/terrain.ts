// Pure terrain metadata and composition. Registry decoding lives in maps.ts.
// Moved without changing ruled tables or the disable seam; one implementation.
import { TERRAIN, type DamageType } from '../core/types.js'
import { disabledIds } from './disable.js'

/** The authored glyph for each terrain kind. MAP-01's legend is the source. */
export const GLYPH: Readonly<Record<string, number>> = {
  '.': TERRAIN.OPEN, 'h': TERRAIN.HILLS, 'f': TERRAIN.FOREST, 'r': TERRAIN.ROCKY,
  'R': TERRAIN.ROCKY_HILLS, 'w': TERRAIN.WATER, 'x': TERRAIN.IMPASSABLE,
  'b': TERRAIN.BURNING, 'p': TERRAIN.POISONED,
  // v2.ground-table: no document assigns these glyphs — SWITCHES.md groundGlyphs.
  'g': TERRAIN.GRASS, 'y': TERRAIN.WHEAT, 'u': TERRAIN.BUSH, 'o': TERRAIN.WOODLAND, 'l': TERRAIN.LAVA,
}

/** The id a terrain kind answers to in a log line or a modifier source. */
const TERRAIN_ID: Readonly<Record<number, string>> = {
  [TERRAIN.OPEN]: 'terrain.open', [TERRAIN.HILLS]: 'terrain.hills',
  [TERRAIN.FOREST]: 'terrain.forest', [TERRAIN.ROCKY]: 'terrain.rocky',
  [TERRAIN.ROCKY_HILLS]: 'terrain.rocky-hills', [TERRAIN.WATER]: 'terrain.water',
  [TERRAIN.IMPASSABLE]: 'terrain.impassable',
  [TERRAIN.BURNING]: 'terrain.burning', [TERRAIN.POISONED]: 'terrain.poisoned',
  [TERRAIN.GRASS]: 'terrain.grass', [TERRAIN.WHEAT]: 'terrain.wheat', [TERRAIN.BUSH]: 'terrain.bush',
  [TERRAIN.WOODLAND]: 'terrain.woodland', [TERRAIN.LAVA]: 'terrain.lava',
}

export function terrainIdOf(terrain: number): string {
  return TERRAIN_ID[terrain] ?? `terrain.${terrain}`
}

/**
 * IMPASSABLE — a cost no movement budget can ever pay.
 *
 * 999, not Infinity: Law 7 says integers only in combat math, and Infinity
 * poisons every arithmetic comparison downstream. A budget is at most a unit's
 * movement, which is single digits, so 999 is unreachable by construction.
 */
export const IMPASSABLE = 999

/** Can a unit stand here at all? */
export function isPassable(terrain: number): boolean {
  return moveCostOf(terrain) < IMPASSABLE
}

/**
 * Terrain is COMPOSED from ground traits — cost AND modifiers.
 *
 * SOURCE OF TRUTH: `GROUND-REQUIREMENTS.md` §1.1 (Angela, 2026-08-13). Every number
 * here is copied from that table. None of them are chosen in this file, and none of
 * them are switches — a value with a stated owner is not an open question.
 *
 * That table marks Rocky Hills "composed", and composition covers the MODIFIERS as
 * well as the cost: it is rock and a climb, so it carries both sets. That is why
 * traits exist rather than a hand-written row per combination.
 */
export type Trait = 'rough' | 'elevated' | 'wet' | 'burning' | 'poisoned'
/** [statusId, amount] pairs — what a terrain APPLIES, the inverse of its strips. */
export type Applies = readonly (readonly [string, number])[]
/**
 * A V2 ground hazard (COMBAT-V2 §3.2, lava): typed damage and statuses, dealt on
 * ENTRY — a step, a sidestep or a push that carries the unit in — and again at
 * the occupant's END OF ACTIVATION. The damage is direct and meets the type's own
 * resist (§8.2); the statuses tick against theirs.
 */
export type Hazard = { readonly damageType: DamageType; readonly damage: number; readonly applies: Applies }
type Mods = { moveCost: number
  /** V2 §3.2 concealment: accuracy of a RANGED attack against the occupant (negative hides). */
  rangedAccuracyAgainst?: number
  /** V2 §3.2 concealment: accuracy of a MELEE attack against the occupant. */
  meleeAccuracyAgainst?: number
  hazard?: Hazard
  accuracy?: number; reach?: number; dodge?: number; armor?: number; resist?: number
  /** Statuses reduced by 1 when a unit STEPS ONTO this terrain. */
  stripsOnEnter?: readonly string[]
  /** Statuses reduced by 1 at the occupant's END OF ACTIVATION (the rung Airwalk will also consult). */
  stripsOnActivationEnd?: readonly string[]
  /** Statuses APPLIED [id, amount] when a unit STEPS ONTO this terrain — the inverse of wet's strips. Flight skips it (zero Steps). */
  appliesOnEnter?: Applies
  /** Statuses APPLIED at the occupant's END OF ACTIVATION — ladder rung 2, the tile-effects rung Airwalk will gate. */
  appliesOnActivationEnd?: Applies }

/** GROUND-REQUIREMENTS.md §1.1. Change these only from that document. */
export const TRAIT: Readonly<Record<Trait, Mods>> = {
  rough:    { moveCost: 1, accuracy: -5, armor: 1, resist: 1 },  // rocky: 2, -5 Acc, +1 Armor, +1 Resist
  elevated: { moveCost: 1, accuracy: 10, reach: 2 },             // hills: 2, +10 Acc, +2 Reach
  wet:      { moveCost: 1, accuracy: -10,                        // water: 2, -10 Acc
    // GAME-DESIGN §4 (Water — the anti-status terrain): entry strips 1 Burn;
    // End of Activation strips 1 Burn and 1 Poison. RULED, Angela 2026-08-20:
    // "Regeneration is not stripped EOA by water" — the SETTLED prose that
    // implied it was the stale text and carries a CHANGED entry. Running through
    // water sheds 1 Burn; standing in it sheds 2 Burn and 1 Poison.
    stripsOnEnter: ['status.burn'],
    stripsOnActivationEnd: ['status.burn', 'status.poison'] },
  burning: { moveCost: 0,
    // PUBLISHED: 5-GROUND-SETTLED § terrain.* (2026-08-20). GAME-DESIGN §4:
    // water is "the exact inverse of fire, where running through costs 1 stack
    // and standing costs 2" — +1 Burn on entry, +1 at End of Activation; §6:
    // the status layer is "applied once on entry and again at the occupant's
    // end of turn". DECISIONS 2026-08-20 (Flight): "flying onto burning ground
    // burns you at end of activation" — flight skips only the entry beat.
    // The layer carries no move cost of its own — the base ground owns cost.
    appliesOnEnter: [['status.burn', 1]],
    appliesOnActivationEnd: [['status.burn', 1]] },
  poisoned: { moveCost: 0,
    // RULED 2026-09-03 (Angela, DECISIONS.md): "all of the statuses that are
    // on the ground are supposed to be the same: weak, burning, frost, and
    // poison. When you step on them, you gain one, and if you're there at
    // the end of activation, you gain one." ONE shape. This supersedes
    // 5-GROUND-SETTLED § terrain.poisoned (2026-08-20: 2 Poison + 1 Weak at
    // End of Activation, from Creeping Blight) — the content chat owes the
    // row a rewrite. Was that until 2026-09-03.
    appliesOnEnter: [['status.poison', 1]],
    appliesOnActivationEnd: [['status.poison', 1]] },
}

/** What each terrain is made of. */
export const TRAITS: Readonly<Record<number, ReadonlyArray<Trait>>> = {
  [TERRAIN.OPEN]: [],
  [TERRAIN.HILLS]: ['elevated'],
  [TERRAIN.FOREST]: [],                            // stated directly below — see EXTRA
  [TERRAIN.ROCKY]: ['rough'],
  [TERRAIN.ROCKY_HILLS]: ['rough', 'elevated'],    // composed, per §1.1
  [TERRAIN.WATER]: ['wet'],
  [TERRAIN.IMPASSABLE]: [],
  [TERRAIN.BURNING]: ['burning'],
  [TERRAIN.POISONED]: ['poisoned'],
  [TERRAIN.GRASS]: [], [TERRAIN.WHEAT]: [], [TERRAIN.BUSH]: [],   // stated directly below — see EXTRA
  [TERRAIN.WOODLAND]: [], [TERRAIN.LAVA]: [],
}

/**
 * Modifiers a terrain carries that its traits do not explain.
 * Forest is +10 Dodge, +1 Armor at cost 2 — a shape no other row shares, so it is
 * stated rather than given an invented 'wooded' trait nobody asked for.
 */
const EXTRA: Readonly<Record<number, Mods>> = {
  [TERRAIN.FOREST]: { moveCost: 1, dodge: 10, armor: 1 },
  // ── V2 ground (v2.ground-table) ─────────────────────────────────────────────
  // SOURCE OF TRUTH: COMBAT-V2-DESIGN-2026-09-07 §3.2, ruled 2026-09-07. Copied,
  // not chosen: "−10 ranged accuracy against you", "+1 (difficult)", woodland
  // "−15 ranged, −7 melee accuracy against you", lava "3 fire damage and 2 Burn on
  // entry, and again at end of activation". Independent of cover; they stack (§3.2).
  // Material tier 1 (grass, wheat, bush burn away) waits on the burning-props ruling.
  [TERRAIN.GRASS]:    { moveCost: 0, rangedAccuracyAgainst: -10 },
  [TERRAIN.WHEAT]:    { moveCost: 0, rangedAccuracyAgainst: -10 },
  [TERRAIN.BUSH]:     { moveCost: 1, rangedAccuracyAgainst: -10 },
  [TERRAIN.WOODLAND]: { moveCost: 1, rangedAccuracyAgainst: -15, meleeAccuracyAgainst: -7 },
  [TERRAIN.LAVA]:     { moveCost: 0, hazard: { damageType: 'fire', damage: 3, applies: [['status.burn', 2]] } },
}

type Stat = 'accuracy' | 'reach' | 'dodge' | 'armor' | 'resist'
const STATS: Stat[] = ['accuracy', 'reach', 'dodge', 'armor', 'resist']
const AGAINST = ['rangedAccuracyAgainst', 'meleeAccuracyAgainst'] as const

function composed(terrain: number): Mods {
  const out: Mods = { moveCost: 1 }
  const add = (d?: Mods) => {
    if (!d) return
    out.moveCost += d.moveCost
    for (const k of STATS) if (d[k]) out[k] = (out[k] ?? 0) + d[k]!
    for (const k of AGAINST) if (d[k]) out[k] = (out[k] ?? 0) + d[k]!
    if (d.hazard) {
      if (out.hazard) throw new Error('terrain: two hazards composed into one ground — not expressible')
      out.hazard = d.hazard
    }
    // strip lists compose by union — a composed wet terrain would strip too
    if (d.stripsOnEnter) out.stripsOnEnter = [...(out.stripsOnEnter ?? []), ...d.stripsOnEnter]
    if (d.stripsOnActivationEnd) out.stripsOnActivationEnd = [...(out.stripsOnActivationEnd ?? []), ...d.stripsOnActivationEnd]
    // applies lists compose the same way — the inverse funnel, one mechanism
    if (d.appliesOnEnter) out.appliesOnEnter = [...(out.appliesOnEnter ?? []), ...d.appliesOnEnter]
    if (d.appliesOnActivationEnd) out.appliesOnActivationEnd = [...(out.appliesOnActivationEnd ?? []), ...d.appliesOnActivationEnd]
  }
  for (const t of TRAITS[terrain] ?? []) add(TRAIT[t])
  add(EXTRA[terrain])
  return out
}

export function moveCostOf(terrain: number): number {
  if (terrain === TERRAIN.IMPASSABLE) return IMPASSABLE
  return composed(terrain).moveCost
}

const statOf = (terrain: number, stat: Stat): number =>
  terrain === TERRAIN.IMPASSABLE ? 0 : (composed(terrain)[stat] ?? 0)

/** Accuracy bonus for standing here. */
export function accuracyBonusOf(terrain: number): number { return statOf(terrain, 'accuracy') }
export function stripsOnEnterOf(terrain: number): readonly string[] { return composed(terrain).stripsOnEnter ?? [] }
export function stripsOnActivationEndOf(terrain: number): readonly string[] { return composed(terrain).stripsOnActivationEnd ?? [] }
// The applies getters carry the kill-switch seam directly: CF_DISABLE_IDS with a
// terrain id silences that terrain's applies, so the kill-switch check can prove
// the tests genuinely depend on the content. (Water's strips predate the seam
// and took exemptions; new mechanisms don't get to.)
export function appliesOnEnterOf(terrain: number): Applies {
  if (disabledIds().has(terrainIdOf(terrain))) return []
  return composed(terrain).appliesOnEnter ?? []
}
export function appliesOnActivationEndOf(terrain: number): Applies {
  if (disabledIds().has(terrainIdOf(terrain))) return []
  return composed(terrain).appliesOnActivationEnd ?? []
}

/**
 * V2 §3.2 concealment — what the ground an occupant stands in does to the accuracy
 * of an attack of this kind AGAINST it. Read at the accuracy ladder's TERRAIN rung
 * (400). The kill-switch seam silences it (CF_DISABLE_IDS=terrain.grass …).
 */
export function accuracyAgainstOf(terrain: number, kind: 'melee' | 'ranged'): number {
  if (terrain === TERRAIN.IMPASSABLE || disabledIds().has(terrainIdOf(terrain))) return 0
  const m = composed(terrain)
  return (kind === 'ranged' ? m.rangedAccuracyAgainst : m.meleeAccuracyAgainst) ?? 0
}
/** V2 §3.2 hazard — null when the ground carries none, or its id is disabled. */
export function hazardOf(terrain: number): Hazard | null {
  if (terrain === TERRAIN.IMPASSABLE || disabledIds().has(terrainIdOf(terrain))) return null
  return composed(terrain).hazard ?? null
}

/** Extra reach for ranged weapons fired from here. */
export function reachBonusOf(terrain: number): number { return statOf(terrain, 'reach') }

/** Harder to hit while standing here. */
export function dodgeBonusOf(terrain: number): number { return statOf(terrain, 'dodge') }

/** Flat physical mitigation while standing here. */
export function armorBonusOf(terrain: number): number { return statOf(terrain, 'armor') }

/** Flat magic mitigation while standing here. */
export function resistBonusOf(terrain: number): number { return statOf(terrain, 'resist') }

// ── GROUND LAYERS — capability.ground-layers (2026-09-03) ────────────────────
// rule.ground-layers: four layers painted onto arbitrary hexes at runtime —
// burning · frost · poisoned · darkness — a hex carries AT MOST ONE, applying a
// new one replaces it, except Burn and Frost which cancel one for one
// (rule.burn-frost-cancel). Persistent, no clock. 5-GROUND-SETTLED (2026-08-20):
// "the layer must feed the same composed() trait funnel" — so a painted
// burning hex sears exactly as authored burning terrain does. Frost paints
// what the row says of the status (Frost 1 at End of Activation — SWITCHES.md
// frostLayerStack); darkness is vision's (capability.vision) and applies nothing.
export const LAYER = { NONE: 0, BURNING: 1, FROST: 2, POISONED: 3, DARKNESS: 4, WEAK: 5 } as const   // weak: ruled 2026-09-03
export type LayerId = (typeof LAYER)[keyof typeof LAYER]
export const LAYER_IDS: Readonly<Record<number, string>> = {
  [LAYER.BURNING]: 'layer.burning', [LAYER.FROST]: 'layer.frost', [LAYER.POISONED]: 'layer.poisoned', [LAYER.DARKNESS]: 'layer.darkness',
  [LAYER.WEAK]: 'layer.weak',
}
export function layerIdOf(layer: number): string { return LAYER_IDS[layer] ?? 'layer.none' }
export function layerOfId(id: string): number {
  const k = Object.entries(LAYER_IDS).find(([, v]) => v === id)
  if (!k) throw new Error(`unknown ground layer '${id}' — the five are ${Object.values(LAYER_IDS).join(', ')}`)
  return +k[0]
}
const LAYER_TRAITS: Readonly<Record<number, Mods>> = {
  [LAYER.BURNING]: TRAIT['burning']!,
  [LAYER.POISONED]: TRAIT['poisoned']!,
  // RULED 2026-09-03: every ground status is the one shape — +1 on entry, +1 at End of Activation
  [LAYER.FROST]: { moveCost: 0, appliesOnEnter: [['status.frost', 1]], appliesOnActivationEnd: [['status.frost', 1]] },
  [LAYER.WEAK]: { moveCost: 0, appliesOnEnter: [['status.weak', 1]], appliesOnActivationEnd: [['status.weak', 1]] },
  [LAYER.DARKNESS]: { moveCost: 0 },
}
/** What a layer applies on entry / at End of Activation — the same shapes terrain has. */
export function layerAppliesOnEnter(layer: number): Applies {
  if (!layer || disabledIds().has(layerIdOf(layer))) return []
  return LAYER_TRAITS[layer]?.appliesOnEnter ?? []
}
export function layerAppliesOnActivationEnd(layer: number): Applies {
  if (!layer || disabledIds().has(layerIdOf(layer))) return []
  return LAYER_TRAITS[layer]?.appliesOnActivationEnd ?? []
}
