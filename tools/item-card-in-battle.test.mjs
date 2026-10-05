// viewer.item-card-in-battle (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: notices, target lines, item cards,
// arrows, move costs on hexes, knocked down, bodies, cursed ground, the first hero's positives' and 'the playtest post
// answered'). Andrew: "When you're selecting items in the equipment phase, you need to be able to look at your items somehow.
// You need to be able to click on them, and then they pop up somewhere on the screen, to the right or somewhere, as a card with
// a description.   We also need to be able to do something similar. When you're focusing on a character, you need to be able to
// look at their items when you're in battle."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage's recording. The card is the
// HOST's — one card, the kingdom's (kingdom.equip-item-card: itemCardOf / itemCardHtml), never written a second time here: a
// host hands the component `itemCard(itemId)`, which answers the card's markup or null. The component makes each item's name
// in the focused unit's panel a thing to click, asks the host for the card, and stands it beside the panel; the same name
// again, a click anywhere else, or another unit in the panel closes it; another item replaces it. With no host function the
// panel is what it was. The host's half — the built sandbox, the Holy Symbol's own card — is kingdom
// tools/item-card-in-battle.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const EV = orphanage.events

/** the host's card in these tests: markup that names the item, so the test can tell whose card stands */
const CARD = id => `<aside class="itemcard" data-item-card="${id}"><div class="ic-name">card of ${id}</div></aside>`
function boot(opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: orphanage.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const asked = []
  const v = B.mount(host, data, { autoplay: false, ...('itemCard' in opts ? (opts.itemCard ? { itemCard: opts.itemCard } : {}) : { itemCard: id => { asked.push(id); return CARD(id) } }) })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin') + 1)
  return { w, v, V: v._V, asked }
}
const has = (n, cls) => n.className.split(/\s+/).includes(cls)
const itemRows = V => V.dom.panel.querySelectorAll('.pItem')
const filled = V => itemRows(V).filter(r => r.dataset.item)
const rowOf = (V, item) => itemRows(V).find(r => r.dataset.item === item)
const press = n => { for (const f of n.listeners.click || []) f({ target: n, detail: 1, button: 0, stopPropagation() {}, preventDefault() {} }) }
const holder = V => V.dom.root.querySelector('#itemCardAt')
const standing = V => { const at = holder(V); if (!at || at.style.display === 'none') return null; const c = at.querySelector('.itemcard'); return c ? c.dataset.itemCard : null }
/* the units of the recording that carry items: who, and which */
const carried = {}; for (const e of EV) if (e.type === 'unit.equipped') (carried[e.actor] ??= []).push(e.itemId)
const SIDE = Object.fromEntries(EV.filter(e => e.type === 'unit.enter').map(e => [e.actor, e.side]))
const HERO = +Object.keys(carried).find(id => SIDE[id] === 'hero' && new Set(carried[id]).size >= 2), OTHER = +Object.keys(carried).find(id => +id !== HERO && SIDE[id] === 'hero')

test('the recording: a hero\'s unit carries two different items, and another carries one', () => {
  assert.ok(Number.isInteger(HERO) && Number.isInteger(OTHER), JSON.stringify(carried))
  for (const id of [...carried[HERO], ...carried[OTHER]]) assert.ok(STATIC.items[id], id + ' is an item of the dump')
})

test('with no card from a host the panel is what it was: its item rows are not things to click and no card can stand', () => {
  const { v, V } = boot({ itemCard: null }); v.inspect(HERO)
  assert.ok(filled(V).length >= 2)
  for (const r of itemRows(V)) { assert.ok(!has(r, 'look'), 'not marked as a thing to click'); assert.equal(r.getAttribute('role'), null); assert.equal((r.listeners.click || []).length, 0) }
  assert.equal(standing(V), null)
  v.dispose()
})

test('a host that has cards: each item\'s name in the focused unit\'s panel is a thing to click — an empty hand or slot is not — and clicking one stands the HOST\'s card for that item beside the panel', () => {
  const { v, V, asked } = boot(); v.inspect(HERO)
  const rows = filled(V); assert.ok(rows.length >= 2)
  for (const r of rows) { assert.ok(has(r, 'look'), r.dataset.item + ' is a thing to click'); assert.equal(r.getAttribute('role'), 'button'); assert.equal(r.getAttribute('aria-expanded'), 'false') }
  for (const r of itemRows(V).filter(x => !x.dataset.item)) { assert.ok(!has(r, 'look'), 'an empty place is not'); assert.equal((r.listeners.click || []).length, 0) }
  assert.equal(standing(V), null, 'no card until a name is clicked'); assert.deepEqual(asked, [], 'and the host is not asked until then')
  const item = rows[0].dataset.item
  press(rows[0])
  assert.deepEqual(asked, [item], 'the host is asked for that item\'s card, once')
  assert.equal(standing(V), item, 'the host\'s card stands, as the host made it')
  assert.ok(holder(V).textContent.includes('card of ' + item), 'its words are the host\'s, none of the page\'s own')
  assert.equal(rowOf(V, item).getAttribute('aria-expanded'), 'true'); assert.ok(has(rowOf(V, item), 'looked'), 'the row whose card is open is marked')
  for (const r of filled(V)) if (r.dataset.item !== item) assert.equal(r.getAttribute('aria-expanded'), 'false')
  /* the card is not in the panel and not over it: it hangs from the page's root, beside the panel */
  const within = (n, anc) => { for (let p = n; p; p = p.parentNode) if (p === anc) return true; return false }
  assert.equal(holder(V).parentNode, V.dom.root); assert.equal(within(holder(V), V.dom.panel), false)
  v.dispose()
})

test('the same name again closes it; another item\'s name replaces it; a click anywhere else closes it; a click on the card itself does not', () => {
  const { v, V, w, asked } = boot(); v.inspect(HERO)
  const [a, b] = [...new Set(filled(V).map(r => r.dataset.item))]; assert.ok(a && b && a !== b)
  press(rowOf(V, a)); assert.equal(standing(V), a)
  press(rowOf(V, a)); assert.equal(standing(V), null, 'the same name again closes it'); assert.equal(rowOf(V, a).getAttribute('aria-expanded'), 'false')
  press(rowOf(V, a)); press(rowOf(V, b)); assert.equal(standing(V), b, 'another item replaces it — one card')
  assert.equal(holder(V).querySelectorAll('.itemcard').length, 1)
  assert.deepEqual(asked, [a, a, b])
  /* a click on the card itself (reading it, selecting its words): it stays */
  w.document.dispatch('click', { target: holder(V).querySelector('.itemcard') }); assert.equal(standing(V), b, 'a click on the card leaves it')
  /* a click anywhere else — the board, the bar, the page */
  w.document.dispatch('click', { target: V.dom.stage }); assert.equal(standing(V), null, 'a click away closes it')
  assert.equal(rowOf(V, b).getAttribute('aria-expanded'), 'false')
  press(rowOf(V, b)); w.document.dispatch('click', { target: V.dom.actionbar }); assert.equal(standing(V), null)
  v.dispose()
})

test('the card is the focused character\'s: another unit in the panel closes it, and the card of an item is asked of the host each time — the page keeps none', () => {
  const { v, V, asked } = boot(); v.inspect(HERO)
  const a = filled(V)[0].dataset.item
  press(rowOf(V, a)); assert.equal(standing(V), a)
  v.inspect(OTHER); assert.equal(standing(V), null, 'another unit in the panel: the card is gone')
  const o = filled(V)[0].dataset.item; press(rowOf(V, o)); assert.equal(standing(V), o, 'and that unit\'s item opens its own')
  assert.deepEqual(asked, [a, o])
  v.inspect(HERO); assert.equal(standing(V), null)
  v.dispose()
})

test('a host that has no card for an item (null), or whose card is not markup: nothing stands and nothing breaks', () => {
  const { v, V } = boot({ itemCard: () => null }); v.inspect(HERO)
  press(filled(V)[0]); assert.equal(standing(V), null); assert.equal(filled(V)[0].getAttribute('aria-expanded'), 'false')
  v.dispose()
  const x = boot({ itemCard: () => 42 }); x.v.inspect(HERO); press(filled(x.V)[0]); assert.equal(standing(x.V), null); x.v.dispose()
})

test('it is the same for a unit of the enemy\'s that carries an item: its rows open the card as a hero\'s do', () => {
  /* No enemy carries an item in any battle the engine fields today (none of its non-hero rows holds one, an enemy-side unit is
     not equipped at fielding, and a hero that is turned keeps none of its kit — tools/fixtures/turned-heroes.json), so there is
     no engine-made log to read this off. The state is MADE BY HAND here, and only here: the folded side of a unit that carries
     items is set to the enemy's, to hold that nothing in the card's path asks whose side the unit is on. */
  const { v, V } = boot(); v.inspect(HERO)
  V.S.U[HERO].side = 'enemy'; v.inspect(OTHER); v.inspect(HERO)
  const rows = filled(V); assert.ok(rows.length >= 1, 'an enemy that carries items lists them (viewer.panel-lists-items)')
  for (const r of rows) assert.ok(has(r, 'look'))
  press(rows[0]); assert.equal(standing(V), rows[0].dataset.item)
  v.dispose()
})

test('the look, in the page\'s stylesheet: the card stands beside the panel — left of it, clear of its 472 px — in the page\'s own flow, and a name that can be clicked shows it', () => {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  const rule = sel => { const m = css.match(new RegExp('(?:^|[}\\n])' + sel.replace(/[#.]/g, c => '\\' + c) + '\\{([^}]*)\\}')); assert.ok(m, 'the stylesheet has ' + sel); return m[1] }
  const at = rule('#itemCardAt'), px = (s, p) => { const m = s.match(new RegExp('(?:^|;)' + p + ':\\s*(-?[0-9.]+)px')); assert.ok(m, p + ' in ' + s); return +m[1] }
  assert.match(at, /position:\s*absolute/)
  const panel = px(rule('#panel'), 'width')
  assert.ok(px(at, 'right') >= panel, `its right edge is at ${px(at, 'right')} px from the page's right: clear of the ${panel} px panel`)
  assert.ok(px(at, 'right') - panel <= 24, 'and right beside it')
  assert.match(rule('#itemCardAt .itemcard'), /position:\s*static/, 'the host\'s card sits in the holder, wherever its own screen pins it')
  assert.match(rule('.pItem.look'), /cursor:\s*pointer/)
})
