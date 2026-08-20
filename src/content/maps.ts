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
import { WIDTH, HEIGHT } from '../core/hex.js'
import { disabledIds } from './disable.js'

export type MapDef = { id: string; name: string; note: string; rows: readonly string[] }

const RAW_MAPS: readonly MapDef[] = [
  {
    id: 'map.open',
    name: 'Open Field',
    note: 'No terrain at all. The control map — keeps every earlier result comparable.',
    rows: [
      '............', '............', '............', '............',
      '............', '............', '............', '............',
      '............', '............', '............', '............',
    ],
  },
  {
    id: 'map.ridge',
    name: 'The Ridge',
    note: 'A band across the middle. Both sides must cross it; whoever holds it shoots from height.',
    rows: [
      '............', '............', '............', '............',
      '...hhhhhh...', '..hhhhhhhh..', '............', '............',
      '............', '............', '............', '............',
    ],
  },
  {
    id: 'map.flanks',
    name: 'Two Knolls',
    note: 'High ground on both wings, open in the centre. Rewards splitting, punishes the walk out.',
    rows: [
      '............', '............', '.hh......hh.', 'hhh......hhh',
      '.hh......hh.', '............', '............', '.hh......hh.',
      'hhh......hhh', '.hh......hh.', '............', '............',
    ],
  },
  {
    id: 'map.highlands',
    name: 'Highlands',
    note: 'Broken ground everywhere. Movement is expensive and nearly every hex is a firing position.',
    rows: [
      '..h..hh..h..', '.hh...h..hh.', 'h..hh...h..h', '..h..hhh..h.',
      '.hh..h..hh..', 'h..hh..h..hh', '..h..hh..h..', '.hh..h..hh..',
      'h..h..hh..h.', '..hh..h..hh.', '.h..hh..h..h', '..h..h..hh..',
    ],
  },
  {
    id: 'map.field',
    name: 'The Field',
    note: 'A 12x12 crop of MAP-01 (rows 4-15, cols 10-21), for the replay viewer. The real MAP-01 terrain. Forest, rocky, rocky-hills, water and obstacles are RECOGNISED but carry no rules yet — they behave as open ground until terrain.movecost / terrain.passable / terrain.modifiers land.',
    rows: [
      '..hhhhhfffh.',
      'whhhffffrfR.',
      'wwhhhfffrrrr',
      'w..fffffrrrr',
      'www..fffrrrr',
      'ww....frrrr.',
      'www.....rrrr',
      'wwrrr...rr..',
      'wwrrr...rrrr',
      'wrrrr..RRRRr',
      'wrrrr...hhhR',
      'w.rrRh.hhhhh',
    ],
  },
  {
    id: 'map.thicket',
    name: 'The Thicket',
    note: 'A 12x12 crop of MAP-01 (rows 10-21, cols 0-11). Carries the only obstacles on the panel and a wide water channel — the map that makes terrain.passable testable at all.',
    rows: [
      'hhhhhhhhhwww',
      '.hhhhwwwwwww',
      '...hhh..wwww',
      '...xh....wwr',
      '...h....wwwr',
      '...h....www.',
      '......x..ww.',
      '.........ww.',
      '..x......www',
      '...f.....www',
      '.fff......ww',
      '.ff.......ww',
    ],
  },
  {
    id: 'test.map.embers',
    name: 'The Ember Field (TESTING)',
    note: 'TESTING LANE — never ships. A full-width burning band and a poisoned belt both sides must cross, so the terrain-applies mechanism can be probed live. Mirrors map.ridge. Joining MAPS puts it on MAP_PANEL, which is what makes probing possible — the same reason map.field and map.thicket were added.',
    rows: [
      '............', '............', '............', '............',
      'bbbbbbbbbbbb', 'bbbbbbbbbbbb', '............', 'pppppppppppp',
      'pppppppppppp', '............', '............', '............',
    ],
  },
  {
    id: 'test.map.showcase',
    name: 'The Proving Ground (TESTING)',
    note: 'TESTING LANE — never ships. One board that exercises every ground mechanic at once: a western river (washes), an ember band and a blight belt both sides must cross, and hills. Built 2026-08-20 so a single replay can SHOW every landed mechanic (Angela: "a replay that shows off all the various new things").',
    rows: [
      '............',
      'ww...hh.....',
      'ww..........',
      'ww..bbbb....',
      'www.bbbb....',
      'ww..........',
      'ww...pppp...',
      'www..pppp...',
      'ww..........',
      'ww.....hh...',
      'ww..........',
      '............',
    ],
  },
] as const

// Kill-switch seam (2026-08-20, found landing map.showcase): a disabled map id
// leaves the roster entirely, so its tests genuinely fail without it —
// identical array when CF_DISABLE_IDS is unset.
export const MAPS: readonly MapDef[] = RAW_MAPS.filter((m) => !disabledIds().has(m.id))

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

export function terrainOf(mapId: string): number[] {
  const m = MAPS.find((x) => x.id === mapId)
  if (!m) throw new Error(`unknown map '${mapId}' — maps are authored, check content/maps.ts`)
  if (m.rows.length !== HEIGHT) throw new Error(`map '${mapId}' has ${m.rows.length} rows, expected ${HEIGHT}`)
  const out: number[] = []
  for (const row of m.rows) {
    if (row.length !== WIDTH) throw new Error(`map '${mapId}' has a row of ${row.length}, expected ${WIDTH}`)
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
    // PUBLISHED: 5-GROUND-SETTLED § terrain.* (2026-08-20); Codex, Creeping
    // Blight: "Any unit that begins its Turn on poisoned ground gains 2 Poison
    // and 1 Weak — allies included. No roll, no crit." No entry clause is
    // published, so there is none (unlike burning). Timing is SWITCHES.md
    // poisonedGroundTiming, default End of Activation — the one tile-effects
    // rung Airwalk will gate.
    appliesOnActivationEnd: [['status.poison', 2], ['status.weak', 1]] },
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
