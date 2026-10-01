// viewer.caravan-scene (2026-10-01; ../ATLAS-COMBAT-INTEGRATION.md "Caravan camera and surroundings: implementation handoff —
// 2026-10-01", Phase 2): the caravan aftermath fielded through the painted-scene path. Its map is compiled from the scene's
// measured navigation (content/mkpaintedmaps.mjs; engine encounter.caravan-aftermath, provisional fight ruled 2026-10-01);
// its presentation profile (tools/presentation-profiles.json) brings the accepted preview's dark backdrop, decorative
// surroundings, fires and cursed fog — which the GLB alone does not contain — from the scene's own frozen facts, so the
// replay and the live battle draw the same scene. Decoration never enters picking, the fit or the board.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packPaintedScenes } from './painted-scenes.mjs'
import { validateProfile, readProfiles } from './presentation-profile.mjs'
const A = await modules(), fields = JSON.parse(readFileSync('generated/fields.json'))
const nav = JSON.parse(readFileSync('../assets/terrain-3d/caravan-aftermath/navigation.json'))
const ID = 'map.caravan-aftermath'

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
/** a stand-in for the caravan GLB: the ground the backdrop extends (a painted map texture) and the scenery it clones */
function caravanRoot() {
  const root = new THREE.Group(), tex = new THREE.Texture()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(84, 41).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex })); ground.name = 'Ground_Moor'
  const rocks = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()); rocks.name = 'Boundary_Rocks'; rocks.position.set(10, .5, 5)
  root.add(ground, rocks); return { root, rocks }
}
const loadOpts = (b, parse, extra = {}) => ({ location: { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }, fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
  digest: async () => Uint8Array.from(b.sceneSha256.match(/../g), h => parseInt(h, 16)).buffer, parse, loadTexture: async () => new THREE.Texture(), ...extra })

test('the caravan binds to its engine map hex for hex, with the scene\'s own fires and cursed hexes packed — never retyped', () => {
  const pack = packPaintedScenes(fields), b = A.paintedBinding(ID, fields[ID], pack), P = b.presentation
  assert.equal(b.scene, 'caravan-aftermath'); assert.equal(b.sceneSha256, nav.sceneSha256); assert.deepEqual([b.cols, b.rows], [32, 18])
  /* the scene's facts: seven ground fires on the navigation's fire hexes, four on the wrecks; 31 cursed hexes, the navigation's */
  assert.equal(P.fireSites.filter(s => s.kind === 'ground').length, 7); assert.equal(P.fireSites.filter(s => s.kind === 'wreck').length, 4)
  const hexOf = ([x, , z]) => nav.cells.reduce((best, c) => Math.hypot(c.center[0] - x, c.center[2] - z) < Math.hypot(best.center[0] - x, best.center[2] - z) ? c : best).id
  assert.deepEqual(P.fireSites.filter(s => s.kind === 'ground').map(s => hexOf(s.at)).sort((a, z) => a - z), [...nav.groundFireCells].sort((a, z) => a - z))
  assert.deepEqual(P.cursedSites.map(hexOf), nav.cursedCells)
  /* the engine paints the same hexes the scene shows: content/gen/painted-maps.json is where both come from */
  const ground = JSON.parse(readFileSync('../content/gen/painted-maps.json', 'utf8')).ground[ID]
  assert.deepEqual(ground.fire, [...nav.groundFireCells].sort((a, z) => a - z)); assert.deepEqual(ground.cursed, [...nav.cursedCells].sort((a, z) => a - z))
  assert.equal(P.environment.background, '#302c25', 'the caravan\'s dark backdrop, not the pale default')
  assert.equal(P.surroundings.keepOut.length, 2, 'its road exits are its own configuration')
  for (const mapId of ['map.opening.orphanage', 'map.opening.lumberjack', 'map.opening.bridge']) assert.equal(pack[mapId].presentation, undefined, `${mapId} is presented as before`)
})

test('a presentation profile is validated: camera defaults and bounds are not a profile\'s, and a malformed one is refused', () => {
  const ok = readProfiles()['caravan-aftermath']
  assert.doesNotThrow(() => validateProfile('caravan-aftermath', ok))
  for (const [bad, why] of [[{ ...ok, camera: { elevation: 55 } }, /unknown field 'camera'/], [{ ...ok, bounds: [0, 0, 1, 1] }, /unknown field 'bounds'/],
    [{ ...ok, environment: { background: 'dark' } }, /environment/], [{ ...ok, surroundings: { ...ok.surroundings, keepOut: [{ side: 'north', zFrom: 0, zTo: 1 }] } }, /keepOut/],
    [{ ...ok, effects: { fire: 'yes', cursedGround: true } }, /effects/]]) assert.throws(() => validateProfile('caravan-aftermath', bad), why)
})

test('the scene is loaded with its surroundings, fires and fog; none of them can be picked; dispose frees each resource once', async () => {
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w
  const b = A.paintedBinding(ID, fields[ID], packPaintedScenes(fields)), { root, rocks } = caravanRoot()
  let rockDisposed = 0; rocks.geometry.dispose = () => { rockDisposed++ }
  const loaded = await A.loadPaintedScene(b, loadOpts(b, async () => ({ scene: root })))
  const named = n => { let g = null; loaded.group.traverse(o => { if (o.name === n) g = o }); return g }
  const backdrop = named('Decorative_surroundings'), fire = named('Terrain fire examples'), curse = named('Cursed ground · Ashen Spirits')
  assert.ok(backdrop && backdrop.userData.decorative && backdrop.userData.collidable === false && backdrop.userData.placements > 0, 'the decorative backdrop, with its cloned scenery')
  assert.ok(fire && curse, 'the fires and the cursed fog the GLB does not contain')
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0)), hits = []
  for (const g of [backdrop, fire, curse]) g.traverse(o => { if (o !== g && o.raycast) { const before = hits.length; o.raycast(ray, hits); assert.equal(hits.length, before, `${g.name}: ${o.type} is not under any pointer`) } })
  assert.equal(loaded.animated, true)
  const cam = new THREE.PerspectiveCamera(); assert.doesNotThrow(() => { loaded.animate(1.5, cam); loaded.animate(2, cam) })
  loaded.dispose(); loaded.dispose()
  assert.equal(rockDisposed, 1, 'the scenery the backdrop clones is the scene\'s own, freed once with it')
  assert.equal(backdrop.parent, null); assert.equal(fire.parent, null)
})

test('a scene whose fires and fog move is drawn every frame, the camera and the units still', async () => {
  const b = A.paintedBinding(ID, fields[ID], packPaintedScenes(fields)), { root } = caravanRoot()
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'); wrap.appendChild(stage)
  const stats = { draws: 0 }; class Renderer { constructor() { this.shadowMap = {} } setPixelRatio() {} setSize() {} render(scene) { stats.draws++; stats.scene = scene } dispose() {} forceContextLoss() {} }
  const affine = A.paintedToCSS(b), V = { dom: { stage }, data: { F: fields[ID], atlas: b, boardAffine: affine } }
  V.camera3d = A.orbitCamera(affine, { x: fields[ID].w / 2, y: fields[ID].h / 2, yaw: 0, tilt: 50, zoom: 1 }, { w: 1920, h: 1080 }); V.camVersion = 1
  let t = 0; const driver = A.createDriver(V, e => { throw e }, { Renderer, now: () => (t += 16), loadPainted: (bb, platform) => A.loadPaintedScene(bb, { ...loadOpts(bb, async () => ({ scene: root })), ...platform, location: loadOpts(bb).location }) })
  await driver.ready
  assert.equal(stats.scene.background.getHexString(), '302c25', 'drawn on the caravan\'s dark backdrop')
  const d0 = stats.draws; for (let i = 0; i < 4; i++) frames.shift()()
  assert.equal(stats.draws, d0 + 4, 'four frames, four draws — nothing moved but the fire and the fog')
  driver.dispose()
})

test('in the battle screen the caravan is its own board: the fit and the picking read the engine\'s board, the surroundings only free the pan', () => {
  const w = boot('#' + ID), H = w.__battleView.harness, v = H.viewer, V = v._V
  assert.equal(v.events.find(e => e.type === 'map.loaded').mapId, ID); assert.equal(V.data.atlas.kind, 'painted'); assert.ok(V.data.atlas.presentation.surroundings)
  /* the whole-map fit is the engine board's: the same with the scene's decoration taken away */
  v.camera('whole'); const withDecor = V.camTarget.zoom
  const keep = V.data.atlas.presentation; V.data.atlas.presentation = null; v.camera('whole'); assert.equal(V.camTarget.zoom, withDecor, 'decoration never widens the fit'); V.data.atlas.presentation = keep
  /* beyond the board is nothing to click: a pointer there picks no hex and no unit */
  v.camera('whole'); v.peek(true)
  /* the board's own pick (board.js pickAt): every hex of the engine's board at its display height */
  const hexes = Object.keys(V.data.POS).map(Number).filter(h => !V.data.F.floor || V.data.F.floor[h]).map(h => ({ hex: h, x: V.data.POS[h].px, y: V.data.POS[h].py, z: V.data.atlas.heights[h] }))
  const pick = (x, y) => A.pickBoard(A.boardRay(V.data.boardAffine, V.camera3d, x, y), hexes, [], { W: V.data.LAYOUT.W, H: V.data.LAYOUT.H })
  assert.notEqual(pick(960, 540), null, 'the middle of the view is a hex of the board')
  for (const [x, y] of [[4, 4], [1916, 4], [4, 1076], [1916, 1076]]) assert.equal(pick(x, y), null, `the corner (${x},${y}) is decoration: nothing to pick`)
  v.peek(false)
  /* with surroundings the preview's freer pan: unturned and near, the view's centre may reach the board's own edge */
  v.resetView(); v.zoom(100); v.pan(-1e5, 0); assert.ok(V.camTarget.x < 1, `near, the centre reaches the west edge (${V.camTarget.x})`)
  H.dispose()
})
