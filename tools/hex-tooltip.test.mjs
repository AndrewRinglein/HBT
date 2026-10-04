// viewer.hex-tooltip (engine backlog; engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out card;
// switching heroes asks first; movement costs on the grid; a tooltip on every hex' and 'switching from a hero that has not
// acted is free; the hex tooltip describes the ground only'). Andrew: "when I'm just pointing around the map, any hex I point
// at should have a little hover tooltip below it that says what the tile is and any special things about the tile, like: It
// costs 2 to move there. It will inflict burning on you. It's a water tile." / "Yeah, just ground only."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): pointing at a hex — the pointer's own pick
// (board.js pickAt) — shows a small tooltip just below it: the ground's name (the dump's terrainNames, from the engine's own
// id), what it costs to enter when that is not one (the engine's field: moveCost), each status it inflicts (the ground's
// own, terrainApplies; a painted layer on it, layerStatus — the status's name is the engine's), and that it cannot be
// entered (the engine's field: passable, hex by hex), with the word of a prop of the map that stands on it. Never the unit on it. In a replay and under a host that plays
// alike; it follows the pointer from hex to hex and goes when the pointer leaves the board.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const cavern = JSON.parse(readFileSync('battles/test.opening-cavern-trail.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')

function boot(battle, opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const EV = battle.events, mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    layerStatus: L.static.layerStatus, terrainApplies: L.static.terrainApplies, terrainNames: L.static.terrainNames,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V, L, EV }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
/** where the board shows a board point on the screen (the battle area's px) — read off the stage as drawn (its CSS matrix3d) */
function screenAt(V, px, py, z) {
  const m = V.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number), v = [px, py, z, 1]
  const out = [0, 1, 2, 3].map(r => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3])
  const vp = V.camera3d.userData.viewport, F = V.data.F
  return { x: out[0] / out[3] - F.w / 2 + vp.w / 2, y: out[1] / out[3] - F.h / 2 + vp.h / 2, W: vp.w, H: vp.h }
}
const zOf = (V, hex) => (V.data.displayHeights && V.data.displayHeights[hex]) || 0
const screenOf = (V, hex) => screenAt(V, V.data.POS[hex].px, V.data.POS[hex].py, zOf(V, hex))
/** the lowest point of the hex's outline on the screen */
function bottomOf(V, hex) {
  const p = V.data.POS[hex], L = V.data.LAYOUT, z = zOf(V, hex)
  return Math.max(...[[0, -L.H / 2], [L.W / 2, -L.H / 4], [L.W / 2, L.H / 4], [0, L.H / 2], [-L.W / 2, L.H / 4], [-L.W / 2, -L.H / 4]].map(([dx, dy]) => screenAt(V, p.px + dx, p.py + dy, z).y))
}
/** the fake wrap's box is 100 px square, its layout the viewport's */
const pointAt = (V, hex) => { const q = screenOf(V, hex), wrap = V.dom.stage.parentNode; fire(wrap, 'pointermove', { clientX: q.x * 100 / q.W, clientY: q.y * 100 / q.H, target: wrap }) }
const tip = V => V.dom.stage.parentNode.querySelector('#hexTip')
const shown = V => { const t = tip(V); return !!t && t.style.display !== 'none' }
const linesOf = V => tip(V).querySelectorAll('.hexTipLine').map(n => n.textContent)
const nameOf = V => tip(V).querySelector('.hexTipName').textContent
/** hexes of one ground, away from every body (a body's figure takes the pick of the hexes behind it), well inside the screen */
function hexesOf(V, terrainId, n = 3) {
  const { F, POS, distance } = V.data, live = Object.values(V.S.U).filter(u => u.life !== 'dead')
  const out = []
  for (const key of Object.keys(POS)) { const h = +key
    if (F.terrainIds[h] !== terrainId || (F.floor && !F.floor[h])) continue
    /* 2026-10-04 (engine fix.opening-orphanage-closer-start, merged with this item's landing; engine DECISIONS.md 2026-10-04
       '… a closer start'): this read `distance(u.hex, h) <= 3` — a margin round every unit so the pointer's pick is the
       ground and never a body. On the closer start the Zombie stands at (16,3) under the house and the civilians beside
       it, so every house tile on the screen is within 3 hexes of somebody and the test had none to read. The margin is 2:
       still clear of every body (the pick is asserted hex by hex below — a pick that landed on a unit would fail there),
       and the house's tiles at its far corner are read again. No assertion changed. */
    if (live.some(u => distance(u.hex, h) <= 2)) continue
    if (V.S.props && V.S.props.some(p => p.footprint.kind === 'hex' && p.footprint.hexes.includes(h))) continue
    const s = screenOf(V, h); if (s.x < 120 || s.y < 80 || s.x > s.W - 120 || s.y > s.H - 160) continue
    out.push(h); if (out.length >= n) break }
  return out
}

test('the dump names every ground from the engine\'s own id, and the page carries the names; no ground name is typed in the page\'s code', () => {
  const { v, L } = boot(orphanage)
  const names = L.static.terrainNames
  assert.ok(names && typeof names === 'object', 'static.json carries terrainNames')
  for (const id of L.static.terrainIds) {
    assert.equal(typeof names[id], 'string', id + ' has a name')
    assert.equal(names[id].toLowerCase().replace(/ /g, '-'), id.replace(/^terrain\./, ''), id + '\'s name is the engine\'s id, as words')
    assert.match(names[id], /^[A-Z]/, 'said as a name')
  }
  v.dispose()
})

test('the Orphanage: an open tile shows its name alone; woodland its name and what it costs; the river that it is water and what the engine charges to wade it; a closed tile that it cannot be entered', () => {
  const { v, V, L } = boot(orphanage); v.setZoom('fit'); v.render()
  const F = V.data.F, names = L.static.terrainNames
  assert.equal(shown(V), false, 'nothing is shown before the pointer is on the board')
  /* open ground: the name, and nothing else */
  const open = hexesOf(V, 'terrain.open'); assert.ok(open.length, 'open tiles on the screen')
  for (const h of open) { pointAt(V, h)
    assert.equal(V.view.pointHex, h, 'the pointer\'s pick is hex ' + h); assert.equal(shown(V), true)
    assert.equal(nameOf(V), names['terrain.open']); assert.equal(F.moveCost[h], 1); assert.deepEqual(linesOf(V), [], 'an open tile: its name alone') }
  /* every other ground of the map: its name, and its cost exactly where the engine's cost is not one. Woodland costs 2.
     FOUND (2026-10-04): the engine charges 1 for undergrowth and for a house's floor, and the Orphanage's river is water
     the engine lets a unit wade at 2 — the tooltip says what the engine says (viewer SWITCHES hexTipRiverWades) */
  const costOf = {}
  for (const tid of ['terrain.woodland', 'terrain.undergrowth', 'terrain.house', 'terrain.water']) { const hs = hexesOf(V, tid); assert.ok(hs.length, tid + ' tiles on the screen')
    for (const h of hs) { pointAt(V, h)
      assert.equal(V.view.pointHex, h); assert.equal(nameOf(V), names[tid]); assert.equal(F.passable[h], true)
      const lines = linesOf(V); costOf[tid] = F.moveCost[h]
      if (F.moveCost[h] === 1) assert.deepEqual(lines, [], tid + ' costs one: its name alone')
      else { assert.equal(lines.length, 1, tid + ': one line, its cost'); assert.match(lines[0], new RegExp('\\b' + F.moveCost[h] + '\\b'), 'the line says the engine\'s cost'); assert.match(lines[0], /move/i) } } }
  assert.equal(costOf['terrain.woodland'], 2, 'woodland costs 2 to move there'); assert.equal(costOf['terrain.water'], 2, 'the river is waded at 2')
  /* a tile the engine closes (its field: not passable — here a prop of the map stands on it): it cannot be entered, no cost
     is quoted for a tile nobody may enter, and what stands on it is named by its own word */
  const closed = Object.keys(V.data.POS).map(Number).filter(h => F.passable[h] === false && !Object.values(V.S.U).some(u => V.data.distance(u.hex, h) <= 3))
    .filter(h => { const s = screenOf(V, h); return s.x > 120 && s.y > 80 && s.x < s.W - 120 && s.y < s.H - 160 }).slice(0, 3)
  assert.ok(closed.length, 'closed tiles on the screen')
  for (const h of closed) { pointAt(V, h)
    assert.equal(V.view.pointHex, h); assert.equal(nameOf(V), names[F.terrainIds[h]])
    const lines = linesOf(V); assert.ok(lines.some(l => /cannot be entered/i.test(l)), 'hex ' + h + ': ' + JSON.stringify(lines)); assert.ok(!lines.some(l => /\d/.test(l)), 'no cost on a closed tile')
    const prop = V.S.props.find(p => p.footprint.kind === 'hex' && p.footprint.hexes.includes(h)); assert.ok(prop, 'a prop of the map closes it')
    assert.ok(lines.some(l => l.toLowerCase() === prop.id.split('.').filter(x => !/^\d+$/.test(x)).pop()), 'and is named: ' + JSON.stringify(lines)) }
  v.dispose()
})

test('the tooltip sits just below the hex pointed at, follows the pointer from hex to hex, and goes when the pointer leaves the board', () => {
  const { v, V } = boot(orphanage); v.render()
  const wrap = V.dom.stage.parentNode
  const near = hexesOf(V, 'terrain.open', 40).concat(hexesOf(V, 'terrain.woodland', 40))
  assert.ok(near.length >= 2, 'hexes in the battle\'s opening view')
  const seen = []
  for (const h of near.slice(0, 6)) {
    pointAt(V, h); assert.equal(V.view.pointHex, h)
    const t = tip(V), s = screenOf(V, h), left = parseFloat(t.style.left), top = parseFloat(t.style.top), under = bottomOf(V, h)
    assert.equal(t.parentNode, wrap, 'it is drawn in the battle area, over the board')
    assert.ok(Math.abs(left - s.x) < 1.5, `hex ${h}: centred under the hex (${left} vs ${s.x.toFixed(1)})`)
    assert.ok(top >= under && top - under < 16, `hex ${h}: its top is just below the hex's lowest point (${top.toFixed(1)} vs ${under.toFixed(1)})`)
    assert.equal(t.dataset.hex, String(h))
    seen.push(left + ',' + top)
  }
  assert.equal(new Set(seen).size, seen.length, 'each hex has its own place: the tooltip moved with the pointer')
  /* the view moves under a still pointer (a redraw, a pan): the tooltip stays under its hex */
  const h = near[0]; pointAt(V, h); const before = parseFloat(tip(V).style.left)
  v.pan(40, 0); v.render()
  assert.equal(shown(V), true, 'a redraw keeps it'); assert.equal(V.view.pointHex, h)
  { const s = screenOf(V, h), t = tip(V); assert.ok(Math.abs(parseFloat(t.style.left) - s.x) < 1.5, 'after a pan it is still under its hex'); assert.notEqual(parseFloat(t.style.left), before, 'it moved with the board') }
  /* it takes no click and no pointer of its own */
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  assert.match(css, /#hexTip\{[^}]*pointer-events:none/, 'the tooltip never takes the pointer')
  /* the pointer leaves the board */
  fire(wrap, 'pointerleave'); assert.equal(shown(V), false, 'gone when the pointer leaves'); assert.equal(V.view.pointHex, null)
  v.render(); assert.equal(shown(V), false, 'and a redraw does not bring it back')
  v.dispose()
})

test('it shows while only pointing: in a replay with no host, and under a host that plays — and it offers the host nothing of its own', () => {
  const offered = []
  const replay = boot(orphanage); replay.v.render()
  const h = hexesOf(replay.V, 'terrain.open', 1)[0]
  pointAt(replay.V, h); assert.equal(shown(replay.V), true, 'a replay: the tooltip shows'); assert.equal(replay.V.play, null)
  replay.v.dispose()
  const live = boot(orphanage, { onPlay: e => { offered.push(e); return true } }); live.v.setPlay(facts(live.V.S.activeId)); live.v.render()
  const g = hexesOf(live.V, 'terrain.open', 1)[0]
  offered.length = 0; pointAt(live.V, g)
  assert.equal(shown(live.V), true, 'a host that plays: the tooltip shows'); assert.equal(nameOf(live.V), live.L.static.terrainNames['terrain.open'])
  assert.deepEqual(offered, [{ kind: 'point', hex: g }], 'the host hears the point it always heard, and nothing new')
  live.v.dispose()
})

test('ground only: pointing at a unit names the ground it stands on, never the unit', () => {
  const { v, V, L } = boot(orphanage); v.render()
  const u = V.S.U[V.S.activeId], wrap = V.dom.stage.parentNode
  /* the middle of its figure, as the stage shows it */
  const E = V.layers.UEL.get(u.id), f = { x: V.data.POS[u.hex].px, y: V.data.POS[u.hex].py + V.data.LAYOUT.H * .28 }
  const mid = screenAt(V, f.x, f.y, zOf(V, u.hex) + (E.pick ? E.pick.h / 2 : 60))
  fire(wrap, 'pointermove', { clientX: mid.x * 100 / mid.W, clientY: mid.y * 100 / mid.H, target: wrap })
  assert.equal(V.view.pointHex, u.hex, 'pointing at the body points at its hex')
  assert.equal(nameOf(V), L.static.terrainNames[V.data.F.terrainIds[u.hex]])
  assert.ok(!tip(V).textContent.includes(u.name), 'the unit is not named')
  v.dispose()
})

test('a burning tile says it inflicts Burn — the painted layer\'s status, by the engine\'s name — from the event that paints it, and not before', () => {
  const { v, V, L, EV } = boot(cavern); v.setZoom('fit')
  const painted = EV.findIndex(e => e.type === 'layer.painted' && L.static.layers[e.layer] === 'layer.burning')
  assert.ok(painted > 0, 'the Cavern Trail\'s recording paints burning ground')
  const hex = EV[painted].hex, burn = L.static.statuses[L.static.layerStatus['layer.burning']]
  assert.equal(burn, 'Burn')
  v.seek(painted); v.setZoom('fit'); v.render()
  assert.ok(!V.hexTip(hex).lines.some(l => l.includes(burn)), 'before it is painted: nothing about Burn')
  v.seek(painted + 1); v.setZoom('fit'); v.render()
  const T = V.hexTip(hex)
  assert.equal(T.name, L.static.terrainNames[V.data.F.terrainIds[hex]])
  assert.ok(T.lines.some(l => /inflicts/i.test(l) && l.includes(burn)), 'after: ' + JSON.stringify(T.lines))
  /* as drawn: point at a burning hex with no body near it */
  const burning = Object.keys(V.S.layers).map(Number).filter(h => L.static.layers[V.S.layers[h]] === 'layer.burning')
  const free = burning.find(h => { const s = screenOf(V, h); return !Object.values(V.S.U).some(u => u.life !== 'dead' && V.data.distance(u.hex, h) <= 3) && s.x > 120 && s.y > 80 && s.x < s.W - 120 && s.y < s.H - 160 })
  if (free !== undefined) { pointAt(V, free); assert.equal(V.view.pointHex, free); assert.ok(linesOf(V).some(l => l.includes(burn)), 'the tooltip as drawn says Burn') }
  /* a ground that applies a status by itself (the engine's terrainApplies) says so the same way */
  const own = Object.entries(L.static.terrainApplies).filter(([, s]) => s.length)
  assert.ok(own.length, 'the engine has ground that applies a status of its own')
  for (const [tid, statuses] of own) { const said = V.hexTipOf({ terrainId: tid, moveCost: 1, passable: true, layer: null }).lines
    assert.equal(V.hexTipOf({ terrainId: tid, moveCost: 1, passable: true, layer: null }).name, L.static.terrainNames[tid])
    for (const s of statuses) assert.ok(said.some(l => /inflicts/i.test(l) && l.includes(L.static.statuses[s])), tid + ' inflicts ' + L.static.statuses[s]) }
  v.dispose()
})
