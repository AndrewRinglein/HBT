// viewer.foliage-drawn-once (engine backlog; the chat's call 2026-10-05, engine DECISIONS.md 2026-10-05 'the computer avoids its own
// traps; W moves the view up; the Wolf's numbers stand; the player moves the summoned Wolf; the foliage is tried the smallest
// way'): Andrew was asked twice how the foliage may change for the last speed item and did not choose; by his standing word
// that the chat decides such details, records the switch and reports, A — the smallest change to the look — is tried, for him
// to judge by eye. "Each two-sided blended foliage piece is drawn ONCE (both faces in one call), behind a look switch (default
// ON for the try, the other side 'drawn twice, as before' one word away), with nothing else about the foliage changed - still
// blended, still sorted far to near piece by piece, still faded see-through alone."
// Held here on the sources, without a graphics card: WHICH pieces are the foliage (the scene's two-sided blended pieces) and
// that nothing else is touched; that the switch is one word, on for the try; that switched off every material is exactly as
// three made it — the pieces drawn twice, as before; that a faded foliage piece still fades alone and follows the switch;
// and that a frame is drawn when the switch is thrown and none after. That a piece then issues ONE draw call where it issued
// two, and what the picture differs by, is the page's half in real Chrome (../test/viewer.foliage-drawn-once.test.ts:
// tools/frame-cost.mjs counts the calls and draws every view both ways).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { standOut } from '../src/stand-out.js'
const A = await modules()
const { FOLIAGE, isFoliage, foliageOf } = A

/** a made scene: leaves and fern (two-sided, blended), a one-sided blended pane, solid rocks (two-sided, as the scenes' are), a fire of a shader's own */
function made() {
  const top = new THREE.Group()
  const leaf = new THREE.MeshStandardMaterial({ name: 'leaf', transparent: true, side: THREE.DoubleSide }), fern = new THREE.MeshStandardMaterial({ name: 'fern', transparent: true, side: THREE.DoubleSide })
  const pane = new THREE.MeshStandardMaterial({ name: 'pane', transparent: true, side: THREE.FrontSide }), rock = new THREE.MeshStandardMaterial({ name: 'rock', side: THREE.DoubleSide })
  const glow = new THREE.MeshStandardMaterial({ name: 'glow', transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), fire = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide })
  const all = {}
  const put = (name, material) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material); m.name = name; top.add(m); all[name] = m; return m }
  for (let i = 0; i < 5; i++) put('leaf' + i, leaf); for (let i = 0; i < 3; i++) put('fern' + i, fern)
  put('pane', pane); put('rock0', rock); put('rock1', rock); put('glow', glow); put('fire', fire); put('mixed', [rock, leaf])
  return { top, all, leaf, fern, pane, rock, glow, fire }
}

test('the switch is one word, on for the try: FOLIAGE.ONCE — the other side, "drawn twice, as before", is the same word set false', () => {
  assert.equal(FOLIAGE.ONCE, true); assert.ok(Object.isFrozen(FOLIAGE)); assert.deepEqual(Object.keys(FOLIAGE), ['ONCE'])
  const src = readFileSync('src/foliage.js', 'utf8')
  assert.match(src, /export const FOLIAGE = Object\.freeze\(\{ ONCE: true \}\)/, 'one word in one place')
})

test('the foliage is the scene\'s two-sided blended pieces — and nothing else is touched: not a solid piece, a one-sided pane, another blending, a shader of its own', () => {
  const { top, leaf, fern, pane, rock, glow, fire } = made()
  assert.equal(isFoliage(leaf), true); assert.equal(isFoliage(fern), true)
  for (const m of [pane, rock, glow, fire]) assert.equal(isFoliage(m), false, m.name || m.type)
  const before = [leaf, fern, pane, rock, glow, fire].map(m => m.forceSinglePass)
  assert.deepEqual(before, [false, false, false, false, false, true], 'as three makes them: a two-sided blended piece is drawn twice (a shader of its own is drawn once by three already)')
  const F = foliageOf(top, true)
  assert.deepEqual([...F.materials].map(m => m.name).sort(), ['fern', 'leaf'])
  assert.equal(F.pieces, 5 + 3 + 1, 'the pieces that are foliage: the leaves, the fern, and the piece one of whose materials is leaf')
  assert.equal(F.once, true)
  assert.deepEqual([leaf, fern].map(m => m.forceSinglePass), [true, true], 'on: each is drawn in one pass, both faces')
  assert.deepEqual([pane, rock, glow, fire].map(m => m.forceSinglePass), before.slice(2), 'nothing else is touched')
  /* nothing else about the foliage is changed: still blended, still two-sided, still writing depth, still its own place in the order */
  for (const m of [leaf, fern]) { assert.equal(m.transparent, true); assert.equal(m.side, THREE.DoubleSide); assert.equal(m.blending, THREE.NormalBlending); assert.equal(m.depthWrite, true); assert.equal(m.depthTest, true); assert.equal(m.opacity, 1) }
  top.traverse(o => { if (o.isMesh) { assert.equal(o.renderOrder, 0); assert.equal(o.visible, true) } })
  /* the other side, one word away: every material exactly as three made it */
  F.once = false
  assert.equal(F.once, false)
  assert.deepEqual([leaf, fern, pane, rock, glow, fire].map(m => m.forceSinglePass), before, 'off: drawn twice, as before — no material differs from what it was')
  F.once = true; assert.deepEqual([leaf, fern].map(m => m.forceSinglePass), [true, true])
  /* built off, it is off; put away, the scene's materials are as they were made */
  const again = made(), G = foliageOf(again.top, false)
  assert.equal(G.once, false); assert.deepEqual([again.leaf, again.fern].map(m => m.forceSinglePass), [false, false])
  F.dispose(); assert.deepEqual([leaf, fern].map(m => m.forceSinglePass), [false, false])
})

test('three\'s own rule is the one read: a piece is drawn twice when its material is blended, two-sided and not forced to one pass', () => {
  /* the line of three's renderer this item stands on — if three changes it, this says so */
  const src = readFileSync('node_modules/three/src/renderers/WebGLRenderer.js', 'utf8')
  const rule = 'if ( material.transparent === true && material.side === DoubleSide && material.forceSinglePass === false ) {'
  assert.ok(src.split(rule).length - 1 >= 2, 'three draws (and compiles) a two-sided blended piece in two passes unless forceSinglePass')
  const at = src.indexOf(rule, src.indexOf('function renderObject('))
  const twice = src.slice(at, src.indexOf('object.onAfterRender', at))
  assert.equal(twice.split('_this.renderBufferDirect( camera, scene, geometry, material, object, group );').length - 1, 3, 'two draws in that branch (the back faces, then the front), one in the other')
  assert.match(twice, /material\.side = BackSide;[\s\S]*material\.side = FrontSide;[\s\S]*material\.side = DoubleSide;[\s\S]*\} else \{/)
})

/* ── the driver ── */
async function driven() {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
  Object.defineProperty(wrap, 'clientWidth', { value: 1448, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 716, configurable: true })
  const log = []
  class Renderer { constructor(o) { this.shadowMap = {}; this.canvas = o.canvas; this.domElement = o.canvas } setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {} render() { log.push('scene') } }
  class BodyRenderer extends Renderer { clear() {} setClearColor() {} render(scene) { log.push(scene.overrideMaterial ? 'depth' : 'bodies') } }
  const group = new THREE.Group(), leafy = new THREE.MeshStandardMaterial({ name: 'leaf', transparent: true, side: THREE.DoubleSide }), stone = new THREE.MeshStandardMaterial({ name: 'stone', side: THREE.DoubleSide })
  const mesh = (name, geometry, material, at, facing) => { const m = new THREE.Mesh(geometry, material); m.name = name; m.position.copy(at); if (facing) m.lookAt(facing); group.add(m); return m }
  /* the driver's own first camera (the starting angled view at the board's middle) and the ground it looks at: two bodies there,
     a great leafy bush and a stone wall between them and the camera (both hide them), a far bush that hides nothing */
  const affine = A.paintedToCSS(b), eye = A.orbitCamera(affine, { x: field.w / 2, y: field.h / 2, yaw: 0, tilt: field.tilt, zoom: 1 }, { w: 1448, h: 716 }).position.clone()
  const at = new THREE.Vector3(field.w / 2, field.h / 2, 0).applyMatrix4(affine.clone().invert()), toEye = eye.clone().sub(at).normalize(), side = new THREE.Vector3(toEye.z, 0, -toEye.x).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const bush = mesh('bush-near', new THREE.BoxGeometry(8, 8, .3), leafy, at.clone().addScaledVector(toEye, 6).add(up), eye)
  const wall = mesh('wall', new THREE.BoxGeometry(8, 8, .3), stone, at.clone().addScaledVector(toEye, 8).add(up), eye)
  const far = mesh('bush-far', new THREE.BoxGeometry(2, 2, .3), leafy, at.clone().addScaledVector(side, 30).addScaledVector(toEye, -25).add(up))
  const bodies = [{ life: 'standing', at: at.clone().addScaledVector(side, .8), h: 1.7 }, { life: 'standing', at: at.clone().addScaledVector(side, -.8), h: 1.5 }]
  const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; for (const B of bodies) { const m = new THREE.Mesh(new THREE.BoxGeometry(.9, B.h, .6), new THREE.MeshStandardMaterial()); m.name = 'body'; m.position.set(B.at.x, B.at.y + B.h / 2, B.at.z); g.add(m) } scene.add(g)
    return { size: bodies.length, frame() {}, dispose() {}, body: () => null,
      aims() { const out = []; for (const B of bodies) { if (B.life !== 'standing') continue; out.push({ feet: B.at.y, at: new THREE.Vector3(B.at.x, B.at.y + B.h * .55, B.at.z) }, { feet: B.at.y, at: new THREE.Vector3(B.at.x, B.at.y + B.h * .9, B.at.z) }) } return out } } }
  const V = { look: standOut(['shadows']), dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: {}, subjectId: null, activeId: null }, view: { inspectId: null } }
  let now = 1000
  const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async () => ({ group, dispose() {} }), createCast, now: () => now })
  await driver.ready
  const frame = (ms = 130) => { now += ms; const f = frames.pop(); frames.length = 0; f(now); return log.splice(0) }
  return { V, driver, frame, first: log.splice(0), leafy, stone, bush, wall, far }
}

test('the driver: the scene\'s foliage is switched as it loads; the page says how many pieces and which way; a faded bush still fades alone, in one pass or two as the switch says; a faded stone wall is as it was', async () => {
  const { V, driver, frame, leafy, stone, bush, wall, far } = await driven()
  frame(130)
  assert.ok(V.foliage, 'the page says how its foliage is drawn')
  assert.equal(V.foliage.pieces, 2); assert.equal(V.foliage.materials, 1); assert.equal(V.foliage.once, FOLIAGE.ONCE)
  assert.equal(leafy.forceSinglePass, true); assert.equal(stone.forceSinglePass, false)
  /* the see-through rule: the bush and the wall in front of the bodies are faded, each by itself — its own see-through copy of its material */
  assert.ok(V.seeThrough.faded.has(bush) && V.seeThrough.faded.has(wall) && !V.seeThrough.faded.has(far), 'the bush and the wall in front of the bodies fade; the far bush does not')
  assert.notEqual(bush.material, leafy); assert.equal(bush.material.transparent, true); assert.ok(bush.material.opacity < 1); assert.equal(far.material, leafy)
  assert.equal(bush.material.forceSinglePass, true, 'a faded bush is drawn the way its material is: once')
  assert.equal(wall.material.transparent, true); assert.equal(wall.material.forceSinglePass, false, 'a faded stone wall is no foliage: drawn as it was')
  /* a still frame draws nothing; throwing the switch draws one frame at once, and none after */
  assert.deepEqual(frame(0), [], 'nothing changed: nothing drawn')
  V.foliage.once = false
  assert.equal(V.foliage.once, false); assert.equal(leafy.forceSinglePass, false); assert.equal(bush.material.forceSinglePass, false, 'and the faded bush follows the switch'); assert.equal(wall.material.forceSinglePass, false)
  assert.deepEqual(frame(0), ['scene', 'depth', 'bodies'], 'the switch thrown: the frame is drawn again at once')
  assert.deepEqual(frame(0), [], 'and nothing after')
  V.foliage.once = false; assert.deepEqual(frame(0), [], 'thrown to where it stands: nothing to draw')
  V.foliage.once = true; assert.deepEqual(frame(0), ['scene', 'depth', 'bodies']); assert.equal(bush.material.forceSinglePass, true)
  /* how many foliage pieces the view's own pass draws now (what a frame's draw calls fall by with the switch on) */
  assert.equal(typeof V.foliage.inSight(), 'number'); assert.ok(V.foliage.inSight() >= 1 && V.foliage.inSight() <= 2)
  driver.dispose(); assert.equal(V.foliage, null); assert.equal(leafy.forceSinglePass, false, 'put away: the material as it was made')
})
