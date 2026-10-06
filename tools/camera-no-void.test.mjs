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

/* Law 10, 2026-10-04 (viewer.camera-shows-edge-units; engine DECISIONS.md 2026-10-04 'the view may slide past the board's edge to
   show a unit on an edge column', Andrew: "1 yes"): "the battle area shows only board" was held of EVERY view. The rule now:
   the view shows only board, or passes the board's edge by the least that shows the hex it was sent to whole — never beyond
   the one bound (the board's edge, or as far past it as the outermost hexes need: the page's own V.cameraBound()). So a view
   the page says stands inside the board's own box (past: null) is held to "only board" exactly as before (noVoid); a view
   that stands past it is held to the bound, and to the reason: the unit in sight is whole and a little less of a slide would
   cut it ('subject'), or the player scrolled there ('scroll'). */
function withinBound(V, what) {
  const B = V.cameraBound(), p = V.camShown
  assert.ok(B.bound && p.x >= B.bound.x[0] - TOL && p.x <= B.bound.x[1] + TOL && p.y >= B.bound.y[0] - TOL && p.y <= B.bound.y[1] + TOL, `${what}: the view is inside the camera's one bound`)
  return B
}
function noVoidOrLeast(V, what, unit) {
  const B = withinBound(V, what)
  if (!B.past) return noVoid(V, what)
  /* past the board's own box: for the unit in sight, by the least that shows its hex whole */
  assert.equal(B.past, 'subject', `${what}: the view passes the board's edge only for the unit in sight`)
  const u = V.S.U[unit]; assert.ok(u, what + ': a unit is in sight')
  assert.equal(V.revealPan(V.camTarget, u.hex), null, `${what}: ${u.name}'s hex is whole on the screen`)
  const own = B.own, c = V.camTarget, back = { ...c, x: Math.min(Math.max(c.x, own.x[0]), own.x[1]), y: Math.min(Math.max(c.y, own.y[0]), own.y[1]) }
  const less = { ...c, x: c.x + (back.x - c.x) * .1, y: c.y + (back.y - c.y) * .1 }
  assert.notEqual(V.revealPan(less, u.hex), null, `${what}: a tenth less of a slide past the edge would cut ${u.name}'s hex — it is the least`)
  return footprint(V)
}
/** let the camera's glide run, a frame at a time, every frame showing only board */
const settle = (w, V, ms, what) => { for (let t = 0; t < ms; t += 16) { w._flush(16); noVoid(V, `${what}, ${t + 16} ms on`) } }

/* Law 10, 2026-10-05 (viewer.zoom-stays; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … The wheel's zoom stays where it is left, far enough
   out to see the whole board', Andrew: "2 yes" — "Overturns 2026-10-01 'snaps back to standard when you stop'. At the widest zoom the
   whole board shows, so 2026-10-03's 'the camera never shows white space' gives way there by as much as showing the whole
   board takes and no more"). The tests below held "the battle area shows only board" (noVoid) of
   every frame of every wheel step OUT as well as in, and let the zoom spring back between ('springing back'). The rule now:
   the zoom stays where the wheel leaves it, and pulled back past the fill the view shows past the board's edge — only as
   much as showing more of the board takes: on each axis the battle area shows only board, or the whole of the board
   (boardOrWhole, every frame of the ease too). At the standard zoom and nearer, "only board" is held exactly as before;
   the wheel's button brings the standard zoom back where the spring did. */
function boardOrWhole(V, what) {
  const F = V.data.F, q = footprint(V), T = 1.5
  assert.ok((q.l >= -T && q.r <= F.w + T) || (q.l <= T && q.r >= F.w - T), `${what}: across, the battle area shows only board or the whole of it — it sees x ${q.l.toFixed(1)}..${q.r.toFixed(1)} of ${F.w}`)
  assert.ok((q.t >= -T && q.b <= F.h + T) || (q.t <= T && q.b >= F.h - T), `${what}: up and down, the battle area shows only board or the whole of it — it sees y ${q.t.toFixed(1)}..${q.b.toFixed(1)} of ${F.h}`)
}
/** let the wheel's ease run, a frame at a time, every frame showing only board or the whole of it */
const ease = (w, V, ms, what) => { for (let t = 0; t < ms; t += 16) { w._flush(16); boardOrWhole(V, `${what}, ${t + 16} ms on`) } }
/** the wheel's button: back to the standard zoom */
const wheelButton = wrap => { fire(wrap, 'pointerdown', { button: 1 }); fire(wrap, 'pointerup', { button: 1 }) }

test('at load, at every wheel step in, and at each quarter turn, the battle area shows only board — every frame of the glide too; pulled back by the wheel it shows only board or the whole of it', () => {
  const { w, v, V } = boot(), wrap = V.dom.stage.parentNode
  v.seek(firstActivation)
  assert.equal(v.cameraState.stance, 'tactical')
  noVoid(V, 'at load'); settle(w, V, 200, 'at load')
  assert.ok(V.view.glide, 'the glide is on: the frames below are its')
  for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: 300 }); ease(w, V, 48, `wheel out, step ${i + 1}`) }
  ease(w, V, 1800, 'pulled back, at rest'); assert.ok(V.view.cam.zoom < 1, 'the zoom stays where the wheel left it: no spring back')
  wheelButton(wrap); ease(w, V, 400, 'back to the standard zoom'); assert.equal(V.view.cam.zoom, 1, 'the wheel\'s button: the standard zoom')
  settle(w, V, 200, 'at the standard zoom again')
  for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: -300 }); settle(w, V, 48, `wheel in, step ${i + 1}`) }
  settle(w, V, 1800, 'nearest, at rest'); assert.ok(V.view.cam.zoom > 1, 'and stays nearer too')
  wheelButton(wrap); settle(w, V, 400, 'back to the standard zoom from nearer'); assert.equal(V.view.cam.zoom, 1)
  for (const deg of [90, 90, 90, 90, -90]) { v.turn(deg); settle(w, V, 1200, `turning to ${V.view.cam.yaw}°`)
    for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: 300 }); ease(w, V, 48, `turned to ${V.view.cam.yaw}°, wheel out ${i + 1}`) }
    ease(w, V, 400, `turned to ${V.view.cam.yaw}°, pulled back`)
    wheelButton(wrap); ease(w, V, 400, `turned to ${V.view.cam.yaw}°, back to the standard zoom`); settle(w, V, 200, `turned to ${V.view.cam.yaw}°, at the standard zoom again`) }
  v.dispose()
})

test('at the standard zoom there is board beyond the battle area on both axes; every Activation\'s centring shows only board — or passes its edge by the least that shows the acting unit\'s hex whole', () => {
  const { v, V } = boot(), F = V.data.F
  v.seek(firstActivation)
  const q = noVoid(V, 'at load')
  assert.ok(q.r - q.l < F.w - 40 && q.b - q.t < F.h - 40, `board to scroll to across and down: the view sees ${(q.r - q.l).toFixed(0)} x ${(q.b - q.t).toFixed(0)} of ${F.w} x ${F.h}`)
  let n = 0
  let past = 0
  /* Law 10, combine 2026-10-04 (viewer master cf11722 — viewer.camera-shows-edge-units — with this copy's engine
     fix.opening-orphanage-closer-start): the last line read
       assert.ok(past < n / 2, `most Activations are centred with only board in view (${n - past} of ${n})`)
     — a count of the recording of the day. On the closer start the Orphanage is fought at the board's top (the civilians
     stand on rows 1 and 2, the hero is on row 0 by Turn 2), so on this recording about half of the Activations are of a
     unit on an edge row or column (21 of 41). What the count stood for is held of EVERY Activation instead: the view
     passes the board's edge only where the board's own bound would cut the acting unit's hex (the camera's own measure,
     revealPan, asked of the view held to the board); and some Activation is centred with only board in view. */
  const clamp = (x, [a, b]) => Math.min(b, Math.max(a, x))
  for (let i = 0; i < EV.length; i++) if (EV[i].type === 'activation.begin') { v.seek(i + 1); noVoidOrLeast(V, `Activation at event ${i} (${V.S.U[EV[i].actor]?.name})`, EV[i].actor)
    const B = V.cameraBound()
    if (B.past) { past++
      const held = { ...V.camTarget, x: clamp(V.camTarget.x, B.own.x), y: clamp(V.camTarget.y, B.own.y) }
      assert.notEqual(V.revealPan(held, V.S.U[EV[i].actor].hex), null, `Activation at event ${i}: the view is past the edge only because the board's own bound would cut ${V.S.U[EV[i].actor]?.name}'s hex`) }
    n++ }
  assert.ok(n > 10, `enough Activations: ${n}`); assert.ok(n - past > 0, `some Activations are centred with only board in view (${n - past} of ${n})`)
  /* a host's pan: to the bound, and no further (was: 'only board' — the pan stopped at the board's edge) */
  v.pan(-1e5, -1e5); let B = withinBound(V, 'a host pan far up-left'); assert.ok(Math.abs(V.camTarget.x - B.bound.x[0]) < TOL && Math.abs(V.camTarget.y - B.bound.y[0]) < TOL, 'at the bound\'s corner')
  v.pan(1e5, 1e5); B = withinBound(V, 'and far down-right'); assert.ok(Math.abs(V.camTarget.x - B.bound.x[1]) < TOL && Math.abs(V.camTarget.y - B.bound.y[1]) < TOL, 'at the bound\'s other corner')
  v.dispose()
})

test('pointing at each of the four edges scrolls the board until the bound — the board\'s edge, or as far past it as the outermost hexes need — and no further', () => {
  const { w, v, V } = boot(), root = V.dom.root, F = V.data.F
  v.seek(firstActivation)
  const point = (x, y) => fire(root, 'pointermove', { clientX: x, clientY: y })
  /* the screen's edges (the window is 1920 x 1080; the fake board's own rectangle is 100 px square) */
  for (const [name, x, y, side] of [['left', 2, 540, 'l'], ['right', 1917, 540, 'r'], ['top', 960, 2, 't'], ['bottom', 960, 1077, 'b']]) {
    point(960, 540); w._flush(100); v.centre(V.S.activeId); w._flush(100)
    const start = footprint(V)
    for (let i = 0; i < 300; i++) { point(x, y); w._flush(50) }
    /* Law 10, 2026-10-04 (viewer.camera-shows-edge-units): was noVoid + 'scrolled until the board's edge meets the battle area's'
       (the view's own side ON the board's edge). The player's scrolling now goes on to the bound, so the rim's hexes can be
       scrolled whole into view: the view's centre stands on that side of the bound, the side of the view is at or past the
       board's edge, and past it by no more than the bound is wider than the board's own box */
    const end = footprint(V), B = withinBound(V, `held at the ${name} edge`), c = V.camShown
    const edge = { l: 0, r: F.w, t: 0, b: F.h }[side], at = { l: [c.x, B.bound.x[0]], r: [c.x, B.bound.x[1]], t: [c.y, B.bound.y[0]], b: [c.y, B.bound.y[1]] }[side]
    assert.ok(Math.abs(at[0] - at[1]) <= TOL, `the ${name} edge: scrolled until the bound (${at[0].toFixed(2)} vs ${at[1].toFixed(2)})`)
    const grown = { l: B.own.x[0] - B.bound.x[0], r: B.bound.x[1] - B.own.x[1], t: B.own.y[0] - B.bound.y[0], b: B.bound.y[1] - B.own.y[1] }[side]
    const over = side === 'l' || side === 't' ? edge - end[side] : end[side] - edge
    assert.ok(over >= -TOL && over <= grown + TOL, `the ${name} edge: the view passes the board's edge by ${over.toFixed(1)} px — no more than the bound's ${grown.toFixed(1)}`)
    assert.ok(Math.abs(end[side] - start[side]) > 20 || Math.abs(start[side] - edge) <= TOL, `the ${name} edge: it moved (${start[side].toFixed(1)} -> ${end[side].toFixed(1)})`)
    point(960, 540); w._flush(300)
  }
  v.dispose()
})
