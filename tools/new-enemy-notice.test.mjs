// viewer.new-enemy-notice (engine backlog; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line,
// no map before battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer start').
// Andrew: "If a new enemy is introduced there is going to be a notification: \"New enemy\" and their name." — asked whether
// every time or the first time: "To first time". The component's half, asked of the page (VIEWER_PAGE, else
// BATTLE-VIEWER.html) on the engine's own recordings: the host hands the kinds to announce (the viewer never decides what is
// new); the first time a unit of such a kind is on the board the view shows it and a gold notice reads "New enemy" with the
// unit sheet's name beneath — for a kind that arrives, while the arrivals camera is on its side; for a kind on the board at
// the start, before the first hero is activated; one notice per kind however many of it there are; none for a kind not
// handed over; none at all with nothing handed (the replay page), on a hand step or on a seek. The host hears each kind as
// it is shown, once. The run's half is kingdom test/new-enemy-notice.test.ts and tools/new-enemy-notice.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const recording = n => JSON.parse(readFileSync(`battles/test.opening-${n}.json`, 'utf8'))
const lumberjack = recording('lumberjack'), bridge = recording('bridge'), cavern = recording('cavern-trail')

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
  const shown = []
  const v = B.mount(host, data, { autoplay: false, onNewEnemy: typeId => shown.push(typeId), ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L, shown }
}
const at = (EV, type, from = 0, pred = () => true) => EV.findIndex((e, i) => i >= from && e.type === type && pred(e))
const notice = v => v.overlays.notice
const said = v => notice(v) ? notice(v).lines : null
/** play the pump a frame at a time until the cursor reaches `to`, noting every notice that stands (by its words, once) and what the board was when it first stood */
function playTo(w, v, V, to, seen = []) {
  let last = null
  for (let n = 0; n < 60000 && v.cursor < to; n++) { w._flush(16)
    const s = said(v), key = s ? s.join(' / ') : null
    if (key && key !== last) seen.push({ lines: s, cursor: v.cursor, held: v.held, units: Object.values(V.S.U).map(u => u.id), pose: { ...V.camTarget }, shownIds: (V.arrivalsShown || []).map(a => a.id) })
    last = key }
  assert.ok(v.cursor >= to, `the pump reached event ${to} (it is at ${v.cursor})`)
  return seen
}
const nameOf = (L, typeId) => L.static.units[typeId].name
const turnBegin = (EV, n) => at(EV, 'turn.begin', 0, e => e.turn === n)

test('a kind that arrives: battle 2\'s Turn 2 shows "New enemy" over the Skeleton Archer while the view is on the arriving archer — once, though more archers come on Turn 3', () => {
  const { w, v, V, EV, L, shown } = boot(lumberjack, { newEnemies: ['unit.skeletal-archer'] })
  const wave2 = at(EV, 'encounter.wave', 0, e => e.turn === 2), wave3 = at(EV, 'encounter.wave', 0, e => e.turn === 3)
  const archer = EV.find((e, i) => i > wave2 && e.type === 'unit.enter' && e.typeId === 'unit.skeletal-archer')
  assert.ok(archer && archer.turn === 2, 'the engine\'s recording brings a Skeleton Archer on Turn 2'); assert.equal(EV.filter(e => e.type === 'unit.enter' && e.typeId === 'unit.skeletal-archer' && e.turn === 3).length, 2, 'and two more on Turn 3')
  v.seek(turnBegin(EV, 1) + 1); v.speed(4); v.play()
  /* Turn 1: the Zombie on the board is not a kind handed over — nothing is said */
  let seen = playTo(w, v, V, wave2)
  assert.deepEqual(seen, [], 'no notice for a kind the host did not hand over (the Zombie)'); assert.deepEqual(shown, [])
  /* Turn 2: the archer arrives */
  seen = playTo(w, v, V, at(EV, 'activation.begin', wave2))
  assert.equal(seen.length, 1, 'one notice'); const N = seen[0]
  assert.deepEqual(N.lines, ['New enemy', nameOf(L, 'unit.skeletal-archer')], 'its two lines: "New enemy", and the unit sheet\'s name beneath'); assert.equal(nameOf(L, 'unit.skeletal-archer'), 'Skeleton Archer')
  assert.equal(N.held, true, 'the pump waits while it stands'); assert.ok(N.units.includes(archer.actor), 'the archer is on the board')
  assert.ok(N.shownIds.includes(archer.actor), 'its drop-in has played: the view is on its side'); assert.equal(V.revealPan(N.pose, archer.hex), null, 'and the archer\'s hex is in that view')
  assert.deepEqual(shown, ['unit.skeletal-archer'], 'the host is told the kind was shown')
  assert.equal(said(v), null, 'the notice went by itself'); assert.equal(v.held, false)
  /* Turn 3: two more archers — no second notice */
  seen = playTo(w, v, V, at(EV, 'activation.begin', wave3))
  assert.deepEqual(seen, [], 'more of a kind already shown: nothing'); assert.deepEqual(shown, ['unit.skeletal-archer'])
  v.pause(); v.dispose()
})

test('a kind on the board when the battle begins: battle 3 opens by showing "New enemy" over the Imp before the first hero is activated — one notice for all the Imps — then centres on the hero; the Fire Imp is named when it arrives', () => {
  const { w, v, V, EV, L, shown } = boot(bridge, { newEnemies: ['unit.imp', 'unit.fire-imp'] })
  const imps = Object.values(V.S.U).filter(u => u.typeId === 'unit.imp'); assert.ok(imps.length >= 3, 'the Bridge opens with ' + imps.length + ' Imps')
  const begin = at(EV, 'activation.begin'), hero = EV[begin].actor
  v.seek(turnBegin(EV, 1) + 1); v.play()
  const first = []
  for (let n = 0; n < 4000 && !said(v); n++) w._flush(16)
  assert.deepEqual(said(v), ['New enemy', nameOf(L, 'unit.imp')]); assert.equal(nameOf(L, 'unit.imp'), 'Imp')
  assert.ok(v.cursor <= begin, 'it stands before the first hero is activated'); assert.equal(V.S.activeId, null); assert.equal(v.held, true)
  /* the view has slid to an Imp: the least-distance slide, so its hex is in the view */
  const target = imps.find(u => V.revealPan(V.camTarget, u.hex) === null); assert.ok(target, 'an Imp\'s hex is in the view the notice stands over')
  assert.deepEqual(shown, ['unit.imp'])
  const over = { ...V.camTarget }
  playTo(w, v, V, begin + 1, first)
  assert.deepEqual(first.map(s => s.lines.join(' / ')).filter(x => x !== 'New enemy / Imp'), [], 'one notice for the kind, however many Imps there are')
  assert.equal(V.S.activeId, hero, 'then the first hero is activated')
  for (let i = 0; i < 120; i++) w._flush(16)
  /* and the view goes to that hero: its hex is in the view (the camera's own centring on the unit acting, kept to the board),
     and the view is no longer where the notice stood */
  const u = V.S.U[hero]; assert.equal(V.revealPan(V.camTarget, u.hex), null, 'the hero\'s hex is in the view')
  assert.equal(V.view.revealed, null, 'the slide\'s hold is over'); assert.ok(Math.hypot(V.camTarget.x - over.x, V.camTarget.y - over.y) > 1, 'the view left the Imp')
  /* Turn 2: the Fire Imp arrives — its own notice; the Imps that come on Turn 4 get none */
  const wave2 = at(EV, 'encounter.wave', 0, e => e.turn === 2), wave4 = at(EV, 'encounter.wave', 0, e => e.turn === 4)
  v.speed(4)
  const later = playTo(w, v, V, at(EV, 'activation.begin', wave4))
  assert.deepEqual(later.map(s => s.lines), [['New enemy', nameOf(L, 'unit.fire-imp')]], 'the Fire Imp on Turn 2, and nothing for Turn 4\'s Imps')
  assert.ok(later[0].cursor > wave2 && later[0].cursor < wave4)
  assert.deepEqual(shown, ['unit.imp', 'unit.fire-imp'], 'each kind told to the host once, in the order shown')
  v.pause(); v.dispose()
})

test('one notice for a kind though four of it arrive at once; two kinds on the board at the start are each named in turn', () => {
  const { w, v, V, EV, L, shown } = boot(cavern, { newEnemies: ['unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound'] })
  const begin = at(EV, 'activation.begin')
  v.seek(turnBegin(EV, 1) + 1); v.speed(4); v.play()
  const opening = playTo(w, v, V, begin + 1)
  assert.deepEqual(opening.map(s => s.lines), [['New enemy', nameOf(L, 'unit.bloodhound')], ['New enemy', nameOf(L, 'unit.hellhound')]], 'the two kinds on the board, one after the other')
  for (const s of opening) assert.ok(s.cursor <= begin)
  const wave = at(EV, 'encounter.wave', 0, e => e.turn === 4)
  assert.equal(EV.filter((e, i) => i > wave && e.type === 'unit.enter' && e.turn === 4 && e.typeId === 'unit.zombie-hound').length, 4, 'four Zombie Hounds arrive on Turn 4')
  const rest = playTo(w, v, V, at(EV, 'activation.begin', wave))
  assert.deepEqual(rest.map(s => s.lines), [['New enemy', nameOf(L, 'unit.zombie-hound')]], 'one notice for the four')
  assert.deepEqual(shown, ['unit.bloodhound', 'unit.hellhound', 'unit.zombie-hound'])
  v.pause(); v.dispose()
})

test('with nothing handed over (the replay page) nothing is announced; a hand step and a seek announce nothing and tell the host nothing', () => {
  const plain = boot(bridge)
  plain.v.seek(turnBegin(plain.EV, 1) + 1); plain.v.speed(8); plain.v.play()
  const wave4 = at(plain.EV, 'encounter.wave', 0, e => e.turn === 4)
  assert.deepEqual(playTo(plain.w, plain.v, plain.V, wave4 + 20), [], 'a viewer handed no kinds says nothing'); assert.deepEqual(plain.shown, [])
  plain.v.pause(); plain.v.dispose()
  const { w, v, V, EV, shown } = boot(bridge, { newEnemies: ['unit.imp', 'unit.fire-imp'] })
  const begin = at(EV, 'activation.begin')
  v.seek(turnBegin(EV, 1) + 1)
  while (v.cursor <= begin + 2) { v.step(); w._flush(16); assert.equal(said(v), null, 'a hand step shows no notice') }
  v.seek(at(EV, 'encounter.wave', 0, e => e.turn === 2) + 12); w._flush(16); assert.equal(said(v), null, 'nor a seek'); assert.deepEqual(shown, [])
  /* a notice that stands is dropped by a hand step, and its hold with it */
  v.seek(turnBegin(EV, 1) + 1); v.play(); for (let n = 0; n < 4000 && !said(v); n++) w._flush(16)
  assert.ok(said(v)); v.step(); assert.equal(said(v), null); assert.equal(v.held, false)
  v.dispose()
})

test('the host may hand the kinds after mounting, and names only unit kinds: a malformed list is refused', () => {
  const { w, v, V, EV, L, shown } = boot(bridge)
  assert.throws(() => v.setNewEnemies('unit.imp'), /new enemies/i); assert.throws(() => v.setNewEnemies([42]), /new enemies/i)
  v.setNewEnemies(['unit.fire-imp'])
  v.seek(turnBegin(EV, 1) + 1); v.speed(4); v.play()
  const wave4 = at(EV, 'encounter.wave', 0, e => e.turn === 4)
  const seen = playTo(w, v, V, wave4)
  assert.deepEqual(seen.map(s => s.lines), [['New enemy', nameOf(L, 'unit.fire-imp')]], 'only the kind handed over: the Imps on the board at the start are not named')
  assert.deepEqual(shown, ['unit.fire-imp'])
  v.pause(); v.dispose()
})
