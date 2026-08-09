// Maps are AUTHORED, vetted, and identified — never generated at runtime.
// Written as ASCII so they can be read and redrawn by hand.
//
//   .  open ground
//   ^  hills — costs 2 movement, +10 Accuracy and +2 ranged Reach while occupied
//
// Rows run top (row 0, enemy deployment) to bottom (row 11, hero deployment).

import { TERRAIN } from '../core/types.js'
import { WIDTH, HEIGHT } from '../core/hex.js'

export type MapDef = { id: string; name: string; note: string; rows: readonly string[] }

export const MAPS: readonly MapDef[] = [
  {
    id: 'open',
    name: 'Open Field',
    note: 'No terrain at all. The control map — keeps every earlier result comparable.',
    rows: [
      '............', '............', '............', '............',
      '............', '............', '............', '............',
      '............', '............', '............', '............',
    ],
  },
  {
    id: 'ridge',
    name: 'The Ridge',
    note: 'A band across the middle. Both sides must cross it; whoever holds it shoots from height.',
    rows: [
      '............', '............', '............', '............',
      '...^^^^^^...', '..^^^^^^^^..', '............', '............',
      '............', '............', '............', '............',
    ],
  },
  {
    id: 'flanks',
    name: 'Two Knolls',
    note: 'High ground on both wings, open in the centre. Rewards splitting, punishes the walk out.',
    rows: [
      '............', '............', '.^^......^^.', '^^^......^^^',
      '.^^......^^.', '............', '............', '.^^......^^.',
      '^^^......^^^', '.^^......^^.', '............', '............',
    ],
  },
  {
    id: 'highlands',
    name: 'Highlands',
    note: 'Broken ground everywhere. Movement is expensive and nearly every hex is a firing position.',
    rows: [
      '..^..^^..^..', '.^^...^..^^.', '^..^^...^..^', '..^..^^^..^.',
      '.^^..^..^^..', '^..^^..^..^^', '..^..^^..^..', '.^^..^..^^..',
      '^..^..^^..^.', '..^^..^..^^.', '.^..^^..^..^', '..^..^..^^..',
    ],
  },
] as const

export const MAP_PANEL = MAPS.map((m) => m.id)

export function terrainOf(mapId: string): number[] {
  const m = MAPS.find((x) => x.id === mapId)
  if (!m) throw new Error(`unknown map '${mapId}' — maps are authored, check content/maps.ts`)
  if (m.rows.length !== HEIGHT) throw new Error(`map '${mapId}' has ${m.rows.length} rows, expected ${HEIGHT}`)
  const out: number[] = []
  for (const row of m.rows) {
    if (row.length !== WIDTH) throw new Error(`map '${mapId}' has a row of ${row.length}, expected ${WIDTH}`)
    for (const ch of row) {
      if (ch === '^') out.push(TERRAIN.HILLS)
      else if (ch === '.') out.push(TERRAIN.OPEN)
      else throw new Error(`map '${mapId}' has an unknown glyph '${ch}'`)
    }
  }
  return out
}

/** Movement points to enter a hex. Open 1, hills 2. */
export function moveCostOf(terrain: number): number {
  return terrain === TERRAIN.HILLS ? 2 : 1
}

/** Accuracy bonus for standing here. */
export function accuracyBonusOf(terrain: number): number {
  return terrain === TERRAIN.HILLS ? 10 : 0
}

/** Extra reach for ranged weapons fired from here. */
export function reachBonusOf(terrain: number): number {
  return terrain === TERRAIN.HILLS ? 2 : 0
}
