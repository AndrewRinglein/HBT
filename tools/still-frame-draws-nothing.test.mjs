// viewer.still-frame-draws-nothing (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the
// speed first; …' — Andrew: "I want this to feel smooth like a AAA game."). After the two items before it a frame on the
// Orphanage still issued about 1,500 draw calls: the scene's own pass, and the bodies' canvas, whose depth-only pass drew the
// whole solid scene a second time (drawBodies, "which also walks the whole scene twice and builds a Set every frame") so that
// a wall hides a body behind it; and the scene was drawn every frame whether or not anything changed.
// Held here on the sources (the page's half is ../test/viewer.still-frame-draws-nothing.test.ts, in real Chrome):
//   · what the scene holds besides its bodies is listed once — the bodies' group is not walked, no Set is built a frame;
//   · the bodies' depth is taken from the pieces that CAN hide a body in the view, and that choice never leaves out a piece
//     that does hide one (so the bodies' picture is the one every solid piece gives);
//   · a frame in which nothing changed — camera still, no body animating, the scene not an animated one — draws nothing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { standOut } from '../src/stand-out.js'
const A = await modules()

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const box = (w, h, d, mat = new THREE.MeshStandardMaterial()) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true }

test('what the scene holds besides its bodies is listed once; the bodies\' own group is never walked', () => {
  assert.equal(typeof A.sceneryOf, 'function')
  const scene = new THREE.Scene(), map = new THREE.Group(), characters = new THREE.Group(); characters.name = 'characters'
  const wall = box(1, 1, 1), sprite = new THREE.Sprite(), light = new THREE.PointLight(); map.add(wall, sprite, light)
  let walked = 0; const body = box(1, 2, 1); const t = characters.traverse.bind(characters); characters.traverse = f => { walked++; return t(f) }
  characters.add(body); scene.add(map, characters)
  const L = A.sceneryOf(scene, characters)
  assert.deepEqual(L.all.map(p => p.o), [wall, sprite], 'every drawable that is not a body\'s; no light, no body')
  assert.ok(L.all[0].box && L.all[0].box.isBox3, 'a piece with its box in the scene')
  assert.equal(A.sceneryOf(scene, characters), L, 'asked again: the same list, not made again')
  assert.equal(walked, 0, 'the bodies\' group is not walked')
  scene.add(box(1, 1, 1)); assert.notEqual(A.sceneryOf(scene, characters), L, 'the scene\'s own children changed: listed again')
})

test('drawBodies handed the pieces that can hide a body draws the depth of those alone — never what is see-through — then the bodies alone, and puts everything back', () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x302c25)
  const map = new THREE.Group(), near = box(1, 1, 1), far = box(1, 1, 1), glassy = box(1, 1, 1, new THREE.MeshStandardMaterial({ transparent: true, opacity: .18 })), sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial())
  map.add(near, far, glassy, sparks); const characters = new THREE.Group(); characters.name = 'characters'; const body = box(1, 2, 1); characters.add(body); scene.add(map, characters)
  const passes = []
  const renderer = { clears: 0, clear() { this.clears++ }, render(s) { passes.push({ depth: !!s.overrideMaterial, near: shown(near), far: shown(far), glass: shown(glassy), sparks: shown(sparks), body: shown(body) }) } }
  A.drawBodies(renderer, scene, new THREE.PerspectiveCamera(), characters, new Set([near, glassy]))
  assert.equal(renderer.clears, 1); assert.equal(passes.length, 2)
  assert.deepEqual(passes[0], { depth: true, near: true, far: false, glass: false, sparks: true, body: false }, 'the depth pass: the piece handed in; not the other solid piece; never the see-through one, handed in or not; what is not a mesh as it always was')
  assert.deepEqual(passes[1], { depth: false, near: false, far: false, glass: false, sparks: false, body: true }, 'then the bodies alone')
  assert.deepEqual([near, far, glassy, sparks, body, characters].map(o => o.visible), [true, true, true, true, true, true], 'everything put back'); assert.equal(scene.overrideMaterial, null); assert.ok(scene.background)
  /* handed nothing: every solid piece, as it was first written */
  passes.length = 0; A.drawBodies(renderer, scene, new THREE.PerspectiveCamera(), characters)
  assert.deepEqual(passes[0], { depth: true, near: true, far: true, glass: false, sparks: true, body: false })
})

test('the pieces that can hide a body: a wall in front of it, not one behind it, not one off to the side, not a see-through one — and never fewer than do hide it, over 200 made scenes', () => {
  assert.equal(typeof A.couldHide, 'function')
  const cam = new THREE.PerspectiveCamera(30, 1448 / 716, .1, 400); cam.position.set(0, 12, 20); cam.lookAt(0, 1, 0); cam.updateMatrixWorld(true)
  {
    const scene = new THREE.Scene(), characters = new THREE.Group(), body = box(.8, 2, .5); body.position.set(0, 1, 0); characters.add(body)
    const front = box(3, 3, .3); front.position.set(0, 3, 5)                      // between the camera and the body
    const behind = box(3, 3, .3); behind.position.set(0, 1.5, -9)                 // past the body
    const aside = box(1, 2, 1); aside.position.set(14, 1, 0)                      // nowhere near it on the screen
    const pane = box(3, 3, .3, new THREE.MeshStandardMaterial({ transparent: true, opacity: .18 })); pane.position.set(0, 3, 6)
    scene.add(front, behind, aside, pane, characters); scene.updateMatrixWorld(true)
    const got = A.couldHide(scene, cam, characters, 1)
    assert.deepEqual([front, behind, aside, pane].map(o => got.has(o)), [true, false, false, false])
    /* the body moved beside the far piece: that one now, the first no longer */
    body.position.set(14, 1, -4); scene.updateMatrixWorld(true)
    const then = A.couldHide(scene, cam, characters, 1)
    assert.deepEqual([front, aside].map(o => then.has(o)), [false, true], 'the same view, the body elsewhere: asked again each frame')
  }
  /* never fewer than do: every piece a line from the eye to a point of a body meets short of it is among them — bodies
     standing, lying and holding something long, anywhere on the board */
  const r = rng(20261005), ray = new THREE.Raycaster(); let lines = 0, hits = 0, chosen = 0, pieces = 0
  for (let n = 0; n < 200; n++) {
    const scene = new THREE.Scene(), characters = new THREE.Group(), solid = []
    for (let i = 0, k = 30 + Math.floor(r() * 40); i < k; i++) { const o = box(.3 + r() * 4, .3 + r() * 5, .3 + r() * 4); o.position.set((r() - .5) * 40, r() * 3, (r() - .5) * 40); o.rotation.y = r() * 6.3; solid.push(o); scene.add(o) }
    const bodies = []
    for (let i = 0, k = 1 + Math.floor(r() * 6); i < k; i++) { const g = new THREE.Group(), trunk = box(.9, 2.4, .6); trunk.position.y = 1.2; g.add(trunk)
      if (r() < .5) { const pole = box(.1, .1, 2.6); pole.position.set(.5, 1.4, 1.2); g.add(pole) }
      g.position.set((r() - .5) * 24, r() * 1.5, (r() - .5) * 24); g.rotation.y = r() * 6.3; if (r() < .3) g.rotation.z = Math.PI / 2   // lying down
      characters.add(g); bodies.push(g) }
    scene.add(characters); scene.updateMatrixWorld(true)
    const a = r() * 6.3, d = 16 + r() * 20; cam.position.set(Math.cos(a) * d, 8 + r() * 16, Math.sin(a) * d); cam.lookAt((r() - .5) * 8, 1, (r() - .5) * 8); cam.updateMatrixWorld(true)
    const got = A.couldHide(scene, cam, characters, n); chosen += got.size; pieces += solid.length
    const eye = cam.getWorldPosition(new THREE.Vector3())
    for (const g of bodies) for (let s = 0; s < 12; s++) {
      /* a point of the body: on its trunk, or out along what it holds */
      const p = new THREE.Vector3((r() - .5) * .9, r() * 2.4, r() < .3 ? r() * 2.5 : (r() - .5) * .6).applyMatrix4(g.matrixWorld)
      const to = p.clone().sub(eye), far = to.length(); ray.set(eye, to.divideScalar(far)); ray.far = far; lines++
      for (const hit of ray.intersectObjects(solid, false)) { hits++; assert.ok(got.has(hit.object), `scene ${n}: a piece between the eye and a body is among those that can hide it`) }
    }
  }
  assert.ok(hits > 500, `${hits} pieces met on ${lines} lines to bodies — the property was put to the test`)
  assert.ok(chosen < pieces * .6, `and the choice is a choice: ${chosen} of ${pieces} pieces over the 200 scenes`)
})

/* ── the driver: when a frame is drawn ── */
async function driven({ bodies = 2 } = {}) {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
  Object.defineProperty(wrap, 'clientWidth', { value: 1448, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 716, configurable: true })
  const log = []
  class Renderer { constructor(o) { this.shadowMap = {}; this.canvas = o.canvas; this.domElement = o.canvas } setPixelRatio() {} setSize() {} render() { log.push('scene') } dispose() {} forceContextLoss() {} }
  class BodyRenderer extends Renderer { clear() {} setClearColor() {} render(scene) { log.push(scene.overrideMaterial ? 'depth' : 'bodies') } }
  const group = new THREE.Group(); group.add(box(4, 3, .3))
  let size = bodies
  const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; for (let i = 0; i < 2; i++) { const m = box(.9, 2.4, .6); m.position.set(i * 3, 1.2, 0); g.add(m) } scene.add(g)
    return { get size() { return size }, frame() {}, dispose() {}, body: id => id === 7 || id === 8 ? { standingHeight: () => 1.7, stage: { position: new THREE.Vector3(id === 7 ? 0 : 3, 0, 0) } } : null } }
  const V = { look: standOut(['shadows']), dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: { 7: { id: 7, life: 'standing' }, 8: { id: 8, life: 'standing' } }, subjectId: 7, activeId: 7 }, view: { inspectId: null } }
  let now = 1000
  const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async () => ({ group, dispose() {} }), createCast, now: () => now })
  await driver.ready
  const frame = (ms = 16) => { now += ms; const f = frames.pop(); frames.length = 0; f(now); return log.splice(0) }
  return { V, driver, frame, first: log.splice(0), setSize: n => { size = n } }
}

test('a frame in which nothing changed draws nothing: the clock held with bodies on the board; time passing with none; drawn again for time with a body, a camera move, a body come or gone, another unit\'s panel', async () => {
  const { V, driver, frame, first, setSize } = await driven()
  assert.deepEqual(first, ['scene', 'depth', 'bodies'], 'the first frame is drawn')
  for (let i = 0; i < 5; i++) assert.deepEqual(frame(0), [], 'the clock held: nothing animates, nothing is drawn')
  assert.deepEqual(frame(16), ['scene', 'depth', 'bodies'], 'time passed with a body on the board: it animates where it stands — drawn')
  assert.deepEqual(frame(0), [])
  V.camVersion++; assert.deepEqual(frame(0), ['scene', 'depth', 'bodies'], 'the camera moved'); assert.deepEqual(frame(0), [])
  V.S.subjectId = 8; V.S.activeId = 8; assert.deepEqual(frame(0), ['scene', 'depth', 'bodies'], 'the panel is another unit\'s: its key light moves'); assert.deepEqual(frame(0), [])
  setSize(1); assert.deepEqual(frame(0), ['scene', 'depth', 'bodies'], 'a body went'); assert.deepEqual(frame(0), [])
  V.cursor = 12; assert.deepEqual(frame(0), ['scene', 'depth', 'bodies'], 'the log moved on: the board\'s state is another'); assert.deepEqual(frame(0), [])
  /* no body on the board, the scene not an animated one: time passing changes nothing */
  setSize(0); frame(16)
  for (let i = 0; i < 5; i++) assert.deepEqual(frame(16), [], 'no body, camera still: nothing is drawn however much time passes')
  V.camVersion++; assert.equal(frame(16)[0], 'scene', 'until the camera moves')
  driver.dispose()
})

test('the driver hands the bodies\' depth the pieces that can hide a body, says how many, and draws every piece when asked for the depth whole', async () => {
  const { V, driver, frame } = await driven()
  frame(16)
  assert.ok(V.bodiesDepth, 'the page says how the bodies\' depth is taken')
  assert.equal(typeof V.bodiesDepth.pieces, 'number'); assert.ok(V.bodiesDepth.pieces >= 0, 'so many pieces in the depth pass')
  assert.equal(V.bodiesDepth.whole, false)
  V.bodiesDepth.whole = true
  assert.deepEqual(frame(0), ['scene', 'depth', 'bodies'], 'asked for whole: drawn again at once')
  assert.equal(V.bodiesDepth.pieces, -1, 'every solid piece, not a choice of them')
  V.bodiesDepth.whole = false; frame(0); assert.ok(V.bodiesDepth.pieces >= 0)
  driver.dispose(); assert.equal(V.bodiesDepth, null)
})
