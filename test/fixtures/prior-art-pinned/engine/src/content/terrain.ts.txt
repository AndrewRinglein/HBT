// Pure terrain metadata and composition. Registry decoding lives in maps.ts.
// Moved without changing ruled tables or the disable seam; one implementation.
import { TERRAIN, type DamageType, type Side } from '../core/types.js'
import { disabledIds } from './disable.js'

/** The authored glyph for each terrain kind. MAP-01's legend is the source. */
export const GLYPH: Readonly<Record<string, number>> = {
  '.': TERRAIN.OPEN, 'h': TERRAIN.HILLS, 'f': TERRAIN.WOODLAND, 'r': TERRAIN.ROCKY,
  'R': TERRAIN.ROCKY_HILLS, 'w': TERRAIN.WATER, 'x': TERRAIN.IMPASSABLE,
  'b': TERRAIN.BURNING, 'p': TERRAIN.POISONED,
  // v2.ground-retable: no document assigns these glyphs — SWITCHES.md groundGlyphs.
  // 'f' (MAP-01's forest glyph) is woodland; 'o' is retired (v2.retire-forest-hills).
  'u': TERRAIN.UNDERGROWTH, 'l': TERRAIN.LAVA,
  'm': TERRAIN.MARSH, 'd': TERRAIN.DESERT, 'n': TERRAIN.RUINS,
  // v2.structures: no document assigns these glyphs either — SWITCHES.md structureGlyphs.
  'W': TERRAIN.WALL, 'T': TERRAIN.TOWER, 'H': TERRAIN.HOUSE,
}

/** The id a terrain kind answers to in a log line or a modifier source. */
const TERRAIN_ID: Readonly<Record<number, string>> = {
  [TERRAIN.OPEN]: 'terrain.open', [TERRAIN.HILLS]: 'terrain.hills',
  [TERRAIN.ROCKY]: 'terrain.rocky',
  [TERRAIN.ROCKY_HILLS]: 'terrain.rocky-hills', [TERRAIN.WATER]: 'terrain.water',
  [TERRAIN.IMPASSABLE]: 'terrain.impassable',
  [TERRAIN.BURNING]: 'terrain.burning', [TERRAIN.POISONED]: 'terrain.poisoned',
  [TERRAIN.UNDERGROWTH]: 'terrain.undergrowth', [TERRAIN.WOODLAND]: 'terrain.woodland', [TERRAIN.LAVA]: 'terrain.lava',
  [TERRAIN.MARSH]: 'terrain.marsh', [TERRAIN.DESERT]: 'terrain.desert', [TERRAIN.RUINS]: 'terrain.ruins',
  [TERRAIN.WALL]: 'terrain.wall', [TERRAIN.TOWER]: 'terrain.tower', [TERRAIN.HOUSE]: 'terrain.house',
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
  /** The OCCUPANT's own accuracy with RANGED attacks (hills, v2.retire-forest-hills). */
  rangedAccuracy?: number
  hazard?: Hazard
  /** v2.thin-obstruction: every hex of this ground is a THIN upright obstruction (THIN_OBSTRUCTION below). */
  thin?: true
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
  // hills: 2 move. RE-RULED 2026-09-24 (Andrew, DECISIONS.md): "Hills are going to have
  // +10 accuracy and +1 reach"; "Reach only applies to range attacks … It's only 10
  // ranged accuracy." Was +10 Accuracy (every attack) and +2 Reach (§1.1, v1).
  elevated: { moveCost: 1, rangedAccuracy: 10, reach: 1 },
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
  [TERRAIN.ROCKY]: ['rough'],
  [TERRAIN.ROCKY_HILLS]: ['rough', 'elevated'],    // composed, per §1.1
  [TERRAIN.WATER]: ['wet'],
  [TERRAIN.IMPASSABLE]: [],
  [TERRAIN.BURNING]: ['burning'],
  [TERRAIN.POISONED]: ['poisoned'],
  [TERRAIN.UNDERGROWTH]: [], [TERRAIN.WOODLAND]: [], [TERRAIN.LAVA]: [],   // stated directly below — see EXTRA
  [TERRAIN.MARSH]: [], [TERRAIN.DESERT]: [],
  // Andrew, 2026-09-24: "Ruins behave like rocky ground" — and "Climber badge will
  // help on ruins the way it does in rocky ground": the same trait, so one reader.
  [TERRAIN.RUINS]: ['rough'],
  [TERRAIN.WALL]: [], [TERRAIN.TOWER]: [], [TERRAIN.HOUSE]: [],   // v2.structures — EXTRA and STRUCTURE below
}

/**
 * Modifiers a terrain carries that its traits do not explain — stated per row rather
 * than given invented traits nobody asked for. (v1 forest, +10 Dodge +1 Armor, is gone:
 * Andrew 2026-09-24, "There's no more forest".)
 */
const EXTRA: Readonly<Record<number, Mods>> = {
  // ── V2 ground (v2.ground-table, re-ruled v2.ground-retable) ────────────────
  // SOURCE OF TRUTH: engine/DECISIONS.md "2026-09-24 — the ground table, re-ruled"
  // (Andrew, verbatim there). It SUPERSEDES COMBAT-V2-DESIGN-2026-09-07 §3.2's rows.
  // Copied, not chosen:
  //   undergrowth — "tall grass, wheat … bush … It's one move, -10 ranged against you"
  //                 ("wheat, grass, reeds … all just different aesthetics for the same thing")
  //   woodland    — "Woodland costs 2 to move into"; "Standing in woodland gives others
  //                 who are targeting you a -15/-7" (its thin-obstruction −5 is v2.thin-obstruction)
  //   lava        — "Stepping into lava should inflict one burn. Cost 2 movement points.
  //                 And inflict 3 fire damage. Being in lava at the end of your activation
  //                 should inflict 1 burn and inflict 3 fire damage."
  //   marsh       — "Cost 2 to move in. Removes one fire at the end of activation. Gives
  //                 -5 accuracy and -10 dodge to whoever is in it."
  //   desert      — "Gives -5 dodge."
  [TERRAIN.UNDERGROWTH]: { moveCost: 0, rangedAccuracyAgainst: -10 },
  //   woodland is also thin — "Every tile of woodland is a high thin obstruction" (v2.thin-obstruction)
  [TERRAIN.WOODLAND]:    { moveCost: 1, rangedAccuracyAgainst: -15, meleeAccuracyAgainst: -7, thin: true },
  [TERRAIN.LAVA]:        { moveCost: 1, hazard: { damageType: 'fire', damage: 3, applies: [['status.burn', 1]] } },
  [TERRAIN.MARSH]:       { moveCost: 1, accuracy: -5, dodge: -10, stripsOnActivationEnd: ['status.burn'] },
  [TERRAIN.DESERT]:      { moveCost: 0, dodge: -5 },
  // ── V2 structures (v2.structures) — the occupant's own numbers, all attacks ──────
  // SOURCE OF TRUTH: engine/DECISIONS.md 2026-09-24 (Andrew, verbatim there): "Being on a
  // wall gives you +1 reach and +5 accuracy." · "Being in a tower also gives you +2 reach
  // and +10 accuracy." · "Wall and tower do not apply to range attacks only." · "let's have
  // the tower cost 2 extra moves … a total of 3 moves". The reach is STRUCTURE's (every
  // attack, where the stat's Reach is ranged-only); what each does against an enemy is too.
  [TERRAIN.WALL]:  { moveCost: 0, accuracy: 5 },
  [TERRAIN.TOWER]: { moveCost: 2, accuracy: 10 },
  [TERRAIN.HOUSE]: { moveCost: 0 },
}

type Stat = 'accuracy' | 'reach' | 'dodge' | 'armor' | 'resist'
const STATS: Stat[] = ['accuracy', 'reach', 'dodge', 'armor', 'resist']
const AGAINST = ['rangedAccuracyAgainst', 'meleeAccuracyAgainst', 'rangedAccuracy'] as const

function composed(terrain: number): Mods {
  const out: Mods = { moveCost: 1 }
  const add = (d?: Mods) => {
    if (!d) return
    out.moveCost += d.moveCost
    for (const k of STATS) if (d[k]) out[k] = (out[k] ?? 0) + d[k]!
    for (const k of AGAINST) if (d[k]) out[k] = (out[k] ?? 0) + d[k]!
    if (d.thin) out.thin = true
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

// v2.ground-retable: the kill-switch seam reaches the occupant's stat mods and the strips
// too, so marsh, desert and ruins can be proved like every other V2 ground.
const off = (terrain: number): boolean => disabledIds().has(terrainIdOf(terrain))
const statOf = (terrain: number, stat: Stat): number =>
  terrain === TERRAIN.IMPASSABLE || off(terrain) ? 0 : (composed(terrain)[stat] ?? 0)

/** Accuracy bonus for standing here. */
export function accuracyBonusOf(terrain: number): number { return statOf(terrain, 'accuracy') }
export function stripsOnEnterOf(terrain: number): readonly string[] { return off(terrain) ? [] : composed(terrain).stripsOnEnter ?? [] }
export function stripsOnActivationEndOf(terrain: number): readonly string[] { return off(terrain) ? [] : composed(terrain).stripsOnActivationEnd ?? [] }
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
 * (400). The kill-switch seam silences it (CF_DISABLE_IDS=terrain.undergrowth …).
 */
export function accuracyAgainstOf(terrain: number, kind: 'melee' | 'ranged'): number {
  if (terrain === TERRAIN.IMPASSABLE || disabledIds().has(terrainIdOf(terrain))) return 0
  const m = composed(terrain)
  return (kind === 'ranged' ? m.rangedAccuracyAgainst : m.meleeAccuracyAgainst) ?? 0
}
/** The occupant's own ranged-accuracy bonus from its ground (hills: +10). Ranged attacks only. */
export function rangedAccuracyOf(terrain: number): number {
  if (terrain === TERRAIN.IMPASSABLE || off(terrain)) return 0
  return composed(terrain).rangedAccuracy ?? 0
}
/**
 * v2.thin-obstruction — what ONE thin upright obstruction does. Copied, not chosen:
 * engine/DECISIONS.md "2026-09-24 — the ground table, re-ruled" (Andrew, verbatim there):
 *   "If you shoot through a tile that is woodland, you get -5 range." · "Actually, they're
 *   also going to reduce vision by one." · "A thin obstruction in your own hex does not count
 *   against your own shot, only against those who are shooting you or people who are
 *   shooting through the hex." · "[thin] obstruction is free to move on to".
 * Undergrowth is NOT thin ("High bush and all the other types of bushes and tall wheat and
 * grass … do not do that tall thinning destruction of -5").
 */
export const THIN_OBSTRUCTION = { rangedAccuracy: -5, vision: -1 } as const
/** Is every hex of this ground a thin obstruction? The kill-switch seam silences it. */
export function isThinGround(terrain: number): boolean {
  return THIN_GROUND.has(terrain) && !off(terrain)
}
/** Read once from the static table (content, not state) — no per-call composition. */
const THIN_GROUND: ReadonlySet<number> = new Set(Object.keys(EXTRA).map(Number).filter((t) => EXTRA[t]!.thin === true))
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

// ── STRUCTURES — v2.structures (Andrew, 2026-09-24) ────────────────────────────
// SOURCE OF TRUTH: engine/DECISIONS.md "2026-09-24 — the ground table, re-ruled", the three
// answers on walls, towers and houses (verbatim there; they supersede DESIGN-DUMP-CLEANED §5).
// Every number below is copied, not chosen:
//   wall  — "a wall is a full obstruction … something you can stand on … when you stand on it
//           and you have an enemy who's not in a wall or a tower they have -20 accuracy, and you
//           get 10 block" · "The wall adds to both" (Block and Ranged Block) · "getting up on a
//           wall requires moving upstairs" · "There is one facing on the wall tile, one facing
//           that has stairs or a ladder. If you move into the wall from that direction, it costs
//           one extra" · "Enemies can stand on walls."
//   tower — "If you are in a tower and you have an enemy who is not also in a tower they get
//           -25% accuracy. You get 15 blocks and 1 armor." · "It's a flat number." · "Towers are
//           for heroes only." · "The tower is just an obstruction for shooting past it"
//   house — "Being in a house if your enemy is not also in a house they get -10 accuracy, and
//           you get 5 dodge." · "into a house through a door" · "when you are in a house, you
//           can be shot from outside the house."
// What the ruling left open is SWITCHES.md "Structures", each marked there.
export type StructureGuard = {
  /** Added to the enemy attacker's accuracy (ACC.STRUCTURE, 425). */
  readonly accuracyAgainst: number
  /** Added to the occupant's Block and Ranged Block against that attack. */
  readonly block: number; readonly rangedBlock: number
  /** Added to the occupant's Dodge (TARGET_DODGE, 600) and Armor (MITIGATION, 600) against it. */
  readonly dodge: number; readonly armor: number
}
export type Structure = {
  readonly id: string
  /** How a unit comes in from outside: across ANY side, or only across its authored entry side. */
  readonly enter: 'any' | 'entry'
  /** Extra move to come in across the entry side, on top of the ground's own cost. */
  readonly entryCost: number
  /** How a unit steps out to a hex that is not the structure: across any side, or only back through its entry. */
  readonly leave: 'any' | 'entry'
  /** Only a unit following this side's rules may stand here. */
  readonly onlySide?: Side
  /** Up on it: a move between two raised structures (a wall top, a tower) is along the top, with no entry side.
   *  It gives NO line over anything — Andrew 2026-09-25: "Walls and towers cannot shoot past other obstructions." */
  readonly elevated: boolean
  /**
   * The rest of the SAME connected run of this structure does not block a line with an end on it —
   * Andrew 2026-09-25: "You should be able to shoot on the same wall." Every other structure still does.
   */
  readonly clearAlongOwnRun: boolean
  /** Reach for EVERY attack made from here — melee included ("do not apply to range attacks only"). */
  readonly reach: number
  /** What it gives its occupant against an ENEMY attacker who is not standing in one of `sharedWith`. */
  readonly guard: StructureGuard
  /** The structures whose occupants the guard does not apply against — its own always among them. */
  readonly sharedWith: readonly string[]
}
const STRUCTURE: Readonly<Record<number, Structure>> = {
  [TERRAIN.WALL]: {
    id: 'terrain.wall', enter: 'entry', entryCost: 1,
    // RULED 2026-09-25 (Andrew, DECISIONS.md): "You must leave the walls the same way you came up."
    leave: 'entry',
    elevated: true, reach: 1, clearAlongOwnRun: true,
    guard: { accuracyAgainst: -20, block: 10, rangedBlock: 10, dodge: 0, armor: 0 },
    sharedWith: ['terrain.wall', 'terrain.tower'],   // "an enemy who's not in a wall or a tower"
  },
  [TERRAIN.TOWER]: {
    id: 'terrain.tower', enter: 'any', entryCost: 0, // the +2 is the ground's own cost (EXTRA): 3 in all, from any side
    leave: 'any', onlySide: 'hero',
    elevated: true, reach: 2, clearAlongOwnRun: false,
    guard: { accuracyAgainst: -25, block: 15, rangedBlock: 15, dodge: 0, armor: 1 },   // rangedBlock: SWITCHES.md towerRangedBlock
    sharedWith: ['terrain.tower'],
  },
  [TERRAIN.HOUSE]: {
    id: 'terrain.house', enter: 'entry', entryCost: 0,   // SWITCHES.md doorFacing
    leave: 'entry',                                      // SWITCHES.md houseExit
    elevated: false, reach: 0, clearAlongOwnRun: false,   // SWITCHES.md sameWallOnly
    guard: { accuracyAgainst: -10, block: 0, rangedBlock: 0, dodge: 5, armor: 0 },
    sharedWith: ['terrain.house'],
  },
}
/**
 * 1 where a ground number is a live structure, else 0 — built once at load from the static
 * table and the kill-switch seam (both fixed for the process), so the hot readers (the attack
 * line, the AI's movement) test a hex with one array read. Content, not state; nothing to invalidate.
 */
export const STRUCTURE_GROUND: Readonly<Uint8Array> = (() => {
  const keys = Object.keys(STRUCTURE).map(Number), out = new Uint8Array(Math.max(0, ...keys) + 1)
  for (const t of keys) if (!off(t)) out[t] = 1
  return out
})()
/** The structure this ground is, or null — open ground, or its id disabled (the kill-switch seam). */
export function structureOf(terrain: number): Structure | null {
  const s = STRUCTURE[terrain]
  return s && !off(terrain) ? s : null
}
/** May this ground carry an authored entry side (stairs, a door)? Read off the table itself — decode ignores the kill switch. */
export function takesEntry(terrain: number): boolean {
  return STRUCTURE[terrain]?.enter === 'entry'
}
