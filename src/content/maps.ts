// Maps are AUTHORED, vetted, and identified — never generated at runtime.
// Written as ASCII so they can be read and redrawn by hand.
//
// Glyphs are MAP-01's legend — one glyph per terrain, no synonyms. The four
// original maps used '^' for hills and were converted to 'h' when the rest of the
// legend arrived; two glyphs meaning the same thing is how a format quietly forks.
//
//   .  open ground
//   h  hills — costs 2 movement, +10 Accuracy and +2 ranged Reach while occupied
//   f  forest      \
//   r  rocky        |  recognised, and behaving exactly like open ground for now.
//   R  rocky hills  |  Rules land as their own backlog items (terrain.movecost,
//   w  water        |  terrain.passable, terrain.modifiers) so that this file's
//   x  obstacle    /   arrival can be proven to change nothing.
//
// Rows run top (row 0, enemy deployment) to bottom (row 11, hero deployment).

import { TERRAIN } from '../core/types.js'
import { formatOf, type Board, type Edge } from '../core/hex.js'
import { disabledIds } from './disable.js'
import { packMaps } from './pack.js'

/**
 * `deploy` — which edge each side deploys on (board.deploy-edges, 2026-09-04).
 * Absent = the ruled default, heroes WEST and enemies EAST (2026-09-03:
 * "Heroes start on the left, and enemies start on the right. That is the
 * default configuration"). The maps authored before the ruling say
 * south/north explicitly, so every control battle is what it was.
 */
export type Deploy = { readonly hero: Edge; readonly enemy: Edge }
export const DEFAULT_DEPLOY: Deploy = { hero: 'west', enemy: 'east' }
export type MapDef = { id: string; name: string; note?: string; rows: readonly string[]; deploy?: Deploy }

// content.pack-maps (2026-09-04, session 9's E1): the SHIPPING maps are content
// rows now — `content/gen/maps.json`, through the pack (`packMaps()`). The six
// that were hand-typed here (open, ridge, flanks, highlands, field, thicket)
// moved there row for row, so every control hash held. What stays here is the
// TESTING lane — never ships — one map per probe need and one per format.
const RAW_MAPS: readonly MapDef[] = [
  // ── the six shipping standards used to be here; see content/gen/maps.json ──
  {
    id: 'test.map.embers',
    name: 'The Ember Field (TESTING)',
    note: 'TESTING LANE — never ships. A full-width burning band and a poisoned belt both sides must cross, so the terrain-applies mechanism can be probed live. Mirrors map.ridge. Joining MAPS puts it on MAP_PANEL, which is what makes probing possible — the same reason map.field and map.thicket were added.',
    rows: [
      '................', '................', '................', '................',
      'bbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbb', '................', 'pppppppppppppppp',
      'pppppppppppppppp', '................', '................', '................',
      '................', '................', '................', '................',
    ],
  },
  {
    id: 'test.map.showcase',
    name: 'The Proving Ground (TESTING)',
    note: 'TESTING LANE — never ships. One board that exercises every ground mechanic at once: a western river (washes), an ember band and a blight belt both sides must cross, and hills. Built 2026-08-20 so a single replay can SHOW every landed mechanic (Angela: "a replay that shows off all the various new things").',
    rows: [
      '................', 'www..hh.........', 'www.............', 'ww..bbbb........',
      'www.bbbb........', 'www.............', 'ww...pppp.......', 'www..pppp.......',
      'www.............', 'ww.....hh.......', 'www.............', 'www.............',
      'ww..............', 'www.............', 'www.............', '................',
    ],
  },
  // board.variable-size (2026-09-04) — one TESTING map per non-standard
  // format, so every ruled board size is on MAP_PANEL and probed, hashed and
  // effect-measured with the rest. Never ship; content authors the real ones
  // (content.maps-as-rows). Heroes west, enemies east — the default.
  {
    id: 'test.map.duel-8',
    name: 'The Yard (TESTING, 8×8 duel)',
    note: 'TESTING LANE — never ships. The duel format: eight by eight, a hill in the middle, nowhere to hide. Six heroes fit on the last row exactly when it is open; a control battle spills its eight enemies onto a second row.',
    rows: [
      '........', '........', '...h....', '..hhh...',
      '...hh...', '....h...', '........', '........',
    ],
  },
  {
    id: 'test.map.dungeon-16x8',
    deploy: { hero: 'west', enemy: 'east' },   // said outright — a corridor is entered from its west end
    name: 'The Gallery (TESTING, 16×8 dungeon segment)',
    note: 'TESTING LANE — never ships. The dungeon-segment format: sixteen wide, eight deep, walls (obstacles) narrowing the middle to a throat four hexes wide. The first non-square board the engine ever ran.',
    rows: [
      '................', '.....xx....xx...', '.....x......x...', '.....x......x...',
      '.....x......x...', '.....x......x...', '.....xx....xx...', '................',
    ],
  },
  {
    id: 'test.map.horde-24',
    name: 'The Plain (TESTING, 24×24 horde)',
    note: 'TESTING LANE — never ships. The horde format: twenty-four square, open, a river down the middle with two fords — the tide comes from the east and must cross it. Room for the forty-body tide BASE-MAP-SPEC asks for.',
    rows: [
      '...........ww...........', '...........ww...........', '...........ww...........', '...........ww...........',
      '...........ww...........', '...........ww...........', '........................', '........................',
      '...........ww...........', '...........ww...........', '...........ww...........', '...........ww...........',
      '...........ww...........', '...........ww...........', '...........ww...........', '...........ww...........',
      '........................', '........................', '...........ww...........', '...........ww...........',
      '...........ww...........', '...........ww...........', '...........ww...........', '...........ww...........',
    ],
  },
] as const

// Kill-switch seam (2026-08-20, found landing map.showcase): a disabled map id
// leaves the roster entirely, so its tests genuinely fail without it —
// identical array when CF_DISABLE_IDS is unset.
// One owner per id, loudly: a map in the pack AND here is a fork.
for (const m of packMaps()) if (RAW_MAPS.some((r) => r.id === m.id)) throw new Error(`map '${m.id}' exists in BOTH content/maps.ts and the generated pack — one owner only`)
export const MAPS: readonly MapDef[] = [...packMaps(), ...RAW_MAPS].filter((m) => !disabledIds().has(m.id))

export const MAP_PANEL = MAPS.map((m) => m.id)

/** The authored glyph for each terrain kind. MAP-01's legend is the source. */
export const GLYPH: Readonly<Record<string, number>> = {
  '.': TERRAIN.OPEN, 'h': TERRAIN.HILLS, 'f': TERRAIN.FOREST, 'r': TERRAIN.ROCKY,
  'R': TERRAIN.ROCKY_HILLS, 'w': TERRAIN.WATER, 'x': TERRAIN.OBSTACLE,
  'b': TERRAIN.BURNING, 'p': TERRAIN.POISONED,
}

/** The id a terrain kind answers to in a log line or a modifier source. */
const TERRAIN_ID: Readonly<Record<number, string>> = {
  [TERRAIN.OPEN]: 'terrain.open', [TERRAIN.HILLS]: 'terrain.hills',
  [TERRAIN.FOREST]: 'terrain.forest', [TERRAIN.ROCKY]: 'terrain.rocky',
  [TERRAIN.ROCKY_HILLS]: 'terrain.rocky-hills', [TERRAIN.WATER]: 'terrain.water',
  [TERRAIN.OBSTACLE]: 'terrain.obstacle',
  [TERRAIN.BURNING]: 'terrain.burning', [TERRAIN.POISONED]: 'terrain.poisoned',
}

function mapDef(mapId: string): MapDef {
  const m = MAPS.find((x) => x.id === mapId)
  if (!m) throw new Error(`unknown map '${mapId}' — maps are authored: content/gen/maps.json (shipping) or content/maps.ts (testing lane)`)
  return m
}

/**
 * The board a map is drawn on — board.variable-size (2026-09-04). Read off the
 * rows: height is the row count, width the row length, and the pair must be
 * one of the four ruled formats (hex.ts FORMATS) so no fifth size appears by
 * accident. Rectangular, or it is not a map.
 */
export function boardOf(mapId: string): Board {
  const m = mapDef(mapId)
  const height = m.rows.length
  const width = m.rows[0]?.length ?? 0
  for (const row of m.rows) if (row.length !== width) throw new Error(`map '${mapId}' has a row of ${row.length} in a board ${width} wide — not rectangular`)
  const board = { width, height }
  if (!formatOf(board)) throw new Error(`map '${mapId}' is ${width}×${height}, which is none of the four formats (8×8, 16×8, 16×16, 24×24 — ruled 2026-09-03)`)
  return board
}

/** The deployment edges of a map — its own, else the ruled default. The two edges must differ. */
export function deployOf(mapId: string): Deploy {
  const d = mapDef(mapId).deploy ?? DEFAULT_DEPLOY
  if (d.hero === d.enemy) throw new Error(`map '${mapId}' deploys both sides on its ${d.hero} edge`)
  return d
}

export function terrainOf(mapId: string): number[] {
  const m = mapDef(mapId)
  const { width } = boardOf(mapId)
  const out: number[] = []
  for (const row of m.rows) {
    if (row.length !== width) throw new Error(`map '${mapId}' has a row of ${row.length}, expected ${width}`)
    for (const ch of row) {
      const t = GLYPH[ch]
      if (t === undefined) throw new Error(`map '${mapId}' has an unknown glyph '${ch}'`)
      out.push(t)
    }
  }
  return out
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
type Mods = { moveCost: number
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
  [TERRAIN.OBSTACLE]: [],
  [TERRAIN.BURNING]: ['burning'],
  [TERRAIN.POISONED]: ['poisoned'],
}

/**
 * Modifiers a terrain carries that its traits do not explain.
 * Forest is +10 Dodge, +1 Armor at cost 2 — a shape no other row shares, so it is
 * stated rather than given an invented 'wooded' trait nobody asked for.
 */
const EXTRA: Readonly<Record<number, Mods>> = {
  [TERRAIN.FOREST]: { moveCost: 1, dodge: 10, armor: 1 },
}

type Stat = 'accuracy' | 'reach' | 'dodge' | 'armor' | 'resist'
const STATS: Stat[] = ['accuracy', 'reach', 'dodge', 'armor', 'resist']

function composed(terrain: number): Mods {
  const out: Mods = { moveCost: 1 }
  const add = (d?: Mods) => {
    if (!d) return
    out.moveCost += d.moveCost
    for (const k of STATS) if (d[k]) out[k] = (out[k] ?? 0) + d[k]!
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
  if (terrain === TERRAIN.OBSTACLE) return IMPASSABLE
  return composed(terrain).moveCost
}

const statOf = (terrain: number, stat: Stat): number =>
  terrain === TERRAIN.OBSTACLE ? 0 : (composed(terrain)[stat] ?? 0)

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
