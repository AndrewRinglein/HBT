// viewer.play-input (engine backlog; PLAYABLE-OPENING-PLAN.md item 7; engine DECISIONS.md 2026-09-29 "the playable battle
// screen" and "the playable screen: the acting mark, pointing at an enemy, the forecast"; VFX/UI-BUILD-NOTES §5). The
// component's half: while a host hands plan facts over (setPlay) every hex takes the pointer and the click, a unit's
// click and a slot's click are offered to the host (onPlay), a right-click that did not drag steps back, and the facts
// are drawn — reach, zone-of-control hatching, the path and its provoke points, the ghost, an enemy's reach, targets,
// the forecast's arrow with its hit chance and damage and the notch (or skull) it cuts in the target's Health bar. The
// numbers are the host's; this checks they are drawn as handed over and that nothing is offered without a host.
// Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))

function boot(opts = {}) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return opts.take ?? true }, ...opts.mount })
  v.push(battle1.events)
  const first = battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0)
  v.seek(first + 1)
  return { w, v, V: v._V, seen }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }); return (node.listeners[type] || []).length }
const hexes = (V, cls) => V.dom.stage.querySelectorAll('.' + cls).map(n => +n.dataset.hex).sort((a, b) => a - b)
/* facts as the kingdom's play input hands them over, for the Forest Elf (0) aiming at a Zombie */
function facts(V, over = {}) {
  const me = V.S.U[0], zombie = Object.values(V.S.U).find(u => u.side === 'enemy' && u.life !== 'dead')
  return { actor: 0, slot: 'power.move', reach: [me.hex + 1, me.hex + 2], zoc: [zombie.hex + 1], path: [me.hex, me.hex + 1, me.hex + 2], provokes: [me.hex + 1],
    ghost: { unit: 0, hex: me.hex + 2 }, threat: { unit: zombie.id, move: [zombie.hex - 1], hit: [zombie.hex - 2, zombie.hex - 1] }, targets: [zombie.hex],
    aim: { from: me.hex + 2, to: zombie.hex, target: zombie.id, hit: 55, dmg: 4, hpAfter: 1, lethal: false, locked: true }, note: 'Aim, then click again.', ...over }
}

test('the facts are drawn as handed over: reach, hatching, path, provoke points, ghost, enemy reach, targets, the forecast', () => {
  const { v, V } = boot(), f = facts(V)
  assert.equal(V.dom.stage.querySelectorAll('.playHex').length, 0, 'no input layer before the host hands facts over')
  v.setPlay(f)
  assert.deepEqual(hexes(V, 'playReach'), f.reach)
  assert.deepEqual(hexes(V, 'playZoc'), f.zoc); assert.match(V.dom.stage.querySelector('.playZoc').style.background, /repeating-linear-gradient/, 'the zone of control is hatched')
  assert.ok(V.dom.stage.querySelector('.playPath'), 'the path preview'); assert.deepEqual(hexes(V, 'playProvoke'), f.provokes)
  const g = V.dom.stage.querySelector('.playGhost'); assert.ok(g, 'the ghost'); assert.equal(+g.dataset.hex, f.ghost.hex); assert.equal(+g.dataset.unit, 0)
  assert.deepEqual(hexes(V, 'playThreatMove'), f.threat.move); assert.deepEqual(hexes(V, 'playThreatHit'), f.threat.hit)
  assert.deepEqual(hexes(V, 'playTarget'), f.targets)
  const hit = V.dom.stage.querySelector('.playHit'), dmg = V.dom.stage.querySelector('.playDmg')
  assert.equal(hit.textContent, '55%'); assert.equal(dmg.textContent, '4')
  const E = V.layers.UEL.get(f.aim.target), u = V.S.U[f.aim.target]
  assert.equal(E.playNotch.style.display, '', 'the notch on the target\'s Health bar'); assert.equal(E.playNotch.dataset.hpAfter, '1')
  assert.equal(E.playNotch.style.bottom, (100 * 1 / u.maxHp) + '%', 'the notch sits at the Health the hit would leave')
  assert.ok(!E.playSkull || E.playSkull.style.display === 'none', 'no skull when it would not kill')
  assert.equal(V.dom.playNote.textContent, f.note)
  /* lethal: the skull */
  v.setPlay(facts(V, { aim: { ...f.aim, hpAfter: 0, lethal: true } }))
  assert.notEqual(E.playSkull.style.display, 'none'); assert.equal(E.playNotch.style.bottom, '0%')
  /* the chosen action is lit on the bar */
  v.setPlay(facts(V, { slot: V.S.U[0] && Object.keys(V.data.ACT).find(id => V.dom.root.querySelector('#actionbar').innerHTML.includes(`data-act="${id}"`)) }))
  assert.equal(V.dom.root.querySelector('#actionbar').querySelectorAll('.playChosen').length, 1)
  /* cleared */
  v.setPlay(null)
  for (const c of ['playHex', 'playReach', 'playGhost', 'playHit']) assert.equal(V.dom.stage.querySelectorAll('.' + c).length, 0, c + ' gone')
  assert.equal(E.playNotch.style.display, 'none'); assert.equal(V.dom.playNote.style.display, 'none')
  v.dispose()
})

test('every hex takes the pointer and the click; a unit and a slot are offered; a right-click that did not drag steps back', () => {
  const { v, V, seen, w } = boot(), f = facts(V)
  v.setPlay(f)
  const buttons = V.dom.stage.querySelectorAll('.playHex')
  assert.equal(buttons.length, Object.keys(V.data.POS).length, 'one input per board hex')
  const b = buttons.find(n => +n.dataset.hex === f.reach[0])
  fire(b, 'pointerenter'); fire(b, 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'point', hex: f.reach[0] }, { kind: 'hex', hex: f.reach[0] }])
  /* the input layer survives a redraw, so a still pointer is not offered again */
  v.setPlay(facts(V, { ghost: null })); assert.equal(V.dom.stage.querySelectorAll('.playHex')[0], buttons[0])
  /* a unit: the panel shows it (clicked last) and the click is offered */
  const zombie = V.S.U[f.aim.target], E = V.layers.UEL.get(zombie.id)
  fire(E.img, 'pointerenter'); fire(E.img, 'click')
  assert.deepEqual(seen.splice(0), [{ kind: 'point', hex: zombie.hex }, { kind: 'unit', id: zombie.id, hex: zombie.hex }])
  assert.equal(V.view.inspectId, zombie.id)
  /* a slot row on the bar: the subject is the zombie now, and the host is told whose bar it was */
  const row = V.dom.root.querySelector('#actionbar').querySelectorAll('.acRow').find(r => r.dataset.act)
  fire(row, 'click'); assert.deepEqual(seen.splice(0), [{ kind: 'slot', actionId: row.dataset.act, unit: zombie.id }])
  /* right-click without a drag: back; with a drag: the map pans, nothing is offered */
  const wrap = V.dom.stage.parentNode
  fire(wrap, 'pointerdown', { button: 2, clientX: 100, clientY: 100 }); fire(wrap, 'pointerup', { button: 2, clientX: 100, clientY: 100 })
  assert.deepEqual(seen.splice(0), [{ kind: 'back' }])
  fire(wrap, 'pointerdown', { button: 2, clientX: 100, clientY: 100 }); fire(wrap, 'pointermove', { clientX: 160, clientY: 130 }); fire(wrap, 'pointerup', { button: 2, clientX: 160, clientY: 130 })
  assert.deepEqual(seen.splice(0), [])
  /* a click that ends a camera drag is not a click on the hex */
  fire(wrap, 'pointerdown', { button: 0, clientX: 100, clientY: 100 }); fire(wrap, 'pointermove', { clientX: 160, clientY: 130 }); fire(b, 'click'); fire(wrap, 'pointerup', { button: 0 })
  assert.deepEqual(seen.splice(0), [])
  /* Esc, with the pointer over the board, is the right-click */
  fire(wrap, 'pointerenter'); w.document.dispatch('keydown', { key: 'Escape', target: wrap, repeat: false, preventDefault() {} })
  assert.deepEqual(seen.splice(0), [{ kind: 'back' }])
  /* the pointer leaving the board: pointing at nothing */
  fire(wrap, 'pointerleave'); assert.deepEqual(seen.splice(0), [{ kind: 'point', hex: null }])
  v.dispose()
})

test('without a host\'s facts nothing is offered, and a malformed payload is refused whole', () => {
  const { v, V, seen } = boot()
  const zombie = Object.values(V.S.U).find(u => u.side === 'enemy'), E = V.layers.UEL.get(zombie.id)
  fire(E.img, 'pointerenter'); fire(E.img, 'click'); fire(V.dom.stage.parentNode, 'pointerdown', { button: 2 }); fire(V.dom.stage.parentNode, 'pointerup', { button: 2 })
  assert.deepEqual(seen, [], 'no host facts: the board is the viewer\'s, clicks inspect'); assert.equal(V.view.inspectId, zombie.id)
  const good = facts(V); v.setPlay(good)
  assert.throws(() => v.setPlay({ ...good, reach: [-1] }), /invalid play facts/)
  assert.throws(() => v.setPlay({ ...good, extra: 1 }), /invalid play facts/)
  assert.throws(() => v.setPlay({ ...good, aim: { ...good.aim, hit: 1.5 } }), /invalid play facts/)
  assert.deepEqual(hexes(V, 'playReach'), good.reach, 'the prior facts stand')
  /* a seek (the host's skip) drops the facts; the host hands them over again */
  v.seek(V.cursor); assert.equal(V.dom.stage.querySelectorAll('.playHex').length, 0)
  v.dispose()
})
