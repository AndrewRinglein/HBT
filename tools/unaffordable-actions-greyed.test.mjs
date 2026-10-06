// viewer.unaffordable-actions-greyed (engine backlog; engine DECISIONS.md 2026-10-05 'a prone unit only stands; Stand Up is its one
// move; …; what cannot be paid is greyed; …'). Andrew, asked what is chosen when attack one cannot be paid for: "If a tax can't be
// paid for or a power can't be paid for, it should be grayed out." ('tax' is 'attack' - dictation.)
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage's recording, for a host that plays:
//   · the host says which of the acting unit's actions it cannot pay for now, each with one line that says why (its play
//     facts' `cantPay` — the engine's own limits check and the engine's own numbers, kingdom src/ui/play-input.ts); the bar
//     gives those rows the disabled look, marks them disabled and says the line on hover; every other row is lit;
//   · a press on such a row still goes to the host, which answers it — the bar chooses nothing itself, and a row the host
//     names is never lit as chosen;
//   · with no word from the host, or an empty one, the bar is byte for byte the bar it was.
// What a unit can pay for is the engine's answer and none of the bar's: nothing about Stamina, a cooldown or a use is worked
// out here. The host's half — the engine asked, on the built sandbox — is kingdom test/unaffordable-actions-greyed.test.ts
// and tools/unaffordable-actions-greyed.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
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
  const v = B.mount(host, data, { autoplay: false, onPlay: input => { offered.push(input); return true }, ...opts })
  v.push(EV)
  return { w, v, V: v._V, L, offered }
}
const facts = (actor, more = {}) => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...more })
const rows = V => V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act)
const row = (V, id) => rows(V).find(r => r.dataset.act === id)
const has = (r, cls) => r.className.split(/\s+/).includes(cls)
const greyed = V => rows(V).filter(r => has(r, 'cantPay')).map(r => r.dataset.act)
const kind = id => STATIC.actionKinds[id]
const lastLine = r => r.getAttribute('title').split('\n').pop()
/* the recording's own line: the first Activation a hero of the party begins, standing */
const begin = EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero'), WHO = EV[begin].actor
const STAMINA = 'Not enough Stamina: needs 2, has 1.', COOLDOWN = 'On cooldown: ready in 2 Turns.'

test('the recording: a hero begins an Activation with attacks and a move on its bar', () => {
  const { v, V } = boot(); v.seek(begin + 1); v.setPlay(facts(WHO))
  const all = rows(V).map(r => r.dataset.act)
  assert.ok(all.filter(id => kind(id) === 'attack').length >= 2 && all.some(id => kind(id) === 'move'), 'its bar: ' + all.join(', '))
  v.dispose()
})

test('the rows the host says cannot be paid for are greyed, marked disabled and say the host\'s line on hover; every other row is lit', () => {
  const { v, V } = boot(); v.seek(begin + 1)
  const all = rows(V).map(r => r.dataset.act), attacks = all.filter(id => kind(id) === 'attack'), move = all.find(id => kind(id) === 'move')
  const named = [{ id: attacks[1], why: STAMINA }, { id: move, why: COOLDOWN }]
  v.setPlay(facts(WHO, { cantPay: named }))
  assert.deepEqual(greyed(V).sort(), named.map(n => n.id).sort(), 'exactly the rows the host named')
  for (const { id, why } of named) { const r = row(V, id)
    assert.equal(r.getAttribute('aria-disabled'), 'true', id + ' is marked disabled')
    assert.equal(lastLine(r), why, id + ' says why on hover, in the host\'s words')
    assert.ok(!has(r, 'playChosen') && !has(r, 'standFirst'), id + ' is not chosen and does not wait on a stand') }
  for (const id of all.filter(x => !named.some(n => n.id === x))) { const r = row(V, id)
    assert.ok(!has(r, 'cantPay'), id + ' is lit'); assert.equal(r.getAttribute('aria-disabled'), null)
    assert.ok(!r.getAttribute('title').includes('Not enough Stamina') && !r.getAttribute('title').includes('On cooldown'), id + ' says no such line') }
  /* the cost on the row is the dump's number still: the bar wrote none of the line's numbers */
  assert.equal(row(V, attacks[1]).querySelector('.acL2').textContent.includes(String(STATIC.actions[attacks[1]].staminaCost)), true)
  v.dispose()
})

test('a hero who can pay for everything shows the bar it showed before: no word, or an empty one, changes no byte of it', () => {
  const { v, V } = boot(); v.seek(begin + 1)
  v.setPlay(facts(WHO)); const before = V.dom.actionbar.innerHTML
  assert.deepEqual(greyed(V), [])
  v.setPlay(facts(WHO, { cantPay: [] })); assert.equal(V.dom.actionbar.innerHTML, before, 'an empty word')
  const one = rows(V).map(r => r.dataset.act).find(id => kind(id) === 'attack')
  v.setPlay(facts(WHO, { cantPay: [{ id: one, why: STAMINA }] })); assert.notEqual(V.dom.actionbar.innerHTML, before)
  v.setPlay(facts(WHO)); assert.equal(V.dom.actionbar.innerHTML, before, 'the moment the host stops naming it, it is lit again')
  v.dispose()
})

test('what is greyed is the host\'s word, action by action — the bar works out none: the fact is the acting unit\'s only, and a malformed one is the host\'s error', () => {
  const { v, V } = boot(); v.seek(begin + 1)
  const all = rows(V).map(r => r.dataset.act)
  v.setPlay(facts(null, { cantPay: all.map(id => ({ id, why: STAMINA })) })); assert.deepEqual(greyed(V), [], 'no unit acting: nothing is greyed')
  v.setPlay(facts(WHO, { cantPay: [{ id: 'power.not-on-this-bar', why: STAMINA }] })); assert.deepEqual(greyed(V), [], 'an action that is not on the bar greys nothing')
  for (const bad of ['power.move', [all[0]], [{ id: all[0] }], [{ id: all[0], why: '' }], [{ id: '', why: STAMINA }], [{ id: all[0], why: STAMINA }, { id: all[0], why: COOLDOWN }], [null]])
    assert.throws(() => v.setPlay(facts(WHO, { cantPay: bad })), /invalid play facts/, JSON.stringify(bad))
  v.dispose()
})

test('a press on a greyed row still goes to the host, which answers it; a row the host names is never lit as chosen', () => {
  const { v, V, offered } = boot(); v.seek(begin + 1)
  const attacks = rows(V).map(r => r.dataset.act).filter(id => kind(id) === 'attack')
  v.setPlay(facts(WHO, { cantPay: [{ id: attacks[0], why: STAMINA }] }))
  const press = id => { for (const f of row(V, id).listeners.click || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
  offered.length = 0; press(attacks[0])
  assert.deepEqual(offered.filter(o => o.kind === 'slot'), [{ kind: 'slot', actionId: attacks[0], unit: WHO }], 'the refusal and its words are the host\'s')
  assert.ok(!rows(V).some(r => has(r, 'playChosen')), 'nothing is chosen on the bar until the host says so')
  /* a host that says both "chosen" and "cannot be paid": the row is greyed, not lit */
  v.setPlay(facts(WHO, { slot: attacks[0], cantPay: [{ id: attacks[0], why: STAMINA }] }))
  assert.ok(has(row(V, attacks[0]), 'cantPay') && !has(row(V, attacks[0]), 'playChosen'))
  /* and another attack chosen beside it is lit as chosen, as before */
  v.setPlay(facts(WHO, { slot: attacks[1], cantPay: [{ id: attacks[0], why: STAMINA }] }))
  assert.ok(has(row(V, attacks[1]), 'playChosen') && !has(row(V, attacks[1]), 'cantPay'))
  v.dispose()
})

test('one reason at a time: a row that waits on the unit\'s stand says that, whatever else the host names it for', () => {
  const { v, V } = boot()
  const down = EV.findIndex(e => e.type === 'unit.proned'), who = EV[down].target
  const at = EV.findIndex((e, i) => i > down && e.type === 'activation.begin' && e.actor === who)
  v.seek(at + 1)
  const stand = STATIC.statusRows[EV[down].statusId].standAction, others = rows(V).map(r => r.dataset.act).filter(id => id !== stand)
  v.setPlay(facts(who, { standFirst: others, cantPay: [{ id: others[0], why: STAMINA }] }))
  const r = row(V, others[0])
  assert.ok(has(r, 'standFirst') && !has(r, 'cantPay'), 'it waits on the stand'); assert.ok(!r.getAttribute('title').includes('Not enough Stamina'))
  v.dispose()
})
