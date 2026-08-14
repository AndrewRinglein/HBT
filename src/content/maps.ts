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

export type MapDef = { id: string; name: string; note: string; rows: readonly string[] }

export const MAPS: readonly MapDef[] = [
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
] as const

export const MAP_PANEL = MAPS.map((m) => m.id)

/** The authored glyph for each terrain kind. MAP-01's legend is the source. */
export const GLYPH: Readonly<Record<string, number>> = {
  '.': TERRAIN.OPEN, 'h': TERRAIN.HILLS, 'f': TERRAIN.FOREST, 'r': TERRAIN.ROCKY,
  'R': TERRAIN.ROCKY_HILLS, 'w': TERRAIN.WATER, 'x': TERRAIN.OBSTACLE,
}

/** The id a terrain kind answers to in a log line or a modifier source. */
const TERRAIN_ID: Readonly<Record<number, string>> = {
  [TERRAIN.OPEN]: 'terrain.open', [TERRAIN.HILLS]: 'terrain.hills',
  [TERRAIN.FOREST]: 'terrain.forest', [TERRAIN.ROCKY]: 'terrain.rocky',
  [TERRAIN.ROCKY_HILLS]: 'terrain.rocky-hills', [TERRAIN.WATER]: 'terrain.water',
  [TERRAIN.OBSTACLE]: 'terrain.obstacle',
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

/** IMPASSABLE — a cost no budget can pay. Not Infinity: Law 7, integers only. */
export const IMPASSABLE = 999

/**
 * Movement points to enter a hex.
 *
 * These are SWITCHES, not decisions. MAP-01 leaves `moveCost` null on purpose —
 * its own note says these are design questions, not generated data. Each default
 * below is what runs today; `SWITCHES.md` carries the question, and a sweep
 * answers it. Changing a number here is changing a switch, not fixing a bug.
 */
export const MOVE_COST: Readonly<Record<number, number>> = {
  [TERRAIN.OPEN]: 1,
  [TERRAIN.HILLS]: 2,
  [TERRAIN.FOREST]: 2,        // switch terrain.forest.moveCost
  [TERRAIN.ROCKY]: 2,         // switch terrain.rocky.moveCost
  [TERRAIN.ROCKY_HILLS]: 2,   // switch terrain.rocky-hills.moveCost
  [TERRAIN.WATER]: 3,         // switch terrain.water.passable — 3 = a tax, IMPASSABLE = a wall
  [TERRAIN.OBSTACLE]: 1,      // stays cheap until terrain.passable lands; nothing blocks yet
}

export function moveCostOf(terrain: number): number {
  return MOVE_COST[terrain] ?? 1
}

/** Accuracy bonus for standing here. */
export function accuracyBonusOf(terrain: number): number {
  return terrain === TERRAIN.HILLS ? 10 : 0
}

/** Extra reach for ranged weapons fired from here. */
export function reachBonusOf(terrain: number): number {
  return terrain === TERRAIN.HILLS ? 2 : 0
}

/** Harder to hit while standing here. */
export function dodgeBonusOf(_terrain: number): number {
  return 0   // forest will be +10
}

/** Flat physical mitigation while standing here. */
export function armorBonusOf(_terrain: number): number {
  return 0   // forest will be +1
}
