// viewer.opening-scenes-four-to-six (engine backlog; engine DECISIONS.md 2026-10-03 'everything in the viewer and in play is the
// 3D maps and the 3D characters'). Andrew, having opened the Cavern Trail on a flat hex board: "I want everything in the viewer
// to be our three-dimensional maps and our three-dimensional characters. Everything in the play is to be that." Every opening
// battle whose ground was compiled from a 3D scene opens on that scene - the Cavern Trail on the cave, the Cathedral on the
// cathedral, as battles 1-3 already did - with its board the scene's own size. The hex-by-hex alignment of every bound scene is
// tools/painted-board.test.mjs's. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'

/* the opening's six battles, and the ground each map was compiled from (the scene, when it is one) */
const OPENING = JSON.parse(readFileSync('../progression/OPENING-PARTY.json', 'utf8')).positions
const proposal = JSON.parse(readFileSync('../assets/battle-atlas/opening-ground-proposal-2026-09-28.json', 'utf8'))
const SCENE_DIR = 'assets/terrain-3d/'
const battles = OPENING.map(p => {
  const row = proposal.maps.find(m => m.name === p.name)
  const recording = JSON.parse(readFileSync('battles/test.opening-' + p.encounterId.replace('encounter.opening.', '') + '.json', 'utf8'))
  return { ...p, mapId: recording.events.find(e => e.type === 'map.loaded').mapId, ground: row && row.file, scene: row && row.file.startsWith(SCENE_DIR) ? row.file.slice(SCENE_DIR.length) : null }
})

function boot(hash) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { value: { hash, protocol: 'file:', href: 'file:///BATTLE-VIEWER.html' + hash }, configurable: true })
  try { new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n])) }
  finally { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location }
  return w
}

test('the ground of every opening map is on record, and five of the six were compiled from a 3D scene', () => {
  assert.equal(battles.length, 6)
  for (const b of battles) assert.ok(b.ground, `${b.name}: the ground proposal names what its map was compiled from`)
  assert.deepEqual(battles.filter(b => b.scene).map(b => b.name), ['Orphanage', 'Lumberjack House', 'Bridge', 'Cavern Trail', 'Cathedral'])
})

for (const b of battles.filter(b => b.scene)) test(`${b.name} opens on its 3D scene (${b.scene}), the board the scene's own size`, () => {
  const w = boot('#' + b.mapId), H = w.__battleView.harness, V = H.viewer._V
  assert.equal(H.viewer.events.find(e => e.type === 'map.loaded').mapId, b.mapId, 'the address opens this battle')
  assert.ok(V.data.atlas, `${b.name} is drawn on a scene, not the flat hex board`)
  assert.equal(V.data.atlas.kind, 'painted'); assert.equal(V.data.atlas.scene, b.scene)
  const nav = JSON.parse(readFileSync('../' + SCENE_DIR + b.scene + '/navigation.json', 'utf8'))
  assert.deepEqual([V.data.F.width, V.data.F.height], [nav.cols, nav.rows])
  assert.equal(V.data.atlas.sceneSha256, nav.sceneSha256, 'the scene the hexes were measured on')
  H.dispose()
})
