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
//   node tools/painted-scenes.mjs --json      print the pack (the engine's test/painted-board.test.ts reads it)
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(PKG, '..')
// engine backlog viewer.painted-board spec: "map.opening.orphanage draws on assets/terrain-3d/orphanage-riverside,
// lumberjack on lumberjack-forest, bridge on abbotown-encounters/bridge"
export const SCENES = {
  'map.opening.orphanage': { key: 'orphanage', scene: 'orphanage-riverside' },
  'map.opening.lumberjack': { key: 'lumberjack', scene: 'lumberjack-forest' },
  'map.opening.bridge': { key: 'bridge', scene: 'abbotown-encounters/bridge' },
}
// A hex centre that misses the engine's by more than this (board px) is a misaligned scene.
export const TOLERANCE = 1e-6

const read = p => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))

export function packPaintedScenes(fields = JSON.parse(readFileSync(resolve(PKG, 'generated/fields.json'), 'utf8'))) {
  const proposal = read('assets/battle-atlas/opening-ground-proposal-2026-09-28.json')
  const catalog = read('assets/battle-atlas/library.json')
  const pack = {}
  for (const [mapId, { key, scene }] of Object.entries(SCENES)) {
    const row = proposal.maps.find(m => m.key === key)
    if (!row) throw new Error(`painted ${mapId}: the ground proposal has no map '${key}'`)
    if (row.file !== 'assets/terrain-3d/' + scene) throw new Error(`painted ${mapId}: the spec names ${scene}, the map was compiled against ${row.file}`)
    const dir = 'assets/terrain-3d/' + scene
    if (!existsSync(resolve(ROOT, dir, 'scene.glb'))) throw new Error(`painted ${mapId}: ${dir}/scene.glb is missing`)
    const nav = read(dir + '/navigation.json')
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
    pack[mapId] = { kind: 'painted', mapId, name: row.name, scene, sceneSha256: nav.sceneSha256, cols: nav.cols, rows: nav.rows, radius: R, toBoard, heights }
  }
  return pack
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--json')) process.stdout.write(JSON.stringify(packPaintedScenes()))
