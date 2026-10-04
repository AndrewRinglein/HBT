// viewer.no-target-ring (engine backlog; engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes;
// ...' and 2026-10-03 'one draft after every battle; the yellow focus border goes; ...'). Andrew: "There's a highlighting of a
// hex that happens where there's a big yellow border around the hex at some point during unit activation. I don't quite know
// what that's for visually." / "That yellow focus border doesn't look good, so just remove it." / asked "Is the yellow you want
// gone the ring on hexes the chosen action can hit (including the hero's own hex for a self power)?" - "yes". It was
// src/board.js `for (const h of P.targets) ring(h, 'playTarget', PLAY_HUE.target)` - a yellow hex outline
// (rgba(255,215,100,.9)) on every hex the chosen action, or the planned path's end, can strike.
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) with the facts a host hands over (setPlay):
// no hex wears the `playTarget` ring - with an attack chosen, with a self power chosen, with a burst's empty centre among the
// targets; each unit standing on a target hex wears the quieter mark instead (`playTargetUnit`, a thin ring round its own
// feet, not a hex border), the hero acting never; the marks go with the facts; the other rings (the attack of opportunity's
// provoke point, an enemy's reach) are drawn as before and are not the removed yellow.
// What it looks like in a browser is kingdom tools/no-target-ring.shot.mjs (real Chrome; the before and after screenshots).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const script = html.match(/<script>([\s\S]*)<\/script>\s*$/)[1]
const YELLOW = /255\s*,\s*215\s*,\s*100|#ffd764/i

function boot() {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true })
  v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  return { w, v, V: v._V }
}
const all = (V, cls) => V.dom.stage.querySelectorAll('.' + cls)
const hexes = (V, cls) => all(V, cls).map(n => +n.dataset.hex).sort((a, b) => a - b)
const marked = V => all(V, 'playTargetUnit').map(n => +n.dataset.unit).sort((a, b) => a - b)
/* the board as the fold has it: the hero acting (0), an enemy standing, an ally standing, a hex nobody stands on */
function cast(V) {
  const units = Object.values(V.S.U).filter(u => u.life === 'standing'), me = V.S.U[0]
  const enemy = units.find(u => u.side === 'enemy'), ally = units.find(u => u.side === 'hero' && u.id !== 0)
  const empty = Object.keys(V.data.POS).map(Number).find(h => !Object.values(V.S.U).some(u => u.hex === h))
  assert.ok(me && enemy && ally && empty != null, 'the recording holds a hero acting, an enemy, an ally and an empty hex')
  return { me, enemy, ally, empty }
}
const facts = (over = {}) => ({ actor: 0, slot: 'attack.punch', reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })
/* no hex wears the target ring, and nothing the plan draws carries the removed yellow */
function noRing(V, when) {
  assert.deepEqual(hexes(V, 'playTarget'), [], when + ': no `playTarget` ring on any hex')
  const plan = V.layers.play
  for (const n of plan ? plan.querySelectorAll('.ring') : []) assert.doesNotMatch(n.style.cssText, YELLOW, `${when}: hex ${n.dataset.hex} wears a yellow ring (${n.className})`)
  for (const n of all(V, 'playTargetUnit')) assert.doesNotMatch(n.style.cssText, YELLOW, when + ': the mark on a target is not the yellow')
}

test('an attack chosen: no hex wears the target ring; each unit that can be hit wears the mark on itself', () => {
  const { v, V } = boot(), { enemy, ally } = cast(V)
  v.setPlay(facts({ targets: [enemy.hex, ally.hex].sort((a, b) => a - b) }))
  noRing(V, 'an attack chosen')
  assert.deepEqual(marked(V), [enemy.id, ally.id].sort((a, b) => a - b), 'the mark is on each unit standing on a hex the action can hit, and on nobody else')
  for (const n of all(V, 'playTargetUnit')) {
    const u = V.S.U[+n.dataset.unit]
    assert.equal(+n.dataset.hex, u.hex, 'it says whose it is and where that unit stands')
    assert.ok(!n.className.split(/\s+/).includes('ring'), 'it is not a hex border (the hex ring\'s class)')
    assert.doesNotMatch(n.style.cssText, /clip-path/, 'nor a hex-shaped outline')
  }
  /* pointing at one target: the forecast is drawn as before, and the others keep their mark */
  v.setPlay(facts({ targets: [enemy.hex, ally.hex].sort((a, b) => a - b), aim: { from: V.S.U[0].hex, to: enemy.hex, target: enemy.id, hit: 55, dmg: 4, hpAfter: 1, lethal: false, locked: false } }))
  noRing(V, 'aiming at a target')
  assert.equal(V.dom.stage.querySelector('.playHit').textContent, '55%'); assert.equal(V.dom.stage.querySelector('.playDmg').textContent, '4')
  assert.deepEqual(marked(V), [enemy.id, ally.id].sort((a, b) => a - b))
  v.dispose()
})

test('a self power chosen: nothing on the hero\'s own hex - no ring, no mark', () => {
  const { v, V } = boot(), { me } = cast(V)
  v.setPlay(facts({ slot: 'power.tower-shield.cover', targets: [me.hex], note: 'Cover: click it again, or the hero, to use it.' }))
  noRing(V, 'a self power chosen')
  assert.deepEqual(marked(V), [], 'the hero acting wears no target mark')
  assert.equal(V.layers.play.querySelectorAll('.ring').filter(n => +n.dataset.hex === me.hex).length, 0, 'no ring of any kind on the hero\'s own hex')
  assert.equal(V.dom.playNote.textContent, 'Cover: click it again, or the hero, to use it.', 'the note still says how it is used')
  v.dispose()
})

test('the hero acting is never marked, and a target hex nobody stands on shows nothing', () => {
  const { v, V } = boot(), { me, enemy, ally, empty } = cast(V)
  v.setPlay(facts({ targets: [me.hex, enemy.hex, ally.hex, empty].sort((a, b) => a - b) }))
  noRing(V, 'targets with the hero\'s own hex and an empty hex among them')
  assert.deepEqual(marked(V), [enemy.id, ally.id].sort((a, b) => a - b), 'the others are marked; the hero acting and the empty hex are not')
  assert.equal(V.layers.play.querySelectorAll('.ring').length, 0, 'no ring on the empty hex either')
  v.dispose()
})

test('the marks go with the facts: redrawn when the targets change, gone when the facts are cleared or the board seeks', () => {
  const { v, V } = boot(), { enemy, ally } = cast(V)
  v.setPlay(facts({ targets: [enemy.hex] })); assert.deepEqual(marked(V), [enemy.id])
  v.setPlay(facts({ targets: [ally.hex] })); assert.deepEqual(marked(V), [ally.id], 'the old target\'s mark is gone with the old facts')
  v.setPlay(facts({ targets: [] })); assert.deepEqual(marked(V), [])
  v.setPlay(facts({ targets: [enemy.hex] })); v.setPlay(null); assert.deepEqual(marked(V), [], 'cleared with the facts')
  v.setPlay(facts({ targets: [enemy.hex] })); v.seek(V.cursor); assert.deepEqual(marked(V), [], 'a seek drops the facts and the marks')
  v.dispose()
})

test('the other rings stay as they were and are not the removed yellow: the provoke point, an enemy\'s reach', () => {
  const { v, V } = boot(), { me, enemy } = cast(V)
  v.setPlay(facts({ slot: 'power.move', reach: [me.hex + 1, me.hex + 2], path: [me.hex, me.hex + 1, me.hex + 2], provokes: [me.hex + 1],
    threat: { unit: enemy.id, move: [enemy.hex - 1], hit: [enemy.hex - 2, enemy.hex - 1] } }))
  assert.deepEqual(hexes(V, 'playProvoke'), [me.hex + 1], 'the attack of opportunity\'s ring'); assert.deepEqual(hexes(V, 'playThreatHit'), [enemy.hex - 2, enemy.hex - 1], 'the ring on the hexes an enemy can hit')
  for (const cls of ['playProvoke', 'playThreatHit']) for (const n of all(V, cls)) {
    assert.ok(n.className.split(/\s+/).includes('ring'), cls + ' is still a hex ring'); assert.ok(n.style.background, cls + ' has its colour'); assert.doesNotMatch(n.style.cssText, YELLOW, cls + ' is not the removed yellow') }
  assert.notEqual(all(V, 'playProvoke')[0].style.background, all(V, 'playThreatHit')[0].style.background, 'and they are two colours')
  noRing(V, 'a move planned')
  v.dispose()
})

test('the page no longer holds the ring or its yellow', () => {
  assert.doesNotMatch(script, /['"`]playTarget['"`]/, 'the page\'s script draws no `playTarget` ring')
  assert.doesNotMatch(script, /rgba\(255,\s*215,\s*100,\s*\.9\)/, 'the target ring\'s yellow is out of the plan\'s colours')
})
