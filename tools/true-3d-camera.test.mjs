// viewer.true-3d-camera (engine backlog; engine DECISIONS.md 2026-09-30 "a true 3D battle: an orbit camera, every
// Orphanage unit its own model, no flash of another map"). Andrew: "When I maneuver the map, it stretches the 3D
// assets." · "The battle screen is sort of 2D, but if I rotate it one direction, it just stretches" — answered "True 3D
// orbit" · "A different map loads for a blink of an eye, and then this map. That other map should not be loading."
// Expect: "the board turns a full circle and tilts with the 3D scene and the bodies keeping their proportions at every
// angle (no stretch); a hex clicked at any angle is the hex under the pointer; the ground marks, the arrow and the bars
// stay on their hexes and units while turning; no other map appears before the Orphanage's scene."
// The component's half: ONE real perspective camera (V.camera3d) — rigid, a true lens — that the 3D scene is drawn with
// and the board's stage is drawn through; the standees undo the board's south squeeze, so nothing stretches from any
// side or at any zoom; the pointer's ray picks the hex or the body under it at any angle; and until the battle's own
// 3D scene is ready nothing of the board shows (no WebGL 2: said plainly, never a flat board). Runs against the page
// (VIEWER_PAGE, else BATTLE-VIEWER.html) and the page's own Three modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packPaintedScenes } from './painted-scenes.mjs'
const A = await modules(), fields = JSON.parse(readFileSync('generated/fields.json'))
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`)
const DEG = Math.PI / 180

function boot(opts = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true }, onHexClick: h => { seen.push({ targeted: h }); return true }, ...opts })
  v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  return { w, v, V: v._V, seen, html }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const M3 = t => { const m = /^matrix3d\(([^)]+)\)$/.exec(t); assert.ok(m, 'the stage is drawn through a 3D matrix: ' + t); return new THREE.Matrix4().fromArray(m[1].split(',').map(Number)) }
/** a board point (px, z up) as the STAGE draws it, in the wrap's px (the stage sits centred in the wrap, its matrix about its corner) */
function stageDraws(V, x, y, z) {
  const M = M3(V.dom.stage.style.transform), q = new THREE.Vector4(x, y, z, 1).applyMatrix4(M), F = V.data.F
  return { x: q.x / q.w + 1920 / 2 - F.w / 2, y: q.y / q.w + 1080 / 2 - F.h / 2 }
}
/** a scene point (metres) as THE CAMERA shows it, in the wrap's px */
function cameraShows(cam, p) { const n = p.clone().project(cam); return { x: (n.x + 1) / 2 * 1920, y: (1 - n.y) / 2 * 1080 } }
const toWorld = V => V.data.boardAffine.clone().invert()
const POSES = [[0, 0, 1], [30, 0, 1], [90, -20, 1.4], [180, 15, .6], [-120, 25, 2.2], [45, -39, .4]]   // turn, tilt step, zoom factor

test('one real perspective camera: rigid, a true lens, and the board is drawn through it at every angle', () => {
  const { v, V } = boot()
  assert.equal(V.data.atlas.kind, 'painted', 'the Orphanage battle stands on its 3D scene')
  for (const [yaw, tilt, zoom] of POSES) {
    v.resetView(); v.turn(yaw); v.tilt(tilt); v.zoom(zoom)
    const cam = V.camera3d
    assert.ok(cam && cam.isPerspectiveCamera, 'the camera is a THREE perspective camera')
    /* rigid: its rotation is orthonormal, its frustum symmetric — the scene is seen, not sheared */
    const r = new THREE.Matrix3().setFromMatrix4(cam.matrixWorldInverse), e = r.elements
    near(r.determinant(), 1, 1e-9, 'a rotation')
    for (let i = 0; i < 3; i++) near(Math.hypot(e[i * 3], e[i * 3 + 1], e[i * 3 + 2]), 1, 1e-9, 'unit axis')
    near(cam.projectionMatrix.elements[8], 0, 1e-12, 'symmetric lens'); near(cam.projectionMatrix.elements[9], 0, 1e-12, 'symmetric lens')
    /* the turn, the tilt and the zoom are the camera's own: tilt from straight down, the board turned about its focus */
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)
    near(Math.acos(-look.y) / DEG, V.view.cam.tilt ?? V.data.LAYOUT.tilt, 1e-6, 'the tilt is the camera\'s angle from straight down')
    /* everything drawn on the board follows that camera: hex centres at three heights, the stage's draw = the camera's */
    for (const h of [0, 57, 141, 199, 260]) for (const z of [0, 40, 150]) {
      const p = V.data.POS[h], s = stageDraws(V, p.px, p.py, z), c = cameraShows(cam, new THREE.Vector3(p.px, p.py, z).applyMatrix4(toWorld(V)))
      near(s.x, c.x, 1e-4, `hex ${h} x at ${yaw}°`); near(s.y, c.y, 1e-4, `hex ${h} y at ${yaw}°`)
    }
  }
  v.dispose()
})

test('nothing stretches: from every side and at every zoom a body and a standee keep their proportions', () => {
  const { v, V } = boot(), Aff = V.data.boardAffine, inv = toWorld(V)
  const e = Aff.elements, east = Math.hypot(e[0], e[1], e[2]), south = Math.hypot(e[8], e[9], e[10])
  near(+V.dom.stage.style.getPropertyValue('--aniso'), south / east, 1e-9, 'the standees undo the board\'s south squeeze')
  assert.ok(south / east < .95, 'the Orphanage\'s board px are shorter south than east — the squeeze is there to undo')
  const lengths = (cam, at) => { const o = cameraShows(cam, at), d = v3 => { const q = cameraShows(cam, at.clone().add(v3)); return Math.hypot(q.x - o.x, q.y - o.y) }
    return { east: d(new THREE.Vector3(.5, 0, 0)), south: d(new THREE.Vector3(0, 0, .5)), up: d(new THREE.Vector3(0, .5, 0)) } }
  /* near straight down (10°), a metre east seen at turn 0 is a metre south seen at turn 90 — on screen, the same length */
  v.resetView(); v.tilt(10 - 49.3)
  const focus = () => V.camera3d.userData.focus.clone()
  const a = lengths(V.camera3d, focus()); v.turn(90); const b = lengths(V.camera3d, focus())
  near(a.east / b.south, 1, .01, 'east at 0° against south at 90°'); near(a.south / b.east, 1, .01, 'south at 0° against east at 90°')
  /* the zoom brings the camera nearer: height grows with the ground, never alone */
  v.resetView(); const z1 = lengths(V.camera3d, focus()); v.zoom(2.2); const z2 = lengths(V.camera3d, focus())
  near(z2.up / z2.east, z1.up / z1.east, .01, 'up against east, at 1x and 2.2x')
  /* a standee drawn on the stage (the billboard: scale3d(1, --aniso, 1) rotateZ(--unspin) rotateX(--anti)) is square in
     the world from every side: its across and its up are equal and at right angles */
  for (const [yaw, tilt] of [[0, 0], [90, 0], [37, -25], [-150, 20]]) {
    v.resetView(); v.turn(yaw); v.tilt(tilt)
    const st = V.dom.stage.style, unspin = parseFloat(st.getPropertyValue('--unspin')) * DEG, anti = parseFloat(st.getPropertyValue('--anti')) * DEG
    const bb = new THREE.Matrix4().makeScale(1, +st.getPropertyValue('--aniso'), 1).multiply(new THREE.Matrix4().makeRotationZ(unspin)).multiply(new THREE.Matrix4().makeRotationX(anti))
    const lin = inv.clone().setPosition(0, 0, 0)
    const across = new THREE.Vector3(100, 0, 0).applyMatrix4(bb).applyMatrix4(lin), up = new THREE.Vector3(0, -100, 0).applyMatrix4(bb).applyMatrix4(lin)
    near(across.length() / up.length(), 1, 1e-9, `the standee\'s across against its up at ${yaw}°`); near(across.dot(up), 0, 1e-9, 'at right angles')
    /* and it faces the camera: its up is the camera's up, its across the camera's right */
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(V.camera3d.quaternion), camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(V.camera3d.quaternion)
    near(up.clone().normalize().dot(camUp), 1, 1e-9, 'faces the camera (up)'); near(across.clone().normalize().dot(camRight), 1, 1e-9, 'faces the camera (across)')
  }
  v.dispose()
})

test('the board turns a full circle; the reset (a call — there is no button) returns the starting angled view', () => {
  const { v, V } = boot(), stage = V.dom.stage, start = stage.style.transform, cam = V.camera3d.position.clone()
  const seen = new Set()
  for (let i = 0; i < 12; i++) { v.turn(30); seen.add(Math.round(Math.atan2(V.camera3d.position.x - V.camera3d.userData.focus.x, V.camera3d.position.z - V.camera3d.userData.focus.z) / DEG)) }
  assert.equal(seen.size, 12, 'twelve turns, twelve sides of the board')
  assert.equal(V.view.cam.yaw, 0, 'round to the start'); assert.equal(stage.style.transform, start)
  v.turn(77); v.tilt(18); v.zoom(1.9); v.pan(140, -60)
  assert.notEqual(stage.style.transform, start)
  v.resetView()   // Law 10 (viewer.xcom-camera): was a click on #camReset — the ruling's "no Reset needed" took the button
  assert.equal(stage.style.transform, start, 'Reset returns exactly the starting view')
  near(V.camera3d.position.distanceTo(cam), 0, 1e-9, 'the camera where it started')
  v.dispose()
})

test('a click or a point at any angle lands on the hex or the unit under the pointer — the camera\'s ray against the board', () => {
  const { v, V, seen } = boot(), wrap = V.dom.stage.parentNode
  V.data.displayHeights = A.paintedHeights(V.data.atlas); v.render()   /* the scene's own hex heights, as when it is ready */
  const me = V.S.U[0]
  v.setPlay({ actor: 0, slot: null, reach: [me.hex + 1], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
  for (const n of V.dom.stage.querySelectorAll('.playHex')) assert.equal(n.style.pointerEvents, 'none', 'the browser\'s flat hit-test is not what decides')
  const client = q => ({ clientX: q.x * 100 / 1920, clientY: q.y * 100 / 1080 })   /* the fake wrap's box is 100 px square, its layout 1920 by 1080 */
  const inv = toWorld(V)
  let hexes = 0, units = 0
  for (const [yaw, tilt, zoom] of POSES) {
    v.resetView(); v.turn(yaw); v.tilt(tilt); v.zoom(zoom); seen.length = 0
    const cam = V.camera3d, shown = (x, y, z) => cameraShows(cam, new THREE.Vector3(x, y, z).applyMatrix4(inv))
    /* each standing unit's figure as the camera shows it: feet to head, a figure's width either side (again after each
       click on a body: the clicked unit becomes the subject, and the camera brings it in) */
    const figures = () => Object.values(V.S.U).filter(u => u.life !== 'dead').map(u => {
      const E = V.layers.UEL.get(u.id), f = { x: V.data.POS[u.hex].px, y: V.data.POS[u.hex].py + V.data.LAYOUT.H * .28 }, z = V.data.displayHeights[u.hex]
      const hpx = parseFloat(E.img.style.height), wpx = parseFloat(E.img.style.width)
      /* the figure's whole room: a figure's width every way around its feet and its head */
      const room = [0, hpx].flatMap(dz => [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([i, j]) => shown(f.x + i * wpx, f.y + j * wpx, z + dz)))
      return { u, mid: shown(f.x, f.y, z + hpx / 2), box: [Math.min(...room.map(q => q.x)), Math.max(...room.map(q => q.x)), Math.min(...room.map(q => q.y)), Math.max(...room.map(q => q.y))] }
    })
    let bodies = figures()
    const inBox = (q, B) => q.x >= B[0] && q.x <= B[1] && q.y >= B[2] && q.y <= B[3]
    for (const [key, p] of Object.entries(V.data.POS)) {
      const h = +key, q = shown(p.px, p.py, V.data.displayHeights[h])
      if (q.x < 40 || q.y < 40 || q.x > 1880 || q.y > 1040 || bodies.some(b => inBox(q, b.box))) continue
      fire(wrap, 'pointermove', { ...client(q), target: wrap }); fire(wrap, 'click', { ...client(q), target: wrap })
      assert.deepEqual(seen.splice(0).at(-1), { kind: 'hex', hex: h }, `hex ${h} under the pointer at ${yaw}°, tilt step ${tilt}, ${zoom}x`)
      hexes++
    }
    for (const id of bodies.map(b => b.u.id)) {
      bodies = figures(); const b = bodies.find(o => o.u.id === id)
      if (b.mid.x < 40 || b.mid.y < 40 || b.mid.x > 1880 || b.mid.y > 1040 || bodies.some(o => o !== b && inBox(b.mid, o.box))) continue
      fire(wrap, 'pointermove', { ...client(b.mid), target: wrap })
      assert.deepEqual(seen.splice(0).at(-1), { kind: 'point', hex: b.u.hex }, `pointing at ${b.u.name}'s body points at its hex at ${yaw}°, tilt step ${tilt}, ${zoom}x`)
      fire(wrap, 'click', { ...client(b.mid), target: wrap })
      assert.deepEqual(seen.splice(0).at(-1), { kind: 'unit', id: b.u.id, hex: b.u.hex }, `${b.u.name}'s body under the pointer at ${yaw}°`)
      units++
    }
  }
  assert.ok(hexes > 300 && units >= 6, `enough to bite: ${hexes} hexes, ${units} bodies`)
  /* a legal target hex goes to the targeting host first, at any angle */
  v.setPlay(null); v.resetView(); v.turn(150)
  const target = me.hex + 1, q = cameraShows(V.camera3d, new THREE.Vector3(V.data.POS[target].px, V.data.POS[target].py, V.data.displayHeights[target]).applyMatrix4(inv))
  v.setTargeting({ hexes: [], centre: null, legalHexes: [target], shielded: [] }); seen.length = 0
  fire(wrap, 'click', { ...client(q), target: wrap }); assert.deepEqual(seen, [{ targeted: target }])
  /* a click that ends a drag is not a click */
  seen.length = 0; fire(wrap, 'pointerdown', { button: 0, ...client(q) }); fire(wrap, 'pointermove', { clientX: client(q).clientX + 10, clientY: client(q).clientY }); fire(wrap, 'click', { ...client(q), target: wrap }); fire(wrap, 'pointerup', {})
  assert.deepEqual(seen, [])
  v.dispose()
})

test('until the battle\'s own 3D scene is ready nothing of the board shows; no WebGL 2 is said plainly, never a flat board', async () => {
  const css = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1]
  for (const s of ['loading', 'failed']) assert.match(css, new RegExp(`\\.terrain3d-${s} #stage[^{]*\\{[^}]*visibility:hidden`), `the board is hidden while ${s}`)
  /* a scene still loading: the board hidden, a loading line — then its scene, and only then the board */
  let release; const ready = new Promise(r => release = r)
  const { v, V } = boot({ terrainDriver: () => ({ ready, dispose() {} }) }), wrap = V.dom.stage.parentNode
  assert.ok(wrap.classList.contains('terrain3d-loading'), 'loading'); assert.ok(!wrap.classList.contains('terrain3d-ready'))
  assert.match(wrap.querySelector('#terrainLoading').textContent, /Loading the battle.s 3D map/)
  assert.equal(V.data.displayHeights, null)
  release(); await ready; await Promise.resolve(); await Promise.resolve()
  assert.ok(wrap.classList.contains('terrain3d-ready') && !wrap.classList.contains('terrain3d-loading'), 'ready: the board shows')
  assert.equal(wrap.querySelector('#terrainLoading'), null, 'the loading line goes')
  assert.deepEqual(V.data.displayHeights, A.paintedHeights(V.data.atlas), 'on its scene\'s heights')
  v.dispose()
  /* no WebGL 2 (this headless page has none): said plainly; the board stays hidden — no flat swatch board instead */
  const b = boot(), wb = b.V.dom.stage.parentNode
  assert.ok(wb.classList.contains('terrain3d-failed') && !wb.classList.contains('terrain3d-ready'))
  assert.match(wb.querySelector('#terrainLoading').textContent, /no WebGL 2/)
  assert.match(wb.querySelector('#terrainStatus').textContent, /3D map unavailable/)
  b.v.dispose()
})

test('the 3D scene is drawn with the board\'s own camera, and again whenever it moves', async () => {
  const pack = packPaintedScenes(fields), field = fields['map.opening.orphanage'], b = A.paintedBinding('map.opening.orphanage', field, pack)
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'); wrap.appendChild(stage)
  const stats = { draws: 0 }; class Renderer { constructor() { this.shadowMap = {} } setPixelRatio() {} setSize() {} render(scene, camera) { stats.draws++; stats.camera = camera } dispose() {} forceContextLoss() {} }
  const loaded = { group: new THREE.Group(), dispose() {} }, affine = A.paintedToCSS(b)
  const V = { dom: { stage }, data: { F: field, atlas: b, boardAffine: affine } }
  V.camera3d = A.orbitCamera(affine, { x: field.w / 2, y: field.h / 2, yaw: 0, tilt: 49.3, zoom: 1 }, { w: 1920, h: 1080 }); V.camVersion = 1
  const driver = A.createDriver(V, e => { throw e }, { Renderer, loadPainted: async () => loaded })
  await driver.ready; assert.equal(stats.draws, 1); assert.equal(stats.camera, V.camera3d, 'THE camera, not a copy of the stage\'s CSS')
  frames.shift()(); assert.equal(stats.draws, 1, 'nothing moved, nothing drawn')
  A.orbitCamera(affine, { x: 300, y: 500, yaw: 140, tilt: 30, zoom: 1.6 }, { w: 1920, h: 1080 }, V.camera3d); V.camVersion++
  frames.shift()(); assert.equal(stats.draws, 2, 'the camera moved: drawn again'); assert.equal(stats.camera, V.camera3d)
  driver.dispose()
})

/* ── viewer.tactical-camera (2026-10-01): Andrew accepted the caravan preview's camera ("Okay, that works well. How do we add
   this to our game visualization?") and then: "This is a redesign of our camera … We need to redesign the camera."
   ATLAS-COMBAT-INTEGRATION.md "Caravan camera and surroundings: implementation handoff — 2026-10-01" is the policy:
   40° above the ground to start, 40–75° tactically, Lower/Raise by 10°, Q/E and the turn buttons by 60°, Overhead and
   Inspect each restoring what came before, a drag from Overhead unlocking the tilt past 5 px (a click not), the
   whole-map fit of the original board as the farthest zoom, and a bounded pan. ─────────────────────────────────────── */
/* Law 10 (viewer.xcom-camera, 2026-10-01): engine DECISIONS.md 2026-10-01 'the XCOM-style camera' replaces this camera: "one
   fixed angle and zoom. No tilt, no free rotation. The arrow keys rotate 90 degrees." · "no grab-drag, no Reset needed". The
   bar is gone: its named views stay the hosts' calls (v.camera), which these tests now press; what the ruling removed — the
   tilt steps, the drag that unlocks Overhead, Home's reset, the 60° turns — is asserted gone, each at its old line. */
const press = (v, kind) => v.camera(kind)
/** the camera's angle above the ground, read off the camera itself */
const elevationOf = cam => { const look = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); return 90 - Math.acos(-look.y) / DEG }
/** a board point (px, z up) as the camera shows it, in the camera's own viewport */
function shows(V, x, y, z) {
  const cam = V.camera3d, vp = cam.userData.viewport, p = new THREE.Vector3(x, y, z).applyMatrix4(toWorld(V))
  const c = p.clone().applyMatrix4(cam.matrixWorldInverse), n = p.project(cam)
  return { x: (n.x + 1) / 2 * vp.w, y: (1 - n.y) / 2 * vp.h, ahead: c.z < 0 }
}
const sized = (V, w, h) => { const wrap = V.dom.stage.parentNode; Object.defineProperty(wrap, 'clientWidth', { get: () => w, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { get: () => h, configurable: true }); V.render() }

test('the camera holds one angle, 40° above the ground: no bar on the board, and no call or drag tilts it', () => {
  const { v, V } = boot(), wrap = V.dom.stage.parentNode
  assert.equal(V.dom.root.querySelector('#camBar'), null, 'no camera bar on the board')
  near(elevationOf(V.camera3d), 40, 1e-6, 'the start')
  assert.equal(v.cameraState.stance, 'tactical'); near(v.cameraState.elevation, 40, 1e-9, 'the state says so')
  for (const k of ['raise', 'raise', 'lower', 'lower', 'lower']) { press(v, k); near(elevationOf(V.camera3d), 40, 1e-6, `${k}: still 40°`) }
  v.tilt(-25); near(elevationOf(V.camera3d), 40, 1e-6, 'a tilt by call: still 40°')
  fire(wrap, 'pointerdown', { button: 0, clientX: 50, clientY: 50 }); fire(wrap, 'pointermove', { clientX: 50, clientY: 0 }); fire(wrap, 'pointermove', { clientX: 50, clientY: -2000 }); fire(wrap, 'pointerup', {})
  near(elevationOf(V.camera3d), 40, 1e-6, 'a drag up: still 40°')
  fire(wrap, 'pointerdown', { button: 0, clientX: 50, clientY: 50 }); fire(wrap, 'pointermove', { clientX: 50, clientY: 60 }); fire(wrap, 'pointermove', { clientX: 50, clientY: 4000 }); fire(wrap, 'pointerup', {})
  near(elevationOf(V.camera3d), 40, 1e-6, 'a drag down: still 40°')
  press(v, 'angled'); near(elevationOf(V.camera3d), 40, 1e-6, 'Angled view: 40°')
  v.dispose()
})

test('Overhead, by a host call, toggles and restores the view before it exactly; no drag leaves it', () => {
  const { v, V } = boot(), wrap = V.dom.stage.parentNode
  v.turn(77); v.zoom(1.4); v.pan(90, -40)
  const before = V.dom.stage.style.transform, pose = { ...V.view.cam }
  press(v, 'overhead')
  assert.equal(v.cameraState.stance, 'overhead'); assert.equal(v.cameraState.overhead, true)
  near(elevationOf(V.camera3d), 90, 1e-6, 'straight down')
  press(v, 'overhead')
  assert.equal(V.dom.stage.style.transform, before, 'called again: exactly the view before it'); assert.deepEqual(V.view.cam, pose)
  assert.equal(v.cameraState.overhead, false)
  press(v, 'overhead')
  fire(wrap, 'pointerdown', { button: 0, clientX: 50, clientY: 50 }); fire(wrap, 'pointermove', { clientX: 50, clientY: 62 }); fire(wrap, 'pointerup', {})
  assert.equal(v.cameraState.stance, 'overhead', 'a drag moves no camera: still Overhead (it unlocked the tilt before 2026-10-01)')
  v.dispose()
})

test('Inspect is broader exploration — steeper, flatter, farther than tactical — and restores the tactical pose', () => {
  const { v, V } = boot()
  v.zoom(.01); const far = V.camTarget.zoom                                         /* the tactical whole-map fit */
  v.resetView(); v.turn(-60); v.zoom(1.3); v.pan(-120, 70)
  const before = V.dom.stage.style.transform
  press(v, 'inspect'); assert.equal(v.cameraState.stance, 'inspect'); assert.equal(v.cameraState.inspect, true)
  v.tilt(-200); near(elevationOf(V.camera3d), 89, 1e-6, 'Inspect looks down to 89°')
  v.tilt(200); near(elevationOf(V.camera3d), 3, 1e-6, 'and along the ground to 3°')
  v.tilt(-37); v.zoom(.01); assert.ok(V.camTarget.zoom < far * .99, 'and pulls back past the tactical whole-map fit')
  press(v, 'inspect')
  assert.equal(V.dom.stage.style.transform, before, 'switched off: exactly the tactical pose before it')
  assert.equal(v.cameraState.stance, 'tactical')
  v.dispose()
})

test('Whole map fits the original board — every hex and a standing figure on it — at portrait and wide viewports, six turns and the one angle; nothing zooms out past it', () => {
  const { v, V } = boot(), F = V.data.F
  const corners = []
  for (const [key, p] of Object.entries(V.data.POS)) { const h = +key
    if ((h % F.width) % 7 && Math.floor(h / F.width) % 5 && h % F.width !== F.width - 1 && Math.floor(h / F.width) !== F.height - 1) continue   // the edges and a lattice inside
    for (const [dx, dy] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) for (const z of [0, 200]) corners.push([p.px + dx * V.data.LAYOUT.W, p.py + dy * V.data.LAYOUT.H, z]) }
  let checked = 0
  for (const [w, h] of [[1920, 1080], [900, 1600], [2560, 900]]) {
    sized(V, w, h)
    /* the one angle (40°: the ruling's "one fixed angle"; was 40, 55 and 75 within 40–75°), the quarter turns and the old 60°s */
    for (const yaw of [0, 60, 90, 180, -90, -60]) for (const elev of [40]) {
      v.resetView(); press(v, 'whole'); v.turn(yaw); v.tilt((90 - elev) - V.view.cam.tilt); press(v, 'whole')
      /* Whole map is the preview's: unturned, 55°; the fit itself is checked at every turn and angle through the peek */
      v.turn(yaw); v.tilt((90 - elev) - V.view.cam.tilt); v.peek(true)
      for (const [x, y, z] of corners) { const q = shows(V, x, y, z)
        assert.ok(q.ahead && q.x >= -.5 && q.x <= w + .5 && q.y >= -.5 && q.y <= h + .5, `${w}x${h} at ${yaw}°, ${elev}°: (${x},${y},${z}) shown at ${q.x.toFixed(1)},${q.y.toFixed(1)}`); checked++ }
      const fitZoom = V.camTarget.zoom; v.peek(false)
      v.zoom(.001); near(V.camTarget.zoom, fitZoom, 1e-9 * fitZoom, `the wheel stops at the fit (${w}x${h}, ${yaw}°, ${elev}°)`)
    }
  }
  assert.ok(checked > 6000, `enough corners to bite: ${checked}`)   // a third of the angles: was 20000
  v.dispose()
})

test('the pan is bounded by the board: pinned at the whole-map fit, roaming it when nearer, never off it', () => {
  const { v, V } = boot(), F = V.data.F
  press(v, 'whole'); const at = { x: V.camTarget.x, y: V.camTarget.y }
  v.pan(5000, 5000); assert.deepEqual({ x: V.camTarget.x, y: V.camTarget.y }, at, 'at the fit the board is pinned in the middle')
  v.zoom(100)
  /* this board has no decorative surroundings: unturned, the view's own edge stops at the board's (SWITCHES cameraPanNoVoid) */
  const halfW = 1920 / 2 / V.camTarget.zoom
  v.pan(-1e5, -1e5); near(V.camTarget.x, halfW, 1e-6, 'near, the view comes to the left edge and no further')
  v.pan(1e5, 1e5); near(V.camTarget.x, F.w - halfW, 1e-6, 'and to the right edge, never past it'); assert.ok(V.camTarget.y <= F.h, 'nor past the bottom')
  /* turned, the preview's bound alone: the view's centre roams to the board's edge, never past it */
  v.turn(60); v.pan(-1e5, 0); const left = V.camTarget.x; v.pan(1e5, 0); const right = V.camTarget.x
  assert.ok(left >= -1e-6 && left < halfW && right <= F.w + 1e-6 && right > F.w - halfW, `turned: ${left} .. ${right}`)
  v.dispose()
})

test('Focus selected unit centres on purpose; ordinary selection keeps the minimal inclusion and never recentres', () => {
  const { v, V } = boot()
  v.pan(-320, -160)                                                                   /* the subject now stands off the middle */
  const ids = Object.values(V.S.U).filter(u => u.life !== 'dead').map(u => u.id)
  const pick = ids.find(id => { const p = V.data.POS[V.S.U[id].hex], q = shows(V, p.px, p.py, 0); return q.ahead && q.x > 120 && q.x < 1800 && q.y > 200 && q.y < 980 && Math.hypot(q.x - 960, q.y - 540) > 120 })
  assert.ok(pick != null, 'a unit in view, off the middle: ' + JSON.stringify(ids.map(id => { const p = V.data.POS[V.S.U[id].hex], q = shows(V, p.px, p.py, 0); return [id, Math.round(q.x), Math.round(q.y), q.ahead] })))
  const f0 = { ...V.view.camF }
  V.view.inspectId = pick; v.render()
  assert.deepEqual(V.view.camF, f0, 'selecting a unit already in view does not move the camera')
  assert.equal(v.cameraState.focus, pick, 'Focus is offered with a unit to focus')
  press(v, 'focus')
  const p = V.data.POS[V.S.U[pick].hex]; near(V.camTarget.x, p.px, 1e-6, 'Focus centres it (x)'); near(V.camTarget.y, p.py, 1e-6, 'and (y)')
  v.dispose()
})

test('the arrow keys, and Q and E, turn by 90°; Home resets nothing — for the board under the pointer only: two boards on one page never both turn; dispose lets go of the keys', () => {
  const one = boot(), w = one.w, B = w.__battleView, L = B.lib
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const two = B.mount(host, data, { autoplay: false }); two.push(battle1.events)
  const key = k => w.document.dispatch('keydown', { key: k, target: w.document.body, preventDefault() {} })
  fire(one.V.dom.stage.parentNode, 'pointerenter')
  key('e'); assert.equal(one.V.view.cam.yaw, 90, 'E: 90° round'); assert.equal(two._V.view.cam.yaw, 0, 'the other board does not turn')
  key('q'); key('q'); assert.equal(one.V.view.cam.yaw, -90, 'Q: 90° back')
  key('ArrowRight'); assert.equal(one.V.view.cam.yaw, 0, 'the right arrow: 90°'); key('ArrowLeft'); assert.equal(one.V.view.cam.yaw, -90, 'the left arrow: 90° back')
  press(one.v, 'right'); assert.equal(one.V.view.cam.yaw, 0, 'the call: 90°')
  const camF = { ...one.V.view.camF }; key('ArrowUp'); key('ArrowDown'); assert.deepEqual(one.V.view.camF, camF, 'up and down move nothing (no pan keys)')
  one.v.turn(30); key('Home'); assert.equal(one.V.view.cam.yaw, 30, 'Home resets nothing: no Reset')
  fire(one.V.dom.stage.parentNode, 'pointerleave'); key('e'); assert.equal(one.V.view.cam.yaw, 30, 'the pointer gone: no keys')
  two.dispose(); one.v.dispose()
  key('e'); assert.equal(one.V.view.cam.yaw, 30, 'disposed: the keys are let go')
})

test('a bubble is for a unit none of whose figure is in view — never one standing in view near an edge', () => {
  const { v, V } = boot()
  let inView = 0, outOfView = 0
  for (const [yaw, z] of [[0, 1], [0, 2.2], [60, 1.8], [180, 1.2], [-120, 2.5]]) {
    v.resetView(); v.turn(yaw); v.zoom(z)
    const named = new Set(V.layers.edgeL.querySelectorAll('.edgeBub').flatMap(b => (b.getAttribute('title') || '').split(', ')))
    const count = {}; for (const u of Object.values(V.S.U)) if (u.life !== 'dead') count[u.name] = (count[u.name] || 0) + 1
    for (const u of Object.values(V.S.U)) { if (u.life === 'dead' || count[u.name] > 1) continue   /* a bubble names units, not ids */
      const p = V.data.POS[u.hex], zz = V.data.displayHeights?.[u.hex] || 0, E = V.layers.UEL.get(u.id), tall = (E && E.pick && E.pick.h) || 200
      const feet = shows(V, p.px, p.py, zz), head = shows(V, p.px, p.py, zz + tall), mid = { x: (feet.x + head.x) / 2, y: (feet.y + head.y) / 2 }
      const pts = [feet, mid, head], slack = 24 * V.camTarget.zoom                 /* half a token's width (board.js EDGE_TOKEN) */
      const seen = feet.ahead && pts.some(q => q.x >= 0 && q.x <= 1920 && q.y >= 0 && q.y <= 1080)
      const gone = !feet.ahead || pts.every(q => q.x < -slack || q.x > 1920 + slack) || pts.every(q => q.y < 0) || pts.every(q => q.y > 1080)
      if (seen) { assert.ok(!named.has(u.name), `${u.name} stands in view at ${yaw}°, ${z}x — no bubble`); inView++ }
      else if (gone) { assert.ok(named.has(u.name), `${u.name} is out of view at ${yaw}°, ${z}x — its bubble`); outOfView++ }
    }
  }
  assert.ok(inView > 4 && outOfView > 4, `enough to bite: ${inView} in view, ${outOfView} out`)
  v.dispose()
})
