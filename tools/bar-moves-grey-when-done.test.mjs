// viewer.bar-moves-grey-when-done (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once
// the move is done, nothing else greys; every action shows all it does; the Soldier holds no sword'). Andrew: "There should be
// a slight graying out of the move actions after move actions are completed." / "Yes, they should still be usable before
// you've moved. However, if you do it, you'll lose your move, so I guess, actually, don't gray them out. Just gray the moves
// out after a move is done." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage,
// for a host that plays: the host says which of the acting unit's move actions are done (its play facts' `moveDone` — the
// engine's answer, kingdom src/ui/play-input.ts) and the bar greys those rows slightly; nothing else greys, and nothing greys
// before the host says so. The slight grey is not the disabled look (a row on cooldown, `.cool`). The host's half — a hero
// walked on the built sandbox, what the engine still offers after — is kingdom tools/bar-moves-grey-when-done.verify.mjs.
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
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  v.push(EV)
  return { w, v, V: v._V, L }
}
const facts = (actor, more = {}) => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...more })
/* the first hero to act in the recording: a drafted hero with a basic move, a second movement power, attacks */
const begin = EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero'), A = EV[begin].actor
const rows = V => V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act)
const has = (r, cls) => r.className.split(/\s+/).includes(cls)
const greyed = V => rows(V).filter(r => has(r, 'moveDone')).map(r => r.dataset.act)
const kind = (L, id) => L.static.actionKinds[id]

test('a hero beginning its Activation: every action at full strength — no row greyed, none disabled', () => {
  const { v, V, L } = boot(); v.seek(begin + 1); v.setPlay(facts(A, { moveDone: [] }))
  const all = rows(V); assert.ok(all.length >= 4)
  const moves = all.filter(r => kind(L, r.dataset.act) === 'move').map(r => r.dataset.act)
  assert.ok(moves.length >= 2, 'this hero has its basic move and another movement power: ' + moves.join(', '))
  assert.ok(all.some(r => kind(L, r.dataset.act) === 'attack'), 'and attacks')
  assert.deepEqual(greyed(V), []); assert.deepEqual(all.filter(r => has(r, 'cool')).map(r => r.dataset.act), [])
  v.dispose()
})

test('once the host says a move is done, that move row is slightly greyed — and nothing else: not the attacks, not the powers, not a move the engine still offers', () => {
  const { v, V, L } = boot(); v.seek(begin + 1)
  const moves = rows(V).filter(r => kind(L, r.dataset.act) === 'move').map(r => r.dataset.act), [basic, other] = moves
  v.setPlay(facts(A, { moveDone: [basic] }))
  assert.deepEqual(greyed(V), [basic], 'the basic move is greyed; the other movement power, which the engine still offers, is not')
  for (const r of rows(V)) if (r.dataset.act !== basic) assert.ok(!has(r, 'moveDone') && !has(r, 'cool'), r.dataset.act + ' is at full strength')
  assert.match(rows(V).find(r => r.dataset.act === basic).getAttribute('title'), /move is done/i, 'the greyed row says why on hover')
  v.setPlay(facts(A, { moveDone: moves }))
  assert.deepEqual(greyed(V), moves, 'every move action the host names')
  assert.ok(rows(V).filter(r => kind(L, r.dataset.act) !== 'move').every(r => !has(r, 'moveDone')), 'attacks and powers never grey')
  /* the next Activation's facts: nothing greyed again */
  v.setPlay(facts(A, { moveDone: [] })); assert.deepEqual(greyed(V), [])
  v.dispose()
})

test('only move actions grey, only for the unit acting, and only on the host\'s word', () => {
  const { v, V, L } = boot(); v.seek(begin + 1)
  const attack = rows(V).find(r => kind(L, r.dataset.act) === 'attack').dataset.act, basic = rows(V).find(r => kind(L, r.dataset.act) === 'move').dataset.act
  /* a host that names an attack: the bar greys moves only ("nothing else greys") */
  v.setPlay(facts(A, { moveDone: [attack, basic] })); assert.deepEqual(greyed(V), [basic])
  /* a host that says nothing (no moveDone at all): nothing is guessed from the log */
  v.setPlay(facts(A)); assert.deepEqual(greyed(V), [])
  const moved = EV.findIndex((e, i) => i > begin && e.type === 'moved' && e.actor === A)
  if (moved > 0) { v.seek(moved + 1); v.setPlay(facts(A)); assert.deepEqual(greyed(V), [], 'the hero has walked in the log; with no word from the host the bar greys nothing') }
  /* facts with no unit acting: nothing greyed */
  v.setPlay(facts(null, { moveDone: [basic] })); assert.deepEqual(greyed(V), [])
  /* a malformed fact is the host's error, never drawn */
  assert.throws(() => v.setPlay(facts(A, { moveDone: 'power.move' })), /invalid play facts/)
  assert.throws(() => v.setPlay(facts(A, { moveDone: [basic, basic] })), /invalid play facts/)
  assert.throws(() => v.setPlay(facts(A, { moveDone: [7] })), /invalid play facts/)
  v.dispose()
})

test('the slight grey is told apart from an action the engine refuses: a row on cooldown still looks disabled, greyed or not', () => {
  const { v, V, L } = boot(); v.seek(begin + 1)
  const moves = rows(V).filter(r => kind(L, r.dataset.act) === 'move').map(r => r.dataset.act), [basic, other] = moves
  /* the other movement power on cooldown, as the fold records it from the engine's cooldown.set */
  V.S.U[A].cds = { ...(V.S.U[A].cds || {}), [other]: V.S.turnNo + 2 }
  v.setPlay(facts(A, { moveDone: [basic, other] }))
  const row = id => rows(V).find(r => r.dataset.act === id)
  assert.ok(has(row(basic), 'moveDone') && !has(row(basic), 'cool'), 'the move that is done: slightly greyed, not disabled')
  assert.ok(has(row(other), 'cool') && !has(row(other), 'moveDone'), 'the move the engine refuses (cooldown): disabled as before, not merely greyed')
  /* the looks themselves, in the page's stylesheet: disabled is fainter than the slight grey, and the slight grey is not full strength */
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  const opacity = sel => { const m = css.match(new RegExp(sel.replace(/\./g, '\\.') + '\\{[^}]*?opacity:\\s*([0-9.]+)')); assert.ok(m, 'the stylesheet has ' + sel); return +m[1] }
  const done = opacity('.acRow.moveDone'), cool = opacity('.acRow.cool')
  assert.ok(cool < done && done < 1, `disabled ${cool} < slightly greyed ${done} < 1`)
  assert.ok(done - cool >= 0.25, 'far enough apart to tell at a glance')
  v.dispose()
})
