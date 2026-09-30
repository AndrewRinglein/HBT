// viewer.play-chrome (engine backlog; PLAYABLE-OPENING-PLAN.md item 8; engine DECISIONS.md 2026-09-29 "the playable
// opening" and "the playable battle screen"). The component's half: a host that plays (onPlay) gets the play chrome —
// End Turn, which asks first in an element on the page ("Are you sure you want to end your turn? You have units that
// have not acted.") when the host's facts name heroes yet to act (the engine's heroesYetToAct), End activation while the
// host says the activation may be ended, a 2× speed button, and the battle log of the events already played. Every
// click is offered to the host; nothing is decided here. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { buildLog } from '../src/log.js'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const ASK = 'Are you sure you want to end your turn? You have units that have not acted.'

function boot({ host = true } = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  /* the pop-up is the page's own element: a native dialog throws here */
  w.confirm = q => { throw new Error('window.confirm: ' + q) }; w.prompt = q => { throw new Error('window.prompt: ' + q) }
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','confirm','prompt','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const seen = [], v = B.mount(el, data, { autoplay: false, ...(host ? { onPlay: e => { seen.push(e); return true } } : {}) })
  v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  return { w, v, V: v._V, seen, SN: L.static.statuses }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const off = b => b.getAttribute('aria-disabled') === 'true'
const shown = n => n.style.display !== 'none'
/* the plan facts with nothing planned, as the kingdom's play input hands them over, plus the ending */
const facts = (over = {}) => ({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })

test('a replay has no play chrome; a host that plays gets End Turn, End activation, 2x and the log', () => {
  const r = boot({ host: false })
  for (const id of ['playChrome', 'playEndTurn', 'playSpeed', 'playLog', 'playAsk']) assert.equal($(r.V, id), null, id + ' only for a host that plays')
  r.v.dispose()
  const { v, V } = boot()
  for (const id of ['playChrome', 'playEndTurn', 'playEndAct', 'playSpeed', 'playLogBtn', 'playLog', 'playAsk']) assert.ok($(V, id), id)
  assert.equal($(V, 'playEndTurn').textContent, 'End Turn')
  assert.ok(off($(V, 'playEndTurn')) && off($(V, 'playEndAct')), 'nothing to end before the host hands its facts over')
  assert.equal(shown($(V, 'playAsk')), false, 'no pop-up until asked')
  v.dispose(); assert.equal($(V, 'playChrome'), null, 'disposed with the viewer')
})

test('End Turn with heroes yet to act: the pop-up on the page asks the ruled question; Keep playing offers nothing; End Turn offers it', () => {
  const { v, V, seen, w } = boot(), who = Object.values(V.S.U).filter(u => u.side === 'hero').slice(1, 3)
  v.setPlay(facts({ endTurn: { yetToAct: who.map(u => u.id) } }))
  assert.equal(off($(V, 'playEndTurn')), false, 'End Turn may be given')
  fire($(V, 'playEndTurn'), 'click')
  assert.ok(shown($(V, 'playAsk')), 'the pop-up shows'); assert.deepEqual(seen, [], 'nothing is offered before the answer')
  assert.equal($(V, 'playAskText').textContent, ASK, 'the ruled words')
  for (const u of who) assert.ok($(V, 'playAskWho').textContent.includes(u.name), 'names ' + u.name)
  assert.equal($(V, 'playAskBox').getAttribute('role'), 'alertdialog')
  fire($(V, 'playAskNo'), 'click'); assert.equal(shown($(V, 'playAsk')), false); assert.deepEqual(seen, [], 'Keep playing ends nothing')
  /* Esc closes the pop-up and is not the board's step back */
  fire($(V, 'playEndTurn'), 'click'); assert.ok(shown($(V, 'playAsk')))
  w.document.dispatch('keydown', { key: 'Escape', target: V.dom.stage.parentNode, repeat: false, preventDefault() {} })
  assert.equal(shown($(V, 'playAsk')), false); assert.deepEqual(seen, [])
  fire($(V, 'playEndTurn'), 'click'); fire($(V, 'playAskYes'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'end-turn' }]); assert.equal(shown($(V, 'playAsk')), false)
  /* the host takes End Turn away while the pop-up is up (its beat plays): the pop-up goes */
  fire($(V, 'playEndTurn'), 'click'); v.setPlay(null)
  assert.equal(shown($(V, 'playAsk')), false); assert.ok(off($(V, 'playEndTurn')))
  v.dispose()
})

test('every hero has acted: End Turn asks nothing; End activation only while the host says so', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts({ endTurn: { yetToAct: [] } }))
  fire($(V, 'playEndTurn'), 'click')
  assert.equal(shown($(V, 'playAsk')), false, 'no pop-up'); assert.deepEqual(seen.splice(0), [{ kind: 'end-turn' }])
  fire($(V, 'playEndAct'), 'click'); assert.deepEqual(seen, [], 'End activation not offered'); assert.ok(off($(V, 'playEndAct')))
  v.setPlay(facts({ endTurn: { yetToAct: [] }, endActivation: true }))
  assert.equal(off($(V, 'playEndAct')), false); fire($(V, 'playEndAct'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'end-activation' }])
  v.setPlay(facts()); assert.ok(off($(V, 'playEndTurn')) && off($(V, 'playEndAct')), 'facts without the ending: nothing to end')
  fire($(V, 'playEndTurn'), 'click'); fire($(V, 'playEndAct'), 'click'); assert.deepEqual(seen, [])
  v.dispose()
})

test('2x doubles the pump\'s speed and back, also while the host offers nothing (an Enemy Phase playing)', () => {
  const { v, V } = boot()
  assert.equal(v.speedValue, 1)
  fire($(V, 'playSpeed'), 'click'); assert.equal(v.speedValue, 2); assert.ok($(V, 'playSpeed').classList.contains('on'))
  fire($(V, 'playSpeed'), 'click'); assert.equal(v.speedValue, 1); assert.equal($(V, 'playSpeed').classList.contains('on'), false)
  v.setPlay(facts({ endTurn: { yetToAct: [] } })); fire($(V, 'playSpeed'), 'click'); assert.equal(v.speedValue, 2)
  v.dispose()
})

test('the battle log: the sentences of the events already played, appended as the pump plays them; a seek back trims it', () => {
  const { v, V, SN } = boot(), log = $(V, 'playLog')
  const lines = buildLog(battle1.events, SN, battle1.events.find(e => e.type === 'battle.end').turn)
  const rows = () => log.children.map(r => +r.getAttribute('data-i'))
  const upTo = c => lines.filter(l => l.i < c).map(l => l.i)
  assert.ok(rows().length > 0); assert.deepEqual(rows(), upTo(V.cursor))
  assert.equal(log.children[0].innerHTML, lines[0].t, 'log.js\'s own sentence')
  const start = V.cursor
  for (let n = 0; n < 40; n++) v.step()
  assert.ok(V.cursor > start); assert.deepEqual(rows(), upTo(V.cursor), 'appended as played')
  const enemy = battle1.events.findIndex(e => e.type === 'activation.begin' && battle1.events.find(x => x.type === 'unit.enter' && x.actor === e.actor)?.side === 'enemy')
  v.seek(enemy + 1); assert.deepEqual(rows(), upTo(enemy + 1))
  assert.ok(log.children.at(-1).className.includes('enemy'), 'an Enemy Phase reads as it plays')
  v.seek(3); assert.deepEqual(rows(), upTo(3), 'a seek back trims the log')
  v.seek(battle1.events.length); assert.match(log.children.at(-1).innerHTML, /HEROCLEAR in 17 turns/, 'battle.end names its own Turn')
  fire($(V, 'playLogBtn'), 'click'); assert.equal(shown(log), false, 'Log hides it'); fire($(V, 'playLogBtn'), 'click'); assert.ok(shown(log))
  v.dispose()
})

test('a malformed ending is refused whole', () => {
  const { v, V } = boot(), good = facts({ endTurn: { yetToAct: [1] }, endActivation: true })
  v.setPlay(good)
  for (const bad of [{ endTurn: { yetToAct: [1, 1] } }, { endTurn: { yetToAct: 'all' } }, { endTurn: { yetToAct: [1.5] } }, { endTurn: { yetToAct: [], also: 1 } }, { endActivation: 'yes' }])
    assert.throws(() => v.setPlay({ ...good, ...bad }), /invalid play facts/, JSON.stringify(bad))
  assert.equal(off($(V, 'playEndTurn')), false, 'the prior facts stand'); assert.equal(off($(V, 'playEndAct')), false)
  v.dispose()
})
