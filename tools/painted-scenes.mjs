#!/usr/bin/env node
// The painted 3D scenes a map.opening.* battle is drawn on (viewer.painted-board, PLAYABLE-OPENING-PLAN.md
// item 4; engine DECISIONS.md 2026-09-29 "the playable battle screen": "The painted 3D scenes are the battle
// board, turned into hex maps").
//
// Three facts, three owners, related ONCE here so the page computes nothing:
//   which scene is a map's  — the backlog spec's own words (SCENES below), cross-checked against the file the
//                             map was compiled from (assets/battle-atlas/opening-ground-proposal-2026-09-28.json,
//                             maps[].file; content/mkopeningmaps.mjs)
//   where a scene hex is    — the scene's measured navigation (assets/terrain-3d/<scene>/navigation.json), current
//                             on the scene's hash as the Atlas catalog records it (assets/battle-atlas/library.json)
//   where an engine hex is  — the engine's board projection (generated/fields.json, through the door)
// The pack is the scene-metre -> board-pixel map and the display height of every hex. It REFUSES a scene whose
// grid is not the engine board's, or any hex whose scene centre does not land on the engine's (Law 1: a missing
// or disagreeing fact is a build failure, never a best fit).
//
//   node tools/painted-scenes.mjs --json      print the pack (test/painted-board.test.ts reads it)
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packPresentation } from './presentation-profile.mjs'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(PKG, '..')
// engine backlog viewer.painted-board spec: "map.opening.orphanage draws on assets/terrain-3d/orphanage-riverside,
// lumberjack on lumberjack-forest, bridge on abbotown-encounters/bridge"
export const SCENES = {
  'map.opening.orphanage': { key: 'orphanage', scene: 'orphanage-riverside' },
  'map.opening.lumberjack': { key: 'lumberjack', scene: 'lumberjack-forest' },
  'map.opening.bridge': { key: 'bridge', scene: 'abbotown-encounters/bridge' },
  // viewer.opening-scenes-four-to-six (engine DECISIONS.md 2026-10-03 'everything in the viewer and in play is the 3D maps and
  // the 3D characters'): battles 4 and 6 on the scenes their maps were compiled from. Battle 5, the Gates, was compiled from an
  // Atlas map (assets/battle-atlas/maps/abbotown-gate-painted.json), not a scene: unbound (viewer SWITCHES gatesGround)
  'map.opening.cavern-trail': { key: 'cave', scene: 'abbotown-encounters/cave' },
  'map.opening.cathedral': { key: 'cathedral', scene: 'abbotown-encounters/cathedral' },
}
// A hex centre that misses the engine's by more than this (board px) is a misaligned scene.
export const TOLERANCE = 1e-6

const read = p => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))
/* viewer.caravan-scene (2026-10-01): a map compiled straight from a painted scene's measured navigation
   (content/mkpaintedmaps.mjs, content/gen/painted-maps.json `scenes`: map id -> scene and the hash it was measured on)
   is bound the same way, the content file standing where the ground proposal stands for the opening's maps */
export const PAINTED_MAPS = 'content/gen/painted-maps.json'

export function packPaintedScenes(fields = JSON.parse(readFileSync(resolve(PKG, 'generated/fields.json'), 'utf8'))) {
  const proposal = read('assets/battle-atlas/opening-ground-proposal-2026-09-28.json')
  const catalog = read('assets/battle-atlas/library.json')
  const pack = {}
  for (const [mapId, { key, scene }] of Object.entries(SCENES)) {
    const row = proposal.maps.find(m => m.key === key)
    if (!row) throw new Error(`painted ${mapId}: the ground proposal has no map '${key}'`)
    if (row.file !== 'assets/terrain-3d/' + scene) throw new Error(`painted ${mapId}: the spec names ${scene}, the map was compiled against ${row.file}`)
    pack[mapId] = bindScene(mapId, row.name, scene, catalog, fields)
  }
  if (existsSync(resolve(ROOT, PAINTED_MAPS))) {
    const painted = read(PAINTED_MAPS)
    for (const m of painted.maps) {
      const at = painted.scenes?.[m.id]
      if (!at) throw new Error(`painted ${m.id}: ${PAINTED_MAPS} names no scene for it`)
      if (pack[m.id]) throw new Error(`painted ${m.id}: bound twice`)
      pack[m.id] = bindScene(m.id, m.name, at.scene, catalog, fields, at.sceneSha256)
    }
  }
  return pack
}

/* ── THE BODIES THAT LIE ON A SCENE (viewer.bodies-life-size, 2026-10-05) ───────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-05 'the playtest post answered: … a body on the ground is the size of a living unit lying
   down' (Andrew: "The bodies on the terrain are smaller than they should be. They should be larger." · "The body should be
   the size of living units lying down, yes."). The bodies are models in the scene, made at a person's real size; the page
   stands every unit's body larger (the size look), so it must enlarge these with them — and for that it must know WHICH
   things in the scene are bodies. Two facts, two owners, related once here:
     which are bodies      the scene's own record: assets/terrain-3d/<scene>/assembly.json 'bodies' (place, source, kind)
     which nodes they are  the scene file's own node list (the head of scene.glb): the nodes that stand at a body's place
   The pack names each place a body lies and how many of the file's nodes stand there; the page scales those and refuses a
   scene that does not hold them (painted.js scaleBodies). A recorded body no node stands at is a build failure.
   NOT SCALED, and said: a body made as ONE model with furniture cannot be made larger without the furniture — it is left
   at its made size and listed (the pack's 'bodiesLeft'; the art need is that model, separated). */
export const BODY_WITH_FURNITURE = {
  'pew-remains': 'the remains and the pew they lie on are one model: scaling the body scales the pew (art: the remains apart from the pew)',
}
/** a scene file's own JSON — its nodes — read off the file's head; the file is never read whole */
function sceneNodes(dir) {
  const fd = openSync(resolve(ROOT, dir, 'scene.glb'), 'r')
  try { const head = Buffer.alloc(20); readSync(fd, head, 0, 20, 0)
    if (head.readUInt32LE(0) !== 0x46546c67 || head.readUInt32LE(16) !== 0x4e4f534a) throw new Error(dir + '/scene.glb is not a GLB')
    const json = Buffer.alloc(head.readUInt32LE(12)); readSync(fd, json, 0, json.length, 20)
    return JSON.parse(json.toString('utf8')).nodes || [] } finally { closeSync(fd) }
}
const SAME_PLACE = 1e-3            // scene metres: a node stands at a body's place when its x and z are the record's
export function packBodies(mapId, dir) {
  if (!existsSync(resolve(ROOT, dir, 'assembly.json'))) return { bodies: [], bodiesLeft: [] }
  const record = read(dir + '/assembly.json').bodies
  if (!Array.isArray(record)) throw new Error(`painted ${mapId}: ${dir}/assembly.json records no 'bodies' list`)
  if (!record.length) return { bodies: [], bodiesLeft: [] }
  const nodes = sceneNodes(dir).filter(n => Array.isArray(n.translation)), at = (n, p) => Math.abs(n.translation[0] - p[0]) < SAME_PLACE && Math.abs(n.translation[2] - p[2]) < SAME_PLACE
  const bodies = [], bodiesLeft = []
  for (const b of record) {
    if (!Array.isArray(b.position) || b.position.length !== 3) throw new Error(`painted ${mapId}: a recorded body has no place`)
    const count = nodes.filter(n => at(n, b.position)).length
    if (!count) throw new Error(`painted ${mapId}: the scene file holds no node at the recorded body ${b.name ?? b.source} (${b.position.join(', ')})`)
    if (Object.hasOwn(BODY_WITH_FURNITURE, b.source)) { bodiesLeft.push({ name: b.name ?? b.source, source: b.source, why: BODY_WITH_FURNITURE[b.source] }); continue }
    if (!bodies.some(e => Math.abs(e.at[0] - b.position[0]) < SAME_PLACE && Math.abs(e.at[2] - b.position[2]) < SAME_PLACE)) bodies.push({ at: [...b.position], nodes: count })
  }
  return { bodies, bodiesLeft }
}

/** one scene bound to one engine map: the scene's measured hexes against the engine's, refused at the first disagreement */
function bindScene(mapId, name, scene, catalog, fields, measuredOn = null) {
  const dir = 'assets/terrain-3d/' + scene
  if (!existsSync(resolve(ROOT, dir, 'scene.glb'))) throw new Error(`painted ${mapId}: ${dir}/scene.glb is missing`)
  const nav = read(dir + '/navigation.json')
  if (measuredOn && nav.sceneSha256 !== measuredOn) throw new Error(`painted ${mapId}: the map was compiled from navigation measured on ${measuredOn.slice(0, 12)}, the scene's navigation is now ${nav.sceneSha256.slice(0, 12)} — recompile it (content/mkpaintedmaps.mjs)`)
  if (!nav.checks?.passed) throw new Error(`painted ${mapId}: ${dir}/navigation.json has not passed its checks`)
  const asset = catalog.assets.find(a => a.file === scene + '/scene.glb')
  if (!asset) throw new Error(`painted ${mapId}: the Atlas catalog does not list ${scene}/scene.glb`)
  if (asset.sha256 !== nav.sceneSha256) throw new Error(`painted ${mapId}: navigation.json was measured on scene ${nav.sceneSha256.slice(0, 12)}, the catalog's scene is ${asset.sha256.slice(0, 12)} — re-measure the hexes`)
  const field = fields[mapId]
  if (!field) throw new Error(`painted ${mapId}: generated/fields.json has no such map`)
  if (nav.cols !== field.width || nav.rows !== field.height) throw new Error(`painted ${mapId}: the scene is ${nav.cols}x${nav.rows}, the engine board ${field.width}x${field.height}`)
  if (nav.cells.length !== field.hexes.length) throw new Error(`painted ${mapId}: ${nav.cells.length} scene hexes, ${field.hexes.length} engine hexes`)
  const R = nav.radius, sx = field.colStep / (Math.sqrt(3) * R), sy = field.rowStep / (1.5 * R)
  const c0 = nav.cells[0], toBoard = { sx, sy, x0: c0.center[0], z0: c0.center[2], px0: field.hexes[0].px, py0: field.hexes[0].py }
  const heights = []
  field.hexes.forEach((p, i) => {
    const cell = nav.cells[i]
    if (cell.id !== i || cell.col !== p.c || cell.row !== p.r) throw new Error(`painted ${mapId}: scene hex ${i} is (${cell.col},${cell.row}), the engine's is (${p.c},${p.r})`)
    const px = toBoard.px0 + (cell.center[0] - toBoard.x0) * sx, py = toBoard.py0 + (cell.center[2] - toBoard.z0) * sy
    if (Math.abs(px - p.px) > TOLERANCE || Math.abs(py - p.py) > TOLERANCE) throw new Error(`painted ${mapId}: scene hex (${p.c},${p.r}) lands at ${px},${py}, the engine's at ${p.px},${p.py} — the scene is not aligned to the board`)
    heights.push(cell.stand[1] * sx)
  })
  const presentation = packPresentation(scene, nav)
  /* viewer.bodies-life-size: the places a body lies on this scene (and the bodies left at their made size, with why) */
  const lying = packBodies(mapId, dir)
  return { kind: 'painted', mapId, name, scene, sceneSha256: nav.sceneSha256, cols: nav.cols, rows: nav.rows, radius: R, toBoard, heights, ...(presentation ? { presentation } : {}),
    ...(lying.bodies.length ? { bodies: lying.bodies } : {}), ...(lying.bodiesLeft.length ? { bodiesLeft: lying.bodiesLeft } : {}) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--json')) process.stdout.write(JSON.stringify(packPaintedScenes()))
