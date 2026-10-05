// viewer.tutorial-overlays (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line,
// no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer start').
// Andrew: "there should be a notification message across the center that is gold and easy to see" / "the gold message doesn't
// stay up. It only lasts for a time." / "The camera zooms onto the civilians, and an arrow points at them and says
// \"Civilians.\"" / "we're going to point an arrow over at the move button" / "There are two arrows pointing at the two base
// enemy numbers." / "It points to the right and says you can see all the details about this enemy on the right."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage: the three calls the
// opening's lessons are made of — tell (the NOTICE), point (a POINTER), look (a LOOK) — drawn by the viewer, decided by the
// host. Each call is driven as a host would drive it and read back: the notice's words and that it is gone after its time, each
// pointer's target, that the pump waits while a notice asked to hold it is up, and that the view's centre is the looked-at
// unit's hex and then the earlier pose again. The sandbox's half is kingdom tools/tutorial-overlays.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
const EV = battle1.events

function boot(opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  v.push(EV); v.seek(begin + 1)
  return { w, v, V: v._V }
}
const begin = EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero')
const wrapOf = V => V.dom.stage.parentNode
const noticeOf = V => wrapOf(V).querySelector('#tutNotice')
const click = n => { for (const f of n.listeners.click) f({ stopPropagation() {} }) }
const frames = (w, ms) => { for (let t = 0; t < ms; t += 16) w._flush(16) }
const pose = V => ({ ...V.camTarget })
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })

test('the NOTICE: gold words across the centre of the board, one to three lines; it goes by itself after its time, sooner on a click or the host\'s word; one at a time', () => {
  const { w, v, V } = boot(), said = []
  assert.equal(noticeOf(V), null)
  const t = v.tell('Move next to the Zombie.', { ms: 3000, onDone: why => said.push(why) })
  const n = noticeOf(V); assert.ok(n, 'the notice is on the board'); assert.equal(n.textContent, 'Move next to the Zombie.'); assert.equal(t.ms, 3000)
  assert.equal(v.overlays.notice.lines.length, 1)
  w._flush(2900); assert.ok(noticeOf(V), 'still up within its time'); assert.deepEqual(said, [])
  w._flush(200); assert.equal(noticeOf(V), null, 'gone by itself after its time'); assert.deepEqual(said, ['time'])
  /* with no time of the host's the time grows with the words: the page's own number (camera-policy.js) */
  const short = v.tell('Attack.'), a = short.ms; short.clear()
  const long = v.tell(['Each hero moves once and acts once on its Turn.', 'Moving first is usually right: an attack ends the Turn of that hero.']), b = long.ms
  assert.ok(a >= 2000 && b > a + 4000, `a short notice ${a} ms, a long one ${b} ms`)
  assert.equal(noticeOf(V).querySelectorAll('b').length, 2, 'two lines'); assert.match(noticeOf(V).textContent, /Each hero moves once.*Moving first/)
  w._flush(b - 100); assert.ok(noticeOf(V)); w._flush(200); assert.equal(noticeOf(V), null)
  /* a click on it clears it sooner */
  said.length = 0; v.tell('Three lines?', { onDone: why => said.push(why) }); click(noticeOf(V)); assert.equal(noticeOf(V), null); assert.deepEqual(said, ['click'])
  /* the host clears it sooner; and one at a time: the next notice takes the last one's place */
  said.length = 0; v.tell('First.', { onDone: why => said.push('first ' + why) }); v.tell('Second.', { onDone: why => said.push('second ' + why) })
  assert.equal(wrapOf(V).querySelectorAll('#tutNotice').length, 1); assert.equal(noticeOf(V).textContent, 'Second.')
  assert.equal(v.clearTell(), true); assert.equal(v.clearTell(), false); assert.deepEqual(said, ['first replaced', 'second cleared'])
  /* what a notice may be: one to three lines of words, a positive time */
  for (const bad of ['', [], ['a', 'b', 'c', 'd'], ['ok', ''], 7, null]) assert.throws(() => v.tell(bad), /one to three lines/)
  assert.throws(() => v.tell('x', { ms: 0 }), /positive/)
  assert.equal(v.tell(['One.', 'Two.', 'Three.']).ms > 0, true); assert.equal(noticeOf(V).querySelectorAll('b').length, 3); v.clearTell()
  /* Law 10, 2026-10-05 - viewer.notices-gold-low-no-backdrop (engine DECISIONS.md 2026-10-05 'the playtest post answered: every notice
     gold and low ...', Andrew: "The notifications are in a very awkward spot. ... I was imagining this as gold and bright text with no
     backdrop. Also, let's drop it lower down on the screen so it's right above the bottom of the screen." - "I don't like the way it
     is for anything."). This held the notice ACROSS THE CENTRE of the board, as 2026-10-04 ruled it:
       assert.match(css, /#tutNotice\{[^}]*left:50%[^}]*transform:translate\(-50%,-50%\)/); assert.match(css, /#tutNotice b\{[^}]*color:var\(--gold\)/)
     The newer ruling moves it: the notice is still centred across the board, still gold, still large - and stands in the one stack
     of notices just above the bottom of the board, in the one lettering (tools/notices-gold-low-no-backdrop.test.mjs holds the look
     and the place whole). */
  assert.match(css, /\.hbtNotice\{[^}]*color:#ffd45e/, 'gold'); assert.match(css, /#noticeStack\{[^}]*left:50%[^}]*bottom:\d+px[^}]*transform:translateX\(-50%\)/, 'across the centre, above the bottom of the board')
  const size = +css.match(/#tutNotice b\{[^}]*font-size:(\d+)px/)[1]; assert.ok(size >= 28, 'large enough to read at a glance: ' + size + ' px')
  v.dispose()
})

test('the pump waits while a notice asked to hold it is up, and goes on when it goes; a notice that does not ask holds nothing', () => {
  const { w, v, V } = boot(); v.seek(0)
  v.play(); w._flush(40); const c0 = v.cursor; assert.ok(c0 > 0, 'the pump is playing')
  const said = []
  v.tell('Read this first.', { ms: 5000, hold: true, onDone: why => said.push(why) })
  assert.equal(v.held, true)
  w._flush(4000); assert.equal(v.cursor, c0, 'nothing plays under the notice'); assert.equal(v.playing, true, 'held is not paused')
  w._flush(1100); assert.deepEqual(said, ['time']); assert.equal(v.held, false)
  w._flush(400); assert.ok(v.cursor > c0, 'the pump goes on by itself')
  /* a click releases it as the time does */
  const c1 = v.cursor; v.tell('And this.', { hold: true }); w._flush(500); assert.equal(v.cursor, c1); click(noticeOf(V)); w._flush(400); assert.ok(v.cursor > c1)
  /* a notice with no hold: the battle runs on under it */
  const c2 = v.cursor; v.tell('Just so you know.', { ms: 4000 }); assert.equal(v.held, false); w._flush(600); assert.ok(v.cursor > c2); assert.ok(noticeOf(V))
  /* a hand step drops a hold and the notice with it, as it drops the affliction pop-up */
  v.tell('Held.', { hold: true, onDone: why => said.push(why) }); assert.equal(v.held, true); v.step(); assert.equal(v.held, false); assert.equal(noticeOf(V), null); assert.equal(said.at(-1), 'dropped')
  v.dispose()
})

test('a POINTER with the word "Zombie" sits over a named unit, follows it when it moves, and stays until cleared', () => {
  const { w, v, V } = boot()
  const zombie = Object.values(V.S.U).find(u => u.side === 'enemy')
  const p = v.point({ unit: zombie.id }, { word: 'Zombie' })
  let st = v.overlays.pointers; assert.equal(st.length, 1); assert.equal(st[0].target, 'unit:' + zombie.id); assert.equal(st[0].word, 'Zombie')
  assert.equal(st[0].node.querySelector('.tutWord').textContent, 'Zombie'); assert.ok(st[0].node.querySelector('.tutArrow'), 'an arrow')
  assert.equal(V.dom.root.querySelector('#tutLayer').querySelectorAll('.tutPtr').length, 1)
  /* a unit in view: the pointer's tip is where the camera shows its head; it tracks the camera */
  const hero = V.S.U[V.S.activeId], h = v.point({ unit: hero.id }, { word: 'You' })
  frames(w, 32); const at0 = { ...v.overlays.pointers.find(x => x.id === h.id).shown }
  v.pan(60, 0); frames(w, 1300); const at1 = { ...v.overlays.pointers.find(x => x.id === h.id).shown }
  assert.ok(at1.x < at0.x - 20, `the view moved right, the pointer left with its unit: ${at0.x.toFixed(0)} -> ${at1.x.toFixed(0)}`)
  /* it follows the unit when it moves: the log plays on to that hero's walk */
  const moved = EV.findIndex((e, i) => i > begin && e.type === 'moved' && e.actor === hero.id); assert.ok(moved > 0, 'the hero walks in the recording')
  const hex0 = hero.hex; while (v.cursor <= moved) v.step()
  assert.notEqual(V.S.U[hero.id].hex, hex0); v.render(); frames(w, 1300)
  const at2 = v.overlays.pointers.find(x => x.id === h.id).shown
  assert.ok(Math.hypot(at2.x - at1.x, at2.y - at1.y) > 10, 'the pointer went with it')
  /* stays until cleared: time passes, the battle plays, a notice comes and goes — the pointers are still there */
  v.tell('A notice.', { ms: 500 }); w._flush(5000); assert.equal(noticeOf(V), null); assert.equal(v.overlays.pointers.length, 2, 'a pointer outlasts the notice that named it')
  assert.equal(h.clear(), 1); assert.deepEqual(v.overlays.pointers.map(x => x.target), ['unit:' + zombie.id])
  /* never off the screen: this Zombie is off it (a bubble stands for it) and its pointer waits at the edge */
  const z = v.overlays.pointers[0].shown, W = 1920, H = 1080
  assert.ok(z && z.x >= 28 && z.x <= W - 28 && z.y >= 28 && z.y <= H - 28, `inside the screen: ${JSON.stringify(z)}`)
  assert.equal(p.clear(), 1); assert.equal(v.overlays.pointers.length, 0); assert.equal(V.dom.root.querySelectorAll('.tutPtr').length, 0)
  v.dispose()
})

test('pointers at the parts of the screen: an enemy\'s two numbers, its bars, the basic move\'s slot, the stamina strip, the right-hand panel, a card of the top bar, End Turn — several at once', () => {
  const { w, v, V } = boot(); v.setPlay(facts(V.S.activeId)); v.render()
  const zombie = Object.values(V.S.U).find(u => u.side === 'enemy'), E = V.layers.UEL.get(zombie.id), hero = V.S.U[V.S.activeId]
  const move = V.dom.actionbar.querySelectorAll('.acRow').find(r => r.dataset.act && V.data.KINDS[r.dataset.act] === 'move')
  const made = [
    [v.point({ unit: zombie.id, part: 'move' }), `unit:${zombie.id}:move`, E.mv],
    [v.point({ unit: zombie.id, part: 'attack' }), `unit:${zombie.id}:attack`, E.dg],
    [v.point({ unit: zombie.id, part: 'health' }, { word: 'Health' }), `unit:${zombie.id}:health`, E.hpbar],
    [v.point({ action: move.dataset.act }, { word: 'Move' }), 'action:' + move.dataset.act, move],
    [v.point({ ui: 'stamina' }), 'ui:stamina', V.dom.stambar],
    [v.point({ ui: 'panel' }, { word: 'All the details about this enemy are on the right.' }), 'ui:panel', V.dom.panel],
    [v.point({ card: hero.id }), 'card:' + hero.id, V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === hero.id)],
    [v.point({ ui: 'end-turn' }, { word: 'End Turn' }), 'ui:end-turn', V.dom.root.querySelector('#playEndTurn')],
    [v.point({ selector: '#playEndAct' }), 'selector:#playEndAct', V.dom.root.querySelector('#playEndAct')],
  ]
  frames(w, 32)
  const st = v.overlays.pointers; assert.equal(st.length, made.length, 'all at once')
  for (const [h, target, el] of made) { const p = st.find(x => x.id === h.id)
    assert.equal(h.target, target); assert.equal(p.target, target); assert.ok(el, target + ': the thing is on the page'); assert.equal(p.el, el, target + ': the pointer is on that very thing') }
  /* two pointers on one enemy's two numbers, each alone */
  assert.notEqual(made[0][2], made[1][2]); assert.equal(st.filter(p => p.target.startsWith(`unit:${zombie.id}:`)).length, 3)
  /* the panel's comes from the left and points right; a card's from below; the rest from above — and the host may say otherwise */
  const side = h => st.find(x => x.id === h.id).side
  assert.equal(side(made[5][0]), 'left'); assert.equal(side(made[6][0]), 'bottom'); assert.equal(side(made[3][0]), 'top')
  assert.match(st.find(x => x.id === made[5][0].id).node.className, /tut-left/)
  const fromRight = v.point({ ui: 'panel' }, { side: 'right' }); assert.equal(v.overlays.pointers.find(x => x.id === fromRight.id).side, 'right')
  /* the bar is redrawn (a new Activation's facts): the pointer finds the slot again */
  v.setPlay(facts(V.S.activeId)); v.render(); frames(w, 32)
  const again = V.dom.actionbar.querySelectorAll('.acRow').find(r => r.dataset.act === move.dataset.act)
  assert.equal(v.overlays.pointers.find(x => x.id === made[3][0].id).el, again, 'the slot as it is drawn now')
  /* cleared one by one or all at once; a target the screen does not know is the host's error */
  assert.equal(v.unpoint(made[0][0].id), 1); assert.equal(v.unpoint(made[0][0].id), 0); assert.equal(v.unpoint(), made.length); assert.equal(v.overlays.pointers.length, 0)
  for (const bad of [null, {}, { unit: 'zombie' }, { unit: zombie.id, part: 'feet' }, { ui: 'minimap' }, { hex: -4 }, { action: '' }]) assert.throws(() => v.point(bad), /viewer overlays/)
  assert.throws(() => v.point({ unit: zombie.id }, { side: 'up' }), /comes from/); assert.throws(() => v.point({ unit: zombie.id }, { word: ' ' }), /word/)
  assert.match(css, /#tutLayer\{[^}]*pointer-events:none/, 'the pointers take no click from the board'); assert.match(css, /\.tut-left \.tutArrow\{[^}]*border-left-color:var\(--gold\)/)
  v.dispose()
})

test('a LOOK takes the view to a unit, nearer than the play zoom, holds, and brings it back to the earlier pose; a chain of looks comes back to where it began', () => {
  const { w, v, V } = boot(); v.render()
  frames(w, 48); V.view.glide = false          // this test reads the look's order and its poses; its glide is the next test's
  const F = V.data.F, POS = V.data.POS
  const before = pose(V), said = []
  const at = (q, h) => Math.abs(q.x - POS[h].px) < .5 && Math.abs(q.y - POS[h].py) < .5
  /* the hexes a look can put at the view's very centre: all but the board's rim, where the camera stops at the board's edge
     ('the camera never shows white space') — tried one by one, each look called off */
  const order = Object.keys(POS).map(Number).sort((a, b) => Math.hypot(POS[a].px - F.w / 2, POS[a].py - F.h * .7) - Math.hypot(POS[b].px - F.w / 2, POS[b].py - F.h * .7))
  const free = order.filter(h => { const c = v.look({ hex: h }, { ms: 50 }), q = pose(V); c.cancel(); return at(q, h) })
  assert.ok(free.length >= 20, `${free.length} of ${order.length} hexes can be looked at dead centre`); assert.deepEqual(pose(V), before, 'every look called off came back')
  /* the Orphanage's units stand in the board's upper rows: a unit is stood on a hex of the board's middle for the look, as
     the fold would have it after a walk (the look reads where the unit IS) */
  const u = Object.values(V.S.U).find(x => x.side === 'hero' && x.id !== V.S.activeId) || V.S.U[V.S.activeId]
  u.hex = free[0]
  const L = v.look({ unit: u.id }, { ms: 1000, onDone: why => said.push(why) })
  assert.equal(L.hex, u.hex)
  let p = pose(V)
  assert.ok(at(p, u.hex), `the view's centre is the unit's hex: ${p.x.toFixed(1)}, ${p.y.toFixed(1)} against ${POS[u.hex].px}, ${POS[u.hex].py}`)
  assert.ok(p.zoom > before.zoom * 1.2, `nearer than the play zoom: ${p.zoom.toFixed(3)} against ${before.zoom.toFixed(3)}`); assert.equal(p.yaw, before.yaw); assert.equal(p.tilt, before.tilt)
  assert.equal(V.view.noVoid, true, 'the look keeps to the board')
  /* it holds: a redraw meanwhile does not pull the view back to the acting unit */
  v.render(); w._flush(900); assert.deepEqual(pose(V), p); assert.deepEqual(said, [])
  w._flush(200); assert.deepEqual(pose(V), before, 'and then the earlier pose again'); assert.deepEqual(said, ['back'])
  /* a chain: look, stay; look at the next; back to where the first began */
  said.length = 0
  v.look({ unit: u.id }, { ms: 300, back: false, onDone: why => said.push(why) }); w._flush(350); assert.deepEqual(said, ['held'])
  const mid = free[free.length - 1]
  v.look({ hex: mid }, { ms: 300, back: false, onDone: why => said.push(why) }); p = pose(V)
  assert.ok(at(p, mid), 'on to a hex'); w._flush(350); assert.deepEqual(said, ['held', 'held'])
  assert.equal(v.lookBack({ onDone: why => said.push(why) }), true); w._flush(20); assert.deepEqual(pose(V), before); assert.deepEqual(said, ['held', 'held', 'back'])
  assert.equal(v.lookBack(), false, 'nothing to come back from')
  /* a look at the board's corner stops at the camera's bound.
     Law 10, 2026-10-04 (viewer.camera-shows-edge-units): the comment here read 'stops at the board's edge — the camera never
     shows past it' (viewer SWITCHES lookBound); the bound is now the board's edge or as far past it as the outermost hexes
     need, so the look shows the corner hex WHOLE — tightened: the page's own slide has nothing more to do for it */
  v.look({ hex: 0 }, { ms: 100 }); p = pose(V); const box = V.view.panBox
  assert.ok(p.x >= box.x[0] - 1e-6 && p.x <= box.x[1] + 1e-6, 'inside the camera\'s own bound'); assert.equal(V.view.noVoid, true)
  assert.equal(V.revealPan(V.camTarget, 0), null, 'the corner hex is whole in the look\'s view'); w._flush(200); assert.deepEqual(pose(V), before)
  /* cancelled by the host: back at once; what a look may go to */
  const c = v.look({ unit: u.id }, { ms: 5000, onDone: why => said.push(why) }); c.cancel(); assert.deepEqual(pose(V), before); assert.equal(said.at(-1), 'cancelled')
  for (const bad of [null, {}, { unit: 9999 }, { hex: -1 }]) assert.throws(() => v.look(bad), /viewer overlays/)
  v.dispose()
})

test('a look glides as the camera\'s other moves do, and tells the host only when it is back', () => {
  const { w, v, V } = boot(); v.render(); frames(w, 100); assert.equal(V.view.glide, true)
  const u = Object.values(V.S.U).find(x => x.side === 'hero' && x.id !== V.S.activeId) || V.S.U[V.S.activeId], before = pose(V), said = []
  const shown0 = { ...V.camShown }
  v.look({ unit: u.id }, { ms: 400, onDone: why => said.push(why) })
  assert.ok(V.camAnim, 'a glide began'); assert.deepEqual({ ...V.camShown }, shown0, 'the view does not jump')
  frames(w, 1150); assert.deepEqual({ ...V.camShown }, { ...V.camTarget }, 'arrived'); assert.deepEqual(said, [])
  frames(w, 450); assert.deepEqual(pose(V), before, 'sent back after the hold'); assert.deepEqual(said, [], 'not done until the view is back')
  frames(w, 1150); assert.deepEqual({ ...V.camShown }, before); assert.deepEqual(said, ['back'])
  v.dispose()
})
