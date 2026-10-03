// viewer.camera-no-void (engine backlog; engine DECISIONS.md 2026-10-03 'the camera never shows white space; pointing at an edge
// scrolls'). Andrew: "I've got giant amounts of white space, and I can't seem to scroll the map by pointing. There's no reason to
// ever scroll into white space." Expect: "On the Orphanage (20x14) ... at load and at every wheel step no white space shows beside
// the board inside the battle area; pointing at each of the four edges scrolls the board until its edge meets the battle area's
// edge, and no further." What the view shows of the ground is read off the page's own camera (V.camera3d): the four corners of
// the battle area (the board's wrap, 1920 x 1080 here) cast onto the board's plane, in board px. "No white space" is that
// footprint inside the board's rectangle [0, F.w] x [0, F.h]; "scrolls" is the footprint moving until one of its sides lies on
// the board's edge. Asks the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE } from './atlas-test-runtime.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'
const EV = battle1.events
const TOL = .5                                                                    /* half a board px */

function boot(opts = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  v.push(EV)
  return { w, v, V: v._V }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const firstActivation = EV.findIndex(e => e.type === 'activation.begin') + 1

/** what the battle area shows of the board's plane: its four corners' rays from the page's camera onto z 0, in board px */
function footprint(V) {
  const cam = V.camera3d, vp = cam.userData.viewport, A = V.data.boardAffine
  cam.updateMatrixWorld(true)
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity
  for (const [x, y] of [[0, 0], [vp.w, 0], [0, vp.h], [vp.w, vp.h]]) {
    const nx = 2 * x / vp.w - 1, ny = 1 - 2 * y / vp.h
    const o = new THREE.Vector3(nx, ny, -1).unproject(cam).applyMatrix4(A), e = new THREE.Vector3(nx, ny, 1).unproject(cam).applyMatrix4(A), d = e.sub(o)
    assert.ok(o.z > 0 && d.z < 0, `corner (${x}, ${y}) looks down onto the board's plane`)
    const k = -o.z / d.z, px = o.x + k * d.x, py = o.y + k * d.y
    l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py)
  }
  return { l, r, t, b }
}
function noVoid(V, what) {
  const F = V.data.F, q = footprint(V)
  assert.ok(q.l >= -TOL && q.t >= -TOL && q.r <= F.w + TOL && q.b <= F.h + TOL,
    `${what}: the battle area shows only board — it sees x ${q.l.toFixed(1)}..${q.r.toFixed(1)}, y ${q.t.toFixed(1)}..${q.b.toFixed(1)} of a ${F.w} x ${F.h} board`)
  return q
}

/** let the camera's glide run, a frame at a time, every frame showing only board */
const settle = (w, V, ms, what) => { for (let t = 0; t < ms; t += 16) { w._flush(16); noVoid(V, `${what}, ${t + 16} ms on`) } }

test('at load, at every wheel step out and in, and at each quarter turn, the battle area shows only board — every frame of the glide too', () => {
  const { w, v, V } = boot(), wrap = V.dom.stage.parentNode
  v.seek(firstActivation)
  assert.equal(v.cameraState.stance, 'tactical')
  noVoid(V, 'at load'); settle(w, V, 200, 'at load')
  assert.ok(V.view.glide, 'the glide is on: the frames below are its')
  for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: 300 }); settle(w, V, 48, `wheel out, step ${i + 1}`) }
  settle(w, V, 1800, 'springing back')
  for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: -300 }); settle(w, V, 48, `wheel in, step ${i + 1}`) }
  settle(w, V, 1800, 'springing back')
  for (const deg of [90, 90, 90, 90, -90]) { v.turn(deg); settle(w, V, 1200, `turning to ${V.view.cam.yaw}°`)
    for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: 300 }); settle(w, V, 48, `turned to ${V.view.cam.yaw}°, wheel out ${i + 1}`) }
    settle(w, V, 1800, `turned to ${V.view.cam.yaw}°, springing back`) }
  v.dispose()
})

test('at the standard zoom there is board beyond the battle area on both axes; every Activation\'s centring shows only board', () => {
  const { v, V } = boot(), F = V.data.F
  v.seek(firstActivation)
  const q = noVoid(V, 'at load')
  assert.ok(q.r - q.l < F.w - 40 && q.b - q.t < F.h - 40, `board to scroll to across and down: the view sees ${(q.r - q.l).toFixed(0)} x ${(q.b - q.t).toFixed(0)} of ${F.w} x ${F.h}`)
  let n = 0
  for (let i = 0; i < EV.length; i++) if (EV[i].type === 'activation.begin') { v.seek(i + 1); noVoid(V, `Activation at event ${i} (${V.S.U[EV[i].actor]?.name})`); n++ }
  assert.ok(n > 10, `enough Activations: ${n}`)
  v.pan(-1e5, -1e5); noVoid(V, 'a host pan far up-left'); v.pan(1e5, 1e5); noVoid(V, 'and far down-right')
  v.dispose()
})

test('pointing at each of the four edges scrolls the board until its edge meets the battle area\'s, and no further', () => {
  const { w, v, V } = boot(), root = V.dom.root, F = V.data.F
  v.seek(firstActivation)
  const point = (x, y) => fire(root, 'pointermove', { clientX: x, clientY: y })
  /* the screen's edges (the window is 1920 x 1080; the fake board's own rectangle is 100 px square) */
  for (const [name, x, y, side] of [['left', 2, 540, 'l'], ['right', 1917, 540, 'r'], ['top', 960, 2, 't'], ['bottom', 960, 1077, 'b']]) {
    point(960, 540); w._flush(100); v.centre(V.S.activeId); w._flush(100)
    const start = footprint(V)
    for (let i = 0; i < 300; i++) { point(x, y); w._flush(50) }
    const end = noVoid(V, `held at the ${name} edge`)
    const edge = { l: 0, r: F.w, t: 0, b: F.h }[side]
    assert.ok(Math.abs(end[side] - edge) <= TOL, `the ${name} edge: scrolled until the board's edge meets the battle area's (${end[side].toFixed(2)} vs ${edge})`)
    assert.ok(Math.abs(end[side] - start[side]) > 20 || Math.abs(start[side] - edge) <= TOL, `the ${name} edge: it moved (${start[side].toFixed(1)} -> ${end[side].toFixed(1)})`)
    point(960, 540); w._flush(300)
  }
  v.dispose()
})
