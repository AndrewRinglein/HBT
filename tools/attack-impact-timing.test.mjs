// viewer.attack-impact-timing (engine backlog; engine DECISIONS.md 2026-10-03 'an attack's timing: the projectile leaves at the
// release, the target reacts at the blow, a miss is dodged, a hit shows a red slash' and, the same day, 'one draft after every
// battle; ...; a death is tied to the strike; ...'). Andrew, playing the opening run: "Ranged attacks are not synced up well
// enough for the point at which the attack is launched compared to when the projectile animation then goes. Both the arrow and
// a priest cast were not synced up very well." / "a zombie hit my warrior, and the recoil from being hit should be connected to
// the timing of the attack. What happens is the attack plays, maybe a third of a second later, the reaction plays, and the
// reaction should just be a little bit delayed behind the attack." / "Death animations are happening separately from the
// strike. They should be more closely connected, just like the other reactions."
// The item's expect: "a Hunter's arrow leaves the bow at the release of the shot and a priest's cast leaves at the release of
// the cast, not before or after; a zombie's blow on a hero starts the hero's hit reaction at the blow, within the attack's own
// motion; a page test measures, per attack kind, the time between the attacker's motion start, the projectile's start and the
// target's reaction start against the clip's authored moments; every clip with no authored moment is listed. A unit killed by
// a blow starts its death at that blow, within the attack's own timing."
// Measured here on the page (VIEWER_PAGE, else BATTLE-VIEWER.html) with the cast standing on it — each body a stand-in whose
// attack and shot clips are as long as the real ones — by WATCHING THE BODIES AND THE EFFECTS, not by reading the pump's own
// record: when the attacker's motion starts, where its clip stands when the board's projectile is launched, and where it
// stands when the target's body starts to react. The pump's record (V.impact.log) is then held to what was watched.
// The sandbox's half is ../kingdom/tools/attack-impact-timing.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import * as CM from './character-models.mjs'
const { packCharacterModels, MOMENTS, MOMENT_DEFAULT } = CM
import { foldTo } from '../src/fold.js'
const A = await modules(), pack = await packCharacterModels()
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const orphanage = load('battles/test.opening-orphanage.json'), lumberjack = load('battles/test.opening-lumberjack.json'),
  bridge = load('battles/test.opening-bridge.json'), cathedral = load('battles/test.opening-cathedral.json')
/* combine 2026-10-04: the opening recordings this file stands bodies on (the battles whose board is painted), in their order —
   a scene one of them no longer holds is found by its KIND in the first that holds one (the notes at each use) */
const PAINTED = [orphanage, lumberjack, bridge, cathedral]
/** a battle the engine fights now: its own export tool, as tools/affliction-pop-up.test.mjs asks it */
const exportOf = (scenario, seed) => JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tools/export-battle.mts', '--scenario', scenario, '--seed', String(seed)], { cwd: '../engine', encoding: 'utf8', maxBuffer: 1 << 27 }))
const FRAME = 16                       // ms of the page's clock a frame, and of every body's
const TOL = .05                        // s of the attacker's clip: two frames and the pump's own timer step
/* the board's projectiles (src/hexvfx.js): how long each is in the air and how much of that it gathers at the caster first */
const FLIGHTS = { arrow: { ms: 320, windup: 0 }, magic: { ms: 720, windup: .3 }, holy: { ms: 780, windup: .34 } }
const flightOf = e => e.kind !== 'ranged' ? null : e.damageType === 'magic' ? FLIGHTS.magic : e.damageType === 'true' ? FLIGHTS.holy : FLIGHTS.arrow

/** a clip's length in its file: the last key of its samplers (the GLB's own JSON) */
function clipLength(path, clip) {
  const b = readFileSync('../' + path), g = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'))
  const a = g.animations.find(x => x.name === clip); assert.ok(a, `${path} holds ${clip}`)
  return Math.max(...a.samplers.map(s => g.accessors[s.input].max[0]))
}
const clipName = c => c.replace(/^Purchased /, '')

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
  /* one at a time: this item is each attack's own timing (the grouped Enemy Phase has its own test below) */
  const v = B.mount(host, data, { autoplay: false, enemiesTogether: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L, ctx: { UD: L.static.units, SN: L.static.statuses, IC: L.static.itemClasses } }
}
/** a stand-in body: a box on its pivot whose attack and shot clips are as long as the real ones (the pack's own lengths) */
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
const board = S => { const c = structuredClone(S); for (const k of ['FIRING', 'TRIGFLASH', 'AIM', 'ATTACK', 'AOO', 'BURST']) c[k] = null; c.critPending = false; c.subjectId = null; c.subjectMode = null; return c }

/** the attack declared at log index i: its outcome line, its damage line, and whether the target falls to it */
function attackAt(EV, i) {
  const e = EV[i], STOP = new Set(['attack.declared', 'activation.begin', 'activation.end', 'move.begin', 'moved', 'burst.declared', 'turn.begin', 'phase.begin'])
  const out = { i, e, outcome: -1, result: null, damage: -1, falls: null, fall: -1 }
  for (let j = i + 1; j < EV.length && !STOP.has(EV[j].type); j++) { const x = EV[j]
    if (out.outcome < 0) {
      if (x.type === 'attack.hit') { out.outcome = j; out.result = 'hit' }
      else if (x.type === 'attack.miss') { out.outcome = j; out.result = 'miss' }
      else if (x.type === 'block.rolled' && x.blocked) { out.outcome = j; out.result = 'block' }
    } else if (out.result === 'hit') {
      if (x.type === 'damage.applied' && x.target === e.target && x.attackId === e.attackId && out.damage < 0) out.damage = j
      if ((x.type === 'life.dead' || x.type === 'life.downed') && x.target === e.target && out.damage >= 0 && out.fall < 0) { out.fall = j; out.falls = x.type === 'life.dead' ? 'dead' : 'downed' }
    } }
  return out
}
/** the first attack in a recording of a kind: by the attacker's unit type, the attack's kind, its outcome, and whether it fells */
function findAttack(EV, { type, kind, result, falls = null, dt = null }) {
  for (let i = 0; i < EV.length; i++) { const e = EV[i]
    if (e.type !== 'attack.declared' || e.kind !== kind || (dt && e.damageType !== dt) || (type && typeOf(EV, e.actor) !== type)) continue
    const a = attackAt(EV, i); if (a.result === result && a.falls === falls) return a }
  return null
}
/** stand the cast on the page at log index `from`, play to `to`, and WATCH: every body's motion each frame, every effect the
    board launches. Returns what was seen of the attack `a`. */
async function watch(battle, a, { speed = 1, opts = {}, before = 2, until = null } = {}) {
  const { w, v, V, EV } = boot(battle, opts)
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style })
  V.cast = cast
  /* the board's effects, watched: each layer the board adds to its canvas, and where the page's clock and the attacker's clip stood */
  const seen = { fx: [], motion: null, reaction: null, lines: [], falling: [] }
  const actor = a.e.actor, target = a.e.target
  const clipAt = () => { const B = cast.body(actor); return B && (B.motion === 'attack' || B.motion === 'ranged') ? B.clipTime(B.motion) : null }
  V.fx.FX = { add(dur) { seen.fx.push({ dur, wall: w._now(), clock: V.clock(), clip: clipAt(), cursor: v.cursor }); return new Promise(() => {}) }, clear() {} }
  const start = Math.max(0, a.i - before)
  v.seek(start); cast.frame(0); await settle(); await settle(); cast.frame(0); cast.snap()
  const Abody = cast.body(actor), Tbody = cast.body(target)
  assert.ok(Abody, `${typeOf(EV, actor)} stands as its model`); assert.ok(Tbody, `${typeOf(EV, target)} stands as its model`)
  v.speed(speed); v.play()
  const end = until ?? Math.min(EV.length, (a.fall >= 0 ? a.fall : a.damage >= 0 ? a.damage : a.outcome) + 2)
  let wasA = Abody.motion, wasT = Tbody.motion, recoiled = false, cursor = v.cursor
  for (let n = 0; n < 200000 && v.cursor < end; n++) {
    w._flush(FRAME); cast.frame(FRAME / 1000)
    while (cursor < v.cursor) { seen.lines.push({ at: cursor, type: EV[cursor].type, wall: w._now(), clock: V.clock(), clip: clipAt() }); cursor++ }
    const mA = Abody.motion, mT = Tbody.motion
    if (!seen.motion && (mA === 'attack' || mA === 'ranged') && wasA !== mA) seen.motion = { motion: mA, wall: w._now() - Abody.clipTime(mA) * 1000 / speed, clock: V.clock(), cursor: v.cursor }
    const reacts = (mT === 'hit' || mT === 'death' || mT === 'guard') && wasT !== mT ? mT : !recoiled && Tbody.recoil() > 0 ? 'recoil' : null
    if (reacts && seen.motion && !seen.reaction) seen.reaction = { as: reacts, wall: w._now(), clock: V.clock(), clip: clipAt(), cursor: v.cursor, life: V.S.U[target].life }
    if (Tbody.recoil() > 0) recoiled = true
    /* a body seen to start its death: where its fall stands each frame, while it is still that body */
    if (seen.reaction?.as === 'death' && cast.body(target) === Tbody) seen.falling.push({ t: Tbody.clipTime('death'), life: V.S.U[target].life, cursor: v.cursor })
    wasA = mA; wasT = mT
  }
  assert.ok(v.cursor >= end, `the pump reached line ${end} (it is at ${v.cursor})`)
  const rec = (V.impact?.log || []).find(r => r.declared === a.i) || null
  return { w, v, V, EV, cast, seen, rec, look: A.lookFor(A.modelBinding(typeOf(EV, actor), V.data.models), actor), Abody, Tbody }
}
const near = (got, want, what, tol = TOL) => assert.ok(got != null && Math.abs(got - want) <= tol, `${what}: ${got == null ? 'never' : got.toFixed(3)} s, the moment is ${want.toFixed(3)} s`)

test('every attack and shot motion has its moment, authored in one table beside the bindings, per clip; a clip with none keeps the default and is listed by name', () => {
  assert.ok(MOMENTS && typeof MOMENTS === 'object', 'tools/character-models.mjs: the MOMENTS table'); assert.equal(MOMENT_DEFAULT, .48)
  const byClip = new Map(), unauthored = new Set(), used = new Set()
  let n = 0
  for (const [typeId, { looks }] of Object.entries(pack)) for (const look of looks) for (const m of ['attack', 'ranged']) {
    const ref = look.motions[m]
    if (!ref) { assert.equal(look.moments?.[m], undefined, `${typeId}: no ${m} motion, no moment`); continue }
    const mo = look.moments?.[m]; n++
    assert.ok(mo, `${typeId} ${look.id}: its ${m} motion has a moment`)
    const name = clipName(ref.clip), len = clipLength(ref.path, ref.clip)
    assert.equal(mo.clip, name); assert.ok(Math.abs(mo.of - len) < 1e-3, `${typeId} ${m}: the clip's own length (${mo.of} / ${len})`)
    assert.ok(mo.at > 0 && mo.at < mo.of, `${typeId} ${m}: the moment ${mo.at} is inside the clip (${mo.of} s)`)
    const row = MOMENTS[name], want = row && (m === 'ranged' ? row.release ?? row.blow : row.blow ?? row.release)
    if (want != null) { assert.equal(mo.source, 'authored', `${typeId} ${m}`); assert.equal(mo.at, want, `${typeId} ${m}: the table's own number`); used.add(name) }
    else { assert.equal(mo.source, 'default', `${typeId} ${m}`); assert.ok(Math.abs(mo.at - MOMENT_DEFAULT * len) < 1e-3, `${typeId} ${m}: the default, ${MOMENT_DEFAULT} of the clip's length`); unauthored.add(`${name} (${m})`) }
    /* per clip, never per unit: one clip, one moment, whoever plays it and from whichever file */
    const k = m + '|' + name; if (byClip.has(k)) assert.equal(mo.at, byClip.get(k), `${name}: one moment for every body that plays it`); else byClip.set(k, mo.at)
    /* nothing but the moment is added to the motion's own reference */
    assert.deepEqual(Object.keys(ref).filter(x => !['path', 'sha256', 'clip', 'borrowed'].includes(x)), [], `${typeId} ${m}: the motion's reference is as it was`)
  }
  assert.ok(n >= 40, `${n} attack and shot motions in the pack`)
  for (const name of Object.keys(MOMENTS)) { assert.ok(used.has(name), `the table's '${name}' is a clip some body plays`)
    for (const [k, s] of Object.entries(MOMENTS[name])) { assert.ok(k === 'blow' || k === 'release', `${name}: a blow or a release`); assert.ok(s > 0, name) } }
  /* the two rulings' own subjects are authored: the bow's release, the zombie's claw, the heroes' swing (the priest's cast plays it) */
  assert.equal(pack['hero.base.ranger-scantily'].looks[0].moments.ranged.source, 'authored')
  assert.equal(pack['unit.zombie'].looks[0].moments.attack.source, 'authored')
  assert.equal(pack['hero.base.priest-armored'].looks[0].moments.attack.source, 'authored')
  /* the list: by name, exactly the clips with no authored moment */
  const list = execFileSync(process.execPath, ['tools/character-models.mjs', '--list'], { encoding: 'utf8' })
  const line = list.split('\n').find(l => l.startsWith('attack and shot clips with no authored moment'))
  assert.ok(line, 'the list names them: ' + list.split('\n').slice(-3).join(' / '))
  const listed = line.split(': ')[1].split(', ').filter(x => x && x !== 'none').sort()
  assert.deepEqual(listed, [...unauthored].sort(), 'every clip with no authored moment is listed by name, and no other')
  assert.deepEqual(listed, ['Spell_Simple_Shoot (ranged)'], 'today: the Necromancer\'s and the Lieutenant Demon\'s quick cast, whose hands barely move — it keeps the default')
  console.log(`# ${n} attack and shot motions over ${byClip.size} clips; authored: ${[...used].sort().join(', ')}; on the default (${MOMENT_DEFAULT} of the clip): ${listed.join(', ')}`)
})

test('the page carries the moments, and the cast says which motion an attack plays and when its moment is', async () => {
  const { v, V, EV } = boot(orphanage)
  assert.deepEqual(V.data.models, pack, 'the page\'s pack is the tool\'s')
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style })
  V.cast = cast; const a = findAttack(EV, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'hit' })
  v.seek(a.i); cast.frame(0); await settle(); await settle(); cast.frame(0)
  const hunter = cast.moment(a.e.actor, 'ranged'), look = pack['hero.base.ranger-scantily'].looks[0]
  assert.deepEqual(hunter, { motion: 'ranged', ...look.moments.ranged }, 'a shot: the bow\'s own clip and its release')
  assert.deepEqual(cast.moment(a.e.actor, 'melee'), { motion: 'attack', ...look.moments.attack }, 'a blow: the swing and its blow')
  const zombie = Object.values(V.S.U).find(u => u.typeId === 'unit.zombie')
  assert.deepEqual(cast.moment(zombie.id, 'melee'), { motion: 'attack', ...A.lookFor(A.modelBinding('unit.zombie', pack), zombie.id).moments.attack })
  /* a body with no shot plays its attack for one: the moment is that clip's (the priest's cast is the swing) */
  assert.equal(pack['hero.base.priest-armored'].looks[0].motions.ranged, undefined)
  assert.equal(cast.moment(99999, 'melee'), null, 'no body, no moment: the token\'s own lunge is the pump\'s')
  v.dispose()
})

test('a zombie\'s blow on a hero: the hero\'s reaction starts at the blow, within the attack\'s own motion — not a beat after the hit', async () => {
  const a = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'hit' }); assert.ok(a, 'the Orphanage has a Zombie\'s hit')
  const { seen, rec, look, EV, V, v } = await watch(orphanage, a), mo = look.moments.attack
  assert.ok(seen.motion, 'the Zombie\'s attack motion was seen to start'); assert.equal(seen.motion.motion, 'attack')
  assert.ok(seen.reaction, 'the hero\'s body was seen to react')
  near(seen.reaction.clip, mo.at, 'the hero reacts when the claw\'s clip stands at its blow')
  assert.ok(seen.reaction.clip < mo.of, 'within the attack\'s own motion, not after it has finished')
  near((seen.reaction.wall - seen.motion.wall) / 1000, mo.at, 'from the motion\'s start to the reaction')
  /* the blow is the hit: the engine's line folds then, and the damage's number with it — the log in its own order */
  const hit = seen.lines.find(l => l.at === a.outcome), dmg = seen.lines.find(l => l.at === a.damage)
  near(hit.clip, mo.at, 'the hit line is shown at the blow'); assert.ok(dmg.wall - hit.wall <= 260, `the damage's number follows at once (${dmg.wall - hit.wall} ms)`)
  assert.deepEqual(seen.lines.map(l => l.at), seen.lines.map((_, k) => seen.lines[0].at + k), 'every line once, in the log\'s order')
  /* the pump's own record says the same */
  assert.ok(rec, 'the pump recorded the attack'); assert.equal(rec.motion, 'attack'); assert.equal(rec.moment, mo.at); assert.equal(rec.source, 'authored'); assert.equal(rec.clip, mo.clip)
  assert.equal(rec.result, 'hit'); assert.equal(rec.reaction, 'hit')
  near((rec.reactionAt - rec.motionAt) / 750, mo.at, 'the record: reaction less motion start, in the clip\'s seconds', .03)
  assert.equal(rec.projectileAt, null, 'a blow launches nothing')
  v.pause(); v.dispose()
  console.log(`# melee (Zombie, ${mo.clip}, blow ${mo.at} s of ${mo.of} s): motion start -> reaction ${((seen.reaction.wall - seen.motion.wall) / 1000).toFixed(3)} s; the clip stood at ${seen.reaction.clip.toFixed(3)} s`)
})

test('a Hunter\'s arrow leaves the bow at the release of the shot, not before or after, and the target reacts when it arrives', async () => {
  const a = findAttack(orphanage.events, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'hit' }); assert.ok(a, 'the Orphanage has a Hunter\'s shot that hits')
  const { seen, rec, look, v } = await watch(orphanage, a), mo = look.moments.ranged, F = FLIGHTS.arrow
  assert.equal(seen.motion.motion, 'ranged', 'the bow\'s shot')
  const arrow = seen.fx.find(f => f.dur === F.ms); assert.ok(arrow, 'the board flew an arrow: ' + JSON.stringify(seen.fx.map(f => f.dur)))
  assert.equal(seen.fx.filter(f => f.dur === F.ms).length, 1, 'one arrow')
  near(arrow.clip, mo.at, 'the arrow leaves when the shot\'s clip stands at its release')
  near((arrow.wall - seen.motion.wall) / 1000, mo.at, 'from the motion\'s start to the arrow')
  assert.ok(seen.reaction, 'the target was seen to react')
  near((seen.reaction.wall - arrow.wall) / 1000, F.ms / 1000, 'the target reacts when the arrow arrives')
  assert.ok(seen.reaction.wall > arrow.wall, 'not before the arrow has flown')
  assert.equal(rec.motion, 'ranged'); assert.equal(rec.moment, mo.at); assert.equal(rec.source, 'authored'); assert.equal(rec.result, 'hit')
  near((rec.projectileAt - rec.motionAt) / 750, mo.at, 'the record: projectile less motion start', .03)
  near((rec.reactionAt - rec.projectileAt) / 750, F.ms / 1000, 'the record: reaction less projectile', .03)
  v.pause(); v.dispose()
  console.log(`# ranged, arrow (Hunter, ${mo.clip}, release ${mo.at} s of ${mo.of} s): motion start -> arrow ${((arrow.wall - seen.motion.wall) / 1000).toFixed(3)} s (clip at ${arrow.clip.toFixed(3)} s); arrow -> reaction ${((seen.reaction.wall - arrow.wall) / 1000).toFixed(3)} s (its flight ${F.ms} ms)`)
})

test('a priest\'s cast leaves at the release of the cast: the bolt gathers before it and leaves the hand at the moment; the target reacts when it lands', async () => {
  /* Law 10, combine 2026-10-04 (viewer master cf11722 with this copy's engine fix.opening-probe-cadence; engine DECISIONS.md
     2026-10-03 'one draft after every battle; …': "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read
       const a = findAttack(lumberjack.events, { type: 'hero.base.priest-armored', kind: 'ranged', result: 'hit' }); assert.ok(a, 'battle 2 has a priest\'s cast that hits')
       const { seen, rec, look, v } = await watch(lumberjack, a), F = FLIGHTS.holy
     — battle 2's recording, whose party of three held the priest. By the ruling battle 2 fields two heroes and the priest
     is not one of them. The scene is the first of this file's recordings, in their order, that holds a priest's cast
     that hits (found by kind, not by name: the Cathedral today). Every check below is unchanged. */
  const scene = PAINTED.map(b => ({ battle: b, a: findAttack(b.events, { type: 'hero.base.priest-armored', kind: 'ranged', result: 'hit' }) })).find(s => s.a)
  assert.ok(scene, 'an opening recording has a priest\'s cast that hits')
  const a = scene.a
  assert.equal(a.e.damageType, 'true')
  const { seen, rec, look, v } = await watch(scene.battle, a), F = FLIGHTS.holy
  /* the priest has no shot motion: his cast is his swing, and its moment the swing's */
  const mo = look.moments.attack; assert.equal(seen.motion.motion, 'attack')
  const bolt = seen.fx.find(f => f.dur === F.ms); assert.ok(bolt, 'the board flew the holy bolt: ' + JSON.stringify(seen.fx.map(f => f.dur)))
  /* the bolt's effect gathers at the caster for the first part of its time (its windup) and then leaves: it leaves at the release */
  const leaves = bolt.wall + F.ms * F.windup
  near((leaves - seen.motion.wall) / 1000, mo.at, 'the bolt leaves the caster when the cast\'s clip stands at its release')
  assert.ok(bolt.clip <= mo.at + TOL, 'its gathering starts before the release, not after')
  near((seen.reaction.wall - leaves) / 1000, F.ms * (1 - F.windup) / 1000, 'the target reacts when the bolt lands')
  assert.equal(rec.moment, mo.at); assert.equal(rec.motion, 'attack')
  near((rec.releaseAt - rec.motionAt) / 750, mo.at, 'the record: release less motion start', .03)
  v.pause(); v.dispose()
  console.log(`# ranged, cast (priest, ${mo.clip}, release ${mo.at} s of ${mo.of} s): motion start -> the bolt leaves ${((leaves - seen.motion.wall) / 1000).toFixed(3)} s; leaves -> reaction ${((seen.reaction.wall - leaves) / 1000).toFixed(3)} s (its flight ${Math.round(F.ms * (1 - F.windup))} ms after ${Math.round(F.ms * F.windup)} ms gathering)`)
})

test('a mage\'s bolt (magic) and an Imp\'s spit: every ranged attack and cast, not those two alone', async () => {
  for (const [battle, want, F, name] of [[cathedral, { type: 'hero.base.mage-fireaura', kind: 'ranged', result: 'hit', dt: 'magic' }, FLIGHTS.magic, 'mage'], [bridge, { type: 'unit.imp', kind: 'ranged', result: 'hit' }, FLIGHTS.arrow, 'Imp']]) {
    const a = findAttack(battle.events, want); assert.ok(a, name)
    const { seen, rec, look, v } = await watch(battle, a), m = seen.motion.motion, mo = look.moments[m]
    const fx = seen.fx.find(f => f.dur === F.ms); assert.ok(fx, `${name}: its projectile flew`)
    const leaves = fx.wall + F.ms * F.windup
    near((leaves - seen.motion.wall) / 1000, mo.at, `${name}: the projectile leaves at the release`)
    near((seen.reaction.wall - leaves) / 1000, F.ms * (1 - F.windup) / 1000, `${name}: the target reacts at the arrival`)
    assert.equal(rec.moment, mo.at)
    v.pause(); v.dispose()
    console.log(`# ranged (${name}, ${mo.clip} as ${m}, release ${mo.at} s): motion start -> leaves ${((leaves - seen.motion.wall) / 1000).toFixed(3)} s; -> reaction ${((seen.reaction.wall - leaves) / 1000).toFixed(3)} s`)
  }
})

test('a unit killed by a blow starts its death at that blow, and one shot dead at the arrow\'s arrival — before the log\'s own line says it is dead', async () => {
  /* a melee kill: the Zombie's blow that kills in the Orphanage */
  const k = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'hit', falls: 'dead' }); assert.ok(k, 'a Zombie kills in the Orphanage')
  { const { seen, rec, look, v } = await watch(orphanage, k), mo = look.moments.attack
    assert.equal(seen.reaction.as, 'death', 'the killed unit\'s reaction is its death')
    near(seen.reaction.clip, mo.at, 'the death starts when the claw\'s clip stands at its blow')
    assert.ok(seen.reaction.cursor <= k.fall, 'before the life.dead line is shown'); assert.equal(seen.reaction.life, 'standing', 'the fold has not yet said it is dead: only the drawing is early')
    assert.equal(rec.reaction, 'death'); assert.equal(rec.falls, 'dead')
    v.pause(); v.dispose()
    console.log(`# a melee kill (Zombie): motion start -> the death starts ${((seen.reaction.wall - seen.motion.wall) / 1000).toFixed(3)} s (blow ${mo.at} s)`) }
  /* a ranged kill: the Hunter's arrow that kills */
  const r = findAttack(orphanage.events, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'hit', falls: 'dead' }); assert.ok(r, 'the Hunter kills in the Orphanage')
  { assert.equal(orphanage.events[r.fall + 1].type, 'corpse.created', 'the corpse\u2019s line follows the death\u2019s')
    const { seen, rec, look, v, cast, Tbody } = await watch(orphanage, r, { until: r.fall + 2 }), mo = look.moments.ranged, arrow = seen.fx.find(f => f.dur === FLIGHTS.arrow.ms)
    near(arrow.clip, mo.at, 'the arrow leaves at the release')
    assert.equal(seen.reaction.as, 'death'); near((seen.reaction.wall - arrow.wall) / 1000, FLIGHTS.arrow.ms / 1000, 'the death starts when the arrow arrives')
    assert.equal(seen.reaction.life, 'standing'); assert.equal(rec.reaction, 'death')
    /* the death is played once: when the log's line says dead the body goes on falling, it does not start again */
    const F = seen.falling; assert.ok(F.length > 10, 'the fall was watched')
    for (let k = 1; k < F.length; k++) assert.ok(F[k].t >= F[k - 1].t - 1e-9, `the fall never starts again (frame ${k}: ${F[k - 1].t.toFixed(3)} -> ${F[k].t.toFixed(3)})`)
    const dead = F.find(f => f.life === 'dead'); assert.ok(dead, 'the line of the log said dead while the body was still seen')
    assert.ok(dead.t > .5, `by then the fall was well under way (${dead.t.toFixed(2)} s of it), not beginning`)
    /* and it lies where it fell until its corpse is on the board: the same body all the way, never gone for a beat between */
    assert.ok(F.some(f => f.cursor > r.fall + 1), 'it was still seen when the corpse was on the board'); assert.equal(cast.body(r.e.target), Tbody, 'the same body lies as the corpse'); assert.ok(Tbody.lying())
    v.pause(); v.dispose()
    console.log(`# a ranged kill (Hunter): arrow -> the death starts ${((seen.reaction.wall - arrow.wall) / 1000).toFixed(3)} s`) }
  /* a unit brought down (downed) falls at the blow the same way */
  /* Law 10, 2026-10-04 — fix.kit-attack-clauses (engine item; engine DECISIONS.md 2026-10-04 'the weapon audit: ...': the base-kit weapons' dropped clauses reach the engine, so the opening's battles are other fights and their six recordings were re-exported - viewer SWITCHES kitClausesOpeningSeeds): this read
       const d = findAttack(cathedral.events, { type: 'unit.zombie', kind: 'melee', result: 'hit', falls: 'downed' }); assert.ok(d, 'a Zombie downs a hero in the Cathedral')
       { const { seen, rec, look, v } = await watch(cathedral, d), …
     — the Cathedral's recording, where a Zombie's claw downed a hero. The heroes win the Cathedral in its recording now and no
     Zombie downs one. The scene is found by its KIND, as the priest's cast above is: the first of the painted recordings in
     which a melee blow that hits brings its target down. Every check below is unchanged. */
  const downScene = PAINTED.map(b => ({ battle: b, a: findAttack(b.events, { type: null, kind: 'melee', result: 'hit', falls: 'downed' }) })).find(s => s.a)
  assert.ok(downScene, 'a painted recording of the opening holds a melee blow that downs its target')
  const d = downScene.a
  { const { seen, rec, look, v } = await watch(downScene.battle, d), mo = look.moments.attack
    assert.equal(seen.reaction.as, 'death'); near(seen.reaction.clip, mo.at, 'the fall starts at the blow'); assert.equal(rec.falls, 'downed')
    v.pause(); v.dispose() }
})

test('a miss and a block happen at the blow too: the word at the moment, no hit reaction; a blocked shot flies first; a shield holder raises it', async () => {
  const miss = findAttack(orphanage.events, { type: 'unit.zombie', kind: 'melee', result: 'miss' }); assert.ok(miss)
  { const { seen, rec, look, v } = await watch(orphanage, miss), mo = look.moments.attack
    const line = seen.lines.find(l => l.at === miss.outcome); near(line.clip, mo.at, 'the miss is shown when the claw\'s clip stands at its blow')
    assert.equal(seen.reaction, null, 'a miss: the target\'s body does not react (its dodge is viewer.miss-dodge-motion\'s)')
    assert.equal(rec.result, 'miss'); assert.equal(rec.reaction, null); v.pause(); v.dispose() }
  const shot = findAttack(lumberjack.events, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'miss' }); assert.ok(shot)
  { const { seen, rec, look, v } = await watch(lumberjack, shot), mo = look.moments.ranged, arrow = seen.fx.find(f => f.dur === FLIGHTS.arrow.ms)
    assert.ok(arrow, 'a shot that misses still flies'); near(arrow.clip, mo.at, 'and leaves at the release')
    const line = seen.lines.find(l => l.at === shot.outcome); near((line.wall - arrow.wall) / 1000, FLIGHTS.arrow.ms / 1000, 'the miss is shown when the arrow has flown')
    assert.equal(seen.fx.filter(f => f.dur === FLIGHTS.arrow.ms).length, 1, 'one arrow, not a second at the line'); assert.equal(rec.result, 'miss'); v.pause(); v.dispose() }
  /* Law 10, combine 2026-10-04 (viewer master cf11722 with this copy's engine fix.opening-probe-cadence, as at the priest's cast
     above): this read
       const blocked = findAttack(bridge.events, { type: 'unit.fire-imp', kind: 'ranged', result: 'block' }); assert.ok(blocked, 'the Bridge has a blocked shot')
       { const { seen, rec, look, v, EV } = await watch(bridge, blocked), …
     — the Bridge's recording, where a Fire Imp's shot was blocked. The Bridge is another battle now (three heroes) and no
     shot is blocked in its recording, nor in any of the six opening recordings as they stand (and a blocked shot needs a
     painted board here: the bodies stand on it). The scene is the Bridge as the engine fights it now, exported by the
     engine's own tool on seed 1 — seeds read from 0 upward for the first whose battle holds a blocked shot (seed 0 holds
     none; on seed 1 an Imp's shot is blocked by the priest). Read for the KIND of line, as the Gates' replicate is in the
     engine's own test; nothing here asks who wins. Every check below is unchanged. */
  /* Law 10, 2026-10-04 — content.shields-reauthored (engine item; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks,
     the opening six, shields, custom weapons'): this read
       const bridgeNow = exportOf('test.opening-bridge', 1)
       const blockedScene = { battle: bridgeNow, a: findAttack(bridgeNow.events, { type: null, kind: 'ranged', result: 'block' }) }
       assert.ok(blockedScene.a, 'the Bridge, fought on seed 1, has a blocked shot')
     — the seed typed. The Bridge's third hero holds the Ledger's Round Shield now and the Bridge is another fight; seed 1 holds no
     blocked shot. The rule the note above states is what is kept, and the test now does the reading itself: seeds from 0 upward,
     the first whose battle holds a blocked shot (a bound of 12 seeds, so a Bridge with none anywhere fails here by name). */
  let blockedScene = null
  for (let seed = 0; seed < 12 && !blockedScene; seed++) {
    const battle = exportOf('test.opening-bridge', seed), a = findAttack(battle.events, { type: null, kind: 'ranged', result: 'block' })
    if (a) blockedScene = { battle, a, seed }
  }
  assert.ok(blockedScene, 'the Bridge, fought on seeds 0 to 11, has a blocked shot on one of them')
  const blocked = blockedScene.a
  { const { seen, rec, look, v, EV } = await watch(blockedScene.battle, blocked), m = seen.motion.motion, mo = look.moments[m], fx = seen.fx.find(f => f.dur === FLIGHTS.arrow.ms)
    assert.ok(fx, 'a blocked shot flies: it was not drawn at all before'); near(fx.clip, mo.at, 'it leaves at the release')
    const line = seen.lines.find(l => l.at === blocked.outcome); near((line.wall - fx.wall) / 1000, FLIGHTS.arrow.ms / 1000, 'BLOCK is shown when it arrives')
    assert.equal(rec.result, 'block')
    /* the blocker raises its shield at the blow where its body has the motion; one without it plays nothing (listed by --list) */
    const blockerLook = A.lookFor(A.modelBinding(typeOf(EV, blocked.e.target), pack), blocked.e.target)
    if (blockerLook.motions.guard) { assert.equal(seen.reaction?.as, 'guard', 'the shield is raised at the arrival'); assert.equal(rec.reaction, 'guard') }
    else { assert.equal(seen.reaction, null); assert.equal(rec.reaction, null) }
    v.pause(); v.dispose() }
  const mb = findAttack(cathedral.events, { type: 'unit.zombie', kind: 'melee', result: 'block' }); assert.ok(mb, 'the Cathedral has a blocked blow')
  { const { seen, rec, look, v, EV } = await watch(cathedral, mb), mo = look.moments.attack
    const line = seen.lines.find(l => l.at === mb.outcome); near(line.clip, mo.at, 'BLOCK is shown at the blow')
    const blockerLook = A.lookFor(A.modelBinding(typeOf(EV, mb.e.target), pack), mb.e.target)
    assert.ok(blockerLook.motions.guard, `${typeOf(EV, mb.e.target)} holds a shield and has the raise`)
    assert.equal(seen.reaction?.as, 'guard', 'the blocker raises its shield'); near(seen.reaction.clip, mo.at, 'at the blow'); assert.equal(rec.reaction, 'guard')
    v.pause(); v.dispose() }
})

test('only when things are drawn moves: the log plays in its order, a hand step and a seek land on the engine\'s state, at any speed the moments hold', async () => {
  /* the whole Orphanage played with the cast standing: the board at the end is the pure fold of the log */
  { const { w, v, V, EV, ctx } = boot(orphanage)
    const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style }); V.cast = cast
    V.fx.FX = { add: () => new Promise(() => {}), clear() {} }
    const begin = EV.findIndex(e => e.type === 'battle.begin') + 1
    v.seek(begin); cast.frame(0); await settle(); await settle(); cast.frame(0)
    const order = []; let c = v.cursor
    v.speed(4); v.play()
    for (let n = 0; n < 2000000 && v.cursor < EV.length; n++) { w._flush(FRAME); cast.frame(FRAME / 1000); while (c < v.cursor) order.push(c++) }
    assert.equal(v.cursor, EV.length, 'the battle played to its end')
    assert.deepEqual(order, order.map((_, k) => begin + k), 'every line once, in the log\'s order')
    assert.deepEqual(board(V.S), board(foldTo(EV, EV.length, ctx)), 'the board at the end is the engine\'s own state')
    const attacks = EV.filter(e => e.type === 'attack.declared').length
    assert.equal(V.impact.log.length, attacks, `every one of the ${attacks} attacks was timed`)
    for (const r of V.impact.log) { assert.ok(r.moment > 0 && r.motionAt != null && r.blowAt != null, 'each has its motion\'s start and its blow: ' + JSON.stringify(r))
      assert.ok(r.blowAt >= r.motionAt + r.moment * 750 - 20, 'the blow is never before the moment') }
    /* a seek into the middle of an attack, and a hand step through it: one line a step, the lunge at the declaration as before */
    const a = findAttack(EV, { type: 'unit.zombie', kind: 'melee', result: 'hit' })
    v.pause(); v.seek(a.i); assert.deepEqual(board(V.S), board(foldTo(EV, a.i, ctx)))
    cast.frame(0); await settle(); cast.frame(0)
    for (let k = a.i; k <= a.damage; k++) { v.step(); assert.equal(v.cursor, k + 1, 'a hand step shows one line') ; cast.frame(.02)
      if (k === a.i) assert.equal(cast.body(a.e.actor).motion, 'attack', 'stepped by hand, the strike plays at the declaration') }
    assert.deepEqual(board(V.S), board(foldTo(EV, a.damage + 1, ctx)), 'and lands on the engine\'s state')
    /* a seek while an attack is waiting for its moment drops the wait: nothing of it plays later */
    v.seek(a.i - 1); v.speed(1); v.play(); for (let n = 0; n < 400 && v.cursor <= a.i; n++) { w._flush(FRAME); cast.frame(FRAME / 1000) }
    assert.ok(v.cursor > a.i && v.cursor <= a.outcome, 'the attack is declared and not yet resolved')
    v.pause(); v.seek(begin); const n0 = V.impact.log.length
    for (let n = 0; n < 200; n++) { w._flush(FRAME); cast.frame(FRAME / 1000) }
    assert.equal(v.cursor, begin, 'paused where it was sought'); assert.equal(V.impact.log.length, n0); assert.deepEqual(board(V.S), board(foldTo(EV, begin, ctx)))
    v.dispose() }
  /* at twice and at half the speed the arrow still leaves at the release: the clip and the pump keep the one clock */
  const a = findAttack(orphanage.events, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'hit' })
  for (const speed of [2, .5]) {
    const { seen, look, v } = await watch(orphanage, a, { speed }), mo = look.moments.ranged, arrow = seen.fx.find(f => f.dur === FLIGHTS.arrow.ms)
    near(arrow.clip, mo.at, `at speed ${speed} the arrow leaves at the release`, TOL * Math.max(1, speed))
    near((seen.reaction.wall - arrow.wall) / 1000, FLIGHTS.arrow.ms / 1000, `at speed ${speed} the target reacts when the arrow arrives (the effect's own time)`, .05)
    v.pause(); v.dispose()
  }
})

test('with the enemies of a type moving together (the default), each attack in the Enemy Phase keeps its timing', async () => {
  const EV = orphanage.events, a = findAttack(EV, { type: 'unit.zombie', kind: 'melee', result: 'hit' })
  /* Law 10, combine 2026-10-04 (viewer master cf11722 with this copy's engine fix.opening-orphanage-closer-start): this read
       const { seen, rec, look, v } = await watch(orphanage, a, { opts: { enemiesTogether: true }, before: a.i - EV.findLastIndex(…) }), mo = look.moments.attack
     — watched until two lines after the attack's damage, which is where its blow had been drawn on the old start's
     recording: one Zombie in that Enemy Phase, its lines played in the log's order. On the closer start two Zombies act in
     the first Enemy Phase; moving together, the group's lines are taken at once and its attacks are drawn after its walks
     (viewer.enemy-type-moves-together), so the blow is drawn after the pump has passed those lines. The watch runs to the
     end of that Turn instead; what is asserted of the attack — the target reacts at the blow — is unchanged. */
  const { seen, rec, look, v } = await watch(orphanage, a, { opts: { enemiesTogether: true }, before: a.i - EV.findLastIndex((e, i) => i < a.i && e.type === 'phase.begin' && e.phase === 'enemy'), until: EV.findIndex((e, i) => i > a.i && e.type === 'turn.begin') }), mo = look.moments.attack
  assert.ok(seen.reaction, 'the hero was seen to react'); near(seen.reaction.clip, mo.at, 'at the blow'); assert.equal(rec.reaction, 'hit')
  v.pause(); v.dispose()
})

test('a board with no bodies (the flat board\'s tokens) keeps its own short lunge: the token strikes and the hit follows it', () => {
  const { w, v, V, EV } = boot(orphanage), a = findAttack(EV, { type: 'hero.base.ranger-scantily', kind: 'ranged', result: 'hit' })
  const fx = []; V.fx.FX = { add(dur) { fx.push({ dur, wall: w._now() }); return new Promise(() => {}) }, clear() {} }
  v.seek(a.i); v.play(); const t0 = w._now(); let shown = null
  for (let n = 0; n < 4000 && v.cursor <= a.damage; n++) { w._flush(FRAME); if (shown == null && v.cursor > a.outcome) shown = w._now() }
  const rec = V.impact.log.find(r => r.declared === a.i), arrow = fx.find(f => f.dur === FLIGHTS.arrow.ms)
  assert.equal(rec.motion, 'token'); assert.equal(rec.source, 'token'); assert.ok(arrow, 'the arrow flew')
  /* no 3.8 s of waiting for a bow nobody draws: the whole attack is within a beat or two of what it was */
  assert.ok(shown - t0 < 2400, `the token's shot is resolved in ${shown - t0} ms`)
  assert.ok(arrow.wall >= t0 && shown - arrow.wall >= FLIGHTS.arrow.ms - 2 * FRAME, 'the hit is shown when the arrow has flown')
  v.pause(); v.dispose()
})
