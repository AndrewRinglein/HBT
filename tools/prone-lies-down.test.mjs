// viewer.prone-lies-down (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ... knocked down ...' and 'the playtest
// post answered: ... knockdown is prone ...'). Andrew: "When you are knocked down, we need to use the downed image, which is the
// same as the dead, like you're lying on the ground ... Because it's not dead. It's the same as if you were knocked down on your
// back." / "knockdown is prone. That's what I'm talking about. She failed a knockdown roll, and it didn't change the way she
// looked." A knocked-down unit drawn as its 3D body stood on the board as before: only its hidden token tipped.
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) with the cast standing on it, each body a stand-in whose death lays
// it flat (as tools/character-models.test.mjs stands them; the real files' deaths are held to end lying there):
//   the Orphanage's own log  - the engine's knockdown of the Orphan Child (kdb.rolled, status.applied, unit.proned) and its
//                              Stand Up a turn later (status.expired, unit.stood): the body falls as the knockdown lands, lies
//                              on through the enemy's turn with its health bar and marks shown, and rises at Stand Up;
//   battle 2                 - the same lines, as the engine writes them, for the Lumberjack's Wife, a hero and a Skeleton Archer
//                              (the recording holds no knockdown of its own: viewer SWITCHES proneLinesForBattleTwo);
//   not dead                 - a dead unit has no bar; a lying unit struck stays lying; one killed where it lies does not fall again;
//   no death pose            - a unit with no body, or a body with no death motion, shows the tipped token it showed before;
//                              every such body is listed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const orphanage = load('battles/test.opening-orphanage.json'), lumberjack = load('battles/test.opening-lumberjack.json')
const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']

function boot(battle, label) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const H = w.__battleView.harness; H.playExport(battle, label)
  /* past: the page's own timers run on (a hitstop holds the bodies with the tokens until its timer ends - board.js hitstop) */
  return { w, H, v: H.viewer, V: H.viewer._V, past: (ms = 800) => w._flush(ms) }
}
/* a stand-in body: a 1.7 m box on a hip bone; its death lays the hip flat (tools/character-models.test.mjs) */
function standIn(look, { death = true } = {}) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; box.name = 'Body'; hip.add(box)
  const still = (name, secs = 1) => new THREE.AnimationClip(name, secs, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, secs], [0, 0, 0, 0, 0, 0])])
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const clips = {}
  for (const k of Object.keys(look.motions)) { if (k === 'death' && !death) continue
    clips[k] = k === 'death' ? new THREE.AnimationClip('death', 1, [new THREE.QuaternionKeyframeTrack(look.pivot + '.quaternion', [0, 1], [0, 0, 0, 1, ...flat.toArray()])]) : still(k, k === 'idle' || k === 'move' ? 2 : .8) }
  return { look, scene, clips, props: [] }
}
function castFor(V, opts = {}) {
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: async look => standIn(look, { death: !(opts.noDeath || []).includes(look.id) }), readStyle: el => el.style })
  V.cast = cast
  return cast
}
const settle = () => new Promise(r => setImmediate(r))
const ready = async cast => { cast.frame(0); await settle(); await settle(); cast.frame(0) }
const LOW = .45                                     // of its standing height: lying (tools/character-models.test.mjs's own line)
const lies = B => B.motion === 'death' && B.lying() && B.height() < LOW * B.standingHeight()
const stands = B => B.motion !== 'death' && B.height() > .9 * B.standingHeight()
/** the unit's token as drawn: is it on the board, are its bar and marks shown, is its picture the model's */
const token = (V, id) => { const E = V.layers.UEL.get(id); return { shown: E.root.style.display !== 'none', bars: E.badges.style.display !== 'none', picture: E.img.style.opacity !== '0', tipped: /rotate\(-62deg\)/.test(E.img.style.transform), prone: E.root.classList.contains('tokProne') } }

/** the engine's lines for a knockdown and for the Stand Up that ends it, as the Orphanage's log holds them, for another unit */
const DOWN = orphanage.events.findIndex(e => e.type === 'unit.proned'), UP = orphanage.events.findIndex(e => e.type === 'unit.stood')
/** the lines `which` of the Orphanage's log, rewritten for each unit of `ids` and put in at `at` (the turn and phase of the line there) */
function withLines(events, at, ids, which) {
  const src = orphanage.events, like = events[at], enter = id => events.find(e => e.type === 'unit.enter' && e.actor === id)
  const lines = ids.flatMap((id, n) => which.map((i, k) => { const e = src[i]
    return { ...e, seq: 90000 + at * 100 + n * 10 + k, turn: like.turn, phase: like.phase, ...(e.target != null ? { target: id } : {}), ...(e.actor != null ? { actor: id } : {}), ...(e.hex != null ? { hex: enter(id).hex } : {}) } }))
  const out = events.slice(); out.splice(at, 0, ...lines)
  return out
}

test('the Orphanage, the engine\'s own log: the Orphan Child falls as the knockdown lands, lies through the enemy\'s turn with its bar shown, and rises at Stand Up', async () => {
  const EV = orphanage.events
  assert.deepEqual([EV[DOWN - 2].type, EV[DOWN - 1].type, EV[DOWN].type], ['kdb.rolled', 'status.applied', 'unit.proned'], 'a failed knockdown roll, the prone status, the going-down')
  assert.equal(EV[DOWN - 2].applied, 'down'); assert.equal(EV[DOWN].statusId, 'status.prone'); assert.deepEqual([EV[UP - 1].type, EV[UP].type, EV[UP].causeId], ['status.expired', 'unit.stood', 'power.stand-up'])
  const child = EV[DOWN].target; assert.equal(EV.find(e => e.type === 'unit.enter' && e.actor === child).typeId, 'hero.fixed.orphans')
  assert.ok(EV.slice(DOWN, UP).some(e => e.type === 'activation.begin' && EV.find(x => x.type === 'unit.enter' && x.actor === e.actor).side === 'enemy'), 'the enemy acts while it is down')
  const { H, v, V, past } = boot(orphanage, 'prone'), cast = castFor(V)
  v.seek(DOWN); await ready(cast)
  const B = cast.body(child); assert.ok(B && cast.shows(child), 'the Orphan Child is its body')
  assert.ok(stands(B), 'standing before the knockdown lands'); assert.equal(B.motion, 'idle')
  const at0 = B.stage.position.clone()
  /* played: the knockdown lands -> the fall starts, from its start, and ends lying */
  v.step(); cast.frame(.05)
  assert.equal(V.S.U[child].life, 'standing', 'knocked down is not dead: the fold still says standing'); assert.deepEqual(V.S.U[child].prone, ['status.prone'])
  assert.equal(B.motion, 'death', 'the body goes down with the pose the dead end in'); assert.equal(B.lying(), false, 'it falls, then lies')
  cast.frame(2); assert.ok(lies(B), 'lying on the ground')
  assert.ok(B.stage.position.distanceTo(at0) < 1e-6, 'at the living unit\'s place'); assert.equal(cast.body(child), B, 'the same body')
  V.render()
  let t = token(V, child); assert.ok(t.shown && t.bars, 'its health bar and status marks are still shown'); assert.equal(t.picture, false, 'the picture is the body\'s')
  assert.equal(V.layers.UEL.get(child).root.style.opacity, '1')
  /* it stays down through everything that follows, while the fold says prone: the enemy's turn and its own Activation's start
     (a step of the pump plays a group of lines) */
  let checked = 0, enemyActed = false
  while (v.cursor < UP - 3) { v.step(); cast.frame(.3); if (!V.S.U[child].prone) break
    assert.ok(lies(B), `still lying at event ${v.cursor - 1} (${EV[v.cursor - 1].type})`); checked++
    if (V.S.activeId != null && V.S.U[V.S.activeId]?.side === 'enemy') enemyActed = true }
  assert.ok(checked > 8 && enemyActed, 'through the enemy turn'); assert.deepEqual(V.S.U[child].prone, ['status.prone'], 'still prone at its own Activation')
  /* Stand Up: it rises */
  while (v.cursor <= UP) v.step()
  cast.frame(.05); assert.equal(V.S.U[child].prone, null); assert.notEqual(B.motion, 'death', 'it rises at Stand Up'); assert.equal(B.lying(), false)
  past(); cast.frame(1); assert.ok(stands(B), 'standing again')
  /* a seek lands on the pose, either side: lying in the middle, standing before and after */
  v.seek(DOWN + 10); cast.frame(0); assert.ok(lies(B), 'sought into the middle: lying, no fall played')
  v.seek(DOWN - 5); cast.frame(0); assert.ok(stands(B), 'sought before: standing'); v.seek(UP + 2); cast.frame(0); assert.ok(stands(B), 'sought after: standing')
  H.dispose()
})

test('battle 2: the Lumberjack\'s Wife, a hero and a Skeleton Archer knocked down lie on the ground with their bars shown and rise at Stand Up', async () => {
  const enter = lumberjack.events.filter(e => e.type === 'unit.enter'), idOf = typeId => enter.find(e => e.typeId === typeId).actor
  const wife = idOf('hero.fixed.lumberjacks-wife'), hero = idOf('hero.base.ranger-scantily'), skeleton = idOf('unit.skeletal-archer')
  /* once all three are on the board (the Skeleton Archer arrives mid-battle): the next Activation's start */
  const arrived = lumberjack.events.findIndex(e => e.type === 'unit.enter' && e.actor === skeleton)
  const at = lumberjack.events.findIndex((e, i) => i > arrived && e.type === 'activation.begin'), later = lumberjack.events.findIndex((e, i) => i > at + 12 && e.type === 'activation.begin')
  /* the three stand where a later Activation begins (the later lines go in first, so the earlier place does not move) */
  const ids = [wife, hero, skeleton], standAt = later + 2 * ids.length
  const events = withLines(withLines(lumberjack.events, later, ids, [UP - 1, UP]), at, ids, [DOWN - 1, DOWN])
  assert.deepEqual(events.slice(at, at + 6).map(e => e.type), ['status.applied', 'unit.proned', 'status.applied', 'unit.proned', 'status.applied', 'unit.proned'])
  assert.deepEqual(events.slice(standAt, standAt + 6).map(e => e.type), ['status.expired', 'unit.stood', 'status.expired', 'unit.stood', 'status.expired', 'unit.stood'])
  const { H, v, V, past } = boot({ ...lumberjack, events }, 'battle 2, three knocked down'), cast = castFor(V)
  v.seek(at); await ready(cast)
  const bodies = Object.fromEntries([['the Lumberjack\'s Wife', wife], ['the hero', hero], ['the Skeleton Archer', skeleton]].map(([n, id]) => [n, { id, B: cast.body(id) }]))
  for (const [n, { id, B }] of Object.entries(bodies)) { assert.ok(B && cast.shows(id), n + ' is its body'); assert.ok(stands(B), n + ' stands') }
  while (v.cursor < at + 6) v.step()
  assert.equal(v.cursor, at + 6, 'the six knockdown lines played, and no line after them'); cast.frame(.05)
  for (const [n, { B }] of Object.entries(bodies)) { assert.equal(B.motion, 'death', n + ' goes down'); assert.equal(B.lying(), false, n + ' falls first') }
  cast.frame(2); V.render()
  for (const [n, { id, B }] of Object.entries(bodies)) {
    assert.ok(lies(B), n + ' lies on the ground'); assert.equal(V.S.U[id].life, 'standing', n + ' is not dead')
    const t = token(V, id); assert.ok(t.shown && t.bars, n + ': the health bar and marks are still shown')
  }
  /* through the lines that follow - Activations of both sides - they stay down; walking tokens do not stand them up */
  let steps = 0
  while (v.cursor < standAt) { v.step(); cast.frame(.3); if (v.cursor > standAt) break; steps++
    for (const [n, { B }] of Object.entries(bodies)) assert.ok(lies(B), `${n} still lies at event ${v.cursor - 1} (${events[v.cursor - 1].type})`) }
  assert.ok(steps > 3, 'others acted meanwhile')
  while (v.cursor < standAt + 6) v.step()
  cast.frame(.05)
  for (const [n, { id, B }] of Object.entries(bodies)) { assert.equal(V.S.U[id].prone, null, n + ' stood'); assert.notEqual(B.motion, 'death', n + ' rises'); assert.equal(B.lying(), false) }
  past(); cast.frame(1)
  for (const [n, { B }] of Object.entries(bodies)) assert.ok(stands(B), n + ' stands again')
  H.dispose()
})

test('not dead: a dead unit has no bar; a lying unit struck stays lying; one killed where it lies does not fall again', async () => {
  const { H, v, V } = boot(orphanage, 'prone'), cast = castFor(V), EV = orphanage.events, child = EV[DOWN].target
  /* a dead unit still looks dead: its token (ring, bar, marks) has left the board, its body lies at its corpse */
  const died = EV.findIndex(e => e.type === 'corpse.created' && e.typeId === 'unit.zombie')
  v.seek(died + 1); await ready(cast); V.render()
  const dead = EV[died].of; assert.equal(V.S.U[dead].life, 'dead'); assert.equal(token(V, dead).shown, false, 'a dead unit has no bar'); assert.ok(lies(cast.body(dead)), 'and lies')
  /* lying, struck: the body keeps the ground - no hit reaction stands it up, no strike of its own, no shield raised */
  v.seek(DOWN + 3); cast.frame(0); const B = cast.body(child); assert.ok(lies(B))
  assert.equal(cast.flinch(child), false, 'a lying body plays no hit reaction'); cast.frame(.3); assert.ok(lies(B))
  const foe = Object.values(V.S.U).find(u => u.side === 'enemy' && u.life === 'standing').id
  cast.strike(child, foe, 'melee'); cast.frame(.3); assert.ok(lies(B), 'its own blow does not stand it up'); cast.guard(child); cast.frame(.3); assert.ok(lies(B))
  /* a walking token does not walk a lying body */
  const E = V.layers.UEL.get(child); E.walk = { playState: 'running' }; cast.frame(.1); assert.ok(lies(B), 'shoved along the ground, it does not walk'); E.walk = null; cast.frame(.1); assert.ok(lies(B))
  /* killed where it lies: the blow's fall (cast.fall) and the fold's death change nothing it shows - it does not get up to fall again */
  assert.equal(cast.fall(child), true); cast.frame(.1); assert.ok(lies(B), 'the blow that kills it: it lies as it lay')
  V.S.U[child].life = 'dead'; cast.frame(.1); assert.equal(B.motion, 'death'); assert.ok(B.lying(), 'dead, it lies as it lay')
  H.dispose()
})

test('no death pose: a unit with no body, and a body with no death motion, show the tipped token as before - and are listed', async () => {
  /* a body whose look holds no death motion: the Orphan Child's stand-in is given none */
  const look = A.lookFor(pack['hero.fixed.orphans'], orphanage.events[DOWN].target).id
  { const { H, v, V } = boot(orphanage, 'prone'), cast = castFor(V, { noDeath: [look] }), child = orphanage.events[DOWN].target
    v.seek(DOWN); await ready(cast); V.render()
    assert.ok(cast.shows(child), 'standing, it is its body'); assert.equal(token(V, child).picture, false)
    v.step(); cast.frame(.1); V.render()
    assert.equal(cast.shows(child), false, 'prone with no death pose: the body gives way'); assert.equal(cast.body(child).stage.visible, false)
    let t = token(V, child); assert.ok(t.picture && t.tipped && t.prone && t.bars, 'the tipped token it showed before, bar and marks with it')
    v.seek(UP + 1); cast.frame(0); V.render()
    assert.ok(cast.shows(child) && cast.body(child).stage.visible, 'standing again, the body is back'); t = token(V, child); assert.equal(t.picture, false); assert.equal(t.tipped, false)
    H.dispose() }
  /* a unit with no body at all (its type unbound): the token tips, as it did */
  { const { H, v, V } = boot(orphanage, 'prone'); V.data.models = Object.fromEntries(Object.entries(V.data.models).filter(([t]) => t !== 'hero.fixed.orphans'))
    const cast = castFor(V), child = orphanage.events[DOWN].target
    v.seek(DOWN + 1); await ready(cast); V.render()
    assert.equal(cast.shows(child), false); const t = token(V, child); assert.ok(t.picture && t.tipped && t.prone && t.bars, 'the prone token of 2026-09-23')
    H.dispose() }
  /* THE LIST the report carries: every body with no death motion, and every unit the six opening battles field with no body */
  const noDeath = Object.values(pack).flatMap(b => b.looks.filter(l => !l.motions.death).map(l => `${b.typeId} (${l.id})`))
  const fielded = new Set(OPENING.flatMap(n => load(`battles/test.opening-${n}.json`).events.filter(e => e.type === 'unit.enter').map(e => e.typeId)))
  const noBody = [...fielded].filter(t => !pack[t]).sort()
  console.log(`# bodies with no death pose (they show the prone token): ${noDeath.join(', ') || 'none'}`)
  console.log(`# units of the six opening battles with no body (they show the prone token): ${noBody.join(', ') || 'none'}`)
  assert.deepEqual(noDeath, [], 'every bound body has a death motion today; a new one without is a body to list for art')
  for (const t of ['hero.fixed.lumberjacks-wife', 'hero.fixed.orphans', 'unit.skeletal-archer', 'unit.skeleton', 'unit.zombie', 'unit.soldier']) assert.ok(pack[t], t + ' has a body')
})
