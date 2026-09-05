// fix.aoo-pays-stamina (2026-09-04) — FINDING 40 of the log-invariant audit.
//
// Ruled 2026-08-20 (DECISIONS "The attack of opportunity, final form"): "The
// attacker chooses one of their attacks. They do pay stamina for it. It could
// have a cooldown, and if it was on cooldown, they can't use it." The engine
// forced the holder's stamina up to the cost, ran the attack (which EMITTED
// stamina.spent), then wrote the old stamina back by hand — the log lied (Law
// 3) and an exhausted holder swung anyway. Now the swing is a REACTION: chosen
// among the legal attacks, paid like any other, the primary slot alone left
// out of it (it happens outside the holder's Activation).
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { attackOfOpportunity } from '../src/core/movement.js'
import { beginActivation, markPrimaryUsed } from '../src/core/mutate.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

/** A warrior beside a zombie; the warrior is the ZoC holder, the zombie the mover. Punch (0 stamina) removed so the cheapest melee costs 1. */
function rig(): { ctx: Ctx; w: number; z: number } {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
  const w = ctx.state.units[0]!
  w.actions = w.actions.filter((a) => a !== 'attack.punch')
  w.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
  beginActivation(ctx, 1, 'test')
  return { ctx, w: 0, z: 1 }
}
const staminaFromLog = (ctx: Ctx, id: number, start: number): number => {
  let s = start
  for (const e of ctx.events) {
    if (e['actor'] !== id && e['target'] !== id) continue
    if (e.type === 'stamina.spent') s = e['stamina'] as number
    if (e.type === 'stamina.gained') s = e['stamina'] as number
  }
  return s
}

describe('the attack of opportunity pays like any other attack', () => {
  it('stamina is spent for real — the state agrees with the log, nothing is written back', () => {
    const { ctx, w, z } = rig()
    const u = ctx.state.units[w]!
    const before = u.stamina
    expect(attackOfOpportunity(ctx, w, z)).toBe(true)
    const provoked = ctx.events.find((e) => e.type === 'aoo.provoked')!
    expect(provoked['attackId']).toBe('attack.test-warrior.axe')   // the cheapest legal melee: axe (1), not massive (2)
    expect(u.stamina).toBe(before - 1)
    const spent = ctx.events.filter((e) => e.type === 'stamina.spent' && e['actor'] === w)
    expect(spent.length).toBe(1)
    expect(spent[0]!.causeId).toBe('attack.test-warrior.axe')
    expect(staminaFromLog(ctx, w, before)).toBe(u.stamina)
  })

  it('an exhausted holder does not swing — the skip names it, and no stamina.spent is emitted', () => {
    const { ctx, w, z } = rig()
    ctx.state.units[w]!.stamina = 0
    expect(attackOfOpportunity(ctx, w, z)).toBe(false)
    expect(ctx.events.find((e) => e.type === 'aoo.skipped')!['reason']).toBe('not legal')
    expect(ctx.events.some((e) => e.type === 'aoo.provoked' || e.type === 'attack.declared' || e.type === 'stamina.spent')).toBe(false)
  })

  it('the choice is among the LEGAL attacks: with 1 stamina the axe (1) is legal and massive (2) is not; with 2 the axe is still cheapest', () => {
    const { ctx, w, z } = rig()
    ctx.state.units[w]!.stamina = 1
    attackOfOpportunity(ctx, w, z)
    expect(ctx.events.find((e) => e.type === 'aoo.provoked')!['attackId']).toBe('attack.test-warrior.axe')
    expect(ctx.state.units[w]!.stamina).toBe(0)
  })

  it('the primary slot is not the price: a holder that has already acted this Turn still reacts, and its slot is unchanged after', () => {
    const { ctx, w, z } = rig()
    markPrimaryUsed(ctx, w)
    expect(ctx.state.units[w]!.primaryUsed).toBe(true)
    expect(attackOfOpportunity(ctx, w, z)).toBe(true)
    expect(ctx.state.units[w]!.primaryUsed).toBe(true)
    // and a holder that has NOT acted is not marked as having acted by the reaction
    const fresh = rig()
    attackOfOpportunity(fresh.ctx, fresh.w, fresh.z)
    expect(fresh.ctx.state.units[fresh.w]!.primaryUsed).toBe(false)
  })

  it('a cooldown set by the reaction is real: the golem\'s Slam (cooldown 2) reacts once, and the next provocation must pick another attack', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }, { type: 'test-zombie', hex: hexId(6, 5) }])
    const g = ctx.state.units[0]!
    g.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    // leave the golem exactly one free melee with a cooldown and one it must pay 4 for
    g.actions = g.actions.filter((a) => a === 'attack.test-ram.slam' || a === 'attack.test-ram.overhead' || a === 'power.move')
    g.stamina = 0
    beginActivation(ctx, 1, 'test')
    expect(attackOfOpportunity(ctx, 0, 1)).toBe(true)
    expect(ctx.events.find((e) => e.type === 'aoo.provoked')!['attackId']).toBe('attack.test-ram.slam')
    expect(ctx.events.some((e) => e.type === 'cooldown.set' && e['actionId'] === 'attack.test-ram.slam' && e['actor'] === 0)).toBe(true)
    expect(g.cooldowns['attack.test-ram.slam']).toBe(ctx.state.turn + 3)
    // the second mover: Slam is on cooldown, Overhead costs 4 the golem does not have — no legal attack
    beginActivation(ctx, 2, 'test')
    expect(attackOfOpportunity(ctx, 0, 2)).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'aoo.skipped').at(-1)!['reason']).toBe('not legal')
  })

  it('a use spent by the reaction is spent: Once (uses 1) reacts, then leaves the list', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const g = ctx.state.units[0]!
    g.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    g.actions = g.actions.filter((a) => a === 'attack.test-ram.once' || a === 'power.move')
    beginActivation(ctx, 1, 'test')
    expect(attackOfOpportunity(ctx, 0, 1)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'charge.spent' && e['abilityId'] === 'attack.test-ram.once')).toBe(true)
    expect(g.actions).not.toContain('attack.test-ram.once')
  })

  it('an enemy holder (no stamina bar) pays nothing and is still legal — staminaCostOf is the one rule', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const z = ctx.state.units[1]!
    z.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    beginActivation(ctx, 0, 'test')
    expect(attackOfOpportunity(ctx, 1, 0)).toBe(true)
    expect(z.stamina).toBe(0)
    expect(ctx.events.filter((e) => e.type === 'stamina.spent' && e['actor'] === 1).every((e) => e['amount'] === 0)).toBe(true)
  })
})
