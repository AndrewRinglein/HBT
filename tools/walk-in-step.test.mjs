// viewer.walk-in-step (engine backlog; engine DECISIONS.md 2026-10-01, Andrew: "when the characters are moving on the map,
// they're not actually walking or moving. They just slide across. The whole idea of adding in a walking animation is so they
// use it." · "The walking isn't very well timed or spaced based on the number of tiles that are being moved."). Expect: "In
// the Orphanage and the Bridge a hero walking N hexes plays its walk clip throughout, and its feet advance one stride per
// stride length (no slide); the traversal's duration grows with N; a flier flies." Runs against the page (VIEWER_PAGE, else
// BATTLE-VIEWER.html), the page's own modules, and the approved model files themselves — the real clips, not stand-ins.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
const A = await modules()
const orphanage = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const bridge = JSON.parse(readFileSync('battles/test.opening-bridge.json', 'utf8'))

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
const typeOf = (b, id) => b.events.find(e => e.type === 'unit.enter' && e.actor === id)?.typeId
/* the hexes a move walks: its consecutive `moved` events (a flight's one landing is paced by the engine's `hexes`) */
const walked = (b, i) => { let n = 0; for (let j = i + 1; j < b.events.length; j++) { const x = b.events[j]; if (x.type === 'moved' && x.actor === b.events[i].actor) n++; else if (x.type === 'moved' || x.type === 'move.begin' || x.type === 'activation.begin') break } return n }
const moves = (b, pred) => b.events.map((e, i) => [e, i]).filter(([e, i]) => e.type === 'move.begin' && pred(e, i)).map(([, i]) => i)

/* the real bodies, from the approved files on disk */
const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const loads = new Map()
const load = look => { if (!loads.has(look.id)) loads.set(look.id, A.loadLook(look, { location, fetch, textures: false })); return loads.get(look.id) }
async function standAt(w, i) {
  const V = w.__battleView.harness.viewer._V, scene = new THREE.Scene()
  const cast = A.createCast(V, scene, A.paintedToCSS(V.data.atlas).invert(), { load, readStyle: el => el.style })
  V.cast = cast; w.__battleView.harness.viewer.seek(i); cast.frame(0); await cast.settle(); cast.frame(0)
  return { V, cast, scene }
}
const feetOf = stage => { const f = []; stage.traverse(o => { if (o.isBone && /foot(l|r|left|right)?$/.test(o.name.replace(/[^a-z]/gi, '').toLowerCase())) f.push(o) }); return f }
const px = s => parseFloat(s)

/* walk the token along the pump's own keyframes under an eased clock (smoothstep — not the board's curve, so nothing here
   depends on which easing the board picks), a frame at a time, and watch the body */
function walk(V, cast, id, { fps = 60 } = {}) {
  const E = V.layers.UEL.get(id), a = E.walk, B = cast.body(id)
  assert.ok(a && a.opts.duration > 0, 'the board started a traversal')
  const kf = a.kf.map(k => ({ x: px(k.left), y: px(k.top), o: k.offset })), dur = a.opts.duration / 1000, dt = 1 / fps
  const at = p => { let j = 1; while (j < kf.length - 1 && kf[j].o < p) j++; const A0 = kf[j - 1], A1 = kf[j], f = A1.o > A0.o ? (p - A0.o) / (A1.o - A0.o) : 1; return { x: A0.x + (A1.x - A0.x) * f, y: A0.y + (A1.y - A0.y) * f } }
  const feet = feetOf(B.stage)
  const frames = Math.round(dur * fps), rows = []
  let clip = 0, metres = 0, prevT = null, prev = B.stage.position.clone()
  const prevFeet = feet.map(f => new THREE.Vector3().setFromMatrixPosition(f.matrixWorld))
  for (let k = 1; k <= frames; k++) {
    const t = k / frames, p = at(t * t * (3 - 2 * t))
    E.root.style.left = p.x + 'px'; E.root.style.top = p.y + 'px'
    cast.frame(dt)
    const motion = B.motion, now = B.stage.position.clone(), step = Math.hypot(now.x - prev.x, now.z - prev.z)
    const time = B.clipTime(motion), len = B.clipLength(motion)
    if (prevT !== null && time !== null) { let d = time - prevT; if (d < -len / 2) d += len; clip += d }
    prevT = time; metres += step
    const fw = feet.map(f => new THREE.Vector3().setFromMatrixPosition(f.matrixWorld))
    /* each foot's travel along the body's own heading this frame: a planted foot's is nil */
    const ux = (now.x - prev.x) / (step || 1), uz = (now.z - prev.z) / (step || 1)
    rows.push({ t, motion, step, feet: fw.map((q, j) => ({ y: q.y, v: (q.x - prevFeet[j].x) * ux + (q.z - prevFeet[j].z) * uz })) })
    fw.forEach((q, j) => prevFeet[j].copy(q)); prev.copy(now)
  }
  a.finish(); cast.frame(dt)
  assert.ok(feet.length >= 2, 'the body has two feet to stand on')
  return { rows, clip, metres }
}
/* the slide: the standing foot (the lower of the two) travels along the body's heading as a fraction of the body's own travel —
   nil when it is planted; ~0.9 when the clip plays at its own pace under a board-paced token (measured 2026-10-01). The middle
   half of the walk, past the crossfades; the median, as a hex path turns the body at every corner */
function slide({ rows }) {
  const mid = rows.filter(r => r.t > .25 && r.t < .75 && r.step > 1e-4), ratios = []
  for (const r of mid) { const f = r.feet.reduce((lo, x) => x.y < lo.y ? x : lo); ratios.push(f.v / r.step) }
  ratios.sort((x, y) => x - y)
  return ratios.length ? Math.abs(ratios[ratios.length >> 1]) : null
}

test('the traversal takes the same time per hex walked: it grows with N, no floor and no ceiling', () => {
  for (const [hash, b] of [['#map.opening.orphanage', orphanage], ['#map.opening.bridge', bridge]]) {
    const w = boot(hash), v = w.__battleView.harness.viewer, V = v._V, seen = new Map()
    for (const i of moves(b, e => typeOf(b, e.actor)?.startsWith('hero.'))) {
      const n = walked(b, i); if (!n || seen.has(n)) continue
      v.pause(); v.seek(i); v.step()
      const a = V.layers.UEL.get(b.events[i].actor).walk
      seen.set(n, a.opts.duration)
    }
    const ns = [...seen.keys()].sort((x, y) => x - y)
    assert.ok(ns.length >= 3, `${hash}: heroes walk at least three different lengths (${ns})`)
    const per = seen.get(ns[0]) / ns[0]
    for (const n of ns) assert.equal(seen.get(n), per * n, `${hash}: a ${n}-hex walk takes ${n} × ${per} ms`)
    /* the old clamp held every walk inside 320–900 ms; a hex now takes long enough for a stride to be seen */
    assert.ok(per * ns.at(-1) > 900 && per >= 300, `${hash}: ${ns.at(-1)} hexes in ${per * ns.at(-1)} ms`)
    w.__battleView.harness.dispose()
  }
})

for (const [label, hash, b, type] of [
  ['the Orphanage: the ranger (the archer look\'s walk forward, root motion)', '#map.opening.orphanage', orphanage, 'hero.base.ranger-scantily'],
  ['the Orphanage: the School Teacher (an in-place walk)', '#map.opening.orphanage', orphanage, 'hero.fixed.school-teacher'],
  ['the Bridge: the armoured priest (the oathblade\'s walk forward)', '#map.opening.bridge', bridge, 'hero.base.priest-armored'],
]) test(`${label} walks its clip throughout, its feet on the ground`, async () => {
  const i = moves(b, e => typeOf(b, e.actor) === type).sort((x, y) => walked(b, y) - walked(b, x))[0]
  assert.ok(i >= 0, `${type} walks`)
  const n = walked(b, i), w = boot(hash), { V, cast } = await standAt(w, i), id = b.events[i].actor
  const B = cast.body(id); assert.ok(B, `${type} is its body`); assert.equal(B.motion, 'idle')
  const g = B.gait('move'); assert.ok(g > .3 && g < 2.5, `${type}: its walk clip carries it ${g} m/s — a walking pace`)
  w.__battleView.harness.viewer.step()
  const r = walk(V, cast, id)
  /* throughout: the walk clip from the first frame the token moves to its arrival */
  assert.ok(r.rows.every(x => x.motion === 'move'), `${type} plays its walk clip for the whole ${n}-hex traversal`)
  assert.equal(B.motion, 'idle', 'and stands when it arrives')
  /* one stride per stride length: the clip advanced exactly the ground the body covered, at the clip's own stride */
  assert.ok(Math.abs(r.clip * g - r.metres) < .01 * r.metres, `${type}: ${r.metres.toFixed(2)} m walked, the clip covered ${(r.clip * g).toFixed(2)} m`)
  assert.ok(r.clip > B.clipLength('move') / 4, `${type}: more than a quarter of its walk cycle is seen (${r.clip.toFixed(2)} s of ${B.clipLength('move').toFixed(2)})`)
  /* no slide: a planted foot stays put on the ground while the body passes over it */
  const s = slide(r)
  assert.ok(s !== null && s < .2, `${type}: its standing foot slides at ${s?.toFixed(2)} of the body's speed`)
  w.__battleView.harness.dispose()
})

test('a flier flies: the Imp plays its flight for the whole traversal, paced by the engine\'s distance', async () => {
  const i = moves(bridge, e => e.causeId === 'power.flight' && typeOf(bridge, e.actor) === 'unit.imp' && e.hexes > 1)[0]
  assert.ok(i >= 0, 'the Bridge has an Imp flight of more than one hex')
  const w = boot('#map.opening.bridge'), { V, cast } = await standAt(w, i), id = bridge.events[i].actor, B = cast.body(id)
  const g = B.gait('flight'); assert.ok(g > 0, 'its flight clip carries it')
  w.__battleView.harness.viewer.step()
  const per = V.layers.UEL.get(id).walk.opts.duration / bridge.events[i].hexes
  const r = walk(V, cast, id)
  assert.ok(r.rows.every(x => x.motion === 'flight'), 'in the air the whole way')
  assert.ok(Math.abs(r.clip * g - r.metres) < .01 * r.metres, `the flight clip covered ${(r.clip * g).toFixed(2)} m of ${r.metres.toFixed(2)}`)
  assert.equal(B.motion, 'idle', 'landed')
  w.__battleView.harness.dispose()
  /* the same pace per hex as a walk */
  const w2 = boot('#map.opening.bridge'), v2 = w2.__battleView.harness.viewer, j = moves(bridge, e => typeOf(bridge, e.actor)?.startsWith('hero.'))[0]
  v2.pause(); v2.seek(j); v2.step()
  assert.equal(per, v2._V.layers.UEL.get(bridge.events[j].actor).walk.opts.duration / walked(bridge, j))
  w2.__battleView.harness.dispose()
})
