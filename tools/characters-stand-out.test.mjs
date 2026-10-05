// viewer.characters-stand-out (engine backlog; engine DECISIONS.md 2026-10-03 'the characters must stand out from the board').
// Andrew: "the characters don't stand out enough against the backdrop. They look a little too small on the screen. … And what
// else can we do to make the characters stand out more? We have a very colorful background. Is that part of the problem? Do we
// need more shadows? I don't know what we need." · "Actually, let's change this to 30% bigger characters, 10% smaller hexes."
// Expect: "BATTLE-SANDBOX.html?play=encounter.opening.orphanage with no option looks exactly as today; with the size option the
// bodies are [30%] taller on screen and the hexes 10% smaller, with no white space at any edge; each of shadows, ground, rim and
// disc is visibly on with its option and off without". Which look is the better one is Andrew's to see; this asks the page
// (VIEWER_PAGE, else BATTLE-VIEWER.html), the page's own modules and the approved model files that each look is exactly its
// own thing, on with its name and off without. The kingdom's half (its link and its review page) is
// ../kingdom/tools/characters-stand-out.verify.mjs.
// viewer.size-and-shadows-default (engine DECISIONS.md 2026-10-03 'size and shadows are the default', Andrew: "looks like the
// size change does it, and nothing else seems to help that much, but we should still have them have shadows." · "yes"): a
// battle whose host names NO looks shows size and shadows; a list handed over is exactly the looks shown, and an empty one is
// the board as it was before. Law 10: the "no look" this file compared against was a mount with nothing named — it is now a
// mount with an empty list (boot([])); every claim about each look is unchanged.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { LOOKS, STAND_OUT, DEFAULT_LOOKS, standOut, NO_LOOK } from '../src/stand-out.js'
import { SIDE_TINT, SIDE_GLOW } from '../src/theme.js'
const A = await modules()
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'
const EV = battle1.events, firstActivation = EV.findIndex(e => e.type === 'activation.begin') + 1
const ALL = Object.keys(LOOKS)

function boot(look) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const mount = opts => B.mount(host, data, { autoplay: false, onPlay: () => true, ...opts })
  if (look === 'refused') return { mount }
  const v = mount(look ? { look } : {})
  v.push(EV); v.seek(firstActivation)
  return { w, v, V: v._V }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
/** what the battle area shows of the board's plane, in board px (camera-no-void.test.mjs's footprint) */
function footprint(V) {
  const cam = V.camera3d, vp = cam.userData.viewport, M = V.data.boardAffine
  cam.updateMatrixWorld(true)
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity
  for (const [x, y] of [[0, 0], [vp.w, 0], [0, vp.h], [vp.w, vp.h]]) {
    const nx = 2 * x / vp.w - 1, ny = 1 - 2 * y / vp.h
    const o = new THREE.Vector3(nx, ny, -1).unproject(cam).applyMatrix4(M), d = new THREE.Vector3(nx, ny, 1).unproject(cam).applyMatrix4(M).sub(o)
    const k = -o.z / d.z, px = o.x + k * d.x, py = o.y + k * d.y
    l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py)
  }
  return { l, r, t, b }
}
function noVoid(V, what) {
  const F = V.data.F, q = footprint(V)
  assert.ok(q.l >= -.5 && q.t >= -.5 && q.r <= F.w + .5 && q.b <= F.h + .5, `${what}: the battle area shows only board — it sees x ${q.l.toFixed(1)}..${q.r.toFixed(1)}, y ${q.t.toFixed(1)}..${q.b.toFixed(1)} of a ${F.w} x ${F.h} board`)
  return q
}
const settle = (w, V, ms, what) => { for (let t = 0; t < ms; t += 16) { w._flush(16); noVoid(V, `${what}, ${t + 16} ms on`) } }

/* the approved model files, as the page loads them (side-facing.test.mjs) */
const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const loads = new Map()
const load = look => { if (!loads.has(look.id)) loads.set(look.id, A.loadLook(look, { location, fetch, textures: false })); return loads.get(look.id) }
async function castOf(V) {
  const scene = new THREE.Scene(), cast = A.createCast(V, scene, A.paintedToCSS(V.data.atlas).invert(), { load, readStyle: el => el.style })
  V.cast = cast; cast.frame(0); await cast.settle(); cast.frame(0)
  const standing = Object.values(V.S.U).filter(u => u.life === 'standing' && cast.body(u.id))
  assert.ok(standing.some(u => u.side === 'hero') && standing.some(u => u.side === 'enemy'), 'heroes and enemies stand as bodies')
  return { scene, cast, standing }
}
/** a body's height on the screen, px: its feet and its head through the page's camera */
function onScreen(V, B) {
  const cam = V.camera3d, vp = cam.userData.viewport; cam.updateMatrixWorld(true)
  const at = y => { const p = new THREE.Vector3(B.stage.position.x, B.stage.position.y + y, B.stage.position.z).project(cam); return [p.x * vp.w / 2, p.y * vp.h / 2] }
  const f = at(0), h = at(B.standingHeight()); return Math.hypot(h[0] - f[0], h[1] - f[1])
}

test('the default: a battle whose host names no looks shows size and shadows — the board at 0.9×, no white space, the patch under the feet darker — and nothing else', () => {
  assert.deepEqual([...DEFAULT_LOOKS], ['size', 'shadows'])
  assert.deepEqual({ ...standOut(), on: { ...standOut().on } }, { ...standOut(['size', 'shadows']), on: { ...standOut(['size', 'shadows']).on } })
  const usual = boot(), named = boot(['size', 'shadows']), before = boot([])
  assert.deepEqual({ ...usual.V.look.on }, { size: true, shadows: true, ground: false, rim: false, disc: false })
  assert.deepEqual([usual.V.dom.stage.classList.contains('lookShadows'), usual.V.dom.stage.classList.contains('lookDisc')], [true, false])
  assert.deepEqual(footprint(usual.V), footprint(named.V), 'the same view as the two named')
  const q = noVoid(usual.V, 'the default, at load'), q0 = noVoid(before.V, 'no look at all, at load')
  assert.ok(Math.abs((q.r - q.l) / (q0.r - q0.l) - 1 / STAND_OUT.BOARD) < .005, 'every hex 0.9× its former size')
  assert.equal(usual.V.look.bodyScale, STAND_OUT.BODY / STAND_OUT.BOARD); assert.equal(usual.V.look.shadows, true)
  assert.deepEqual({ ...before.V.look.on }, { ...NO_LOOK.on }, 'an empty list: none')
  for (const b of [usual, named, before]) b.v.dispose()
})

test('the looks: five, each on only when shown, each changing only its own number; a name that is none of them is refused', () => {
  assert.deepEqual(ALL, ['size', 'shadows', 'ground', 'rim', 'disc'])
  assert.deepEqual({ ...NO_LOOK, on: { ...NO_LOOK.on } }, { on: { size: false, shadows: false, ground: false, rim: false, disc: false }, boardZoom: 1, bodyScale: 1, shadows: false, ground: null, rim: null, disc: false }, 'no look: every number the one that changes nothing')
  /* the ruling's own numbers: hexes 10% smaller, characters 30% larger on the screen */
  assert.equal(STAND_OUT.BOARD, .9); assert.equal(STAND_OUT.BODY, 1.3)
  const flat = L => JSON.stringify({ ...L, on: null })
  for (const name of ALL) {
    const L = standOut([name]), others = ALL.filter(n => n !== name)
    assert.ok(L.on[name] && others.every(n => !L.on[n]), `${name} alone`)
    assert.notEqual(flat(L), flat(NO_LOOK), `${name} changes something`)
    const changed = Object.keys(NO_LOOK).filter(k => k !== 'on' && JSON.stringify(L[k]) !== JSON.stringify(NO_LOOK[k]))
    assert.deepEqual(changed, { size: ['boardZoom', 'bodyScale'], shadows: ['shadows'], ground: ['ground'], rim: ['rim'], disc: ['disc'] }[name], `${name} changes only its own`)
  }
  const size = standOut(['size'])
  assert.equal(size.boardZoom, .9); assert.ok(Math.abs(size.bodyScale * size.boardZoom - 1.3) < 1e-12, 'a body 1.3× on the screen of a board shown at 0.9×')
  assert.throws(() => standOut(['bigger']), /not one of size, shadows, ground, rim, disc/)
  assert.throws(() => boot('refused').mount({ look: ['bigger'] }), /not one of/, 'the page refuses it at mount')
})

test('no look at all (an empty list): the page is as it was — the standard zoom, no class on the board, the disc unseen; the disc look shows a side-coloured disc under every unit, inside the acting mark', () => {
  const css = readFileSync(PAGE, 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1]
  assert.match(css, /\.sideDisc\{[^}]*visibility:hidden/, 'unseen unless the look is named'); assert.match(css, /#stage\.lookDisc \.sideDisc\{visibility:visible\}/)
  assert.match(css, /#stage\.lookShadows \.shadow\{background:rgba\(0,0,0,\.85\)\}/, 'the shadows look: the patch under the feet darker')
  const plain = boot([]), disc = boot(['disc']), shadows = boot(['shadows'])
  assert.deepEqual({ ...plain.V.look.on }, { ...NO_LOOK.on })
  const has = (V, c) => V.dom.stage.classList.contains(c)
  assert.deepEqual([has(plain.V, 'lookDisc'), has(plain.V, 'lookShadows')], [false, false])
  assert.deepEqual([has(disc.V, 'lookDisc'), has(disc.V, 'lookShadows')], [true, false]); assert.deepEqual([has(shadows.V, 'lookDisc'), has(shadows.V, 'lookShadows')], [false, true])
  /* the disc is the unit's own footprint, in its side's colour, under its ring; the acting mark is wider — it stays distinct */
  const V = disc.V, units = Object.values(V.S.U).filter(u => u.life === 'standing')
  assert.ok(units.some(u => u.side === 'hero') && units.some(u => u.side === 'enemy'))
  for (const u of units) { const E = V.layers.UEL.get(u.id)
    assert.ok(E.disc && E.disc.className === 'sideDisc', `${u.name} has its disc`)
    assert.ok(E.disc.style.cssText.includes(`rgba(${SIDE_GLOW[u.side]},`), `${u.name}: in its side's colour (theme.js)`)
    assert.equal(E.disc.style.width, E.fring.style.width, 'the footprint ring\'s own ellipse'); assert.ok(parseFloat(E.actA.style.width) > parseFloat(E.disc.style.width), 'the acting mark is wider')
    assert.equal(E.root.children.indexOf(E.disc), 0, 'under every other mark of the unit') }
  /* nothing else moved: the same camera with and without it */
  assert.deepEqual(footprint(disc.V), footprint(plain.V)); assert.deepEqual(footprint(shadows.V), footprint(plain.V))
  for (const b of [plain, disc, shadows]) b.v.dispose()
})

test('the size look: the board is shown at 0.9× — hexes 10% smaller — and never any white space: at load, every wheel step, every quarter turn, every edge', () => {
  const plain = boot([]), size = boot(['size']), F = size.V.data.F
  const q0 = noVoid(plain.V, 'no look, at load'), q1 = noVoid(size.V, 'size, at load')
  const ratio = (q1.r - q1.l) / (q0.r - q0.l)
  assert.ok(Math.abs(ratio - 1 / STAND_OUT.BOARD) < .005, `the view sees 1/0.9 as much board across (${ratio.toFixed(4)}): every hex is 0.9× its size`)
  assert.ok(Math.abs(size.V.camera3d.userData.pose.zoom / plain.V.camera3d.userData.pose.zoom - STAND_OUT.BOARD) < 1e-9, 'the standard zoom is 0.9× the board\'s own')
  assert.ok(q1.r - q1.l < F.w - 40 && q1.b - q1.t < F.h - 40, 'still board to scroll to across and down')
  const { w, v, V } = size, wrap = V.dom.stage.parentNode
  settle(w, V, 200, 'at load')
  for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: 300 }); settle(w, V, 48, `wheel out, step ${i + 1}`) }
  settle(w, V, 1800, 'springing back')
  for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: -300 }); settle(w, V, 48, `wheel in, step ${i + 1}`) }
  settle(w, V, 1800, 'springing back')
  assert.ok(Math.abs(V.camera3d.userData.pose.zoom / plain.V.camera3d.userData.pose.zoom - STAND_OUT.BOARD) < 1e-3, 'and back at the 0.9× standard')
  for (const deg of [90, 90, 90, 90]) { v.turn(deg); settle(w, V, 1200, `turning to ${V.view.cam.yaw}°`)
    for (let i = 0; i < 12; i++) { fire(wrap, 'wheel', { deltaY: 300 }); settle(w, V, 48, `turned to ${V.view.cam.yaw}°, wheel out ${i + 1}`) }
    settle(w, V, 1800, `turned to ${V.view.cam.yaw}°, springing back`) }
  v.pan(-1e5, -1e5); noVoid(V, 'a pan far up-left'); v.pan(1e5, 1e5); noVoid(V, 'and far down-right')
  let n = 0
  for (let i = 0; i < EV.length; i++) if (EV[i].type === 'activation.begin') { v.seek(i + 1); noVoid(V, `Activation at event ${i}`); n++ }
  assert.ok(n > 10, `every Activation's centring: ${n}`)
  plain.v.dispose(); v.dispose()
})

test('the bodies: no look — the roster\'s stature, no shadow cast, no rim; size — every body 1.3× as tall on the screen; shadows — every piece casts; rim — a twin of every drawn piece in its side\'s colour, behind its body', async () => {
  const plain = boot([]), P = await castOf(plain.V)
  for (const u of P.standing) { const B = P.cast.body(u.id)
    assert.ok(Math.abs(B.standingHeight() / B.look.height - 1) < .02, `${u.name}: its roster stature`)
    let casts = 0; B.stage.traverse(o => { if (o.isMesh && o.castShadow) casts++ }); assert.equal(casts, 0, `${u.name} casts nothing`)
    assert.equal(B.stage.getObjectByName('rim'), undefined, `${u.name} has no rim`) }

  const size = boot(['size']), S = await castOf(size.V)
  assert.deepEqual(S.standing.map(u => u.id), P.standing.map(u => u.id))
  for (const u of S.standing) { const B = S.cast.body(u.id), B0 = P.cast.body(u.id)
    assert.ok(Math.abs(B.standingHeight() / B0.standingHeight() - STAND_OUT.BODY / STAND_OUT.BOARD) < 1e-6, `${u.name}: 1.3 / 0.9 as tall in the scene`)
    assert.ok(Math.abs(S.cast.heightPx(u.id) / P.cast.heightPx(u.id) - STAND_OUT.BODY / STAND_OUT.BOARD) < 1e-6, 'and what rides its head rides it there') }
  /* on the screen: the acting unit, which both views centre on, is 1.3× as tall; everyone within sight of it about that */
  const acting = size.V.S.activeId, r = onScreen(size.V, S.cast.body(acting)) / onScreen(plain.V, P.cast.body(acting))
  assert.ok(Math.abs(r - STAND_OUT.BODY) < .03, `${size.V.S.U[acting].name}, centred: ${r.toFixed(3)}× its present height on the screen`)
  for (const u of S.standing) { const k = onScreen(size.V, S.cast.body(u.id)) / onScreen(plain.V, P.cast.body(u.id)); assert.ok(k > 1.2 && k < 1.4, `${u.name}: ${k.toFixed(3)}×`) }
  /* a walk still covers its ground in step: the stride grew with the body */
  for (const u of S.standing) { const g = S.cast.body(u.id).gait('move'), g0 = P.cast.body(u.id).gait('move'); if (g0) assert.ok(Math.abs(g / g0 - STAND_OUT.BODY / STAND_OUT.BOARD) < .05, `${u.name}: its stride with it (${(g / g0).toFixed(3)})`) }

  const both = boot(['shadows', 'rim']), R = await castOf(both.V)
  for (const u of R.standing) { const B = R.cast.body(u.id), B0 = P.cast.body(u.id)
    assert.ok(Math.abs(B.standingHeight() - B0.standingHeight()) < 1e-9, `${u.name}: no taller — size is its own look`)
    const rim = B.stage.getObjectByName('rim'), twins = new Set(rim.children)
    let pieces = 0, casting = 0; B.stage.traverse(o => { if (o.isMesh && !twins.has(o)) { pieces++; if (o.castShadow) casting++ } })
    assert.ok(pieces > 0 && casting === pieces, `${u.name}: every piece casts (${casting} of ${pieces}), what it holds too`)
    assert.equal(rim.children.length, pieces, 'a twin per piece')
    for (const h of rim.children) { const of = h.userData.of
      assert.equal(h.geometry, of.geometry, 'the piece\'s own shape'); assert.equal(h.isSkinnedMesh, of.isSkinnedMesh); if (h.isSkinnedMesh) assert.equal(h.skeleton, of.skeleton, 'on the piece\'s own skeleton')
      assert.ok(!h.castShadow, 'the rim casts nothing')
      const m = [].concat(h.material).filter(x => x.visible !== false)
      for (const x of m) { assert.equal('#' + x.uniforms.color.value.getHexString(), SIDE_TINT[u.side], `${u.name}: in its side's colour (theme.js)`)
        assert.equal(x.uniforms.width.value, STAND_OUT.RIM_M); assert.equal(x.uniforms.behind.value, STAND_OUT.RIM_BEHIND_M); assert.ok(x.uniforms.behind.value > x.uniforms.width.value, 'behind its own body')
        assert.equal(x.side, THREE.DoubleSide); assert.ok(h.renderOrder > of.renderOrder, 'drawn after the bodies') }
      /* a material the look hides (an under-suit) has no rim */
      if (Array.isArray(of.material)) of.material.forEach((x, i) => assert.equal(h.material[i].visible !== false, x.visible !== false)) } }
  /* a unit that changes sides takes the other side's colour */
  const turned = R.standing.find(u => u.side === 'hero'); both.V.S.U[turned.id] = { ...both.V.S.U[turned.id], side: 'enemy' }; R.cast.frame(0)
  for (const h of R.cast.body(turned.id).stage.getObjectByName('rim').children) for (const x of [].concat(h.material).filter(x => x.visible !== false)) assert.equal('#' + x.uniforms.color.value.getHexString(), SIDE_TINT.enemy)
  for (const c of [P, S, R]) c.cast.dispose()
  for (const b of [plain, size, both]) b.v.dispose()
})

test('the ground look: the painted scene\'s own materials are drawn darker and less saturated, in the renderer; without it they are untouched', async () => {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const digest = async () => Uint8Array.from(b.sceneSha256.match(/../g).map(h => parseInt(h, 16))).buffer
  const scene = () => { const root = new THREE.Group(), shared = new THREE.MeshStandardMaterial({ name: 'grass' })
    root.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(), shared), { name: 'Ground_A' }), Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(), shared), { name: 'Ground_B' }),
      Object.assign(new THREE.Mesh(new THREE.BoxGeometry(), [new THREE.MeshStandardMaterial({ name: 'bark' }), new THREE.MeshStandardMaterial({ name: 'leaf' })]), { name: 'Tree' })); return root }
  const materials = root => { const s = new Set(); root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) s.add(m) }); return [...s] }
  const opts = { location, fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }), digest }
  const plainRoot = scene(), plain = await A.loadPaintedScene({ ...b, presentation: null }, { ...opts, parse: async () => ({ scene: plainRoot }) })
  const fresh = new THREE.MeshStandardMaterial()
  for (const m of materials(plainRoot)) { assert.equal(m.customProgramCacheKey(), fresh.customProgramCacheKey(), 'no look: the material\'s own program'); assert.equal(m.userData.tone, undefined) }
  const tonedRoot = scene(), toned = await A.loadPaintedScene({ ...b, presentation: null }, { ...opts, tone: STAND_OUT.GROUND, parse: async () => ({ scene: tonedRoot }) })
  const list = materials(tonedRoot); assert.equal(list.length, 3)
  assert.ok(STAND_OUT.GROUND.value < 1 && STAND_OUT.GROUND.value > .6 && STAND_OUT.GROUND.saturation < 1 && STAND_OUT.GROUND.saturation > .4, 'a little darker, a little less saturated')
  for (const m of list) {
    assert.deepEqual(m.userData.tone, STAND_OUT.GROUND)
    assert.notEqual(m.customProgramCacheKey(), fresh.customProgramCacheKey(), 'its own program'); assert.equal(m.customProgramCacheKey(), list[0].customProgramCacheKey(), 'one for the whole scene')
    /* the real standard shader, as three hands it over: toned after tone mapping, before the screen's colour space */
    const shader = { fragmentShader: THREE.ShaderLib.standard.fragmentShader }; m.onBeforeCompile(shader)
    const at = shader.fragmentShader.indexOf('toneGrey')
    assert.ok(at > shader.fragmentShader.indexOf('#include <tonemapping_fragment>') && at < shader.fragmentShader.indexOf('#include <colorspace_fragment>'))
    assert.ok(shader.fragmentShader.includes(`${STAND_OUT.GROUND.saturation.toFixed(3)}) * ${STAND_OUT.GROUND.value.toFixed(3)}`), 'by the look\'s own numbers')
  }
  /* a piece drawn see-through (terrain3d.js seeThrough) keeps the tone */
  const cam = new THREE.PerspectiveCamera(); cam.position.set(0, 1, 10); cam.lookAt(0, 1, 0); cam.updateMatrixWorld(true)
  const wall = new THREE.Group(), piece = new THREE.Mesh(new THREE.BoxGeometry(4, 4, .2), new THREE.MeshStandardMaterial()); piece.position.set(0, 2, 5); wall.add(piece); A.toneScene(wall, STAND_OUT.GROUND)
  const faded = new Map(); A.seeThrough(wall, cam, [{ feet: 0, at: new THREE.Vector3(0, 1.5, 0) }], faded)
  assert.ok(faded.has(piece) && piece.material.transparent, 'the piece in front of a body is see-through'); assert.equal(piece.material.customProgramCacheKey(), list[0].customProgramCacheKey(), 'and toned still')
  plain.dispose(); toned.dispose()
})

/* 2026-10-05, viewer.scenery-shadow-drawn-once: "takes the sun's shadow again every drawn frame" is held here with a renderer
   that stands in for three's and cannot keep a shadow — and for such a renderer it still stands, as written. three's own
   renderer no longer takes the shadow whole on every drawn frame: the scenery's is drawn once and kept, the bodies' drawn
   over it when a body moved (tools/scenery-shadow-drawn-once.test.mjs). No assertion below is changed.
   LAW 10 — 2026-10-05, viewer.still-frame-draws-nothing ("A frame in which nothing changed … draws nothing"): this test's
   clock stood still (now: () => 1000) and its second frame was drawn all the same, a body being on the board. A frame in
   which no time passed and nothing changed is no longer drawn, so the clock now moves 16 ms a reading — the second frame is
   one in which a body may have animated — and every assertion below stands as written. */
test('the driver: the ground look reaches the scene\'s load; the shadows look takes the sun\'s shadow again every drawn frame with the bodies in the scene\'s pass and the key light out of it; without them, as before', async () => {
  const fields = JSON.parse(readFileSync('generated/fields.json', 'utf8')), field = fields['map.opening.orphanage']
  const b = A.paintedBinding('map.opening.orphanage', field, (await import('./painted-scenes.mjs')).packPaintedScenes(fields))
  const w = makeWindow(); globalThis.document = w.document; globalThis.window = w; const frames = []; globalThis.requestAnimationFrame = f => { frames.push(f); return frames.length }; w.cancelAnimationFrame = () => {}
  async function drive(look) {
    const wrap = w.document.createElement('div'), stage = w.document.createElement('div'), stageTop = w.document.createElement('div'); wrap.appendChild(stage); wrap.appendChild(stageTop)
    const log = []; let tone = 'unasked', key = null, main = null, clock = 1000
    class Renderer { constructor(o) { this.shadowMap = {}; this.canvas = o.canvas; main = main || this } setPixelRatio() {} setSize() {}
      render(scene) { const c = scene.getObjectByName('characters'); log.push({ main: true, bodies: !!c && c.visible, key: !!key && key.visible, again: this.shadowMap.needsUpdate === true }); this.shadowMap.needsUpdate = false } dispose() {} forceContextLoss() {} }
    class BodyRenderer extends Renderer { clear() {} render() { log.push({ main: false, key: !!key && key.visible }) } }
    const createCast = (V, scene) => { const g = new THREE.Group(); g.name = 'characters'; g.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())); scene.add(g)
      const add = g.add.bind(g); g.add = o => { if (o.name === 'subject-key') key = o; return add(o) }
      return { size: 1, frame() {}, dispose() {}, body: id => id === 7 ? { standingHeight: () => 1.7, stage: { position: new THREE.Vector3(2, 0, 3) } } : null } }
    const V = { look: look && standOut(look), dom: { stage, stageTop }, data: { F: field, atlas: b, models: {} }, S: { U: { 7: { id: 7, life: 'standing' } }, subjectId: 7, activeId: 7 }, view: { inspectId: null } }
    const driver = A.createDriver(V, e => { throw e }, { Renderer, BodyRenderer, loadPainted: async (_, platform) => { tone = platform.tone; return { group: new THREE.Group(), dispose() {} } }, createCast, now: () => (clock += 16) })
    await driver.ready; const first = log.splice(0)
    frames.pop()(); const second = log.splice(0); driver.dispose()
    return { tone, first, second }
  }
  const plain = await drive(null), none = await drive([]), shadows = await drive(['shadows']), ground = await drive(['ground'])
  for (const d of [plain, none]) { assert.equal(d.tone, null, 'no tone asked of the scene')
    for (const f of [d.first, d.second]) { assert.deepEqual(f.map(p => p.main), [true, false, false]); assert.equal(f[0].bodies, false, 'the scene drawn without the bodies') }
    assert.deepEqual([d.first[0].again, d.second[0].again], [true, false], 'the sun\'s shadow taken once, at load') }
  assert.deepEqual(ground.tone, STAND_OUT.GROUND); assert.deepEqual([ground.second[0].bodies, ground.second[0].again], [false, false], 'ground is its own look')
  assert.equal(shadows.tone, null)
  for (const f of [shadows.first, shadows.second]) { assert.deepEqual(f.map(p => p.main), [true, false, false])
    assert.deepEqual([f[0].bodies, f[0].again, f[0].key], [true, true, false], 'the bodies in the scene\'s pass, the shadow taken again, the key light out of it')
    assert.deepEqual(f.slice(1).map(p => p.key), [true, true], 'and the key light back for the bodies\' own canvas') }
})
