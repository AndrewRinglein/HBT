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
import { MAPS, decodeMap } from '../src/content/maps.js'
import { presentationField } from '../src/view/field.js'

const mapId = process.argv[2]
if (!mapId) { console.error('usage: field-geometry <mapId>'); process.exit(2) }
const m = MAPS.find(x => x.id === mapId)
if (!m) { console.error(`unknown map '${mapId}'`); process.exit(2) }
const decoded = decodeMap(m)
console.log(JSON.stringify(presentationField({ ...decoded.board, terrain: decoded.terrain, props: decoded.props, ...(decoded.floor?{floor:decoded.floor}:{}) }, m.rows)))
