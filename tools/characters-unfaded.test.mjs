// viewer.characters-unfaded (engine backlog; engine DECISIONS.md 2026-10-01, Andrew: "these characters are faded, like they're
// ghost-like, because there are other competing things. The characters are the stars. They should not be faded, especially not
// one that's selected."). Expect: "Side-by-side screenshots: every body drawn at full strength over the ground marks; the
// selected body brightest; nothing semi-transparent over a body." What faded them: the board's marks — grid, rings, glows,
// shadow blobs, painted tiles — are DOM drawn OVER the scene's canvas with no depth. The bodies now have a canvas of their own
// above the marks, which takes the scene's solid depth first (a wall still hides a body) and then draws the bodies alone; the
// floats ride the stage's twin above them; the subject carries a key light. The screenshots are Andrew's to look at; this
// asks the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and the driver for the layering itself.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
const A = await modules()
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'

test('the page stacks the bodies above every board mark, and the floats above the bodies', () => {
  const html = readFileSync(PAGE, 'utf8'), css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  const z = sel => +new RegExp(`(?:^|[}\\s])${sel.replace(/[.#]/g, m => '\\' + m)}\\{[^}]*z-index:(\\d+)`).exec(css)?.[1]
  assert.equal(z('.terrain3d-canvas'), 0, 'the scene at the bottom'); assert.equal(z('#stage'), 1, 'the board\'s marks over it')
  assert.ok(z('.terrain3d-bodies') > z('#stage'), 'the bodies over the marks'); assert.ok(z('#stageTop') > z('.terrain3d-bodies'), 'the floats over the bodies')
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const V = w.__battleView.harness.viewer._V
  assert.ok(V.dom.stageTop, 'the stage\'s twin'); assert.equal(V.dom.stageTop.style.transform, V.dom.stage.style.transform, 'drawn through the same camera')
  w.__battleView.harness.viewer.turn(90)
  assert.equal(V.dom.stageTop.style.transform, V.dom.stage.style.transform, 'and still after a turn'); assert.equal(V.dom.stageTop.style.getPropertyValue('--unspin'), V.dom.stage.style.getPropertyValue('--unspin'))
  /* a float lands on the twin, not under the bodies */
  const v = w.__battleView.harness.viewer
  v.seek(0); for (let i = 0; i < v.events.length && !V.layers.floatL; i++) { v.step(); w._flush(50) }
  assert.ok(V.layers.floatL, 'the battle floated a number')
  assert.equal(V.layers.floatL.parentNode, V.dom.stageTop, 'the floats\' layer is on the twin')
  w.__battleView.harness.dispose()
})

test('drawBodies: the scene\'s solid depth first — no colour, no see-through piece, no body — then the bodies alone with every light', () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#302c25')
  const map = new THREE.Group(), wall = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()), glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ transparent: true, opacity: .18 }))
  const torch = new THREE.PointLight(); map.add(wall, glass, torch)
  const sun = new THREE.DirectionalLight(), floor = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshStandardMaterial())
  const characters = new THREE.Group(); characters.name = 'characters'; const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); characters.add(body)
  scene.add(map, sun, floor, characters)
  const passes = []
  const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true }
  const renderer = { clears: 0, clear() { this.clears++ }, render(s) { passes.push({ override: s.overrideMaterial, background: s.background, wall: shown(wall), glass: shown(glass), floor: shown(floor), body: shown(body), torch: shown(torch), sun: shown(sun) }) } }
  A.drawBodies(renderer, scene, new THREE.PerspectiveCamera(), characters)
  assert.equal(renderer.clears, 1, 'its canvas cleared once a frame')
  assert.equal(passes.length, 2)
  const [depth, bodies] = passes
  assert.ok(depth.override && depth.override.colorWrite === false, 'the first pass writes depth only'); assert.equal(depth.background, null, 'over nothing: the board shows through')
  assert.deepEqual([depth.wall, depth.floor, depth.glass, depth.body], [true, true, false, false], 'the solid pieces, not what is see-through, not the bodies')
  assert.equal(bodies.override, null, 'then the bodies as they are')
  assert.deepEqual([bodies.body, bodies.wall, bodies.floor, bodies.glass], [true, false, false, false], 'the bodies alone')
  assert.deepEqual([bodies.sun, bodies.torch], [true, true], 'with every light, the map\'s own torches too')
  assert.deepEqual([shown(wall), shown(glass), shown(floor), shown(body)], [true, true, true, true], 'everything put back'); assert.equal(scene.background.getHexString(), '302c25'); assert.equal(scene.overrideMaterial, null)
})

test('the driver: the bodies\' canvas between the board\'s marks and the floats; the scene drawn without the bodies; the subject\'s key light on it', async () => {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
  const log = []
  class Renderer { constructor(o) { this.shadowMap = {}; this.canvas = o.canvas; this.domElement = o.canvas } setPixelRatio() {} setSize() {} render(scene) { const c = scene.getObjectByName('characters'); log.push({ main: true, bodies: !!c && c.visible }) } dispose() {} forceContextLoss() {} }
  class BodyRenderer extends Renderer { clear() {} render(scene) { log.push({ main: false, override: !!scene.overrideMaterial }) } }
  const group = new THREE.Group()
  const at = new THREE.Vector3(2, 0, 3), standing = { standingHeight: () => 1.7, stage: { position: at } }
  const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; g.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())); scene.add(g)
    return { size: 1, frame() {}, dispose() {}, body: id => id === 7 ? standing : null } }
  const V = { dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: { 7: { id: 7, life: 'standing' } }, subjectId: 7, activeId: 7 }, view: { inspectId: null } }
  const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async () => ({ group, dispose() {} }), createCast, now: () => 1000 })
  const kids = () => wrap.children.map(c => c.className || (c === stage ? '#stage' : c === stageTop ? '#stageTop' : c.tagName))
  assert.deepEqual(kids(), ['terrain3d-canvas', '#stage', 'terrain3d-bodies', '#stageTop'], 'scene, marks, bodies, floats')
  await driver.ready
  const frame = log.splice(0)
  assert.deepEqual(frame.map(p => p.main), [true, false, false], 'a frame: the scene, then the bodies\' two passes')
  assert.equal(frame[0].bodies, false, 'the scene\'s canvas draws no body — they are drawn over the marks')
  assert.deepEqual(frame.slice(1).map(p => p.override), [true, false], 'depth first, then the bodies')
  let key = null; group.parent.traverse(o => { if (o.name === 'subject-key') key = o })
  assert.ok(key && key.isPointLight && key.visible, 'the subject carries a key light')
  assert.ok(Math.abs(key.position.y - (at.y + 1.7 * 1.25)) < 1e-9 && Math.hypot(key.position.x - at.x, key.position.z - at.z) <= 1.7 * .6 + 1e-9, 'above it, toward the camera')
  driver.dispose()
  assert.deepEqual(kids(), ['#stage', '#stageTop'], 'both canvases taken down with the scene')
})
