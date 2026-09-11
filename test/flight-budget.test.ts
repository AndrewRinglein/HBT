import { describe, expect, it } from 'vitest'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { executeAction, validateAction } from '../src/core/commands.js'
import { movementOptions } from '../src/core/movement.js'
import { createCustomBattle } from '../src/core/setup.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'

const variants = [
  ['test-flight-plus-three', 'power.test-flight-plus-three', 3],
  ['test-flight-plus-five', 'power.test-flight-plus-five', 5],
] as const

function fixture(type: string, actionId: string) {
  const ctx = createCustomBattle([{ type, hex: 85 }], [{ type: 'test-zombie', hex: 255 }], { strict: true })
  expect(ctx.actions[actionId]).toBeDefined()
  ctx.state.units[0]!.surge = 100
  expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
  return ctx
}

describe('flight spends its local bonus without replenishing activation movement', () => {
  for (const [type, actionId, bonus] of variants) {
    it.each([1, bonus, bonus + 1, 5 + bonus])(`${actionId} pays the exact own-store cost over %i hexes`, distance => {
      const ctx = fixture(type, actionId)
      const destination = movementOptions(ctx, 0, actionId).find(p => ctx.geo.distance(85, p.destination) === distance)!.destination
      const request = { actor: 0, actionId, destination }
      const before = saveBattle(ctx)
      expect(validateAction(ctx, request)).toEqual({ ok: true })
      expect(saveBattle(ctx)).toEqual(before)
      expect(executeAction(ctx, request)).toEqual({ ok: true })
      const payment = Math.max(0, distance - bonus)
      expect(ctx.state.units[0]!.movePointsLeft).toBe(5 - payment)
      expect(ctx.state.units[0]!.moveUsed).toBe(true)
      expect(ctx.state.units[0]!.hex).toBe(destination)
      const moved = [...ctx.events].reverse().find(e => e.type === 'moved' && e.causeId === actionId)!
      expect(moved.cost).toBe(payment)
      const after = saveBattle(ctx)
      expect(executeAction(ctx, { actor: 0, actionId, destination: 85 }).ok).toBe(false)
      expect(saveBattle(ctx)).toEqual(after)
    })

    it(`${actionId} keeps every planned destination executable after reload with no negative payment`, () => {
      const ctx = fixture(type, actionId)
      const saved = saveBattle(ctx)
      for (const plan of movementOptions(ctx, 0, actionId)) {
        const restored = restoreBattle(saved, ctx)
        const distance = ctx.geo.distance(85, plan.destination)
        expect(executeAction(restored, { actor: 0, actionId, destination: plan.destination })).toEqual({ ok: true })
        expect(restored.state.units[0]!.movePointsLeft).toBe(5 - Math.max(0, distance - bonus))
      }
    })

    it(`${actionId} preserves the short-jump balance through reload then reopens only the sampled Surge allowance`, () => {
      let ctx = fixture(type, actionId)
      expect(executeAction(ctx, { actor: 0, actionId, destination: 86 })).toEqual({ ok: true })
      ctx = restoreBattle(saveBattle(ctx), ctx)
      expect(ctx.state.units[0]!.movePointsLeft).toBe(5)
      completeActionCycle(ctx)
      expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
      expect(ctx.state.units[0]!.movePointsLeft).toBe(5)
      expect(executeAction(ctx, { actor: 0, actionId, destination: 85 })).toEqual({ ok: true })
      expect(ctx.state.units[0]!.movePointsLeft).toBe(5)
    })

    it(`${actionId} refuses an occupied landing without spending or drawing RNG`, () => {
      const ctx = fixture(type, actionId)
      ctx.state.units[1]!.hex = 86
      const before = saveBattle(ctx)
      expect(executeAction(ctx, { actor: 0, actionId, destination: 86 }).ok).toBe(false)
      expect(saveBattle(ctx)).toEqual(before)
    })
  }

  it.each([
    ['power.flight-labored', -1], ['power.flight', 0], ['power.flight-swift', 1],
  ] as const)('%s retains its existing one-hex and full-range accounting', (actionId, modifier) => {
    for (const distance of [1, 5 + modifier]) {
      const ctx = fixture('test-flight-plus-three', 'power.test-flight-plus-three')
      ctx.state.units[0]!.actions.push(actionId)
      const destination = movementOptions(ctx, 0, actionId).find(p => ctx.geo.distance(85, p.destination) === distance)!.destination
      expect(executeAction(ctx, { actor: 0, actionId, destination })).toEqual({ ok: true })
      expect(ctx.state.units[0]!.movePointsLeft).toBe(5 - (distance - modifier))
    }
  })
})
