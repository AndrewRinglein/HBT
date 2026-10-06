// viewer.panel-lists-items (engine backlog; engine DECISIONS.md 2026-10-03 'the civilians show on the victory screen; the
// specialty three are random; the battle's unit panel lists what the unit is equipped with'). Andrew: "This priest only has a
// verse attack. It seems like he has nothing in his hands. I don't understand what he's equipped with. We need the items listed
// under the characters on the right in battle." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html):
// the right-hand panel has an items section under the character — what the unit holds in each hand, its armor, what is in its
// item slots and what is stowed for the swap — each by the item's own name, with what it gives (its attacks and powers, its
// stat changes). Everything read is the engine's: which items and what each put on the unit is the log (unit.equipped,
// unit.enter's stowed, loadout.swapped); each item's name, class and hands is its own row through the door (static.json
// items); the two hands are the engine's count (static.json hands). An empty hand or slot says so. A unit that carries
// nothing and is not the player's has no items section. The sandbox's half is kingdom tools/panel-lists-items.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { foldTo } from '../src/fold.js'
import { itemsOf } from '../src/items.js'
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const swapLog = JSON.parse(readFileSync('tools/fixtures/loadout-swap.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))

function boot(battle) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'battle.begin') + 1)
  return { w, v, V: v._V, L, EV }
}
/** the panel's items, as drawn: [{slot, item, name, gives, title}] */
/* the page test's DOM hands text back as written; a browser shows the characters (an apostrophe in a name) */
const text = x => String(x ?? '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const rows = V => V.dom.panel.querySelectorAll('.pItem').map(r => ({ slot: r.dataset.slot, item: r.dataset.item || null,
  name: text((r.querySelector('.pItemName') || {}).textContent), gives: text((r.querySelector('.pItemGives') || {}).textContent), title: text(r.getAttribute('title')) }))
const of = (rs, slot) => rs.filter(r => r.slot === slot)
/** what the log says each unit was fielded with: its unit.equipped lines, in order */
const equipped = (EV, id, upTo = Infinity) => EV.filter((e, i) => i < upTo && e.type === 'unit.equipped' && e.actor === id)

test('the page carries the engine\'s own item rows and its count of hands, through the door', () => {
  const { v, L } = boot(orphanage)
  assert.ok(L.static.items && Object.keys(L.static.items).length > 100, 'static.json items')
  assert.equal(Object.keys(L.static.items).length, Object.keys(L.static.itemClasses).length, 'every item the engine has')
  const texts = L.static.items['item.holy-texts']
  assert.equal(texts.name, 'Holy Texts'); assert.equal(texts.itemClass, L.static.itemClasses['item.holy-texts']); assert.ok(texts.grants.includes('attack.holy-texts.verse'))
  assert.ok(Number.isInteger(texts.hands) && texts.hands > 0, 'a held item takes hands'); assert.equal(L.static.items['item.flowing-cloak'].hands, 0, 'a worn item takes none')
  assert.ok(Number.isInteger(L.static.hands) && L.static.hands > 0, 'the engine\'s hands')
  v.dispose()
})

test('a hero: each hand, its armor, its item slots and what is stowed — by name, with what each gives, from the log', () => {
  const { v, V, L, EV } = boot(orphanage)
  const hero = Object.values(V.S.U).find(u => u.side === 'hero' && equipped(EV, u.id).length > 1)
  v.inspect(hero.id)
  const head = V.dom.panel.querySelector('.pItems'); assert.ok(head, 'the items section'); assert.match(head.textContent, /Items/)
  const rs = rows(V), eq = equipped(EV, hero.id), I = L.static.items
  for (const e of eq) {
    const r = rs.find(x => x.item === e.itemId); assert.ok(r, `${e.itemId} is listed`)
    assert.equal(r.name, I[e.itemId].name, 'by its own name')
    for (const g of [...e.grants, ...e.abilities]) assert.ok(r.gives.includes(L.static.actions[g].name), `${r.name} gives ${L.static.actions[g].name}: "${r.gives}"`)
    for (const [k, n] of Object.entries(e.mods)) assert.match(r.gives, new RegExp('\\b' + k.replace(/([A-Z])/g, ' $1').split(' ')[0].toUpperCase().slice(0, 3) + '\\w* [+-]?' + Math.abs(n)), `${r.name} shows ${k} ${n}: "${r.gives}"`)
    assert.ok(r.title.includes(r.name), 'and on hover')
  }
  const bow = eq.find(e => I[e.itemId].hands === L.static.hands)
  assert.ok(bow, 'this hero holds a weapon that takes every hand'); assert.equal(rs.find(x => x.item === bow.itemId).slot, 'both-hands')
  assert.equal(of(rs, 'hand').length, 0, 'no single hand left over')
  const cloak = eq.find(e => I[e.itemId].itemClass === 'armor'); assert.equal(rs.find(x => x.item === cloak.itemId).slot, 'armor')
  assert.deepEqual(of(rs, 'slot').map(r => [r.item, r.name]), [[null, 'empty']], 'an empty item slot says so')
  assert.deepEqual(of(rs, 'stowed').map(r => [r.item, r.name]), [[null, 'nothing']], 'nothing stowed says so')
  v.dispose()
})

test('a civilian: its dagger in one hand, the other hand empty, no armor — said, not left out', () => {
  const { v, V, L, EV } = boot(orphanage)
  const civ = Object.values(V.S.U).find(u => /orphan|teacher/.test(u.typeId))
  v.inspect(civ.id)
  const rs = rows(V), e = equipped(EV, civ.id)[0]
  assert.deepEqual(of(rs, 'hand').map(r => [r.item, r.name]), [[e.itemId, L.static.items[e.itemId].name], [null, 'empty']])
  assert.match(of(rs, 'hand')[0].gives, /Stab/); assert.match(of(rs, 'hand')[0].gives, /BLOCK \+5/)
  assert.deepEqual(of(rs, 'armor').map(r => [r.item, r.name]), [[null, 'none']])
  v.dispose()
})

test('an enemy that carries nothing has no items section; an enemy with a weapon assigned would list it', () => {
  const { v, V } = boot(orphanage)
  const zombie = Object.values(V.S.U).find(u => u.side === 'enemy')
  v.inspect(zombie.id)
  assert.equal(V.dom.panel.querySelector('.pItems'), null, 'nothing carried, nothing listed')
  /* the same enemy, had the log fielded it with a weapon (the engine's own line shape) */
  zombie.kit.held.push({ instanceId: 'x/0', itemId: 'item.dagger', grants: ['attack.dagger.stab'], abilities: [] }); zombie.kit.items.push('item.dagger')
  v.render()
  assert.deepEqual(of(rows(V), 'hand').map(r => r.name), ['Dagger', 'empty'])
  v.dispose()
})

test('the swap moves an item between the hands and what is stowed: the rows follow the log (the engine log of one swap)', () => {
  /* the fixture is a bare engine log (no map to mount): the rows are read from the fold, through the same pure function
     the panel draws from (src/items.js itemsOf) */
  const EV = swapLog.events, ctx = { UD: STATIC.units, SN: STATIC.statuses }, D = { ITEMS: STATIC.items, HANDS: STATIC.hands, ACT: STATIC.actions }
  const at = EV.findIndex(e => e.type === 'loadout.swapped'), swap = EV[at], hero = swap.actor, I = STATIC.items
  const enter = EV.find(e => e.type === 'unit.enter' && e.actor === hero)
  const held = rs => rs.filter(r => r.slot === 'hand' || r.slot === 'both-hands').map(r => r.item).filter(Boolean)
  let rs = itemsOf(foldTo(EV, at, ctx).U[hero], D)
  assert.deepEqual(held(rs), swap.handsBefore.map(i => i.itemId), 'before: the hands the swap names')
  assert.deepEqual(of(rs, 'stowed').map(r => r.item), enter.stowed.map(i => i.itemId), 'and what it carried in stowed')
  const stowedRow = I[enter.stowed[0].itemId], first = stowedRow.abilities[0] || stowedRow.grants[0]
  assert.ok(of(rs, 'stowed')[0].gives.includes(STATIC.actions[first].name), 'a stowed item says what it would give in hand')
  rs = itemsOf(foldTo(EV, EV.length, ctx).U[hero], D)
  assert.deepEqual(held(rs), swap.handsAfter.map(i => i.itemId), 'after: the hands are those the swap names after')
  for (const i of swap.handsBefore.filter(b => !swap.handsAfter.some(a => a.instanceId === b.instanceId))) assert.ok(of(rs, 'stowed').some(r => r.item === i.itemId), i.itemId + ' is now stowed')
  const arrived = EV.find((e, n) => n > at && e.type === 'unit.equipped' && e.actor === hero)
  for (const g of [...arrived.grants, ...arrived.abilities]) assert.ok(rs.find(r => r.item === arrived.itemId).gives.includes(STATIC.actions[g].name), 'what came to hand gives what the log says')
})

/* content.dwarf-elf-fey-badges-act (engine item, 2026-10-05; engine DECISIONS.md 2026-10-05 'a prone unit only stands; … Dwarf, Elf
   and Fey act; …': "6. They should act."): "the badge's line on the panel … says what it does". Under the badge chips the panel
   says each badge whose row changes a stat, in the engine row's own numbers, and the chip's hover says the same; a badge that
   changes none has its chip and no line. On the library's battle of the Banner of Courage, whose warrior is the Iron Dwarf. */
test('the panel says what a badge does from the engine\'s row: the Dwarf\'s line under the Iron Dwarf\'s chips, and on the chip\'s hover', async () => {
  const { badgeWords } = await import('../src/actions.js')
  const battle = JSON.parse(readFileSync('battles/test.banner-courage.json', 'utf8'))
  const { v, V, L } = boot(battle)
  const dwarf = Object.values(V.S.U).find(u => u.typeId === 'hero.base.warrior-iron')
  assert.ok(dwarf, 'the battle fields the Iron Dwarf'); assert.ok(dwarf.badges.includes('badge.dwarf'))
  const row = L.static.badges['badge.dwarf']
  assert.deepEqual(row.statModifiers, { movement: -1, maxHp: 2 }, 'the engine\'s row carries the numbers')
  assert.equal(badgeWords(row), 'MOVE -1 · MAX HEALTH +2')
  assert.equal(badgeWords(L.static.badges['badge.elf']), 'VISION +3 · LUCK +2')
  assert.equal(badgeWords(L.static.badges['badge.fey']), 'SURGE +10')
  assert.equal(badgeWords(L.static.badges['badge.hero']), '', 'a badge that changes no stat has no line')
  v.inspect(dwarf.id)
  const line = V.dom.panel.querySelectorAll('.badgeline').find(n => n.dataset.badgeLine === 'badge.dwarf')
  assert.ok(line, 'the Dwarf badge\'s line is on the panel')
  /* the line as written: the badge's name in bold, then its numbers (the test page's textContent does not keep that order) */
  assert.match(text(V.dom.panel.innerHTML), /data-badge-line="badge\.dwarf"[^>]*><b[^>]*>Dwarf<\/b> MOVE -1 · MAX HEALTH \+2<\/div>/)
  // one line for each of the unit's badges that changes a stat, and none for the others
  const withNumbers = dwarf.badges.filter(id => badgeWords(L.static.badges[id]))
  assert.deepEqual(V.dom.panel.querySelectorAll('.badgeline').map(n => n.dataset.badgeLine), withNumbers)
  assert.equal(withNumbers.includes('badge.hero'), false)
  assert.match(V.dom.panel.innerHTML, /title="Dwarf — MOVE -1 · MAX HEALTH \+2" data-badge="badge\.dwarf"/)
  v.dispose()
})
