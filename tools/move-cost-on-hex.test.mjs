// viewer.move-cost-on-hex (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...', 'the playtest post answered' and
// 'seven answers: ... an X on a hex that cannot be walked ...'). Andrew: "When you are in the movement phase, if there are
// squares in your movement area that cost 2 or can't be walked through, that number needs to be on the square." - asked "is an
// X right for a hex you can't walk through": "6, yes".
// viewer.move-cost-on-grid (2026-10-03) put the cost on the tiles of the blue grid. This item adds the hexes BORDERING it: a hex
// next to the area that costs this unit more than one shows its number though no blue tile is under it (it is why the grid
// stops there), and a hex the unit cannot enter at all shows an X. The host says both (play facts `reachBorder`: [{hex, cost}],
// cost null for a hex that cannot be entered - the engine's answers for THIS unit); the page draws them and works nothing out.
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage. The sandbox's half is
// kingdom tools/move-cost-on-hex.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\("data:[^"]*"\)/g, 'url()')
const EV = battle1.events

function boot() {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, tagCarriers: L.static.tagCarriers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V }
}
const facts = (actor, more = {}) => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...more })
const q = (V, cls) => V.layers.play ? V.layers.play.querySelectorAll('.' + cls) : []
const read = (V, cls) => q(V, cls).map(n => ({ hex: +n.dataset.hex, text: n.textContent })).sort((a, b) => a.hex - b.hex)
/** an area as a host would hand it: the hexes within 2 of the acting hero that the field says can be entered, and the ring of hexes bordering it */
function areaOf(V) {
  const u = V.S.U[V.S.activeId], { F, POS, distance } = V.data, all = Object.keys(POS).map(Number)
  const taken = new Set(Object.values(V.S.U).filter(x => x.life !== 'dead').map(x => x.hex))
  const reach = all.filter(h => h !== u.hex && distance(u.hex, h) <= 2 && F.passable[h] && !taken.has(h)).sort((a, b) => a - b), area = new Set([u.hex, ...reach])
  const border = all.filter(h => !area.has(h) && !taken.has(h) && [...area].some(a => distance(a, h) === 1)).sort((a, b) => a - b)
  return { u, reach, border, F }
}

test('a hex bordering the movement area that costs more than one shows its number; one that cannot be entered shows an X; one that costs one shows nothing', () => {
  const { v, V } = boot(), { u, reach, border, F } = areaOf(V)
  assert.ok(border.length >= 8, 'the area has a border')
  /* the host's word for each bordering hex - here made from the field so every kind is among them: a cost, or null for a hex that cannot be entered */
  const reachBorder = border.map((hex, k) => ({ hex, cost: k % 4 === 0 ? null : k % 4 === 1 ? 2 : k % 4 === 2 ? 3 : 1 }))
  const blocked = reachBorder.filter(c => c.cost === null), dear = reachBorder.filter(c => c.cost > 1), plain = reachBorder.filter(c => c.cost === 1)
  assert.ok(blocked.length >= 2 && dear.length >= 2 && plain.length >= 1)
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachCost: reach.map(hex => ({ hex, cost: F.moveCost[hex] })), reachBorder }))
  assert.deepEqual(read(V, 'playCostNear'), dear.map(c => ({ hex: c.hex, text: String(c.cost) })), 'its number on exactly the bordering hexes that cost more than one')
  assert.deepEqual(read(V, 'playBlocked'), blocked.map(c => ({ hex: c.hex, text: 'X' })), 'an X on exactly the hexes that cannot be entered')
  for (const c of plain) for (const cls of ['playCostNear', 'playBlocked', 'playCost']) assert.ok(!q(V, cls).some(n => +n.dataset.hex === c.hex), `hex ${c.hex} costs one: nothing on it`)
  /* no blue tile under a bordering hex: it is not a hex the unit can walk to */
  const tiles = new Set(q(V, 'playReach').map(n => +n.dataset.hex)); for (const c of reachBorder) assert.ok(!tiles.has(c.hex), 'a bordering hex is not part of the grid')
  /* the grid's own numbers (viewer.move-cost-on-grid) are as they were: the reach hexes that cost more than one, and only those */
  assert.deepEqual(read(V, 'playCost'), reach.filter(h => F.moveCost[h] > 1).map(hex => ({ hex, text: String(F.moveCost[hex]) })))
  /* each mark lies on its hex, with the grid, and takes no pointer; the X is the number's own look */
  const { POS } = V.data
  for (const n of [...q(V, 'playCostNear'), ...q(V, 'playBlocked')]) { const p = POS[+n.dataset.hex]
    assert.equal(n.style.left, p.px + 'px'); assert.equal(n.style.top, p.py + 'px'); assert.match(n.style.transform, /translate\(-50%,-50%\)/); assert.match(n.style.transform, /rotateZ\(var\(--unspin/) }
  const look = sel => { const out = []; for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(',').map(s => s.trim()).includes(sel)) out.push(m[2]); return out.join(';') }
  for (const sel of ['.playCostNear', '.playBlocked']) { assert.match(look(sel), /pointer-events:\s*none/, sel); assert.match(look(sel), /position:\s*absolute/, sel); assert.match(look(sel), /font-weight:\s*700/, sel) }
  assert.equal(look('.playCostNear').includes(look('.playCost')), true, 'a bordering number wears the grid number\'s look')
  v.dispose()
})

test('the marks are the host\'s: none it did not send, none worked out; they go when the move is made or the action is dropped', () => {
  const { v, V } = boot(), { u, reach, border, F } = areaOf(V)
  /* the field knows ground that cannot be entered and ground that costs two; the page puts nothing on it by itself */
  const stone = border.filter(h => !F.passable[h]), rough = border.filter(h => F.passable[h] && F.moveCost[h] > 1)
  v.setPlay(facts(u.id, { slot: 'power.move', reach }))
  assert.deepEqual(read(V, 'playBlocked'), []); assert.deepEqual(read(V, 'playCostNear'), [], `no host word, no mark (${stone.length} bordering hexes cannot be entered, ${rough.length} cost more)`)
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachBorder: [] })); assert.deepEqual(read(V, 'playBlocked'), []); assert.deepEqual(read(V, 'playCostNear'), [])
  /* a flier's area: the host names no cost and no blocked hex, so the grid carries no number */
  v.setPlay(facts(u.id, { slot: 'power.fly', reach, reachCost: [], reachBorder: [] }))
  for (const cls of ['playCost', 'playCostNear', 'playBlocked']) assert.deepEqual(read(V, cls), [], cls)
  /* one hex named: one mark; the facts replaced (the move made - the area is another): the old marks are gone with the old facts */
  const one = border[0], two = border[1]
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachBorder: [{ hex: one, cost: null }, { hex: two, cost: 2 }] }))
  assert.deepEqual(read(V, 'playBlocked'), [{ hex: one, text: 'X' }]); assert.deepEqual(read(V, 'playCostNear'), [{ hex: two, text: '2' }])
  v.setPlay(facts(u.id, { slot: 'attack.punch', reach: [], targets: [] })); assert.deepEqual(read(V, 'playBlocked'), []); assert.deepEqual(read(V, 'playCostNear'), [], 'another action chosen: the marks go')
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachBorder: [{ hex: one, cost: null }] })); assert.equal(read(V, 'playBlocked').length, 1)
  v.setPlay(null); assert.equal(V.layers.play, null, 'the action dropped: the plan and its marks are gone')
  v.dispose()
})

test('the fact is validated whole: a bordering hex is a board hex outside the reach, named once, its cost a whole number or null', () => {
  const { v, V } = boot(), { u, reach, border } = areaOf(V)
  const bad = (reachBorder, why) => assert.throws(() => v.setPlay(facts(u.id, { slot: 'power.move', reach, reachBorder })), why)
  bad('x', /reachBorder is not an array/); bad([{ hex: border[0] }], /reachBorder\[0\] must carry exactly hex, cost/)
  bad([{ hex: reach[0], cost: 2 }], /reachBorder\[0\]\.hex is a hex of the reach/); bad([{ hex: -1, cost: 2 }], /not a board hex/)
  bad([{ hex: border[0], cost: 2 }, { hex: border[0], cost: null }], /reachBorder repeats a hex/)
  bad([{ hex: border[0], cost: 1.5 }], /not an integer/); bad([{ hex: border[0], cost: -1 }], /negative/); bad([{ hex: border[0], cost: 'X' }], /not an integer/)
  /* and a refused payload draws nothing */
  assert.deepEqual(read(V, 'playBlocked'), []); assert.deepEqual(read(V, 'playCostNear'), [])
  v.dispose()
})
