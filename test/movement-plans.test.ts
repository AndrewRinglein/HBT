import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { beginActivation } from '../src/core/mutate.js'
import { executeAction } from '../src/core/commands.js'
import { executeMove, movementOptions, pathTo, planMovement, reachable } from '../src/core/movement.js'
import { saveBattle } from '../src/core/snapshot.js'
import { applyStatus } from '../src/core/status.js'
import { TERRAIN, type MoveDef } from '../src/core/types.js'

function fixture(bonus: number) {
  const type = bonus === 1 ? 'test-move-plus-one' : 'test-move-plus-three'
  const ctx = createCustomBattle([{ type, hex: 85 }], [{ type: 'test-zombie', hex: 150 }], { strict: true })
  const u = ctx.state.units[0]!
  u.movement = 1
  const power = ctx.actions[bonus === 1 ? 'power.test-move-plus-one' : 'power.test-move-plus-three'] as MoveDef
  expect(power).toBeDefined()
  expect(power.move.budgetMod).toBe(bonus)
  beginActivation(ctx, 0, 'test')
  return { ctx, u, power }
}

describe('shared movement budgets', () => {
  it.each([1, 3])('executes every advertised open-ground step with bonus %i', bonus => {
    const { ctx, u, power } = fixture(bonus)
    const destination = 86 + bonus
    const path = pathTo(reachable(ctx, u, bonus), u.hex, destination)
    expect(path).toHaveLength(1 + bonus)
    expect(executeMove(ctx, 0, path, power)).toBe(1 + bonus)
    expect(u.hex).toBe(destination)
    expect(u.movePointsLeft).toBe(0)
    const moves = ctx.events.filter(e => e.type === 'moved')
    expect(moves.reduce((sum, e) => sum + Number(e.cost), 0)).toBe(1 + bonus)
    expect(moves.every(e => Number(e.movePointsLeft) >= 0)).toBe(true)
  })

  it('public internal commands accept the same bonus path', () => {
    const { ctx, u, power } = fixture(3)
    expect(executeAction(ctx, { actor: 0, actionId: power.id, destination: 89 })).toEqual({ ok: true })
    expect(u.hex).toBe(89)
  })

  it('does not let a repeated movement call regain the action bonus', () => {
    const { ctx, u, power } = fixture(3)
    expect(executeMove(ctx, 0, [86], power)).toBe(1)
    const before = saveBattle(ctx)
    expect(executeMove(ctx, 0, [87], power)).toBe(0)
    expect(saveBattle(ctx)).toBe(before)
    expect(u.hex).toBe(86)
  })

  it.each([[[86, 88]], [[9999]], [[86, 150]]])('rejects the entire malformed path %j before spending', path => {
    const { ctx, power } = fixture(3)
    const before = saveBattle(ctx)
    expect(executeMove(ctx, 0, path, power)).toBe(0)
    expect(saveBattle(ctx)).toBe(before)
  })

  it('Root forbids bonus displacement without spending', () => {
    const { ctx, power } = fixture(3)
    const root = Object.values(ctx.statuses).find(s => s.blocksMovement)!
    applyStatus(ctx, 0, root.id, 1, 'test')
    const before = saveBattle(ctx)
    expect(executeMove(ctx, 0, [86], power)).toBe(0)
    expect(saveBattle(ctx)).toBe(before)
  })

  it('pays weighted terrain from the same total budget', () => {
    const { ctx, u, power } = fixture(3)
    ctx.state.terrain[86] = TERRAIN.HILLS
    ctx.state.terrain[87] = TERRAIN.HILLS
    expect(executeMove(ctx, 0, [86, 87], power)).toBe(2)
    expect(u.movePointsLeft).toBe(0)
    expect(ctx.events.filter(e => e.type === 'moved').map(e => e.cost)).toEqual([2, 2])
  })

  it('enumerates the same plans in stable order without changing the battle', () => {
    const { ctx, power } = fixture(3)
    const before = saveBattle(ctx)
    const plans = movementOptions(ctx, 0, power.id)
    expect(plans.length).toBeGreaterThan(0)
    expect(plans.map(p => p.destination)).toEqual(plans.map(p => p.destination).sort((a, b) => a - b))
    for (const plan of plans) expect(planMovement(ctx, 0, power.id, plan.destination)).toEqual(plan)
    expect(saveBattle(ctx)).toBe(before)
  })

  it('keeps zero-step riders legal under Root while displacement has no options', () => {
    const { ctx, power, u } = fixture(3)
    const root = Object.values(ctx.statuses).find(s => s.blocksMovement)!
    applyStatus(ctx, 0, root.id, 1, 'test')
    const focus = Object.values(ctx.actions).find(a => a.move?.shape === 'sidestep' && a.move.stepRange === 0)!
    expect(focus).toBeDefined()
    u.actions.push(focus.id)
    expect(movementOptions(ctx, 0, power.id)).toEqual([])
    expect(movementOptions(ctx, 0, focus.id).map(p => p.destination)).toEqual([u.hex])
  })

  it('an opportunity hit ends the entire move, including its remaining bonus', () => {
    const { ctx, power, u } = fixture(3)
    ctx.state.units[1]!.hex = 86
    ctx.state.units[1]!.accuracy = 200
    u.dodge = 0
    expect(executeMove(ctx, 0, [84, 83], power)).toBe(0)
    expect(ctx.events.some(e => e.type === 'move.stopped' && e.reason === 'hit')).toBe(true)
    expect(u.hex).toBe(85)
    expect(u.movePointsLeft).toBe(0)
    const before = saveBattle(ctx)
    expect(executeMove(ctx, 0, [84], power)).toBe(0)
    expect(saveBattle(ctx)).toBe(before)
  })

  it('Root acquired after a step stops the rest of the advertised path', () => {
    const { ctx, power, u } = fixture(3)
    const root = Object.values(ctx.statuses).find(s => s.blocksMovement)!
    expect(executeMove(ctx, 0, [86, 87], power, () => { applyStatus(ctx, 0, root.id, 1, 'test'); return true })).toBe(1)
    expect(u.hex).toBe(86)
  })
})
