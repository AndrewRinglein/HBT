// viewer.auto-end-no-actions (engine backlog; engine DECISIONS.md 2026-10-03 'a player unit with nothing left it can do ends
// its Activation by itself: "No remaining actions possible."'). Andrew: "If a player unit completes its move and it has a
// remaining primary action and there is no attack target in range, and no other powers it can use. You should just auto-end
// its turn and put a notification on the screen: 'No remaining actions possible.'" The component's half, asked of the page
// (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage: a host that plays may put a notice on the battle screen
// (viewer.notice(text)) — an element on the page as the phase banner and the End Turn pop-up are, never window.alert; it
// stays long enough to read and leaves by itself; it blocks nothing — the pump is not held, the board's keys are not taken,
// the host's facts are still drawn. When a unit has nothing left and what the notice says are the host's, from the engine
// (kingdom test/auto-end-no-actions.test.ts, tools/auto-end-no-actions.verify.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const EV = battle1.events, WORDS = 'No remaining actions possible.'

function boot({ host = true } = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  /* the notice is the page's own element: a native dialog throws here */
  w.alert = q => { throw new Error('window.alert: ' + q) }; w.confirm = q => { throw new Error('window.confirm: ' + q) }
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','confirm','Date','performance','getComputedStyle','localStorage','self','globalThis']
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
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const shown = n => !!n && n.style.display !== 'none'
const facts = (over = {}) => ({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })

test('a host that plays has a notice on the battle screen, hidden until it is given; it shows the host\'s words', () => {
  const { v, V } = boot()
  const n = $(V, 'playNotice')
  assert.ok(n, 'the notice is an element on the page'); assert.equal(shown(n), false, 'hidden until given')
  assert.equal(n.getAttribute('role'), 'status', 'read out, not a dialog')
  v.notice(WORDS)
  assert.ok(shown(n)); assert.equal(n.textContent, WORDS, 'the ruled words, as the host gave them')
  v.dispose()
})

test('the notice stays long enough to read and leaves by itself; a second notice starts its time again', () => {
  const { w, v, V } = boot()
  const n = $(V, 'playNotice')
  v.notice(WORDS)
  w._flush(1500); assert.ok(shown(n), 'still there after a second and a half')
  w._flush(4000); assert.equal(shown(n), false, 'gone by itself')
  v.notice(WORDS); w._flush(1500); v.notice('Again.'); w._flush(1500)
  assert.ok(shown(n), 'the second notice has its own time'); assert.equal(n.textContent, 'Again.')
  w._flush(4000); assert.equal(shown(n), false)
  v.dispose()
})

test('the notice blocks nothing: the pump is not held, the keys are not taken, the facts are still drawn and offers still go to the host', () => {
  const { v, V, seen } = boot()
  const actor = V.S.activeId
  v.setPlay(facts({ actor, endActivation: true }))
  v.notice(WORDS)
  assert.equal(v.held, false, 'the pump is not held'); assert.equal(V.asking, false, 'no question is being asked')
  assert.ok(V.play && V.play.actor === actor, 'the host\'s facts stand')
  const fire = (node, type) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
  fire($(V, 'playEndAct'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'end-activation' }], 'the chrome still offers')
  const before = v.cursor; v.step(); assert.equal(v.cursor > before, true, 'the board still plays')
  assert.ok(shown($(V, 'playNotice')), 'and the notice is still up while it does')
  v.dispose()
})

test('only words are a notice; a replay has none; dispose drops it', () => {
  const { w, v, V } = boot()
  for (const bad of ['', null, undefined, 7, {}]) assert.throws(() => v.notice(bad), /notice/, String(bad))
  assert.equal(shown($(V, 'playNotice')), false)
  v.notice(WORDS); v.dispose(); w._flush(5000)                    /* no timer left to fire into a disposed viewer */
  assert.throws(() => v.notice(WORDS), /disposed/)
  const r = boot({ host: false })
  assert.equal($(r.V, 'playNotice'), null, 'only for a host that plays')
  r.v.notice(WORDS); assert.equal($(r.V, 'playNotice'), null, 'a replay draws none')
  r.v.dispose()
})
