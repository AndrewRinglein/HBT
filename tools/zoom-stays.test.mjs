// viewer.zoom-stays (engine backlog; ruled 2026-10-05, Andrew, engine DECISIONS.md 'the battle screen must feel smooth: …' —
// asked "Should the wheel zoom stay where you leave it, far enough out to see the whole board (this overturns 'snaps back')?":
// "2 yes"). Overturns 2026-10-01 "The mouse wheel zooms a limited amount and snaps back to standard when you stop" and, at the
// widest zoom only, 2026-10-03 "the camera never shows white space" — by as much as showing the whole board takes and no more.
// Wanted: (1) the wheel's zoom stays where it is left — no timer, no spring back — for the rest of the battle; a new battle
// opens at the standard zoom, which is unchanged. (2) Its range runs from the nearest it reaches today out to the whole board
// in view, every hex whole. (3) It zooms about the pointer: the ground under the pointer stays under it. (4) It answers at
// once: a notch is shown within a frame and eases over about 120 ms, keeping its speed from notch to notch. The glide stays
// for the game's own camera moves. The pan bound at each zoom is as now. Pressing the wheel button returns to the standard
// zoom. The HUD line says the wheel zooms.
// Run on the sources (no VIEWER_PAGE: the viewer bundled from src/) or on the built page (VIEWER_PAGE, the gate's way).
import '../../engine/tools/engine-modules.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { makeWindow } from './fakedom.mjs'
import { boardRay, screenOf } from '../src/camera3d.js'
import { POLICY } from '../src/camera-policy.js'
const require = createRequire(import.meta.url)
const battle = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
let source = null
/** the viewer mounted on the Orphanage's recording as a host that plays, at 1920 x 1080 */
function boot() {
  const w = makeWindow()
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const run = code => new Function(...names, code)(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  let mount, lib
  if (process.env.VIEWER_PAGE) {
    const html = readFileSync(process.env.VIEWER_PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/)
    w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
    run(m[1]); const B = w.__battleView; B.harness.dispose(); mount = B.mount; lib = { fields: B.lib.fields, static: B.lib.static, artmap: B.lib.art.artmap, assets: B.lib.art.assets, glyphs: B.lib.glyphs }
  } else {
    source ??= require('../../engine/node_modules/esbuild').buildSync({ stdin: { contents: "import {mountBattleViewer} from './src/viewer.js'; window.__mount=mountBattleViewer", resolveDir: process.cwd() }, nodePaths: ['node_modules'], bundle: true, write: false, platform: 'browser', format: 'iife' }).outputFiles[0].text
    run(source); mount = w.__mount
    lib = { fields: JSON.parse(readFileSync('generated/fields.json', 'utf8')), static: JSON.parse(readFileSync('generated/static.json', 'utf8')), artmap: JSON.parse(readFileSync('generated/art/manifest.json', 'utf8')).artmap, assets: {}, glyphs: JSON.parse(readFileSync('generated/ra-glyphs.json', 'utf8')) }
  }
  const mapId = battle.events.find(e => e.type === 'map.loaded').mapId, S = lib.static
  const data = { field: lib.fields[mapId], fieldMapId: mapId, initialEvents: battle.events, units: S.units, statuses: S.statuses, absorbingStatuses: S.absorbingStatuses, actions: S.actions, badges: S.badges,
    layers: S.layers, actionKinds: S.actionKinds, statusRows: S.statusRows, artmap: lib.artmap, assets: lib.assets, glyphs: lib.glyphs, meta: { seed: battle.seed } }
  /** a battle begun: mounted, at its first Activation, the glide on */
  const begin = () => {
    const host = w.document.createElement('div'); w.document.body.appendChild(host)
    const v = mount(host, data, { autoplay: false, onPlay: () => true })
    v.push(battle.events)
    v.seek(battle.events.findIndex(e => e.type === 'activation.begin') + 1)
    v.setPlay({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
    /* the camera's glide is switched on two frames after the mount (src/viewer.js): let them pass, so a move here is shown as on the page */
    w._flush(16); w._flush(16); w._flush(1300)
    return { v, V: v._V, wrap: v._V.dom.stage.parentNode }
  }
  return { w, begin, ...begin() }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
/* the fake board is 100 px square on the screen and lays out the battle area's own px inside it */
const client = (V, x, y) => { const vp = V.camera3d.userData.viewport; return { clientX: x * 100 / vp.w, clientY: y * 100 / vp.h } }
/** one notch of the wheel (a mouse's notch is 100), toward the player (out) or away (in), with the pointer at a place of the battle area */
const NOTCH = 100
const notch = (V, wrap, way, at) => fire(wrap, 'wheel', { deltaY: way === 'out' ? NOTCH : -NOTCH, ...(at ? client(V, at.x, at.y) : client(V, V.camera3d.userData.viewport.w / 2, V.camera3d.userData.viewport.h / 2)) })
const frames = (w, n, ms = 16) => { for (let i = 0; i < n; i++) w._flush(ms) }
const pose = V => ({ x: V.camTarget.x, y: V.camTarget.y, zoom: V.camTarget.zoom, yaw: V.camTarget.yaw })
const shown = V => ({ x: V.camShown.x, y: V.camShown.y, zoom: V.camShown.zoom, yaw: V.camShown.yaw })
/** where a point of the board (board px, at a height) is on the battle area, in its own px */
const onScreen = (V, x, y, z = 0) => screenOf(V.data.boardAffine, V.camera3d, x, y, z)
/** the board's ground the battle area shows: the four corners' rays met with it (board px) */
function footprint(V) {
  const vp = V.camera3d.userData.viewport; let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity
  for (const [x, y] of [[0, 0], [vp.w, 0], [0, vp.h], [vp.w, vp.h]]) { const { o, d } = boardRay(V.data.boardAffine, V.camera3d, x, y), k = -o.z / d.z, px = o.x + k * d.x, py = o.y + k * d.y
    l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py) }
  return { l, r, t, b }
}
/** the six corners of a hex's top (board px): a pointy hex of the cell's width and height */
const corners = (V, hex) => { const p = V.data.POS[hex], { W, H } = V.data.LAYOUT; return [[0, -H / 2], [W / 2, -H / 4], [W / 2, H / 4], [0, H / 2], [-W / 2, H / 4], [-W / 2, -H / 4]].map(([dx, dy]) => ({ x: p.px + dx, y: p.py + dy })) }
const hexes = V => V.data.POS.map((p, hex) => hex).filter(hex => V.data.POS[hex] && (!V.data.F.floor || V.data.F.floor[hex]))

test('three notches out and the view is still there ten seconds later — no timer, no spring back; three notches in stay as well', () => {
  const { w, v, V, wrap } = boot(), vp = V.camera3d.userData.viewport
  assert.deepEqual([vp.w > 1000, vp.h > 500], [true, true], 'a battle area of the 1920 x 1080 screen')
  assert.equal(V.view.cam.zoom, 1, 'the battle opens at the standard zoom'); const std = pose(V).zoom
  for (let i = 0; i < 3; i++) { notch(V, wrap, 'out'); frames(w, 6) }
  frames(w, 20); const out = pose(V), factor = V.view.cam.zoom
  assert.ok(factor < 1 && out.zoom < std, `three notches out: farther than the standard (${factor.toFixed(3)} of it)`)
  /* Law 10 (the old rule's own number): 600 ms after the last notch the zoom was back at the standard. Ten seconds on — and through redraws — it is where it was left */
  for (let s = 0; s < 10; s++) { frames(w, 10, 100); v.render() }
  assert.equal(V.view.cam.zoom, factor, 'ten seconds later the zoom is where it was left')
  assert.deepEqual(pose(V), out, 'and so is the view'); assert.deepEqual(shown(V), out, 'that is what is shown')
  for (let i = 0; i < 6; i++) { notch(V, wrap, 'in'); frames(w, 6) }
  frames(w, 20); const near = V.view.cam.zoom
  assert.ok(near > 1, `six notches in from there: nearer than the standard (${near.toFixed(3)})`)
  for (let s = 0; s < 10; s++) frames(w, 10, 100)
  assert.equal(V.view.cam.zoom, near, 'it stays there too')
  v.dispose()
})

test('the range: in to the nearest it reached before (1.8 of the standard); out to the whole board — at the farthest notch all 280 hexes are whole in the battle area', () => {
  const { w, v, V, wrap } = boot(), vp = V.camera3d.userData.viewport
  for (let i = 0; i < 30; i++) notch(V, wrap, 'in')
  frames(w, 30)
  assert.ok(V.view.cam.zoom > 1.4 && V.view.cam.zoom <= POLICY.ZOOM_NEAR + 1e-9, `nearest: ${V.view.cam.zoom} of the standard, never nearer than ${POLICY.ZOOM_NEAR}`)
  const nearest = V.view.cam.zoom; notch(V, wrap, 'in'); frames(w, 20); assert.equal(V.view.cam.zoom, nearest, 'a notch more goes no nearer')
  for (let i = 0; i < 60; i++) notch(V, wrap, 'out')
  frames(w, 30); const farthest = V.view.cam.zoom
  notch(V, wrap, 'out'); frames(w, 20); assert.equal(V.view.cam.zoom, farthest, 'a notch more goes no farther')
  assert.deepEqual(shown(V), pose(V), 'the view has come to rest')
  const all = hexes(V); assert.equal(all.length, 280, 'the Orphanage has 280 hexes')
  const cut = []; let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity
  for (const hex of all) { let whole = true
    for (const c of corners(V, hex)) { const s = onScreen(V, c.x, c.y, V.data.displayHeights?.[hex] || 0)
      if (!(s.ahead && s.x >= 0 && s.x <= vp.w && s.y >= 0 && s.y <= vp.h)) whole = false
      l = Math.min(l, s.x); r = Math.max(r, s.x); t = Math.min(t, s.y); b = Math.max(b, s.y) }
    if (!whole) cut.push(hex) }
  assert.deepEqual(cut, [], 'every hex of the board is whole in the battle area')
  /* and no farther than that takes: it is the whole board's own fit (boardFit, the whole-map view's framing) — the view
     stands on the board's middle, and the board takes most of the battle area's width */
  const q = footprint(V), F = V.data.F
  assert.ok(q.l < 0 && q.r > F.w && q.t < 0 && q.b > F.h, 'the battle area shows the whole board and past its edges')
  assert.ok(Math.abs(V.camTarget.x - F.w / 2) < 1 && Math.abs(V.camTarget.y - F.h / 2) < 1, `the view stands on the board's middle: ${V.camTarget.x.toFixed(1)}, ${V.camTarget.y.toFixed(1)} of ${F.w} x ${F.h}`)
  assert.ok((r - l) / vp.w > .8, `the board is ${Math.round(r - l)} of the battle area's ${vp.w} px across: no farther out than showing it whole takes`)
  assert.ok(Math.abs((l + vp.w - r) / 2 - l) < 40, 'and it sits in the middle, left to right')
  v.dispose()
})

test('white space shows only where showing more of the board takes it: on each axis the view shows only board, or the whole of the board', () => {
  const { w, v, V, wrap } = boot(), F = V.data.F, TOL = 1.5
  let past = 0
  const only = () => { const q = footprint(V); return q.l >= -TOL && q.r <= F.w + TOL && q.t >= -TOL && q.b <= F.h + TOL }
  assert.ok(only(), 'at the standard zoom the battle area shows only board (2026-10-03, as it was)')
  for (let i = 0; i < 40; i++) {
    notch(V, wrap, 'out', { x: 300 + 37 * i, y: 200 + 13 * i }); frames(w, 20)
    const q = footprint(V), what = `notch ${i + 1} out (zoom ${V.view.cam.zoom.toFixed(3)})`
    const onlyX = q.l >= -TOL && q.r <= F.w + TOL, wholeX = q.l <= TOL && q.r >= F.w - TOL
    const onlyY = q.t >= -TOL && q.b <= F.h + TOL, wholeY = q.t <= TOL && q.b >= F.h - TOL
    assert.ok(onlyX || wholeX, `${what}: across, the view shows only board or the whole of it — it sees x ${q.l.toFixed(0)}..${q.r.toFixed(0)} of ${F.w}`)
    assert.ok(onlyY || wholeY, `${what}: up and down, the view shows only board or the whole of it — it sees y ${q.t.toFixed(0)}..${q.b.toFixed(0)} of ${F.h}`)
    if (!onlyX || !onlyY) past++
  }
  assert.ok(past >= 1, 'pulled back, the view shows past the board\'s edge — to show the whole of it')
  /* and in again: from the standard zoom nearer, only board once more */
  const vp = V.camera3d.userData.viewport, c = client(V, vp.w / 2, vp.h / 2)
  fire(wrap, 'pointerdown', { ...c, button: 1 }); fire(wrap, 'pointerup', { ...c, button: 1 }); frames(w, 30)
  assert.equal(V.view.cam.zoom, 1); assert.ok(only(), 'back at the standard zoom the battle area shows only board again')
  for (let i = 0; i < 6; i++) { notch(V, wrap, 'in', { x: 400 + 90 * i, y: 300 }); frames(w, 20); assert.ok(only(), `notch ${i + 1} in: only board`) }
  v.dispose()
})

test('it zooms about the pointer: zooming in and out with the pointer on a hex keeps that hex under the pointer, at every notch and every frame between', () => {
  const { w, v, V, wrap } = boot(), vp = V.camera3d.userData.viewport
  /* a hex well inside the board, a third of the way across the battle area from its middle */
  const want = { x: vp.w / 2 + vp.w / 6, y: vp.h / 2 - vp.h / 8 }
  const hex = hexes(V).map(h => ({ h, s: onScreen(V, V.data.POS[h].px, V.data.POS[h].py) })).sort((a, b) => Math.hypot(a.s.x - want.x, a.s.y - want.y) - Math.hypot(b.s.x - want.x, b.s.y - want.y))[0].h
  const p = V.data.POS[hex], at = onScreen(V, p.px, p.py), off = () => { const s = onScreen(V, p.px, p.py); return Math.hypot(s.x - at.x, s.y - at.y) }
  const centre0 = pose(V)
  let worst = 0
  /* three in and three out again (the nearest zoom is 1.8 of the standard: a fourth notch in would stop short of a notch) */
  for (const way of ['in', 'in', 'in', 'out', 'out', 'out']) {
    const before = V.view.cam.zoom
    notch(V, wrap, way, at)
    for (let f = 0; f < 14; f++) { w._flush(16); worst = Math.max(worst, off()); assert.ok(off() < 3, `a notch ${way}, ${16 * (f + 1)} ms on: the hex is ${off().toFixed(2)} px from the pointer`) }
    assert.notEqual(V.view.cam.zoom, before, `the notch ${way} zoomed`)
    assert.deepEqual(shown(V), pose(V), 'the notch has come to rest'); assert.ok(off() < 1, `at rest after a notch ${way}: ${off().toFixed(3)} px off`)
  }
  /* in and out again about one point: the view is back where it began */
  const back = pose(V); assert.ok(Math.hypot(back.x - centre0.x, back.y - centre0.y) < .01 && Math.abs(back.zoom - centre0.zoom) < 1e-9, 'three in and three out about the same hex: the view it began with')
  /* it is the pointer the zoom turns about, not the view's middle: the view's centre moved toward the hex on the way in */
  notch(V, wrap, 'in', at); frames(w, 14)
  const c = pose(V); assert.ok(Math.hypot(c.x - centre0.x, c.y - centre0.y) > 5, 'the view\'s centre moved: the zoom is about the pointer')
  assert.ok(worst < 3, `never more than a few px off: ${worst.toFixed(2)}`)
  v.dispose()
})

test('it answers at once: a notch is shown within a frame and eases over about 120 ms, keeping its speed from notch to notch; ten notches in one second end at their zoom within 200 ms of the last', () => {
  const { w, v, V, wrap } = boot()
  assert.ok(V.view.glide, 'the glide is on: what is shown below is what the page shows')
  const z = () => V.camShown.zoom, z0 = z()
  notch(V, wrap, 'in'); const to = V.camTarget.zoom
  assert.ok(to > z0, 'a notch in asks for a nearer zoom')
  w._flush(16); const first = (z() - z0) / (to - z0)
  assert.ok(first > .05, `shown within a frame: ${(first * 100).toFixed(1)}% of the notch at 16 ms`)   // (the 1.1 s glide showed 0.03% of it)
  assert.ok(first < .7, 'and eased, not jumped')
  frames(w, 3); const at64 = (z() - z0) / (to - z0)
  frames(w, 4); const at128 = (z() - z0) / (to - z0)
  assert.ok(at64 > .4 && at64 < .97, `part-way at 64 ms: ${(at64 * 100).toFixed(0)}%`)
  assert.ok(at128 > .9, `all but there at about 120 ms: ${(at128 * 100).toFixed(0)}%`)
  frames(w, 5); assert.equal(z(), to, 'and exactly there by 200 ms'); assert.equal(V.camAnim, null, 'the ease is over')
  /* ten notches in one second: the speed is kept from notch to notch — the frame after a notch covers no less than the one before it */
  let last = z(), step = 0, t = 0
  for (let n = 0; n < 10; n++) {
    notch(V, wrap, 'in')
    for (let f = 0; f < 5; f++) { w._flush(20); t += 20; const now = z(), d = now - last
      assert.ok(d >= 0, `notch ${n + 1}, frame ${f + 1}: the zoom never goes back`)
      if (f === 0 && n > 0 && V.view.cam.zoom < POLICY.ZOOM_NEAR - 1e-9) assert.ok(d >= step * .98, `notch ${n + 1}: the first frame after it covers ${d.toExponential(3)}, the frame before it covered ${step.toExponential(3)} — the speed is kept, not started again from rest`)
      step = d; last = now }
  }
  assert.equal(t, 1000)
  const end = V.camTarget.zoom
  frames(w, 10, 20)
  assert.equal(z(), end, 'ten notches in one second: at their zoom within 200 ms of the last')
  assert.deepEqual(shown(V), pose(V))
  /* the game's own moves still glide: a centring on a unit takes its 1.1 s */
  const far = Object.values(V.S.U).filter(u => u.life !== 'dead').sort((a, b) => Math.hypot(V.data.POS[b.hex].px - V.camTarget.x, V.data.POS[b.hex].py - V.camTarget.y) - Math.hypot(V.data.POS[a.hex].px - V.camTarget.x, V.data.POS[a.hex].py - V.camTarget.y))[0]
  const from = shown(V); v.centre(far.id); const dest = pose(V)
  if (dest.x !== from.x || dest.y !== from.y) { frames(w, 13)
    const part = Math.hypot(V.camShown.x - from.x, V.camShown.y - from.y) / Math.hypot(dest.x - from.x, dest.y - from.y)
    assert.ok(part > 0 && part < .5, `a centring is still the 1.1 s glide: ${(part * 100).toFixed(0)}% of the way at 200 ms`)
    assert.equal(V.camShown.zoom, end, 'at the zoom the wheel left') }
  v.dispose()
})

test('the zoom lasts the battle — through a new Activation\'s centring and a quarter turn — and a new battle opens at the standard zoom', () => {
  const { w, v, V, wrap, begin } = boot(), std = pose(V).zoom
  for (let i = 0; i < 4; i++) notch(V, wrap, 'out')
  frames(w, 30); const left = V.view.cam.zoom; assert.ok(left < 1)
  const second = battle.events.map((e, i) => [e, i]).filter(([e]) => e.type === 'activation.begin')[1][1]
  v.seek(second + 1); frames(w, 100)
  assert.equal(V.view.cam.zoom, left, 'the next Activation centres at the zoom the wheel left')
  v.turn(90); frames(w, 40); v.turn(-90); frames(w, 40)
  assert.equal(V.view.cam.zoom, left, 'a quarter turn and back keeps it')
  v.dispose()
  const next = begin()
  assert.equal(next.V.view.cam.zoom, 1, 'a new battle opens at the standard zoom')
  assert.equal(next.V.camTarget.zoom, std, 'which is unchanged')
  next.v.dispose()
})

test('pressing the wheel button returns to the standard zoom; the HUD line says the wheel zooms', () => {
  const { w, v, V, wrap } = boot(), vp = V.camera3d.userData.viewport, std = pose(V).zoom
  for (let i = 0; i < 5; i++) notch(V, wrap, 'out')
  frames(w, 30); assert.ok(V.view.cam.zoom < 1)
  const c = client(V, vp.w / 2, vp.h / 2)
  fire(wrap, 'pointerdown', { ...c, button: 1 }); fire(wrap, 'pointerup', { ...c, button: 1 }); frames(w, 30)
  assert.equal(V.view.cam.zoom, 1, 'the wheel button: back to the standard zoom')
  assert.equal(V.camShown.zoom, std, 'shown')
  for (let s = 0; s < 3; s++) frames(w, 10, 100)
  assert.equal(V.view.cam.zoom, 1)
  if (V.dom.hud) { const words = V.dom.hud.textContent
    assert.match(words, /wheel to zoom/, 'the HUD line says the wheel zooms'); assert.doesNotMatch(words, /look closer/) }
  v.dispose()
})
