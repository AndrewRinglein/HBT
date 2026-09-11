// npx tsx tools/field-geometry.mts <mapId>
//
// Emit replay-viewer field geometry for ANY authored map, derived from the
// ENGINE's own tables — terrain, move costs, modifiers, strips and applies all
// come from content/maps.ts, so the legend can never drift from the rules.
// Used by build-replay.mjs whenever the battle's map is not the one the shipped
// art was painted for.
//
// BOARD SPACE, not screen space (viewer.geometry, PLAYBACK-DESIGN §7.2).
// This file used to emit an art-traced FLAT projection — hexW 68.2 · row 44.8 ·
// base 30.2 — with the 46° foreshortening already baked into the row step. That
// cannot be re-tilted without re-deriving every constant, so the tilt is now the
// viewer's and this file emits the board unsquashed:
//
//   colStep 128 · rowStep 96 · oddOffset 64 · cell 128 x 132
//
// The board applies rotateX(TILT) ONCE, at layer 0. TILT ships here so the
// board, the billboards and the canvas overlay all read one number — change it
// and every derived value follows (that is the whole argument for §7.2's single
// layout object). 49.3° is ruled: it is the angle the mapgen asset pipeline was
// built at, and it supersedes the Muster mock's 46°.
//
// Changes BUILD OUTPUT only, never battle behaviour. Baseline hashes must not move.
import { MAPS, boardOf, terrainOf, terrainIdOf, moveCostOf, isPassable, IMPASSABLE,
  accuracyBonusOf, reachBonusOf, dodgeBonusOf, armorBonusOf,
  stripsOnEnterOf, stripsOnActivationEndOf, appliesOnEnterOf, appliesOnActivationEndOf,
} from '../src/content/maps.js'

const mapId = process.argv[2]
if (!mapId) { console.error('usage: field-geometry <mapId>'); process.exit(2) }
const m = MAPS.find((x) => x.id === mapId)
if (!m) { console.error(`unknown map '${mapId}'`); process.exit(2) }

// BOARD SPACE, unsquashed (viewer.geometry, PLAYBACK-DESIGN §7.2) — the board
// applies rotateX(TILT) once; 49.3° is ruled. Reapplied 2026-08-26 after the
// restructure discarded the first uncommitted copy of this change.
const HEXW = 128, HEXH = 132, COL = 128, ROW = 96, ODD = 64, TILT = 49.3
const terrain = terrainOf(mapId)
// board.variable-size (2026-09-04): the map's own dimensions, emitted for the viewer
const { width: WIDTH, height: HEIGHT } = boardOf(mapId)

// px/py stay CENTRES, as before — only the space changed, not the meaning.
const hexes = [] as { c: number; r: number; px: number; py: number }[]
for (let r = 0; r < HEIGHT; r++) for (let c = 0; c < WIDTH; c++) {
  hexes.push({ c, r, px: COL / 2 + c * COL + (r % 2) * ODD, py: HEXH / 2 + r * ROW })
}

const short = (id: string) => id.replace('status.', '')
const groundNote = (t: number): string => {
  const bits: string[] = []
  const se = stripsOnEnterOf(t), sa = stripsOnActivationEndOf(t)
  const ae = appliesOnEnterOf(t), aa = appliesOnActivationEndOf(t)
  if (se.length || sa.length) bits.push(`washes ${[...new Set([...se, ...sa])].map(short).join('/')}`)
  if (ae.length) bits.push(`+${ae.map(([id, n]) => `${n} ${short(id)}`).join(', ')} on entry`)
  if (aa.length) bits.push(`+${aa.map(([id, n]) => `${n} ${short(id)}`).join(', ')} end of activation`)
  return bits.join(' · ')
}

const kinds = [...new Set(terrain)].sort((a, b) => a - b)
const table = kinds.map((t) => ({
  id: terrainIdOf(t),
  moveCost: moveCostOf(t) >= IMPASSABLE ? 99 : moveCostOf(t),
  passable: isPassable(t),
  accuracy: accuracyBonusOf(t), reach: reachBonusOf(t),
  dodge: dodgeBonusOf(t), armor: armorBonusOf(t),
  ground: groundNote(t),
}))

console.log(JSON.stringify({
  width: WIDTH, height: HEIGHT,   // board.variable-size: the map's own dimensions
  // board-space extent, UNSQUASHED. The viewer squashes by cos(TILT).
  w: WIDTH * COL + ODD, h: (HEIGHT - 1) * ROW + HEXH,
  hexW: HEXW, hexH: HEXH,
  colStep: COL, rowStep: ROW, oddOffset: ODD, tilt: TILT,
  hexes, rows: m.rows,
  terrainIds: terrain.map(terrainIdOf),
  moveCost: terrain.map((t) => (moveCostOf(t) >= IMPASSABLE ? 99 : moveCostOf(t))),
  table,
}))
