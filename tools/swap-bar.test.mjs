// movement.swap-and-shields (engine backlog; engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions
// are part of what's needed now"). The component's half of the swap on the board: while the host's plan facts carry a swap
// for the hero it plans with, the action bar's stamina strip shows it — one button per hand list the host offers, the
// engine's cost — and a click is offered to the host as {kind:'swap', index, unit}; with none to make, the engine's
// reason stands in place of the buttons; no swap fact, no swap. The host's facts are validated whole (src/play.js). The
// played battle — the engine's swap, its cost, the refusal, the shield powers from the bar — is engine
// test/movement-swap-and-shields.test.ts. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
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
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true } })
  v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  v.inspect(0)
  return { v, V: v._V, seen }
}
const fire = (node, type) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
/* the plan facts as the kingdom's play input hands them over for the hero acting (unit 0), nothing planned */
const facts = (over = {}) => ({ actor: 0, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })
const OFFER = { cost: 1, choices: [{ label: 'Nothing in hand' }, { label: 'Longsword' }, { label: 'Kite Shield' }], why: null }

test('the swap sits on the action bar\'s strip for the hero acting: the hands to hold, the cost; a click is offered to the host', () => {
  const { v, V, seen } = boot(), strip = () => V.dom.stambar.querySelector('.swapCell')
  assert.equal(strip(), null, 'no swap before the host hands its facts over')
  v.setPlay(facts())
  assert.equal(strip(), null, 'facts without a swap: none on the bar')
  v.setPlay(facts({ swap: OFFER }))
  assert.ok(strip(), 'the swap is on the bar')
  assert.ok(V.dom.stambar.querySelector('.cell1'), 'beside the stamina it is paid from')
  const btns = V.dom.stambar.querySelectorAll('.swBtn')
  assert.deepEqual(btns.map(b => b.textContent), OFFER.choices.map(c => c.label))
  assert.equal(strip().querySelector('.swCost').textContent, '1 stamina')
  assert.equal(strip().querySelector('.swWhy'), null)
  fire(btns[1], 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'swap', index: 1, unit: 0 }])
  v.dispose()
})

test('with none to make, the engine\'s reason stands on the bar and nothing can be clicked; another hero\'s bar shows none', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts({ swap: { cost: 1, choices: [], why: 'the swap of this activation is spent' } }))
  assert.equal(V.dom.stambar.querySelectorAll('.swBtn').length, 0)
  assert.equal(V.dom.stambar.querySelector('.swWhy').textContent, 'the swap of this activation is spent')
  assert.deepEqual(seen, [])
  /* the bar is the subject's: a swap the host offers for another hero is not drawn on this one */
  v.setPlay(facts({ actor: 1, swap: OFFER }))
  assert.equal(V.dom.stambar.querySelector('.swapCell'), null)
  v.setPlay(null)
  assert.equal(V.dom.stambar.querySelector('.swapCell'), null, 'cleared with the facts')
  v.dispose()
})

test('a malformed swap fact is the host\'s error, never drawn', () => {
  for (const swap of [{ cost: 1, choices: [{ label: '' }], why: null }, { cost: 1.5, choices: [], why: null }, { cost: 1, choices: [], why: null, extra: 1 }, { cost: 1, choices: 'Longsword', why: null }]) {
    const { v, V } = boot()
    assert.throws(() => v.setPlay(facts({ swap })), /invalid play facts/, JSON.stringify(swap))
    assert.equal(V.dom.stambar.querySelector('.swapCell'), null)
    v.dispose()
  }
})
