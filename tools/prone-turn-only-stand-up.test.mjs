// viewer.prone-turn-only-stand-up (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: notices, target lines, item
// cards, arrows, move costs on hexes, knocked down, bodies, cursed ground, the first hero's positives' and 'the playtest post
// answered'). Andrew: "Then, if you are downed, when it's that character's next turn, everything needs to be grayed out except
// 'stand up'." / "Stand-up is a special move that is only available if you were prone, and yes, it takes your move."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage's recording — an Orphan
// Child is knocked down by a Zombie, begins its next Activation down, stands and stabs — for a host that plays:
//   · Stand Up is on the bar of a unit that is down and on no other (it is the action its prone status grants: the dump's);
//   · the host says which of the acting unit's actions the engine refuses until it has stood (its play facts' `standFirst` —
//     the engine's own limits check, kingdom src/ui/play-input.ts) and the bar gives those rows the disabled look, marks them
//     disabled and says why on hover; Stand Up is never among them;
//   · once it has stood Stand Up is off the bar, and what greys is what the host says is done (`moveDone`), as after any move.
// What a unit that is down may do is the engine's answer and none of the bar's: with no word from the host nothing is greyed.
// The host's half — the engine asked, a knocked-down Lumberjack's Wife on the built sandbox — is kingdom
// test/prone-turn-only-stand-up.test.ts and tools/prone-turn-only-stand-up.verify.mjs.
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
const held = V => rows(V).filter(r => has(r, 'standFirst')).map(r => r.dataset.act)
const kind = id => STATIC.actionKinds[id]
/* the recording's own lines: the knockdown, the Activation the unit begins down, its stand — and the stand action is the one
   the status it holds grants (the dump's statusRows), never an id typed here */
const down = EV.findIndex(e => e.type === 'unit.proned'), WHO = EV[down].target, PRONE = EV[down].statusId, STAND = STATIC.statusRows[PRONE].standAction
const begin = EV.findIndex((e, i) => i > down && e.type === 'activation.begin' && e.actor === WHO), stood = EV.findIndex((e, i) => i > begin && e.type === 'unit.stood' && e.actor === WHO)
const firstBegin = EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero')

test('the recording: a hero\'s unit is knocked down, begins its next Activation down, and stands by the action its prone status grants', () => {
  assert.ok(down > 0 && begin > down && stood > begin, `knocked down at ${down}, begins at ${begin}, stands at ${stood}`)
  assert.ok(STAND, 'the prone status grants a stand action'); assert.equal(kind(STAND), 'move', 'which is a move')
  assert.equal(EV.find(e => e.type === 'unit.enter' && e.actor === WHO).side, 'hero')
  assert.ok(!EV.slice(down, begin).some(e => e.type === 'unit.stood' && e.actor === WHO), 'it is still down when its Activation begins')
  assert.equal(EV.slice(begin, stood).find(e => e.type === 'action.spent' && e.actor === WHO).actionId, STAND, 'the stand is the first thing it does')
})

test('Stand Up is on the bar of a unit that is down and on no other: a standing unit\'s bar has none, and it leaves the bar once the unit has stood', () => {
  const { v, V } = boot()
  /* every hero Activation of the recording that begins standing: no Stand Up on its bar */
  let standing = 0
  for (let i = firstBegin; i < EV.length; i++) { const e = EV[i]; if (e.type !== 'activation.begin' || EV.find(x => x.type === 'unit.enter' && x.actor === e.actor).side !== 'hero') continue
    v.seek(i + 1); v.setPlay(facts(e.actor))
    const isDown = (V.S.U[e.actor].st || {})[PRONE] > 0
    assert.equal(!!row(V, STAND), isDown, `event ${i}: Stand Up is on the bar exactly while the unit is down`)
    if (!isDown) standing++ }
  assert.ok(standing >= 3, 'standing Activations seen: ' + standing)
  v.seek(begin + 1); v.setPlay(facts(WHO)); assert.ok(row(V, STAND), 'down: Stand Up is on its bar')
  assert.equal(row(V, STAND).querySelector('.acName').textContent.trim(), STATIC.actions[STAND].name)
  v.seek(stood + 1); v.setPlay(facts(WHO)); assert.equal(row(V, STAND), undefined, 'stood: Stand Up is off its bar')
  v.dispose()
})

test('at the start of a downed unit\'s Activation every action the host names is greyed and marked disabled, and says why — Stand Up alone is lit', () => {
  const { v, V } = boot(); v.seek(begin + 1)
  const all = rows(V).map(r => r.dataset.act), others = all.filter(id => id !== STAND)
  assert.ok(others.some(id => kind(id) === 'move') && others.some(id => kind(id) === 'attack'), 'it has a move and attacks besides: ' + all.join(', '))
  v.setPlay(facts(WHO, { standFirst: others }))
  assert.deepEqual(held(V), others, 'every other action wears the disabled look')
  for (const id of others) { const r = row(V, id)
    assert.equal(r.getAttribute('aria-disabled'), 'true', id + ' is marked disabled')
    assert.ok(r.getAttribute('title').includes(`Knocked down: ${STATIC.actions[STAND].name} first.`), id + ' says why on hover: ' + r.getAttribute('title').split('\n').pop())
    assert.ok(!has(r, 'moveDone') && !has(r, 'playChosen'), id + ' is not "done" and not chosen') }
  const up = row(V, STAND)
  assert.ok(!has(up, 'standFirst') && !has(up, 'cool') && !has(up, 'moveDone'), 'Stand Up is lit'); assert.equal(up.getAttribute('aria-disabled'), null)
  assert.ok(!up.getAttribute('title').includes('Knocked down'))
  /* a host that names the stand itself by mistake: the bar never greys the way up */
  v.setPlay(facts(WHO, { standFirst: all })); assert.deepEqual(held(V), others, 'the stand is never greyed')
  v.dispose()
})

test('what is greyed is the host\'s word from the engine, action by action — the bar adds none: with only the moves named the attacks stay lit, and with no word nothing is greyed though the unit is down', () => {
  const { v, V } = boot(); v.seek(begin + 1)
  const others = rows(V).map(r => r.dataset.act).filter(id => id !== STAND), moves = others.filter(id => kind(id) === 'move')
  v.setPlay(facts(WHO, { standFirst: moves }))
  assert.deepEqual(held(V), moves, 'the moves the engine refuses a downed unit')
  for (const id of others.filter(x => !moves.includes(x))) assert.equal(row(V, id).getAttribute('aria-disabled'), null, id + ' is lit: the engine did not refuse it')
  v.setPlay(facts(WHO)); assert.deepEqual(held(V), [], 'no word from the host: nothing is worked out from the log')
  v.setPlay(facts(WHO, { standFirst: [] })); assert.deepEqual(held(V), [])
  /* the fact is the acting unit's: facts for another unit grey nothing on this bar; facts with no unit acting grey nothing */
  v.setPlay(facts(null, { standFirst: others })); assert.deepEqual(held(V), [])
  /* a malformed fact is the host's error, never drawn */
  assert.throws(() => v.setPlay(facts(WHO, { standFirst: 'power.move' })), /invalid play facts/)
  assert.throws(() => v.setPlay(facts(WHO, { standFirst: [others[0], others[0]] })), /invalid play facts/)
  assert.throws(() => v.setPlay(facts(WHO, { standFirst: [7] })), /invalid play facts/)
  v.dispose()
})

test('a press on a greyed row still goes to the host, which answers it — the bar chooses nothing itself; a press on Stand Up is offered as any action is', () => {
  const { v, V, offered } = boot(); v.seek(begin + 1)
  const others = rows(V).map(r => r.dataset.act).filter(id => id !== STAND)
  v.setPlay(facts(WHO, { standFirst: others }))
  const press = id => { for (const f of row(V, id).listeners.click || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
  offered.length = 0; press(STAND)
  assert.deepEqual(offered.filter(o => o.kind === 'slot'), [{ kind: 'slot', actionId: STAND, unit: WHO }], 'Stand Up is offered to the host')
  offered.length = 0; press(others[0])
  assert.deepEqual(offered.filter(o => o.kind === 'slot'), [{ kind: 'slot', actionId: others[0], unit: WHO }], 'the refusal and its words are the host\'s')
  assert.ok(!rows(V).some(r => has(r, 'playChosen')), 'nothing is chosen on the bar until the host says so')
  v.dispose()
})

test('once it has stood: the moves grey as after any move — on the host\'s word that they are done — and its attacks are lit', () => {
  const { v, V } = boot(); v.seek(stood + 1)
  const all = rows(V).map(r => r.dataset.act), moves = all.filter(id => kind(id) === 'move'), attacks = all.filter(id => kind(id) === 'attack')
  assert.ok(moves.length && attacks.length); assert.ok(!all.includes(STAND))
  v.setPlay(facts(WHO, { standFirst: [], moveDone: moves }))
  assert.deepEqual(held(V), [], 'nothing waits on a stand any more')
  assert.deepEqual(rows(V).filter(r => has(r, 'moveDone')).map(r => r.dataset.act), moves, 'the moves are greyed as after any move')
  for (const id of attacks) { const r = row(V, id); assert.ok(!has(r, 'moveDone') && !has(r, 'standFirst') && !has(r, 'cool'), id + ' is lit'); assert.equal(r.getAttribute('aria-disabled'), null) }
  v.dispose()
})

test('the look: a row that waits on the stand is as faint as a row the engine refuses for a cooldown, fainter than a move that is merely done, and shows it cannot be pressed', () => {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  const rule = sel => { const m = css.match(new RegExp(sel.replace(/\./g, '\\.') + '\\{([^}]*)\\}')); assert.ok(m, 'the stylesheet has ' + sel); return m[1] }
  const opacity = sel => { const m = rule(sel).match(/opacity:\s*([0-9.]+)/); assert.ok(m, sel + ' sets an opacity'); return +m[1] }
  const first = opacity('.acRow.standFirst'), cool = opacity('.acRow.cool'), done = opacity('.acRow.moveDone')
  assert.ok(first <= cool && first < done && done < 1, `waits on the stand ${first} <= on cooldown ${cool} < done ${done} < 1`)
  assert.match(rule('.acRow.standFirst'), /cursor:\s*not-allowed/)
})
