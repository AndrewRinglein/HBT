// viewer.civilian-held-dagger (engine backlog; engine DECISIONS.md 2026-10-03 'the civilians hold their dagger as a weapon, not
// baked into a body copy', Andrew: "No, we don't want to create a version with the knife painted into the hand. We want to use a
// knife or a dagger the way they're supposed to be used."). Expect: "In PLAY.html on the Orphanage, each Orphan Child and the School
// Teacher (where placed) holds a dagger in the right hand at idle and while walking; when one attacks it plays a stab with the
// dagger in hand; character-models.mjs --json lists an item.dagger prop on both civilian looks; no knife-v1 equipped.glb is
// referenced by the page." The pack: each civilian's kit weapon is the weapon tester's dagger held by its body's own fit
// (civilian-study held-dagger.json), its attack the stab borrowed onto the unarmed body; a kit weapon with no fit on its body is
// listed. The bodies: stood up from the files, the dagger rides the right hand through idle, walk and the stab. The page: no
// knife-v1 file named; on the Orphanage the two hold it standing and walking, and the Orphan Child's attack plays the stab with it
// in hand. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, CIVILIANS } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const sha = p => createHash('sha256').update(readFileSync('../' + p)).digest('hex')
const statics = json('generated/static.json')
const FIT = 'assets/characters/oathblade-armor/rebuild/civilian-study/held-dagger.json', REC = json('../' + FIT)
const TESTER = json('../assets/characters/oathblade-armor/rebuild/candidates/weapon-card-models/tester/weapons.json').find(w => w.id === 'dagger')
/* the two the ruling arms, by their roster bodies */
const ARMED = { 'hero.fixed.orphans': 'orphan-child', 'hero.fixed.school-teacher': 'school-teacher' }
const held = t => (statics.units[t]?.defaultItems ?? []).filter(i => ['weapon', 'shield'].includes(statics.itemClasses[i]))
const V3 = () => new THREE.Vector3()

test('the pack: the Orphan Child and the School Teacher hold their kit\'s dagger - the tester\'s, on their own body\'s fit - and stab; a weapon with no fit is listed', () => {
  for (const [t, key] of Object.entries(ARMED)) {
    const look = pack[t].looks[0], fit = REC.bodies[key]
    assert.ok(held(t).includes('item.dagger'), `${t}'s kit names the dagger`)
    assert.deepEqual(look.props.map(p => [p.item, p.hand, p.model, p.fit]), [['item.dagger', 'R', 'dagger', 'body']], `${t} holds the dagger in the right hand`)
    const p = look.props[0]
    /* the shared dagger model: the weapon tester's own file, as item.obsidian-fang-dagger is drawn */
    assert.equal(p.path, 'assets/characters/oathblade-armor' + TESTER.url); assert.equal(sha(p.path), p.sha256)
    /* held by this body's own fit, as its owner records it: not a hero body's (the tester's generic socket) */
    assert.equal(p.record, FIT)
    assert.deepEqual([p.socket, p.dimensions, p.mesh], [fit.socket, fit.dimensions, fit.mesh])
    assert.deepEqual(fit.body, look.model, `${t}: the fit is the body it wears, unarmed`)
    assert.deepEqual(look.unheld, [])
    /* the stab: the Knife attack's motion source, borrowed onto the unarmed body - not the body copy's baked clip */
    const a = look.motions.attack
    assert.deepEqual({ path: a.path, sha256: a.sha256, clip: a.clip, borrowed: a.borrowed }, { ...fit.stab, borrowed: true })
    assert.equal(sha(a.path), a.sha256)
    assert.notEqual(a.path, look.model.path)
  }
  /* every civilian's kit weapon is held or listed, never silently empty (Law 1) */
  for (const t of CIVILIANS) for (const look of pack[t].looks) {
    const shown = new Set(look.props.map(p => p.item)), listed = new Set(look.unheld ?? [])
    for (const item of held(t)) assert.ok(shown.has(item) !== listed.has(item), `${t}: ${item} is held or listed, not both`)
  }
  assert.deepEqual(pack['hero.fixed.lumberjacks-wife'].looks[0].unheld, ['item.dagger'], 'the Lumberjack\'s Wife has no dagger fit on her body: listed')
  assert.deepEqual(pack['hero.fixed.lumberjack-and-wife'].looks[0].unheld, ['item.lumberjack-axe'], 'the Lumberjack\'s axe has no model: listed')
  const list = execFileSync(process.execPath, ['tools/character-models.mjs', '--list'], { encoding: 'utf8' })
  assert.match(list, /hero\.fixed\.lumberjacks-wife[^\n]*\n\s+UNMODELLED item\.dagger/)
  assert.match(list, /hero\.fixed\.lumberjack-and-wife[^\n]*\n\s+UNMODELLED item\.lumberjack-axe/)
  /* no body copy with the knife built in */
  assert.doesNotMatch(JSON.stringify(pack), /knife-v1/)
})

/* the real bodies, from the files on disk */
const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const loads = new Map()
const load = look => { if (!loads.has(look.id)) loads.set(look.id, A.loadLook(look, { location, fetch, textures: false })); return loads.get(look.id) }
/** the dagger on a body: its socket on the right hand, drawn */
function dagger(B) {
  let socket = null; B.stage.traverse(o => { if (o.name === 'held:0:item.dagger') socket = o })
  assert.ok(socket, `${B.look.id}: the dagger is on the body`)
  assert.equal(socket.parent?.name, 'CC_Base_R_Hand', `${B.look.id}: it hangs from the right hand`)
  let meshes = 0; socket.traverse(o => { if (o.isMesh) { meshes++; assert.ok(o.visible) } })
  assert.ok(meshes > 0, `${B.look.id}: the dagger is drawn`)
  return socket
}
/** the dagger is in the hand: drawn at a dagger's size, its grip within a palm of the hand bone */
function inHand(B, socket, what) {
  B.stage.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(socket), size = box.max.distanceTo(box.min)
  assert.ok(size > .05 && size < .6, `${what}: the dagger is ${size.toFixed(3)} m long`)
  const d = socket.getWorldPosition(V3()).distanceTo(socket.parent.getWorldPosition(V3()))
  assert.ok(d < .1, `${what}: its grip is ${d.toFixed(3)} m from the hand`)
}

test('each dagger hangs from the right hand as its fit sets it, and stays in the hand through idle, walk and the stab', async () => {
  for (const [t, key] of Object.entries(ARMED)) {
    const look = pack[t].looks[0], fit = REC.bodies[key]
    const B = A.createBody(await load(look))
    assert.ok(Math.abs(B.standingHeight() - look.height) < 1e-6, `${look.id}: the dagger does not change its stature`)
    const socket = dagger(B), mesh = socket.getObjectByName(fit.mesh.node)
    const near = (a, b, what) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-6, `${look.id}: ${what} ${a} is the fit's ${b}`))
    near(socket.position.toArray(), fit.socket.translation, 'the socket'); near(socket.quaternion.toArray(), fit.socket.rotation, 'the socket\'s turn')
    near(socket.children[0].scale.toArray(), fit.dimensions.scale, 'the dimensions'); near(mesh.quaternion.toArray(), fit.mesh.rotation, 'the blade\'s turn')
    for (const motion of ['idle', 'move', 'attack']) {
      B.play('idle', { snap: true }); assert.ok(motion === 'idle' || B.play(motion), `${look.id} has ${motion}`)
      const len = B.clipLength(motion), tips = []
      for (let k = 0; k < 12; k++) {
        B.frame(k ? len / 12 : 0); inHand(B, socket, `${look.id} ${motion} @${k}`)
        tips.push(socket.getWorldPosition(V3()).applyMatrix4(new THREE.Matrix4().copy(B.stage.matrixWorld).invert()))
      }
      /* the stab drives the dagger: the hand holding it travels through the strike */
      if (motion === 'attack') {
        const reach = Math.max(...tips.map(p => tips.reduce((m, q) => Math.max(m, p.distanceTo(q)), 0)))
        assert.ok(reach > .1 * look.height, `${look.id}: the stab moves the dagger ${reach.toFixed(3)} m`)
      }
    }
    B.dispose()
  }
})

/* the page: the library's Orphanage, booted as the battle screen boots it, with the page's own pack */
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
const orphanage = json('battles/test.opening-orphanage.json')
const typeOf = id => orphanage.events.find(e => e.type === 'unit.enter' && e.actor === id)?.typeId

test('the page names no knife-v1 file; on the Orphanage both hold the dagger standing and walking, and the Orphan Child\'s attack is the stab, dagger in hand', async () => {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
  assert.doesNotMatch(html, /knife-v1/, 'no body copy with the knife built in is referenced by the page')
  const w = boot('#map.opening.orphanage'), v = w.__battleView.harness.viewer, V = v._V
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load, readStyle: el => el.style })
  V.cast = cast
  const standAt = async i => { v.pause(); v.seek(i); cast.frame(0); await cast.settle(); cast.frame(0) }
  const civilians = Object.keys(ARMED).map(t => orphanage.events.find(e => e.type === 'unit.enter' && e.typeId === t)?.actor)
  assert.ok(civilians.every(id => id != null), 'the Orphanage fields the Orphan Child and the School Teacher')
  /* standing: each its body, the page's own pack's look, the dagger in its right hand */
  await standAt(orphanage.events.findIndex(e => e.type === 'battle.begin') + 1)
  for (const id of civilians) {
    const B = cast.body(id); assert.ok(B, `${typeOf(id)} stands as its body`)
    assert.deepEqual(B.look.props.map(p => [p.item, p.hand, p.fit]), [['item.dagger', 'R', 'body']], `${typeOf(id)}: the page's pack arms it`)
    assert.equal(B.motion, 'idle'); inHand(B, dagger(B), `${typeOf(id)} standing`)
  }
  /* walking: each one's first walk, the dagger in hand from step to step */
  for (const id of civilians) {
    const i = orphanage.events.findIndex(e => e.type === 'move.begin' && e.actor === id)
    assert.ok(i > 0, `${typeOf(id)} walks in the battle`)
    await standAt(i); v.step()
    const E = V.layers.UEL.get(id), a = E.walk, B = cast.body(id), socket = dagger(B)
    assert.ok(a && a.opts.duration > 0, 'the board started its traversal')
    const kf = a.kf.map(k => ({ x: parseFloat(k.left), y: parseFloat(k.top) })), last = kf[kf.length - 1]
    for (let k = 1; k <= 8; k++) {
      const f = k / 8, j = Math.min(kf.length - 2, Math.floor(f * (kf.length - 1))), g = f * (kf.length - 1) - j
      E.root.style.left = kf[j].x + (kf[j + 1].x - kf[j].x) * g + 'px'; E.root.style.top = kf[j].y + (kf[j + 1].y - kf[j].y) * g + 'px'
      cast.frame(1 / 30)
      if (k < 8) { assert.equal(B.motion, 'move', `${typeOf(id)} walks`); inHand(B, socket, `${typeOf(id)} walking ${k}/8`) }
    }
    E.root.style.left = last.x + 'px'; E.root.style.top = last.y + 'px'; a.finish(); cast.frame(1 / 30)
  }
  /* attacking: the Orphan Child's first attack, as the page's pump plays it - the stab, the dagger in hand */
  const orphan = civilians[0], i = orphanage.events.findIndex(e => e.type === 'attack.declared' && e.actor === orphan && e.kind === 'melee')
  assert.ok(i > 0, 'the Orphan Child attacks in the battle')
  await standAt(i)
  const B = cast.body(orphan), told = [], own = B.play
  B.play = (k, o) => { told.push(k); return own.call(B, k, o) }
  v.step(); B.play = own
  assert.ok(told.includes('attack'), `the page told the Orphan Child to strike (${told})`)
  assert.equal(B.motion, 'attack')
  assert.deepEqual({ path: B.look.motions.attack.path, clip: B.look.motions.attack.clip }, { path: REC.bodies['orphan-child'].stab.path, clip: REC.bodies['orphan-child'].stab.clip }, 'its attack is the stab')
  const socket = dagger(B), len = B.clipLength('attack')
  for (let k = 0; k < 8 && B.motion === 'attack'; k++) { cast.frame(len / 9); inHand(B, socket, `the Orphan Child's stab ${k}/8`) }
  cast.dispose(); w.__battleView.harness.dispose()
})
