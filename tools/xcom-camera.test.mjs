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
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true }, ...opts })
  v.push(battle1.events)
  return { w, v, V: v._V, seen, html }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const activations = battle1.events.map((e, i) => [e, i]).filter(([e]) => e.type === 'activation.begin')

test('the wheel looks a little nearer or farther and springs back to the standard zoom once it is still', () => {
  const { w, v, V } = boot(), wrap = V.dom.stage.parentNode
  v.seek(activations[0][1] + 1)
  assert.equal(V.view.cam.zoom, 1, 'the standard zoom')
  fire(wrap, 'wheel', { deltaY: -300 }); const near = V.view.cam.zoom
  assert.ok(near > 1, `nearer: ${near}`)
  for (let i = 0; i < 20; i++) fire(wrap, 'wheel', { deltaY: -300 })
  assert.ok(Math.abs(V.view.cam.zoom - 1.4) < 1e-9, `never nearer than 1.4×: ${V.view.cam.zoom}`)
  w._flush(300); assert.ok(V.view.cam.zoom > 1, 'still while the wheel turns (300 ms)')
  w._flush(400); assert.equal(V.view.cam.zoom, 1, 'still for 600 ms: back to the standard zoom')
  for (let i = 0; i < 20; i++) fire(wrap, 'wheel', { deltaY: 300 })
  assert.ok(V.view.cam.zoom < 1 && V.view.cam.zoom >= .75 - 1e-9, `farther, never past .75×: ${V.view.cam.zoom}`)
  w._flush(700); assert.equal(V.view.cam.zoom, 1, 'and back')
  v.dispose()
})

test('the pointer at the board\'s edge scrolls the map that way; away from the edge, or off the board, it stops', () => {
  const { w, v, V } = boot(), wrap = V.dom.stage.parentNode
  v.seek(activations[0][1] + 1); v.zoom(1.4)                      /* nearer than the fit, so the bound lets the view roam */
  fire(wrap, 'pointerenter'); fire(wrap, 'pointermove', { clientX: 50, clientY: 50 }); w._flush(200)
  const mid = { ...V.view.camF }
  fire(wrap, 'pointermove', { clientX: 50, clientY: 99 }); w._flush(200)       /* the fake wrap is 100 px square: the bottom edge */
  const down = { ...V.view.camF }
  assert.ok(down.y > mid.y, `the bottom edge scrolls south: ${mid.y} -> ${down.y}`); assert.equal(down.x, mid.x, 'and only south')
  fire(wrap, 'pointermove', { clientX: 1, clientY: 50 }); w._flush(200)
  assert.ok(V.view.camF.x < down.x, 'the left edge scrolls west')
  fire(wrap, 'pointermove', { clientX: 50, clientY: 50 }); const held = { ...V.view.camF }; w._flush(500)
  assert.deepEqual(V.view.camF, held, 'away from the edge: it stops')
  fire(wrap, 'pointermove', { clientX: 99, clientY: 50 }); fire(wrap, 'pointerleave'); const left = { ...V.view.camF }; w._flush(500)
  assert.deepEqual(V.view.camF, left, 'off the board: it stops')
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
  assert.ok(Math.hypot(V.camTarget.x - q.px, V.camTarget.y - q.py) < Math.hypot(f0.x - q.px, f0.y - q.py) + 1e-9, 'the host\'s centre brings it to the middle')
  v.dispose()
})

test('the portrait in the lower-left corner is whose panel it is, as tall as the ability bar; End activation is the large button, End Turn the small one', () => {
  const { v, V, html } = boot()
  v.seek(activations[0][1] + 1)
  const P = V.dom.root.querySelector('#unitPortrait'), u = V.S.U[V.S.activeId]
  assert.ok(P, 'the portrait'); assert.notEqual(P.style.display, 'none', 'shown')
  assert.equal(P.querySelector('img').getAttribute('src'), V.data.ASSETS[V.data.ARTMAP[u.typeId].card], 'the acting unit\'s card')
  const enemy = Object.values(V.S.U).find(x => x.side === 'enemy')
  v.inspect(enemy.id); assert.equal(P.querySelector('img').getAttribute('src'), V.data.ASSETS[V.data.ARTMAP[enemy.typeId].card], 'the unit looked at'); assert.equal(P.className, 'enemy')
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  assert.match(css, /#unitPortrait\{position:absolute;left:0;bottom:0;height:256px;/, 'lower left, 256 px tall')
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
