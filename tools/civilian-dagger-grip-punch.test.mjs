// viewer.civilian-dagger-grip-punch (engine backlog; engine DECISIONS.md 2026-10-03 'a held weapon is gripped: the hand closes round
// it, for every body', Andrew: "We need to close the hands over the plate for everything, don't we?"; and 'the civilians' dagger
// attack: the Hook punch for now; a hand-keyed standing stab is made for review', Andrew: "Sure, we can use that for now.").
// Expect: "In PLAY.html on the Orphanage, the Orphan Child's and the School Teacher's fingers close round the dagger standing,
// walking and attacking; their attack is the Hook punch with the dagger in hand; no walk-assassinate clip is referenced by the page;
// the stab candidate exists in civilian-study with renders for review and is not on the page."
// The pack: each dagger prop carries its body's grasp (civilian-study held-dagger-grasp.json, fitted afresh on the unarmed body),
// the attack is the selected Hook punch. The bodies: stood up from the files, the five fingers' last joints close on the handle's
// axis at idle, walk and the punch (and lie open without the grasp, the same bind). The page: no walk-assassinate, no stab
// candidate; on the Orphanage the two grip standing and walking, and the Orphan Child's attack is the punch with the hand closed.
// The candidate: run.json standingStabWork names a clip and front and side renders of its key frames for each body, unaccepted.
// Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const sha = p => createHash('sha256').update(readFileSync('../' + p)).digest('hex')
const STUDY = 'assets/characters/oathblade-armor/rebuild/civilian-study/'
const FIT = json('../' + STUDY + 'held-dagger.json'), GRASP_PATH = STUDY + 'held-dagger-grasp.json', GRASP = json('../' + GRASP_PATH)
const HOOK = json('../assets/characters/oathblade-armor/rebuild/free-motion-study/selections.json').clips.hook
const ARMED = { 'hero.fixed.orphans': 'orphan-child', 'hero.fixed.school-teacher': 'school-teacher' }
const FINGERS = ['Thumb', 'Index', 'Mid', 'Ring', 'Pinky']
/* closed, measured on the drawn skin: the share of the 36 ten-degree sectors round the handle's axis where the right hand's surface
   lies within WRAP of the handle, along the palm's length of it - a hand closed round the handle surrounds it, an open palm lies
   along one side (civilian-study grasp_dagger.mjs `wrap`: fitted 0.78 orphan, 0.89 teacher; the same bind uncurled 0.28, 0.53).
   The fingers' joints are not the measure: on these generated hands a finger's bones need not sit in that finger (the teacher's
   index bones lie toward the thumb - run.json knifeWork KNIFE-01) */
const CLOSED = .7, OPEN = .6, WRAP = .006
const V3 = () => new THREE.Vector3()

test('the pack: each civilian\'s dagger carries its body\'s grasp, fitted on the unarmed body; the attack is the selected Hook punch', () => {
  for (const [t, key] of Object.entries(ARMED)) {
    const look = pack[t].looks[0], p = look.props[0]
    assert.deepEqual(look.props.map(q => [q.item, q.hand, q.fit]), [['item.dagger', 'R', 'body']], `${t} holds the dagger`)
    assert.ok(p.grasp, `${t}: the dagger carries a grasp`)
    assert.equal(p.grasp.record, GRASP_PATH); assert.equal(p.grasp.sha256, sha(GRASP_PATH))
    const g = GRASP.bodies[key]
    assert.deepEqual(g.body, look.model, `${t}: the grasp was fitted on the unarmed body it wears`)
    assert.deepEqual(FIT.bodies[key].grasp, { record: GRASP_PATH, sha256: sha(GRASP_PATH) }, `${t}: held-dagger.json names the grasp`)
    assert.deepEqual(Object.keys(p.grasp.curl).sort(), FINGERS.flatMap(f => [1, 2, 3].map(j => `CC_Base_R_${f}${j}`)).sort())
    assert.deepEqual([p.grasp.mesh, p.grasp.bind, p.grasp.weights, p.grasp.curl], [g.mesh, g.bind, g.weights, g.grasp])
    /* the attack: the selected Hook punch, borrowed onto the body; the stab is not played */
    const a = look.motions.attack
    assert.deepEqual({ clip: a.clip, sha256: a.sha256, borrowed: a.borrowed }, { clip: HOOK.clip, sha256: HOOK.sha256, borrowed: true }, `${t} punches`)
    assert.equal(FIT.bodies[key].stab, undefined, `${t}: held-dagger.json names no stab`)
  }
  assert.doesNotMatch(JSON.stringify(pack), /walk-assassinate|knife-v1|standing-stab/)
})

/* the real bodies, from the files on disk */
const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const loads = new Map()
const load = look => { if (!loads.has(look.id)) loads.set(look.id, A.loadLook(look, { location, fetch, textures: false })); return loads.get(look.id) }
const socketOf = B => { let s = null; B.stage.traverse(o => { if (o.name === 'held:0:item.dagger') s = o }); assert.ok(s, `${B.look.id}: the dagger is on the body`); return s }
/** how far round the handle the hand's skin closes (0..1): its right-hand vertices (the grasp's), skinned as drawn, in the socket's
    frame - the handle runs along its Z through its origin, its units the fit's metres */
function closure(B) {
  B.stage.updateMatrixWorld(true)
  const key = B.look.id.replace(/\+open$/, ''), socket = socketOf(B), g = GRASP.bodies[key], r = g.grip.handleRadius, along = g.fit.palmSpanMetres * .65
  let mesh = null; B.stage.traverse(o => { if (o.isSkinnedMesh && o.name === g.mesh) mesh = o })
  assert.ok(mesh, `${key}: its skin is drawn`)
  const bins = new Set(), p = V3()
  for (const v of g.weights.vertices) {
    socket.worldToLocal(mesh.getVertexPosition(v, p).applyMatrix4(mesh.matrixWorld))
    if (Math.abs(p.z) < along && Math.hypot(p.x, p.y) < r + WRAP) bins.add(Math.floor((Math.atan2(p.y, p.x) + Math.PI) / (2 * Math.PI) * 36) % 36)
  }
  return bins.size / 36
}
const closed = (B, what) => { const c = closure(B); assert.ok(c >= CLOSED, `${what}: the hand closes ${(c * 100).toFixed(0)}% round the handle (closed is ${CLOSED * 100}% or more)`); return c }

test('each body\'s fingers close round the dagger at idle, walk and the punch; without the grasp the same hand lies open', async () => {
  for (const [t] of Object.entries(ARMED)) {
    const look = pack[t].looks[0], B = A.createBody(await load(look))
    assert.ok(Math.abs(B.standingHeight() - look.height) < 1e-6, `${look.id}: the grasp does not change its stature`)
    for (const motion of ['idle', 'move', 'attack']) {
      B.play('idle', { snap: true }); assert.ok(motion === 'idle' || B.play(motion), `${look.id} has ${motion}`)
      const len = B.clipLength(motion)
      for (let k = 0; k < 12; k++) { B.frame(k ? len / 12 : 0); closed(B, `${look.id} ${motion} @${k}`) }
    }
    B.dispose()
    /* the same bind with the rest curl: open (the grasp is what closes it) */
    const open = A.createBody(await A.loadLook({ ...look, id: look.id + '+open', props: look.props.map(p => ({ ...p, grasp: { ...p.grasp, curl: {} } })) }, { location, fetch, textures: false }))
    open.play('idle', { snap: true }); open.frame(0)
    const c = closure(open)
    assert.ok(c < OPEN, `${look.id}: with no curl the hand lies open (${(c * 100).toFixed(0)}% round the handle)`)
    open.dispose()
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

test('the page names no walk-assassinate and no stab candidate; on the Orphanage both grip the dagger standing and walking, and the Orphan Child punches with it', async () => {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
  assert.doesNotMatch(html, /walk-assassinate/, 'no walk-assassinate clip is referenced by the page')
  assert.doesNotMatch(html, /standing-stab/, 'the stab candidate is not on the page')
  const w = boot('#map.opening.orphanage'), v = w.__battleView.harness.viewer, V = v._V
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load, readStyle: el => el.style })
  V.cast = cast
  const standAt = async i => { v.pause(); v.seek(i); cast.frame(0); await cast.settle(); cast.frame(0) }
  const civilians = Object.keys(ARMED).map(t => orphanage.events.find(e => e.type === 'unit.enter' && e.typeId === t)?.actor)
  assert.ok(civilians.every(id => id != null), 'the Orphanage fields the Orphan Child and the School Teacher')
  await standAt(orphanage.events.findIndex(e => e.type === 'battle.begin') + 1)
  for (const id of civilians) {
    const B = cast.body(id); assert.ok(B, `${typeOf(id)} stands as its body`)
    assert.ok(B.look.props[0]?.grasp, `${typeOf(id)}: the page's pack carries its grasp`)
    assert.equal(B.motion, 'idle'); closed(B, `${typeOf(id)} standing`)
  }
  for (const id of civilians) {
    const i = orphanage.events.findIndex(e => e.type === 'move.begin' && e.actor === id)
    assert.ok(i > 0, `${typeOf(id)} walks in the battle`)
    await standAt(i); v.step()
    const E = V.layers.UEL.get(id), a = E.walk, B = cast.body(id)
    assert.ok(a && a.opts.duration > 0, 'the board started its traversal')
    const kf = a.kf.map(k => ({ x: parseFloat(k.left), y: parseFloat(k.top) })), last = kf[kf.length - 1]
    for (let k = 1; k <= 8; k++) {
      const f = k / 8, j = Math.min(kf.length - 2, Math.floor(f * (kf.length - 1))), g = f * (kf.length - 1) - j
      E.root.style.left = kf[j].x + (kf[j + 1].x - kf[j].x) * g + 'px'; E.root.style.top = kf[j].y + (kf[j + 1].y - kf[j].y) * g + 'px'
      cast.frame(1 / 30)
      if (k < 8) { assert.equal(B.motion, 'move', `${typeOf(id)} walks`); closed(B, `${typeOf(id)} walking ${k}/8`) }
    }
    E.root.style.left = last.x + 'px'; E.root.style.top = last.y + 'px'; a.finish(); cast.frame(1 / 30)
  }
  const orphan = civilians[0], i = orphanage.events.findIndex(e => e.type === 'attack.declared' && e.actor === orphan && e.kind === 'melee')
  assert.ok(i > 0, 'the Orphan Child attacks in the battle')
  await standAt(i)
  const B = cast.body(orphan), told = [], own = B.play
  B.play = (k, o) => { told.push(k); return own.call(B, k, o) }
  v.step(); B.play = own
  assert.ok(told.includes('attack'), `the page told the Orphan Child to strike (${told})`)
  assert.equal(B.motion, 'attack')
  assert.equal(B.look.motions.attack.clip, HOOK.clip, 'its attack is the Hook punch')
  const len = B.clipLength('attack')
  for (let k = 0; k < 8 && B.motion === 'attack'; k++) { cast.frame(len / 9); closed(B, `the Orphan Child's punch ${k}/8`) }
  cast.dispose(); w.__battleView.harness.dispose()
})

test('the standing stab candidate: a hand-keyed clip for each body in civilian-study, with front and side renders of its key frames, unaccepted', () => {
  const run = json('../' + STUDY + 'run.json'), work = run.standingStabWork
  assert.ok(work, 'run.json records standingStabWork')
  assert.equal(work.userAcceptance, false); assert.match(work.status, /candidate/i); assert.match(work.status, /not (wired|on the battle screen)/i)
  for (const key of Object.values(ARMED)) {
    const out = work.outputs.find(o => o.character === key)
    assert.ok(out, `${key}: a stab candidate`)
    assert.equal(sha(STUDY + out.clip), out.sha256, `${key}: the clip is the recorded file`)
    const clip = json('../' + STUDY + out.clip)
    assert.ok(clip.duration >= .8 && clip.duration <= 1.3, `${key}: about a second (${clip.duration})`)
    assert.ok(out.keyFrames.length >= 3)
    for (const view of ['front', 'side']) for (const kf of out.keyFrames) {
      const r = out.renders.find(x => x.view === view && x.time === kf.time)
      assert.ok(r && existsSync('../' + STUDY + r.file), `${key}: a ${view} render at ${kf.time} s`)
      assert.equal(sha(STUDY + r.file), r.sha256)
    }
  }
})
