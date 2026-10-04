// viewer.arrivals-camera (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: ... the camera shows what
// arrives ...'). Andrew: "when a phase happens and enemies are introduced, the map is going to pan over to the enemies enough so
// they are on the screen. Don't center on them because they're usually on the edge and we don't want to go off the edge. For
// each side the enemies are on, we're going to go to that side. If it's on the right-hand side, we'll go over and look at the
// right-hand enemies. When we're done looking at the things that have been added, we're going to focus and center on the first
// hero that's activated." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): the pump PLAYS two
// engine logs — the Orphanage's own recording (a Zombie at the right edge at the Start of Turn 2, one at the left at Turn 3) and
// the engine's two-sided wave (tools/fixtures/arrivals-two-sides.json: both in one Turn) — and the view is read as it goes:
// each arrival's hex inside the view when its drop-in played, the view's centre never an arrival's hex, the view never off
// the board, the sides shown one after the other, the pump waiting meanwhile, and the view's centre on the first activated
// hero's hex afterwards. An arrival already on the screen moves nothing. The sandbox's half is kingdom
// tools/arrivals-camera.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const twoSides = JSON.parse(readFileSync('tools/fixtures/arrivals-two-sides.json', 'utf8'))

function boot(battle, opts = {}) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV }
}
/** where the board shows a hex on the screen — read off the stage as drawn (its CSS matrix3d), not asked of the camera */
function screenOf(V, hex) {
  const m = V.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number)
  const p = V.data.POS[hex], z = (V.data.displayHeights && V.data.displayHeights[hex]) || 0, q = [p.px, p.py, z, 1]
  const out = [0, 1, 2, 3].map(r => m[r] * q[0] + m[4 + r] * q[1] + m[8 + r] * q[2] + m[12 + r] * q[3])
  const vp = V.camera3d.userData.viewport, F = V.data.F
  return { x: out[0] / out[3] - F.w / 2 + vp.w / 2, y: out[1] / out[3] - F.h / 2 + vp.h / 2, W: vp.w, H: vp.h }
}
const insideBy = s => Math.min(s.x, s.y, s.W - s.x, s.H - s.y)
/** the battle area's view of the board's plane, as the stage is drawn: never past the camera's bound (the page's own no-void flag and its bound).
    Law 10, 2026-10-04 (viewer.camera-shows-edge-units): the bound is the board's edge, or as far past it as the outermost hexes
    need to be whole on the screen — the same check, against the bound as it now is */
const onBoard = V => { const p = V.camShown, b = V.view.panBox; return V.view.noVoid === true && p.x >= b.x[0] - .01 && p.x <= b.x[1] + .01 }
const at = (EV, type, from = 0, pred = () => true) => EV.findIndex((e, i) => i >= from && e.type === type && pred(e))
/** play the pump a frame at a time until the cursor reaches `to`, watching every frame; returns what was seen */
function playTo(w, v, V, to, watch) {
  for (let n = 0; n < 4000 && v.cursor < to; n++) { w._flush(16); watch && watch() }
  assert.ok(v.cursor >= to, `the pump reached event ${to} (it is at ${v.cursor})`)
}

test('arrivals on two sides in one Turn: each side shown in turn — left, then right — each arrival inside the view when its drop-in plays, never centred on, the view never off the board; then the first hero', () => {
  const { w, v, V, EV } = boot(twoSides)
  const wave = at(EV, 'encounter.wave'), enters = EV.map((e, i) => [e, i]).filter(([e, i]) => i > wave && e.type === 'unit.enter' && e.turn === 2).map(([e]) => e)
  assert.equal(enters.length, 2); assert.deepEqual(enters.map(e => V.data.POS[e.hex].c).sort((a, b) => a - b), [2, 17], 'one on the left side, one on the right')
  const begin = at(EV, 'activation.begin', wave), hero = EV[begin].actor
  v.seek(wave); for (let i = 0; i < 6; i++) w._flush(16)
  assert.equal(V.view.glide, true, 'the camera glides')
  /* the view over the board's middle, on a hero the player is looking at there (the camera keeps the unit looked at in view):
     both arrivals' hexes are off the screen */
  const mid = Object.values(V.S.U).filter(u => u.side === 'hero').sort((a, b) => Math.abs(V.data.POS[a.hex].c - 9.5) - Math.abs(V.data.POS[b.hex].c - 9.5))[0]
  v.inspect(mid.id); const box0 = V.view.panBox; v.pan((box0.x[0] + box0.x[1]) / 2 - V.camTarget.x, 0); for (let i = 0; i < 80; i++) w._flush(16)
  for (const e of enters) assert.ok(insideBy(screenOf(V, e.hex)) < 0, 'before: the hex it will arrive on is off the screen')
  const before = { ...V.camTarget }, xs = []; let waited = 0
  v.play()
  playTo(w, v, V, begin, () => { assert.ok(onBoard(V), 'the view never leaves the board'); xs.push(V.camShown.x); if (v.held) waited++ })
  const shown = V.arrivalsShown
  assert.deepEqual(shown.map(s => s.side), ['left', 'right'], 'the two sides one after the other, in the fixed order')
  assert.deepEqual(shown.map(s => s.id).sort(), enters.map(e => e.actor).sort(), 'each arrival dropped in once')
  for (const s of shown) {
    const hex = EV.find(e => e.type === 'unit.enter' && e.actor === s.id).hex, room = 34 + V.data.LAYOUT.W * s.pose.zoom / 2
    assert.equal(s.slid, true); assert.equal(s.inView, true, `${s.side}: no bubble stood for the arrival when its drop-in played (the camera's own notion of in view)`)
    const by = insideBy({ ...s.screen, W: 1920, H: 1080 })
    assert.ok(by > 0, `${s.side}: its hex was on the screen as drawn (${s.screen.x.toFixed(0)}, ${s.screen.y.toFixed(0)})`)
    assert.ok(Math.abs(by - room) < 3, `${s.side}: just inside — ${by.toFixed(1)} px from the edge, the room is ${room.toFixed(1)}: the least slide, not a centring`)
    assert.ok(Math.hypot(s.pose.x - V.data.POS[hex].px, s.pose.y - V.data.POS[hex].py) > 300, `${s.side}: the view's centre was not the arrival's hex`)
    assert.equal(s.pose.zoom, before.zoom); assert.equal(s.pose.yaw, before.yaw); assert.equal(s.pose.tilt, before.tilt)
  }
  assert.ok(shown[0].pose.x < before.x - 50 && shown[1].pose.x > before.x + 50, 'the view went left, then right')
  assert.ok(shown[1].at - shown[0].at >= 1000, `the left was held, then the view glided on (${shown[1].at - shown[0].at} ms between the two drop-ins)`)
  /* the glide between the sides was shown, not jumped */
  const lo = Math.min(...xs), hi = Math.max(...xs); assert.ok(xs.some(x => x > lo + (hi - lo) * .3 && x < lo + (hi - lo) * .7), 'frames part-way between the two sides')
  assert.ok(waited > 100, `the pump waited through both slides and holds (${waited} frames held)`)
  /* and afterwards the view's centre is the first activated hero's hex (across; the board's edge holds what it must) */
  playTo(w, v, V, begin + 1); v.pause(); for (let i = 0; i < 90; i++) { w._flush(16); assert.ok(onBoard(V)) }
  const hexH = EV[begin].hex, c = V.camTarget, box = V.view.panBox
  assert.equal(V.S.activeId, hero); assert.equal(V.S.U[hero].hex, hexH)
  assert.ok(Math.abs(c.x - Math.min(box.x[1], Math.max(box.x[0], V.data.POS[hexH].px))) < .5, 'centred on the first activated hero')
  assert.ok(insideBy(screenOf(V, hexH)) > 100, 'the hero is well inside the screen')
  v.dispose()
})

test('the Orphanage as recorded, Turn 2: the view slides right to the Zombie arriving on the right edge — as far as the camera may go — the Zombie drops in, and the view then centres on the hero whose Activation begins', () => {
  const { w, v, V, EV } = boot(orphanage)
  const wave = at(EV, 'encounter.wave'), enter = at(EV, 'unit.enter', wave), hexZ = EV[enter].hex, begin = at(EV, 'activation.begin', enter), hero = EV[begin].actor
  assert.equal(EV[wave].turn, 2); assert.equal(V.data.POS[hexZ].c, 19, 'the Zombie arrives on the board\'s last column')
  v.seek(wave); for (let i = 0; i < 6; i++) w._flush(16)
  v.pan(-5000, 0); for (let i = 0; i < 80; i++) w._flush(16)          // the view over the heroes, at the board's left
  const before = { ...V.camTarget }, far0 = screenOf(V, hexZ).x
  v.play(); playTo(w, v, V, begin, () => assert.ok(onBoard(V), 'every frame shows only board'))
  const shown = V.arrivalsShown; assert.equal(shown.length, 1); assert.equal(shown[0].id, EV[enter].actor); assert.equal(shown[0].side, 'right'); assert.equal(shown[0].slid, true)
  const p = shown[0].pose, box = V.view.panBox
  assert.ok(p.x > before.x + 300, `the view slid right: ${before.x.toFixed(0)} -> ${p.x.toFixed(0)}`); assert.equal(p.zoom, before.zoom); assert.equal(p.yaw, before.yaw); assert.equal(p.tilt, before.tilt)
  /* Law 10, 2026-10-04 (viewer.camera-shows-edge-units; engine DECISIONS.md 2026-10-04 'the view may slide past the board's
     edge to show a unit on an edge column', Andrew: "1 yes"): here stood the FINDING (viewer SWITCHES arrivalsEdgeColumn) —
       assert.ok(Math.abs(p.x - box.x[1]) < .01, 'as far right as the camera may go')
     — the view went to its bound and the arrival's hex on the last column stayed part off the screen. TIGHTENED to the
     item's own expect, on the Orphanage's own recording: the arrival is inside the view when its drop-in plays — its hex
     whole (the page's own slide has nothing more to do), no bubble standing for it — and the view passed the board's edge
     by no more than the bound allows */
  assert.equal(shown[0].inView, true, 'no bubble stood for the arrival when its drop-in played'); assert.equal(V.revealPan(p, hexZ), null, 'the arrival\'s whole hex is inside the view')
  { const s = shown[0].screen, vp = V.camera3d.userData.viewport, by = Math.min(s.x, s.y, vp.w - s.x, vp.h - s.y)
    assert.ok(by > V.data.LAYOUT.W * p.zoom / 2, `its hex's middle was ${by.toFixed(0)} px inside the screen when it dropped in: more than half a hex`) }
  assert.ok(p.x <= box.x[1] + .01, 'inside the camera\'s bound');
  assert.ok(shown[0].screen.x < far0 - 500, `the arrival's hex came ${Math.round(far0 - shown[0].screen.x)} px nearer`)
  assert.ok(Math.hypot(p.x - V.data.POS[hexZ].px, p.y - V.data.POS[hexZ].py) > 300, 'the view\'s centre was not the arrival\'s hex')
  /* then the hero */
  playTo(w, v, V, begin + 1); v.pause(); for (let i = 0; i < 90; i++) { w._flush(16); assert.ok(onBoard(V)) }
  const hexH = EV[begin].hex, c = V.camTarget
  assert.equal(V.S.activeId, hero); assert.ok(Math.abs(c.x - Math.min(box.x[1], Math.max(box.x[0], V.data.POS[hexH].px))) < .5, 'the view is centred on the first activated hero')
  assert.ok(insideBy(screenOf(V, hexH)) > 100, 'the hero is well inside the screen')
  v.dispose()
})

test('Turn 3: it slides left for the Zombie arriving on the left edge', () => {
  const { w, v, V, EV } = boot(orphanage)
  const wave = at(EV, 'encounter.wave', 0, e => e.turn === 3), enter = at(EV, 'unit.enter', wave), hexZ = EV[enter].hex, begin = at(EV, 'activation.begin', enter)
  assert.equal(V.data.POS[hexZ].c, 0, 'the Zombie arrives on the board\'s first column')
  v.seek(wave); for (let i = 0; i < 6; i++) w._flush(16)
  v.pan(5000, 0); for (let i = 0; i < 80; i++) w._flush(16)           // the view at the board's right, where Turn 2 left it
  const before = { ...V.camTarget }
  v.play(); playTo(w, v, V, begin, () => assert.ok(onBoard(V)))
  const shown = V.arrivalsShown; assert.equal(shown.length, 1); assert.equal(shown[0].side, 'left'); assert.equal(shown[0].slid, true)
  assert.ok(shown[0].pose.x < before.x - 300, `the view slid left: ${before.x.toFixed(0)} -> ${shown[0].pose.x.toFixed(0)}`)
  /* Law 10, 2026-10-04 (viewer.camera-shows-edge-units): was 'as far left as the camera may go' (the pose on the bound, the hex
     on the first column part off the screen) — tightened: the arrival's whole hex is inside the view, the view inside its bound */
  assert.equal(shown[0].inView, true); assert.equal(V.revealPan(shown[0].pose, hexZ), null, 'the arrival\'s whole hex is inside the view')
  assert.ok(shown[0].pose.x >= V.view.panBox.x[0] - .01, 'inside the camera\'s bound')
  v.dispose()
})

test('an arrival already on the screen moves nothing; double speed shortens the hold', () => {
  const { w, v, V, EV } = boot(twoSides)
  const wave = at(EV, 'encounter.wave'), begin = at(EV, 'activation.begin', wave)
  const right = EV.find((e, i) => i > wave && e.type === 'unit.enter' && V.data.POS[e.hex].c === 17)
  v.seek(wave); for (let i = 0; i < 6; i++) w._flush(16)
  /* the view at the board's right: the right-hand arrival's hex is on the screen already */
  v.pan(5000, 0); for (let i = 0; i < 80; i++) w._flush(16)
  assert.ok(insideBy(screenOf(V, right.hex)) > 50, 'its hex is inside the view')
  const there = { ...V.camTarget }
  v.play(); for (let i = 0; i < 4; i++) w._flush(16)
  const first = V.arrivalsShown[0]
  assert.equal(first.id, right.actor, 'it drops in at once'); assert.equal(first.slid, false); assert.deepEqual(first.pose, there, 'and the view has not moved for it')
  playTo(w, v, V, begin)
  assert.deepEqual(V.arrivalsShown.map(s => [s.side, s.slid]), [['right', false], ['left', true]], 'only the side off the screen got a slide')
  /* the same wave at 2×: the hold is shorter (the slide itself is the camera's own glide) */
  const time = speed => { const b = boot(twoSides); b.v.seek(wave); for (let i = 0; i < 6; i++) b.w._flush(16); b.v.speed(speed); let n = 0
    b.v.play(); playTo(b.w, b.v, b.V, begin, () => { n++ }); b.v.dispose(); return n }
  const slow = time(1), fast = time(2)
  assert.ok(fast < slow - 20, `2× is shorter: ${fast} frames against ${slow}`)
  v.dispose()
})

test('a hand step, a seek and the whole-board fit are not held up: the wave folds as before, and a raised or summoned unit is no wave', () => {
  const { w, v, V, EV } = boot(orphanage)
  const wave = at(EV, 'encounter.wave'), enter = at(EV, 'unit.enter', wave)
  /* stepped by hand: one event a step, no slide, nothing held */
  v.seek(wave); const before = { ...V.camTarget }
  v.step(); assert.equal(v.cursor, wave + 1); assert.equal(v.held, false); v.step(); assert.equal(v.cursor, enter + 1)
  assert.ok(V.S.U[EV[enter].actor], 'the Zombie is on the board'); assert.deepEqual({ ...V.camTarget }, before, 'a hand step slides nothing')
  /* a seek across a wave: folded, nothing held */
  v.seek(0); v.seek(enter + 5); assert.equal(v.held, false)
  /* playing, then a seek in the middle of the slide: the hold is dropped and the board is where the seek put it */
  v.seek(wave); for (let i = 0; i < 6; i++) w._flush(16); v.play(); for (let i = 0; i < 20; i++) w._flush(16)
  assert.equal(v.held, true, 'held on the slide'); v.seek(enter + 5); assert.equal(v.held, false); for (let i = 0; i < 200; i++) w._flush(16); assert.equal(v.held, false)
  /* the whole-board fit shows every arrival already: no slide, no hold */
  v.pause(); v.setZoom('fit'); v.seek(wave); v.play(); for (let i = 0; i < 10; i++) w._flush(16); assert.equal(v.held, false)
  v.pause()
  /* a unit that enters with no wave before it (a raise, a summon: no encounter named) gets the old drop-in and no slide */
  const b2 = boot(orphanage); b2.v.seek(wave); for (let i = 0; i < 6; i++) b2.w._flush(16)
  const fake = { ...EV[enter], seq: 99999, actor: 77, uid: 9077, name: 'Risen 1', arrived: undefined }; delete fake.arrived
  b2.V.EV.splice(wave, b2.V.EV.length - wave, fake)
  const cam = { ...b2.V.camTarget }; b2.v.play(); for (let i = 0; i < 60; i++) b2.w._flush(16)
  assert.ok(b2.V.S.U[77], 'it entered'); assert.equal(b2.v.held, false); assert.deepEqual({ ...b2.V.camTarget }, cam, 'no slide for a unit that is not a wave\'s')
  b2.v.dispose(); v.dispose()
})
