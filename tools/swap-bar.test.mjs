// movement.swap-and-shields (engine backlog; engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions
// are part of what's needed now"). The component's half of the swap on the board: while the host's plan facts carry a swap
// for the hero it plans with, the action bar's stamina strip shows it — one button per hand list the host offers, the
// engine's cost — and a click is offered to the host as {kind:'swap', index, unit}; with none to make, the engine's
// reason stands in place of the buttons; no swap fact, no swap. The host's facts are validated whole (src/play.js). The
// played battle — the engine's swap, its cost, the refusal, the shield powers from the bar — is engine
// test/movement-swap-and-shields.test.ts. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
// 2026-10-04, viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging
// of the unit's gear'): the strip now carries ONE button that reads Swap; the hand lists are chosen in the gear panel it opens
// and offered on Confirm. The three tests below are rewritten as that rule, each with a note of what it asserted before; the
// gear panel itself is tools/swap-button-rearranges.test.mjs.
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
/* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'): the swap fact names what the unit carries, the hand lists the engine takes with their
   instances, and the arrangements it refuses. was: const OFFER = { cost: 1, choices: [{ label: 'Nothing in hand' },
   { label: 'Longsword' }, { label: 'Kite Shield' }], why: null } */
const CARRIED = [{ instance: '501/0', item: 'item.longsword', name: 'Longsword', held: true }, { instance: '501/1', item: 'item.kite-shield', name: 'Kite Shield', held: true }]
const OFFER = { cost: 1, why: null, carried: CARRIED,
  choices: [{ label: 'Nothing in hand', hands: [] }, { label: 'Longsword', hands: ['501/0'] }, { label: 'Kite Shield', hands: ['501/1'] }],
  refused: [{ hands: ['501/0', '501/1'], why: 'nothing changes' }] }
const $ = (V, id) => V.dom.root.querySelector('#' + id)

/* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'), Andrew: "The button for swapping should say 'Swap'. And when you press it, it should
   give you the option to rearrange your gear." Rewritten as the rule. was: 'the swap sits on the action bar's strip for the
   hero acting: the hands to hold, the cost; a click is offered to the host' — one .swBtn per hand list, their texts the
   choices' labels, and a click on the second offered {kind:'swap', index:1, unit:0} at once. Now: one button that reads
   Swap; a click opens the gear panel and offers nothing; the same hand list (the Longsword alone, index 1) is offered once
   it is arranged in the panel and confirmed. */
test('the swap sits on the action bar\'s strip for the hero acting: one button that reads Swap, the cost; the hands to hold are chosen in the gear panel and offered to the host on Confirm', () => {
  const { v, V, seen } = boot(), strip = () => V.dom.stambar.querySelector('.swapCell')
  assert.equal(strip(), null, 'no swap before the host hands its facts over')
  v.setPlay(facts())
  assert.equal(strip(), null, 'facts without a swap: none on the bar')
  v.setPlay(facts({ swap: OFFER }))
  assert.ok(strip(), 'the swap is on the bar')
  assert.ok(V.dom.stambar.querySelector('.cell1'), 'beside the stamina it is paid from')
  const btns = V.dom.stambar.querySelectorAll('.swBtn')
  assert.deepEqual(btns.map(b => b.textContent), ['Swap'])
  assert.equal(strip().querySelector('.swCost').textContent, '1 stamina')
  assert.equal(strip().querySelector('.swWhy'), null)
  fire(btns[0], 'click')
  assert.deepEqual(seen, [], 'pressing Swap opens the panel; nothing is offered yet')
  assert.notEqual($(V, 'playGear').style.display, 'none', 'the gear panel is open')
  fire($(V, 'playGear').querySelectorAll('.gearItem').find(b => b.textContent === 'Kite Shield'), 'click')   /* stow the shield: the Longsword alone */
  fire($(V, 'playGearYes'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'swap', index: 1, unit: 0 }])
  v.dispose()
})

/* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'): rewritten as the rule. was: 'with none to make, the engine's reason stands on the bar
   and nothing can be clicked' — no .swBtn at all (the buttons WERE the hand lists). Now the one Swap button stays beside the
   engine's reason (the gear can still be looked at), and nothing it opens can be confirmed: nothing is offered. */
test('with none to make, the engine\'s reason stands on the bar beside the Swap button and nothing can be confirmed; another hero\'s bar shows none', () => {
  const { v, V, seen } = boot()
  const spent = 'the swap of this activation is spent'
  v.setPlay(facts({ swap: { cost: 1, choices: [], why: spent, carried: CARRIED, refused: [[], ['501/0'], ['501/1'], ['501/0', '501/1']].map(hands => ({ hands, why: spent })) } }))
  assert.deepEqual(V.dom.stambar.querySelectorAll('.swBtn').map(b => b.textContent), ['Swap'])
  assert.equal(V.dom.stambar.querySelector('.swWhy').textContent, 'the swap of this activation is spent')
  fire(V.dom.stambar.querySelectorAll('.swBtn')[0], 'click'); fire($(V, 'playGearYes'), 'click'); fire($(V, 'playGearNo'), 'click')
  assert.deepEqual(seen, [])
  /* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the action bar and its card stay with the activated unit':
     "I click on an enemy, and the enemy just goes into the highlight on the right screen, but it doesn't change my actions
     that are available"): the bar is the activated hero's — the host's actor — whoever is looked at, so a swap for "another
     hero" can no longer stand on a bar that is not its own. was: the bar is the subject's: a swap the host offers for another
     hero is not drawn on this one — v.setPlay(facts({ actor: 1, swap: OFFER })); assert.equal(V.dom.stambar.querySelector('.swapCell'), null).
     Now: the acting hero's swap stays on its bar while another unit is looked at */
  v.setPlay(facts({ swap: OFFER })); v.inspect(Object.values(V.S.U).find(u => u.id !== 0).id)
  assert.ok(V.dom.stambar.querySelector('.swapCell'), "the acting hero's swap stays on its bar while another unit is looked at")
  v.setPlay(null)
  assert.equal(V.dom.stambar.querySelector('.swapCell'), null, 'cleared with the facts')
  v.dispose()
})

test('a malformed swap fact is the host\'s error, never drawn', () => {
  /* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'): the same four faults, on the fact's new shape — an empty label, a cost that is no
     whole number, a key the fact does not have, choices that are no list — and the old shape itself, which is now one.
     was: [{ cost: 1, choices: [{ label: '' }], why: null }, { cost: 1.5, choices: [], why: null },
     { cost: 1, choices: [], why: null, extra: 1 }, { cost: 1, choices: 'Longsword', why: null }] */
  for (const swap of [{ ...OFFER, choices: [{ label: '', hands: [] }] }, { ...OFFER, cost: 1.5 }, { ...OFFER, extra: 1 }, { ...OFFER, choices: 'Longsword' }, { cost: 1, choices: [{ label: 'Longsword' }], why: null }]) {
    const { v, V } = boot()
    assert.throws(() => v.setPlay(facts({ swap })), /invalid play facts/, JSON.stringify(swap))
    assert.equal(V.dom.stambar.querySelector('.swapCell'), null)
    v.dispose()
  }
})
