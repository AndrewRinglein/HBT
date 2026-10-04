// viewer.area-trigger-burst (engine backlog; engine DECISIONS.md 2026-10-03 'the Fire Imp's burn does not hit the imp itself; an
// end-of-Activation area burn shows an explosion of fire' — Andrew: "If it's an end-of-activation burn in a certain area, we
// need to create a VFX that goes along with that. So that should be an explosion of fire. We have the VFX for that.").
// The item's expect: "a Fire Imp ending its Activation shows an explosion of fire over the hexes within 2 of it, then the
// burned units react; a page test finds the burst drawn at the Fire Imp's end of Activation with the trigger's radius, and
// lists every area trigger in the opening battles that has no burst."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Bridge's own recording. The burst is found by what is DRAWN:
// the hexes marked on the board (the burst's own tiles) and the layer added to the effects canvas, drawn into a recording
// context — the fire explosion's blast wave, its reach measured. The area is the trigger's own, from the engine's sheet
// (static.json, the unit's row: select area, radius, origin self); the board decides none of it.
// The sandbox's half is ../kingdom/tools/area-trigger-burst.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import * as THEME from '../src/theme.js'
import { foldTo } from '../src/fold.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const statics = load('generated/static.json')
const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral'].map(n => [n, load(`battles/test.opening-${n}.json`)])
const bridge = OPENING.find(([n]) => n === 'bridge')[1]
const FRAME = 16

function boot(battle, opts = {}) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L, ctx: { UD: L.static.units, SN: L.static.statuses, IC: L.static.itemClasses } }
}
const typeOf = (EV, id) => EV.find(e => e.type === 'unit.enter' && e.actor === id).typeId
const board = S => { const c = structuredClone(S); for (const k of ['FIRING', 'TRIGFLASH', 'AIM', 'ATTACK', 'AOO', 'BURST']) c[k] = null; c.critPending = false; c.subjectId = null; c.subjectMode = null; c.activeId = null; return c }
/** the engine's sheet: a unit type's area triggers (select area, a radius, from the owner) */
const areaTriggers = typeId => (statics.units[typeId]?.triggers || []).filter(t => t.select && typeof t.select === 'object' && t.select.select === 'area')
/** a context that writes down the ellipses and circles a layer strokes or fills: how far the effect reaches */
function reachOf(draw, T) {
  let far = 0; const hues = []
  const st = { strokeStyle: '', fillStyle: '', lineWidth: 1, globalCompositeOperation: 'source-over', shadowBlur: 0, shadowColor: '' }
  const c = new Proxy(st, { get(t, k) { if (k in t) return t[k]
    if (k === 'ellipse') return (x, y, rx) => { if (Math.abs(x - T.x) < 1) far = Math.max(far, rx) }
    if (k === 'stroke') return () => hues.push(t.strokeStyle)
    if (k === 'createRadialGradient') return () => ({ addColorStop(_, col) { hues.push(col) } })
    return () => {} }, set(t, k, v) { t[k] = v; return true } })
  for (const t of [.05, .2, .4, .54]) { try { draw(c, 1920, 1080, t, t * 700, [], .016) } catch { return null } }
  return { far, hues }
}
/** play from a Fire Imp's activation.end to after its trigger's lines, watching the board's marks and the effects canvas */
function watch(i, opts = {}) {
  const { w, v, V, EV, ctx } = boot(bridge, opts), e = EV[i]
  const layers = []
  V.fx.FX = { add(dur, draw) { layers.push({ dur, draw, cursor: v.cursor, wall: w._now(), burns: Object.values(V.S.U).filter(u => (u.st || u.statuses || {})['status.burn']).length }); return new Promise(() => {}) }, clear() {} }
  /* each token stands on its own hex on the screen (the fake page gives every element one box) */
  const spread = () => { for (const [id, E] of V.layers.UEL) E.root.getBoundingClientRect = () => { const p = V.data.POS[V.S.U[id].hex]; return { left: p.px, top: p.py, width: 0, height: 0, right: p.px, bottom: p.py } } }
  /* the run begins a little before: an Enemy Phase is planned from its first Activation */
  const from = opts.enemiesTogether === false ? i - 1 : EV.findLastIndex((x, k) => k <= i && x.type === 'phase.begin' && x.phase === 'enemy')
  v.seek(from); spread(); v.play()
  for (let n = 0; n < 400000 && (V.areaBursts || []).every(b => b.at !== i) && v.cursor < EV.length; n++) { w._flush(FRAME); spread() }
  const rec = (V.areaBursts || []).find(b => b.at === i)
  const tiles = () => V.layers.dyn.querySelectorAll('.areaBurstHex').map(n => +n.dataset.hex).sort((a, b) => a - b)
  const drawn = tiles(), shownLines = v.cursor, wall0 = w._now()
  return { w, v, V, EV, ctx, e, layers, rec, drawn, shownLines, wall0, tiles }
}
const fireImpEnds = EV => EV.map((e, i) => e.type === 'trigger.rolled' && e.hook === 'onActivationEnd' && e.fired && typeOf(EV, e.actor) === 'unit.fire-imp' ? i : -1).filter(i => i >= 0)

test('the engine\'s sheet names the Fire Imp\'s end-of-Activation burn as an area: every unit within 2 of it, itself left out; the log names the trigger, its owner and each unit it reached', () => {
  const t = areaTriggers('unit.fire-imp'); assert.equal(t.length, 1)
  assert.deepEqual({ id: t[0].id, hook: t[0].hook, select: t[0].select, effect: t[0].effect }, { id: 'trigger.fire-imp.burn', hook: 'onActivationEnd',
    select: { select: 'area', side: 'any', radius: 2, origin: 'self', excludeSelf: true }, effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 } })
  const EV = bridge.events, ends = fireImpEnds(EV); assert.ok(ends.length >= 6, `${ends.length} Fire Imp Activations end in the Bridge`)
  for (const i of ends) { assert.equal(EV[i - 1].type, 'activation.end'); assert.equal(EV[i - 1].actor, EV[i].actor); assert.equal(EV[i].causeId, 'trigger.fire-imp.burn')
    for (let k = i + 1; EV[k].type === 'trigger.fired' || EV[k].type === 'status.applied'; k++) if (EV[k].type === 'trigger.fired') { assert.equal(EV[k].actor, EV[i].actor); assert.notEqual(EV[k].target, EV[i].actor) } }
})

test('which burst an area trigger plays is chosen by what it applies, through the status-to-effect table: burn is fire; the rest have none and are listed', () => {
  assert.equal(typeof THEME.areaBurstOf, 'function', 'theme.js: areaBurstOf')
  assert.equal(THEME.STYLE['status.burn'].vfx, 'burn'); assert.equal(THEME.AREA_BURST.burn, 'fire')
  const of = t => t.effect.kind === 'status.apply' ? THEME.areaBurstOf(t.effect.statusId, { STATUS_ROWS: statics.statusRows }) : null
  assert.equal(of(areaTriggers('unit.fire-imp')[0]), 'fire')
  /* every area trigger of a unit type that enters an opening battle, and whether it has a burst */
  const types = new Set(OPENING.flatMap(([, b]) => b.events.filter(e => e.type === 'unit.enter').map(e => e.typeId)))
  const all = [...types].flatMap(typeId => areaTriggers(typeId).map(t => ({ typeId, id: t.id, burst: of(t), what: t.effect.kind === 'status.apply' ? t.effect.statusId : t.effect.kind })))
  const without = all.filter(t => !t.burst).map(t => `${t.id} (${statics.units[t.typeId].name}: ${t.what})`).sort()
  assert.deepEqual(all.filter(t => t.burst).map(t => t.id), ['trigger.fire-imp.burn'], 'the opening battles\' area triggers with a burst')
  assert.deepEqual(without, ['trigger.lieutenant-demon.heal (Lieutenant Demon: heal)', 'trigger.lieutenant-demon.health-health (Lieutenant Demon: statMod)',
    'trigger.necromancer.heal (Necromancer: heal)', 'trigger.poison-imp.poison (Poison Imp: status.poison)'], 'and those with none, by name')
  /* in the whole sheet */
  const everywhere = Object.keys(statics.units).flatMap(typeId => areaTriggers(typeId).map(t => ({ id: t.id, burst: of(t) })))
  assert.deepEqual(everywhere.filter(t => t.burst).map(t => t.id).sort(), ['trigger.balrog.burn', 'trigger.fire-imp.burn'])
  assert.deepEqual(everywhere.filter(t => !t.burst).map(t => t.id).sort(), ['trigger.lieutenant-demon.heal', 'trigger.lieutenant-demon.health-health', 'trigger.necromancer.heal', 'trigger.poison-imp.poison', 'trigger.skeleton-spider.armor-armor'])
  console.log(`# area triggers in the opening battles with no burst (they play nothing new): ${without.join(', ')}`)
  console.log(`# in the whole sheet with no burst: ${everywhere.filter(t => !t.burst).map(t => t.id).join(', ')}`)
})

test('a Fire Imp ending its Activation: an explosion of fire over the hexes within 2 of it, drawn before the burned units react', () => {
  const EV = bridge.events, i = fireImpEnds(EV).find(k => EV[k + 1].type === 'trigger.fired'); assert.ok(i > 0, 'a Fire Imp\'s burn that reaches a unit')
  const { V, v, e, layers, rec, drawn, shownLines, w } = watch(i, { enemiesTogether: false })
  assert.ok(rec, 'the board noted the area trigger'); assert.equal(rec.trigger, 'trigger.fire-imp.burn'); assert.equal(rec.owner, e.actor); assert.equal(rec.radius, 2); assert.equal(rec.burst, 'fire'); assert.equal(rec.statusId, 'status.burn')
  const centre = V.S.U[e.actor].hex, POS = V.data.POS, W = V.data.LAYOUT.W; assert.equal(rec.centre, centre)
  /* the hexes marked are exactly those within 2 of the imp: by the engine's own distance, and by where the hexes lie */
  const all = POS.map((p, h) => p ? h : -1).filter(h => h >= 0)
  const within = all.filter(h => V.data.distance(centre, h) <= 2), near = all.filter(h => Math.hypot(POS[h].px - POS[centre].px, POS[h].py - POS[centre].py) <= 2.2 * W)
  assert.deepEqual(drawn, within, 'the burst\'s tiles are the hexes within 2'); assert.deepEqual(within, near, 'which are the hexes that lie within two hexes of it')
  assert.ok(within.length > 7 && within.length <= 19 && within.includes(centre), `${within.length} hexes, the imp's own among them`)
  assert.deepEqual([...rec.hexes].sort((a, b) => a - b), within)
  /* the explosion of fire: the effects library's own (700 ms), centred on the imp, its blast wave reaching the area's edge */
  const boom = layers.filter(l => l.dur === 700); assert.equal(boom.length, 1, 'one explosion: ' + layers.map(l => l.dur))
  const T = { x: POS[centre].px, y: POS[centre].py }, R = reachOf(boom[0].draw, T), zoom = V.camTarget?.zoom ?? V.view.zoom ?? 1
  assert.ok(R, 'it draws'); assert.ok(Math.abs(R.far - 2.5 * W * zoom) < .08 * W * zoom, `its blast wave reaches the edge of the hexes within 2 (${R.far.toFixed(0)} px; two and a half hexes are ${(2.5 * W * zoom).toFixed(0)} px)`)
  assert.ok(R.hues.some(c => /255,\s*1[2-9]\d,\s*\d+/.test(c) || /255,160,50/.test(c)), 'in fire\'s colours')
  /* before the victims react: with the trigger's own line just shown, no unit yet burned by it */
  assert.equal(boom[0].cursor, i + 1, 'drawn as the trigger\'s line is shown'); assert.equal(shownLines, i + 1)
  const victims = []; for (let k = i + 1; EV[k].type === 'trigger.fired' || EV[k].type === 'status.applied'; k++) if (EV[k].type === 'status.applied') victims.push(EV[k])
  assert.ok(victims.length >= 1); for (const x of victims) assert.equal(V.S.U[x.target].st['status.burn'] || 0, x.before, 'the victim is not yet burned by it on the board')
  const t0 = w._now(); for (let n = 0; n < 4000 && v.cursor < i + 2; n++) w._flush(FRAME)
  assert.ok(w._now() - t0 >= 350, `the explosion is given its time before the victims' lines (${w._now() - t0} ms)`)
  /* then the burned units react as they did, and the marks go by themselves */
  for (let n = 0; n < 400 ; n++) w._flush(FRAME)
  assert.equal(V.layers.dyn.querySelectorAll('.areaBurstHex').length, 0, 'the marks are taken down')
  v.pause(); v.dispose()
  console.log(`# the Fire Imp's end of Activation: ${within.length} hexes marked (within 2), the explosion's wave reaches ${R.far.toFixed(0)} px (2.5 hexes), ${victims.length} unit(s) burned after it`)
})

test('it plays with the enemies of a type moving together (the default) and where the burn reaches nobody; the board ends on the engine\'s state', () => {
  const EV = bridge.events, ends = fireImpEnds(EV), lone = ends.find(k => EV[k + 1].type !== 'trigger.fired'); assert.ok(lone > 0, 'a Fire Imp\'s burn that reaches nobody')
  { const { V, v, rec, drawn, layers } = watch(lone)
    assert.equal(V.together.on, true); assert.ok(rec, 'the burst plays though nobody stands in it'); assert.equal(rec.burst, 'fire'); assert.ok(drawn.length > 7); assert.equal(layers.filter(l => l.dur === 700).length, 1)
    v.pause(); v.dispose() }
  /* the whole Bridge: one burst for each Fire Imp Activation that ended, and the board is the pure fold of the log */
  const { w, v, V, ctx } = boot(bridge), layers = []
  V.fx.FX = { add(dur) { layers.push(dur); return new Promise(() => {}) }, clear() {} }
  const begin = EV.findIndex(e => e.type === 'battle.begin') + 1
  v.seek(begin); v.speed(4); v.play()
  for (let n = 0; n < 2000000 && v.cursor < EV.length; n++) w._flush(FRAME)
  assert.equal(v.cursor, EV.length)
  assert.deepEqual(V.areaBursts.filter(b => b.burst).map(b => b.at).sort((a, b) => a - b), ends, 'one burst for each of the Fire Imp\'s ended Activations')
  assert.equal(layers.filter(d => d === 700).length, ends.length)
  assert.deepEqual(board(V.S), board(foldTo(EV, EV.length, ctx)), 'the board is the engine\'s own state')
  v.dispose()
})

test('an area trigger with no burst plays nothing new and is noted by name (the Necromancer\'s heal); a hand step and a seek leave no mark behind', () => {
  const cathedral = OPENING.find(([n]) => n === 'cathedral')[1], EV = cathedral.events
  const i = EV.findIndex(e => e.type === 'trigger.rolled' && e.fired && e.causeId === 'trigger.necromancer.heal'); assert.ok(i > 0, 'the Necromancer\'s heal fires in the Cathedral')
  { const { w, v, V } = boot(cathedral, { enemiesTogether: false }), layers = []
    V.fx.FX = { add(dur) { layers.push({ dur, cursor: v.cursor }); return new Promise(() => {}) }, clear() {} }
    v.seek(i); v.step(); w._flush(FRAME)
    const rec = (V.areaBursts || []).find(b => b.at === i); assert.ok(rec, 'noted'); assert.equal(rec.trigger, 'trigger.necromancer.heal'); assert.equal(rec.burst, null); assert.equal(rec.radius, 2)
    assert.equal(layers.filter(l => l.cursor === i + 1).length, 0, 'nothing is drawn for it'); assert.equal(V.layers.dyn.querySelectorAll('.areaBurstHex').length, 0)
    v.dispose() }
  const B = bridge.events, k = fireImpEnds(B)[0]
  const { w, v, V } = boot(bridge, { enemiesTogether: false }); V.fx.FX = { add: () => new Promise(() => {}), clear() {} }
  v.seek(k); v.step(); assert.ok(V.layers.dyn.querySelectorAll('.areaBurstHex').length > 7, 'stepped by hand, the burst is drawn')
  v.seek(k - 5); assert.equal(V.layers.dyn.querySelectorAll('.areaBurstHex').length, 0, 'a seek takes the marks down')
  for (let n = 0; n < 200; n++) w._flush(FRAME)
  assert.equal(V.layers.dyn.querySelectorAll('.areaBurstHex').length, 0); v.dispose()
})
