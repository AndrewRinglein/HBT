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
import { GLYPH, takesEntry } from './terrain.js'
import type { AuthoredMap } from '../core/types.js'
import { decodeProps, decodeFloor } from '../core/props.js'
import { geometryOf, type Board, type Edge } from '../core/hex.js'
import { disabledIds } from './disable.js'
import { packMaps, packTestMaps, mapBoardOf } from './pack.js'

/**
 * `deploy` — which edge each side deploys on (board.deploy-edges, 2026-09-04).
 * Absent = the ruled default, heroes WEST and enemies EAST (2026-09-03:
 * "Heroes start on the left, and enemies start on the right. That is the
 * default configuration"). The maps authored before the ruling say
 * south/north explicitly, so every control battle is what it was.
 */
export type Deploy = { readonly hero: Edge; readonly enemy: Edge }
export const DEFAULT_DEPLOY: Deploy = { hero: 'west', enemy: 'east' }
export type MapDef = AuthoredMap

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
const allMaps = [...packMaps(), ...RAW_MAPS, ...packTestMaps()]
const mapIds = new Set<string>()
for (const m of allMaps) {
  if (mapIds.has(m.id)) throw new Error(`map '${m.id}' exists in multiple map lanes — one owner only`)
  mapIds.add(m.id)
}
export const MAPS: readonly MapDef[] = allMaps.filter((m) => !disabledIds().has(m.id))

// fix.opening-maps-off-panel (2026-09-28): the FIXED control panel (COMBAT-SEQUENCE.md "Maps are not
// random") is every registered map but a campaign map that says `panel: false` — the opening's six,
// fielded by their encounters. They stay in MAPS: mapDef, boardOf and the encounters read them.
export const MAP_PANEL = MAPS.filter((m) => m.panel !== false).map((m) => m.id)

export function mapDef(mapId: string): MapDef {
  const m = MAPS.find((x) => x.id === mapId)
  if (!m) throw new Error(`unknown map '${mapId}' — maps are authored: content/gen/maps.json (shipping) or content/maps.ts (testing lane)`)
  return m
}

/**
 * The board a map is drawn on — board.variable-size (2026-09-04). Read off the
 * rows: height is the row count, width the row length, and the pair must be
 * bounded positive safe integers. Preset names do not restrict authored sizes.
 */
export function boardOf(mapId: string): Board {
  return decodeMap(mapDef(mapId)).board
}

/** The deployment edges of a map — its own, else the ruled default. The two edges must differ. */
export function deployOf(mapId: string): Deploy {
  return decodeMap(mapDef(mapId)).deploy
}

export function terrainOf(mapId: string): number[] {
  return decodeMap(mapDef(mapId)).terrain
}

/**
 * v2.structures — the authored entry sides: [structure hex, the adjacent hex it is entered
 * from], at most ONE per structure hex ("There is one facing on the wall tile"). With
 * `terrain`, each structure hex must be a ground that takes one (a wall, a house). Loud on
 * anything else (Law 9). Returns a detached copy in structure-hex order (Law 6).
 */
export function decodeEntries(value: unknown, board: Board, terrain?: readonly number[]): [number, number][] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new Error('entries: expected a plain array of [structure hex, entered-from hex] pairs')
  const cells = board.width * board.height, geo = geometryOf(board), seen = new Set<number>(), out: [number, number][] = []
  if (value.length > cells) throw new Error('entries: more entries than cells')
  for (let i = 0; i < value.length; i++) {
    const pair = Object.getOwnPropertyDescriptor(value, String(i))?.value
    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((h) => Number.isSafeInteger(h) && h >= 0 && h < cells)) throw new Error('entries: each entry is [structure hex, entered-from hex], both on the board')
    const [hex, from] = pair as [number, number]
    if (!geo.isAdjacent(hex, from)) throw new Error(`entries: ${from} is not beside ${hex} — an entry is one side of the structure's hex`)
    if (seen.has(hex)) throw new Error(`entries: hex ${hex} has two entries — a structure has ONE entry side`)
    if (terrain && !takesEntry(terrain[hex] ?? 0)) throw new Error(`entries: hex ${hex} is not a wall or a house — nothing there takes stairs or a door`)
    seen.add(hex); out.push([hex, from])
  }
  return out.sort((a, b) => a[0] - b[0])
}

/** Validate before allocation; retain no caller-owned arrays or metadata objects. */
export function decodeMap(m: MapDef): { id: string; board: Board; deploy: Deploy; terrain: number[]; props: import('../core/types.js').Prop[]; floor?: boolean[]; entries?: [number, number][] } {
  const board = mapBoardOf(m)
  const out: number[] = []
  // v2.knockback-collisions (2026-09-23): the kill-switch seam reaches authored
  // props too (CF_DISABLE_IDS=prop.x) — a disabled prop is a map without it.
  const off = disabledIds()
  const props = decodeProps(m.props === undefined ? [] : m.props, board.width * board.height).filter(p => !off.has(p.id))
  if (props.some(p => p.id.startsWith('prop.obstacle.'))) throw new Error('props: reserved shorthand ID')
  for (const row of m.rows) {
    for (const ch of row) {
      const t = GLYPH[ch]
      if (t === undefined) throw new Error(`map '${m.id}' has an unknown glyph '${ch}'`)
      if (ch === 'x') {
        props.push({ id: `prop.obstacle.${out.length}`, height: 'high', material: 3, footprint: { kind: 'hex', hexes: [out.length] } })
        out.push(TERRAIN.OPEN)
      } else out.push(t)
    }
  }
  return { id: m.id, board, deploy: { ...(m.deploy ?? DEFAULT_DEPLOY) }, terrain: out, props: decodeProps(props, out.length), ...(Object.hasOwn(m,'floor')?{floor:decodeFloor(m.floor,out.length)}:{}),
    ...(Object.hasOwn(m,'entries')?{entries:decodeEntries(m.entries,board,out)}:{}) }
}

// Keep existing registry consumers on the same terrain implementation.
export * from './terrain.js'
