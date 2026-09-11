import { describe, expect, it } from 'vitest'
import { ACTIONS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { liftAttack, liftMove, packAbilities, packClassPowers, packTestAbilities, type PackAttackRow, type PackMoveRow } from '../src/content/pack.js'
import { createCustomBattle } from '../src/core/setup.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeAction } from '../src/core/commands.js'

describe('authored slot transport reaches actual battles', () => {
  it.each([
    ['attack.test-slot-movement', 'movement'], ['attack.test-slot-either', 'either'],
    ['power.test-slot-guard', 'movement'], ['power.test-slot-flight', 'primary'], ['power.test-slot-step', 'either'],
  ] as const)('%s retains its authored restriction', (id, slot) => {
    expect(ACTIONS[id]).toBeDefined()
    expect(ACTIONS[id]!.slot).toBe(slot)
  })
  it('the second data variant spends primary after the first spends movement', () => {
    const ctx = createCustomBattle([{ type: 'test-slot-striker', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    ctx.state.units[1]!.hp = ctx.state.units[1]!.maxHp = 1000
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(executeAction(ctx, { actor: 0, actionId: 'attack.test-slot-movement', target: 1 }).ok).toBe(true)
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([true, false])
    expect(executeAction(ctx, { actor: 0, actionId: 'attack.test-slot-either', target: 1 }).ok).toBe(true)
    expect([ctx.state.units[0]!.moveUsed, ctx.state.units[0]!.primaryUsed]).toEqual([true, true])
  })
  it('absence remains either on a movement row; free survives its lift', () => {
    const row: PackMoveRow = { id: 'power.test-slot-lift', name: 'Lift', shape: 'flight', staminaCost: 1, budgetMod: 0, cooldown: 0, free: true }
    expect(liftMove(row).slot).toBeUndefined()
    expect(liftMove(row).free).toBe(true)
  })
  it.each(['movement', 'primary', 'either'] as const)('both profile lifts preserve %s', slot => {
    const move: PackMoveRow = { id: 'power.test-slot-lift', name: 'Lift', shape: 'flight', staminaCost: 1, budgetMod: 0, cooldown: 0, slot }
    const attack: PackAttackRow = { id: 'attack.test-slot-lift', name: 'Lift', kind: 'melee', damageType: 'physical', stat: 'strength', bonus: 0, reach: 1, staminaCost: 1, slot }
    expect(liftMove(move).slot).toBe(slot)
    expect(liftAttack(attack).slot).toBe(slot)
  })
  it.each(['reaction', 'both', '', null, 1])('both lifts reject invalid slot %s', slot => {
    expect(() => liftMove({ id: 'power.test-slot-bad', slot } as unknown as PackMoveRow)).toThrow(/slot/)
    expect(() => liftAttack({ id: 'attack.test-slot-bad', slot } as unknown as PackAttackRow)).toThrow(/slot/)
  })
  it.each(['no', 1, null])('all action loaders reject malformed free flag %s', free => {
    expect(() => liftMove({ id: 'power.test-slot-bad', free } as unknown as PackMoveRow)).toThrow(/free/)
    expect(() => liftAttack({ id: 'attack.test-slot-bad', free } as unknown as PackAttackRow)).toThrow(/free/)
    const pack = UNIT_PACK as unknown as Record<string, any>
    const row = Object.values(pack.test.abilities)[0] as Record<string, unknown>
    const original = Object.getOwnPropertyDescriptor(row, 'free')
    try { row.free = free; expect(() => packTestAbilities()).toThrow(/free/) }
    finally { if (original) Object.defineProperty(row, 'free', original); else delete row.free }
  })
  it('explicit free false and absence remain distinct authored metadata', () => {
    const base: PackMoveRow = { id: 'power.test-slot-lift', name: 'Lift', shape: 'flight', staminaCost: 1, budgetMod: 0, cooldown: 0 }
    expect(liftMove(base).free).toBeUndefined()
    expect(liftMove({ ...base, free: false }).free).toBe(false)
  })
  it.each([
    ['authoredAbilities', packAbilities], ['classPowers', packClassPowers], ['test', packTestAbilities],
  ] as const)('%s loader rejects malformed power slots before returning rows', (family, load) => {
    const pack = UNIT_PACK as unknown as Record<string, any>
    const rows = family === 'test' ? pack.test.abilities : pack[family]
    const row = Object.values(rows)[0] as Record<string, unknown>
    const original = Object.getOwnPropertyDescriptor(row, 'slot')
    try { row.slot = 'reaction'; expect(() => load()).toThrow(/slot/) }
    finally { if (original) Object.defineProperty(row, 'slot', original); else delete row.slot }
  })
})
