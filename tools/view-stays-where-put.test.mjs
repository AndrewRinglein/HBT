// viewer.view-stays-where-put (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … the view
// goes back to the acting unit' — Andrew: "It's awkward to try to roll the map around … Things are not on the screen."). Found
// on the Bridge: after the player scrolls the view away from the acting unit, the next thing that draws the board again — one
// notch of the wheel, a click on any unit or on its card (which only looks at it), the 3D scene finishing its load — ran the
// camera's rule that keeps the activated unit in view and brought the view straight back. Ruled 2026-10-01: "You can look at
// different parts of the map by just looking around on the map".
// Wanted: once the player has moved the view it stays where the player put it — through re-draws, zooming, clicks that look
// at a unit, clicks on hexes, choosing an action, the scene's load — until the game itself has reason to move it: a new
// Activation begins (it centres, as now), the game plays something that is off the screen (an attack's two ends, as now), or
// the player asks.
// The page (VIEWER_PAGE, else BATTLE-VIEWER.html) playing the Bridge's recording, driven as a player drives it: the pointer at
// the screen's edge, the wheel, clicks. The kingdom's half is ../kingdom/tools/view-stays-where-put.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const bridge = JSON.parse(readFileSync('battles/test.opening-bridge.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'

function boot(opts = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = bridge.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: bridge.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: bridge.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true }, ...opts })
  v.push(bridge.events)
  return { w, v, V: v._V, seen }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const activations = bridge.events.map((e, i) => [e, i]).filter(([e]) => e.type === 'activation.begin')
const pose = V => ({ x: V.camTarget.x, y: V.camTarget.y })
const far = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
/** the player scrolls: the pointer held at the screen's right edge (the fake window is 1920 wide) until the view has gone `px` */
function scrollAway(w, V, px = 900) {
  const root = V.dom.root, from = pose(V)
  for (let i = 0; i < 400 && far(pose(V), from) < px; i++) { fire(root, 'pointermove', { clientX: 1915, clientY: 500 }); w._flush(50) }
  fire(root, 'pointermove', { clientX: 1000, clientY: 500 }); w._flush(1300)        // away from the edge: the scroll stops, a glide ends
  return far(pose(V), from)
}
/** is this hex whole on the screen from where the view stands? (the camera's own reading: nothing to slide to show it) */
const inView = (V, hex) => V.revealPan(V.camTarget, hex) === null

test('the view the player scrolled away stays there through a redraw, the scene\'s load and a look at another unit — the acting unit left off the screen', () => {
  const { w, v, V } = boot()
  v.seek(activations[0][1] + 1); w._flush(1300)
  const actor = V.S.U[V.S.activeId]
  assert.ok(inView(V, actor.hex), 'the Activation opens on the one acting')
  const gone = scrollAway(w, V)
  assert.ok(gone > 600, `scrolled ${gone.toFixed(0)} px away`)
  assert.ok(!inView(V, actor.hex), 'the acting unit is off the screen')
  const put = pose(V)
  v.render(); w._flush(1300)
  assert.deepEqual(pose(V), put, 'a redraw of the board: the view is where the player put it')
  /* the 3D scene finishing its load draws the board again (terrain3d.js ready -> V.render) */
  V.render(); w._flush(1300); assert.deepEqual(pose(V), put, 'the scene\'s load')
  const other = Object.values(V.S.U).find(u => u.id !== V.S.activeId && u.life !== 'dead')
  v.inspect(other.id); w._flush(1300)
  assert.deepEqual(pose(V), put, 'a click that looks at another unit (its card, its body): its panel shows and the view does not move')
  assert.equal(V.view.inspectId, other.id)
  v.inspect(null); w._flush(1300); assert.deepEqual(pose(V), put)
  assert.ok(!inView(V, actor.hex), 'and the acting unit is still off the screen')
  v.dispose()
})

test('a notch of the wheel zooms where the view is: the centre stays, the acting unit stays off the screen, and the zoom\'s spring does not bring it back', () => {
  const { w, v, V } = boot()
  v.seek(activations[0][1] + 1); w._flush(1300)
  const actor = V.S.U[V.S.activeId]
  scrollAway(w, V); const put = pose(V), zoom = V.camTarget.zoom
  fire(V.dom.stage.parentNode, 'wheel', { deltaY: -300 }); w._flush(200)
  assert.ok(V.view.cam.zoom > 1, 'the wheel looked nearer')
  assert.ok(far(pose(V), put) < 1, `about the view's own centre: moved ${far(pose(V), put).toFixed(2)} px`)
  assert.ok(!inView(V, actor.hex), 'the acting unit stays off the screen')
  w._flush(2500)                                                                 // the wheel still: the zoom springs back
  assert.ok(far(pose(V), put) < 1, 'the zoom back at the standard: the view still where the player put it')
  assert.ok(Math.abs(V.camTarget.zoom - zoom) < 1e-6)
  v.dispose()
})

test('pointing at hexes and clicking one does not move it; a turn is about the view\'s own centre', () => {
  const { w, v, V, seen } = boot()
  v.seek(activations[0][1] + 1); w._flush(1300)
  scrollAway(w, V); const put = pose(V)
  const root = V.dom.root
  for (const [x, y] of [[700, 400], [760, 430], [820, 380]]) { fire(root, 'pointermove', { clientX: x, clientY: y }); w._flush(60) }
  assert.deepEqual(pose(V), put, 'pointing at hexes')
  fire(root, 'pointerdown', { clientX: 760, clientY: 430 }); fire(root, 'pointerup', { clientX: 760, clientY: 430 }); fire(root, 'click', { clientX: 760, clientY: 430 }); w._flush(300)
  assert.deepEqual(pose(V), put, 'clicking one')
  v.turn(90); w._flush(1300)
  assert.ok(far(pose(V), put) < 1, 'a quarter turn: about the centre the player put the view at')
  assert.equal(((V.camTarget.yaw % 360) + 360) % 360, 90)
  void seen
  v.dispose()
})

test('the game moves it when it has reason to: a new Activation centres on the one that begins; the player\'s own centre does; Reset does', () => {
  const { w, v, V } = boot()
  v.seek(activations[0][1] + 1); w._flush(1300)
  scrollAway(w, V)
  /* the next Activation of another unit */
  const next = activations.find(([e]) => e.actor !== V.S.activeId)
  v.seek(next[1] + 1); w._flush(1300)
  assert.equal(V.view.centredOn, next[0].actor, 'the camera took the one that begins')
  assert.ok(inView(V, V.S.U[next[0].actor].hex), 'and it is on the screen')
  /* put away again, then asked for by the player */
  scrollAway(w, V); assert.ok(!inView(V, V.S.U[V.S.activeId].hex))
  v.centre(V.S.activeId); w._flush(1300)
  assert.ok(inView(V, V.S.U[V.S.activeId].hex), 'the player asks for a unit: the view goes to it')
  /* the view is the game's again: a redraw keeps the unit in sight by its own rule (a few px for its head and its hex), as it always did */
  const there = pose(V); v.render(); w._flush(1300); assert.ok(far(pose(V), there) < 20 && inView(V, V.S.U[V.S.activeId].hex), `a redraw after it: ${far(pose(V), there).toFixed(1)} px`)
  scrollAway(w, V); const away = pose(V)
  v.resetView(); w._flush(1300)
  assert.ok(far(pose(V), away) > 100, 'Reset takes the view back to where the battle opened')
  v.dispose()
})

test('an attack on a unit off the screen brings both its ends into view, as it always did — and the view then stays there', () => {
  const { w, v, V } = boot()
  /* the first attack whose two ends are far enough apart from the screen's edge to matter: seek to just before it is drawn */
  let checked = 0
  for (let i = activations[0][1] + 1; i < bridge.events.length && checked < 3; i++) {
    v.seek(i); w._flush(1300)
    if (V.S.AIM) continue
    v.seek(i + 1); w._flush(50)
    if (!V.S.AIM) continue
    const aim = { ...V.S.AIM }
    v.seek(i); w._flush(1300)                                                    // back to just before it, nothing aimed
    scrollAway(w, V)
    if (inView(V, aim.from) && inView(V, aim.to)) continue                        // this one is still on the screen from there
    const put = pose(V)
    v.seek(i + 1); w._flush(1300)
    assert.ok(V.S.AIM, 'the attack is drawn')
    assert.ok(far(pose(V), put) > 1, 'the view moved for it')
    assert.ok(inView(V, aim.from) || inView(V, aim.to), 'toward its ends')
    checked++
  }
  assert.ok(checked > 0, 'an attack with an end off the screen was found in the Bridge\'s recording')
  v.dispose()
})
