// viewer.friend-line-green-heal-glows (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post
// answered: ... green for a friend, a glow for a heal ...'). Andrew: "When you're doing a power that is a buff or a heal, it
// should not be a red arrow for your vine or target." (line) - "They should be green." - "When you're healing someone, it
// shouldn't show a magic attack bolt flying at them." - "It should show a glow on the healed ally only, or on the area if an
// area is healed."
// Two things, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and the page's own modules:
//   the aim   - the line from the user to the target, and the mark on each unit the action can reach, are green when the
//               chosen action helps its target and red when it does not. Which actions help is the ENGINE's action row (the
//               dump's `actions`: an attack or a burst never; a power whose Targeting row says its side is 'ally', or itself;
//               one whose side is 'any' by whose side the unit is on) - src/actions.js helpsTarget, no list of names;
//   the heal  - when a power that helps resolves nothing flies: the healed unit glows (the heal effect it already played) with
//               its healed number; a heal over an area glows on the area's hexes and on each unit healed in it. An attack's
//               bolt, and a power aimed at an enemy, fly as before.
// The sandbox's half is kingdom tools/friend-line-green-heal-glows.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { createState, fold } from '../src/fold.js'
import * as ACTIONS from '../src/actions.js'
import { PLAY_HUE, HEAL_HUE } from '../src/theme.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const load = f => JSON.parse(readFileSync('battles/' + f, 'utf8'))
const dungeon = load('map_dungeon-16x8_s1.json'), party = load('showcase.assembled-party.json')
const HEAL = 'power.holy-symbol.heal', WRATH = 'attack.holy-symbol.wrath', CIRCLE = 'power.shepherd.circle-of-healing'
const CTX = { UD: STATIC.units, SN: STATIC.statuses, IC: STATIC.itemClasses, ACT: STATIC.actions }

function boot(battle, at) {
  const EV = battle.events, m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, tagCarriers: L.static.tagCarriers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true }); v.push(EV); v.seek(at)
  /* the board's effects, watched: every layer it adds to its canvas */
  const fx = []; v._V.fx.FX = { add(dur) { fx.push({ dur, cursor: v.cursor }); return new Promise(() => {}) }, clear() {} }
  return { w, v, V: v._V, EV, fx }
}
const facts = (over = {}) => ({ actor: 0, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null, ...over })
const marks = V => V.dom.stage.querySelectorAll('.playTargetUnit').map(n => ({ unit: +n.dataset.unit, css: n.style.cssText }))
/** every colour the aim's arrow is drawn in: its line's strokes and its head's fill (the dark halo under them left out) */
const arrow = V => { const out = new Set(); const walk = n => { for (const c of n.children || []) { for (const k of ['stroke', 'fill']) { const x = c.getAttribute && c.getAttribute(k); if (x && x !== 'none' && !/^rgba\(0,\s*0,\s*0/.test(x)) out.add(x) } walk(c) } }
  const svg = V.layers.play.querySelector('svg'); assert.ok(svg, 'the plan draws its lines'); walk(svg); return [...out] }

test('which actions help is the engine\'s action row: an attack never, a power aimed at an ally or at itself, one for either side by whose side the unit is on', () => {
  const { helpsTarget } = ACTIONS
  assert.equal(typeof helpsTarget, 'function', 'src/actions.js exports helpsTarget')
  assert.ok(PLAY_HUE.aid, 'theme.js PLAY_HUE names the green'); assert.notEqual(PLAY_HUE.aid, PLAY_HUE.aim)
  const A = STATIC.actions
  assert.deepEqual(A[HEAL].target, { select: 'unit', side: 'ally' }); assert.ok(A[HEAL].effects.some(e => e.kind === 'heal')); assert.ok(A[WRATH].attack, 'Wrath is an attack')
  assert.equal(helpsTarget(A[HEAL], 'hero', 'hero'), true); assert.equal(helpsTarget(A[WRATH], 'hero', 'enemy'), false); assert.equal(helpsTarget(A[WRATH], 'hero', 'hero'), false, 'an attack is an attack whoever stands there')
  assert.equal(helpsTarget(A[CIRCLE], 'hero', 'hero'), true); assert.deepEqual(A[CIRCLE].target, { select: 'area', side: 'ally', radius: 3, origin: 'self' })
  /* every row the engine has, by its own fields */
  const seen = { attack: 0, burst: 0, ally: 0, enemy: 0, self: 0, any: 0, none: 0 }
  for (const [id, a] of Object.entries(A)) {
    const own = helpsTarget(a, 'hero', 'hero'), foe = helpsTarget(a, 'hero', 'enemy')
    if (a.attack) { assert.equal(own, false, id); assert.equal(foe, false, id); seen.attack++ }
    else if (a.burst) { assert.equal(foe, false, id); seen.burst++ }
    else if (!a.target) { assert.equal(own, false, id + ': a row that names no target helps nobody'); seen.none++ }
    else if (a.target.select === 'self') { assert.equal(own, true, id); seen.self++ }
    else if (a.target.side === 'ally') { assert.equal(own, true, id); assert.equal(foe, true, id + ': the row says ally'); seen.ally++ }
    else if (a.target.side === 'enemy') { assert.equal(own, false, id); assert.equal(foe, false, id); seen.enemy++ }
    else { assert.equal(a.target.side, 'any', id); assert.equal(own, true, id + ': for either side - a unit of its own side'); assert.equal(foe, false, id + ': for either side - a unit of the other'); seen.any++ }
  }
  assert.ok(seen.attack > 400 && seen.ally > 80 && seen.enemy > 60 && seen.self > 100 && seen.any > 5, JSON.stringify(seen))
  assert.equal(helpsTarget(undefined, 'hero', 'hero'), null, 'no row, no answer'); assert.equal(helpsTarget(A['power.blightcaller.creeping-blight'], null, 'hero'), false, 'for either side, the user\'s side unknown: not green')
  console.log('# the engine\'s rows: ' + JSON.stringify(seen))
})

test('aiming the Holy Symbol\'s Heal at an ally draws a green line and green marks; aiming Wrath at an enemy draws red as before', () => {
  const used = dungeon.events.findIndex(e => e.type === 'power.used' && e.causeId === HEAL), priest = dungeon.events[used].actor
  const begun = dungeon.events.findLastIndex((e, k) => k < used && e.type === 'activation.begin' && e.actor === priest)
  const { v, V } = boot(dungeon, begun + 1), me = V.S.U[priest]
  assert.ok(me.kit.abilities.includes(HEAL) || me.kit.grants.includes(HEAL), 'the priest holds the Holy Symbol\'s Heal')
  const allies = Object.values(V.S.U).filter(u => u.side === me.side && u.id !== me.id && u.life === 'standing'), enemies = Object.values(V.S.U).filter(u => u.side !== me.side && u.life === 'standing')
  assert.ok(allies.length >= 1 && enemies.length >= 1, allies.length + " allies, " + enemies.length + " enemies stand")
  /* Heal chosen: every ally it can reach wears a green mark; pointing at one draws the line green */
  const aim = (to, id) => ({ from: me.hex, to, target: id, hit: null, dmg: null, hpAfter: null, lethal: false, locked: false })
  v.setPlay(facts({ actor: priest, slot: HEAL, targets: allies.map(u => u.hex).sort((a, b) => a - b), aim: aim(allies[0].hex, allies[0].id) }))
  assert.deepEqual(marks(V).map(m => m.unit).sort((a, b) => a - b), allies.map(u => u.id).sort((a, b) => a - b))
  for (const m of marks(V)) { assert.ok(m.css.includes(PLAY_HUE.aid), `the mark on an ally is green: ${m.css}`); assert.ok(!m.css.includes(PLAY_HUE.aim), 'not red') }
  assert.deepEqual(arrow(V), [PLAY_HUE.aid], 'the line and its head are green')
  /* Wrath chosen: red, as before - the marks and the line with its forecast */
  v.setPlay(facts({ actor: priest, slot: WRATH, targets: enemies.map(u => u.hex).sort((a, b) => a - b), aim: { ...aim(enemies[0].hex, enemies[0].id), hit: 70, dmg: 4, hpAfter: 2 } }))
  for (const m of marks(V)) { assert.ok(m.css.includes(PLAY_HUE.aim), `the mark on an enemy is red: ${m.css}`); assert.ok(!m.css.includes(PLAY_HUE.aid)) }
  assert.deepEqual(arrow(V), [PLAY_HUE.aim], 'the line is red'); assert.equal(V.dom.stage.querySelector('.playHit').textContent, '70%')
  /* a power for either side: green on the user's own side, red on the other - mark by mark */
  const either = Object.keys(STATIC.actions).find(id => { const a = STATIC.actions[id]; return !a.attack && !a.burst && a.target && a.target.select === 'unit' && a.target.side === 'any' }); assert.ok(either)
  v.setPlay(facts({ actor: priest, slot: either, targets: [allies[0].hex, enemies[0].hex].sort((a, b) => a - b), aim: aim(enemies[0].hex, enemies[0].id) }))
  const by = Object.fromEntries(marks(V).map(m => [m.unit, m.css]))
  assert.ok(by[allies[0].id].includes(PLAY_HUE.aid)); assert.ok(by[enemies[0].id].includes(PLAY_HUE.aim)); assert.deepEqual(arrow(V), [PLAY_HUE.aim])
  /* an action the page holds no row for is drawn red, as it was (nothing is guessed green) */
  v.setPlay(facts({ actor: priest, slot: 'power.not-in-the-dump', targets: [allies[0].hex], aim: aim(allies[0].hex, allies[0].id) }))
  assert.deepEqual(arrow(V), [PLAY_HUE.aim]); assert.ok(marks(V)[0].css.includes(PLAY_HUE.aim))
  v.dispose()
})

test('when Heal resolves nothing flies: the ally glows and the healed number shows', () => {
  const EV = dungeon.events, used = EV.findIndex(e => e.type === 'power.used' && e.causeId === HEAL), U = EV[used], healed = EV[used + 1]
  assert.notEqual(U.target, U.actor, 'the heal is aimed at another unit'); assert.deepEqual([healed.type, healed.target, healed.causeId], ['heal.applied', U.target, HEAL])
  /* the fold, as the page folds it (the engine's rows in hand): no projectile cue for the power; the heal's glow and number on the healed unit */
  const S = createState(); for (let k = 0; k < used; k++) fold(S, EV[k], CTX)
  const c1 = fold(S, EV[used], CTX); assert.deepEqual(c1.filter(c => c.k === 'fx.attack'), [], 'the power launches nothing')
  const c2 = fold(S, EV[used + 1], CTX)
  assert.deepEqual(c2.filter(c => c.k === 'fx.status'), [{ k: 'fx.status', id: U.target, style: 'heal' }], 'the healed unit glows')
  const num = c2.find(c => c.k === 'float' && c.kind === 'heal'); assert.equal(num.text, '+' + healed.amount); assert.equal(num.n, healed.amount)
  /* on the page: stepping the power's line adds no effect to the canvas; the heal's line adds the glow and floats the number */
  const { v, V, fx } = boot(dungeon, used)
  v.step(); assert.equal(v.cursor, used + 1); assert.deepEqual(fx, [], 'nothing is launched when the power is used')
  v.step(); assert.equal(v.cursor, used + 2); assert.ok(fx.length >= 1, 'the glow plays on the healed unit'); assert.ok(fx.every(f => f.cursor === used + 2))
  const floats = V.layers.floatL.querySelectorAll('.dmg').map(n => n.textContent); assert.ok(floats.includes('+' + healed.amount), 'the healed number: ' + floats.join(' '))
  v.dispose()
})

test('a heal over an area glows on the area\'s hexes and on every ally it heals; nothing flies at the unit pointed at', () => {
  const EV = party.events, used = EV.findIndex(e => e.type === 'power.used' && e.causeId === CIRCLE), U = EV[used]
  const heals = []; for (let k = used + 1; EV[k].type === 'heal.applied' && EV[k].causeId === CIRCLE; k++) heals.push(EV[k])
  assert.ok(heals.length >= 2, 'the Circle of Healing heals several'); assert.deepEqual(heals.map(h => h.target), U.targets)
  const S = createState(); for (let k = 0; k < used; k++) fold(S, EV[k], CTX)
  const from = S.U[U.actor].hex, c1 = fold(S, EV[used], CTX)
  assert.deepEqual(c1.filter(c => c.k === 'fx.attack'), [], 'no bolt at the unit the engine\'s line names')
  assert.deepEqual(c1.filter(c => c.k === 'fx.healArea'), [{ k: 'fx.healArea', centre: from, radius: STATIC.actions[CIRCLE].target.radius }], 'the area: the engine\'s row - round the user, its radius')
  for (const h of heals) assert.deepEqual(fold(S, h, CTX).filter(c => c.k === 'fx.status'), [{ k: 'fx.status', id: h.target, style: 'heal' }], 'each healed unit glows')
  /* on the page: the area's hexes wear the glow - every hex within the radius by the engine's own distance, in the heal's colour */
  const { w, v, V, fx } = boot(party, used)
  v.step(); assert.equal(v.cursor, used + 1)
  const tiles = V.dom.stage.querySelectorAll('.healAreaHex'), want = []
  for (let hex = 0; hex < V.data.POS.length; hex++) if (V.data.POS[hex] && V.data.distance(from, hex) <= 3) want.push(hex)
  assert.ok(want.length >= 8, want.length + " hexes within 3"); assert.deepEqual(tiles.map(n => +n.dataset.hex).sort((a, b) => a - b), want)
  for (const n of tiles) assert.match(n.style.cssText, /143\s*,\s*224\s*,\s*138/, 'in the heal\'s colour: ' + n.style.cssText)
  assert.equal(HEAL_HUE, '#8fe08a', 'theme.js HEAL_HUE is that colour')
  assert.deepEqual(fx, [], 'nothing flies')
  for (let k = 0; k < heals.length; k++) v.step()
  assert.ok(fx.length >= heals.length, 'the glow on each unit healed'); const floats = V.layers.floatL.querySelectorAll('.dmg').map(n => n.textContent)
  for (const h of heals) assert.ok(floats.includes('+' + h.amount), `+${h.amount} floats`)
  /* the area's glow goes by itself, and a seek takes it down */
  w._flush(4000); assert.equal(V.dom.stage.querySelectorAll('.healAreaHex').length, 0, 'the glow fades')
  v.seek(used); v.step(); assert.ok(V.dom.stage.querySelectorAll('.healAreaHex').length > 0); v.seek(used - 3); assert.equal(V.dom.stage.querySelectorAll('.healAreaHex').length, 0, 'a seek takes it down')
  v.dispose()
})

test('an attack\'s bolt is unchanged; a power aimed at an enemy still flies; a host that hands the fold no rows gets what it had', () => {
  /* a priest's Wrath: the ranged attack launches its projectile at the declaration, as before */
  const EV = dungeon.events, shot = EV.findIndex(e => e.type === 'attack.declared' && e.kind === 'ranged')
  const out = EV.findIndex((e, k) => k > shot && (e.type === 'attack.hit' || e.type === 'attack.miss') && e.actor === EV[shot].actor)
  const S = createState(); for (let k = 0; k < out; k++) fold(S, EV[k], CTX)
  const c = fold(S, EV[out], CTX).filter(x => x.k === 'fx.attack'); assert.equal(c.length, 1, 'the shot flies its projectile'); assert.deepEqual([c[0].kind, c[0].a, c[0].t], ['ranged', EV[shot].actor, EV[shot].target])
  /* a power the engine's row aims at an enemy (the Poison Flask): the bolt it flew before */
  const used = EV.findIndex(e => e.type === 'power.used' && e.causeId === HEAL), U = EV[used], foe = Object.values(S.U).find(u => u.side === 'enemy' && u.life === 'standing')
  const hostile = 'power.poison-flask.use'; assert.deepEqual(STATIC.actions[hostile].target, { select: 'unit', side: 'enemy' })
  const S2 = createState(); for (let k = 0; k < used; k++) fold(S2, EV[k], CTX)
  assert.deepEqual(fold(structuredClone(S2), { ...U, causeId: hostile, abilityId: hostile, target: foe.id }, CTX).filter(x => x.k === 'fx.attack'), [{ k: 'fx.attack', kind: 'ranged', dt: 'magic', a: U.actor, t: foe.id, dmg: null }])
  /* no rows in hand (an older host): a targeted power plays what it played */
  const bare = { UD: STATIC.units, SN: STATIC.statuses, IC: STATIC.itemClasses }
  assert.deepEqual(fold(structuredClone(S2), U, bare).filter(x => x.k === 'fx.attack'), [{ k: 'fx.attack', kind: 'ranged', dt: 'magic', a: U.actor, t: U.target, dmg: null }])
  /* a buff with no heal, aimed at an ally (Cover Ally): no bolt, and no area or heal glow of its own */
  const buff = 'power.kite-shield.cover-ally'; assert.equal(STATIC.actions[buff].target.side, 'ally'); assert.ok(!STATIC.actions[buff].effects.some(e => e.kind === 'heal'))
  const cb = fold(structuredClone(S2), { ...U, causeId: buff, abilityId: buff }, CTX); assert.deepEqual(cb.filter(x => x.k === 'fx.attack' || x.k === 'fx.healArea'), [])
})
