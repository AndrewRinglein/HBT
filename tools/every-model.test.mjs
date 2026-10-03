// viewer.every-model (engine backlog; engine DECISIONS.md 2026-09-30 'the battle is its own full screen; ...; every 3D
// character': "I want all the 3D characters and enemies and motions"; 'a bunch of motions, not every one': "I want to see
// a bunch of motions in there" — "a lacking motion is filled from the approved or selected motions where one fits, and is
// still listed where none does"; 'a true 3D battle': "Everything in Orphanage has a 3D model" — "No 2D assets on the 3D
// map"). Expect: "In battles 1-3 every hero, enemy and civilian on the board is a 3D model that idles, walks (or flies),
// attacks, flinches and dies; none stands as a 2D token." Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html),
// the page's own modules, and the model files themselves.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, RULED, CIVILIANS } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const BATTLES = [['#map.opening.orphanage', 'battles/test.opening-orphanage.json'], ['#map.opening.lumberjack', 'battles/test.opening-lumberjack.json'], ['#map.opening.bridge', 'battles/test.opening-bridge.json']]
  .map(([hash, file]) => ({ hash, b: JSON.parse(readFileSync(file, 'utf8')) }))
const typesIn = b => [...new Set(b.events.filter(e => e.type === 'unit.enter').map(e => e.typeId))].sort()
const ALL = [...new Set(BATTLES.flatMap(({ b }) => typesIn(b)))].sort()
const glbNodes = path => { const b = readFileSync('../' + path); return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')).nodes.map(n => n.name) }

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

test('battles 1-3: every hero, enemy and civilian is a model; each idles, walks or flies, attacks, flinches and dies', () => {
  assert.deepEqual(ALL, ['hero.base.priest-armored', 'hero.base.ranger-scantily', 'hero.base.rogue-rose', 'hero.base.warrior-fearsome', ...CIVILIANS.slice().sort(), 'unit.fire-imp', 'unit.imp', 'unit.skeletal-archer', 'unit.soldier', 'unit.zombie'].sort())
  for (const t of ALL) {
    const b = A.modelBinding(t, pack)
    assert.ok(b, `${t} is a model`)
    for (const look of b.looks) {
      for (const m of ['idle', 'move', 'attack', 'death']) assert.ok(look.motions[m], `${t} ${look.id}: ${m}`)
      for (const m of RULED) assert.equal(!look.motions[m], look.missing.includes(m), `${t} ${look.id}: ${m} bound or listed`)
      /* a lack is listed only where no selected performance fits: the selected ones move the CC_Base rig */
      if (look.missing.length) assert.ok(!glbNodes(look.model.path).includes('CC_Base_Hip'), `${t} ${look.id} lacks ${look.missing} on a rig the selected performances fit`)
    }
  }
  /* the motions the approved looks lacked, filled (Andrew 2026-09-30: "the selected free-library motions may be used on the Skeleton Archer, the Soldier and any look that lacks one") */
  const motion = (t, m) => pack[t].looks[0].motions[m]
  assert.deepEqual([motion('unit.skeletal-archer', 'ranged').borrowed, motion('unit.skeletal-archer', 'attack').clip, motion('unit.skeletal-archer', 'hit').clip], [true, 'Sword_Regular_Combo', 'Hit_Head'])
  assert.deepEqual([motion('unit.soldier', 'attack').clip, motion('unit.soldier', 'hit').clip], ['Sword_Regular_Combo', 'Hit_Head'])
  assert.deepEqual([motion('unit.imp', 'hit').clip, motion('unit.fire-imp', 'hit').clip], ['getHit', 'getHit'])
  /* Law 10 (viewer.civilian-held-dagger, 2026-10-03): was every civilian punches. Engine DECISIONS.md 2026-10-03 'the civilians
     hold their dagger as a weapon': "A civilian with a dagger stabs when it attacks." - the Orphan Child and the School Teacher,
     whose bodies have a dagger fit, stab (the Knife attack's motion source, tools/civilian-held-dagger.test.mjs); the rest punch */
  const STAB = { 'hero.fixed.orphans': 'Purchased walk-assassinate', 'hero.fixed.school-teacher': 'Purchased walk-assassinate' }
  for (const t of CIVILIANS) assert.equal(motion(t, 'attack').clip, STAB[t] ?? 'Melee_Hook', `${t} ${STAB[t] ? 'stabs' : 'punches'}`)
  /* the selections' own hashes are the borrowed files' */
  const sel = JSON.parse(readFileSync('../assets/characters/oathblade-armor/rebuild/free-motion-study/selections.json', 'utf8')).clips
  const sel2 = JSON.parse(readFileSync('../assets/characters/oathblade-armor/rebuild/free-motion-study/battle-actions/selections.json', 'utf8')).clips
  /* Law 10 (viewer.civilian-held-dagger, 2026-10-03): the punching civilian checked is the Lumberjack (was the Orphan Child, who now stabs) */
  assert.deepEqual([motion('unit.soldier', 'attack').sha256, motion('unit.soldier', 'hit').sha256, motion('hero.fixed.lumberjack-and-wife', 'attack').sha256], [sel.combo.sha256, sel2.headhit.sha256, sel.hook.sha256])
})

test('each civilian wears its own roster body, the bytes its paint record names, at its standee\'s stature', () => {
  const registry = JSON.parse(readFileSync('../assets/characters/hero-transformations/activation-registry.json', 'utf8'))
  const roster = JSON.parse(readFileSync('../assets/characters/hero-transformations/player-roster/roster.json', 'utf8')).characters
  const art = JSON.parse(readFileSync('generated/art/manifest.json', 'utf8')).artmap
  for (const t of CIVILIANS) {
    const look = pack[t].looks[0], c = roster.find(x => x.id === registry.typeIds[t])
    assert.equal(look.id, c.id); assert.ok(c.bodyModel.replace(/\\/g, '/').endsWith('/' + look.model.path), `${t}: ${look.model.path}`)
    const record = JSON.parse(readFileSync('../' + look.model.path.replace(/[^/]+$/, 'paint-record.json'), 'utf8'))
    assert.equal(createHash('sha256').update(readFileSync('../' + look.model.path)).digest('hex'), record.outputSHA256)
    assert.deepEqual(Object.values(look.motions).filter(m => !m.borrowed).map(m => m.clip).sort(), ['Death', 'Idle', 'Take Damage', 'Walk'])
    assert.ok(Math.abs(look.height / pack['hero.fixed.school-teacher'].looks[0].height - art[t].height / art['hero.fixed.school-teacher'].height) < 1e-9, `${t} stands as its standee does`)
  }
  assert.ok(pack['hero.fixed.orphans'].looks[0].height < .7 * pack['hero.fixed.school-teacher'].looks[0].height, 'the child is a child')
})

test('a borrowed performance keeps the body\'s own bone lengths: rotations kept, only the pivot travels, rebased', () => {
  const src = new THREE.Group(), body = new THREE.Group()
  for (const [g, hip] of [[src, [0, 0, .5]], [body, [0, 0, .25]]]) { const h = new THREE.Object3D(); h.name = 'Hip'; h.position.set(...hip); const k = new THREE.Object3D(); k.name = 'Knee'; k.position.set(0, .3, 0); h.add(k); g.add(h) }
  const clip = new THREE.AnimationClip('strike', 1, [
    new THREE.VectorKeyframeTrack('Hip.position', [0, 1], [0, 0, .5, .2, 0, .4]),
    new THREE.VectorKeyframeTrack('Knee.position', [0, 1], [0, .3, 0, 0, .6, 0]),
    new THREE.QuaternionKeyframeTrack('Knee.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, .7071, .7071]),
    new THREE.VectorKeyframeTrack('Knee.scale', [0, 1], [1, 1, 1, 2, 2, 2]),
  ])
  const out = A.borrowClip(clip, src, body, 'Hip')
  assert.deepEqual(out.tracks.map(t => t.name), ['Hip.position', 'Knee.quaternion'])
  assert.deepEqual([...out.tracks[0].values].map(v => +v.toFixed(6)), [0, 0, .25, .1, 0, .2], 'the hip\'s travel at the bodies\' ratio, from the body\'s own rest')
  assert.equal(out.tracks[1], clip.tracks[2])
})

/* lying, by the head bone's drop (wings and a skinned bow keep a body's bounds high: tools/opening-cast.test.mjs) */
const headOf = stage => { let h = null; stage.traverse(o => { if (!h && o.isBone && /(^|_)head$/i.test(o.name)) h = o }); return h }
/* the right arm, shoulder to hand, on the CC_Base rig the selected performances move */
const armOf = body => { let u, h; body.stage.traverse(o => { if (o.name === 'CC_Base_R_Upperarm') u = o; if (o.name === 'CC_Base_R_Hand') h = o }); if (!u || !h) return null; body.stage.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(u.matrixWorld).distanceTo(new THREE.Vector3().setFromMatrixPosition(h.matrixWorld)) }
const headY = body => { body.stage.updateMatrixWorld(true); const h = headOf(body.stage); assert.ok(h, 'a head bone'); return new THREE.Vector3().setFromMatrixPosition(h.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(body.stage.matrixWorld).invert()).y }
test('the files load: each civilian and each filled look stands its height, strikes and flinches without stretching, and dies lying', async () => {
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
  const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
  const looks = [...CIVILIANS, 'unit.skeletal-archer', 'unit.soldier', 'unit.imp'].map(t => pack[t].looks[0])
  for (const look of looks) {
    const loaded = await A.loadLook(look, { location, fetch, textures: false })
    assert.deepEqual(Object.keys(loaded.clips).sort(), Object.keys(look.motions).sort(), look.id)
    const body = A.createBody(loaded), tall = body.standingHeight()
    assert.ok(Math.abs(tall - look.height) < 1e-6, `${look.id} stands ${look.height} m`)
    body.play('idle', { snap: true }); body.frame(0); const up = headY(body), reach = armOf(body)
    for (const m of ['attack', 'hit', 'ranged']) {
      if (!look.motions[m]) continue
      body.play(m, { snap: true }); const n = loaded.clips[m].duration
      let most = 0, moved = 0, longest = 0
      body.play(m); body.frame(0); const at0 = headY(body)
      for (let t = 0; t < n; t += n / 12) {
        body.frame(n / 12); most = Math.max(most, body.height()); moved = Math.max(moved, Math.abs(headY(body) - at0))
        if (reach) longest = Math.max(longest, armOf(body))
      }
      assert.ok(most < 1.2 * tall, `${look.id}'s ${m} keeps its stature (${most.toFixed(2)} m of ${tall.toFixed(2)})`)
      assert.ok(moved > .01, `${look.id}'s ${m} moves the body (${moved.toFixed(3)} m)`)
      /* the donor's bone lengths would stretch it: the Orphan Child's arm reached 0.347 m of its 0.253 under the Hook punch
         with the donor's translations (measured 2026-10-01), 0.263 borrowed */
      if (reach && look.motions[m].borrowed) assert.ok(longest < 1.1 * reach, `${look.id}'s ${m} keeps its arm's length (${longest.toFixed(3)} of ${reach.toFixed(3)})`)
    }
    body.play('death', { snap: true }); body.frame(0)
    assert.ok(body.lying(), `${look.id} holds the Death's last frame`)
    assert.ok(headY(body) < .4 * up, `${look.id}'s death ends lying`)
    body.dispose()
  }
})

/* a stand-in body: a box on the look's pivot */
function standIn(look) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
  const clips = {}; for (const k of Object.keys(look.motions)) clips[k] = new THREE.AnimationClip(k, 1, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])
  return { look, scene, clips, props: [] }
}
const settle = () => new Promise(r => setImmediate(r))
test('on the board: every unit of battles 1-3 stands as its model, its standee hidden — no 2D token', async () => {
  for (const { hash, b } of BATTLES) {
    const w = boot(hash), H = w.__battleView.harness, V = H.viewer._V, scene = new THREE.Scene()
    const cast = A.createCast(V, scene, A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look), readStyle: el => el.style })
    V.cast = cast
    const seen = new Set()
    for (let i = 0; i <= b.events.length; i += Math.max(1, Math.floor(b.events.length / 8))) {
      H.viewer.seek(Math.min(i, b.events.length)); cast.frame(0); await settle(); await settle(); cast.frame(0); V.render()
      for (const u of Object.values(V.S.U)) {
        if (u.life === 'dead' || !V.layers.UEL.get(u.id)) continue
        assert.ok(cast.shows(u.id), `${hash}: ${u.typeId} ${u.id} is its model`)
        assert.equal(V.layers.UEL.get(u.id).img.style.opacity, '0', `${hash}: ${u.typeId}'s standee is hidden`)
        seen.add(u.typeId)
      }
    }
    for (const t of typesIn(b)) assert.ok(seen.has(t), `${hash}: ${t} was seen on the board`)
    H.dispose()
  }
})
