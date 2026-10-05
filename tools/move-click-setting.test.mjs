// kingdom.move-click-setting (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …; one click or
// two to move is a setting'). Andrew: "let's have a setting where it can be either way, so I can just play with it either way."
// The item: "The setting is a small control on the battle screen beside the speed and log buttons that says which way it is
// set, can be changed in the middle of a battle … The viewer draws the control from a fact the host hands it and offers the
// change back; it decides nothing."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage's recording, for a host that
// plays: the play facts' optional `moveClick` ('one' · 'two') is drawn as one small button beside 2× that says which way it is
// set; pressed, it offers the other way back ({kind:'move-click', clicks}) and changes nothing itself — its words change only
// when the host hands new facts. No fact, no control. The host's half — where the choice is kept, what one click does — is
// kingdom test/move-click-setting.test.ts and tools/move-click-setting.verify.mjs.
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
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const offered = []
  const v = B.mount(host, data, { autoplay: false, ...('host' in opts && !opts.host ? {} : { onPlay: input => { offered.push(input); return true } }) })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V, offered }
}
const facts = (actor, more = {}) => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...more })
const A = EV.find(e => e.type === 'activation.begin' && e.phase === 'hero').actor
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const shown = n => !!n && n.style.display !== 'none'
const press = n => { for (const f of n.listeners.click || []) f({ target: n, detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
const within = (n, anc) => { for (let p = n; p; p = p.parentNode) if (p === anc) return true; return false }

test('the control is drawn from the host\'s fact and says which way it is set: beside the 2× button, "Move: 2 clicks" or "Move: 1 click"', () => {
  const { v, V } = boot()
  v.setPlay(facts(A, { moveClick: 'two' }))
  const b = $(V, 'playMoveClick'); assert.ok(b, 'the control is on the battle screen'); assert.ok(shown(b))
  assert.equal(b.textContent.trim(), 'Move: 2 clicks'); assert.equal(b.getAttribute('aria-pressed'), 'false'); assert.equal(b.dataset.clicks, 'two')
  assert.ok(within(b, $(V, 'playChrome')), 'in the same strip as the speed button'); assert.equal(b.parentNode, $(V, 'playSpeed').parentNode, 'beside 2×')
  assert.ok(b.getAttribute('title').length > 20, 'it says on hover what each way does')
  v.setPlay(facts(A, { moveClick: 'one' }))
  assert.equal(b.textContent.trim(), 'Move: 1 click'); assert.equal(b.getAttribute('aria-pressed'), 'true'); assert.equal(b.dataset.clicks, 'one')
  v.dispose()
})

test('pressed, it offers the other way back to the host and changes nothing itself: its words follow the host\'s next facts', () => {
  const { v, V, offered } = boot()
  v.setPlay(facts(A, { moveClick: 'two' }))
  const b = $(V, 'playMoveClick')
  offered.length = 0; press(b)
  assert.deepEqual(offered, [{ kind: 'move-click', clicks: 'one' }], 'the change is offered: one click')
  assert.equal(b.textContent.trim(), 'Move: 2 clicks', 'the control has decided nothing: it still says what the host last said')
  v.setPlay(facts(A, { moveClick: 'one' })); offered.length = 0; press(b)
  assert.deepEqual(offered, [{ kind: 'move-click', clicks: 'two' }], 'and back: two clicks')
  v.dispose()
})

test('no fact, no control: a host that says nothing of the setting shows none, and neither does a replay with no host', () => {
  const { v, V } = boot()
  v.setPlay(facts(A)); assert.ok(!shown($(V, 'playMoveClick')), 'a host that hands no moveClick: no control')
  v.setPlay(facts(A, { moveClick: 'two' })); assert.ok(shown($(V, 'playMoveClick')))
  v.setPlay(facts(A)); assert.ok(!shown($(V, 'playMoveClick')), 'taken away with the fact')
  v.dispose()
  const r = boot({ host: false }); assert.equal($(r.V, 'playMoveClick'), null, 'a replay has no play chrome at all'); r.v.dispose()
})

test('while the host takes no orders (its facts are null, a beat is playing) the control stays as it was and offers nothing', () => {
  const { v, V, offered } = boot()
  v.setPlay(facts(A, { moveClick: 'one' })); v.setPlay(null)
  const b = $(V, 'playMoveClick'); assert.ok(shown(b), 'it does not blink away between orders'); assert.equal(b.textContent.trim(), 'Move: 1 click')
  offered.length = 0; press(b); assert.deepEqual(offered, [], 'nothing is offered while the host takes no orders')
  v.dispose()
})

test('a fact that is neither way is the host\'s error, never drawn', () => {
  const { v } = boot()
  for (const bad of ['three', 1, true, ['one']]) assert.throws(() => v.setPlay(facts(A, { moveClick: bad })), /invalid play facts/, String(bad))
  v.setPlay(facts(A, { moveClick: 'one' })); v.dispose()
})
