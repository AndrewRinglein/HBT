// npx tsx tools/field-geometry.mts <mapId>
//
// Emit replay-viewer field geometry for ANY authored map, derived from the
// ENGINE's own tables — terrain, move costs, modifiers, strips and applies all
// come from content/maps.ts, so the legend can never drift from the rules.
// The pixel layout copies the constants of the original art-traced field in
// static.json (hexW 68.2 · row step 44.8 · base 30.2), so synthetic boards and
// the art board share one scale. Used by build-replay.mjs whenever the battle's
// map is not the one the shipped art was painted for.
import { MAPS, terrainOf, terrainIdOf, moveCostOf, isPassable, IMPASSABLE,
  accuracyBonusOf, reachBonusOf, dodgeBonusOf, armorBonusOf,
  stripsOnEnterOf, stripsOnActivationEndOf, appliesOnEnterOf, appliesOnActivationEndOf,
} from '../src/content/maps.js'
import { WIDTH, HEIGHT } from '../src/core/hex.js'

const mapId = process.argv[2]
if (!mapId) { console.error('usage: field-geometry <mapId>'); process.exit(2) }
const m = MAPS.find((x) => x.id === mapId)
if (!m) { console.error(`unknown map '${mapId}'`); process.exit(2) }

// BOARD SPACE, unsquashed (viewer.geometry, PLAYBACK-DESIGN §7.2) — the board
// applies rotateX(TILT) once; 49.3° is ruled. Reapplied 2026-08-26 after the
// restructure discarded the first uncommitted copy of this change.
const HEXW = 128, HEXH = 132, COL = 128, ROW = 96, ODD = 64, TILT = 49.3
const terrain = terrainOf(mapId)

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
  w: WIDTH * COL + ODD, h: (HEIGHT - 1) * ROW + HEXH,
  hexW: HEXW, hexH: HEXH,
  colStep: COL, rowStep: ROW, oddOffset: ODD, tilt: TILT,
  hexes, rows: m.rows,
  terrainIds: terrain.map(terrainIdOf),
  moveCost: terrain.map((t) => (moveCostOf(t) >= IMPASSABLE ? 99 : moveCostOf(t))),
  table,
}))
