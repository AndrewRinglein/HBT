import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createState, fold } from '../src/fold.js'
import { DMG_HUE } from '../src/theme.js'
import { DHUE } from '../src/icons.js'

test('all six damage types keep engine aim numbers and never invent sheet mitigation', () => {
  for (const type of ['physical', 'magic', 'fire', 'poison', 'shadow', 'true']) {
    const state = createState()
    state.U[0] = {id: 0, hex: 1, typeId: 'hero'}
    state.U[1] = {id: 1, hex: 2, typeId: 'enemy'}
    fold(state, {type: 'attack.declared', actor: 0, target: 1, attackId: 'test.hit', kind: 'melee',
      damageType: type, damageOnHit: 7, hitChance: 63}, {UD: {enemy: {armor: 99, resist: 88, fireResist: 77}}}, 0)
    assert.equal(state.AIM.dmg, 7); assert.equal(state.AIM.hit, 63); assert.equal(state.AIM.type, type)
    assert.equal(Object.hasOwn(state.AIM, 'mit'), false)
    assert.equal(Object.hasOwn(state.AIM, 'mitLabel'), false)
    assert.ok(DMG_HUE[type]); assert.ok(DHUE[type])
  }
})

test('published sheets retain named authored defenses and absorption metadata', () => {
  const data = JSON.parse(readFileSync('generated/static.json', 'utf8'))
  assert.equal(data.units['unit.fire-imp'].fireResist, 2)
  assert.equal(data.units['unit.poison-imp'].poisonResist, 2)
  assert.equal(data.units['unit.zombie'].fireResist, undefined)
  assert.deepEqual(data.absorbingStatuses.slice().sort(), ['status.protection', 'test.status.ward'])
})

test('passive source no longer owns a future status-damage or lethal forecast', () => {
  assert.doesNotMatch(readFileSync('src/projection.js', 'utf8'), /function projectTick|dmgBurn|dmgPois/)
  const board = readFileSync('src/board.js', 'utf8')
  assert.doesNotMatch(board, /projectTick|P\.lethal|P\.absorbed/)
  const exemptions = JSON.parse(readFileSync('tools/exemptions.json', 'utf8')).exemptions
  assert.equal(Object.hasOwn(exemptions, 'tick-projection'), false)
  assert.equal(Object.hasOwn(exemptions, 'aim-mitigation'), false)
})
