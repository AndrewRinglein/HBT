// viewer.xcom-camera (engine backlog; engine DECISIONS.md 2026-10-01 'the XCOM-style camera'). Andrew: "I want to fully replace
// the camera with an XCOM-style camera. So no tilt, no free rotation." Expect: "no tilt or free rotation; each arrow key turns
// the view exactly 90 degrees; the wheel zooms and springs back to the standard zoom; the pointer at the screen edge scrolls;
// the first character is selected and centered at the start and the next in the bar, civilians included, after each
// activation ends; a double-click on a card or a body selects that unit; the portrait sits lower left at the ability bar's
// height; clicking an ability centers the actor; a wall or roof between camera and a character is see-through; End Turn is
// visibly smaller than End Activation." The queue itself is the host's (kingdom test/xcom-queue.test.ts); the fixed angle and
// the 90° turns are tools/true-3d-camera.test.mjs's. This asks the page (VIEWER_PAGE, else BATTLE-VIEWER.html) for the rest.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { STAND_OUT } from '../src/stand-out.js'
const A = await modules()
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'

function boot(opts = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true }, ...opts })
  v.push(battle1.events)
  return { w, v, V: v._V, seen, html }
}
const nearly = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`)
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const activations = battle1.events.map((e, i) => [e, i]).filter(([e]) => e.type === 'activation.begin')

test('the wheel looks a little nearer or farther and springs back to the standard zoom once it is still', () => {
  const { w, v, V } = boot(), wrap = V.dom.stage.parentNode
  v.seek(activations[0][1] + 1)
  assert.equal(V.view.cam.zoom, 1, 'the standard zoom')
  fire(wrap, 'wheel', { deltaY: -300 }); const near = V.view.cam.zoom
  assert.ok(near > 1, `nearer: ${near}`)
  /* Law 10 (viewer.xcom-camera-tuning, 2026-10-01): was 1.4× and .75× — Andrew: "the zoom-in and zoom-out should go a little
     bit further than the 0.75 and 1.4"; now 1.8× and .6× (the board's own limits still hold inside them) */
  for (let i = 0; i < 20; i++) fire(wrap, 'wheel', { deltaY: -300 })
  assert.ok(V.view.cam.zoom > 1.4 && V.view.cam.zoom <= 1.8 + 1e-9, `nearer than 1.4×, never nearer than 1.8×: ${V.view.cam.zoom}`)
  w._flush(300); assert.ok(V.view.cam.zoom > 1, 'still while the wheel turns (300 ms)')
  w._flush(400); assert.equal(V.view.cam.zoom, 1, 'still for 600 ms: back to the standard zoom')
  for (let i = 0; i < 20; i++) fire(wrap, 'wheel', { deltaY: 300 })
  /* Law 10 (viewer.camera-no-void, engine DECISIONS.md 2026-10-03 'the camera never shows white space', Andrew: "There's no
     reason to ever scroll into white space."): was 'farther than .75×, never past .6×' — the wheel now also stops where the
     view just fills with board; the standard zoom is POLICY.FILL_ROOM (1.25) nearer than that, so on the Orphanage the
     farthest is 1 / 1.25 of the standard, the nearer of the two limits (camera-no-void.test.mjs reads the view itself) */
  /* Law 10 (viewer.size-and-shadows-default, engine DECISIONS.md 2026-10-03 'size and shadows are the default', Andrew: "looks
     like the size change does it" · "yes"): the standard zoom is 0.9× the board's own by default (hexes 10% smaller), so the
     fill — where the wheel stops — is 1 / (1.25 × 0.9) of the standard; still never white space, never past .6×.
     was: nearly(V.view.cam.zoom, Math.max(.6, 1 / 1.25), 1e-9, …) */
  nearly(V.view.cam.zoom, Math.max(.6, 1 / (1.25 * STAND_OUT.BOARD)), 1e-9, 'farther, as far as the board fills the view (and never past .6×)')
  w._flush(700); assert.equal(V.view.cam.zoom, 1, 'and back')
  v.dispose()
})

/* Law 10 (viewer.xcom-camera-tuning, 2026-10-01): was "the pointer at the board's edge scrolls the map that way; away from the
   edge, or off the board, it stops", nearer than the fit (1.4×) and read on the board alone. Andrew: "If you point to the edge,
   you sometimes get some movement." Now at the standard zoom, read over the whole battle (its root), the screen's edge too;
   kept: the board's edges scroll their way, away from the edges it stops, out of the battle it stops */
test('the pointer at the board\'s edge, or the screen\'s, scrolls the map that way every time; away from the edges, or out of the battle, it stops', () => {
  const { w, v, V } = boot(), root = V.dom.root
  v.seek(activations[0][1] + 1)
  /* Law 10 (viewer.camera-no-void, engine DECISIONS.md 2026-10-03): the view starts at the board's middle — the first actor
     stands at the board's west edge, and the view no longer scrolls past an edge into the void ("Pointing at an edge scrolls
     the map whenever there is board beyond it"); was: from the first actor's centring */
  V.view.camF = { x: V.data.F.w / 2, y: V.data.F.h / 2 }; v.pan(0, 0)
  const at = (x, y) => fire(root, 'pointermove', { clientX: x, clientY: y })
  at(50, 50); w._flush(200)
  const mid = { ...V.view.camF }
  /* LAW 10 — 2026-10-05, viewer.edge-scroll-at-screen-edges (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth:
     … Scrolling': in the battle screen three of the board's four edges are in the middle of the screen, "so the map slides
     whenever the pointer travels to a button, and a hex in the board's outer 36 px slides away as it is pointed at" — "in the
     battle screen (a host that plays) the map scrolls only while the pointer is at the screen's own edge … the board's inner
     bands are gone there"). This test boots a host that plays, and read
       at(50, 99); w._flush(200)                                    /* the fake board is 100 px square: its bottom edge * /
       const down = { ...V.view.camF }
       assert.ok(down.y > mid.y, `the bottom edge scrolls south at the standard zoom: …`); assert.equal(down.x, mid.x, 'and only south')
       at(1, 50); w._flush(200)
       assert.ok(V.view.camF.x < down.x, 'the left edge scrolls west')
     — the board's own bottom edge scrolling the map. As the rule now stands that edge, in the middle of the screen, moves
     nothing; (1, 50) is the SCREEN's left edge as well as the board's and scrolls west as it did. The board's band on a page
     with no host is held by tools/edge-scroll-at-screen-edges.test.mjs. Everything after this stands as written. */
  at(50, 99); w._flush(200)                                    /* the fake board is 100 px square: its bottom edge, in the middle of the screen */
  const down = { ...V.view.camF }
  assert.deepEqual(down, mid, 'the board\'s own bottom edge scrolls nothing in the battle screen')
  at(1, 50); w._flush(200)
  assert.ok(V.view.camF.x < down.x, 'the left edge scrolls west')
  at(50, 50); const held = { ...V.view.camF }; w._flush(500)
  assert.deepEqual(V.view.camF, held, 'away from the edge: it stops')
  /* over the battle but off the board (the panel, the bars): the screen's right edge (the window is 1920 wide) */
  at(1915, 500); w._flush(300)
  assert.ok(V.view.camF.x > held.x, 'the screen\'s right edge scrolls east')
  const east = { ...V.view.camF }; at(1000, 500); w._flush(300)
  assert.deepEqual(V.view.camF, east, 'off the board and away from the screen\'s edge: nothing')
  at(1919, 500); fire(root, 'pointerleave', { clientX: 1919, clientY: 500 }); const out = V.view.camF.x; w._flush(200)
  assert.ok(V.view.camF.x > out, 'leaving through the screen\'s edge keeps pointing past it')
  at(1000, 500); fire(root, 'pointerleave', { clientX: 1000, clientY: 500 }); const gone = { ...V.view.camF }; w._flush(300)
  assert.deepEqual(V.view.camF, gone, 'out of the battle elsewhere: it stops')
  for (let i = 0; i < 400; i++) { at(1915, 500); w._flush(50) }
  /* Law 10 (viewer.camera-no-void): was 'until the board's edge is in the middle' (camF.x = F.w) — now until the board's edge
     meets the view's (camera-no-void.test.mjs measures that edge), well short of the middle, and no further */
  const stop = V.view.camF.x; for (let i = 0; i < 20; i++) { at(1915, 500); w._flush(50) }
  assert.equal(V.view.camF.x, stop, 'held at the edge it scrolls until the board\'s edge meets the view\'s, and no further')
  assert.ok(stop > east.x && stop < V.data.F.w - 300, `short of bringing the board's edge to the middle: ${stop} of ${V.data.F.w}`)
  v.dispose()
})

test('a new activation centres the map on the one acting; a click on another unit does not move it', () => {
  const { v, V } = boot()
  v.zoom(1.4)
  /* an activation whose actor stands where the bound lets the view centre on it */
  let checked = 0
  for (const [e, i] of activations) {
    v.seek(i + 1); const p = V.data.POS[V.S.U[e.actor].hex]
    assert.equal(V.view.centredOn, e.actor, `activation ${i}: the camera took its actor`)
    if (Math.abs(V.camTarget.x - p.px) < 1e-6 && Math.abs(V.camTarget.y - p.py) < 1e-6) checked++
  }
  assert.ok(checked > 0, 'at least one actor centred exactly (the rest as near as the board allows)')
  const f0 = { ...V.view.camF }, other = Object.values(V.S.U).find(u => u.id !== V.S.activeId && u.life !== 'dead')
  v.inspect(other.id); assert.deepEqual(V.view.camF, f0, 'looking at another unit already in view does not move the camera')
  v.centre(other.id); const q = V.data.POS[other.hex]
  /* Law 10, combine 2026-10-04 (viewer master cf11722 — viewer.camera-shows-edge-units — with this copy's engine
     fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 'the view may slide past the board's edge to show a unit on
     an edge column': "the least that shows it, never more"): this read
       assert.ok(Math.hypot(V.camTarget.x - q.px, V.camTarget.y - q.py) < Math.hypot(f0.x - q.px, f0.y - q.py) + 1e-9, 'the host\'s centre brings it to the middle')
     — "nearer than the view was", a measure against wherever the view stood before. On the closer start's recording the
     last Activation leaves the view PAST the board's top edge (its actor's hex needs it), and the unit centred on next —
     a Zombie on row 1 — needs less of that: the view comes back toward the board, which is further from the Zombie than it
     was and is the rule. The line's claim is held against the board instead of against the last view: the centre is at
     least as near the unit as the board's own bound lets a view come, it is inside the camera's one bound, and across the
     board — where no edge is in the way — it is the unit's own column exactly. */
  { const B = V.cameraBound(), clamp = (x, [a, b]) => Math.min(b, Math.max(a, x)), c = V.camTarget
    assert.ok(Math.hypot(c.x - q.px, c.y - q.py) <= Math.hypot(clamp(q.px, B.own.x) - q.px, clamp(q.py, B.own.y) - q.py) + 1e-6, 'the host\'s centre brings it to the middle: as near as the board lets the view come, or nearer')
    assert.ok(c.x >= B.bound.x[0] - 1e-6 && c.x <= B.bound.x[1] + 1e-6 && c.y >= B.bound.y[0] - 1e-6 && c.y <= B.bound.y[1] + 1e-6, 'inside the camera\'s one bound')
    if (q.px >= B.own.x[0] && q.px <= B.own.x[1]) assert.ok(Math.abs(c.x - q.px) < 1e-6, 'across the board, exactly on the unit') }
  v.dispose()
})

test('the portrait in the lower-left corner is whose bar it is, as tall as the ability bar; End activation is the large button, End Turn the small one', () => {
  const { v, V, html } = boot()
  v.seek(activations[0][1] + 1)
  const P = V.dom.root.querySelector('#unitPortrait'), u = V.S.U[V.S.activeId]
  assert.ok(P, 'the portrait'); assert.notEqual(P.style.display, 'none', 'shown')
  assert.equal(P.querySelector('img').getAttribute('src'), V.data.ASSETS[V.data.ARTMAP[u.typeId].card], 'the acting unit\'s card')
  const enemy = Object.values(V.S.U).find(x => x.side === 'enemy')
  /* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the action bar and its card stay with the activated unit':
     "That portrait is next to all of the abilities ... While that unit is activated, those abilities just stay there"): for
     a host that plays, the card stays the acting unit's while an enemy is looked at; was: the card of the unit looked at —
     assert.equal(src, the enemy's card, 'the unit looked at'); assert.equal(P.className, 'enemy') */
  v.inspect(enemy.id); assert.equal(P.querySelector('img').getAttribute('src'), V.data.ASSETS[V.data.ARTMAP[u.typeId].card], "the acting unit's card, whoever is looked at"); assert.equal(V.view.inspectId, enemy.id)
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  /* Law 10, viewer.bar-card-and-log (engine DECISIONS.md 2026-10-03 'the hero card sits small, left of the action bar': "This small
     hero card should be smaller, and it should be to the left of the move"): still lower left, now in the bar's row and smaller,
     no taller than the bar (tools/bar-card-and-log.test.mjs holds the sizes); was: over the board's corner, as tall as the bar —
     assert.match(css, /#unitPortrait\{position:absolute;left:0;bottom:0;height:256px;/, 'lower left, 256 px tall') */
  assert.equal(P.parentNode.id, 'barrow', 'lower left, in the ability bar\'s row')
  assert.ok(+/#unitPortrait\{[^}]*;height:(\d+)px/.exec(css)[1] <= 256, 'no taller than the ability bar')
  assert.match(css, /#actionbar\{height:256px;/, 'the ability bar is 256 px tall')
  const size = id => +new RegExp(`#playEnds ${id}\\{[^}]*font-size:(\\d+)px`).exec(css)[1], grow = id => +new RegExp(`#playEnds ${id}\\{flex:(\\d+)`).exec(css)?.[1] || 0
  assert.ok(size('#playEndAct') >= 1.5 * size('#playEndTurn'), `End activation's type is far larger: ${size('#playEndAct')} vs ${size('#playEndTurn')}`)
  assert.ok(grow('#playEndAct') > grow('#playEndTurn'), 'and it takes the room')
  assert.equal(V.dom.root.querySelector('#camBar'), null, 'no camera bar')
  v.dispose()
})

test('a double-click on a body offers that unit to the host to act next; an ability click centres the one acting', () => {
  const { v, V, seen } = boot(), wrap = V.dom.stage.parentNode
  v.seek(activations[0][1] + 1)
  V.data.displayHeights = A.paintedHeights(V.data.atlas); v.render()
  v.setPlay({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
  const cam = V.camera3d, inv = A.paintedToCSS(V.data.atlas).invert()
  const u = Object.values(V.S.U).find(x => x.side === 'hero' && x.life === 'standing' && x.id !== V.S.activeId) || V.S.U[V.S.activeId]
  const E = V.layers.UEL.get(u.id), f = { x: V.data.POS[u.hex].px, y: V.data.POS[u.hex].py + V.data.LAYOUT.H * .28 }, z = V.data.displayHeights[u.hex] + parseFloat(E.img.style.height) / 2
  const p = new THREE.Vector3(f.x, f.y, z).applyMatrix4(inv).project(cam), vp = cam.userData.viewport
  const at = { clientX: (p.x + 1) / 2 * vp.w * 100 / 1920, clientY: (1 - p.y) / 2 * vp.h * 100 / 1080, target: wrap }
  seen.length = 0; fire(wrap, 'dblclick', at)
  assert.deepEqual(seen.at(-1), { kind: 'choose', id: u.id }, 'the double-clicked body is offered')
  /* the ability bar: its row offers the slot, and the map centres on whose bar it is */
  v.zoom(1.4); v.pan(400, 300)
  const row = V.dom.actionbar.querySelectorAll('.acRow').find(r => r.dataset.act)
  const who = V.S.U[V.S.activeId], before = Math.hypot(V.camTarget.x - V.data.POS[who.hex].px, V.camTarget.y - V.data.POS[who.hex].py)
  V.view.inspectId = null; v.render(); seen.length = 0
  fire(row, 'click')
  assert.equal(seen.at(-1)?.kind, 'slot', 'the ability is offered')
  const after = Math.hypot(V.camTarget.x - V.data.POS[who.hex].px, V.camTarget.y - V.data.POS[who.hex].py)
  assert.ok(after < before, `and the map comes back to the one acting: ${before.toFixed(0)} -> ${after.toFixed(0)} px`)
  v.dispose()
})

test('a solid piece of the scene between the camera and a body is see-through, the ground never, and solid again once it hides nothing', () => {
  const g = new THREE.Group(), stone = new THREE.MeshStandardMaterial()
  const ground = new THREE.Mesh(new THREE.BoxGeometry(20, .2, 20), stone); ground.position.y = -.1
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, .3), stone); wall.position.set(0, 1.5, 2)
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial({ transparent: true })); leaves.position.set(-6, 2, 2)
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: .6 })); fire.position.set(0, 1.5, 4)
  g.add(ground, wall, leaves, fire)
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 100); cam.position.set(0, 4, 8); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true)
  const body = x => [{ feet: 0, at: new THREE.Vector3(x, 1, 0) }, { feet: 0, at: new THREE.Vector3(x, 1.6, 0) }]
  const faded = new Map()
  assert.equal(A.seeThrough(g, cam, body(0), faded), true, 'something changed')
  assert.deepEqual([...faded.keys()], [wall], 'the wall in front is see-through; the ground under the body is not, nor the fire the scene draws see-through')
  assert.equal(wall.material.opacity, A.SEE_THROUGH); assert.equal(wall.material.transparent, true); assert.notEqual(wall.material, stone, 'its own copy: the ground sharing its material stays solid')
  assert.equal(ground.material, stone)
  assert.equal(A.seeThrough(g, cam, body(0), faded), false, 'the same view: nothing to change')
  A.seeThrough(g, cam, body(-6.4), faded)
  assert.equal(wall.material, stone, 'the body gone from behind it: the wall is solid again, its own material back')
  assert.ok(faded.has(leaves), 'leaves in front of a body are see-through too')
})
