// viewer.bodies-life-size (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post answered:
// ... a body on the ground is the size of a living unit lying down'). Andrew: "The bodies on the terrain are smaller than they
// should be. They should be larger." - "The body should be the size of living units lying down, yes."
// The bodies that lie on a map are models in its painted scene, made at a person's real size (1.4 to 1.9 m long). The board
// stands every UNIT's body larger than that - the size look, stand-out.js: 1.3 on a board shown at 0.9, 1.44 against its hex -
// and the scene's bodies were left out of it: 69% of a unit lying beside them. Asked here:
//   the pack     - which things in each scene are bodies is the scene's own record (assets/terrain-3d/<scene>/assembly.json
//                  `bodies`), related once to the scene file's nodes by place (tools/painted-scenes.mjs); a body that is one
//                  model with furniture is left and listed;
//   the page     - loading the scene scales each of those by the scale the board gives a unit's body (the look's one number,
//                  handed on by the driver), about its own place on the ground; nothing else in the scene is touched;
//   the measure  - each scene's bodies, as drawn, against a living human unit lying down (the Lumberjack's Wife's own approved
//                  body at the end of her death motion, as drawn): within 10%.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, openSync, readSync, closeSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packPaintedScenes, BODY_WITH_FURNITURE } from './painted-scenes.mjs'
import { packCharacterModels } from './character-models.mjs'
import { STAND_OUT, standOut } from '../src/stand-out.js'
const A = await modules(), pack = packPaintedScenes(), models = await packCharacterModels()
const K = STAND_OUT.BODY / STAND_OUT.BOARD
const read = p => JSON.parse(readFileSync('../' + p, 'utf8'))
/** a scene file's own JSON (its nodes, meshes and bounds), read off its head - the file is never loaded whole */
const glb = scene => { const fd = openSync('../assets/terrain-3d/' + scene + '/scene.glb', 'r'), h = Buffer.alloc(20); readSync(fd, h, 0, 20, 0); const n = h.readUInt32LE(12), j = Buffer.alloc(n); readSync(fd, j, 0, n, 20); closeSync(fd); return JSON.parse(j.toString('utf8')) }
const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-3 && Math.abs(a[2] - b[2]) < 1e-3
const SCENES = { 'map.opening.lumberjack': 'lumberjack-forest', 'map.opening.cavern-trail': 'abbotown-encounters/cave', 'map.opening.cathedral': 'abbotown-encounters/cathedral', 'map.caravan-aftermath': 'caravan-aftermath' }

test('the pack: each scene\'s bodies are its own record\'s, related to the scene file\'s nodes by place; a body that is one model with furniture is left and listed', () => {
  const listed = []
  for (const [mapId, scene] of Object.entries(SCENES)) {
    const row = pack[mapId]; assert.ok(row, mapId + ' is a painted map'); assert.equal(row.scene, scene)
    const record = read('assets/terrain-3d/' + scene + '/assembly.json').bodies, g = glb(scene)
    assert.ok(Array.isArray(row.bodies) && row.bodies.length > 0, `${mapId}: the pack names the scene's bodies`)
    const left = record.filter(b => Object.hasOwn(BODY_WITH_FURNITURE, b.source)), scaled = record.filter(b => !Object.hasOwn(BODY_WITH_FURNITURE, b.source))
    /* every recorded body that is a body alone has its place in the pack, once; and the count of the scene file's nodes that stand there */
    const places = []; for (const b of scaled) if (!places.some(p => near(p, b.position))) places.push(b.position)
    assert.equal(row.bodies.length, places.length, `${mapId}: one entry for each place a body lies`)
    for (const p of places) { const e = row.bodies.find(x => near(x.at, p)); assert.ok(e, `${mapId}: the body at ${p.map(n => n.toFixed(2))} is in the pack`)
      assert.equal(e.nodes, g.nodes.filter(n => n.translation && near(n.translation, p)).length, 'with the number of the scene\'s nodes at that place'); assert.ok(e.nodes >= 1) }
    for (const b of left) { assert.ok(!row.bodies.some(x => near(x.at, b.position)), `${mapId}: ${b.name} (${b.source}) is left as it is`); listed.push(`${scene}: ${b.name} (${b.source}) - ${BODY_WITH_FURNITURE[b.source]}`) }
    assert.deepEqual((row.bodiesLeft || []).map(x => x.name).sort(), left.map(b => b.name).sort(), 'and the pack says which were left')
  }
  /* a scene whose record holds no body names none: the Orphanage's, the Bridge's */
  for (const mapId of ['map.opening.orphanage', 'map.opening.bridge']) { assert.deepEqual(read('assets/terrain-3d/' + pack[mapId].scene + '/assembly.json').bodies, [], pack[mapId].scene + ' records no body'); assert.deepEqual(pack[mapId].bodies ?? [], []) }
  assert.ok(listed.length >= 1, 'the Cathedral\'s remains on a pew')
  console.log('# bodies left at their made size (art to file by name): ' + listed.join('; '))
  console.log('# scenes with no body in their record (nothing to scale): ' + ['map.opening.orphanage', 'map.opening.bridge'].map(m => pack[m].scene).join(', '))
})

/** a painted scene as the loader gets it parsed: one object for every node of the real file, each at the node's own place and scale */
function parsed(scene) {
  const g = glb(scene), root = new THREE.Group()
  for (const [i, n] of g.nodes.entries()) { if (!n.translation) continue
    const o = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshBasicMaterial()); o.name = n.name; o.userData.node = i
    o.position.fromArray(n.translation); if (n.scale) o.scale.fromArray(n.scale); if (n.rotation) o.quaternion.fromArray(n.rotation); root.add(o) }
  return { scene: root }
}
const platformFor = (row, more = {}) => ({ fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }), digest: async () => Uint8Array.from(row.sceneSha256.match(/../g).map(h => parseInt(h, 16))).buffer,
  parse: async () => parsed(row.scene), location: { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }, loadTexture: async () => new THREE.Texture(), ...more })

test('the page: loading a scene scales each of its bodies by the scale the board gives a unit\'s body, about its own place; nothing else is touched', async () => {
  for (const [mapId, scene] of Object.entries(SCENES)) {
    const row = structuredClone(pack[mapId]), g = glb(scene)
    const plain = await A.loadPaintedScene({ ...row, presentation: undefined }, platformFor(row)), big = await A.loadPaintedScene({ ...row, presentation: undefined }, platformFor(row, { bodyScale: K }))
    const objs = L => { const out = new Map(); L.group.traverse(o => { if (o.userData.node !== undefined) out.set(o.userData.node, o) }); return out }
    const P = objs(plain), B = objs(big); let bodies = 0, others = 0
    for (const [i, n] of g.nodes.entries()) { if (!n.translation) continue
      const p = P.get(i), b = B.get(i), isBody = row.bodies.some(e => near(e.at, n.translation))
      if (isBody) { bodies++
        assert.ok(Math.abs(b.scale.x / p.scale.x - K) < 1e-9 && Math.abs(b.scale.y / p.scale.y - K) < 1e-9 && Math.abs(b.scale.z / p.scale.z - K) < 1e-9, `${scene} ${n.name}: scaled by the board's body scale`)
        assert.ok(Math.abs(b.position.x - p.position.x) < 1e-9 && Math.abs(b.position.z - p.position.z) < 1e-9, n.name + ': where it lay'); assert.ok(Math.abs(b.position.y - p.position.y * K) < 1e-9, n.name + ': a body lying on another rides as much higher')
        assert.ok(b.quaternion.equals(p.quaternion), n.name + ': turned as it was') }
      else { others++; assert.ok(b.scale.equals(p.scale) && b.position.equals(p.position), `${scene} ${n.name}: not a body, not touched`) } }
    assert.equal(bodies, row.bodies.reduce((s, e) => s + e.nodes, 0), scene + ': every node the pack counts'); assert.ok(others > bodies)
    plain.dispose(); big.dispose()
  }
  /* no look, or the look at 1: the scene as made */
  const row = structuredClone(pack['map.opening.lumberjack']), one = await A.loadPaintedScene({ ...row, presentation: undefined }, platformFor(row, { bodyScale: 1 }))
  one.group.traverse(o => { if (o.userData.node !== undefined && /RoadBody/.test(o.name)) assert.equal(o.scale.x, 1) }); one.dispose()
  /* a pack that names a body the scene does not hold is a failure, never a skipped body (Law 1) */
  const wrong = { ...row, presentation: undefined, bodies: [{ at: [999, 0, 999], nodes: 1 }] }
  await assert.rejects(() => A.loadPaintedScene(wrong, platformFor(row, { bodyScale: K })), /body .* is not in the scene/)
  const miscounted = { ...row, presentation: undefined, bodies: row.bodies.map(e => ({ ...e, nodes: e.nodes + 1 })) }
  await assert.rejects(() => A.loadPaintedScene(miscounted, platformFor(row, { bodyScale: K })), /body .* is not in the scene|holds \d+ of the \d+/)
})

test('the driver hands the scene the look\'s own number: the scale it stands every unit\'s body at', async () => {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.lumberjack'], binding = A.paintedBinding('map.opening.lumberjack', field, pack)
  assert.deepEqual(binding.bodies, pack['map.opening.lumberjack'].bodies, 'the binding the page mounts carries the pack\'s bodies')
  const tick = () => new Promise(r => setImmediate(r))
  for (const look of [standOut(['size', 'shadows']), standOut([])]) {
    const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; globalThis.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {}
    const wrap = w.document.createElement('div'), stage = w.document.createElement('div'); wrap.appendChild(stage)
    class Renderer { constructor() { this.shadowMap = {} } setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {} }
    let got = null
    const V = { dom: { stage }, data: { F: field, atlas: binding, models: {} }, look }
    const driver = A.createDriver(V, e => { throw e }, { Renderer, loadPainted: async (b, o) => { got = o; return { group: new THREE.Group(), dispose() {} } }, createCast: () => ({ size: 0, frame() {}, settle: async () => {}, dispose() {} }) })
    for (let i = 0; i < 5; i++) await tick()
    await driver.ready
    assert.ok(got, 'the driver loaded the scene'); assert.equal(got.bodyScale, look.bodyScale, 'with the scale the look stands a unit\'s body at')
    driver.dispose()
  }
  assert.ok(Math.abs(standOut(['size']).bodyScale - K) < 1e-12, 'the size look: 1.3 on a board at 0.9'); assert.equal(standOut([]).bodyScale, 1, 'no size look: the bodies as made, and the units too')
})

test('the measure: each scene\'s bodies, as drawn, are as long as a living human unit lying down - within 10%', async () => {
  /* a living human unit lying down: the Lumberjack's Wife, her own approved body at the end of her death motion (the pose a
     knocked-down or dead unit holds), at the size the board draws her */
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }, files = new Map()
  const fetch = async url => { const p = new URL(url).pathname; if (!files.has(p)) files.set(p, readFileSync('..' + p)); const b = files.get(p); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
  const look = models['hero.fixed.lumberjacks-wife'].looks[0], loaded = await A.loadLook({ ...look, props: [] }, { location, fetch, textures: false })
  const body = A.createBody(loaded, { scale: K }); body.life = 'dead'; body.play('death', { snap: true }); body.frame(0); assert.ok(body.lying())
  body.stage.updateMatrixWorld(true); const box = new THREE.Box3()
  body.stage.traverse(o => { if (!o.isMesh || !o.visible) return; if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)) } })
  const unit = Math.max(box.max.x - box.min.x, box.max.z - box.min.z)
  assert.ok(unit > 2 && unit < 2.8, 'a lying unit is ' + unit.toFixed(2) + ' scene metres long as drawn')
  /* each scene's human bodies lying singly, as made (the scene file's own bounds) and as the page now draws them */
  const report = []
  for (const [mapId, scene] of Object.entries(SCENES)) {
    const row = pack[mapId], g = glb(scene), record = read('assets/terrain-3d/' + scene + '/assembly.json').bodies
    const single = record.filter(b => !Object.hasOwn(BODY_WITH_FURNITURE, b.source) && (b.kind ?? 'human') === 'human' && (b.centeredAs ?? 'single') === 'single')
    const lengths = single.map(b => { const n = g.nodes.find(x => x.translation && near(x.translation, b.position) && x.mesh != null); let mn = [1e9, 0, 1e9], mx = [-1e9, 0, -1e9]
      for (const p of g.meshes[n.mesh].primitives) { const a = g.accessors[p.attributes.POSITION]; for (const i of [0, 2]) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]) } }
      return Math.max(mx[0] - mn[0], mx[2] - mn[2]) * (n.scale ? n.scale[0] : 1) }).sort((a, b) => a - b)
    assert.ok(lengths.length >= 1, scene + ' has bodies lying singly'); assert.ok(row.bodies.length >= lengths.length)
    const made = lengths[lengths.length >> 1], drawn = made * K, off = drawn / unit - 1, before = made / unit - 1
    report.push(`${scene}: ${lengths.length} bodies, the middle one ${made.toFixed(2)} m as made -> ${drawn.toFixed(2)} m as drawn, ${(off * 100).toFixed(0)}% against a lying unit's ${unit.toFixed(2)} m (was ${(before * 100).toFixed(0)}%)`)
    assert.ok(before < -.25, `${scene}: at their made size the bodies were ${(before * 100).toFixed(0)}% - smaller than they should be`)
    if (lengths.length > 1) assert.ok(Math.abs(off) <= .10, `${scene}: the bodies as drawn are ${(off * 100).toFixed(0)}% against a lying unit - within 10%`)
    /* a scene's ONE body may be made curled up (the road body by the Lumberjack House is 1.35 m long as made): it is scaled as every body is, and reported */
    else assert.ok(Math.abs(off) <= .20, `${scene}: its one body as drawn is ${(off * 100).toFixed(0)}% against a lying unit`)
  }
  for (const line of report) console.log('# ' + line)
  body.dispose()
})

test('the real scene file, through the real loader: the Cavern Trail\'s two bodies are found where the pack says and drawn at the board\'s scale, still on the ground', async () => {
  /* the scene's own file with its pictures taken out (models.js slimGLB keeps every node and every mesh), parsed by the page's own
     loader: the pack's places must be the parsed scene's - a mismatch would stop the board's 3D map from loading at all */
  const row = structuredClone(pack['map.opening.cavern-trail']); delete row.presentation
  const file = readFileSync('../assets/terrain-3d/' + row.scene + '/scene.glb'), slim = A.slimGLB(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), { meshes: true })
  const platform = { fetch: async () => ({ ok: true, arrayBuffer: async () => slim }), digest: async () => Uint8Array.from(row.sceneSha256.match(/../g).map(h => parseInt(h, 16))).buffer, location: { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' } }
  const made = await A.loadPaintedScene(row, platform), drawn = await A.loadPaintedScene(row, { ...platform, bodyScale: K })
  const bodies = []; drawn.group.traverse(o => { if (o.userData.body) bodies.push(o) })
  assert.equal(bodies.length, row.bodies.reduce((n, e) => n + e.nodes, 0), 'every body the pack names is in the parsed scene'); assert.equal(bodies.length, 2)
  const box = o => new THREE.Box3().setFromObject(o), long = b => Math.max(b.max.x - b.min.x, b.max.z - b.min.z)
  for (const o of bodies) { const was = box(made.group.getObjectByName(o.name)), now = box(o)
    assert.ok(Math.abs(long(now) / long(was) - K) < 1e-3, o.name + ': ' + long(was).toFixed(2) + ' m as made, ' + long(now).toFixed(2) + ' m as drawn')
    assert.ok(Math.abs(now.min.y - was.min.y) < .02, o.name + ': still lying on the ground'); assert.ok(long(now) > 2.2 && long(now) < 2.9, 'the length of a unit lying down') }
  made.dispose(); drawn.dispose()
})
