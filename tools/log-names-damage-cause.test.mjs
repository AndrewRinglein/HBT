// viewer.log-names-damage-cause (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post
// answered'). Andrew: "The priest was attacking the skeleton archer, and it was taking damage. I don't know why that was." - at
// the Lumberjack House, the priest not next to the archer. The trace: Poison, Bleed and Burn deal their damage at the END of the
// bearer's own Activation, so a hero carrying one loses Health right after its own shot - and the log said only "takes 2 poison".
// The engine's damage line carries what dealt it (causeId; statusId for a status's tick; attackId or abilityId with the actor;
// thorns; collision; hazard), and an attack of opportunity is said by the line before it (aoo.provoked). Asked here:
//   the log    - every damage line says what dealt it, from the engine's own fields - never only a damage type;
//   the number - a status's tick floats in the status's own colour with its mark and its name, not as a hit's number;
//   the timing - the tick is shown after the unit's own action has finished playing, not on top of it;
//   the trace  - battle 2's recording: a hero-side unit poisoned by a Zombie's Claw loses Health at the end of its own Activation.
// Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and the page's own modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { buildLog } from '../src/log.js'
import { createState, fold } from '../src/fold.js'
import { floatHue } from '../src/board.js'
import { stStyle, DMG_HUE } from '../src/theme.js'
import { shownName } from '../src/names.js'
const A = await modules()
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const D = { ACT: STATIC.actions, ITEMS: STATIC.items, BADGES: STATIC.badges, UD: STATIC.units, TERRAIN_NAMES: STATIC.terrainNames, STATUS_ROWS: STATIC.statusRows }
const load = f => JSON.parse(readFileSync('battles/' + f, 'utf8'))
const LIBRARY = readdirSync('battles').filter(f => f.endsWith('.json') && f !== 'library.json').map(f => ({ f, b: load(f) })).filter(x => Array.isArray(x.b.events))
const lumberjack = load('test.opening-lumberjack.json')
const text = x => String(x ?? '').replace(/<br>[\s\S]*$/, '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const nameOf = (EV, id) => shownName(EV.find(e => e.type === 'unit.enter' && e.actor === id).name)
const lineAt = (EV, i) => { const l = buildLog(EV, STATIC.statuses, 99, D).find(x => x.i === i); assert.ok(l, 'the log has a line for event ' + i); return text(l.t) }
/** the first damage line of a kind in the library: {f, EV, i, e} */
const find = pred => { for (const { f, b } of LIBRARY) { const i = b.events.findIndex((e, k) => e.type === 'damage.applied' && pred(e, b.events, k)); if (i >= 0) return { f, EV: b.events, i, e: b.events[i] } } return null }

test('battle 2, the trace: a unit poisoned by a Zombie\'s Claw loses Health to Poison at the end of its own Activation, right after its own attack - and the log says so', () => {
  const EV = lumberjack.events, i = EV.findIndex(e => e.type === 'damage.applied' && e.statusId === 'status.poison'), e = EV[i]
  assert.ok(i > 0, 'the recording holds a Poison tick'); const who = e.target, side = EV.find(x => x.type === 'unit.enter' && x.actor === who).side
  assert.equal(side, 'hero', 'on a unit of the player\'s side')
  /* how it came by the Poison: the engine's own line - a Zombie's Claw, its Poison trigger */
  const got = EV.findIndex((x, k) => k < i && x.type === 'status.applied' && x.target === who && x.statusId === 'status.poison'), G = EV[got]
  assert.ok(got > 0); assert.match(G.causeId, /^trigger\.zombie\./); const giver = EV.find(x => x.type === 'unit.enter' && x.actor === G.by)
  assert.equal(giver.typeId, 'unit.zombie')
  /* the tick is the line after the unit's own Activation ends, and that Activation held its own attack on someone else */
  assert.deepEqual([EV[i - 1].type, EV[i - 1].actor], ['activation.end', who], 'the tick follows the end of its own Activation')
  const begun = EV.findLastIndex((x, k) => k < i && x.type === 'activation.begin' && x.actor === who), own = EV.slice(begun, i).find(x => x.type === 'attack.declared' && x.actor === who)
  assert.ok(own, 'it attacked in that Activation'); assert.notEqual(own.target, who)
  assert.equal(e.actor, null, 'nobody struck it: the damage has no actor'); assert.equal(e.causeId, 'status.poison')
  /* the log: what it reads now */
  const line = lineAt(EV, i), name = nameOf(EV, who)
  assert.equal(line, `${name} takes ${e.amount} from Poison · poison`, 'the Poison tick\'s line')
  console.log(`# battle 2's recording: ${name} is poisoned by ${shownName(giver.name)}'s ${STATIC.actions[EV.findLast((x, k) => k < got && x.type === 'attack.declared' && x.actor === G.by).attackId].name} (event ${got}) and, after its own ${STATIC.actions[own.attackId].name} on ${nameOf(EV, own.target)}, loses ${e.amount} Health to Poison when its Activation ends (event ${i}): "${line}"`)
})

test('every damage line of every recording says what dealt it: never only a damage type', () => {
  let lines = 0; const said = new Map()
  for (const { f, b } of LIBRARY) {
    const EV = b.events, log = buildLog(EV, STATIC.statuses, 99, D)
    for (const l of log) { const e = EV[l.i]; if (e.type !== 'damage.applied') continue
      const t = text(l.t); lines++
      assert.match(t, / takes \d+( damage)? from \S/, `${f} event ${l.i}: ${t}`)
      assert.doesNotMatch(t, / from (undefined|null|#|\[object)/, `${f} event ${l.i}: ${t}`)
      const kind = e.statusId ? 'a status' : e.thorns ? 'thorns' : e.collision ? 'a collision' : e.hazard ? 'the ground' : e.attackId ? 'an attack' : e.abilityId ? 'a power or burst' : String(e.causeId).split('.')[0]
      if (!said.has(kind)) said.set(kind, `${f}: ${t}`) }
  }
  assert.ok(lines > 800, lines + ' damage lines read')
  for (const [k, t] of said) console.log(`# ${k}: ${t}`)
  for (const k of ['a status', 'thorns', 'a collision', 'an attack', 'a power or burst', 'trigger']) assert.ok(said.has(k), 'the library holds damage from ' + k)
})

test('each kind in the engine\'s own words: a tick names its status; a hit names the attacker and the attack; an attack of opportunity says so', () => {
  /* Poison, Bleed, Burn: the status's name (static.json statuses) */
  for (const [id, word] of [['status.poison', 'Poison'], ['status.bleed', 'Bleed'], ['status.burn', 'Burn']]) {
    const x = find(e => e.statusId === id); assert.ok(x, 'a ' + word + ' tick is recorded'); assert.equal(STATIC.statuses[id], word)
    assert.equal(lineAt(x.EV, x.i), `${nameOf(x.EV, x.e.target)} takes ${x.e.amount} from ${word} · ${x.e.damageType}`)
  }
  /* a hit by an attack: the attacker, by its shown name, and the attack's own name (the engine's action row) */
  const hit = find((e, EV, k) => e.attackId && e.packets && !e.burst && !EV.slice(Math.max(0, k - 12), k).some(x => x.type === 'aoo.provoked'))
  assert.equal(lineAt(hit.EV, hit.i).split(' · ')[0], `${nameOf(hit.EV, hit.e.target)} takes ${hit.e.amount} damage from ${nameOf(hit.EV, hit.e.actor)}'s ${STATIC.actions[hit.e.attackId].name}`)
  /* an attack of opportunity: the damage line that follows the engine's aoo.provoked for that attacker, target and attack */
  const EV = lumberjack.events, p = EV.findIndex(e => e.type === 'aoo.provoked' && !e.as), P = EV[p]; assert.ok(p > 0, 'battle 2 holds an attack of opportunity')
  const d = EV.findIndex((e, k) => k > p && e.type === 'damage.applied' && e.actor === P.actor && e.target === P.target && e.attackId === P.attackId)
  assert.ok(d > p && d - p < 14, 'and its damage line')
  assert.equal(lineAt(EV, d).split(' · ')[0], `${nameOf(EV, P.target)} takes ${EV[d].amount} damage from an attack of opportunity by ${nameOf(EV, P.actor)}`)
  /* the same unit's NEXT ordinary hit is not called one */
  const later = EV.findIndex((e, k) => k > d && e.type === 'damage.applied' && e.attackId && !EV.slice(Math.max(0, k - 12), k).some(x => x.type === 'aoo.provoked'))
  assert.doesNotMatch(lineAt(EV, later), /opportunity|counterattack|fend/i)
  /* a counterattack and a fend are said by their kind (the engine's `as`) */
  const lines = (as, word) => { const x = (() => { for (const { f, b } of LIBRARY) { const k = b.events.findIndex(e => e.type === 'aoo.provoked' && e.as === as); if (k < 0) continue
      const Q = b.events[k], j = b.events.findIndex((e, n) => n > k && n < k + 14 && e.type === 'damage.applied' && e.actor === Q.actor && e.target === Q.target && e.attackId === Q.attackId); if (j > 0) return { EV: b.events, j, Q } } return null })()
    if (!x) return false
    assert.equal(lineAt(x.EV, x.j).split(' · ')[0], `${nameOf(x.EV, x.Q.target)} takes ${x.EV[x.j].amount} damage from a ${word} by ${nameOf(x.EV, x.Q.actor)}`); return true }
  const counter = lines('counterattack', 'counterattack'), fend = lines('fend', 'fend')
  console.log(`# a counterattack's damage line is ${counter ? 'recorded and read' : 'not in the library'}; a fend's is ${fend ? 'recorded and read' : 'not in the library'}`)
  /* Thorns: the thorned unit's; a collision; a trigger's damage: the item that brought it; a burst and a power's cost to its own caster */
  const th = find(e => e.thorns); assert.equal(lineAt(th.EV, th.i).split(' · ')[0], `${nameOf(th.EV, th.e.target)} takes ${th.e.amount} from ${nameOf(th.EV, th.e.actor)}'s Thorns`)
  const co = find(e => e.collision); assert.match(lineAt(co.EV, co.i), new RegExp(`^${nameOf(co.EV, co.e.target)} takes ${co.e.amount} from the collision · `))
  const tr = find(e => String(e.causeId).startsWith('trigger.') && !e.collision), src = Object.values(STATIC.items).find(it => it.triggers.some(t => t.id === tr.e.causeId))
  assert.ok(src, 'the trigger is an item\'s: ' + tr.e.causeId); assert.equal(lineAt(tr.EV, tr.i).split(' · ')[0], `${nameOf(tr.EV, tr.e.target)} takes ${tr.e.amount} from ${nameOf(tr.EV, tr.e.actor)}'s ${src.name}`)
  const bu = find(e => e.burst); assert.equal(lineAt(bu.EV, bu.i).split(' · ')[0], `${nameOf(bu.EV, bu.e.target)} takes ${bu.e.amount} damage from ${nameOf(bu.EV, bu.e.actor)}'s ${STATIC.actions[bu.e.abilityId].name}`)
  const own = find(e => e.abilityId && !e.burst && e.actor === e.target)
  if (own) assert.equal(lineAt(own.EV, own.i).split(' · ')[0], `${nameOf(own.EV, own.e.target)} takes ${own.e.amount} from its own ${STATIC.actions[own.e.abilityId].name}`)
  /* the ground's hazard and a fall from above are named by the engine's own id for them (no recording holds one): its words */
  const base = { type: 'damage.applied', actor: null, target: 0, amount: 2, damageType: 'fire', hpBefore: 5, hpAfter: 3 }, enter = { type: 'unit.enter', actor: 0, name: 'Zombie 1', side: 'enemy' }
  assert.equal(text(buildLog([enter, { ...base, causeId: 'terrain.lava', hazard: true, hex: 3 }], {}, 1, D)[0].t), `Zombie takes 2 from ${STATIC.terrainNames['terrain.lava'] ?? 'Lava'} · fire`)
  /* a fall from above is the encounter's own line: its id (a trigger of the encounter's, with no unit behind it) and the hex */
  assert.equal(text(buildLog([enter, { ...base, causeId: 'trigger.cavern-trail.meteor-fall', hex: 3 }], {}, 1, D)[0].t), 'Zombie takes 2 from Meteor Fall · fire')
  /* and a host that hands the log no tables still names the cause, by the engine's ids as words */
  assert.equal(text(buildLog([enter, { ...base, causeId: 'status.poison', statusId: 'status.poison', damageType: 'poison' }], {}, 1)[0].t), 'Zombie takes 2 from Poison · poison')
  assert.match(text(buildLog([enter, { ...enter, actor: 1, name: 'Forest Elf A', side: 'hero' }, { ...base, actor: 1, causeId: 'attack.shortbow.short-shot', attackId: 'attack.shortbow.short-shot', damageType: 'physical' }], {}, 1)[0].t), /^Zombie takes 2 from Forest Elf's Short Shot/)
})

test('the number over the unit at a status tick is the status\'s: its colour, its mark and its name - a hit\'s number is as it was', () => {
  const EV = lumberjack.events, i = EV.findIndex(e => e.type === 'damage.applied' && e.statusId === 'status.poison'), ctx = { UD: STATIC.units, SN: STATIC.statuses, IC: STATIC.itemClasses }
  const S = createState(); for (let k = 0; k < i; k++) fold(S, EV[k], ctx)
  const cues = fold(S, EV[i], ctx), floats = cues.filter(c => c.k === 'float'), num = floats.find(c => c.kind === 'damage')
  assert.ok(num, 'the tick floats its number'); assert.equal(num.statusId, 'status.poison', 'and the float knows it is Poison\'s'); assert.equal(num.n, EV[i].amount); assert.equal(num.of, 'amount'); assert.equal(num.text, '−' + EV[i].amount)
  assert.equal(floatHue(num, D), stStyle('status.poison', D).hue, 'in Poison\'s colour')
  const word = floats.find(c => c.kind === 'status' && c.statusId === 'status.poison'); assert.ok(word, 'with the status\'s name beside it'); assert.equal(word.text, 'Poison'); assert.equal(word.n, undefined, 'a word, not a number')
  /* Bleed's tick is true damage: it was a white number, a hit's white - now Bleed's */
  const bl = find(e => e.statusId === 'status.bleed'), SB = createState(); for (let k = 0; k < bl.i; k++) fold(SB, bl.EV[k], ctx)
  const bnum = fold(SB, bl.EV[bl.i], ctx).find(c => c.k === 'float' && c.kind === 'damage')
  assert.equal(bl.e.damageType, 'true'); assert.equal(floatHue(bnum, D), stStyle('status.bleed', D).hue); assert.notEqual(floatHue(bnum, D), DMG_HUE.true)
  /* a hit's number is untouched: the damage type's colour, no status on it */
  const h = EV.findIndex(e => e.type === 'damage.applied' && e.attackId), SH = createState(); for (let k = 0; k < h; k++) fold(SH, EV[k], ctx)
  const hn = fold(SH, EV[h], ctx).filter(c => c.k === 'float' && c.kind === 'damage')
  assert.ok(hn.length > 0); for (const c of hn) { assert.equal(c.statusId, undefined); assert.equal(floatHue(c, D), DMG_HUE[c.dt] || DMG_HUE.other) }
  /* on the page: the float over the unit wears the status's mark */
  const { v, V } = boot(lumberjack); v.seek(i); v.step()
  const marks = V.layers.floatL.querySelectorAll('.dmgMark')
  assert.equal(marks.length, 1, 'one mark, the tick\'s'); assert.equal(marks[0].dataset.status, 'status.poison'); assert.ok(marks[0].style.cssText.includes(stStyle('status.poison', V.data).hue), 'in Poison\'s colour')
  v.dispose()
})

function boot(battle, opts = {}) {
  const EV = battle.events, m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, tagCarriers: L.static.tagCarriers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, enemiesTogether: false, ...opts }); v.push(EV)
  return { w, v, V: v._V, EV }
}
/** a stand-in body whose strike is `strike` seconds long (the pack's own length when none is given) */
function standIn(look, strike) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), clips = {}
  for (const k of Object.keys(look.motions)) clips[k] = k === 'death'
    ? new THREE.AnimationClip('death', 1, [new THREE.QuaternionKeyframeTrack(look.pivot + '.quaternion', [0, 1], [0, 0, 0, 1, ...flat.toArray()])])
    : new THREE.AnimationClip(k, (k === 'attack' || k === 'ranged') && strike ? strike : look.moments?.[k]?.of ?? (k === 'idle' || k === 'move' || k === 'flight' ? 2 : .8), [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])
  return { look, scene, clips, props: [] }
}
const settle = () => new Promise(r => setImmediate(r))
const FRAME = 16

/** play battle 2 from before the poisoned unit's own attack to past its tick, the cast standing; what was seen */
async function playTick(strike) {
  const { w, v, V, EV } = boot(lumberjack), tick = EV.findIndex(e => e.type === 'damage.applied' && e.statusId === 'status.poison'), who = EV[tick].target
  const begun = EV.findLastIndex((x, k) => k < tick && x.type === 'activation.begin' && x.actor === who), declared = EV.findIndex((x, k) => k > begun && x.type === 'attack.declared' && x.actor === who)
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look, strike), readStyle: el => el.style }); V.cast = cast
  v.seek(begun); cast.frame(0); await settle(); await settle(); cast.frame(0); cast.snap()
  const B = cast.body(who); assert.ok(B, 'the poisoned unit stands as its body')
  const seen = { struck: null, ended: null, tick: null, motionAtTick: null, length: B.clipLength('attack') }
  v.play()
  for (let n = 0; n < 200000 && v.cursor <= tick + 1; n++) {
    w._flush(FRAME); cast.frame(FRAME / 1000)
    const striking = B.motion === 'attack' || B.motion === 'ranged'
    if (striking && seen.struck == null) seen.struck = w._now()
    if (!striking && seen.struck != null && seen.ended == null) seen.ended = w._now()
    if (v.cursor > tick && seen.tick == null) { seen.tick = w._now(); seen.motionAtTick = B.motion; seen.marks = V.layers.floatL ? V.layers.floatL.querySelectorAll('.dmgMark').length : 0 }
  }
  assert.ok(seen.tick != null, 'the pump played the tick'); assert.ok(seen.struck != null, 'the unit\'s own attack played first')
  v.pause(); v.dispose()
  return { ...seen, declared, tick: seen.tick, who }
}

test('the tick is shown after the unit\'s own action has finished playing, not on top of it', async () => {
  /* its own strike as long as the real clip: the tick's line plays once the body has left its attack */
  const real = await playTick(null)
  assert.ok(real.ended != null && real.ended <= real.tick, `the strike (${real.length.toFixed(2)} s) had finished ${real.tick - real.ended} ms before the tick`)
  assert.notEqual(real.motionAtTick, 'attack'); assert.equal(real.marks, 1, 'and the tick\'s number is on the board then')
  /* a long strike (4 s of clip): the tick waits for it - it does not land while the body is still striking */
  const long = await playTick(4)
  assert.equal(long.length, 4); assert.ok(long.ended != null, 'the long strike finished')
  assert.ok(long.tick >= long.ended, `the tick (at ${long.tick} ms) waited for the strike to finish (at ${long.ended} ms)`)
  assert.notEqual(long.motionAtTick, 'attack', 'the body is not striking when its tick is shown')
  assert.ok(long.tick - long.struck >= 3900, 'the whole of the strike played first')
  console.log(`# the tick after the unit's own strike: the real clip (${real.length.toFixed(2)} s) ended ${real.tick - real.ended} ms before it; a 4 s strike ended ${long.tick - long.ended} ms before it`)
})
