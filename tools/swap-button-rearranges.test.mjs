// viewer.swap-button-rearranges (engine backlog; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a
// rearranging of the unit's gear'). Andrew: "The button for swapping should say 'Swap'. And when you press it, it should give
// you the option to rearrange your gear." · "Just the enhanced gear, not adding gear that you didn't already have. Just the
// ability to swap hands with inventory". The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the
// Orphanage: the stamina strip carries ONE button that reads Swap, with the engine's cost; pressing it opens the gear panel —
// an element on the page, never window.prompt — showing everything the unit carries (the host's swap fact: carried), in hand
// or stowed; a press on an item moves it across; one line says the engine's cost for an arrangement the engine would take
// (choices) or the engine's own reason for one it refuses (refused); Confirm is live only for one it takes and offers it to
// the host ({kind:'swap', index, unit}); Cancel and Esc change nothing. The viewer decides nothing: it looks the arrangement
// up among the host's. What may be arranged and what it costs are the engine's, through the host (kingdom
// test/swap-button-rearranges.test.ts, tools/swap-button-rearranges.verify.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const EV = battle1.events

function boot({ host = true } = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  /* the panel is the page's own element: a native dialog throws here */
  w.prompt = q => { throw new Error('window.prompt: ' + q) }; w.confirm = q => { throw new Error('window.confirm: ' + q) }
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','confirm','prompt','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const seen = [], v = B.mount(el, data, { autoplay: false, ...(host ? { onPlay: e => { seen.push(e); return true } } : {}) })
  v.push(EV)
  v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  return { w, v, V: v._V, seen }
}
const fire = (node, type) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const shown = n => !!n && n.style.display !== 'none'
const off = b => b.getAttribute('aria-disabled') === 'true'
const facts = (over = {}) => ({ actor: 0, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })
/* the swap fact as the kingdom's play input hands it over: a hero holding a Longsword and a Kite Shield */
const SWORD = { instance: '501/0', item: 'item.longsword', name: 'Longsword', held: true }, SHIELD = { instance: '501/1', item: 'item.kite-shield', name: 'Kite Shield', held: true }
const OFFER = { cost: 1, why: null, carried: [SWORD, SHIELD],
  choices: [{ label: 'Nothing in hand', hands: [] }, { label: 'Longsword', hands: ['501/0'] }, { label: 'Kite Shield', hands: ['501/1'] }],
  refused: [{ hands: ['501/0', '501/1'], why: 'nothing changes' }] }
/* the same hero with a two-handed sword stowed as well: holding all three is more hands than there are */
const GREAT = { instance: '501/2', item: 'item.greatsword', name: 'Greatsword', held: false }
const THREE = { cost: 1, why: null, carried: [SWORD, SHIELD, GREAT],
  choices: [{ label: 'Nothing in hand', hands: [] }, { label: 'Longsword', hands: ['501/0'] }, { label: 'Kite Shield', hands: ['501/1'] }, { label: 'Greatsword', hands: ['501/2'] }],
  refused: [{ hands: ['501/0', '501/1'], why: 'nothing changes' }, { hands: ['501/0', '501/2'], why: 'more than two hands of weapons and shields' },
    { hands: ['501/1', '501/2'], why: 'more than two hands of weapons and shields' }, { hands: ['501/0', '501/1', '501/2'], why: 'more than two hands of weapons and shields' }] }
const swapBtn = V => V.dom.stambar.querySelectorAll('.swBtn')
const side = (V, id) => $(V, id).querySelectorAll('.gearItem').map(b => b.textContent)
const item = (V, name) => $(V, 'playGear').querySelectorAll('.gearItem').find(b => b.textContent === name)

test('one button that reads Swap, with the engine\'s cost; the gear panel is an element, hidden until it is pressed', () => {
  const r = boot({ host: false }); assert.equal($(r.V, 'playGear'), null, 'only for a host that plays'); r.v.dispose()
  const { v, V, seen } = boot()
  v.setPlay(facts({ swap: OFFER }))
  const btns = swapBtn(V)
  assert.deepEqual(btns.map(b => b.textContent), ['Swap'], 'one button, and it reads Swap')
  assert.equal(V.dom.stambar.querySelector('.swCost').textContent, '1 stamina')
  assert.ok($(V, 'playGear'), 'the gear panel is on the page'); assert.equal(shown($(V, 'playGear')), false, 'hidden until Swap is pressed')
  assert.equal($(V, 'playGearBox').getAttribute('role'), 'dialog')
  assert.deepEqual(seen, [])
  v.dispose()
})

test('pressing Swap opens the panel on what the unit carries: its hands, what is stowed, and nothing else; nothing is offered yet', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts({ swap: OFFER }))
  fire(swapBtn(V)[0], 'click')
  assert.ok(shown($(V, 'playGear')), 'the panel opens'); assert.equal(V.asking, true, 'the board\'s keys wait on it')
  assert.ok($(V, 'playGearTitle').textContent.includes(V.S.U[0].name), 'it says whose gear')
  assert.deepEqual(side(V, 'playGearHand'), ['Longsword', 'Kite Shield'], 'in hand: what it holds')
  assert.deepEqual(side(V, 'playGearStowed'), [], 'stowed: nothing'); assert.match($(V, 'playGearStowed').textContent, /nothing stowed/)
  assert.deepEqual($(V, 'playGear').querySelectorAll('.gearItem').map(b => b.dataset.instance).sort(), OFFER.carried.map(c => c.instance).sort(), 'exactly what it carries — no stash')
  assert.equal($(V, 'playGearSay').textContent, 'Nothing changes.', 'the arrangement it already holds: the engine\'s own reason')
  assert.ok(off($(V, 'playGearYes')), 'nothing to confirm'); assert.equal($(V, 'playGearYes').textContent, 'Swap'); assert.equal($(V, 'playGearNo').textContent, 'Cancel')
  fire($(V, 'playGearYes'), 'click'); assert.deepEqual(seen, [], 'a dead Confirm offers nothing')
  v.dispose()
})

test('an item pressed moves across; an arrangement the engine takes shows its cost and Confirm sends it', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts({ swap: OFFER })); fire(swapBtn(V)[0], 'click')
  fire(item(V, 'Kite Shield'), 'click')
  assert.deepEqual(side(V, 'playGearHand'), ['Longsword']); assert.deepEqual(side(V, 'playGearStowed'), ['Kite Shield'])
  assert.equal($(V, 'playGearSay').textContent, 'Cost: 1 stamina.'); assert.equal(off($(V, 'playGearYes')), false, 'Confirm is live')
  assert.deepEqual(seen, [], 'moving an item is not yet a swap')
  fire(item(V, 'Longsword'), 'click')
  assert.deepEqual(side(V, 'playGearHand'), []); assert.match($(V, 'playGearHand').textContent, /nothing in hand/); assert.equal($(V, 'playGearSay').textContent, 'Cost: 1 stamina.')
  fire(item(V, 'Kite Shield'), 'click')                              /* back into a hand: the shield alone */
  assert.deepEqual(side(V, 'playGearHand'), ['Kite Shield'])
  fire($(V, 'playGearYes'), 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'swap', index: 2, unit: 0 }], 'the hand list the engine named, by its index')
  assert.equal(shown($(V, 'playGear')), false, 'the panel closes'); assert.equal(V.asking, false)
  v.dispose()
})

test('Cancel and Esc change nothing; the panel opens again on what is held', () => {
  const { w, v, V, seen } = boot()
  v.setPlay(facts({ swap: OFFER })); fire(swapBtn(V)[0], 'click')
  fire(item(V, 'Longsword'), 'click'); fire($(V, 'playGearNo'), 'click')
  assert.equal(shown($(V, 'playGear')), false); assert.deepEqual(seen, [], 'Cancel offers nothing'); assert.equal(V.asking, false)
  fire(swapBtn(V)[0], 'click')
  assert.deepEqual(side(V, 'playGearHand'), ['Longsword', 'Kite Shield'], 'opened again on what it holds, not on what was tried')
  fire(item(V, 'Kite Shield'), 'click')
  w.document.dispatch('keydown', { key: 'Escape', target: V.dom.stage.parentNode, repeat: false, preventDefault() {} })
  assert.equal(shown($(V, 'playGear')), false); assert.deepEqual(seen, [], 'Esc offers nothing — not even the board\'s step back')
  v.dispose()
})

test('an arrangement the engine refuses says why in one line, and cannot be confirmed', () => {
  const { v, V, seen } = boot()
  v.setPlay(facts({ swap: THREE })); fire(swapBtn(V)[0], 'click')
  assert.deepEqual(side(V, 'playGearStowed'), ['Greatsword'], 'what is stowed on it')
  fire(item(V, 'Greatsword'), 'click')
  assert.deepEqual(side(V, 'playGearHand'), ['Longsword', 'Kite Shield', 'Greatsword'])
  assert.equal($(V, 'playGearSay').textContent, 'More than two hands of weapons and shields.', 'the engine\'s reason, as a sentence')
  assert.ok(off($(V, 'playGearYes'))); fire($(V, 'playGearYes'), 'click'); assert.deepEqual(seen, [])
  fire(item(V, 'Longsword'), 'click'); fire(item(V, 'Kite Shield'), 'click')
  assert.equal($(V, 'playGearSay').textContent, 'Cost: 1 stamina.', 'the two-handed sword alone is one the engine takes')
  fire($(V, 'playGearYes'), 'click'); assert.deepEqual(seen.splice(0), [{ kind: 'swap', index: 3, unit: 0 }])
  v.dispose()
})

test('with no arrangement the engine would take, the button still reads Swap beside the reason, and the panel says it for every arrangement', () => {
  const { v, V, seen } = boot()
  const why = 'the swap of this activation is spent'
  const SPENT = { cost: 1, why, carried: [SWORD, { ...SHIELD, held: false }], choices: [],
    refused: [[], ['501/0'], ['501/1'], ['501/0', '501/1']].map(hands => ({ hands, why })) }
  v.setPlay(facts({ swap: SPENT }))
  assert.deepEqual(swapBtn(V).map(b => b.textContent), ['Swap']); assert.equal(V.dom.stambar.querySelector('.swWhy').textContent, why); assert.equal(V.dom.stambar.querySelector('.swCost'), null)
  fire(swapBtn(V)[0], 'click')
  assert.ok(shown($(V, 'playGear')), 'the gear can still be looked at')
  assert.deepEqual(side(V, 'playGearHand'), ['Longsword']); assert.deepEqual(side(V, 'playGearStowed'), ['Kite Shield'])
  assert.equal($(V, 'playGearSay').textContent, 'The swap of this activation is spent.')
  fire(item(V, 'Kite Shield'), 'click'); assert.equal($(V, 'playGearSay').textContent, 'The swap of this activation is spent.'); assert.ok(off($(V, 'playGearYes')))
  fire($(V, 'playGearYes'), 'click'); assert.deepEqual(seen, [])
  v.dispose()
})

test('the panel stands only while the host offers that unit\'s swap; a malformed swap fact is the host\'s error', () => {
  const { v, V } = boot()
  v.setPlay(facts({ swap: OFFER })); fire(swapBtn(V)[0], 'click'); assert.ok(shown($(V, 'playGear')))
  v.setPlay(facts())                                                   /* the host offers no swap any more */
  assert.equal(shown($(V, 'playGear')), false); assert.equal(V.asking, false)
  v.setPlay(facts({ swap: OFFER })); fire(swapBtn(V)[0], 'click'); v.setPlay(null)
  assert.equal(shown($(V, 'playGear')), false, 'closed with the facts')
  for (const swap of [{ cost: 1, choices: [{ label: 'Longsword' }], why: null }, { ...OFFER, carried: [SWORD] }, { ...OFFER, carried: [SWORD, { ...SHIELD, held: 'yes' }] },
    { ...OFFER, refused: [{ hands: ['501/9'], why: 'x' }] }, { ...OFFER, choices: [{ label: '', hands: [] }] }, { ...OFFER, refused: [{ hands: [], why: '' }] }, { ...OFFER, extra: 1 }])
    assert.throws(() => v.setPlay(facts({ swap })), /invalid play facts/, JSON.stringify(swap).slice(0, 80))
  v.dispose()
})
