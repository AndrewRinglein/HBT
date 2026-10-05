// viewer.painted-board (engine backlog; PLAYABLE-OPENING-PLAN.md item 4; engine DECISIONS.md 2026-09-29
// "the playable battle screen"): battle 1 opens on its painted scene with its hexes where the engine's
// are; the camera turns, tilts, zooms and pans, and Reset returns the starting angled view.
// Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and the page's own Three modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packPaintedScenes, SCENES } from './painted-scenes.mjs'
const A = await modules(), fields = JSON.parse(readFileSync('generated/fields.json'))
const nav = scene => JSON.parse(readFileSync('../assets/terrain-3d/' + scene + '/navigation.json'))
const close = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} != ${b}`)

function boot(hash) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  if (hash) Object.defineProperty(globalThis, 'location', { value: { hash, protocol: 'file:', href: 'file:///BATTLE-VIEWER.html' + hash }, configurable: true })
  try { new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n])) }
  finally { if (hash) { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location } }
  return w
}
const fire = (node, type, extra = {}) => { let prevented = 0; for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() { prevented++ }, ...extra }); return prevented }

test('battle 1 opens on the riverside painted scene: the address names the map, the board binds its scene', () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, V = H.viewer._V
  assert.equal(V.data.F.width, 20); assert.equal(H.viewer.events.find(e => e.type === 'map.loaded').mapId, 'map.opening.orphanage')
  assert.equal(V.data.atlas && V.data.atlas.kind, 'painted', 'the Orphanage battle is drawn on a painted scene')
  assert.equal(V.data.atlas.scene, 'orphanage-riverside')
  /* Law 10 (viewer.xcom-camera, 2026-10-01): was "the board carries a Reset button". Andrew (engine DECISIONS.md 2026-10-01
     'the XCOM-style camera'): "no Reset needed", "A character portrait in the lower-left corner" — the board carries no
     camera bar, and the portrait in its place */
  assert.equal(V.dom.root.querySelector('#camReset'), null, 'no camera bar: no Reset button')
  assert.ok(V.dom.root.querySelector('#unitPortrait'), 'the portrait in the lower-left corner')
  /* its hero was built with two unit.modified lines (the opening's first hero, the crucible roll): folded as stated */
  const mods = H.viewer.events.filter(e => e.type === 'unit.modified'), hero = V.S.U[mods[0].actor]
  assert.equal(hero.maxHp, mods.at(-1).maxHp); assert.equal(hero.hp, mods.at(-1).hp)
  assert.ok(hero.mods.some(m => m.stat === 'accuracy' && m.source === 'rule.crucible-roll' && m.fielded), 'a built-with stat is a fielded mod')
  H.dispose()
})

test('every engine hex of every painted map is drawn where its scene hex stands', () => {
  const w = boot(), B = w.__battleView, pack = packPaintedScenes(fields)
  /* Law 10, viewer.caravan-scene (2026-10-01): the pack was the opening's three scenes; a map compiled from a painted scene's
     measured navigation (content/gen/painted-maps.json — the caravan aftermath, engine DECISIONS.md 2026-10-01) is bound
     too. Rewritten as the rule — every bound map, hex by hex — with the opening's three still required by name.
     was: assert.deepEqual(Object.keys(pack).sort(), Object.keys(SCENES).sort()); for (... of Object.entries(SCENES)) */
  const compiled = JSON.parse(readFileSync('../content/gen/painted-maps.json', 'utf8'))
  assert.deepEqual(Object.keys(pack).sort(), [...Object.keys(SCENES), ...compiled.maps.map(m => m.id)].sort())
  for (const [mapId, { scene }] of [...Object.entries(SCENES), ...Object.entries(compiled.scenes)]) {
    const field = B.lib.fields[mapId], b = A.paintedBinding(mapId, field, pack), world = A.paintedToCSS(b), heights = A.paintedHeights(b), n = nav(scene)
    assert.equal(b.scene, scene)
    for (const p of field.hexes) {
      const cell = n.cells[p.r * field.width + p.c]
      assert.deepEqual([cell.col, cell.row], [p.c, p.r])
      /* the renderer's own matrix: the scene hex's centre lands on the engine hex, its ground at the display height */
      const q = new THREE.Vector3(cell.center[0], cell.stand[1], cell.center[2]).applyMatrix4(world)
      close(q.x, p.px, `${mapId} (${p.c},${p.r}) x`); close(q.y, p.py, `${mapId} (${p.c},${p.r}) y`); close(q.z, heights[p.r * field.width + p.c], `${mapId} height`)
    }
    /* Law 1: a board of another size is refused, never stretched */
    assert.throws(() => A.paintedBinding(mapId, { ...field, width: field.width + 1 }, pack), /engine board/)
  }
  assert.equal(A.paintedBinding('map.open', B.lib.fields['map.open'], pack), null, 'a map with no painted scene keeps its board')
})

/* viewer.true-3d-camera (engine DECISIONS.md 2026-09-30 "a true 3D battle: an orbit camera"): the scene is drawn with the board's own
   camera — it was the stage's CSS transform copied through clipMatrix (the copy that stretched it); rewritten as that rule */
test('the painted driver loads only the measured scene, lights it as reviewed, and follows the board camera', async () => {
  const pack = packPaintedScenes(fields), b = A.paintedBinding('map.opening.orphanage', fields['map.opening.orphanage'], pack)
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
  assert.equal(A.paintedSceneURL(b, location), 'http://127.0.0.1:4230/assets/terrain-3d/orphanage-riverside/scene.glb')
  const bytes = new ArrayBuffer(4), digestOf = hex => async () => Uint8Array.from(hex.match(/../g), h => parseInt(h, 16)).buffer
  const fetch = async url => ({ ok: true, arrayBuffer: async () => { fetch.url = url; return bytes } })
  let parsed = 0; const parse = async () => { parsed++; const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()); m.name = 'Ground_0'; const scene = new THREE.Group(); scene.add(m); return { scene } }
  await assert.rejects(A.loadPaintedScene(b, { location, fetch, digest: digestOf('00'.repeat(32)), parse }), /measured on/)
  assert.equal(parsed, 0, 'a scene that is not the measured one is never parsed')
  const loaded = await A.loadPaintedScene(b, { location, fetch, digest: digestOf(b.sceneSha256), parse })
  assert.equal(fetch.url, A.paintedSceneURL(b, location)); let ground; loaded.group.traverse(o => { if (o.name === 'Ground_0') ground = o }); assert.equal(ground.castShadow, false); assert.equal(ground.receiveShadow, true)
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'); wrap.appendChild(stage)
  const stats = { draws: 0 }; class Renderer { constructor() { this.shadowMap = {} } setPixelRatio() {} setSize() {} render(scene, camera) { stats.draws++; stats.scene = scene; stats.camera = camera } dispose() {} forceContextLoss() {} }
  const field = fields['map.opening.orphanage']
  const V = { dom: { stage }, data: { F: field, atlas: b, boardAffine: A.paintedToCSS(b) } }
  V.camera3d = A.orbitCamera(V.data.boardAffine, { x: field.w / 2, y: field.h / 2, yaw: 0, tilt: 49.3, zoom: 1 }, { w: wrap.clientWidth, h: wrap.clientHeight }); V.camVersion = 1
  const driver = A.createDriver(V, e => { throw e }, { Renderer, loadPainted: async () => loaded })
  await driver.ready; assert.equal(stats.draws, 1)
  assert.equal(stats.camera, V.camera3d, 'the board\'s own camera')
  const lights = []; stats.scene.traverse(o => { if (o.isLight) lights.push(o.type) }); assert.deepEqual(lights.sort(), ['DirectionalLight', 'HemisphereLight'])
  driver.dispose()
})

/* Law 10 (viewer.xcom-camera, 2026-10-01): was "the camera turns, tilts, zooms and pans by drag, wheel and call, and Reset returns
   the starting angled view". Andrew (engine DECISIONS.md 2026-10-01 'the XCOM-style camera'): "one fixed angle and zoom. No
   tilt, no free rotation. The arrow keys rotate 90 degrees." · "no grab-drag" · "The mouse wheel zooms a limited amount and
   snaps back". The turn, the zoom, the pan and the reset by call are kept (the hosts' and the tests' API); the tilt stays at
   the fixed angle; no drag moves the camera; the wheel looks nearer (its spring back: tools/xcom-camera.test.mjs — until
   2026-10-05, when the zoom stays where it is left: tools/zoom-stays.test.mjs) */
/* LAW 10 — 2026-10-05, viewer.map-drag-and-keys (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … the map
   drags and moves on W/A/S/D' — Andrew, asked "Should the map also move by dragging it and by W/A/S/D, alongside edge scroll
   (this overturns 'no grab-drag')?": "Yes"). This test was named "… moves for no drag …" and read
     assert.deepEqual(V.view.camF, before, 'a right drag does not grab the map')
   By the ruling a drag grabs the map again and moves it: that line is turned back to assert it. What 2026-10-01 still
   rules stands as written — no drag turns or tilts the camera ("No tilt, no free rotation"). */
test('the camera turns, zooms and pans by call, holds its one angle, is moved but never turned or tilted by a drag, looks nearer by the wheel, and resets', () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, v = H.viewer, V = v._V, stage = V.dom.stage, wrap = stage.parentNode
  /* viewer.true-3d-camera (engine DECISIONS.md 2026-09-30 "a true 3D battle: an orbit camera"): the turn, the tilt and the zoom are
     the one camera's (V.camera3d), which the stage is drawn through — these read rotateX(49.3deg), rotateZ(30deg) and
     scale(1.5000) in the stage's CSS transform; rewritten as the camera's own angle from straight down, its turn about the
     board point it looks at, and its distance */
  const off = () => V.camera3d.position.clone().sub(V.camera3d.userData.focus)
  /* Law 10, viewer.tactical-camera (2026-10-01): the starting angle was the engine field's 49.3° tilt; Andrew accepted the
     caravan preview's camera, whose initial Angled view is 40° above the ground (ATLAS-COMBAT-INTEGRATION.md 2026-10-01
     handoff), so the start is tilt 50 from straight down and Reset's remembered tilt is that number, not null. The
     rules asserted — the start, a 12° step, Reset exact — are unchanged. */
  const tiltNow = () => Math.acos(off().y / off().length()) * 180 / Math.PI, yawNow = () => Math.atan2(off().x, off().z) * 180 / Math.PI
  const start = stage.style.transform, anti = stage.style.getPropertyValue('--anti'), d0 = off().length()
  assert.match(start, /^matrix3d\(/, 'the stage is drawn through the camera'); close(tiltNow(), 90 - 40, 'the starting tilt: 40 degrees above the ground'); close(yawNow(), 0, 'the starting view is not turned')
  /* Law 10 (viewer.camera-no-void, engine DECISIONS.md 2026-10-03 'the camera never shows white space'): the zoom is checked
     before the turn — turned 30°, the Orphanage's corners would show unless the camera came nearer, so there a zoom by 1.5
     reaches the figure's nearest; was: turn, tilt, then zoom. Each rule asserted is unchanged. */
  v.zoom(1.5); close(off().length(), d0 / 1.5, 'zoomed: 1.5 times nearer')
  v.turn(30); close(yawNow(), 30, 'turned 30 degrees about the focus'); assert.equal(stage.style.getPropertyValue('--unspin'), '-30deg', 'billboards undo the turn')
  v.tilt(-12); close(tiltNow(), 50, 'no tilt: the one fixed angle')
  const camF = { ...V.view.camF }; v.pan(60, 30); assert.notDeepEqual(V.view.camF, camF)
  assert.notEqual(stage.style.transform, start)
  /* the pointer: no drag turns or tilts; a drag moves the map (2026-10-05); the wheel looks nearer; the right button opens no menu */
  const cam = { ...V.view.cam }
  fire(wrap, 'pointerdown', { button: 0, clientX: 100, clientY: 100 }); fire(wrap, 'pointermove', { clientX: 140, clientY: 90 }); fire(wrap, 'pointerup')
  assert.deepEqual(V.view.cam, cam, 'a left drag neither turns nor tilts')
  const before = { ...V.view.camF }
  fire(wrap, 'pointerdown', { button: 2, clientX: 100, clientY: 100 }); fire(wrap, 'pointermove', { clientX: 150, clientY: 130 }); fire(wrap, 'pointerup')
  assert.notDeepEqual(V.view.camF, before, 'a right drag grabs the map and moves it')
  assert.deepEqual(V.view.cam, cam, 'and neither turns nor tilts')
  v.resetView(); const z = V.view.cam.zoom; assert.equal(fire(wrap, 'wheel', { deltaY: -200 }), 1); assert.ok(V.view.cam.zoom > z, 'the wheel looks nearer (from the standard zoom)')
  assert.equal(fire(wrap, 'contextmenu'), 1)
  /* the reset, by call (there is no button) */
  v.resetView()
  assert.equal(stage.style.transform, start, 'Reset returns exactly the starting view')
  assert.deepEqual(V.view.cam, { yaw: 0, tilt: 50, zoom: 1 })
  assert.equal(stage.style.getPropertyValue('--anti'), anti); assert.equal(stage.style.getPropertyValue('--unspin'), '0deg')
  H.dispose()
})
