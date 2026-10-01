// viewer.battle-full-screen (engine backlog; engine DECISIONS.md 2026-09-30 "the battle is its own full screen; End Turn
// and End Activation lower right; a red targeting arrow"). Andrew: "You've got End Turn and End Activation on the battle
// map. They shouldn't be. Put them in the lower right-hand corner." · "The arrow for targeting should be red, not blue."
// The component's half: for a host that plays, End activation and End Turn are not on the board (#left — the map, the
// stamina strip and the action bar) but in their own box at the screen's lower right, the foot of the right-hand panel;
// Log and 2× stay on the board. The targeting arrow — its line, its head — and the forecast numbers beside it are red;
// the walk's path stays cool. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))

function boot({ host = true } = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false, ...(host ? { onPlay: () => true } : {}) })
  v.push(battle1.events); v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  return { w, v, V: v._V }
}
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const within = (node, anc) => { for (let n = node; n; n = n.parentNode) if (n === anc) return true; return false }
const all = (node, out = []) => { for (const c of node.children || []) { out.push(c); all(c, out) } return out }
/** an rgb(a) or #rrggbb colour as [r, g, b] */
const rgb = c => { const h = /^#([0-9a-f]{6})$/i.exec(c); if (h) return [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16))
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c); assert.ok(m, 'a colour: ' + c); return m.slice(1, 4).map(Number) }
const red = c => { const [r, g, b] = rgb(c); return r >= 200 && r - Math.max(g, b) >= 60 }
const cool = c => { const [r, , b] = rgb(c); return b > r }

test('End activation and End Turn are off the board, in the screen\'s lower right-hand corner; Log and 2x stay on the board', () => {
  const { v, V } = boot(), left = $(V, 'left'), ends = $(V, 'playEnds')
  assert.ok(ends, 'the endings have their own box')
  assert.equal(ends.parentNode, V.dom.root, 'a child of the screen itself')
  assert.equal(within(ends, left), false, 'not on the board (#left: the map, the stamina strip, the action bar)')
  for (const id of ['playEndAct', 'playEndTurn']) {
    assert.ok(within($(V, id), ends), id + ' in the corner box'); assert.equal(within($(V, id), left), false, id + ' not on the board')
  }
  assert.deepEqual(all(ends).filter(n => n.tag === 'button').map(n => n.id), ['playEndAct', 'playEndTurn'], 'End Turn last: the corner itself')
  assert.ok(V.dom.root.classList.contains('pcEndsOn'), 'the panel gives the corner its last rows')
  for (const id of ['playLogBtn', 'playSpeed']) assert.ok(within($(V, id), left), id + ' stays on the board')
  /* the corner's buttons still work through the host */
  v.setPlay({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, endTurn: { yetToAct: [] }, endActivation: true })
  assert.equal($(V, 'playEndTurn').getAttribute('aria-disabled'), 'false'); assert.equal($(V, 'playEndAct').getAttribute('aria-disabled'), 'false')
  v.dispose()
  assert.equal($(V, 'playEnds'), null, 'disposed with the viewer'); assert.equal(V.dom.root.classList.contains('pcEndsOn'), false)
})

test('a replay has no corner box', () => {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
  assert.ok(html.includes('playEnds'), 'the page carries the corner box')
  const { v, V } = boot({ host: false })
  assert.equal($(V, 'playEnds'), null, 'nothing to end in a replay'); assert.equal(V.dom.root.classList.contains('pcEndsOn'), false, 'the panel keeps its rows')
  v.dispose()
})

test('the targeting arrow — line and head — and the forecast numbers beside it are red; the walk\'s path stays cool', () => {
  const { v, V } = boot(), me = V.S.U[0], zombie = Object.values(V.S.U).find(u => u.side === 'enemy' && u.life !== 'dead')
  v.setPlay({ actor: 0, slot: 'power.move', reach: [me.hex + 1, me.hex + 2], zoc: [], path: [me.hex, me.hex + 1, me.hex + 2], provokes: [],
    ghost: null, threat: null, targets: [zombie.hex], aim: { from: me.hex + 2, to: zombie.hex, target: zombie.id, hit: 55, dmg: 4, hpAfter: 1, lethal: false, locked: true }, note: null })
  const paths = all(V.dom.stage).filter(n => n.tag === 'path'), inPath = n => { for (let p = n.parentNode; p && p.getAttribute; p = p.parentNode) if (p.getAttribute('class') === 'playPath' || p.classList.contains('playPath')) return true; return false }
  const head = paths.filter(n => n.getAttribute('fill') && n.getAttribute('fill') !== 'none')
  const line = paths.filter(n => !inPath(n) && n.getAttribute('fill') === 'none' && n.getAttribute('stroke') !== 'rgba(0,0,0,.58)')
  const walk = paths.filter(n => inPath(n) && n.getAttribute('stroke') !== 'rgba(0,0,0,.58)')
  assert.equal(head.length, 1, 'one arrow head'); assert.ok(red(head[0].getAttribute('fill')), 'the head is red: ' + head[0].getAttribute('fill'))
  assert.equal(line.length, 1, 'one arrow line'); assert.ok(red(line[0].getAttribute('stroke')), 'the line is red: ' + line[0].getAttribute('stroke'))
  assert.equal(walk.length, 1, 'the walk'); assert.ok(cool(walk[0].getAttribute('stroke')), 'the walk stays cool: ' + walk[0].getAttribute('stroke'))
  const hit = V.dom.stage.querySelector('.playHit'), dmg = V.dom.stage.querySelector('.playDmg')
  assert.equal(hit.textContent, '55%'); assert.equal(dmg.textContent, '4')
  for (const n of [hit, dmg]) { const c = /(?:^|;)\s*color:\s*([^;]+)/.exec(n.style.cssText)[1].trim(); assert.ok(red(c), n.className + ' is red: ' + c) }
  v.dispose()
})
