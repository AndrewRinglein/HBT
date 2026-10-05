// viewer.see-through-only-when-moved (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the
// speed first; …' — Andrew: "I want this to feel smooth like a AAA game."). The rule that draws see-through whatever hides a
// character (viewer.xcom-camera, 2026-10-01: "Anything blocking the view of a character is highly translucent" — kept exactly
// as it looks) was the largest cost on the battle screen: it ran every 120 ms for the whole battle whether or not anything
// moved, and each run tried two rays for every standing body against every triangle of every tall piece of the scene.
// Wanted, and held here on the sources (the page's half is ../test/viewer.see-through-only-when-moved.test.ts, in real Chrome):
//   (1) the check runs only when what it depends on changed — the camera's pose, or a standing body's position, height or
//       life — never because a body is animating where it stands;
//   (2) one run is cheap: a ray is tried against a piece's box before its triangles, and against a structure built once for
//       the piece — it tries a small part of the triangles, never all of them;
//   (3) what is drawn see-through is unchanged: the same pieces, for the same camera and bodies, as the rule as first
//       written finds (three's own raycast over every triangle — kept in the sources as the reference: hiders(…, 'plain')).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
const A = await modules()

/* a small seeded generator: the same scenes every run */
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const SIDES = [THREE.FrontSide, THREE.BackSide, THREE.DoubleSide]
/** a soup of `n` triangles in a box about the origin — indexed or not, as asked */
function soup(r, n, size, indexed) {
  const verts = [], index = []
  for (let i = 0; i < n; i++) {
    const c = [(r() - .5) * size, r() * size * .6, (r() - .5) * size], e = .2 + r() * 1.2
    for (let k = 0; k < 3; k++) verts.push(c[0] + (r() - .5) * e, c[1] + (r() - .5) * e, c[2] + (r() - .5) * e)
    index.push(i * 3, i * 3 + 1, i * 3 + 2)
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  if (indexed) { /* share some corners, as a real mesh does */ for (let i = 3; i < index.length; i += 7) index[i] = index[i - 3]; g.setIndex(index) }
  return g
}
function place(r, o) {
  o.position.set((r() - .5) * 6, r() * 1.5, (r() - .5) * 6); o.rotation.set(r() * 6.3, r() * 6.3, r() * 6.3); const s = .5 + r() * 1.5; o.scale.set(s, s * (.5 + r()), s)
  return o
}
/** a scene of every kind of piece the rule may meet */
function scene(r) {
  const g = new THREE.Group(), mat = side => new THREE.MeshStandardMaterial({ side })
  const ground = new THREE.Mesh(new THREE.BoxGeometry(60, .2, 60), mat(THREE.FrontSide)); ground.position.y = -.1; g.add(ground)
  const n = 6 + Math.floor(r() * 8)
  for (let i = 0; i < n; i++) {
    const kind = Math.floor(r() * 7), side = SIDES[Math.floor(r() * 3)]
    let o
    if (kind === 0) o = new THREE.Mesh(new THREE.BoxGeometry(1 + r() * 4, 1 + r() * 3, .2 + r()), mat(side))
    else if (kind === 1) o = new THREE.Mesh(new THREE.SphereGeometry(.6 + r() * 1.5, 12, 8), mat(side))
    else if (kind === 2) o = new THREE.Mesh(soup(r, 300 + Math.floor(r() * 1500), 8, true), mat(side))
    else if (kind === 3) o = new THREE.Mesh(soup(r, 200 + Math.floor(r() * 600), 6, false), mat(side))
    else if (kind === 4) { /* two materials, each with its own side, over two groups — and a gap no group covers */
      const geo = soup(r, 600, 7, r() < .5), count = (geo.index ? geo.index.count : geo.attributes.position.count)
      geo.addGroup(0, 300 * 1, 0); geo.addGroup(900, count - 900 - 150, 1); o = new THREE.Mesh(geo, [mat(SIDES[Math.floor(r() * 3)]), mat(SIDES[Math.floor(r() * 3)])]) }
    else if (kind === 5) { /* only part of it is drawn */ const geo = soup(r, 500, 6, r() < .5); geo.setDrawRange(150, 600); o = new THREE.Mesh(geo, mat(side)) }
    else { /* an instanced part: every copy of it */ o = new THREE.InstancedMesh(new THREE.BoxGeometry(.6, 2.5, .6), mat(side), 5); const m = new THREE.Matrix4()
      for (let k = 0; k < 5; k++) { m.makeTranslation((r() - .5) * 10, 1.2, (r() - .5) * 10); o.setMatrixAt(k, m) } o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere(); o.computeBoundingBox() }
    g.add(kind === 6 ? o : place(r, o))
  }
  /* a piece under a turned, scaled parent, as an authored scene nests them */
  const nest = place(r, new THREE.Group()); nest.add(place(r, new THREE.Mesh(soup(r, 400, 5, true), mat(THREE.DoubleSide)))); g.add(nest)
  /* what the scene itself draws see-through is no wall */
  const fire = place(r, new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: .6 }))); g.add(fire)
  g.updateMatrixWorld(true)
  return g
}
function view(r) {
  const cam = new THREE.PerspectiveCamera(30, 1.6, .1, 200), a = r() * 6.3, d = 9 + r() * 14
  cam.position.set(Math.cos(a) * d, 5 + r() * 12, Math.sin(a) * d); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true)
  const aims = []
  for (let i = 0, n = 4 + Math.floor(r() * 8); i < n; i++) { const x = (r() - .5) * 12, z = (r() - .5) * 12, feet = r() < .3 ? r() * 1.2 : 0, h = 1.4 + r() * .6
    aims.push({ feet, at: new THREE.Vector3(x, feet + h * .55, z) }, { feet, at: new THREE.Vector3(x, feet + h * .9, z) }) }
  return { cam, aims }
}

test('the rule\'s own answer: the pieces found by the structure are the pieces three\'s raycast over every triangle finds — over 300 scenes of every kind of piece', () => {
  assert.equal(typeof A.hiders, 'function', 'the pieces that hide a body, as a question of its own')
  const r = rng(20261005); let some = 0, pieces = 0
  for (let n = 0; n < 60; n++) {
    const g = scene(r)
    for (let k = 0; k < 5; k++) {
      const { cam, aims } = view(r)
      const fast = A.hiders(g, cam, aims), plain = A.hiders(g, cam, aims, 'plain')
      assert.ok(fast instanceof Set && plain instanceof Set)
      assert.deepEqual([...fast].map(o => o.id).sort((a, b) => a - b), [...plain].map(o => o.id).sort((a, b) => a - b), `scene ${n}, view ${k}: the same pieces`)
      if (plain.size) some++; pieces += plain.size
    }
  }
  assert.ok(some > 150, `most views had something in the way (${some} of 300; ${pieces} pieces in all) — the comparison is not of empty sets`)
})

test('what is drawn see-through is the same: seeThrough fades exactly those pieces, and the ground a body stands on never', () => {
  const r = rng(7), g = scene(r), { cam, aims } = view(r), faded = new Map()
  const want = A.hiders(g, cam, aims, 'plain')
  A.seeThrough(g, cam, aims, faded)
  assert.deepEqual([...faded.keys()].map(o => o.id).sort(), [...want].map(o => o.id).sort())
  for (const o of faded.keys()) assert.equal([].concat(o.material)[0].opacity, A.SEE_THROUGH)
  assert.equal(A.seeThrough(g, cam, aims, faded), false, 'the same view again: nothing to change')
})

test('one run tries a ray against a piece\'s box first and a small part of its triangles: a 400,000-triangle piece, 20 rays, under one triangle in a hundred tried', () => {
  assert.equal(typeof A.hidersStats, 'function', 'what the last run cost, counted')
  const r = rng(99), g = new THREE.Group()
  const big = new THREE.Mesh(soup(r, 400000, 40, true), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })); big.position.y = 1; g.add(big)
  const far = new THREE.Mesh(soup(r, 50000, 5, true), new THREE.MeshStandardMaterial()); far.position.set(300, 0, 300); g.add(far)   // nowhere near any ray
  g.updateMatrixWorld(true)
  const { cam, aims } = view(r); while (aims.length < 20) aims.push(...view(r).aims); aims.length = 20
  const fast = A.hiders(g, cam, aims), first = A.hidersStats()
  const again = A.hiders(g, cam, aims), stats = A.hidersStats()
  assert.deepEqual([...again], [...fast])
  assert.deepEqual([...fast].map(o => o.id).sort(), [...A.hiders(g, cam, aims, 'plain')].map(o => o.id).sort(), 'and the same answer as every triangle tried')
  assert.equal(first.built, 1, 'the structure is built for the piece a ray reaches — once'); assert.equal(stats.built, 0, 'and not again')
  assert.ok(stats.boxes >= 20, 'every ray is tried against a piece\'s box first')
  assert.ok(stats.triangles < 400000 * 20 / 100, `${stats.triangles} triangle tests for 20 rays against 400,000 triangles (every triangle for every ray is 8,000,000)`)
  /* a piece that moved is read again where it is */
  big.position.x += 3; g.updateMatrixWorld(true)
  const moved = A.hiders(g, cam, aims), rebuilt = A.hidersStats().built
  assert.deepEqual([...moved].map(o => o.id).sort(), [...A.hiders(g, cam, aims, 'plain')].map(o => o.id).sort(), 'moved: the same answer still')
  assert.equal(rebuilt, 1, 'its structure built again for where it stands now')
})

/* ── the driver: when the check runs ── */
async function driven() {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
  Object.defineProperty(wrap, 'clientWidth', { value: 1448, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 716, configurable: true })
  let drawn = 0
  class Renderer { constructor(o) { this.shadowMap = {}; this.canvas = o.canvas; this.domElement = o.canvas } setPixelRatio() {} setSize() {} render() { drawn++ } dispose() {} forceContextLoss() {} }
  class BodyRenderer extends Renderer { clear() {} render() {} }
  const group = new THREE.Group(), stone = new THREE.MeshStandardMaterial()
  const wall = new THREE.Mesh(new THREE.BoxGeometry(400, 300, 2), stone); group.add(wall)
  const bodies = [{ life: 'standing', at: new THREE.Vector3(2, 0, 3), h: 1.7 }, { life: 'standing', at: new THREE.Vector3(-3, 0, 1), h: 1.5 }]
  let animated = 0
  const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; scene.add(g)
    return { size: bodies.length, frame() { animated++ }, dispose() {}, body: () => null,
      aims() { const out = []; for (const B of bodies) { if (B.life !== 'standing') continue; out.push({ feet: B.at.y, at: new THREE.Vector3(B.at.x, B.at.y + B.h * .55, B.at.z) }, { feet: B.at.y, at: new THREE.Vector3(B.at.x, B.at.y + B.h * .9, B.at.z) }) } return out } } }
  const V = { dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: {}, subjectId: null, activeId: null }, view: { inspectId: null } }
  let now = 1000
  const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async () => ({ group, dispose() {} }), createCast, now: () => now })
  await driver.ready
  const frame = (ms = 130) => { now += ms; const f = frames.pop(); frames.length = 0; f(now) }
  return { V, driver, frame, bodies, wall, drawnSoFar: () => drawn, animatedSoFar: () => animated }
}

test('the check runs when what it depends on changed and not otherwise: none over 60 still frames after the first; one for a camera move, a body\'s step, its height, its life', async () => {
  const { V, driver, frame, bodies, animatedSoFar } = await driven()
  assert.ok(V.seeThrough && typeof V.seeThrough.runs === 'number', 'the page says how often the check has run')
  frame(); const first = V.seeThrough.runs
  assert.equal(first, 1, 'the first frame looks once')
  const before = animatedSoFar()
  for (let i = 0; i < 60; i++) frame()
  assert.equal(animatedSoFar() - before, 60, 'the bodies went on animating where they stand, frame after frame')
  assert.equal(V.seeThrough.runs, first, '60 still frames, each long enough after the last for the check to fall due: it did not run')
  /* the camera's pose */
  V.camVersion = (V.camVersion || 0) + 1; frame()
  assert.equal(V.seeThrough.runs, first + 1, 'the camera moved: looked again, once')
  for (let i = 0; i < 5; i++) frame(); assert.equal(V.seeThrough.runs, first + 1)
  /* a standing body's position */
  bodies[0].at.x += .4; frame(); assert.equal(V.seeThrough.runs, first + 2, 'a body stepped: looked again')
  for (let i = 0; i < 5; i++) frame(); assert.equal(V.seeThrough.runs, first + 2)
  /* its height */
  bodies[1].h = 1.1; frame(); assert.equal(V.seeThrough.runs, first + 3, 'a body\'s height changed: looked again')
  /* its life */
  bodies[1].life = 'down'; frame(); assert.equal(V.seeThrough.runs, first + 4, 'a body fell: looked again')
  for (let i = 0; i < 5; i++) frame(); assert.equal(V.seeThrough.runs, first + 4)
  driver.dispose()
})

test('while things move the check is still no more often than every SEE_EVERY ms, and the last move is never missed', async () => {
  const { V, driver, frame, bodies } = await driven()
  frame(); const first = V.seeThrough.runs
  /* a glide: the camera moves on every 16 ms frame for a second */
  for (let i = 0; i < 60; i++) { V.camVersion++; frame(16) }
  const during = V.seeThrough.runs - first
  assert.ok(during >= 6 && during <= Math.ceil(60 * 16 / A.SEE_EVERY) + 1, `60 moving frames 16 ms apart: ${during} runs — about one every ${A.SEE_EVERY} ms`)
  /* the last move came too soon after a run to be looked at: it is looked at as soon as the check may run, with nothing else moving */
  for (let i = 0; i < 3; i++) frame(130)                       // whatever the glide left to look at is looked at
  bodies[0].at.z += 1; frame(130); const held = V.seeThrough.runs   // a move, looked at at once: the check was due
  V.camVersion++; frame(16)
  assert.equal(V.seeThrough.runs, held, 'a move 16 ms after a run: not yet')
  for (let i = 0; i < 5; i++) frame(16)
  assert.equal(V.seeThrough.runs, held, 'nor 96 ms after')
  for (let i = 0; i < 4; i++) frame(16)
  assert.equal(V.seeThrough.runs, held + 1, 'the move made between two runs is looked at once the check is due, with nothing else moving')
  for (let i = 0; i < 20; i++) frame(130); assert.equal(V.seeThrough.runs, held + 1, 'and then no more')
  driver.dispose()
})

test('what the page is asked by the tests and the frame-cost tool: the pieces hiding a body now, by the structure or by every triangle', async () => {
  const { V, driver, frame, wall } = await driven()
  frame()
  assert.equal(typeof V.seeThrough.hiding, 'function')
  const fast = V.seeThrough.hiding(), plain = V.seeThrough.hiding('plain')
  assert.ok(Array.isArray(fast) && Array.isArray(plain)); assert.deepEqual(fast, plain)
  assert.deepEqual(fast.map(i => V.seeThrough.pieces()[i].o), [...V.seeThrough.faded.keys()], 'the pieces hiding a body are the pieces drawn see-through')
  assert.ok(fast.length === 0 || V.seeThrough.pieces()[fast[0]].o === wall)
  driver.dispose()
})
