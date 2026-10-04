// viewer.fallen-cards-and-first-aid (engine backlog; engine DECISIONS.md 2026-10-03 'the cards above the battle: the fallen
// leave, a downed hero's card wears a first-aid mark' and 'size and shadows are the default; the bleeding-out card; ...').
// Andrew: "When an enemy goes down, they should no longer have their card above the battle. When a hero is dead, it's the
// same. When a hero is downed, their card on the battlefield should have a little first aid symbol in the upper right-hand
// corner." / "The hero card above the battle should show a first aid icon in the upper right-hand corner and the number of
// turns they have left." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the engine's own
// recordings: the Orphanage (enemies die, a hero dies) and the Bridge (heroes go down and bleed out, one stands at the
// Deathbed). The number on the card is the fold's bleed-out count — the one the board draws over the body — never counted here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const bridge = JSON.parse(readFileSync('battles/test.opening-bridge.json', 'utf8'))
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
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV }
}
const chips = V => V.dom.rail.querySelectorAll('.railchip')
const chip = (V, id) => chips(V).find(c => +c.dataset.i === id) || null
const ids = V => chips(V).map(c => +c.dataset.i)
const aid = c => c.querySelector('.railaid')
const turnsOn = c => { const n = c.querySelector('.railaidNo'); return n ? n.textContent : null }
const divider = V => V.dom.rail.querySelectorAll('.railsep').length
/** the board's own bleed-out numeral over a downed body (board.js: E.clock) */
const boardClock = (V, id) => { const E = V.layers.UEL.get(id); return E && E.clock && E.clock.style.display !== 'none' ? E.clock.textContent : null }
const at = (EV, f) => EV.map((e, i) => f(e) ? i : -1).filter(i => i >= 0)

test('an enemy that goes down has no card any more, and a hero that dies has none either', () => {
  const { v, V, EV } = boot(orphanage)
  const heroes = new Set(EV.filter(e => e.type === 'unit.enter' && e.side === 'hero').map(e => e.actor))
  const deaths = at(EV, e => e.type === 'life.dead')
  assert.ok(deaths.some(i => !heroes.has(EV[i].target)), 'an enemy dies in the Orphanage\'s recording'); assert.ok(deaths.some(i => heroes.has(EV[i].target)), 'and a hero')
  for (const i of deaths) { const id = EV[i].target, name = `${heroes.has(id) ? 'hero' : 'enemy'} ${id}`
    v.seek(i); assert.ok(chip(V, id), name + ' has its card before it falls'); assert.notEqual(V.S.U[id].life, 'dead')
    v.seek(i + 1); assert.equal(V.S.U[id].life, 'dead'); assert.ok(!chip(V, id), name + ' has no card once it is dead') }
  /* at every point of the battle: no dead unit has a card, every other unit has exactly one, and no card is greyed with a cross */
  for (const i of [...deaths.map(i => i + 1), EV.length]) { v.seek(i)
    const live = Object.values(V.S.U).filter(u => u.life !== 'dead').map(u => u.id).sort((a, b) => a - b)
    assert.deepEqual([...ids(V)].sort((a, b) => a - b), live, 'the cards are the units that have not fallen')
    for (const c of chips(V)) { assert.ok(!c.className.split(' ').includes('gone')); assert.ok(!c.textContent.includes('✝')) } }
  v.dispose()
})

test('a downed hero keeps its card, with a first-aid mark in its upper right-hand corner and the turns left the board shows over the body', () => {
  const { v, V, EV } = boot(bridge)
  const downs = at(EV, e => e.type === 'life.downed'); assert.ok(downs.length >= 1, 'heroes go down on the Bridge')
  let numbered = 0
  for (const i of downs) { const id = EV[i].target
    assert.equal(V.S.U[id]?.side ?? EV.find(e => e.type === 'unit.enter' && e.actor === id).side, 'hero')
    v.seek(i); assert.ok(chip(V, id)); assert.ok(!aid(chip(V, id)), 'standing: no first-aid mark')
    /* from the moment it is down until it stands or dies, at every event that touches it: the card stays, wears the mark, and
       its number is the board's own */
    const end = EV.findIndex((e, k) => k > i && e.type === 'life.dead' && e.target === id), until = end < 0 ? EV.length : end
    const touch = [i, ...at(EV, e => e.target === id && /^bleedout\./.test(e.type)).filter(k => k > i && k < until)]
    let last = null
    for (const k of touch) { v.seek(k + 1)
      const u = V.S.U[id], c = chip(V, id); assert.equal(u.life, 'downed'); assert.ok(c, 'the downed hero keeps its card')
      assert.ok(aid(c), 'with a first-aid mark')
      if (u.bleed > 0) { assert.equal(turnsOn(c), String(u.bleed), 'the turns left are the fold\'s bleed-out count'); assert.equal(turnsOn(c), boardClock(V, id), 'the same number the board shows over the body'); numbered++
        if (last !== null && EV[k].type === 'bleedout.tick') assert.notEqual(turnsOn(c), last, 'it changes as the board\'s does'); last = turnsOn(c) }
      else assert.equal(turnsOn(c), null, 'no count, no number') }
    if (end >= 0) { v.seek(end + 1); assert.ok(!chip(V, id), 'bled out: the card leaves') } }
  assert.ok(numbered >= 3, 'the count was read at several bleed-out steps')
  v.dispose()
})

test('the mark sits in the card\'s upper right-hand corner; a hero that stands at the Deathbed has none; an enemy never has one', () => {
  const { v, V, EV } = boot(bridge)
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1], rule = (css.match(/\.railaid\{[^}]*\}/) || [''])[0]
  assert.ok(rule, 'the stylesheet draws .railaid')
  assert.match(rule, /position:absolute/); assert.match(rule, /top:-?\d/); assert.match(rule, /right:-?\d/); assert.doesNotMatch(rule, /left:|bottom:/)
  assert.doesNotMatch(css, /\.railchip\.gone\{/, 'the greyed card of the fallen is gone from the stylesheet')
  /* a stand at the Deathbed: the hero was never downed — its card, no mark */
  const stood = at(EV, e => e.type === 'deathbed.stood')
  for (const i of stood) { const id = EV[i].target; v.seek(i + 3)
    if (V.S.U[id].life !== 'standing') continue
    assert.ok(chip(V, id)); assert.ok(!aid(chip(V, id)), 'a hero stood back up has no mark') }
  assert.ok(stood.length >= 1, 'a hero stands at the Deathbed on the Bridge')
  /* through the whole battle: only a downed unit of the heroes' side wears the mark */
  const points = at(EV, e => /^life\.|^bleedout\.|^deathbed\./.test(e.type))
  for (const i of points) { v.seek(i + 1)
    for (const c of chips(V)) { const u = V.S.U[+c.dataset.i]; assert.equal(!!aid(c), u.life === 'downed' && u.side === 'hero', `${u.name} (${u.side}, ${u.life})`) } }
  v.dispose()
})

test('the divider stays while both sides still have a card, and goes with the last card of a side; stepping there shows the same cards as seeking', () => {
  for (const battle of [orphanage, bridge]) {
    const { v, V, EV } = boot(battle)
    const points = [EV.findIndex(e => e.type === 'battle.begin') + 1, ...at(EV, e => e.type === 'life.dead').map(i => i + 1), EV.length]
    let both = 0, one = 0
    for (const i of points) { v.seek(i)
      const sides = new Set(chips(V).map(c => c.className.split(' ').includes('hero') ? 'hero' : 'other'))
      assert.equal(divider(V), sides.size === 2 ? 1 : 0, 'event ' + i + ': a divider exactly when both sides have a card')
      sides.size === 2 ? both++ : one++ }
    assert.ok(both >= 1)
    /* a hand step over a death shows what a seek shows */
    const d = EV.findIndex(e => e.type === 'life.dead')
    v.seek(d); v.step(); v.render(); const stepped = V.dom.rail.innerHTML
    v.seek(V.cursor); assert.equal(V.dom.rail.innerHTML, stepped, 'seeking to N equals stepping to N')
    assert.ok(!chip(V, EV[d].target))
    v.dispose()
  }
})
