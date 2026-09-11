import { describe, expect, it } from 'vitest'
import { advanceBattle, completeActionCycle, runBattle } from '../src/core/battle.js'
import { createCustomBattle } from '../src/core/setup.js'
import { applyStatus } from '../src/core/status.js'
import { executeAction } from '../src/core/commands.js'
import { movementOptions } from '../src/core/movement.js'
import { restoreBattle, saveBattle } from '../src/core/snapshot.js'
import { attacksOf } from '../src/core/action.js'
import type { Ctx } from '../src/core/types.js'

function fixture() {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 150 }], { strict: true })
  ctx.state.units[0]!.movement = 5
  ctx.state.units[0]!.surge = 100
  return ctx
}
function finish(ctx: Ctx) { completeActionCycle(ctx); return advanceBattle(ctx) }

describe('correct Surge cycles', () => {
  it.each(['power.flight-labored', 'power.flight-swift'])('%s refreshes the sampled allowance across reload without resampling new Slow', id => {
    let ctx = fixture()
    const slow = Object.values(ctx.statuses).find(s => s.reducesMovement)!
    applyStatus(ctx, 0, slow.id, 2, 'test')
    ctx.state.units[0]!.actions.push(id)
    expect(ctx.actions[id]).toBeDefined()
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.state.units[0]!.movePointsLeft).toBe(3)
    const initial = movementOptions(ctx, 0, id)
    const range = 3 + ctx.actions[id]!.move!.budgetMod
    expect(Math.max(...initial.map(p => ctx.geo.distance(ctx.state.units[0]!.hex, p.destination)))).toBe(range)
    expect(executeAction(ctx, { actor: 0, actionId: id, destination: initial[0]!.destination })).toEqual({ ok: true })
    // Slow acquired during the activation waits for the next Activation, not a Surge.
    applyStatus(ctx, 0, slow.id, 3, 'test')
    completeActionCycle(ctx)
    ctx = restoreBattle(saveBattle(ctx), ctx)
    expect(advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.state.units[0]!.activationOrdinal).toBe(1)
    expect(ctx.state.units[0]!.movePointsLeft).toBe(3)
    const reopened = movementOptions(ctx, 0, id)
    expect(Math.max(...reopened.map(p => ctx.geo.distance(ctx.state.units[0]!.hex, p.destination)))).toBe(range)
    expect(ctx.events.filter(e => e.type === 'activation.begin' && e.actor === 0)).toHaveLength(1)
    expect(ctx.events.filter(e => e.type === 'activation.end' && e.actor === 0)).toHaveLength(0)
  })

  it('Root gained during a cycle does not regain movement on Surge', () => {
    const ctx = fixture()
    advanceBattle(ctx)
    const root = Object.values(ctx.statuses).find(s => s.blocksMovement)!
    applyStatus(ctx, 0, root.id, 1, 'test')
    expect(finish(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.state.units[0]!.movePointsLeft).toBe(0)
  })

  it('retains movement modifiers sampled at activation start', () => {
    const ctx = fixture()
    ctx.state.units[0]!.mods.push({ stat: 'movement', op: 'add', value: -2, source: 'test', scope: 'unit' })
    advanceBattle(ctx)
    expect(ctx.state.units[0]!.movePointsLeft).toBe(3)
    expect(finish(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(ctx.state.units[0]!.movePointsLeft).toBe(3)
  })

  it('a chain beyond the old eight-cycle stop survives save and restore', () => {
    let ctx = fixture()
    advanceBattle(ctx)
    for (let cycle = 0; cycle < 12; cycle++) {
      expect(finish(ctx)).toEqual({ kind: 'acting', actor: 0 })
      ctx = restoreBattle(saveBattle(ctx), ctx)
    }
    expect(ctx.battleCursor!.surgeLink).toBe(12)
    expect(ctx.state.units[0]!.activationOrdinal).toBe(1)
  })

  it('a newly stunned actor cannot open a Surge cycle', () => {
    const ctx = fixture()
    advanceBattle(ctx)
    const stun = Object.values(ctx.statuses).find(s => s.blocksAction)!
    applyStatus(ctx, 0, stun.id, 1, 'test')
    expect(finish(ctx)).toEqual({ kind: 'acting', actor: 1 })
    expect(ctx.events.some(e => e.type === 'surge.hit')).toBe(false)
    expect(ctx.events.filter(e => e.type === 'activation.end' && e.actor === 0)).toHaveLength(1)
  })

  it('winning in a Surge cycle ends at battle.end without another activation ladder', () => {
    const ctx = fixture()
    ctx.state.units[1]!.hex = 86
    ctx.state.units[1]!.hp = 1
    ctx.state.units[1]!.armor = 0
    ctx.state.units[0]!.accuracy = 200
    advanceBattle(ctx)
    expect(finish(ctx)).toEqual({ kind: 'acting', actor: 0 })
    expect(executeAction(ctx, { actor: 0, actionId: attacksOf(ctx, ctx.state.units[0]!)[0]!.id, target: 1 })).toEqual({ ok: true })
    expect(ctx.state.outcome).toBe('heroClear')
    expect(finish(ctx).kind).toBe('complete')
    expect(ctx.events.at(-1)!.type).toBe('battle.end')
  })

  it('an endless Surge chain fails loudly without a fabricated outcome or silent phase advance', () => {
    const ctx = fixture()
    advanceBattle(ctx)
    let cycles = 0
    expect(() => {
      for (; cycles < 300; cycles++) {
        completeActionCycle(ctx)
        const next = advanceBattle(ctx)
        if (next.kind !== 'acting' || next.actor !== 0) throw new Error('silently ended Surge chain')
      }
    }).toThrow(/Surge.*overflow/i)
    expect(cycles).toBe(256)
    expect(ctx.state.outcome).toBeNull()
  })

  it('battle.end is the final lifecycle event across the control sample', () => {
    for (let replicate = 0; replicate < 12; replicate++) {
      const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { replicate })
      runBattle(ctx)
      expect(ctx.events.at(-1)!.type).toBe('battle.end')
    }
  })
})
