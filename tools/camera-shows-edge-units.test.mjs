// viewer.camera-shows-edge-units (engine backlog; engine DECISIONS.md 2026-10-04 'the view may slide past the board's edge to
// show a unit on an edge column'). Andrew, asked "For edge units, should the view be allowed to slide a little past the
// board's edge so they show fully?": "1 yes". The camera's bound was the board's edge (viewer.camera-no-void), and its view is
// wider at its far side than its near, so a hex on an edge column could not be brought whole into view (viewer SWITCHES
// arrivalsEdgeColumn, bubbleEdgeHex, lookBound). The bound is now the board's edge, or as far past it as the outermost
// hexes need to be whole on screen — one bound for every camera move — and the view passes the edge only by the least that
// shows the hex it was sent to. Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage, at 1920 x 1080
// and at the kingdom's battle area (1448 x 716), measured off the stage as it is drawn.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const EV = battle1.events
const SIZES = [[1920, 1080], [1448, 716]]

function boot(size, opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  /* the battle area's size: the fake DOM's 1920 x 1080, or the kingdom's battle area */
  const wrap = v._V.dom.stage.parentNode
  Object.defineProperty(wrap, 'clientWidth', { value: size[0], configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: size[1], configurable: true })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V }
}
/** where the stage shows a board point on the screen (its CSS matrix3d), in the battle area's px */
function screenAt(V, px, py, z) {
  const m = V.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number), q = [px, py, z, 1]
  const o = [0, 1, 2, 3].map(r => m[r] * q[0] + m[4 + r] * q[1] + m[8 + r] * q[2] + m[12 + r] * q[3])
  const vp = V.camera3d.userData.viewport, F = V.data.F
  return { x: o[0] / o[3] - F.w / 2 + vp.w / 2, y: o[1] / o[3] - F.h / 2 + vp.h / 2, W: vp.w, H: vp.h }
}
const zOf = (V, hex) => (V.data.displayHeights && V.data.displayHeights[hex]) || 0
/** how far inside the battle area the WHOLE hex is: the least of its six corners' distances to the nearest screen edge (negative: part of it is off the screen) */
function wholeBy(V, hex) {
  const p = V.data.POS[hex], L = V.data.LAYOUT, z = zOf(V, hex)
  return Math.min(...[[0, -L.H / 2], [L.W / 2, -L.H / 4], [L.W / 2, L.H / 4], [0, L.H / 2], [-L.W / 2, L.H / 4], [-L.W / 2, -L.H / 4]].map(([dx, dy]) => { const s = screenAt(V, p.px + dx, p.py + dy, z); return Math.min(s.x, s.y, s.W - s.x, s.H - s.y) }))
}
/** how far past the board's edge the battle area sees, on each side (board px; 0 or less: not past it) — the four screen corners met with the ground */
function past(V) {
  const F = V.data.F, vp = V.camera3d.userData.viewport, m = V.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number)
  /* invert the stage's map on the ground plane z = 0: screen (sx, sy) -> board (px, py); solve the 2x2 from the matrix's rows */
  const ground = (sx, sy) => { const X = sx + F.w / 2 - vp.w / 2, Y = sy + F.h / 2 - vp.h / 2
    const a = m[0] - X * m[3], b = m[4] - X * m[7], c = X * m[15] - m[12], d = m[1] - Y * m[3], e = m[5] - Y * m[7], f = Y * m[15] - m[13], det = a * e - b * d
    return { x: (c * e - b * f) / det, y: (a * f - c * d) / det } }
  const c = [ground(0, 0), ground(vp.w, 0), ground(0, vp.h), ground(vp.w, vp.h)]
  return { left: -Math.min(...c.map(q => q.x)), right: Math.max(...c.map(q => q.x)) - F.w, top: -Math.min(...c.map(q => q.y)), bottom: Math.max(...c.map(q => q.y)) - F.h }
}
const settle = (w, ms = 1400) => { for (let t = 0; t < ms; t += 16) w._flush(16) }
const hexAt = (V, c, r) => r * V.data.BOARD.width + c
const facts = actor => ({ actor, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })

for (const size of SIZES) {
  const at = `${size[0]} x ${size[1]}`
  test(`${at}: every hex of the board's rim — the edge columns, the bottom corners — can be brought WHOLE into view by the bubbles' slide`, () => {
    const { w, v, V } = boot(size); v.render(); settle(w, 200)
    const { width, height } = V.data.BOARD
    assert.deepEqual([width, height], [20, 14], 'the Orphanage')
    const rim = []
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (c === 0 || r === 0 || c === width - 1 || r === height - 1) rim.push(hexAt(V, c, r))
    let worst = Infinity
    for (const hex of rim) {
      v.revealHex(hex); settle(w)
      const by = wholeBy(V, hex); worst = Math.min(worst, by)
      assert.ok(by >= 0, `hex ${hex} (${V.data.POS[hex].c},${V.data.POS[hex].r}): the whole hex is on the screen (its worst corner is ${by.toFixed(1)} px inside)`)
      assert.equal(V.revealPan(V.camTarget, hex), null, 'the page\'s own slide has nothing more to do')
    }
    /* named in the item: column 19 row 5 (the Turn 2 Zombie's), column 0 row 6, and the bottom corners */
    for (const [c, r] of [[19, 5], [0, 6], [0, 13], [1, 13], [17, 13], [18, 13], [19, 13]]) { v.revealHex(hexAt(V, c, r)); settle(w); assert.ok(wholeBy(V, hexAt(V, c, r)) >= 0, `(${c},${r}) whole`) }
    v.dispose()
  })

  test(`${at}: the view passes the board's edge only as far as the outermost hexes need — one bound for every camera move — and a view sent to a hex inside the board shows only board`, () => {
    const { w, v, V } = boot(size); v.render(); settle(w, 200)
    const { width, height } = V.data.BOARD, box = () => V.view.panBox, edge = () => V.view.boardBox
    assert.ok(edge(), 'the page says where the board\'s own edge holds the view (boardBox)')
    /* the bound: the board's edge, widened — never narrowed */
    assert.ok(box().x[0] <= edge().x[0] + 1e-6 && box().x[1] >= edge().x[1] - 1e-6 && box().y[0] <= edge().y[0] + 1e-6 && box().y[1] >= edge().y[1] - 1e-6, 'the bound holds the board\'s own')
    const grown = { left: edge().x[0] - box().x[0], right: box().x[1] - edge().x[1], top: edge().y[0] - box().y[0], bottom: box().y[1] - edge().y[1] }
    assert.ok(grown.left > 1 && grown.right > 1, `the edge columns need the view to pass the board's sides (by ${grown.left.toFixed(0)} and ${grown.right.toFixed(0)} board px)`)
    /* no further than the outermost hexes need: on each widened side, some rim hex needs every px of it — slid to, the view
       stands ON the bound; and a bound a little short of it would leave that hex cut */
    const rim = []
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (c === 0 || r === 0 || c === width - 1 || r === height - 1) rim.push(hexAt(V, c, r))
    const reached = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    for (const hex of rim) { v.pan((box().x[0] + box().x[1]) / 2 - V.camTarget.x, 0); settle(w, 60); v.revealHex(hex); settle(w)
      const p = V.camTarget; reached.left = Math.min(reached.left, p.x); reached.right = Math.max(reached.right, p.x) }
    /* (a slide is the least from where the view stands, so it lands within a few px of the bound's own corner for that hex, never past it) */
    assert.ok(reached.left >= box().x[0] - 1e-6 && reached.left - box().x[0] < 4, `the left bound is what a rim hex needs (${reached.left.toFixed(1)} vs ${box().x[0].toFixed(1)})`)
    assert.ok(reached.right <= box().x[1] + 1e-6 && box().x[1] - reached.right < 4, `the right bound likewise (${reached.right.toFixed(1)} vs ${box().x[1].toFixed(1)})`)
    /* the player's own scrolling, a host's pan, a look and a reveal all stop at the one bound */
    for (const [dx, dy] of [[-1e5, -1e5], [1e5, -1e5], [-1e5, 1e5], [1e5, 1e5]]) { v.pan(dx, dy); settle(w)
      const p = V.camTarget
      assert.ok(p.x >= box().x[0] - 1e-6 && p.x <= box().x[1] + 1e-6, 'a pan stops at the bound')
    }
    /* a view sent to a hex well inside the board shows only board, as before */
    v.pan(-1e5, -1e5); settle(w)
    const mid = hexAt(V, 10, 7); v.revealHex(mid); settle(w)
    v.centre(V.S.activeId); settle(w)
    const inner = hexAt(V, 9, 6)
    v._V.view.revealed = null; v.look({ hex: inner }, { ms: 50, back: false }); settle(w, 1600)
    const o = past(V); assert.ok(o.left <= .5 && o.right <= .5 && o.top <= .5 && o.bottom <= .5, `looking at a hex in the board's middle shows only board (${JSON.stringify(Object.fromEntries(Object.entries(o).map(([a, b]) => [a, Math.round(b)])))})`)
    v.dispose()
  })

  test(`${at}: a bubble click on a unit in the first or last column brings its whole hex into view; the bottom corner hexes can be scrolled into view`, () => {
    const { w, v, V } = boot(size); v.setPlay(facts(V.S.activeId)); v.render(); settle(w, 200)
    /* the Orphanage's first Zombie stands on the board's last column */
    const zombie = Object.values(V.S.U).find(u => u.side === 'enemy'); assert.equal(V.data.POS[zombie.hex].c, 19)
    v.pan(-1e5, 0); settle(w, 100)
    V.clickBubble([zombie.id]); settle(w)
    assert.equal(V.view.inspectId, zombie.id); assert.ok(wholeBy(V, zombie.hex) >= 0, `the Zombie's whole hex is on the screen after the bubble's click (${wholeBy(V, zombie.hex).toFixed(1)} px inside)`)
    const o = past(V); assert.ok(o.right > 1, 'the view passed the board\'s right edge to show it')
    /* the slide is still the least: a twentieth less of it would cut the hex */
    assert.equal(V.revealPan(V.camTarget, zombie.hex), null)
    assert.notEqual(V.revealPan({ ...V.camTarget, x: V.camTarget.x - 12 }, zombie.hex), null, 'a little less of a slide would not show it whole')
    /* the player's own scrolling: the map scrolled to its bottom-left and bottom-right corners shows the corner hexes whole */
    for (const [dx, c] of [[-1e5, 0], [1e5, 19]]) { v.pan(dx, 1e5); settle(w)
      const corner = hexAt(V, c, 13); assert.ok(wholeBy(V, corner) >= 0, `scrolled to the corner, hex (${c},13) is whole on the screen (${wholeBy(V, corner).toFixed(1)} px inside)`) }
    v.dispose()
  })
}
test('the Orphanage\'s own recording, Turn 2: the Zombie arriving on the last column is whole on the screen when its drop-in plays; Turn 3\'s, on the first column, likewise', () => {
  for (const size of SIZES) for (const [turn, col, away] of [[2, 19, -5000], [3, 0, 5000]]) {
    const { w, v, V } = boot(size)
    const wave = EV.findIndex(e => e.type === 'encounter.wave' && e.turn === turn), enter = EV.findIndex((e, i) => i > wave && e.type === 'unit.enter'), hexZ = EV[enter].hex
    const begin = EV.findIndex((e, i) => i > enter && e.type === 'activation.begin')
    assert.equal(V.data.POS[hexZ].c, col)
    v.seek(wave); settle(w, 100); v.pan(away, 0); settle(w)
    let atDrop = null
    v.play()
    for (let n = 0; n < 8000 && v.cursor < begin; n++) { w._flush(16); if (!atDrop && V.arrivalsShown && V.arrivalsShown.length) atDrop = { by: wholeBy(V, hexZ), shown: V.arrivalsShown[0] } }
    assert.ok(atDrop, 'the arrival\'s drop-in played'); assert.equal(atDrop.shown.slid, true); assert.equal(atDrop.shown.inView, true, 'no bubble stood for it')
    assert.ok(atDrop.by >= 0, `${size.join(' x ')}, Turn ${turn}: the arriving Zombie's whole hex (${col},${V.data.POS[hexZ].r}) is inside the view when its drop-in plays (${atDrop.by.toFixed(1)} px inside)`)
    v.pause(); v.dispose()
  }
})
