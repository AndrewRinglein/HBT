// viewer.switch-hero-asks (engine backlog; engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching
// heroes asks first ...' and 'the opening draft pool is all 24 heroes ...; the switch pop-up is for any player unit'). Andrew:
// "when you double-click on a hero but you still have a hero primary activation left, it should pop up and say, 'End
// activation of X hero and start activation of Y hero.' ... there needs to be some kind of check to make sure that I'm willing
// to end the activation of that other hero." · "by hero, I just mean any player unit ... And you can click yes or no."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage: a double-click on a unit is
// offered to the host as before ({kind:'choose'}); when the host's facts carry the question (ask: {kind:'switch', from, to} —
// its own answer from the engine, src/play.js) the chrome shows a pop-up, an element on the page as the End Turn pop-up is,
// never window.confirm: "End activation of <X> and start activation of <Y>?" with the two units' names and Yes / No; the
// answer is offered back ({kind:'answer', yes}); nothing is decided here. The host's half — when it asks, what yes does — is
// the kingdom's (kingdom test/switch-hero-asks.test.ts, tools/switch-hero-asks.verify.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const EV = battle1.events

function boot({ host = true } = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  /* the pop-up is the page's own element: a native dialog throws here */
  w.confirm = q => { throw new Error('window.confirm: ' + q) }; w.prompt = q => { throw new Error('window.prompt: ' + q) }
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','confirm','prompt','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const seen = [], v = B.mount(el, data, { autoplay: false, ...(host ? { onPlay: e => { seen.push(e); return true } } : {}) })
  v.push(EV)
  v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V, seen }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const shown = n => !!n && n.style.display !== 'none'
const facts = (over = {}) => ({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })
const heroes = V => Object.values(V.S.U).filter(u => u.side === 'hero' && u.life === 'standing').sort((a, b) => a.id - b.id)

test('a replay has no switch pop-up; a host that plays has one, hidden until the host asks', () => {
  const r = boot({ host: false }); assert.equal($(r.V, 'playSwitch'), null, 'only for a host that plays'); r.v.dispose()
  const { v, V } = boot()
  const [x] = heroes(V); v.setPlay(facts({ actor: x.id }))
  assert.ok($(V, 'playSwitch'), 'the pop-up is an element on the page'); assert.equal(shown($(V, 'playSwitch')), false, 'hidden until asked')
  assert.equal($(V, 'playSwitchBox').getAttribute('role'), 'alertdialog')
  v.dispose()
})

test('a double-click on another unit is offered to the host; the pop-up shows only when the host\'s facts carry the question', () => {
  const { v, V, seen } = boot()
  const [x, y] = heroes(V); v.setPlay(facts({ actor: x.id }))
  const chip = id => V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === id)
  fire(chip(y.id), 'dblclick')
  assert.deepEqual(seen.splice(0), [{ kind: 'choose', id: y.id }], 'the double-click is the host\'s to answer')
  assert.equal(shown($(V, 'playSwitch')), false, 'the viewer asks nothing by itself')
  v.setPlay(facts({ actor: x.id, ask: { kind: 'switch', from: x.id, to: y.id } }))
  assert.ok(shown($(V, 'playSwitch')), 'the host asks: the pop-up shows')
  assert.equal($(V, 'playSwitchText').textContent, `End activation of ${x.name} and start activation of ${y.name}?`, 'the ruled words, with both names')
  assert.equal($(V, 'playSwitchYes').textContent, 'Yes'); assert.equal($(V, 'playSwitchNo').textContent, 'No')
  assert.equal(V.asking, true, 'the board\'s keys wait on the answer')
  assert.deepEqual(seen, [], 'nothing is offered before the answer')
  v.dispose()
})

test('No, and Esc, offer the answer no; Yes offers yes; the pop-up leaves when the host stops asking', () => {
  const { w, v, V, seen } = boot()
  const [x, y] = heroes(V), ask = { kind: 'switch', from: x.id, to: y.id }
  v.setPlay(facts({ actor: x.id, ask }))
  fire($(V, 'playSwitchNo'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'answer', yes: false }])
  v.setPlay(facts({ actor: x.id }))                              /* the host took the question back */
  assert.equal(shown($(V, 'playSwitch')), false); assert.equal(V.asking, false)
  v.setPlay(facts({ actor: x.id, ask }))
  w.document.dispatch('keydown', { key: 'Escape', target: V.dom.stage.parentNode, repeat: false, preventDefault() {} })
  assert.deepEqual(seen.splice(0), [{ kind: 'answer', yes: false }], 'Esc is No — and not the board\'s step back')
  v.setPlay(facts({ actor: x.id, ask }))
  fire($(V, 'playSwitchYes'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'answer', yes: true }])
  v.setPlay(null)                                                /* the host resolves: no facts while the board plays */
  assert.equal(shown($(V, 'playSwitch')), false, 'no pop-up while the host has no facts'); assert.equal(V.asking, false)
  v.dispose()
})

test('either unit may be a civilian the player controls: the pop-up names whoever the host names', () => {
  const { v, V } = boot()
  const hs = heroes(V), civ = hs.find(u => /orphan|teacher/i.test(u.typeId)), hero = hs.find(u => u !== civ)
  assert.ok(civ, 'the Orphanage fields a civilian on the player\'s side')
  v.setPlay(facts({ actor: hero.id, ask: { kind: 'switch', from: hero.id, to: civ.id } }))
  assert.equal($(V, 'playSwitchText').textContent, `End activation of ${hero.name} and start activation of ${civ.name}?`)
  v.setPlay(facts({ actor: civ.id, ask: { kind: 'switch', from: civ.id, to: hero.id } }))
  assert.equal($(V, 'playSwitchText').textContent, `End activation of ${civ.name} and start activation of ${hero.name}?`)
  v.dispose()
})

test('a malformed question is the host\'s error, never drawn; the End Turn pop-up is untouched', () => {
  const { v, V } = boot()
  const [x, y] = heroes(V)
  v.setPlay(facts({ actor: x.id }))
  for (const bad of [{ kind: 'switch', from: x.id }, { kind: 'other', from: x.id, to: y.id }, { kind: 'switch', from: 'a', to: y.id }, { kind: 'switch', from: x.id, to: y.id, extra: 1 }, 'yes'])
    assert.throws(() => v.setPlay(facts({ actor: x.id, ask: bad })), /invalid play facts/, JSON.stringify(bad))
  assert.equal(shown($(V, 'playSwitch')), false)
  v.setPlay(facts({ actor: x.id, endTurn: { yetToAct: [y.id] }, endActivation: true }))
  fire($(V, 'playEndTurn'), 'click')
  assert.ok(shown($(V, 'playAsk')), 'End Turn still asks in its own pop-up'); assert.equal(shown($(V, 'playSwitch')), false)
  v.dispose()
})
