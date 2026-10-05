// viewer.edge-scroll-at-screen-edges (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …
// Scrolling' — Andrew: "It just feels awkward to click on things … and scroll the screen around."). Ruled 2026-10-01 'When you
// mouse or point past the edge of a map, the map just scrolls' — kept. Found: the scroll bands were the outer 36 px of the
// BOARD's own rectangle as well as the outer 14 px of the screen; in the battle screen three of the board's four edges are in
// the middle of the screen — under the hero bar, beside the panel, above the ability bar — so the map slid whenever the
// pointer travelled to a button, and a hex in the board's outer 36 px slid away as it was pointed at; and the step's time was
// capped at 50 ms a frame, so at a low frame rate the map covered a third of its speed.
// Wanted: in the battle screen (a host that plays) the map scrolls only while the pointer is at the screen's own edge; a
// replay page, whose board has no screen edge of its own, keeps its board-edge band; the scroll covers the same ground a
// second at any frame rate (the step uses the time that passed, capped at a quarter second) and comes up to speed over about
// 150 ms instead of at once.
// Run on the sources (no VIEWER_PAGE: the viewer bundled from src/, as tools/targeting.test.mjs does) or on the built page
// (VIEWER_PAGE, the gate's way).
import '../../engine/tools/engine-modules.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { makeWindow } from './fakedom.mjs'
const require = createRequire(import.meta.url)
const battle = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
let source = null
/** the viewer mounted on the Orphanage's recording — as a host that plays (onPlay) unless `replay` */
function boot({ replay = false } = {}) {
  const w = makeWindow()
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const run = code => new Function(...names, code)(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  let mount, lib
  if (process.env.VIEWER_PAGE) {
    const html = readFileSync(process.env.VIEWER_PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/)
    w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
    run(m[1]); const B = w.__battleView; B.harness.dispose(); mount = B.mount; lib = { fields: B.lib.fields, static: B.lib.static, artmap: B.lib.art.artmap, assets: B.lib.art.assets, glyphs: B.lib.glyphs }
  } else {
    source ??= require('../../engine/node_modules/esbuild').buildSync({ stdin: { contents: "import {mountBattleViewer} from './src/viewer.js'; window.__mount=mountBattleViewer", resolveDir: process.cwd() }, nodePaths: ['node_modules'], bundle: true, write: false, platform: 'browser', format: 'iife' }).outputFiles[0].text
    run(source); mount = w.__mount
    lib = { fields: JSON.parse(readFileSync('generated/fields.json', 'utf8')), static: JSON.parse(readFileSync('generated/static.json', 'utf8')), artmap: JSON.parse(readFileSync('generated/art/manifest.json', 'utf8')).artmap, assets: {}, glyphs: JSON.parse(readFileSync('generated/ra-glyphs.json', 'utf8')) }
  }
  const mapId = battle.events.find(e => e.type === 'map.loaded').mapId, S = lib.static
  const data = { field: lib.fields[mapId], fieldMapId: mapId, initialEvents: battle.events, units: S.units, statuses: S.statuses, absorbingStatuses: S.absorbingStatuses, actions: S.actions, badges: S.badges,
    layers: S.layers, actionKinds: S.actionKinds, statusRows: S.statusRows, artmap: lib.artmap, assets: lib.assets, glyphs: lib.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = mount(host, data, { autoplay: false, ...(replay ? {} : { onPlay: () => true }) })
  v.push(battle.events)
  v.seek(battle.events.findIndex(e => e.type === 'activation.begin') + 1)
  const V = v._V
  /* from the board's middle, where there is board to scroll to on every side */
  V.view.camF = { x: V.data.F.w / 2, y: V.data.F.h / 2 }; v.pan(0, 0); w._flush(1300)
  return { w, v, V, root: V.dom.root }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const at = (root, x, y) => fire(root, 'pointermove', { clientX: x, clientY: y })
const centre = V => ({ ...V.view.camF })

test('in the battle screen the board\'s own edges scroll nothing: the pointer resting on the board\'s last row, or on its way to the bar, the panel or a card, moves the map by nothing', () => {
  const { w, v, V, root } = boot()
  assert.equal(V.host, true, 'a host that plays')
  const from = centre(V)
  /* the fake board is 100 px square at the screen's top-left: its bottom row, its right edge, its corner — the middle of the screen in a battle */
  for (const [x, y, where] of [[50, 99, 'the board\'s bottom row'], [99, 50, 'the board\'s right edge, beside the panel'], [97, 97, 'its corner'], [50, 80, 'a hex 20 px inside its edge']]) {
    at(root, x, y); w._flush(16); for (let i = 0; i < 30; i++) w._flush(16)
    assert.deepEqual(centre(V), from, `${where}: the map does not move`) }
  /* travelling off the board to a button: over the battle, away from every edge of the screen */
  for (const [x, y] of [[300, 500], [1000, 900], [1700, 300]]) { at(root, x, y); for (let i = 0; i < 10; i++) w._flush(16) }
  assert.deepEqual(centre(V), from, 'on the way to the ability bar, the panel, a hero\'s card: nothing')
  v.dispose()
})

test('the pointer held at each of the four edges of the screen scrolls that way until the bound, and stops when it leaves the edge', () => {
  const { w, v, V, root } = boot()
  const hold = (x, y, frames = 40) => { at(root, x, y); for (let i = 0; i < frames; i++) w._flush(16) }
  let c = centre(V)
  hold(1915, 500); assert.ok(V.view.camF.x > c.x + 100, 'the right edge of the screen: east'); assert.equal(V.view.camF.y, c.y, 'and only east'); c = centre(V)
  hold(4, 500); assert.ok(V.view.camF.x < c.x - 100, 'the left edge: west'); c = centre(V)
  hold(960, 1076); assert.ok(V.view.camF.y > c.y + 50, 'the bottom edge: south'); assert.equal(V.view.camF.x, c.x); c = centre(V)
  hold(960, 4); assert.ok(V.view.camF.y < c.y - 50, 'the top edge: north'); c = centre(V)
  hold(960, 500); assert.deepEqual(centre(V), c, 'away from every edge: it stops')
  /* until the bound, and no further */
  hold(1915, 500, 600); const stop = V.view.camF.x; hold(1915, 500, 30)
  assert.equal(V.view.camF.x, stop, 'held at the edge it scrolls until the board\'s edge meets the view\'s'); assert.ok(stop < V.data.F.w, 'short of the board\'s own edge at the middle')
  v.dispose()
})

test('a replay page, whose board has no screen edge of its own, keeps its board-edge band — and the screen\'s edge scrolls it too', () => {
  const { w, v, V, root } = boot({ replay: true })
  assert.equal(V.host, false)
  const hold = (x, y, frames = 30) => { at(root, x, y); for (let i = 0; i < frames; i++) w._flush(16) }
  let c = centre(V)
  hold(50, 99); assert.ok(V.view.camF.y > c.y, 'the board\'s bottom edge scrolls south'); assert.equal(V.view.camF.x, c.x); c = centre(V)
  hold(1, 50); assert.ok(V.view.camF.x < c.x, 'the board\'s left edge scrolls west'); c = centre(V)
  hold(50, 50); assert.deepEqual(centre(V), c, 'away from the edge: it stops')
  hold(1915, 500); assert.ok(V.view.camF.x > c.x, 'the screen\'s right edge too')
  v.dispose()
})

test('the scroll covers the same ground in a second at 16 ms a frame as at 150 ms a frame, within a tenth — and that is its speed', async () => {
  const { POLICY } = await import('../src/camera-policy.js')
  const run = (ms, frames) => { const { w, v, V, root } = boot(), from = V.view.camF.x
    at(root, 1915, 500); for (let i = 0; i < frames; i++) w._flush(ms)
    const gone = V.view.camF.x - from; v.dispose(); return gone }
  /* 0.6 s each (37 frames of 16 ms, 4 of 150 ms): short enough that neither reaches the board's bound from its middle — on
     the built page 1.2 s did, and both runs then read the bound, not the speed */
  const smooth = run(16, 37), slow = run(150, 4)
  assert.ok(smooth > 0 && slow > 0, 'both scrolled')
  assert.ok(Math.abs(slow - smooth) <= smooth / 10, `0.6 s of scrolling: ${smooth.toFixed(0)} board px at 16 ms a frame, ${slow.toFixed(0)} at 150 ms a frame`)
  /* and that is its speed: the speed summed over the time held — full speed, less the half of the 150 ms it takes to come up to it */
  const sum = t => POLICY.EDGE_SCROLL_SPEED * (t - POLICY.EDGE_SCROLL_RAMP_MS / 2000)
  assert.ok(Math.abs(smooth - sum(.592)) < 2, `${smooth.toFixed(1)} px in 0.592 s: the speed's own sum is ${sum(.592).toFixed(1)}`)
  assert.ok(Math.abs(slow - sum(.6)) < 2, `${slow.toFixed(1)} px in 0.6 s at 150 ms a frame: ${sum(.6).toFixed(1)}`)
  /* a frame that took a very long time moves the map a quarter second's worth, no more */
  const { w, v, V, root } = boot(), from = V.view.camF.x
  at(root, 1915, 500); w._flush(16); for (let i = 0; i < 30; i++) w._flush(16)
  const before = V.view.camF.x; w._flush(3000)
  assert.ok(V.view.camF.x - before <= POLICY.EDGE_SCROLL_SPEED * .25 + 1, `a 3 s stall: ${(V.view.camF.x - before).toFixed(0)} px, a quarter second's worth at the most`)
  assert.ok(V.view.camF.x - before > POLICY.EDGE_SCROLL_SPEED * .05 + 1, 'and more than the 50 ms it was capped at')
  void from; v.dispose()
})

test('it comes up to speed over about 150 ms instead of at once', async () => {
  const { POLICY } = await import('../src/camera-policy.js')
  const { w, v, V, root } = boot()
  at(root, 1915, 500)
  const steps = []; let last = V.view.camF.x
  for (let i = 0; i < 20; i++) { w._flush(16); steps.push(V.view.camF.x - last); last = V.view.camF.x }
  const full = POLICY.EDGE_SCROLL_SPEED * .016
  assert.ok(steps[1] > 0 && steps[1] < full * .5, `the first moving frame is slower than half speed: ${steps[1].toFixed(2)} of ${full.toFixed(2)} px`)
  for (let i = 2; i < 9; i++) assert.ok(steps[i] >= steps[i - 1] - 1e-9, `faster frame by frame while it comes up (frame ${i})`)
  assert.ok(Math.abs(steps[15] - full) < 1e-6, `at full speed by a quarter second: ${steps[15].toFixed(2)} px a frame`)
  /* leaving the edge and coming back starts gently again */
  at(root, 960, 500); w._flush(50); at(root, 1915, 500); w._flush(16); const again = V.view.camF.x; w._flush(16)
  assert.ok(V.view.camF.x - again < full * .5, 'back at the edge: it comes up to speed again')
  v.dispose()
})
