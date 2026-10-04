// viewer.unit-card-bar (engine backlog; engine DECISIONS.md 2026-10-01, Andrew: "We also need a character selector bar above
// the screen, the way it is in the visual playback. You have all the heroes and enemies as tiny little cards above the screen.
// That should still be there. And I can use that to target things as well as clicking on them."). Expect: "In the sandbox the
// strip of every unit's card sits above the board; clicking a hero's card starts its activation; with an attack chosen,
// clicking an enemy's card aims and confirms exactly as clicking its body." The component (no standalone page around it, as
// the game mounts it): the strip is there, a card offers the host exactly what a click on the body offers, and a double-click
// offers the unit to act next. That the host then begins, aims and confirms is the kingdom's (kingdom
// tools/sandbox-card-bar.verify.mjs, on the built sandbox).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'

function boot(opts = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const seen = [], v = B.mount(host, data, { autoplay: false, onPlay: e => { seen.push(e); return true }, ...opts })
  v.push(battle1.events)
  return { w, v, V: v._V, seen }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const chips = V => V.dom.rail.querySelectorAll('.railchip')

test('the strip of every unit\'s card sits in the component\'s top bar, in the board\'s order, marking who acts, who has acted, who fell', () => {
  const { v, V } = boot()
  const first = battle1.events.findIndex(e => e.type === 'activation.begin'); v.seek(first + 1)
  const rail = V.dom.root.querySelector('#topbar #rail')
  assert.ok(rail, 'the strip is in the component\'s own top bar — no host has to add it')
  assert.deepEqual(chips(V).map(c => +c.dataset.i), Object.values(V.S.U).map(u => u.id).sort((a, b) => a - b), 'one card per unit, ascending unit id')
  const sides = new Set(chips(V).map(c => c.className.split(' ')[1])); assert.ok(sides.has('hero') && sides.has('enemy'), 'heroes and enemies')
  for (const c of chips(V)) { const u = V.S.U[+c.dataset.i]; assert.equal(c.querySelector('img').getAttribute('src'), V.data.ASSETS[(V.data.ARTMAP[u.typeId] || V.data.ARTMAP._pending).token], `${u.name}'s card`) }
  assert.ok(chips(V).find(c => +c.dataset.i === V.S.activeId).className.includes(' now'), 'the one acting is marked')
  const later = battle1.events.findIndex((e, i) => i > first + 5 && e.type === 'activation.end'); v.seek(later + 1)
  const done = Object.keys(V.S.acted).map(Number).filter(id => V.S.acted[id])
  assert.ok(done.length > 0); for (const id of done) assert.ok(chips(V).find(c => +c.dataset.i === id).className.includes(' done'), 'who has acted is marked')
  /* 2026-10-04, viewer.fallen-cards-and-first-aid (engine DECISIONS.md 2026-10-03 'the cards above the battle: the fallen leave
     …', which overturns the greyed card with a cross): rewritten as the rule — the fallen have no card. The line this
     replaces looked for a 'unit.died' event, which the engine has never emitted (a death is life.dead), so it had never
     run: "the fallen are marked" (the `gone` chip) was asserted nowhere. */
  const death = battle1.events.findIndex(e => e.type === 'life.dead'); assert.ok(death > 0, 'a unit dies in this recording')
  v.seek(death + 1); const dead = battle1.events[death].target
  assert.equal(V.S.U[dead].life, 'dead'); assert.ok(!chips(V).some(c => +c.dataset.i === dead), 'the fallen have no card')
  assert.ok(!chips(V).some(c => c.className.split(' ').includes('gone')), 'and no card is greyed as gone')
  v.dispose()
})

test('a click on a card is the click on that unit\'s body — the panel, and the very event the host is offered; a double-click offers it to act next', () => {
  const { v, V, seen } = boot()
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin') + 1)
  v.setPlay({ actor: null, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
  const enemy = Object.values(V.S.U).find(u => u.side === 'enemy' && u.life === 'standing'), hero = Object.values(V.S.U).find(u => u.side === 'hero' && u.life === 'standing')
  for (const u of [hero, enemy]) {
    seen.length = 0; fire(chips(V).find(c => +c.dataset.i === u.id), 'click')
    assert.deepEqual(seen, [{ kind: 'unit', id: u.id, hex: u.hex }], `${u.name}'s card offers what its body offers`)
    assert.equal(V.view.inspectId, u.id, 'and the panel is its')
    seen.length = 0; fire(V.layers.UEL.get(u.id).img, 'click')
    assert.deepEqual(seen, [{ kind: 'unit', id: u.id, hex: u.hex }], 'the body\'s own click, for comparison')
  }
  assert.ok(chips(V).find(c => +c.dataset.i === enemy.id).className.includes(' act'), 'the card looked at is lit')
  seen.length = 0; fire(chips(V).find(c => +c.dataset.i === hero.id), 'dblclick')
  assert.deepEqual(seen, [{ kind: 'choose', id: hero.id }], 'a double-click on a card offers that unit to act next')
  v.setPlay(null); seen.length = 0; fire(chips(V).find(c => +c.dataset.i === hero.id), 'dblclick')
  assert.deepEqual(seen, [], 'with no host taking the mouse, nothing is offered')
  v.dispose()
})

test('the standalone page draws no second strip: the component\'s is the one', () => {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  assert.equal(w.document.querySelectorAll('#rail').length, 1, 'one strip on the page')
  assert.ok(w.document.querySelectorAll('.railchip').length > 0, 'with its cards')
  w.__battleView.harness.dispose()
})
