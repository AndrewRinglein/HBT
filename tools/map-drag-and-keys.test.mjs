// viewer.map-drag-and-keys (engine backlog; ruled 2026-10-05, Andrew, engine DECISIONS.md 'the battle screen must feel smooth: …
// the map drags and moves on W/A/S/D' — asked "Should the map also move by dragging it and by W/A/S/D, alongside edge scroll
// (this overturns 'no grab-drag')?": "Yes"). Overturns 2026-10-01 'the XCOM-style camera' "no grab-drag" — the edge scroll
// stays, the drag and the keys are added.
// Wanted: (1) a press on the board that travels moves the map with the pointer — the ground under the pointer stays under it
// — with the left button or the right; released, the map stays where it was put. A press that travels less than 6 px is a
// click exactly as now; one that travels more is a drag and is never also a click. No press is ever swallowed with nothing
// happening. (2) W, A, S and D move the map while held, at the edge scroll's speed, two at once for a diagonal; the arrow keys
// and Q / E still turn a quarter, in about 300 ms. (3) The drag and the keys stop at the edge scroll's bound and are shown as
// they go, never through the glide. The HUD line names the new ways.
// Run on the sources (no VIEWER_PAGE: the viewer bundled from src/) or on the built page (VIEWER_PAGE, the gate's way).
import '../../engine/tools/engine-modules.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { makeWindow } from './fakedom.mjs'
import { boardRay } from '../src/camera3d.js'
import { POLICY } from '../src/camera-policy.js'
const require = createRequire(import.meta.url)
const battle = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
let source = null
/** the viewer mounted on the Orphanage's recording as a host that plays; `seen` is what the board offers that host */
function boot({ play = true } = {}) {
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
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true } })
  v.push(battle.events)
  v.seek(battle.events.findIndex(e => e.type === 'activation.begin') + 1)
  const V = v._V
  if (play) v.setPlay({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
  V.view.camF = { x: V.data.F.w / 2, y: V.data.F.h / 2 }; v.pan(0, 0); w._flush(1300)
  /* the camera's glide is switched on two frames after the mount (src/viewer.js): let them pass, so a move here glides as it does on the page */
  w._flush(16); w._flush(16); w._flush(1300)
  seen.length = 0
  return { w, v, V, seen, wrap: V.dom.stage.parentNode }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
/* the fake board is 100 px square on the screen and lays out the battle area's own px inside it */
const scale = V => { const vp = V.camera3d.userData.viewport; return { x: 100 / vp.w, y: 100 / vp.h } }
const client = (V, x, y) => ({ clientX: x * scale(V).x, clientY: y * scale(V).y })
/** the point of the board's ground under a place of the battle area (its own px), in board px */
function groundAt(V, x, y) { const { o, d } = boardRay(V.data.boardAffine, V.camera3d, x, y), t = -o.z / d.z; return { x: o.x + t * d.x, y: o.y + t * d.y } }
const pose = V => ({ x: V.camTarget.x, y: V.camTarget.y })
/** a press at (x, y) of the battle area dragged by (dx, dy) of its px in steps, and — unless `hold` — released */
function drag(w, V, wrap, x, y, dx, dy, { button = 0, steps = 10, hold = false } = {}) {
  fire(wrap, 'pointerdown', { ...client(V, x, y), button })
  for (let i = 1; i <= steps; i++) { fire(wrap, 'pointermove', { ...client(V, x + dx * i / steps, y + dy * i / steps), button }); w._flush(16) }
  if (!hold) { fire(wrap, 'pointerup', { ...client(V, x + dx, y + dy), button }); fire(wrap, button === 2 ? 'contextmenu' : 'click', { ...client(V, x + dx, y + dy), button, target: wrap }) }
}

test('a press dragged 300 px left moves the board 300 px left under the pointer — the ground it was pressed on stays under it — and the map stays there on release', () => {
  const { w, v, V, wrap } = boot(), vp = V.camera3d.userData.viewport
  const x = vp.w / 2 + 200, y = vp.h / 2 + 40, from = pose(V), pressed = groundAt(V, x, y)
  drag(w, V, wrap, x, y, -300, 0, { hold: true })
  const under = groundAt(V, x - 300, y)
  assert.ok(Math.hypot(under.x - pressed.x, under.y - pressed.y) < 1, `the ground pressed on is under the pointer 300 px to the left: off by ${Math.hypot(under.x - pressed.x, under.y - pressed.y).toFixed(3)} board px`)
  assert.ok(V.camTarget.x > from.x + 100, 'the view went east: the board went left')
  assert.deepEqual({ x: V.camShown.x, y: V.camShown.y }, pose(V), 'shown as it goes, never through the glide')
  assert.equal(wrap.style.cursor, 'grabbing', 'the cursor is a grabbing hand while dragging')
  fire(wrap, 'pointerup', client(V, x - 300, y)); const put = pose(V)
  assert.notEqual(wrap.style.cursor, 'grabbing')
  w._flush(1300); v.render(); w._flush(1300)
  assert.deepEqual(pose(V), put, 'released: the map stays where it was put')
  /* the right button drags too */
  const p2 = groundAt(V, x, y); drag(w, V, wrap, x, y, 0, -150, { button: 2, hold: true })
  const u2 = groundAt(V, x, y - 150)
  assert.ok(Math.hypot(u2.x - p2.x, u2.y - p2.y) < 1, 'the right button drags the map the same way')
  fire(wrap, 'pointerup', { ...client(V, x, y - 150), button: 2 })
  v.dispose()
})

test('a press that travels less than 6 px is a click exactly as before — 3 px, and the 5 px that used to be swallowed; one that travels more is a drag and is never also a click', () => {
  const { w, v, V, seen, wrap } = boot(), vp = V.camera3d.userData.viewport
  assert.equal(POLICY.MAP_DRAG_PX, 6)
  const x = vp.w / 2, y = vp.h / 2, c = client(V, x, y)
  for (const px of [0, 3, 5]) {
    seen.length = 0; const from = pose(V)
    fire(wrap, 'pointerdown', c); if (px) fire(wrap, 'pointermove', { clientX: c.clientX + px, clientY: c.clientY })
    fire(wrap, 'pointerup', { clientX: c.clientX + px, clientY: c.clientY }); fire(wrap, 'click', { ...c, target: wrap })
    assert.deepEqual(seen.filter(e => e.kind === 'hex' || e.kind === 'unit').length, 1, `${px} px of travel: the click selects what is under it`)
    assert.deepEqual(pose(V), from, `${px} px of travel: the map does not move`)
  }
  /* 6 px and more: the map moves, and the click the browser sends after it is not a click on the board */
  seen.length = 0; const from = pose(V)
  fire(wrap, 'pointerdown', c); fire(wrap, 'pointermove', { clientX: c.clientX + 4, clientY: c.clientY }); fire(wrap, 'pointermove', { clientX: c.clientX + 9, clientY: c.clientY })
  assert.notDeepEqual(pose(V), from, 'a press that travelled 9 px moved the map')
  fire(wrap, 'pointerup', { clientX: c.clientX + 9, clientY: c.clientY }); fire(wrap, 'click', { clientX: c.clientX + 9, clientY: c.clientY, target: wrap })
  assert.deepEqual(seen.filter(e => e.kind === 'hex' || e.kind === 'unit'), [], 'and it is never also a click')
  /* the next plain click is a click again */
  fire(wrap, 'pointerdown', c); fire(wrap, 'pointerup', c); fire(wrap, 'click', { ...c, target: wrap })
  assert.equal(seen.filter(e => e.kind === 'hex' || e.kind === 'unit').length, 1)
  w._flush(0); v.dispose()
})

test('a right click still steps the plan back; a right press that drags does not', () => {
  const { w, v, V, seen, wrap } = boot(), vp = V.camera3d.userData.viewport, x = vp.w / 2, y = vp.h / 2, c = client(V, x, y)
  fire(wrap, 'pointerdown', { ...c, button: 2 }); fire(wrap, 'pointerup', { ...c, button: 2 })
  assert.deepEqual(seen.filter(e => e.kind === 'back'), [{ kind: 'back' }], 'a right click: the plan stepped back')
  seen.length = 0; const from = pose(V)
  drag(w, V, wrap, x, y, 180, 60, { button: 2 })
  assert.deepEqual(seen.filter(e => e.kind === 'back'), [], 'a right press that dragged the map does not step the plan back')
  assert.notDeepEqual(pose(V), from, 'it moved the map')
  v.dispose()
})

test('W, A, S and D move the view while held, at the edge scroll\'s speed, two at once for a diagonal — until the bound, only over the battle, never while typing', () => {
  const { w, v, V, wrap } = boot()
  const key = (type, k, extra = {}) => w.document.dispatch(type, { key: k, preventDefault() {}, ...extra })
  const frames = n => { for (let i = 0; i < n; i++) w._flush(16) }
  let c = pose(V)
  /* not over the battle and nothing of it focused: the keys are the page's */
  key('keydown', 'd'); frames(20); assert.deepEqual(pose(V), c, 'the pointer is not over the battle: D does nothing'); key('keyup', 'd')
  fire(wrap, 'pointerenter')
  key('keydown', 'd'); frames(40)
  assert.ok(V.camTarget.x > c.x + 100, 'D held: the view goes right'); assert.equal(V.camTarget.y, c.y, 'and only right')
  /* at the edge scroll's speed: 40 frames of 16 ms, less the moments it takes to come up to speed */
  const gone = V.camTarget.x - c.x, full = POLICY.EDGE_SCROLL_SPEED * .64
  assert.ok(gone > full * .8 && gone <= full + 1, `${gone.toFixed(0)} board px in 0.64 s, at ${POLICY.EDGE_SCROLL_SPEED} a second`)
  key('keyup', 'd'); c = pose(V); frames(20); assert.deepEqual(pose(V), c, 'let go: it stops')
  key('keydown', 'a'); frames(20); assert.ok(V.camTarget.x < c.x, 'A: left'); key('keyup', 'a'); c = pose(V)
  key('keydown', 's'); frames(20); assert.ok(V.camTarget.y > c.y, 'S: down'); key('keyup', 's'); c = pose(V)
  key('keydown', 'W'); frames(20); assert.ok(V.camTarget.y < c.y, 'W (a capital too): up'); key('keyup', 'W'); c = pose(V)
  /* two at once: a diagonal */
  key('keydown', 's'); key('keydown', 'd'); frames(20)
  assert.ok(V.camTarget.x > c.x && V.camTarget.y > c.y, 'S with D: down and right at once')
  key('keyup', 's'); const d1 = pose(V); frames(10); assert.ok(V.camTarget.x > d1.x && V.camTarget.y === d1.y, 'S let go: right alone'); key('keyup', 'd')
  /* until the bound */
  key('keydown', 'd'); frames(700); const stop = V.camTarget.x; frames(30)
  assert.equal(V.camTarget.x, stop, 'D held scrolls right until the bound and no further'); key('keyup', 'd')
  /* never while a field is being typed in; never with Ctrl (the browser's own) */
  c = pose(V)
  key('keydown', 'a', { target: { tagName: 'INPUT' } }); frames(10); assert.deepEqual(pose(V), c, 'typing in a field: nothing')
  key('keydown', 'a', { ctrlKey: true }); frames(10); assert.deepEqual(pose(V), c, 'Ctrl+A is the browser\'s')
  /* the pointer leaves the battle with a key down: it stops */
  key('keydown', 'a'); frames(5); fire(wrap, 'pointerleave'); c = pose(V); frames(20); assert.deepEqual(pose(V), c, 'the pointer left the battle: it stops')
  v.dispose()
})

test('the arrow keys and Q / E still turn a quarter — in about 300 ms, not the 1,100 ms glide', () => {
  const { w, v, V, wrap } = boot()
  assert.equal(POLICY.TURN_MS, 300); assert.ok(V.view.glide, 'the glide is on: a turn is shown through it')
  fire(wrap, 'pointerenter')
  const key = k => w.document.dispatch('keydown', { key: k, preventDefault() {} })
  const yaw = () => V.camShown.yaw || 0
  key('ArrowLeft')
  const target = V.camTarget.yaw
  assert.equal(Math.abs(target), 90, 'a quarter turn is asked for')
  w._flush(16); for (let i = 0; i < 8; i++) w._flush(16)                          // ~150 ms on
  assert.ok(Math.abs(yaw()) > 5 && Math.abs(yaw()) < 85, `part-way at 150 ms: ${yaw().toFixed(1)}°`)
  for (let i = 0; i < 11; i++) w._flush(16)                                       // ~320 ms on
  assert.equal(yaw(), target, 'the quarter turn is complete by about 300 ms')
  key('e'); for (let i = 0; i < 21; i++) w._flush(16)
  assert.equal(yaw(), 0, 'E turns it back, as quickly')
  /* a move that is not a turn still glides as it did */
  v.centre(Object.values(V.S.U).find(u => u.life !== 'dead').id); w._flush(16); for (let i = 0; i < 20; i++) w._flush(16)
  assert.ok(V.camAnim == null || V.camAnim.ms !== POLICY.TURN_MS, 'a centring is not hurried')
  v.dispose()
})

test('the HUD line names the ways the map moves', () => {
  const { v, V } = boot()
  if (V.dom.hud) { const words = V.dom.hud.textContent
    assert.match(words, /drag/); assert.match(words, /W A S D/); assert.match(words, /edge/); assert.match(words, /turn 90°/) }
  else assert.ok(true, 'this host shows no HUD line')
  v.dispose()
})
