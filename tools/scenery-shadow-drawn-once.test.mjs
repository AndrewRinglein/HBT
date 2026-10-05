// viewer.scenery-shadow-drawn-once (engine backlog; engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: the
// speed first; …'). The sun's shadow map (4096x4096) was drawn again, whole, on every drawn frame — 916 draw calls and 3
// million triangles a frame on the Orphanage — though the scenery never moves and only the bodies do. Ruled 2026-10-03 'shadows
// are kept': kept. Wanted: "the scenery's shadow is drawn when the scene is built, and again only if the sun or the scenery
// changes; a frame in which a body moved or animated draws the bodies' shadows alone over the kept scenery shadow; a frame in
// which nothing moved draws no shadow at all. The picture is unchanged."
// Held here on the sources, with a renderer that stands in for three's and does what its shadow pass does (binds the sun's
// map, clears it, draws whatever casts): WHICH objects cast in each pass, what the map is started from, and when no pass is
// made. That the picture is the same is the page's half, in real Chrome (../test/viewer.scenery-shadow-drawn-once.test.ts:
// tools/frame-cost.mjs draws the same frame both ways and compares the pixels).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { standOut } from '../src/stand-out.js'
const A = await modules()

/** the driver on a made scene — two pieces that cast and a ground that does not — with two bodies */
async function driven({ looks = ['shadows'], lights = 0 } = {}) {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
  Object.defineProperty(wrap, 'clientWidth', { value: 1448, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 716, configurable: true })
  const log = []
  const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true }
  /* three's own calls, as far as the keeping uses them */
  let read = null
  const gl = { READ_FRAMEBUFFER: 'read', DEPTH_BUFFER_BIT: 'depth', NEAREST: 'nearest',
    bindFramebuffer(target, fb) { assert.equal(target, 'read', 'only the framebuffer read from is ever changed by hand'); read = fb },
    blitFramebuffer(x0, y0, x1, y1, a0, b0, a1, b1, what, filter) { assert.deepEqual([x0, y0, a0, b0], [0, 0, 0, 0]); assert.deepEqual([x1, y1], [a1, b1], 'the whole map, texel for texel'); assert.equal(what, 'depth'); assert.equal(filter, 'nearest')
      log.push({ copy: nameOf(read.of) + ' -> ' + nameOf(main.target), size: x1 }) } }
  const names = new Map(), nameOf = t => t === null ? 'screen' : names.get(t) || (names.set(t, t.depthTexture && t.texture.format === THREE.RedFormat ? 'kept' : 'map'), names.get(t))
  let main = null
  class Renderer {
    constructor(o) { this.shadowMap = { needsUpdate: false }; this.canvas = o.canvas; this.domElement = o.canvas; this.target = null; main = main || this
      this.properties = { get: t => t.__gl || (t.__gl = { __webglFramebuffer: { of: t } }) } }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    getContext() { return gl } getRenderTarget() { return this.target } setRenderTarget(t) { this.target = t ?? null; read = t ? this.properties.get(t).__webglFramebuffer : null }
    clear() { log.push({ clear: nameOf(this.target) }) }
    render(scene) {
      /* three's shadow pass: only when asked; the sun's map bound, cleared, and every shown mesh that casts drawn into it */
      if (this.shadowMap.needsUpdate) { const suns = []; scene.traverse(o => { if (o.isLight && o.castShadow) suns.push(o) })
        for (const sun of suns) { if (!sun.shadow.map) { sun.shadow.map = new THREE.WebGLRenderTarget(sun.shadow.mapSize.x, sun.shadow.mapSize.y); sun.shadow.map.depthTexture = new THREE.DepthTexture(sun.shadow.mapSize.x, sun.shadow.mapSize.y, THREE.UnsignedIntType) }
          this.setRenderTarget(sun.shadow.map); this.clear()
          const casters = []; scene.traverse(o => { if (o.isMesh && o.castShadow && shown(o)) casters.push(o.name) }); log.push({ shadow: casters.sort() }); this.setRenderTarget(null) }
        this.shadowMap.needsUpdate = false }
      const c = scene.getObjectByName('characters'); log.push({ scene: true, bodies: !!c && shown(c) }) } }
  class BodyRenderer { constructor(o) { this.canvas = o.canvas; this.domElement = o.canvas } setPixelRatio() {} setSize() {} setClearColor() {} clear() {} render() {} dispose() {} forceContextLoss() {} }
  const group = new THREE.Group(), mesh = (name, cast) => { const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); m.name = name; m.castShadow = cast; m.receiveShadow = true; return m }
  group.add(mesh('house', true), mesh('tree', true), mesh('ground', false))
  for (let i = 0; i < lights; i++) { const torch = new THREE.PointLight(); torch.castShadow = true; group.add(torch) }
  let size = 2
  const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; g.add(mesh('body-a', true), mesh('body-b', true), mesh('held-shield', false)); scene.add(g)
    return { get size() { return size }, frame() {}, dispose() {}, body: () => null } }
  const V = { look: standOut(looks), dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: {}, subjectId: null, activeId: null }, view: { inspectId: null } }
  let now = 1000
  const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async () => ({ group, dispose() {} }), createCast, now: () => now })
  await driver.ready
  /** one more frame, `ms` later (0: the clock held — nothing animates) */
  const frame = (ms = 16) => { now += ms; const f = frames.pop(); frames.length = 0; f(now); return log.splice(0) }
  return { V, driver, frame, first: log.splice(0), group, setSize: n => { size = n }, casting: () => { const out = []; group.parent.traverse(o => { if (o.isMesh && o.castShadow) out.push(o.name) }); return out.sort() } }
}
const passes = f => f.filter(e => e.shadow).map(e => e.shadow.join(' '))

test('when the scene is built the scenery\'s shadow is drawn once, alone, and kept; the bodies\' are then drawn over the kept one — and the picture\'s pass is drawn with both', async () => {
  const { first, V, driver, casting } = await driven()
  assert.ok(V.sceneryShadow, 'the page says how the shadow is kept')
  assert.deepEqual(passes(first), ['house tree', 'body-a body-b'], 'two passes on the first frame: the scenery alone, then the bodies alone')
  /* the order of everything the first frame did */
  const order = first.map(e => e.clear ? 'clear ' + e.clear : e.shadow ? 'shadow: ' + e.shadow.join(' ') : e.copy ? 'copy ' + e.copy : 'scene')
  assert.deepEqual(order, ['clear map', 'shadow: house tree', 'scene', 'copy map -> kept', 'clear map', 'copy kept -> map', 'shadow: body-a body-b', 'scene'],
    'the scenery into the map and its depth kept; then the map cleared, started from the kept depth, and the bodies drawn over it; the picture drawn last, with both')
  assert.equal(first.find(e => e.copy).size, 4096, 'the whole 4096 map')
  assert.equal(V.sceneryShadow.takes, 1)
  assert.deepEqual(casting(), ['body-a', 'body-b'], 'from then on only the bodies cast in a pass: the scenery\'s shadow is in the keeping')
  driver.dispose()
  assert.deepEqual(casting(), ['body-a', 'body-b', 'house', 'tree'], 'and the scene is handed back as it was made')
})

test('a frame in which a body animated draws the bodies\' shadows alone over the kept one; a frame in which nothing moved draws no shadow at all', async () => {
  const { V, driver, frame, setSize } = await driven()
  for (let i = 0; i < 5; i++) { const f = frame(16)
    assert.deepEqual(passes(f), ['body-a body-b'], 'time passed with bodies on the board: their shadows, and only theirs')
    assert.deepEqual(f.filter(e => e.copy).map(e => e.copy), ['kept -> map'], 'over the kept scenery shadow')
    assert.equal(f.filter(e => e.scene).length, 1, 'and the picture once') }
  for (let i = 0; i < 5; i++) { const f = frame(0)
    assert.deepEqual(passes(f), [], 'the clock held — nothing animated: no shadow pass')
    assert.deepEqual(f.filter(e => e.copy || e.clear), [], 'the map is left holding the last shadow')
    assert.equal(f.filter(e => e.scene).length, 1) }
  /* a body came or went, with no time passed: its shadow comes or goes */
  setSize(1); assert.deepEqual(passes(frame(0)), ['body-a body-b'], 'the cast changed: the bodies\' shadows drawn again')
  assert.deepEqual(passes(frame(0)), [])
  assert.equal(V.sceneryShadow.takes, 1, 'the scenery\'s shadow was drawn once in all of this')
  driver.dispose()
})

test('the scenery\'s shadow is drawn again only if the sun or the scenery changes; asked for whole it is as it was first written', async () => {
  const { V, driver, frame, group, casting } = await driven()
  let sun = null; group.parent.traverse(o => { if (o.isDirectionalLight && o.castShadow) sun = o })
  assert.ok(sun, 'the painted scene\'s sun')
  frame(16); assert.equal(V.sceneryShadow.takes, 1)
  sun.position.x += 5
  assert.deepEqual(passes(frame(16)), ['house tree', 'body-a body-b'], 'the sun moved: the scenery\'s shadow again, alone, then the bodies\'')
  assert.equal(V.sceneryShadow.takes, 2)
  assert.deepEqual(passes(frame(16)), ['body-a body-b']); assert.equal(V.sceneryShadow.takes, 2)
  /* the shadow whole on every drawn frame — the reference the tool compares the kept one with */
  V.sceneryShadow.whole = true
  assert.deepEqual(casting(), ['body-a', 'body-b', 'house', 'tree'], 'everything casts again')
  for (const ms of [16, 0, 16]) { const f = frame(ms); assert.deepEqual(passes(f), ['body-a body-b house tree'], 'one pass, everything in it, every drawn frame'); assert.deepEqual(f.filter(e => e.copy), []) }
  V.sceneryShadow.whole = false
  assert.deepEqual(passes(frame(0)), ['house tree', 'body-a body-b'], 'kept again: taken afresh'); assert.equal(V.sceneryShadow.takes, 3)
  driver.dispose()
})

test('where a shadow cannot be kept it is drawn whole, as before: a scene with a second shadow-casting light; the shadows look off draws it once at load', async () => {
  const two = await driven({ lights: 1 })
  assert.deepEqual(passes(two.first).map(p => p), ['body-a body-b house tree', 'body-a body-b house tree'], 'two lights cast: each map takes everything (the sun\'s and the torch\'s)')
  assert.deepEqual(two.first.filter(e => e.copy), [])
  assert.deepEqual(passes(two.frame(0)).length, 2, 'and again every drawn frame')
  two.driver.dispose()
  const off = await driven({ looks: [] })
  assert.equal(passes(off.first).length, 1, 'no shadows look: the sun\'s shadow once, at load'); assert.deepEqual(passes(off.frame(16)), [])
  off.driver.dispose()
})
