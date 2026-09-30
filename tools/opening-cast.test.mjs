// viewer.opening-cast (engine backlog; PLAYABLE-OPENING-PLAN.md item 10; engine DECISIONS.md 2026-09-29 "the playable
// opening": "units are 3D models where one exists, else their token"; "outfits may be reused across heroes"). Expect:
// "Battles 2 and 3 play in the new screen with every unit shown as a model or its token, archers shooting and imps
// flying." Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html), the page's own modules, the fold, and the
// approved model files themselves.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, CLASS_LOOKS, RULED } from './character-models.mjs'
import { fold, foldTo } from '../src/fold.js'
const A = await modules(), pack = await packCharacterModels()
const battle2 = JSON.parse(readFileSync('battles/test.opening-lumberjack.json', 'utf8'))
const battle3 = JSON.parse(readFileSync('battles/test.opening-bridge.json', 'utf8'))
const units = JSON.parse(readFileSync('generated/static.json', 'utf8')).units
const artmap = JSON.parse(readFileSync('generated/art/manifest.json', 'utf8')).artmap

function boot(hash) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { value: { hash, protocol: 'file:', href: 'file:///BATTLE-VIEWER.html' + hash }, configurable: true })
  try { new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n])) }
  finally { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location }
  return w
}
const typesIn = b => [...new Set(b.events.filter(e => e.type === 'unit.enter').map(e => e.typeId))].sort()
/* a stand-in body: a 1.7 m box on its pivot; its death lays the pivot flat */
function standIn(look) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), clips = {}
  for (const k of Object.keys(look.motions)) clips[k] = k === 'death'
    ? new THREE.AnimationClip('death', 1, [new THREE.QuaternionKeyframeTrack(look.pivot + '.quaternion', [0, 1], [0, 0, 0, 1, ...flat.toArray()])])
    : new THREE.AnimationClip(k, k === 'idle' || k === 'move' || k === 'flight' ? 2 : .8, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])
  return { look, scene, clips, props: [] }
}
function castFor(w) {
  const V = w.__battleView.harness.viewer._V, scene = new THREE.Scene()
  const cast = A.createCast(V, scene, A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style })
  V.cast = cast
  return { V, cast }
}
const settle = () => new Promise(r => setImmediate(r))
const typeOf = (b, id) => b.events.find(e => e.type === 'unit.enter' && e.actor === id)?.typeId
const at = (b, type, pred = () => true) => b.events.findIndex(e => e.type === type && pred(e))
async function standAt(w, i) { const { V, cast } = castFor(w); w.__battleView.harness.viewer.seek(i); cast.frame(0); await settle(); await settle(); cast.frame(0); return { V, cast } }

test('battles 2 and 3: every enemy and every drafted hero is a model; the civilians keep their tokens', () => {
  assert.deepEqual(typesIn(battle2), ['hero.base.priest-armored', 'hero.base.ranger-scantily', 'hero.base.rogue-rose', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife', 'unit.skeletal-archer', 'unit.soldier', 'unit.zombie'])
  assert.deepEqual(typesIn(battle3), ['hero.base.priest-armored', 'hero.base.ranger-scantily', 'hero.base.rogue-rose', 'hero.base.warrior-fearsome', 'unit.fire-imp', 'unit.imp'])
  for (const t of [...typesIn(battle2), ...typesIn(battle3)]) {
    /* "a model or its token": every unit has its token under it (the Soldier its own art, the Lumberjack's Wife the ART PENDING standee) */
    assert.ok(artmap[t]?.token, `${t} has its token`)
    const b = A.modelBinding(t, pack)
    if (t.startsWith('hero.fixed.')) { assert.equal(b, null, `${t} is its token`); continue }
    assert.ok(b, `${t} is a model`)
    for (const look of b.looks) {
      for (const m of ['idle', 'move', 'death']) assert.ok(look.motions[m], `${t} ${look.id} ${m}`)
      for (const m of RULED) assert.equal(!look.motions[m], look.missing.includes(m), `${t} ${look.id}: ${m} is bound or listed missing`)
    }
  }
  /* what the approved looks lack is listed, never borrowed from another body */
  assert.deepEqual(pack['unit.skeletal-archer'].looks[0].missing, ['attack', 'hit', 'ranged'])
  assert.deepEqual(pack['unit.soldier'].looks[0].missing, ['attack', 'hit'])
  assert.deepEqual(pack['unit.imp'].looks[0].missing, ['hit'])
  assert.ok(pack['unit.imp'].looks[0].motions.flight, 'the Imp flies')
  /* the page opens each battle on its own address and carries the pack */
  for (const [hash, b] of [['#map.opening.lumberjack', battle2], ['#map.opening.bridge', battle3]]) {
    const w = boot(hash), V = w.__battleView.harness.viewer._V
    assert.equal(V.EV.length, b.events.length, hash); assert.deepEqual(V.data.models, pack)
    w.__battleView.harness.dispose()
  }
})

test('every drafted hero wears its class outfit, with every ruled motion', () => {
  const heroes = Object.keys(units).filter(t => t.startsWith('hero.base.'))
  assert.ok(heroes.length >= 24)
  for (const t of heroes) {
    const cls = units[t].tags.find(x => x.startsWith('class.')), look = pack[t]?.looks[0]
    assert.ok(look, t); assert.equal(look.id, CLASS_LOOKS[cls][0], `${t} (${cls})`)
    for (const m of RULED) assert.ok(look.motions[m], `${t} ${m}`)
  }
})

test('the Skeleton Archer shoots: it turns to its target and leans, and the board flies the arrow', async () => {
  const i = at(battle2, 'attack.declared', e => typeOf(battle2, e.actor) === 'unit.skeletal-archer' && e.kind === 'ranged')
  assert.ok(i >= 0, 'battle 2 has a Skeleton Archer shot')
  const w = boot('#map.opening.lumberjack'), { V, cast } = await standAt(w, i), e = battle2.events[i]
  const archer = cast.body(e.actor); assert.ok(archer, 'the Skeleton Archer is its model'); assert.equal(archer.motion, 'idle')
  w.__battleView.harness.viewer.step()
  cast.frame(.1)
  assert.ok(archer.lunge() > 0, 'no approved shot motion: the body leans toward its target')
  cast.frame(1)
  const p = new THREE.Vector3(), T = cast.body(e.target)
  if (T) { p.copy(T.stage.position); const want = Math.atan2(p.x - archer.stage.position.x, p.z - archer.stage.position.z)
    assert.ok(Math.abs(Math.atan2(Math.sin(archer.yaw - want), Math.cos(archer.yaw - want))) < .05, 'it turns to face its target') }
  /* the shot: the fold's impact cue is a ranged physical attack — the board's arrow (board.js fxAttack -> playArrow) */
  const S = foldTo(battle2.events, i + 1, V.data)
  const k = battle2.events.findIndex((x, j) => j > i && (x.type === 'attack.hit' || x.type === 'attack.miss') && x.actor === e.actor)
  for (let j = i + 1; j < k; j++) fold(S, battle2.events[j], V.data)
  const shot = fold(S, battle2.events[k], V.data).find(c => c.k === 'fx.attack')
  assert.deepEqual([shot.kind, shot.dt, shot.a, shot.t], ['ranged', 'physical', e.actor, e.target])
  w.__battleView.harness.dispose()
})

test('the Soldier, with no approved strike, strikes with a lean', async () => {
  const i = at(battle2, 'attack.declared', e => typeOf(battle2, e.actor) === 'unit.soldier')
  const w = boot('#map.opening.lumberjack'), { cast } = await standAt(w, i), e = battle2.events[i]
  w.__battleView.harness.viewer.step(); cast.frame(.1)
  assert.ok(cast.body(e.actor).lunge() > 0)
  w.__battleView.harness.dispose()
})

test('the Imps fly: a flight flies the body and lands it; the Fire Imp, given no flight by the engine, walks', async () => {
  const i = at(battle3, 'move.begin', e => e.causeId === 'power.flight' && typeOf(battle3, e.actor) === 'unit.imp')
  assert.ok(i >= 0, 'battle 3 has an Imp flight')
  const w = boot('#map.opening.bridge'), { V, cast } = await standAt(w, i), e = battle3.events[i]
  const imp = cast.body(e.actor); assert.ok(imp)
  w.__battleView.harness.viewer.step()
  const E = V.layers.UEL.get(e.actor)
  assert.equal(E.walkShape, 'flight', 'the traversal carries the engine power\'s shape')
  E.walk = { playState: 'running' }; cast.frame(.1)
  assert.equal(imp.motion, 'flight', 'in the air while it travels')
  E.walk = null; cast.frame(.1)
  assert.equal(imp.motion, 'idle', 'landed')
  w.__battleView.harness.dispose()
  const j = at(battle3, 'move.begin', x => typeOf(battle3, x.actor) === 'unit.fire-imp')
  if (j >= 0) {
    const w2 = boot('#map.opening.bridge'), s = await standAt(w2, j), x = battle3.events[j]
    w2.__battleView.harness.viewer.step()
    const E2 = s.V.layers.UEL.get(x.actor); assert.equal(E2.walkShape, 'path')
    E2.walk = { playState: 'running' }; s.cast.frame(.1); assert.equal(s.cast.body(x.actor).motion, 'move'); E2.walk = null
    w2.__battleView.harness.dispose()
  }
})

/* lying, by the head: a winged Imp's wings and the Skeleton Archer's bow (skinned to its hip, 1.01 m tall at the Death's
   end) keep the body's bounds high, so the rule is the head bone's drop — under 40% of its standing height */
const headOf = stage => { let h = null; stage.traverse(o => { if (!h && o.isBone && /(^|_)head$/i.test(o.name)) h = o }); return h }
const headY = body => { body.stage.updateMatrixWorld(true); const h = headOf(body.stage); assert.ok(h, 'a head bone'); return new THREE.Vector3().setFromMatrixPosition(h.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(body.stage.matrixWorld).invert()).y }
test('the approved files load: each new look stands its height, binds every motion, and its death ends lying', async () => {
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
  const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
  const seen = new Set(['plague-zombie', 'woman-blonde', 'archer'])     // battle 1's, loaded by character-models.test.mjs
  for (const t of [...typesIn(battle2), ...typesIn(battle3)]) for (const look of pack[t]?.looks || []) {
    if (seen.has(look.id)) continue; seen.add(look.id)
    const loaded = await A.loadLook(look, { location, fetch, textures: false })
    assert.deepEqual(Object.keys(loaded.clips).sort(), Object.keys(look.motions).sort(), look.id)
    const body = A.createBody(loaded)
    assert.ok(Math.abs(body.standingHeight() - look.height) < 1e-6, `${look.id} stands ${look.height} m`)
    if (look.motions.flight) { body.play('flight', { snap: true }); body.frame(.5); assert.equal(body.motion, 'flight') }
    body.play('idle', { snap: true }); body.frame(0); const up = headY(body)
    body.play('death', { snap: true }); body.frame(0)
    assert.ok(body.lying(), `${look.id} holds the Death's last frame`)
    const down = headY(body)
    assert.ok(down < .4 * up, `${look.id}'s death ends lying (head ${down.toFixed(2)} m, standing ${up.toFixed(2)} m)`)
    body.dispose()
  }
  assert.deepEqual([...seen].slice(3).sort(), ['fire-imp', 'imp', 'oathblade', 'skeletal-archer', 'strong-skeleton'])
})
