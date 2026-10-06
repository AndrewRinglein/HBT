// viewer.ability-click-keeps-view (engine backlog; ruled 2026-10-05, Andrew, engine DECISIONS.md 'the battle screen must feel
// smooth: …' — asked "Should clicking an ability stop re-centring the view on your hero?": "3 yes"). "Clicking an ability no
// longer re-centres the view on the acting unit. Overturns 2026-10-01 'Clicking an ability re-centers on the acting unit'. A
// new Activation still centres on the unit that begins."
// Wanted: a click on a bar row leaves the view where the player has it — a player who scrolled to look at a target and then
// picks the attack still sees the target. So that there is still a way back: a click on the acting unit's portrait (lower
// left) centres the view on it, and a click on a unit's card in the top bar centres the view on that unit as well as showing
// its panel as now (the chat's defaults, viewer SWITCHES). A new Activation still centres on the unit that begins.
// The Bridge's recording, driven as a player drives it. Run on the sources (no VIEWER_PAGE: the viewer bundled from src/) or on
// the built page (VIEWER_PAGE, the gate's way). The recording's Bridge is fought by the Forest Elf, The Rose and the Battle
// Chaplain: the attack clicked here is the acting hero's own first (Elf Shot). The item's "Chop" is the Iron Dwarf's on the
// sandbox's Bridge — the kingdom's half clicks that one, on the built sandbox, with the real host choosing it
// (../kingdom/tools/ability-click-keeps-view.verify.mjs).
import '../../engine/tools/engine-modules.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { makeWindow } from './fakedom.mjs'
import { screenOf } from '../src/camera3d.js'
const require = createRequire(import.meta.url)
const bridge = JSON.parse(readFileSync('battles/test.opening-bridge.json', 'utf8'))
const activations = bridge.events.map((e, i) => [e, i]).filter(([e]) => e.type === 'activation.begin')
let source = null
/** the viewer mounted on the Bridge's recording as a host that plays; `seen` is what the board offers that host */
function boot() {
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
  const mapId = bridge.events.find(e => e.type === 'map.loaded').mapId, S = lib.static
  const data = { field: lib.fields[mapId], fieldMapId: mapId, initialEvents: bridge.events, units: S.units, statuses: S.statuses, absorbingStatuses: S.absorbingStatuses, actions: S.actions, badges: S.badges,
    layers: S.layers, actionKinds: S.actionKinds, statusRows: S.statusRows, artmap: lib.artmap, assets: lib.assets, glyphs: lib.glyphs, meta: { seed: bridge.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true } })
  v.push(bridge.events)
  const V = v._V
  /** the name of an action of the bar, as the page's own data has it */
  const named = id => { const A = S.actions, a = Array.isArray(A) ? A.find(x => x.id === id) : A[id]; return a ? a.name : id }
  /** the recording's first hero Activation — the board at its start, the host's plan handed over — and the first attack on its bar */
  const begin = () => {
    const [, i] = activations[0]
    v.seek(i + 1); v.setPlay({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
    /* the camera's glide is switched on two frames after the mount (src/viewer.js): let them pass, so a move here glides as on the page */
    w._flush(16); w._flush(16); w._flush(1300)
    assert.equal(V.S.U[V.S.activeId].side, 'hero', 'a hero acts first')
    const row = () => V.dom.actionbar.querySelectorAll('.acRow').find(r => r.dataset.act && r.dataset.act.startsWith('attack.'))
    assert.ok(row(), 'the acting hero has an attack on the bar')
    seen.length = 0
    return { at: i, row, attack: named(row().dataset.act) }
  }
  return { w, v, V, seen, begin, named }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const pose = V => ({ x: V.camTarget.x, y: V.camTarget.y, zoom: V.camTarget.zoom, yaw: V.camTarget.yaw })
const far = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
/** the player scrolls: the pointer held at the screen's right edge (the fake window is 1920 wide) until the view has gone `px`
    — or, where the board ends first, at its left edge */
function scrollAway(w, V, px = 900) {
  const root = V.dom.root, from = pose(V)
  for (const x of [1915, 4]) { for (let i = 0; i < 400 && far(pose(V), from) < px; i++) { fire(root, 'pointermove', { clientX: x, clientY: 500 }); w._flush(50) } if (far(pose(V), from) >= px) break }
  fire(root, 'pointermove', { clientX: 1000, clientY: 500 }); w._flush(1300)        // away from the edge: the scroll stops, a glide ends
  return far(pose(V), from)
}
/** is this hex whole on the screen from where the view stands? (the camera's own reading: nothing to slide to show it) */
const inView = (V, hex) => V.revealPan(V.camTarget, hex) === null
/** how far a unit's hex is from the middle of the battle area, in its px */
const fromMiddle = (V, u) => { const p = V.data.POS[u.hex], s = screenOf(V.data.boardAffine, V.camera3d, p.px, p.py, V.data.displayHeights?.[u.hex] || 0), vp = V.camera3d.userData.viewport; return Math.hypot(s.x - vp.w / 2, s.y - vp.h / 2) }
/** where the view stands when it is centred on a unit: as the page's own centring puts it (the bound may stop it short of the very middle) */
const centredOn = (w, v, V, id) => { v.centre(id); w._flush(1300); return pose(V) }

test('scrolled a screen away from the acting hero, clicking an attack on the bar chooses it and the view does not move', () => {
  const { w, v, V, seen, begin } = boot(), { row, attack } = begin()
  const hero = V.S.U[V.S.activeId]
  const gone = scrollAway(w, V); assert.ok(gone > 600, `scrolled ${gone.toFixed(0)} board px away`)
  assert.ok(!inView(V, hero.hex), 'the acting hero is off the screen')
  const put = pose(V); seen.length = 0
  fire(row(), 'click')
  assert.deepEqual(seen.filter(e => e.kind === 'slot'), [{ kind: 'slot', actionId: row().dataset.act, unit: hero.id }], `${attack} is offered to the host: chosen`)
  assert.deepEqual(pose(V), put, 'the click did not move the view')
  w._flush(1300); v.render(); w._flush(1300)
  assert.deepEqual(pose(V), put, 'nor anything after it: the view is where the player has it')
  assert.deepEqual({ x: V.camShown.x, y: V.camShown.y }, { x: put.x, y: put.y }, 'that is what is shown')
  assert.ok(!inView(V, hero.hex), 'the acting hero is still off the screen')
  /* a double-click on the row (a self power fires on it) does not move it either */
  fire(row(), 'click', { detail: 2 }); fire(row(), 'dblclick', { detail: 2 }); w._flush(1300)
  assert.deepEqual(pose(V), put, 'a double-click on the row leaves the view as well')
  /* and every other row of the bar */
  for (const r of V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act)) { fire(r, 'click'); w._flush(200); assert.deepEqual(pose(V), put, `the row ${r.dataset.act}: the view stays`) }
  v.dispose()
})

test('clicking the portrait brings the acting hero to the middle — and asks nothing of the host', () => {
  const { w, v, V, seen, begin } = boot(); begin()
  const hero = V.S.U[V.S.activeId], home = centredOn(w, v, V, hero.id), near = fromMiddle(V, hero)
  scrollAway(w, V); assert.ok(!inView(V, hero.hex), 'the acting hero is off the screen')
  const away = fromMiddle(V, hero); assert.ok(away > near + 300, `the hero is ${away.toFixed(0)} px from the middle of the battle area`)
  const P = V.dom.portrait; assert.ok(P, 'the portrait is on the page')
  if (process.env.VIEWER_PAGE) assert.notEqual(P.style.display, 'none', 'and shown: the acting hero\'s card')
  seen.length = 0
  fire(P, 'click', { target: P }); w._flush(1300)
  assert.ok(inView(V, hero.hex), 'the acting hero is on the screen again')
  assert.ok(far(pose(V), home) < 1, `the view is centred on the hero, as a centring puts it: ${far(pose(V), home).toFixed(2)} px off`)
  assert.ok(Math.abs(fromMiddle(V, hero) - near) < 1, `the hero is at the middle (${fromMiddle(V, hero).toFixed(0)} px from it, as near as the board's edge lets a centring bring it)`)
  assert.deepEqual(seen, [], 'the portrait\'s click asks nothing of the host: nothing is chosen, nothing aimed')
  /* and it stays on the hero, where the player asked for it */
  v.render(); w._flush(1300); assert.ok(far(pose(V), home) < 1, 'a redraw leaves it there')
  v.dispose()
})

test('clicking an enemy\'s card in the top bar brings that enemy to the middle and shows its panel, as a click on a hero\'s card does for the hero', () => {
  const { w, v, V, seen, begin } = boot(); begin()
  const hero = V.S.U[V.S.activeId]
  /* the enemy farthest from the acting hero */
  const enemy = Object.values(V.S.U).filter(u => u.side === 'enemy' && u.life === 'standing').sort((a, b) => far({ x: V.data.POS[b.hex].px, y: V.data.POS[b.hex].py }, { x: V.data.POS[hero.hex].px, y: V.data.POS[hero.hex].py }) - far({ x: V.data.POS[a.hex].px, y: V.data.POS[a.hex].py }, { x: V.data.POS[hero.hex].px, y: V.data.POS[hero.hex].py }))[0]
  assert.ok(enemy, 'an enemy stands on the Bridge')
  const there = centredOn(w, v, V, enemy.id), near = fromMiddle(V, enemy), home = centredOn(w, v, V, hero.id)
  assert.ok(far(there, home) > 100, 'the enemy is some way from the hero')
  const card = id => V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === id)
  assert.ok(card(enemy.id), 'the enemy has a card in the top bar')
  seen.length = 0
  fire(card(enemy.id), 'click'); w._flush(1300)
  assert.ok(far(pose(V), there) < 1, `the view is centred on ${enemy.name}: ${far(pose(V), there).toFixed(2)} px off where a centring puts it`)
  assert.ok(Math.abs(fromMiddle(V, enemy) - near) < 1 && inView(V, enemy.hex), 'the enemy is at the middle of the battle area')
  assert.equal(V.view.inspectId, enemy.id, 'its panel shows, as now')
  assert.match(V.dom.panel.innerHTML, new RegExp(enemy.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'the panel names it')
  assert.deepEqual(seen.filter(e => e.kind === 'unit'), [{ kind: 'unit', id: enemy.id, hex: enemy.hex }], 'and the click is offered to the host exactly as a click on its body is')
  /* it stays there: the view is not pulled back to the acting hero by the next redraw */
  v.render(); w._flush(1300); assert.ok(far(pose(V), there) < 1, 'the view stays on the enemy')
  /* the acting hero's own card: back to the hero */
  fire(card(hero.id), 'click'); w._flush(1300)
  assert.ok(far(pose(V), home) < 1, 'a click on the hero\'s card centres the view on the hero')
  assert.equal(V.view.inspectId, hero.id)
  v.dispose()
})

test('a new Activation still centres on the unit that begins — after a view the player scrolled away and an ability clicked there', () => {
  const { w, v, V, begin } = boot(), { at, row } = begin()
  const hero = V.S.U[V.S.activeId]
  scrollAway(w, V); fire(row(), 'click'); w._flush(1300)
  const put = pose(V); assert.ok(!inView(V, hero.hex))
  const next = activations.find(([e, i]) => i > at && e.actor !== hero.id)
  assert.ok(next, 'another Activation follows in the recording')
  v.seek(next[1] + 1); w._flush(1300)
  const who = V.S.U[V.S.activeId]; assert.equal(who.id, next[0].actor)
  assert.ok(inView(V, who.hex), `${who.name} begins: the view shows it`)
  const centred = pose(V), want = centredOn(w, v, V, who.id)
  assert.ok(far(centred, want) < 1, `and is centred on it, as now: ${far(centred, want).toFixed(2)} px off`)
  assert.ok(far(centred, put) > 1 || inView(V, who.hex), 'the game moved the view: a new Activation is its reason')
  v.dispose()
})
