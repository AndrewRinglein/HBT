// viewer.shots-fly-straight (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post answered:
// ... everything flies straight ...'). Andrew: "Arrows fly in an overhead arc to hit an enemy. They should be a straight line
// from where the bow is pointed." - asked whether thrown weapons keep their arc: "No, everything should go straight for 4."
// Every projectile the board draws went through one driver (src/hexvfx.js flight) that lifted it over an arc - at least 50 px
// high, more with distance. Asked here of the page's own modules (the effects library and the board, as the page bundles them):
//   the path    - a Longbow's shot, a Javelin's throw and a Pile of Rocks' throw (each the projectile the board flies for that
//                 attack's own row), and every other projectile the board has, sampled at three points of the flight and at
//                 its ends: all on one straight line from where it leaves the attacker to the target's body;
//   the timing  - the 2026-10-03 timing stands: each flight takes what it took, gathers as long as it gathered, and is AT the
//                 target when it ends, so the hit, the recoil and the slash still land as the projectile arrives;
//   the release - it leaves from what the attacker's body holds (the bow, the thrown weapon's hand) where the body has such
//                 a place, else from the unit's chest; a shot from a height or over a blocker is the same straight line.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as VFX from '../src/hexvfx.js'
import * as BOARD from '../src/board.js'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const { FLIGHTS, bodyY } = VFX

/** an effects canvas that keeps what is added to it: [{dur, frame}] */
const canvas = () => { const added = []; return { added, add(dur, frame, sortY) { added.push({ dur, frame, sortY }); return new Promise(() => {}) }, clear() {} } }
/** a 2D context that notes where things are drawn: every translate, arc and lineTo */
function pen() {
  const at = []
  const ctx = new Proxy({}, { get: (o, k) => k === 'at' ? at
    : k === 'translate' ? (x, y) => at.push({ k, x, y }) : k === 'arc' ? (x, y) => at.push({ k, x, y }) : k === 'lineTo' ? (x, y) => at.push({ k, x, y })
    : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : typeof k === 'string' && k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true } })
  return ctx
}
/** where the projectile's core is drawn at the fraction `t` of the flight's whole time: the first place the frame draws at */
function coreAt(F, t) { const ctx = pen(), P = []; F.frame(ctx, 1448, 780, t, t * F.dur, P, 16); const p = ctx.at[ctx.at.length ? 0 : -1]; return p ? { x: p.x, y: p.y } : null }
/** distance of a point from the line a-b */
const off = (p, a, b) => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y)
const TOL = 1.5                                       // px: a small tolerance (the drawn core is within a pixel and a half of the line)
/** the projectile the board flies for an attack of this kind and damage type (src/board.js fxAttack's own choice) */
const FLY = { arrow: VFX.playArrowFlight, magic: VFX.playMagicBoltFlight, holy: VFX.playHolyBoltFlight }
const flightFor = row => row.attack.kind !== 'ranged' ? null : row.attack.damageType === 'magic' ? 'magic' : row.attack.damageType === 'true' ? 'holy' : 'arrow'

/** fly one projectile from an attacker to a target and sample it: the line it should keep, and where it is at each sample */
function sample(which, from, to) {
  const fx = canvas(); (which === 'fireball' ? VFX.playFireballFlight : FLY[which])(fx, from, to, 'med')
  assert.equal(fx.added.length, 1, which + ' adds one flight to the canvas'); const F = fx.added[0]
  const windup = which === 'fireball' ? .28 : FLIGHTS[which].windup
  const a = { x: from.x, y: from.sy ?? bodyY(from) }, b = { x: to.x, y: bodyY(to) }
  const points = [.25, .5, .75].map(u => coreAt(F, windup + u * (1 - windup)))
  return { F, a, b, points, start: coreAt(F, windup + 1e-6), end: coreAt(F, 1), windup }
}
/* a level shot, a shot from a height (the attacker far above on the screen), one across a blocker (the line is the same), a short one */
const SHOTS = { 'level, far': [{ x: 220, y: 520, h: 132 }, { x: 1180, y: 540, h: 132 }], 'from a height': [{ x: 300, y: 180, h: 132 }, { x: 980, y: 660, h: 120 }],
  'steep and near': [{ x: 700, y: 300, h: 132 }, { x: 760, y: 420, h: 90 }], 'right to left': [{ x: 1200, y: 400, h: 132 }, { x: 260, y: 360, h: 132 }] }

test('a Longbow shot, a Javelin throw and a Pile of Rocks throw each travel a straight line from the attacker to the target', () => {
  const three = { 'the Longbow\'s Shot': 'attack.longbow.shot', 'the Javelin\'s Throw': 'attack.javelin.throw', 'the Pile of Rocks\' Throw': 'attack.pile-of-rocks.throw' }
  for (const [name, id] of Object.entries(three)) {
    const row = STATIC.actions[id]; assert.ok(row && row.attack, id + ' is an attack of the engine\'s'); const which = flightFor(row)
    assert.ok(which, name + ' is a ranged attack: the board flies a projectile for it')
    assert.equal(BOARD.flightOf(row.attack.kind, row.attack.damageType), FLIGHTS[which], 'and it is the flight the pump times')
    for (const [shot, [from, to]] of Object.entries(SHOTS)) {
      const s = sample(which, from, to)
      for (const [k, p] of s.points.entries()) { assert.ok(p, `${name}, ${shot}: drawn at sample ${k + 1}`)
        assert.ok(off(p, s.a, s.b) <= TOL, `${name}, ${shot}: sample ${k + 1} is ${off(p, s.a, s.b).toFixed(1)} px off the straight line from the attacker to the target`) }
      /* in order along it, from the attacker toward the target */
      const along = p => ((p.x - s.a.x) * (s.b.x - s.a.x) + (p.y - s.a.y) * (s.b.y - s.a.y)) / ((s.b.x - s.a.x) ** 2 + (s.b.y - s.a.y) ** 2)
      const u = s.points.map(along); assert.ok(0 < u[0] && u[0] < u[1] && u[1] < u[2] && u[2] < 1, `${name}, ${shot}: it goes from the attacker to the target (${u.map(x => x.toFixed(2)).join(', ')})`)
    }
    console.log(`# ${name} (${id}: ${row.attack.kind}, ${row.attack.damageType}) flies as the ${which}: three samples of each of ${Object.keys(SHOTS).length} shots within ${TOL} px of the straight line`)
  }
})

test('every projectile the board has flies straight: arrows, magic bolts, holy bolts and fireballs, level or from a height', () => {
  for (const which of ['arrow', 'magic', 'holy', 'fireball']) for (const [shot, [from, to]] of Object.entries(SHOTS)) {
    const s = sample(which, from, to)
    for (const [k, p] of [s.start, ...s.points, s.end].entries()) { assert.ok(p, `${which}, ${shot}: drawn at point ${k}`); assert.ok(off(p, s.a, s.b) <= TOL, `${which}, ${shot}: point ${k} is ${off(p, s.a, s.b).toFixed(1)} px off the line`) }
  }
  /* and there is no lift left in the driver: a flight's highest point is no higher than its higher end */
  for (const which of ['arrow', 'magic', 'holy', 'fireball']) { const [from, to] = SHOTS['level, far'], s = sample(which, from, to)
    const top = Math.min(...[s.start, ...s.points, s.end].map(p => p.y)); assert.ok(top >= Math.min(s.a.y, s.b.y) - TOL, `${which}: no arc over the line (highest ${top.toFixed(0)}, the ends ${s.a.y.toFixed(0)} and ${s.b.y.toFixed(0)})`) }
})

test('the timing stands: each flight takes what it took, and the projectile is at the target\'s body when it ends', () => {
  assert.deepEqual(FLIGHTS, { arrow: { ms: 320, windup: 0 }, magic: { ms: 720, windup: 0.3 }, holy: { ms: 780, windup: 0.34 } }, 'the flights\' times and gatherings are the 2026-10-03 ones')
  for (const which of ['arrow', 'magic', 'holy']) for (const [shot, [from, to]] of Object.entries(SHOTS)) {
    const s = sample(which, from, to)
    assert.equal(s.F.dur, FLIGHTS[which].ms, `${which}: in the air as long as before`)
    assert.ok(Math.hypot(s.end.x - s.b.x, s.end.y - s.b.y) <= TOL, `${which}, ${shot}: at the target's body when the flight ends (${Math.hypot(s.end.x - s.b.x, s.end.y - s.b.y).toFixed(1)} px away)`)
    assert.ok(Math.hypot(s.start.x - s.a.x, s.start.y - s.a.y) <= 2 * TOL, `${which}, ${shot}: it leaves from the attacker`)
    /* while it gathers it has not left */
    if (s.windup > 0) { const g = coreAt(s.F, s.windup / 2); if (g) assert.ok(Math.hypot(g.x - s.a.x, g.y - s.a.y) <= 60, `${which}: it gathers at the attacker`) }
  }
  /* the pump's own reading of a flight is unchanged: the same three, by kind and damage type; a blow flies none */
  assert.equal(BOARD.flightOf('melee', 'physical'), null); assert.equal(BOARD.flightOf('ranged', 'physical'), FLIGHTS.arrow); assert.equal(BOARD.flightOf('ranged', 'magic'), FLIGHTS.magic); assert.equal(BOARD.flightOf('ranged', 'true'), FLIGHTS.holy)
})

test('it leaves from what the attacker\'s body holds where the body has such a place, else from the unit\'s chest', () => {
  /* the driver takes the place it is given (an anchor's own release height) and keeps the line from there */
  const from = { x: 300, y: 500, h: 132, sy: 395 }, to = { x: 900, y: 520, h: 132 }, s = sample('arrow', from, to)
  assert.equal(s.a.y, 395, 'the release height the anchor names'); assert.ok(Math.hypot(s.start.x - 300, s.start.y - 395) <= 2 * TOL, 'the arrow starts at the place named')
  for (const p of s.points) assert.ok(off(p, { x: 300, y: 395 }, s.b) <= TOL)
  /* with no such place: the chest, as before */
  const plain = sample('arrow', { x: 300, y: 500, h: 132 }, to); assert.equal(plain.a.y, bodyY({ x: 300, y: 500, h: 132 }))
  /* the board asks the attacker's body: what it holds (the cast's heldAt, a point of the scene) seen through the camera, in the canvas's own px */
  assert.equal(typeof BOARD.releaseOf, 'function', 'src/board.js exports releaseOf')
  const rect = (l, t, w, h) => ({ getBoundingClientRect: () => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h }), clientWidth: w, clientHeight: h })
  const camera = { userData: { viewport: { w: 1448, h: 780 } } }, world = { clone() { return { project: () => ({ x: -.5, y: .25, z: .4 }) } } }
  const V = (held, cam = camera) => ({ cast: { heldAt: id => id === 7 ? held : null }, camera3d: cam, dom: { canvas: rect(0, 0, 1448, 780) }, layers: { UEL: new Map([[7, { root: rect(340, 470, 0, 0), img: rect(300, 340, 80, 132) }]]) } })
  const R = BOARD.releaseOf(V(world), 7)
  assert.ok(R, 'a body that holds something gives the place'); assert.ok(Math.abs(R.x - 362) < .5 && Math.abs(R.sy - 292.5) < .5, `the held thing's place on the screen: (${R.x}, ${R.sy})`)
  assert.equal(R.y, 470, 'the unit\'s feet are still the token\'s (the effect sorts by them)'); assert.equal(R.h, 132)
  /* the canvas shown at another size (the screen scaled to fit): the place scales with it */
  const half = V(world); half.dom.canvas = rect(0, 0, 724, 390); half.dom.canvas.clientWidth = 1448; half.dom.canvas.clientHeight = 780
  const H = BOARD.releaseOf(half, 7); assert.ok(Math.abs(H.x - 181) < .5 && Math.abs(H.sy - 146.25) < .5, `scaled with the canvas: (${H.x}, ${H.sy})`)
  /* a body that holds nothing, a unit with no body, a board with no 3D camera: no place - the chest it is */
  assert.equal(BOARD.releaseOf(V(null), 7), null); assert.equal(BOARD.releaseOf(V(world), 9), null); assert.equal(BOARD.releaseOf(V(world, null), 7), null)
  assert.equal(BOARD.releaseOf({ dom: {}, layers: { UEL: new Map() } }, 7), null)
})


test('the cast says where what a body holds is: the bow of the Forest Elf, on her own approved body; a body that holds nothing gives none', async () => {
  const A = await modules(), html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const H = w.__battleView.harness; H.playExport(battle1, 'orphanage'); const v = H.viewer, V = v._V
  /* the real files: the pack's own hashes, as tools/weapons-in-hand.test.mjs loads them */
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }, files = new Map()
  const fetch = async url => { const p = new URL(url).pathname; if (!files.has(p)) files.set(p, readFileSync('..' + p)); const b = files.get(p); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
  const cast = A.createCast(V, new THREE.Scene(), A.paintedToCSS(V.data.atlas).invert(), { load: look => A.loadLook(look, { location, fetch, textures: false }), readStyle: el => el.style }); V.cast = cast
  v.seek(battle1.events.findIndex(e => e.type === 'battle.begin') + 1); cast.frame(0)
  await cast.settle(); cast.frame(0)
  const elf = Object.values(V.S.U).find(u => u.typeId === 'hero.base.ranger-scantily'), zombie = Object.values(V.S.U).find(u => u.typeId === 'unit.zombie')
  const B = cast.body(elf.id); assert.ok(B, 'the Forest Elf stands as her body'); assert.ok(B.look.props.some(p => p.model === 'bow'), 'and holds a bow')
  assert.equal(typeof cast.heldAt, 'function', 'the cast says where what a body holds is')
  const at = cast.heldAt(elf.id); assert.ok(at && at.isVector3, 'the place of the bow in the scene')
  let socket = null; B.stage.traverse(o => { if (!socket && o.name.startsWith('held:')) socket = o }); B.stage.updateMatrixWorld(true)
  assert.ok(at.distanceTo(new THREE.Vector3().setFromMatrixPosition(socket.matrixWorld)) < 1e-6, 'it is the socket of the held model on her hand')
  const p = B.stage.position, tall = B.standingHeight()
  assert.ok(at.y > p.y + .25 * tall && at.y < p.y + 1.05 * tall, 'at the height of a hand on her: ' + ((at.y - p.y) / tall).toFixed(2) + ' of her height'); assert.ok(Math.hypot(at.x - p.x, at.z - p.z) < tall, 'within her reach')
  assert.equal(cast.heldAt(zombie.id), null, 'a Zombie holds nothing: its shot would leave from its chest'); assert.equal(cast.heldAt(9999), null)
  H.dispose()
})
