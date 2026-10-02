// fix.shield-power-double-click (engine DECISIONS.md 2026-10-01 'a self power fires on a double-click on its bar button':
// Andrew: "I should be able to double-click on it in the bar and have it activate"). The component's half: a double-click
// on an action-bar row is the row offered to the host a second time, by its dblclick — the pair's second click (detail 2)
// is not offered on its own, so a row is never offered three times; when the pair's first click set the host resolving
// (no plan facts, the bar still), the double-click is held and offered once, when the host hands its facts back (viewer
// SWITCHES barDoubleClick). The host's half and the real mouse on the built sandbox are kingdom test/swap-shields-play.test.ts
// and engine test/fix-shield-power-double-click.test.ts. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))

function boot() {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true } })
  v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  v.inspect(0)
  return { v, V: v._V, seen }
}
/* the plan facts as the kingdom's play input hands them over for the hero acting (unit 0), nothing planned */
const facts = (over = {}) => ({ actor: 0, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })
const click = (node, detail) => { for (const f of node.listeners.click || []) f({ detail, button: 0, stopPropagation() {}, preventDefault() {} }) }
const dbl = node => { for (const f of node.listeners.dblclick || []) f({ detail: 2, button: 0, stopPropagation() {}, preventDefault() {} }) }
const rowOf = V => V.dom.actionbar.querySelectorAll('.acRow').find(r => r.dataset.act)

test('a double-click on a row offers it twice: the first click, then the dblclick — never the second click of the pair', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts())
  const r = rowOf(V), act = r.dataset.act
  click(r, 1); click(rowOf(V), 2); dbl(rowOf(V))
  assert.deepEqual(seen.splice(0), [{ kind: 'slot', actionId: act, unit: 0 }, { kind: 'slot', actionId: act, unit: 0 }])
  v.dispose()
})

test('a double-click while the host resolves is held, and offered once when the host hands its facts back', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts())
  const act = rowOf(V).dataset.act
  click(rowOf(V), 1)
  v.setPlay(null)                         // the first click began the activation: the host resolves, the bar is still
  click(rowOf(V), 2); dbl(rowOf(V))
  assert.deepEqual(seen.splice(0), [{ kind: 'slot', actionId: act, unit: 0 }], 'nothing offered while the host resolves')
  v.setPlay(facts())
  assert.deepEqual(seen.splice(0), [{ kind: 'slot', actionId: act, unit: 0 }], 'offered when the facts come back')
  v.setPlay(facts())
  assert.deepEqual(seen, [], 'and only once')
  v.dispose()
})

test('a held double-click is dropped by a scrub', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts()); v.setPlay(null); dbl(rowOf(V))
  v.seek(V.cursor)
  v.setPlay(facts())
  assert.deepEqual(seen, [], 'the scrub dropped it')
  v.dispose()
})
