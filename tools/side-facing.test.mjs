// viewer.side-facing (engine backlog; engine DECISIONS.md 2026-10-01 'the first look at the XCOM camera, the weapons and the
// bodies', Andrew: "The enemies should be facing to the left, and the heroes should be facing to the right." · "Every unit faces
// the direction it walks, and when a unit moves next to another unit, the unit, if it's an enemy, should turn to face them. …
// If someone then walks up from another hex, it turns to face them. You also turn to face anybody who attacks you."). Expect:
// "In the sandbox at the start every hero (and civilian) faces right and every enemy left; a walking unit faces its way; a unit
// an enemy steps next to turns to face it, and to the next one that steps up; a unit attacked turns to its attacker." Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html), the page's own modules, and the approved
// model files: a body's facing is read off the body itself — its forward (+z) in the scene, against the board's east.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
const A = await modules()
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))

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
const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const loads = new Map()
const load = look => { if (!loads.has(look.id)) loads.set(look.id, A.loadLook(look, { location, fetch, textures: false })); return loads.get(look.id) }
const near = (a, b, eps, msg) => assert.ok(Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < eps, `${msg}: ${(a * 180 / Math.PI).toFixed(1)}° vs ${(b * 180 / Math.PI).toFixed(1)}°`)

test('at the start heroes face east — right on the screen — and enemies west; the attacked turn to the attacker; an enemy stepping up turns its neighbour, the latest wins', async () => {
  const w = boot('#map.opening.orphanage'), V = w.__battleView.harness.viewer._V, scene = new THREE.Scene()
  const toWorld = A.paintedToCSS(V.data.atlas).invert()
  const cast = A.createCast(V, scene, toWorld, { load, readStyle: el => el.style })
  V.cast = cast
  const first = orphanage.events.findIndex(e => e.type === 'activation.begin')
  w.__battleView.harness.viewer.seek(first); cast.frame(0); await cast.settle(); cast.frame(0)
  /* the board's east in the scene, and the screen's right at the unturned camera: the same way */
  const e0 = new THREE.Vector3(0, 0, 0).applyMatrix4(toWorld), e1 = new THREE.Vector3(100, 0, 0).applyMatrix4(toWorld), EAST = Math.atan2(e1.x - e0.x, e1.z - e0.z)
  const facing = B => { const f = new THREE.Vector3(0, 0, 1).applyQuaternion(B.stage.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(f.x, f.z) }
  const standing = Object.values(V.S.U).filter(u => u.life === 'standing' && cast.body(u.id))
  assert.ok(standing.some(u => u.side === 'hero') && standing.some(u => u.side === 'enemy'), 'heroes and enemies stand as bodies')
  for (const u of standing) near(facing(cast.body(u.id)), u.side === 'enemy' ? EAST + Math.PI : EAST, .05, `${u.name} (${u.side})`)
  /* the right of the screen at the battle's opening camera is the board's east */
  const cam = V.camera3d, right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion)
  assert.ok(Math.cos(Math.atan2(right.x, right.z) - EAST) > .9, 'east is the screen\'s right')
  /* a strike: the striker faces its target, the one struck turns to its attacker — and both keep it */
  const hero = standing.find(u => u.side === 'hero'), foes = standing.filter(u => u.side === 'enemy'), foe = foes[0], H = cast.body(hero.id), F = cast.body(foe.id)
  const toward = (a, b) => Math.atan2(b.stage.position.x - a.stage.position.x, b.stage.position.z - a.stage.position.z)
  cast.strike(hero.id, foe.id)
  for (let i = 0; i < 400; i++) cast.frame(1 / 60)
  near(facing(H), toward(H, F), .05, 'the striker faces its target'); near(facing(F), toward(F, H), .05, 'the one struck turned to its attacker')
  /* an enemy steps next to the hero: the hero turns to it; another steps up from another hex: it turns to that one */
  const dist = V.data.distance, POS = V.data.POS, taken = new Set(Object.values(V.S.U).map(u => u.hex))
  const beside = Object.keys(POS).map(Number).filter(h => dist(h, hero.hex) === 1 && !taken.has(h))
  assert.ok(beside.length >= 2 && foes.length >= 1, 'room for two to step up')
  const stepUp = (u, h) => { V.S.U[u.id] = { ...V.S.U[u.id], hex: h }; V.layers.UEL.get(u.id).root.style.left = POS[h].px + 'px'; V.layers.UEL.get(u.id).root.style.top = POS[h].py + 'px'; for (let i = 0; i < 300; i++) cast.frame(1 / 60) }
  const at = h => { const p = new THREE.Vector3(POS[h].px, POS[h].py, 0).applyMatrix4(toWorld); return Math.atan2(p.x - H.stage.position.x, p.z - H.stage.position.z) }
  stepUp(foe, beside[0]); near(facing(H), at(beside[0]), .08, 'an enemy steps up: the hero faces it')
  const second = foes[1] || foe; stepUp(second, beside[1]); near(facing(H), at(beside[1]), .08, 'another steps up from another hex: the hero faces that one')
  /* a friend stepping up turns no one */
  const friend = standing.find(u => u.side === 'hero' && u.id !== hero.id), before = facing(H), spot = Object.keys(POS).map(Number).find(h => dist(h, hero.hex) === 1 && h !== beside[0] && h !== beside[1] && !taken.has(h))
  if (friend && spot != null) { stepUp(friend, spot); near(facing(H), before, .02, 'a friend beside it turns no one') }
  cast.dispose()
})
