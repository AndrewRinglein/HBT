// viewer.move-cost-on-grid (engine backlog; engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out
// card; switching heroes asks first; movement costs on the grid; a tooltip on every hex'). Andrew: "When the movement grid is
// up (the blue movement grid on the board), tiles that require extra movement points should have that movement cost, I
// think, maybe on them in gray." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the
// Orphanage: while the host's reach is drawn, every hex of it the host says costs more than one carries that number, small
// and grey, on the tile; a hex that costs one carries none; the number is the host's (the engine's) — the page never works
// one out, and draws none the host did not send. The sandbox's half is kingdom tools/move-cost-on-grid.verify.mjs.
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
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V, L }
}
const facts = (actor, more = {}) => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...more })
const costs = V => V.layers.play ? V.layers.play.querySelectorAll('.playCost') : []
const reachTiles = V => V.layers.play.querySelectorAll('.playReach')
/** a reach as a host would hand it: hexes round the acting hero, some woodland among them */
function reachOf(V) {
  const u = V.S.U[V.S.activeId], { F, POS, distance } = V.data
  const near = Object.keys(POS).map(Number).filter(h => h !== u.hex && distance(u.hex, h) <= 6 && F.passable[h])
  return { u, reach: near.sort((a, b) => a - b), F }
}

test('with the movement grid up, each hex the host says costs more than one carries that cost on its tile; a hex that costs one carries none', () => {
  const { v, V } = boot(), { u, reach, F } = reachOf(V)
  /* the host's word: the cost of entering each reach hex (here the engine's field for that hex — woodland 2, open 1) */
  const reachCost = reach.map(hex => ({ hex, cost: F.moveCost[hex] }))
  const dear = reachCost.filter(c => c.cost > 1); assert.ok(dear.length >= 2, 'ground that costs extra is within this hero\'s reach'); assert.ok(reachCost.some(c => c.cost === 1))
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachCost }))
  assert.equal(reachTiles(V).length, reach.length, 'the blue grid is drawn')
  const shown = costs(V)
  assert.deepEqual(shown.map(n => +n.dataset.hex).sort((a, b) => a - b), dear.map(c => c.hex).sort((a, b) => a - b), 'a number on exactly the hexes that cost more than one')
  for (const n of shown) { const c = dear.find(c => c.hex === +n.dataset.hex)
    assert.equal(n.textContent, String(c.cost), 'the number is the host\'s cost for hex ' + c.hex); assert.equal(n.dataset.cost, String(c.cost)) }
  for (const c of reachCost.filter(c => c.cost === 1)) assert.ok(!shown.some(n => +n.dataset.hex === c.hex), 'hex ' + c.hex + ' costs one: no number')
  v.dispose()
})

test('the number is on its tile, small and grey, and takes no pointer', () => {
  const { v, V } = boot(), { u, reach, F } = reachOf(V)
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachCost: reach.map(hex => ({ hex, cost: F.moveCost[hex] })) }))
  const { POS } = V.data
  for (const n of costs(V)) { const p = POS[+n.dataset.hex]
    assert.ok(Math.abs(parseFloat(n.style.left) - p.px) < 1 && Math.abs(parseFloat(n.style.top) - p.py) < 1, 'placed at the middle of hex ' + n.dataset.hex)
    assert.equal(n.parentNode, V.layers.play, 'drawn with the plan, on the board') }
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1], rule = (css.match(/\.playCost\{[^}]*\}/) || [''])[0]
  assert.ok(rule, 'the stylesheet draws .playCost')
  assert.match(rule, /pointer-events:none/); assert.match(rule, /font-size:1[0-9]px/, 'small')
  /* grey: the three channels of its colour are near one another, and it is neither white nor the grid's blue */
  const col = rule.match(/[^-]color:#([0-9a-f]{6})/i); assert.ok(col, 'it has a colour of its own')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(col[1].slice(i, i + 2), 16))
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 24 && Math.max(r, g, b) < 235, `grey: #${col[1]}`)
  v.dispose()
})

test('the cost is the host\'s word, never worked out here: none sent, none drawn; a different number sent, that number drawn', () => {
  const { v, V } = boot(), { u, reach, F } = reachOf(V)
  assert.ok(reach.some(h => F.moveCost[h] > 1), 'woodland is in reach')
  v.setPlay(facts(u.id, { slot: 'power.move', reach }))
  assert.equal(costs(V).length, 0, 'a host that sends no costs gets no numbers, whatever the ground')
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachCost: [] })); assert.equal(costs(V).length, 0)
  /* the host's number is the one drawn, even where the ground's own cost differs (an edge to climb, a structure's stairs) */
  const open = reach.find(h => F.moveCost[h] === 1), wood = reach.find(h => F.moveCost[h] === 2)
  v.setPlay(facts(u.id, { slot: 'power.move', reach, reachCost: [{ hex: open, cost: 3 }, { hex: wood, cost: 1 }] }))
  assert.deepEqual(costs(V).map(n => [+n.dataset.hex, n.textContent]), [[open, '3']])
  /* the grid goes, the numbers go */
  v.setPlay(facts(u.id)); assert.equal(costs(V).length, 0)
  v.setPlay(null); assert.equal(V.layers.play, null)
  v.dispose()
})

test('a malformed cost is the host\'s error and nothing is drawn from it', () => {
  const { v, V } = boot(), { u, reach } = reachOf(V), ok = facts(u.id, { slot: 'power.move', reach })
  const bad = [{ reachCost: 'two' }, { reachCost: [{ hex: reach[0] }] }, { reachCost: [{ hex: reach[0], cost: 1.5 }] }, { reachCost: [{ hex: reach[0], cost: -1 }] },
    { reachCost: [{ hex: reach[0], cost: 2 }, { hex: reach[0], cost: 2 }] }, { reachCost: [{ hex: 99999, cost: 2 }] },
    { reachCost: [{ hex: Object.keys(V.data.POS).map(Number).find(h => !reach.includes(h)), cost: 2 }] }]
  for (const more of bad) assert.throws(() => v.setPlay({ ...ok, ...more }), /invalid play facts/, JSON.stringify(more))
  v.setPlay({ ...ok, reachCost: [{ hex: reach[0], cost: 2 }] }); assert.equal(costs(V).length, 1)
  v.dispose()
})
