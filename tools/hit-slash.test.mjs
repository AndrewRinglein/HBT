// viewer.hit-slash (engine backlog; engine DECISIONS.md 2026-10-03 'an attack's timing: the projectile leaves at the release, the
// target reacts at the blow, a miss is dodged, a hit shows a red slash' — Andrew, playing the opening run: "Also, there's no red
// slash across the target that is part of a hit." — and, the same day, '...; the slash on every damaging hit; ...': asked
// "Should the red slash show on every hit that deals damage, ranged included, or only on melee hits?" — "3. If it was already
// doing that, then keep doing it. Red slash on every damage").
// The item's expect: "a zombie's hit on a hero draws a red slash across the hero at the blow, and a hero's hit on a zombie draws
// one across the zombie; a miss draws none; a page test finds the slash drawn on the painted 3D board for a hit and absent for a
// miss. A ranged hit that deals damage draws the slash at the projectile's arrival."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on the Orphanage's painted 3D scene with the cast standing, and on a
// flat board with tokens. The slash is found by what it DRAWS, not by a name: every layer the board adds to its effects canvas
// is drawn into a recording context, and a slash is a curved stroke across the target's chest in the style's colour, laid
// down opaque (so it reads red on a bright scene, not washed to white). The sandbox's half is
// ../kingdom/tools/hit-slash.verify.mjs; the browser's own picture ../kingdom/tools/hit-slash.shot.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import * as FXLIB from '../src/hexvfx.js'
const { playMeleeImpact, bodyY } = FXLIB, SLASH_STYLES = FXLIB.SLASH_STYLES ?? {}
import { createState, fold } from '../src/fold.js'
const A = await modules()
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const orphanage = load('battles/test.opening-orphanage.json'), lumberjack = load('battles/test.opening-lumberjack.json'),
  bridge = load('battles/test.opening-bridge.json'), cathedral = load('battles/test.opening-cathedral.json'), alpha = load('battles/showcase.alpha-team.json')
const FRAME = 16, TOL = .05, ARROW = 320
const statics = load('generated/static.json'), FOLD_CTX = { UD: statics.units, SN: statics.statuses, IC: statics.itemClasses }

/** a 2D context that writes down what is stroked: each stroke's colour, its blend, its width and its path's points */
function recorder() {
  const strokes = []; let path = []
  const state = { strokeStyle: '', fillStyle: '', lineWidth: 1, globalCompositeOperation: 'source-over', shadowBlur: 0, shadowColor: '', lineCap: '', globalAlpha: 1 }
  const ctx = new Proxy(state, { get(t, k) {
    if (k in t) return t[k]
    if (k === 'beginPath') return () => { path = [] }
    if (k === 'moveTo' || k === 'lineTo') return (x, y) => path.push({ op: k, x, y })
    if (k === 'quadraticCurveTo') return (cx, cy, x, y) => path.push({ op: k, cx, cy, x, y })
    if (k === 'stroke') return () => strokes.push({ style: t.strokeStyle, blend: t.globalCompositeOperation, width: t.lineWidth, path: path.map(p => ({ ...p })) })
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} })
    return () => {}
  }, set(t, k, v) { t[k] = v; return true } })
  return { ctx, strokes }
}
/** what a layer draws at a moment of its time: its curved strokes (a slash is a curve from one side of a body to the other) */
function curvesOf(draw, t = .3, dur = 620) {
  const { ctx, strokes } = recorder()
  try { draw(ctx, 1920, 1080, t, t * dur, [], .016) } catch { return [] }
  return strokes.filter(s => s.path.length === 2 && s.path[0].op === 'moveTo' && s.path[1].op === 'quadraticCurveTo')
}
const rgbOf = s => (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s) || []).slice(1, 4).map(Number)
/** the slash a layer draws, if it draws one: its opaque body stroke — colour, ends — or null */
function slashOf(layer) {
  const curves = curvesOf(layer.draw, .3, layer.dur), body = curves.filter(c => c.blend === 'source-over').sort((p, q) => q.width - p.width)[0]
  if (!body) return null
  const [a, b] = body.path
  return { rgb: rgbOf(body.style), width: body.width, from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y }, strokes: curves.length, blends: curves.map(c => c.blend) }
}

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
  const v = B.mount(host, data, { autoplay: false, enemiesTogether: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L, ctx: { UD: L.static.units, SN: L.static.statuses, IC: L.static.itemClasses } }
}
function standIn(look) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), clips = {}
  for (const k of Object.keys(look.motions)) clips[k] = k === 'death'
    ? new THREE.AnimationClip('death', 1, [new THREE.QuaternionKeyframeTrack(look.pivot + '.quaternion', [0, 1], [0, 0, 0, 1, ...flat.toArray()])])
    : new THREE.AnimationClip(k, look.moments?.[k]?.of ?? (k === 'idle' || k === 'move' || k === 'flight' ? 2 : .8), [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])
  return { look, scene, clips, props: [] }
}
const settle = () => new Promise(r => setImmediate(r))
const typeOf = (EV, id) => EV.find(e => e.type === 'unit.enter' && e.actor === id).typeId
const dealt = e => e.packets ? e.packets.reduce((s, p) => s + p.applied, 0) : e.amount
function attackAt(EV, i) {
  const e = EV[i], STOP = new Set(['attack.declared', 'activation.begin', 'activation.end', 'move.begin', 'moved', 'burst.declared', 'turn.begin', 'phase.begin'])
  const out = { i, e, outcome: -1, result: null, damage: -1, dealt: 0, falls: null, fall: -1 }
  for (let j = i + 1; j < EV.length && !STOP.has(EV[j].type); j++) { const x = EV[j]
    if (out.outcome < 0) {
      if (x.type === 'attack.hit') { out.outcome = j; out.result = 'hit' } else if (x.type === 'attack.miss') { out.outcome = j; out.result = 'miss' }
      else if (x.type === 'block.rolled' && x.blocked) { out.outcome = j; out.result = 'block' }
    } else if (out.result === 'hit') {
      if (x.type === 'damage.applied' && x.target === e.target && x.attackId === e.attackId && out.damage < 0) { out.damage = j; out.dealt = dealt(x) }
      if ((x.type === 'life.dead' || x.type === 'life.downed') && x.target === e.target && out.damage >= 0 && out.fall < 0) { out.fall = j; out.falls = x.type === 'life.dead' ? 'dead' : 'downed' }
    } }
  return out
}
function findAttack(EV, { type, kind, result, pred = () => true }) {
  for (let i = 0; i < EV.length; i++) { const e = EV[i]
    if (e.type !== 'attack.declared' || e.kind !== kind || (type && typeOf(EV, e.actor) !== type)) continue
    const a = attackAt(EV, i); if (a.result === result && pred(a)) return a }
  return null
}
/** each unit's token stands somewhere of its own on the screen (the fake page gives every element one box): by its hex */
function spread(V) {
  for (const [id, E] of V.layers.UEL) E.root.getBoundingClientRect = () => { const u = V.S.U[id], p = V.data.POS[u.hex]; return { left: p.px, top: p.py, width: 0, height: 0, right: p.px, bottom: p.py } }
}
const anchor = (V, id) => { const p = V.data.POS[V.S.U[id].hex]; return { x: p.px, y: p.py, h: 100 } }
/** play one attack on the page and watch the effects canvas: every layer added, when, and what it draws */
async function watch(battle, a, { cast: withCast = true, speed = 1, until = null, opts = {} } = {}) {
  const { w, v, V, EV } = boot(battle, opts)
  let cast = null
  if (withCast) { cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style }); V.cast = cast }
  const layers = [], actor = a.e.actor
  const clipAt = () => { const B = cast?.body(actor); return B && (B.motion === 'attack' || B.motion === 'ranged') ? B.clipTime(B.motion) : null }
  V.fx.FX = { add(dur, draw, sortY) { layers.push({ dur, draw, wall: w._now(), clock: V.clock(), clip: clipAt(), cursor: v.cursor, hp: V.S.U[a.e.target]?.hp }); return new Promise(() => {}) }, clear() {} }
  v.seek(Math.max(0, a.i - 2)); spread(V)
  if (cast) { cast.frame(0); await settle(); await settle(); cast.frame(0); cast.snap() }
  v.speed(speed); v.play()
  const end = until ?? Math.min(EV.length, (a.fall >= 0 ? a.fall : a.damage >= 0 ? a.damage : a.outcome) + 2), lines = []
  let cursor = v.cursor
  for (let n = 0; n < 200000 && v.cursor < end; n++) { w._flush(FRAME); cast?.frame(FRAME / 1000); spread(V)
    while (cursor < v.cursor) { lines.push({ at: cursor, wall: w._now(), clip: clipAt() }); cursor++ } }
  assert.ok(v.cursor >= end, `the pump reached line ${end}`)
  const slashes = layers.map(l => ({ ...l, slash: slashOf(l) })).filter(l => l.slash)
  const rec = (V.impact?.log || []).find(r => r.declared === a.i) || null
  return { w, v, V, EV, cast, layers, slashes, lines, rec, target: anchor(V, a.e.target), look: withCast ? A.lookFor(A.modelBinding(typeOf(EV, actor), V.data.models), actor) : null }
}
const near = (got, want, what, tol = TOL) => assert.ok(got != null && Math.abs(got - want) <= tol, `${what}: ${got == null ? 'never' : got.toFixed(3)} s, the moment is ${want.toFixed(3)} s`)
/** red: far more red than green or blue */
const isRed = ([r, g, b]) => r >= 180 && g <= 80 && b <= 80
/** across the target: the stroke's two ends lie on either side of the body's middle, at chest height */
function across(s, T, what) {
  const cy = bodyY(T), xs = [s.from.x, s.to.x].sort((p, q) => p - q)
  assert.ok(xs[0] < T.x - 15 && xs[1] > T.x + 15, `${what}: the slash crosses the body from one side to the other (${xs.map(x => x.toFixed(0))} about ${T.x.toFixed(0)})`)
  assert.ok(Math.abs((s.from.y + s.to.y) / 2 - cy) < 4, `${what}: at chest height (${((s.from.y + s.to.y) / 2).toFixed(0)}, the chest is at ${cy.toFixed(0)})`)
}

test('the slash is the existing effect in its existing styles: its body is laid down opaque in the style\'s own colour — red for a physical hit — under the glow it always had', () => {
  assert.deepEqual(Object.keys(SLASH_STYLES), ['phys', 'mag', 'true'], 'the three styles, by damage type')
  for (const k of Object.keys(SLASH_STYLES)) for (const f of ['core', 'glow', 'spark', 'body']) assert.match(SLASH_STYLES[k][f], /^\d+,\d+,\d+$/, `${k}.${f}`)
  const T = { x: 400, y: 300, h: 110 }, got = {}
  for (const type of ['phys', 'mag', 'true']) {
    const layers = []; playMeleeImpact({ add: (dur, draw, sortY) => { layers.push({ dur, draw, sortY }); return Promise.resolve() } }, T, type, 'med')
    assert.equal(layers.length, 1); assert.equal(layers[0].dur, 620, 'the slash\'s own time')
    const s = slashOf(layers[0]); assert.ok(s, `${type}: a slash is drawn`); across(s, T, type)
    assert.deepEqual(s.rgb, SLASH_STYLES[type].body.split(',').map(Number), `${type}: the body is the style's colour`)
    /* the halo it always had (the glow and the bright core, additive), then the body OPAQUE over it and a thin glint along the body */
    assert.deepEqual(s.blends, ['lighter', 'lighter', 'source-over', 'source-over'], `${type}: glow, core, body, glint`)
    assert.ok(s.width >= 7, `${type}: a body wide enough to read (${s.width} px)`)
    got[type] = s
  }
  assert.ok(isRed(got.phys.rgb), 'a physical hit\'s slash is red: ' + got.phys.rgb)
  assert.ok(got.mag.rgb[2] > got.mag.rgb[0], 'a magic hit\'s is the magic style\'s blue'); assert.ok(got.true.rgb[0] > 200 && got.true.rgb[1] > 140, 'a true hit\'s the true style\'s gold')
  /* a hard hit and a crit cross twice, as they did */
  for (const [tier, n] of [['low', 1], ['med', 1], ['high', 2], ['super', 2]]) { const layers = []
    playMeleeImpact({ add: (dur, draw) => { layers.push({ dur, draw }); return Promise.resolve() } }, T, 'phys', tier)
    assert.equal(curvesOf(layers[0].draw, .9).filter(c => c.blend === 'source-over' && c.width >= 7).length, n, `${tier}: ${n} slash${n > 1 ? 'es' : ''}`) }
})

test('the fold says a slash for an attack\'s damage that dealt damage — none for a hit that dealt none, a status tick, a miss', () => {
  const kinds = (battle, i) => { const S = createState(); let cues = []; for (let k = 0; k <= i; k++) cues = fold(S, battle.events[k], FOLD_CTX, 0); return cues }
  const hit = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'hit' })
  const c = kinds(orphanage, hit.damage).filter(x => x.k === 'slash'); assert.equal(c.length, 1, 'one slash at the damage line')
  assert.equal(c[0].id, hit.e.target); assert.equal(c[0].dt, 'physical'); assert.equal(c[0].n, hit.dealt); assert.equal(c[0].of, orphanage.events[hit.damage].packets ? 'applied' : 'amount')
  assert.equal(kinds(orphanage, hit.outcome).filter(x => x.k === 'slash').length, 0, 'not at the hit line')
  const miss = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'miss' })
  for (let k = miss.i; k <= miss.outcome; k++) assert.equal(kinds(orphanage, k).filter(x => x.k === 'slash').length, 0, 'a miss: none')
  /* a hit whose damage was all taken by armour or a ward: the engine's line says 0 dealt */
  const zero = alpha.events.findIndex(e => e.type === 'damage.applied' && e.attackId && dealt(e) === 0); assert.ok(zero > 0, 'the library holds a hit that dealt nothing')
  assert.equal(kinds(alpha, zero).filter(x => x.k === 'slash').length, 0, 'a hit that deals no damage draws none')
  /* a status's tick is damage, not a hit */
  const tick = cathedral.events.findIndex(e => e.type === 'damage.applied' && !e.attackId && String(e.causeId).includes('status.')); assert.ok(tick > 0)
  assert.equal(kinds(cathedral, tick).filter(x => x.k === 'slash').length, 0, 'a tick: none')
})

test('on the painted 3D board a Zombie\'s hit on a hero draws a red slash across the hero at the blow; a hero\'s hit on a Zombie draws one across the Zombie', async () => {
  const z = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'hit', pred: a => a.dealt > 0 }); assert.ok(z)
  { const { V, slashes, layers, rec, look, target, lines, v } = await watch(orphanage, z), mo = look.moments.attack
    assert.ok(V.data.atlas && V.cast, 'the Orphanage\'s painted scene, the cast standing on it')
    assert.equal(slashes.length, 1, `one slash for the hit (${layers.length} layers: ${layers.map(l => l.dur)})`)
    const s = slashes[0]; assert.ok(isRed(s.slash.rgb), 'red: ' + s.slash.rgb); across(s.slash, target, 'the hero')
    near(s.clip, mo.at, 'the slash is drawn when the claw\'s clip stands at its blow')
    assert.equal(s.cursor, z.outcome + 1, 'with the hit line just shown'); assert.equal(s.hp, V.S.U[z.e.target].hp + z.dealt, 'before the damage\'s own line')
    assert.ok(Math.abs(s.clock - rec.blowAt) < 1, 'at the pump\'s blow'); assert.equal(rec.slash, true)
    assert.equal(V.fx.slashes.at(-1).id, z.e.target)
    v.pause(); v.dispose()
    console.log(`# a Zombie's hit: red slash (${s.slash.rgb}) across the hero, drawn with the claw's clip at ${s.clip.toFixed(3)} s (its blow ${mo.at} s)`) }
  const h = findAttack(orphanage.events, { type: 'hero.fixed.school-teacher', kind: 'melee', result: 'hit', pred: a => a.dealt > 0 }); assert.ok(h)
  { const { slashes, look, target, v, EV } = await watch(orphanage, h), mo = look.moments.attack
    assert.equal(typeOf(EV, h.e.target), 'unit.zombie'); assert.equal(slashes.length, 1)
    assert.ok(isRed(slashes[0].slash.rgb)); across(slashes[0].slash, target, 'the Zombie'); near(slashes[0].clip, mo.at, 'at the hero\'s blow')
    v.pause(); v.dispose() }
})

test('a miss draws none, a block draws none — on the painted 3D board', async () => {
  const miss = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'miss' }); assert.ok(miss)
  { const { slashes, layers, rec, v } = await watch(orphanage, miss, { until: miss.outcome + 3 })
    assert.equal(slashes.length, 0, 'a miss draws no slash'); assert.equal(layers.length, 0, 'a blow that misses draws nothing on the target at all'); assert.equal(rec.slash, false); v.pause(); v.dispose() }
  const block = findAttack(cathedral.events, { type: 'unit.zombie', kind: 'melee', result: 'block' }); assert.ok(block)
  { const { slashes, v } = await watch(cathedral, block, { until: block.outcome + 3 }); assert.equal(slashes.length, 0, 'a full block draws none'); v.pause(); v.dispose() }
  const shot = findAttack(lumberjack.events, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'miss' }); assert.ok(shot)
  { const { slashes, layers, v } = await watch(lumberjack, shot, { until: shot.outcome + 3 })
    assert.ok(layers.some(l => l.dur === ARROW), 'the arrow flew'); assert.equal(slashes.length, 0, 'a shot that misses draws none'); v.pause(); v.dispose() }
})

test('a ranged hit that deals damage draws the slash at the projectile\'s arrival: the Hunter\'s arrow, the priest\'s bolt (its own style\'s colour)', async () => {
  const a = findAttack(orphanage.events, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'hit', pred: x => x.dealt > 0 }); assert.ok(a)
  { const { slashes, layers, target, v } = await watch(orphanage, a), arrow = layers.find(l => l.dur === ARROW)
    assert.ok(arrow, 'the arrow flew'); assert.equal(slashes.length, 1, 'one slash')
    assert.ok(isRed(slashes[0].slash.rgb), 'red (a physical hit)'); across(slashes[0].slash, target, 'the arrow\'s target')
    near((slashes[0].wall - arrow.wall) / 1000, ARROW / 1000, 'the slash is drawn when the arrow arrives'); assert.ok(slashes[0].wall > arrow.wall)
    v.pause(); v.dispose()
    console.log(`# a ranged hit: the slash ${((slashes[0].wall - arrow.wall)).toFixed(0)} ms after the arrow left (its flight ${ARROW} ms)`) }
  /* Law 10, combine 2026-10-04 (viewer master 4d90ddf — viewer.hit-slash — with this copy's engine fix.opening-probe-cadence, as at
     tools/attack-impact-timing.test.mjs): this read
       const p = findAttack(lumberjack.events, { type: 'hero.base.priest-armored', kind: 'ranged', result: 'hit', pred: x => x.dealt > 0 }); assert.ok(p)
       { const { slashes, target, v } = await watch(lumberjack, p)
     — battle 2's recording, whose party of three held the priest. Battle 2 fields two heroes by the ruling, without him. The
     scene is the first of this file's opening recordings, in their order, that holds a priest's bolt that deals damage
     (found by kind: the Cathedral today). Every check below is unchanged. */
  const boltIn = [orphanage, lumberjack, bridge, cathedral].map(b => ({ battle: b, p: findAttack(b.events, { type: 'hero.base.priest-armored', kind: 'ranged', result: 'hit', pred: x => x.dealt > 0 }) })).find(x => x.p)
  assert.ok(boltIn, 'an opening recording has a priest\'s bolt that deals damage')
  const p = boltIn.p; assert.equal(p.e.damageType, 'true')
  { const { slashes, target, v } = await watch(boltIn.battle, p)
    assert.equal(slashes.length, 1); across(slashes[0].slash, target, 'the bolt\'s target')
    assert.deepEqual(slashes[0].slash.rgb, SLASH_STYLES.true.body.split(',').map(Number), 'a true-damage hit: the true style\'s colour, not red (viewer SWITCHES slashColour)')
    v.pause(); v.dispose() }
})

test('the flat board (tokens, no bodies) draws it too, and a hand step draws it once at the damage\'s line', async () => {
  const z = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'hit', pred: a => a.dealt > 0 })
  { const { slashes, target, v, rec } = await watch(orphanage, z, { cast: false })
    assert.equal(rec.motion, 'token'); assert.equal(slashes.length, 1, 'one slash on the flat board'); assert.ok(isRed(slashes[0].slash.rgb)); across(slashes[0].slash, target, 'the token')
    assert.equal(slashes[0].cursor, z.outcome + 1, 'at the blow'); v.pause(); v.dispose() }
  /* stepped by hand: no pump, no blow to wait for — the slash comes with the damage's own line, once */
  const { w, v, V } = boot(orphanage), layers = []
  V.fx.FX = { add(dur, draw) { layers.push({ dur, draw, cursor: v.cursor }); return new Promise(() => {}) }, clear() {} }
  v.seek(z.i); spread(V)
  for (let k = z.i; k <= z.damage; k++) { v.step(); spread(V); w._flush(FRAME) }
  const got = layers.map(l => ({ ...l, slash: slashOf(l) })).filter(l => l.slash)
  assert.equal(got.length, 1, 'one slash'); assert.equal(got[0].cursor, z.damage + 1, 'drawn as the damage line is folded')
  v.dispose()
})

test('the whole Orphanage, played on the 3D board: one slash for every attack that hit and dealt damage, none for any other', async () => {
  const { w, v, V, EV } = boot(orphanage)
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style }); V.cast = cast
  const layers = []; V.fx.FX = { add(dur, draw) { layers.push({ dur, draw, cursor: v.cursor }); return new Promise(() => {}) }, clear() {} }
  const begin = EV.findIndex(e => e.type === 'battle.begin') + 1
  v.seek(begin); spread(V); cast.frame(0); await settle(); await settle(); cast.frame(0)
  v.speed(4); v.play()
  for (let n = 0; n < 2000000 && v.cursor < EV.length; n++) { w._flush(FRAME); cast.frame(FRAME / 1000); spread(V) }
  assert.equal(v.cursor, EV.length)
  const attacks = EV.map((e, i) => e.type === 'attack.declared' ? attackAt(EV, i) : null).filter(Boolean)
  const damaging = attacks.filter(a => a.result === 'hit' && a.dealt > 0), slashes = layers.filter(l => slashOf(l))
  assert.ok(damaging.length >= 15 && attacks.length > damaging.length, `${attacks.length} attacks, ${damaging.length} that hit and dealt damage`)
  assert.equal(slashes.length, damaging.length, 'one slash each, and no other')
  assert.deepEqual(V.fx.slashes.map(s => s.id), damaging.map(a => a.e.target), 'each across its own target, in the log\'s order')
  assert.equal(V.impact.log.filter(r => r.slash).length, damaging.length)
  v.dispose()
  console.log(`# the Orphanage: ${attacks.length} attacks, ${damaging.length} hit and dealt damage, ${slashes.length} slashes drawn`)
})
