import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modules } from './atlas-test-runtime.mjs'
import { THREE } from './atlas-test-runtime.mjs'
import { readFileSync } from 'node:fs'
import { packCharacterModels } from './character-models.mjs'
import { packEquipmentModels } from './equipment-models.mjs'
const A = await modules()
const awaitPack = await packCharacterModels()

test('folded hands choose exact models and remove stowed equipment without changing the body or motions', () => {
  const dagger = { assetId: 'plain-dagger', path: 'dagger.glb', sha256: 'd'.repeat(64), family: 'dagger', lengthM: .34 }
  const bow = { assetId: 'elfbow', path: 'elfbow.glb', sha256: 'b'.repeat(64), family: 'bow', lengthM: 1.2 }
  const base = { id: 'body', model: { path: 'body.glb' }, motions: {}, props: [{ item: 'item.longsword', path: 'old.glb' }] }
  const binding = { looks: [base], equipment: { items: { 'item.dagger': dagger, 'item.elfbow': bow }, classes: { 'item.dagger': 'weapon', 'item.elfbow': 'weapon', 'item.unknown': 'weapon' }, legacy: {} } }
  const unit = { id: 1, kit: { items: ['item.longsword'] }, hands: [{ instanceId: 'a', itemId: 'item.dagger' }] }
  const armed = A.equippedLook(binding, unit)
  assert.equal(armed.model, base.model); assert.equal(armed.motions, base.motions)
  assert.deepEqual(armed.props.map(p => [p.item, p.path, p.hand]), [['item.dagger', 'dagger.glb', 'R']])
  unit.hands = [{ instanceId: 'b', itemId: 'item.elfbow' }]
  const swapped = A.equippedLook(binding, unit)
  assert.deepEqual(swapped.props.map(p => [p.item, p.path, p.hand]), [['item.elfbow', 'elfbow.glb', 'L']])
  assert.equal(swapped.id, base.id, 'equipment changes preserve the body identity used by grasp records')
  assert.notEqual(swapped.cacheKey, armed.cacheKey)
  unit.hands = []
  assert.deepEqual(A.equippedLook(binding, unit).props, [])
  delete unit.hands
  unit.kit.items = ['item.unknown']
  assert.deepEqual(A.equippedLook(binding, unit).unheld, ['item.unknown'])
  assert.deepEqual(base.props, [{ item: 'item.longsword', path: 'old.glb' }])
})

test('the complete asset catalog is registered, while only explicit authored IDs select it', () => {
  const equipment = packEquipmentModels(), pack = awaitPack
  assert.equal(Object.keys(equipment.assets).length, 47)
  assert.ok(Object.keys(equipment.items).length >= 38)
  for (const b of Object.values(pack).filter(b => b.equipment)) {
    assert.equal(b.equipment.catalog, 'equipment-v2')
    for (const [item, ref] of Object.entries(equipment.items)) {
      const look = A.equippedLook(b, { id: 0, kit: { items: [item] } })
      assert.equal(look.props[0]?.path, ref.path, `${b.typeId} ${item}`)
      assert.equal(look.props[0]?.sha256, ref.sha256)
      assert.equal(look.props.length, ref.pair ? 2 : 1)
    }
  }
  assert.ok(!equipment.items['item.greatsword'], 'Giant Sword is not silently assigned to a different authored Greatsword')
})

test('actual compact models attach to male, female and civilian hands through existing motions', async () => {
  const pack = awaitPack
  const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
  const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
  const samples = [
    ['hero.base.paladin-dark', 'item.bane-blade'], ['hero.base.ranger-scantily', 'item.elfbow'],
    ['hero.base.mage-sexy', 'item.frost-staff'], ['hero.base.paladin-shiney', 'item.tower-shield'],
    ['hero.base.rogue-rose', 'item.hand-crossbow'], ['hero.base.priest-robes', 'item.holy-texts'],
    ['hero.fixed.orphans', 'item.dagger'], ['hero.fixed.school-teacher', 'item.dagger'],
    ['hero.fixed.lumberjack-and-wife', 'item.lumberjack-axe'],
  ]
  for (const [typeId, item] of samples) {
    const binding = pack[typeId], look = A.equippedLook(binding, { id: 0, kit: { items: [item] } })
    const body = A.createBody(await A.loadLook(look, { location, fetch, textures: false }))
    let socket; body.stage.traverse(o => { if (o.name === 'held:0:' + item) socket = o })
    assert.ok(socket, `${typeId}: ${item} attached`)
    assert.equal(socket.parent.name, `CC_Base_${look.props[0].hand}_Hand`)
    const basis = socket.getObjectByName('equipment-basis')
    if (look.props[0].model === 'bow') {
      assert.ok(new THREE.Vector3(-1, 0, 0).applyQuaternion(basis.quaternion).distanceTo(new THREE.Vector3(0, 0, -1)) < 1e-8, 'bow string faces back along the shot')
    } else if (look.props[0].attachment === 'palm') {
      assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(basis.quaternion).distanceTo(new THREE.Vector3(0, 0, look.props[0].reverse ? -1 : 1)) < 1e-8, 'shaft follows the socket axis')
    }
    assert.equal(look.model, binding.looks[0].model); assert.equal(look.motions, binding.looks[0].motions)
    for (const motion of ['idle', 'move', 'attack', ...(look.motions.ranged ? ['ranged'] : [])]) {
      body.play('idle', { snap: true }); body.play(motion, { snap: true })
      const length = body.clipLength(motion)
      for (let k = 0; k < 8; k++) {
        body.frame(k ? length / 9 : 0); body.stage.updateMatrixWorld(true)
        const at = socket.getWorldPosition(new THREE.Vector3()), hand = socket.parent.getWorldPosition(new THREE.Vector3())
        assert.ok(at.toArray().every(Number.isFinite)); assert.ok(at.distanceTo(hand) < .15, `${typeId} ${motion}: grip stays at palm`)
        const box = new THREE.Box3().setFromObject(socket)
        assert.ok(!box.isEmpty() && [...box.min, ...box.max].every(Number.isFinite), `${typeId} ${motion}: finite mesh bounds`)
      }
    }
    body.dispose()
  }
})

test('identical item pairs occupy separate hands and a legacy binding remains unchanged', () => {
  const base = { id: 'body', props: [], motions: {} }, item = { assetId: 'plain-dagger', path: 'dagger.glb', family: 'dagger' }
  const binding = { looks: [base], equipment: { items: { 'item.dagger': item }, classes: { 'item.dagger': 'weapon' }, legacy: {} } }
  assert.deepEqual(A.equippedLook(binding, { id: 0, kit: { items: ['item.dagger', 'item.dagger'] } }).props.map(p => p.hand), ['R', 'L'])
  assert.equal(A.equippedLook({ looks: [base] }, { id: 0, kit: { items: [] } }), base)
})
