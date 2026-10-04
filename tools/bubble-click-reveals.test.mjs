// viewer.bubble-click-reveals (engine backlog; engine DECISIONS.md 2026-10-03 'clicking an off-screen bubble selects the unit
// and slides the screen just far enough to show its hex'). Andrew: "I should be able to click on one of the bubbles for a unit
// that's off-screen to both focus it and also scroll the screen over so they are visible, but only just to their hex. Don't
// focus on it or center the screen on it. Just slide over until they're visible." The component's half, asked of the page
// (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage (its Turn 3, since 2026-10-04 — the note at boot): a bubble at the screen's edge is a button; a click makes its unit
// the unit looked at (the panel shows it) and slides the camera — a pan only: the zoom, the turn and the tilt unchanged — the
// least distance that brings that unit's hex inside the view; the unit is not at the centre; the bubble is gone; no command
// and no play event is sent, no Activation changes. The sandbox's half is kingdom tools/bubble-click-reveals.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const EV = battle1.events

function boot(opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const offered = []
  const v = B.mount(host, data, { autoplay: false, onPlay: e => { offered.push(e); return true }, ...opts })
  /* Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the
     hero forward to the end of the bridge and bring the zombie left, maybe 3 squares"): this read
       v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
     — the battle's first hero Activation, where the old start had the Zombie on the board's last column, far off the
     screen: the unit a bubble stood for. By the ruling the Orphanage opens with everyone on the screen (that is its
     point), so the scene these tests stand on is the same recording a little later: the first hero Activation of Turn 3,
     when the Zombie that arrives at the LEFT edge — the board's first column, (0,6) — is off the screen. Every assertion
     below is unchanged; "the board's last column" in their comments reads "an edge column" (it is the first one now). */
  const SCENE = EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero' && e.turn === 3)
  assert.ok(SCENE > 0, 'the recording reaches Turn 3')
  v.push(EV); v.seek(SCENE + 1)
  return { w, v, V: v._V, offered }
}
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
const bubbles = V => V.layers.edgeL.querySelectorAll('.edgeBub')
const unitsOf = b => String(b.dataset.units).split(',').map(Number)
const pose = V => ({ ...V.camTarget })
const click = b => { for (const f of b.listeners.click) f({ stopPropagation() {} }) }
/** where the board shows a hex on the screen (the battle area's px) — read off the stage as drawn, not asked of the camera:
    the stage's CSS matrix3d (column-major; board px -> the stage's box, whose middle is the battle area's middle) */
function screenOf(V, hex) {
  const m = V.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number)
  const p = V.data.POS[hex], z = (V.data.displayHeights && V.data.displayHeights[hex]) || 0, v = [p.px, p.py, z, 1]
  const out = [0, 1, 2, 3].map(r => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3])
  const vp = V.camera3d.userData.viewport, F = V.data.F
  return { x: out[0] / out[3] - F.w / 2 + vp.w / 2, y: out[1] / out[3] - F.h / 2 + vp.h / 2, W: vp.w, H: vp.h }
}
/** how far inside the battle area's nearest edge a screen point is (negative: outside) */
const insideBy = s => Math.min(s.x, s.y, s.W - s.x, s.H - s.y)

test('a unit off the screen has a bubble, and the bubble is a button that names its units', () => {
  const { v, V } = boot(); v.render()
  /* (Law 10, 2026-10-04, as at boot: was 'the Orphanage opens with a unit off the screen') */
  const bs = bubbles(V); assert.ok(bs.length >= 1, 'at Turn 3 of the Orphanage a unit is off the screen')
  assert.ok(Object.values(V.S.U).some(u => V.data.POS[u.hex].c === 0 && bs.some(b => unitsOf(b).includes(u.id))), "the Zombie on the board's first column is behind a bubble")
  for (const b of bs) { assert.equal(b.getAttribute('role'), 'button'); assert.ok(unitsOf(b).every(id => V.S.U[id]), 'data-units names units on the board'); assert.equal(b.listeners.click.length, 1, "it takes a click") }
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  assert.match(css, /\.edgeBub\{[^}]*pointer-events:auto/, 'the bubble takes the pointer (its layer does not)'); assert.match(css, /\.edgeBub\{[^}]*cursor:pointer/)
  v.dispose()
})

test('a click selects the unit and slides the view just far enough to show its hex: a pan only, not centred, the bubble gone, nothing sent', () => {
  const { v, V, offered } = boot(); v.setPlay(facts(V.S.activeId)); v.render()
  const b = bubbles(V).find(x => unitsOf(x).length === 1); assert.ok(b, 'a bubble for one unit')
  const id = unitsOf(b)[0], u = V.S.U[id], hexAt = V.data.POS[u.hex]
  const before = pose(V), acting = V.S.activeId, cursor = v.cursor
  assert.notEqual(V.view.inspectId, id)
  assert.ok(insideBy(screenOf(V, u.hex)) < 0, 'before: its hex is off the screen as drawn')
  offered.length = 0
  click(b)
  /* 1 · the unit looked at: what a click on its body sets, and the panel shows it */
  assert.equal(V.view.inspectId, id); assert.ok(V.dom.panel.innerHTML.includes(u.name), 'the panel shows ' + u.name)
  /* 2 · nothing sent, nothing changed: no play event, the same unit acting, the same place in the log */
  assert.deepEqual(offered, [], 'no play event is offered to the host'); assert.equal(V.S.activeId, acting); assert.equal(v.cursor, cursor); assert.equal(V.play.actor, acting)
  /* 3 · a slide: the view moved, and only its centre — the zoom, the turn and the tilt are the same */
  const after = pose(V)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 1, 'the view slid')
  assert.equal(after.zoom, before.zoom); assert.equal(after.yaw, before.yaw); assert.equal(after.tilt, before.tilt)
  /* 4 · its hex is on the screen now, as the stage is drawn, and its bubble is gone. This Zombie stands on the board's LAST
     column: the camera never shows past the board's edge (viewer.camera-no-void), and at that edge the view's own edge can
     come no nearer than the hex's middle — so "on the screen" is the hex's nearer half (FOUND, viewer SWITCHES bubbleEdgeHex) */
  const s = screenOf(V, u.hex), halfHex = V.data.LAYOUT.W * after.zoom / 2
  assert.ok(insideBy(s) > -halfHex, `on the screen: ${s.x.toFixed(0)}, ${s.y.toFixed(0)} of ${s.W} × ${s.H}`)
  assert.ok(!bubbles(V).some(x => unitsOf(x).includes(id)), 'its bubble is gone')
  /* 5 · just inside, no further: near the edge it came in by, not in the middle; the view's centre is not the unit's hex */
  assert.ok(insideBy(s) < s.W / 6, `near the edge: ${insideBy(s).toFixed(0)} px in`)
  assert.ok(Math.hypot(s.x - s.W / 2, s.y - s.H / 2) > 200, 'far from the middle of the screen')
  assert.ok(Math.hypot(after.x - hexAt.px, after.y - hexAt.py) > 100, 'the view\'s centre is not the unit\'s hex')
  /* this unit stands at the board's edge: the view went no further than the board allows (the camera never shows past it),
     and a slide a twentieth short of it would show less of the hex */
  assert.equal(V.revealHex(u.hex), false, 'asked again, nothing more to slide'); assert.deepEqual(pose(V), after)
  v.dispose()
})

test('the slide is the least that shows the hex: a hex in the board\'s middle comes just inside the edge — a bubble\'s inset and half a hex — and no further', () => {
  const { v, V } = boot(); v.render()
  /* the view sent to a corner of the board, so the board's middle is off the screen */
  v.pan(-5000, -5000)
  const from = pose(V), F = V.data.F, POS = V.data.POS
  /* hexes well inside the board (the board's edge holds no slide back for them) that the view does not show */
  const inner = Object.keys(POS).map(Number).filter(h => POS[h].px > F.w * .3 && POS[h].px < F.w * .7 && POS[h].py > F.h * .3 && POS[h].py < F.h * .7 && V.revealPan(from, h))
  assert.ok(inner.length >= 3, 'hexes of the middle of the board are off the screen from the corner')
  let exact = 0
  for (const hex of inner) {
    V.view.revealed = null; v.pan(-5000, -5000); assert.deepEqual(pose(V), from)
    const least = V.revealPan(from, hex)
    assert.ok(insideBy(screenOf(V, hex)) < 34 + V.data.LAYOUT.W * from.zoom / 2, 'before: not yet inside the edge')
    assert.equal(v.revealHex(hex), true, 'the view slides')
    const to = pose(V), s = screenOf(V, hex), room = 34 + V.data.LAYOUT.W * to.zoom / 2
    assert.equal(to.zoom, from.zoom); assert.equal(to.yaw, from.yaw); assert.equal(to.tilt, from.tilt)
    assert.ok(insideBy(s) > 0, 'the hex is on the screen')
    if (V.revealPan(to, hex) !== null) continue                       // the board's edge held some of this one back
    exact++
    /* the page's least pan is what it slid … */
    assert.ok(Math.abs((to.x - from.x) - least.x) < 1 && Math.abs((to.y - from.y) - least.y) < 1, `hex ${hex}: slid ${(to.x - from.x).toFixed(1)}, ${(to.y - from.y).toFixed(1)}; the least is ${least.x.toFixed(1)}, ${least.y.toFixed(1)}`)
    /* … and, as the stage is drawn, the hex's centre sits just inside: the room from the nearest edge, to the pixel */
    assert.ok(Math.abs(insideBy(s) - room) < 2, `hex ${hex}: ${insideBy(s).toFixed(1)} px inside the nearest edge; the room is ${room.toFixed(1)}`)
    /* any less of a slide leaves it outside; and the view's centre is nowhere near the hex */
    assert.notEqual(V.revealPan({ ...to, x: to.x - (to.x - from.x) * .05, y: to.y - (to.y - from.y) * .05 }, hex), null)
    assert.ok(Math.hypot(to.x - POS[hex].px, to.y - POS[hex].py) > 100, 'not centred on it')
  }
  assert.ok(exact >= 3, `${exact} hexes were shown with nothing held back`)
  v.dispose()
})

test('the slid view stays: the next redraw does not pull it back to the acting unit; the next thing played lets the camera go again', () => {
  const { v, V } = boot(); v.setPlay(facts(V.S.activeId)); v.render()
  const b = bubbles(V).find(x => unitsOf(x).length === 1), id = unitsOf(b)[0]
  click(b)
  const slid = pose(V)
  v.render(); v.setPlay(facts(V.S.activeId)); v.render()
  assert.deepEqual(pose(V), slid, 'a redraw keeps the slid view'); assert.equal(V.view.inspectId, id)
  /* a hex already in view: clicking nothing more, a second reveal of the same hex moves nothing */
  assert.equal(V.revealHex(V.S.U[id].hex), false, 'already inside: no slide')
  assert.deepEqual(pose(V), slid)
  /* the board plays on: the hold ends */
  v.step(); v.render()
  assert.equal(V.view.revealed, null, 'the hold is over once the board plays')
  v.dispose()
})

test('a bubble for several units takes the nearest of them to the view; a slide never leaves the board', () => {
  const { v, V } = boot(); v.render()
  const live = Object.values(V.S.U).filter(u => u.life !== 'dead')
  const need = u => { const d = V.revealPan(V.camTarget, u.hex); return d ? Math.hypot(d.x, d.y) : 0 }
  /* a corner of the board from which several units are off the screen */
  let off = []
  for (const [dx, dy] of [[5000, 5000], [-5000, 5000], [5000, -5000], [-5000, -5000]]) {
    V.view.revealed = null; v.pan(dx, dy)
    off = live.filter(u => need(u) > 0).sort((a, b) => need(a) - need(b) || a.id - b.id)
    if (off.length >= 2 && need(off[0]) < need(off[off.length - 1])) break
  }
  assert.ok(off.length >= 2, 'several units are off the screen from a corner of the board')
  const [near, far] = [off[0], off[off.length - 1]]
  V.clickBubble([far.id, near.id])
  assert.equal(V.view.inspectId, near.id, `the nearest of the cluster (${near.name}, not ${far.name}) is the one looked at`)
  assert.ok(insideBy(screenOf(V, near.hex)) > -V.data.LAYOUT.W * V.camTarget.zoom / 2, 'and its hex shows')
  /* every unit, from the battle's opening view: after a click on its bubble its hex is on the screen as drawn, the zoom and
     the angle as they were, and the view shows only board (the camera's own bound holds the slide at the board's edge) */
  const start = { cam: { ...V.view.cam }, camF: { ...V.view.camF } }
  const edgeHeld = [], inside0 = {}
  for (const u of live) {
    V.view.cam = { ...start.cam }; V.view.camF = { ...start.camF }; V.view.revealed = null; v.render()
    const p0 = pose(V)
    inside0[u.id] = insideBy(screenOf(V, u.hex))
    V.clickBubble([u.id])
    const p = V.camTarget, F = V.data.F
    assert.ok(p.x >= 0 && p.x <= F.w && p.y >= 0 && p.y <= F.h, `${u.name}: the view's centre is on the board`)
    assert.equal(p.zoom, p0.zoom); assert.equal(p.yaw, p0.yaw); assert.equal(p.tilt, p0.tilt)
    /* Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start, the note at boot): the two lines here read, of EVERY unit,
         assert.ok(insideBy(screenOf(V, u.hex)) > -V.data.LAYOUT.W * p.zoom / 2, `${u.name}: its hex is on the screen after the slide (a hex of the board's last column: its nearer half)`)
         assert.ok(!bubbles(V).some(x => unitsOf(x).includes(u.id)), `${u.name}: no bubble stands for it now`)
       — true on the old scene, whose one edge unit stood on (19,3). On this scene the edge unit stands on (0,6), nearer the
       camera, where its view is narrower: the camera, which never shows past the board (viewer.camera-no-void), stops 108 px
       short of that hex — more than its nearer half (81 px) — and its bubble stays. That is the bound the item already FOUND
       (viewer SWITCHES bubbleEdgeHex, arrivalsEdgeColumn) and Andrew has since ruled away (engine DECISIONS.md 2026-10-04 'the
       view may slide past the board's edge to show a unit on an edge column' — viewer.camera-shows-edge-units, not built).
       So the rule is held as the camera can keep it today, and no looser: a unit NOT on an edge column is held to both
       lines exactly as written; a unit on an edge column is held to them too whenever the camera can bring its nearer half
       in, and otherwise to this — the view went to its bound on that side (as far as it may go), the hex came nearer than
       it was, and it is that one bound alone that keeps it out. When viewer.camera-shows-edge-units lands, the second
       branch goes and every unit is held to the two lines again. */
    const after = insideBy(screenOf(V, u.hex)), half = V.data.LAYOUT.W * p.zoom / 2, col = V.data.POS[u.hex].c, box = V.view.panBox
    const edgeColumn = col === 0 || col === V.data.POS.reduce((m, q) => Math.max(m, q.c), 0)
    const atBound = Math.abs(p.x - (col === 0 ? box.x[0] : box.x[1])) < .01
    if (after > -half || !edgeColumn) {
      assert.ok(after > -half, `${u.name}: its hex is on the screen after the slide (a hex of an edge column: its nearer half)`)
      assert.ok(!bubbles(V).some(x => unitsOf(x).includes(u.id)), `${u.name}: no bubble stands for it now`)
    } else {
      edgeHeld.push(u.name)
      assert.ok(atBound, `${u.name}, on the board's ${col === 0 ? 'first' : 'last'} column: the view went as far as the camera may go`)
      assert.ok(after > inside0[u.id], `${u.name}: its hex came nearer the screen (${Math.round(inside0[u.id])} px -> ${Math.round(after)} px)`)
      assert.ok(after > -1.5 * half, `${u.name}: and is within a hex of showing — the bound, nothing else, keeps it out`)
    }
    assert.equal(V.view.noVoid, true, 'the tactical view keeps to the board')
  }
  assert.ok(edgeHeld.length <= 1, `at most the one unit on an edge column is held by the camera's bound: ${edgeHeld.join(', ') || 'none'}`)
  v.dispose()
})

test('the slide is the camera\'s own move: it glides as the others do, and the host may ask for it by unit or by hex', () => {
  const { w, v, V } = boot(); v.setPlay(facts(V.S.activeId)); v.render()
  const run = ms => { for (let t = 0; t < ms; t += 16) w._flush(16) }
  run(100); assert.equal(V.view.glide, true, 'the camera glides once the first frames are drawn')
  const b = bubbles(V).find(x => unitsOf(x).length === 1), id = unitsOf(b)[0], from = { ...V.camShown }
  click(b)
  assert.ok(V.camAnim, 'a glide began'); assert.deepEqual({ ...V.camShown }, from, 'the view has not jumped')
  run(400); const mid = { ...V.camShown }
  assert.ok(mid.x !== from.x && mid.x !== V.camTarget.x, 'part-way there');
  run(1200); assert.deepEqual({ ...V.camShown }, { ...V.camTarget }, 'and arrives'); assert.equal(V.camAnim, null)
  /* the same slide by call (what viewer.arrivals-camera and a host use): reveal(unit), revealHex(hex) */
  const away = { ...V.camTarget }
  v.centre(V.S.activeId); run(1300); assert.notDeepEqual({ ...V.camTarget }, away)
  assert.equal(v.reveal(id), true, 'reveal(unit) slides'); assert.deepEqual({ ...V.camTarget }, away, 'to the same view the bubble\'s click slid to')
  assert.equal(v.reveal(id), false, 'and moves nothing when the unit\'s hex already shows'); assert.equal(v.reveal(9999), false, 'nor for a unit that is not there')
  v.dispose()
})
