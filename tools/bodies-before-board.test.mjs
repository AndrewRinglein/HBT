// viewer.bodies-before-board (engine backlog; engine DECISIONS.md 2026-09-30 "the civilians are played; no 2D before the 3D
// bodies"). Andrew: "two-dimensional images of other heroes are loading before the 3D images are loading. You still have
// some kind of legacy 2D other things loading". Expect: "Opening BATTLE-SANDBOX.html?play=encounter.opening.orphanage no
// 2D hero, enemy or civilian picture appears at any moment: the loading line, then the 3D map with every body standing."
// The component's half: while a unit's body loads its token picture is not shown; the board's scene is not "ready" (so
// the board stays on its loading line) until the bodies of everyone on it are in or have failed; a body that cannot be
// had keeps its token. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html) and the page's own modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packPaintedScenes } from './painted-scenes.mjs'
const A = await modules()

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
/* a stand-in body (as tools/character-models.test.mjs): a 1.7 m box on a hip bone */
function standIn(look) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
  const clips = {}; for (const k of Object.keys(look.motions)) clips[k] = new THREE.AnimationClip(k, 1, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])
  return { look, scene, clips, props: [] }
}
const tick = () => new Promise(r => setImmediate(r))
const standing = V => Object.values(V.S.U).filter(u => u.life !== 'dead' && A.modelBinding(u.typeId, V.data.models))

test('no 2D token stands in while a body loads; the bodies stand when they are in; a body that cannot be had keeps its token', async () => {
  const w = boot('#map.opening.orphanage'), H = w.__battleView.harness, V = H.viewer._V; H.viewer.pause()
  const units = standing(V); assert.ok(units.length >= 4, 'battle 1 fields bodies: its hero, its civilians, its Zombies')
  const waits = new Map(), failing = units.find(u => u.typeId === 'unit.zombie')
  const failLook = A.lookFor(A.modelBinding(failing.typeId, V.data.models), failing.id).id
  V.cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { readStyle: el => el.style,
    load: look => new Promise((ok, no) => waits.set(look.id, () => look.id === failLook ? no(Error('no such file')) : ok(standIn(look)))) })
  H.viewer.render()
  /* loading: not one token picture shows */
  for (const u of units) { assert.equal(V.cast.pending(u.id), true, u.name + ' is loading'); assert.equal(V.layers.UEL.get(u.id).img.style.opacity, '0', u.name + ': no 2D picture while its body loads') }
  let settled = false; const settle = V.cast.settle().then(() => { settled = true })
  await tick(); assert.equal(settled, false, 'the board does not open while bodies are still loading')
  for (const f of waits.values()) f()
  await settle; await tick(); H.viewer.render()
  for (const u of units) {
    const E = V.layers.UEL.get(u.id), failed = A.lookFor(A.modelBinding(u.typeId, V.data.models), u.id).id === failLook
    if (failed) { assert.equal(V.cast.shows(u.id), false); assert.equal(V.cast.pending(u.id), false); assert.equal(E.img.style.opacity, '1', u.name + ': a body that cannot be had keeps its token') }
    else { assert.equal(V.cast.shows(u.id), true, u.name + ' stands as its body'); assert.equal(E.img.style.opacity, '0', u.name + ': the body, not the token') }
  }
  V.cast.dispose(); V.cast = null; H.dispose()
})

test('the scene is not ready — the board stays on its loading line — until the bodies on it are in', async () => {
  const fields = JSON.parse(readFileSync('generated/fields.json')), field = fields['map.opening.orphanage'], b = A.paintedBinding('map.opening.orphanage', field, packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  const wrap = w.document.createElement('div'), stage = w.document.createElement('div'); wrap.appendChild(stage)
  const stats = { draws: 0 }; class Renderer { constructor() { this.shadowMap = {} } setPixelRatio() {} setSize() {} render() { stats.draws++ } dispose() {} forceContextLoss() {} }
  let release; const bodies = new Promise(r => release = r), cast = { size: 0, frame() {}, settle: () => bodies, dispose() {} }
  const V = { dom: { stage }, data: { F: field, atlas: b, models: {} } }
  const driver = A.createDriver(V, e => { throw e }, { Renderer, loadPainted: async () => ({ group: new THREE.Group(), dispose() {} }), createCast: () => cast })
  let ready = false; driver.ready.then(() => { ready = true })
  for (let i = 0; i < 5; i++) await tick()
  assert.equal(V.cast, cast, 'the scene is in and the bodies are asked for'); assert.equal(ready, false, 'not ready while the bodies load'); assert.equal(stats.draws, 0, 'nothing drawn yet')
  release(); await driver.ready; assert.equal(ready, true, 'ready once they are in'); assert.equal(stats.draws, 1)
  driver.dispose()
})
