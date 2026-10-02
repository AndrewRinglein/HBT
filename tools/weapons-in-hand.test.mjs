// viewer.weapons-in-hand (engine backlog; engine DECISIONS.md 2026-10-01, Andrew: "The characters are not holding weapons. The
// whole idea of having 3D weapons is so they're holding weapons." · "we don't have weapons. I don't see any weapons."). Expect:
// "In the sandbox every hero whose kit names a weapon with a 3D model holds it in hand through idle, walk and attack; a weapon
// without a model is listed, not faked." Every base hero's look is stood up from the approved files themselves (the pack's
// hashes, the real clips) and each weapon is followed through the motions: it hangs from its hand bone, it is drawn, and its
// grip stays in the palm at every sampled frame.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels } from './character-models.mjs'
const A = await modules()
const pack = await packCharacterModels()
const heroes = Object.keys(pack).filter(t => t.startsWith('hero.base.'))

const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const files = new Map()
const fetch = async url => { const p = new URL(url).pathname; if (!files.has(p)) files.set(p, readFileSync('..' + p)); const b = files.get(p); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }

test('the pack: every base hero\'s look carries its kit\'s weapons, each with its file and hand; the rest are listed', () => {
  assert.ok(heroes.length > 20)
  const models = new Set()
  for (const t of heroes) for (const look of pack[t].looks) {
    for (const p of look.props) { assert.match(p.sha256, /^[0-9a-f]{64}$/); assert.ok(p.hand === 'R' || p.hand === 'L', `${t} ${p.item}`); models.add(p.model) }
    assert.ok(Array.isArray(look.unheld), `${t} lists what it cannot hold`)
  }
  assert.deepEqual([...models].sort(), ['axe', 'bow', 'dagger', 'greatsword', 'halberd', 'mace', 'magic-staff', 'shield', 'sword'])
  /* one look per held set: two heroes with different weapons never share a body's cache */
  const byId = new Map()
  for (const t of heroes) for (const look of pack[t].looks) {
    const sig = JSON.stringify(look.props.map(p => [p.path, p.node ?? null, p.hand]))
    assert.equal(byId.get(look.id) ?? sig, sig, `${look.id} is one held set`); byId.set(look.id, sig)
  }
})

test('every weapon hangs from its hand and stays in the palm through idle, walk and attack', async () => {
  const looks = new Map()
  for (const t of heroes) for (const look of pack[t].looks) if (look.props.length) looks.set(look.id, look)
  const V = () => new THREE.Vector3()
  for (const look of looks.values()) {
    const loaded = await A.loadLook(look, { location, fetch, textures: false })
    const body = A.createBody(loaded)
    assert.ok(Math.abs(body.standingHeight() - look.height) < 1e-6, `${look.id}: the weapons do not change its stature`)
    const held = look.props.map((p, i) => {
      let socket = null; body.stage.traverse(o => { if (o.name === `held:${i}:${p.item}`) socket = o })
      assert.ok(socket, `${look.id}: ${p.item} is on the body`)
      assert.equal(socket.parent?.name, `CC_Base_${p.hand}_Hand`, `${look.id}: ${p.item} hangs from the ${p.hand} hand`)
      let meshes = 0; socket.traverse(o => { if (o.isMesh) { meshes++; assert.ok(o.visible) } })
      assert.ok(meshes > 0, `${look.id}: ${p.item} is drawn`)
      return { p, socket, hand: socket.parent }
    })
    for (const motion of ['idle', 'move', 'attack', ...(look.motions.ranged ? ['ranged'] : [])]) {
      body.play('idle', { snap: true }); assert.ok(motion === 'idle' || body.play(motion), `${look.id} has ${motion}`)
      const len = body.clipLength(motion)
      for (let k = 0; k < 6; k++) {
        body.frame(k ? len / 6 : 0); body.stage.updateMatrixWorld(true)
        for (const { p, socket, hand } of held) {
          const box = new THREE.Box3().setFromObject(socket)
          assert.ok(!box.isEmpty() && box.max.distanceTo(box.min) > .1, `${look.id} ${motion}: ${p.item} has size`)
          /* the grip: the socket's origin, within a palm of the hand bone (metres on the body) */
          const d = socket.getWorldPosition(V()).distanceTo(hand.getWorldPosition(V()))
          assert.ok(d < .15, `${look.id} ${motion} @${k}: ${p.item} is ${d.toFixed(3)} m from its hand`)
        }
      }
    }
    body.dispose()
  }
  assert.ok(looks.size >= 8, `${looks.size} armed looks`)
})
