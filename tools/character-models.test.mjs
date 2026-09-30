// viewer.character-models (engine backlog; PLAYABLE-OPENING-PLAN.md item 5; engine DECISIONS.md 2026-09-29
// "the playable opening" and "the playable battle screen"): units are 3D models where one exists, else their
// token; they idle, walk, strike, flinch and fall; a dead unit is its model lying where it fell, a downed one the
// same with its bleed-out counter. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html), the page's own
// modules, and the approved model files themselves.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, RULED } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))

function boot(hash) {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  if (hash) Object.defineProperty(globalThis, 'location', { value: { hash, protocol: 'file:', href: 'file:///BATTLE-VIEWER.html' + hash }, configurable: true })
  try { new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n])) }
  finally { if (hash) { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location } }
  return w
}
const typesIn = b => [...new Set(b.events.filter(e => e.type === 'unit.enter').map(e => e.typeId))].sort()

test('battle 1 binds its Zombies and its hero to approved models; the civilians keep their tokens', () => {
  assert.deepEqual(typesIn(battle1), ['hero.base.ranger-scantily', 'hero.fixed.orphans', 'hero.fixed.school-teacher', 'unit.zombie'])
  /* Law 10 (viewer.opening-cast, 2026-09-30): was the pack's whole key list, ['hero.base.ranger-scantily', 'unit.zombie'];
     the pack now also binds battles 2 and 3's cast and every drafted hero by class (tools/opening-cast.test.mjs). The rule
     kept: battle 1's enemy and hero are bound, its civilians are not */
  for (const t of typesIn(battle1)) assert.equal(!!pack[t], !t.startsWith('hero.fixed.'), t)
  const zombie = pack['unit.zombie'], elf = pack['hero.base.ranger-scantily']
  for (const look of zombie.looks) {
    assert.deepEqual(Object.keys(look.motions).sort(), ['attack', 'death', 'idle', 'move'], 'the four approved zombie actions')
    assert.deepEqual(look.missing, ['hit'], 'no approved zombie hit reaction exists: listed, never borrowed')
  }
  assert.deepEqual(Object.keys(elf.looks[0].motions).sort(), ['attack', 'death', 'hit', 'idle', 'move', 'ranged'], 'the bow hero shoots as well')
  assert.deepEqual(elf.looks[0].missing, [])
  /* the approval record's hashes are the files on disk */
  const approval = JSON.parse(readFileSync('../assets/characters/monster-motion-audition/slow-zombie/accepted-zombies.json', 'utf8'))
  for (const look of zombie.looks) for (const m of Object.values(look.motions)) {
    assert.equal(m.sha256, approval.files[m.path.replace('assets/characters/monster-motion-audition/slow-zombie/', '')])
    assert.equal(createHash('sha256').update(readFileSync('../' + m.path)).digest('hex'), m.sha256, m.path)
  }
  /* the page carries the pack, and the binding is by type */
  const w = boot('#map.opening.orphanage'), V = w.__battleView.harness.viewer._V
  assert.deepEqual(V.data.models, pack)
  assert.equal(A.modelBinding('hero.fixed.orphans', pack), null); assert.equal(A.modelBinding('unit.zombie', pack).typeId, 'unit.zombie')
  w.__battleView.harness.dispose()
})

/* a stand-in body: a 1.7 m box on a hip bone; its death lays the hip flat */
function standIn(look) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; box.name = 'Body'; hip.add(box)
  const still = (name, secs = 1) => new THREE.AnimationClip(name, secs, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, secs], [0, 0, 0, 0, 0, 0])])
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const clips = {}
  for (const k of Object.keys(look.motions)) clips[k] = k === 'death'
    ? new THREE.AnimationClip('death', 1, [new THREE.QuaternionKeyframeTrack(look.pivot + '.quaternion', [0, 1], [0, 0, 0, 1, ...flat.toArray()])])
    : still(k, k === 'idle' || k === 'move' ? 2 : .8)
  return { look, scene, clips, props: [] }
}
function castFor(w) {
  const V = w.__battleView.harness.viewer._V, scene = new THREE.Scene()
  const toWorld = A.paintedToCSS(V.data.atlas).invert(), loads = []
  const cast = A.createCast(V, scene, toWorld, { load: async look => { loads.push(look.id); return standIn(look) }, readStyle: el => el.style })
  V.cast = cast
  return { V, scene, cast, toWorld, loads }
}
const settle = () => new Promise(r => setImmediate(r))
const at = (V, type, pred = () => true) => V.EV.findIndex(e => e.type === type && pred(e))

test('the cast: a bound unit is its model standing on its token; an unbound unit keeps its token', async () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, v = H.viewer, { V, scene, cast, toWorld, loads } = castFor(w)
  v.seek(at(V, 'unit.enter', e => e.name === 'Zombie 1') + 1); cast.frame(0); await settle(); await settle(); cast.frame(0)
  const elf = Object.values(V.S.U).find(u => u.typeId === 'hero.base.ranger-scantily'), zombie = Object.values(V.S.U).find(u => u.typeId === 'unit.zombie')
  const orphan = Object.values(V.S.U).find(u => u.typeId === 'hero.fixed.orphans')
  assert.ok(cast.shows(elf.id) && cast.shows(zombie.id), 'the hero and the Zombie are models'); assert.equal(cast.shows(orphan.id), false, 'the Orphan Child is its token')
  const worn = A.lookFor(pack['unit.zombie'], zombie.id)
  assert.equal(worn.id, pack['unit.zombie'].looks[zombie.id % 2].id, 'the Zombies wear the approved looks in turn')
  assert.deepEqual([...new Set(loads)].sort(), ['archer', worn.id].sort(), 'only the looks on the board load, each once')
  assert.equal(loads.length, 2)
  V.render()
  assert.equal(V.layers.UEL.get(zombie.id).img.style.opacity, '0', 'a modelled unit hides its standee, keeps its ring and bars')
  assert.notEqual(V.layers.UEL.get(zombie.id).fring.style.display, 'none')
  assert.equal(V.layers.UEL.get(orphan.id).img.style.opacity, '1')
  /* the model stands where the token's feet are, on the scene */
  const E = V.layers.UEL.get(zombie.id), body = cast.body(zombie.id)
  const feet = new THREE.Vector3(parseFloat(E.root.style.left), parseFloat(E.root.style.top), (E.root.style.transform.match(/translateZ\(([-\d.]+)px\)/) || [0, 0])[1] * 1).applyMatrix4(toWorld)
  assert.ok(body.stage.position.distanceTo(feet) < 1e-6, 'the model stands at its token')
  assert.ok(scene.getObjectById(body.stage.id), 'the model is in the painted scene')
  assert.equal(body.motion, 'idle')
  /* the stature is the roster's */
  assert.ok(Math.abs(body.standingHeight() - worn.height) < 1e-6)
  H.dispose()
})

test('the cast walks with the token, strikes toward its target, flinches when struck', async () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, v = H.viewer, { V, cast } = castFor(w)
  const declared = at(V, 'attack.declared', e => V.EV.find(x => x.type === 'unit.enter' && x.actor === e.actor)?.typeId === 'unit.zombie')
  v.seek(declared); cast.frame(0); await settle(); await settle(); cast.frame(0)
  const e = V.EV[declared], zombie = cast.body(e.actor)
  /* a walk: the token's traversal is running */
  const E = V.layers.UEL.get(e.actor); E.walk = { playState: 'running' }; cast.frame(.1); assert.equal(zombie.motion, 'move', 'a walking token walks its model'); E.walk = null; cast.frame(.1); assert.equal(zombie.motion, 'idle')
  v.step()                                                          // attack.declared: the lunge cue
  assert.equal(zombie.motion, 'attack', 'the attacker strikes')
  cast.frame(1)
  const T = cast.body(e.target), dx = T ? T.stage.position.x - zombie.stage.position.x : 0, dz = T ? T.stage.position.z - zombie.stage.position.z : 0
  if (T) assert.ok(Math.abs(Math.atan2(Math.sin(zombie.yaw - Math.atan2(dx, dz)), Math.cos(zombie.yaw - Math.atan2(dx, dz)))) < .05, 'it turns to face its target')
  /* a hit on the Zombie: no approved hit reaction, so the body recoils */
  const struck = at(V, 'damage.applied', x => V.S.U[x.target]?.typeId === 'unit.zombie')
  v.seek(struck); cast.frame(0); v.step(); cast.frame(.05)
  const Z = cast.body(V.EV[struck].target)
  assert.ok(Z.recoil() > 0, 'a Zombie struck recoils (it has no hit clip)')
  /* a hit on the hero plays its hit reaction */
  const heroHit = at(V, 'damage.applied', x => V.S.U[x.target]?.typeId === 'hero.base.ranger-scantily')
  if (heroHit >= 0) { v.seek(heroHit); cast.frame(0); v.step(); assert.equal(cast.body(V.EV[heroHit].target).motion, 'hit') }
  else { const hero = Object.values(V.S.U).find(u => u.typeId === 'hero.base.ranger-scantily'); cast.flinch(hero.id); assert.equal(cast.body(hero.id).motion, 'hit') }
  H.dispose()
})

test('a dead unit is its model lying where it fell; a downed hero lies with its bleed-out counter', async () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, v = H.viewer
  let { V, cast } = castFor(w)
  const died = at(V, 'corpse.created', e => e.typeId === 'unit.zombie')
  v.seek(died + 1); cast.frame(0); await settle(); await settle(); cast.frame(0)
  const c = V.EV[died], body = cast.body(c.of)
  assert.ok(body && cast.shows(c.of), 'the dead Zombie is still its model')
  assert.equal(body.motion, 'death'); assert.ok(body.lying(), 'a seek lands on the death motion\'s end')
  assert.ok(body.height() < .45 * body.standingHeight(), 'lying down')
  const node = V.layers.CORPSE.get(c.corpse).node
  const where = new THREE.Vector3(parseFloat(node.style.left), parseFloat(node.style.top), 0).applyMatrix4(A.paintedToCSS(V.data.atlas).invert())
  assert.ok(Math.abs(body.stage.position.x - where.x) < 1e-6 && Math.abs(body.stage.position.z - where.z) < 1e-6, 'where it fell — the corpse\'s hex')
  V.render(); assert.equal(V.layers.CORPSE.get(c.corpse).img.style.opacity, '0', 'the flat corpse art gives way to the body')
  /* played, not sought: the death runs from its start */
  v.seek(at(V, 'life.dead', e => e.target === c.of)); cast.frame(0); v.step(); cast.frame(.1)
  assert.equal(cast.body(c.of).motion, 'death'); assert.equal(cast.body(c.of).lying(), false, 'it falls, then lies')
  cast.frame(5); assert.ok(cast.body(c.of).lying())
  /* corpse removed: the body goes */
  H.dispose()

  /* the downed: the engine's life.downed and bleedout.set, folded as stated */
  const events = structuredClone(battle1.events), i = events.findIndex(e => e.type === 'turn.begin' && e.turn === 2)
  const elf = events.find(e => e.type === 'unit.enter' && e.typeId === 'hero.base.ranger-scantily')
  const base = { turn: 2, phase: 'hero', causeId: 'attack.zombie.claw', actor: null }
  events.splice(i, 0, { ...base, seq: 9001, type: 'life.downed', target: elf.actor, from: 'standing', to: 'downed' }, { ...base, seq: 9002, type: 'bleedout.set', target: elf.actor, bleedOut: 3 })
  const w2 = boot('#map.opening.orphanage'); w2.__battleView.harness.playExport({ ...battle1, events }, 'downed'); const H2 = w2.__battleView.harness
  ;({ V, cast } = castFor(w2))
  H2.viewer.seek(i + 2); cast.frame(0); await settle(); await settle(); cast.frame(0); V.render()
  const down = cast.body(elf.actor), E = V.layers.UEL.get(elf.actor)
  assert.equal(V.S.U[elf.actor].life, 'downed'); assert.equal(down.motion, 'death'); assert.ok(down.lying(), 'the downed hero lies as the dead do')
  assert.equal(E.clock.style.display, 'block'); assert.equal(E.clock.textContent, '3', 'with the engine\'s bleed-out counter')
  assert.equal(E.img.style.opacity, '0')
  H2.dispose()
})

test('the approved files load: every look stands its height, carries every bound motion, and its death ends lying', async () => {
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
  const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
  /* Law 10 (viewer.opening-cast, 2026-09-30): was every look of every binding; the pack now binds 24 heroes to two
     shared looks and battles 2 and 3's cast, whose files tools/opening-cast.test.mjs loads. This loads battle 1's looks,
     each once */
  const battle1Looks = new Map()
  for (const t of typesIn(battle1)) for (const look of pack[t]?.looks || []) battle1Looks.set(look.id, look)
  assert.deepEqual([...battle1Looks.keys()].sort(), ['archer', 'plague-zombie', 'woman-blonde'])
  for (const look of battle1Looks.values()) {
    const loaded = await A.loadLook(look, { location, fetch, textures: false })
    assert.deepEqual(Object.keys(loaded.clips).sort(), Object.keys(look.motions).sort(), look.id)
    const body = A.createBody(loaded)
    assert.ok(Math.abs(body.standingHeight() - look.height) < 1e-6, `${look.id} stands ${look.height} m`)
    body.play('death', { snap: true }); body.frame(0)
    assert.ok(body.height() < .45 * look.height, `${look.id}'s death ends lying (${body.height().toFixed(2)} m of ${look.height})`)
    for (const m of RULED) if (!look.motions[m]) assert.ok(look.missing.includes(m))
    body.dispose()
  }
  /* a file that is not the approved one is refused before it is parsed */
  const look = pack['unit.zombie'].looks[0]; let parsed = 0
  await assert.rejects(A.loadLook({ ...look, model: { ...look.model, sha256: '0'.repeat(64) } }, { location, fetch, parse: async () => { parsed++ } }), /approved/)
  assert.equal(parsed, 0)
})

test('the painted driver stands the cast in its scene, redraws while a body moves, and takes it down with the scene', async () => {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'); wrap.appendChild(stage)
  const stats = { draws: 0 }; class Renderer { constructor() { this.shadowMap = {} } setPixelRatio() {} setSize() {} render(scene) { stats.draws++; stats.scene = scene } dispose() {} forceContextLoss() {} }
  const M = new THREE.Matrix4().makeRotationX(49.3 * Math.PI / 180), group = new THREE.Group()
  const made = [], createCast = (V, scene, toWorld) => { const c = { size: 1, dts: [], frame(dt) { c.dts.push(dt) }, dispose() { c.disposed = true } }; made.push({ c, scene, toWorld }); return c }
  let t = 1000
  const V = { dom: { stage }, data: { F: field, atlas: b, models: pack } }
  const driver = A.createDriver(V, e => { throw e }, { Renderer, loadPainted: async () => ({ group, dispose() {} }), readStyle: () => ({ transform: 'm', transformOrigin: `${field.w / 2} ${field.h / 2} 0` }), matrix: () => ({ toFloat64Array: () => M.elements }), createCast, now: () => t })
  await driver.ready
  assert.equal(made.length, 1, 'one cast, once the scene is in'); assert.equal(V.cast, made[0].c); assert.equal(made[0].scene, stats.scene)
  const back = new THREE.Vector3(3, 1, -2).applyMatrix4(A.paintedToCSS(b)).applyMatrix4(made[0].toWorld)
  assert.ok(back.distanceTo(new THREE.Vector3(3, 1, -2)) < 1e-9, 'board px -> scene by the inverse of the scene\'s own map')
  const draws = stats.draws; t += 16; frames.at(-1)()
  assert.ok(Math.abs(made[0].c.dts.at(-1) - .016) < 1e-9, 'the cast is advanced by the frame\'s time'); assert.equal(stats.draws, draws + 1, 'a body on the board redraws every frame')
  driver.dispose(); assert.equal(made[0].c.disposed, true); assert.equal(V.cast, null)
})
