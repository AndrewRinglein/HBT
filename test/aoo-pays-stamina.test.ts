// fix.aoo-pays-stamina (2026-09-04) — FINDING 40 of the log-invariant audit — REWRITTEN 2026-10-04.
//
// LAW 10, the written reason. This file held the 2026-08-20 ruling (DECISIONS "The attack of opportunity, final
// form"): "The attacker chooses one of their attacks. They do pay stamina for it. It could have a cooldown, and if
// it was on cooldown, they can't use it." — the holder's CHEAPEST legal melee attack, paid like any other. That
// ruling was replaced on 2026-09-28 ('counterattack, special free attacks, the opening six, shields, custom
// weapons': "we're changing attack of opportunity, so it's using the same rules as everything else. No stamina,
// uses the basic attack." — "the basic attack, no stamina, −20 Accuracy") and the replacement was built by
// rule.free-attack-is-basic-attack on 2026-10-04 ("It has a stamina cost, but that stamina cost is not triggered by
// special free attacks").
//
// What FINDING 40 was about stands, and is what this file still holds: THE LOG AND THE STATE AGREE (Law 3). The
// engine once forced the holder's stamina up to the cost, ran the attack — which emitted stamina.spent — and wrote
// the old stamina back by hand. Under the new rule the free attack's Stamina cost is ZERO: nothing is asked for,
// nothing is spent, no stamina.spent line is logged, nothing is written back. Each test below is the old test's
// claim read under the rule that replaced its ruling; the old assertion is named where it changed. The rule's own
// probe is test/free-attack-is-basic-attack.test.ts.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { attackOfOpportunity } from '../src/core/movement.js'
import { beginActivation, markPrimaryUsed } from '../src/core/mutate.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

/** A warrior beside a zombie; the warrior is the ZoC holder, the zombie the mover. Its row's own attacks, in order: massive (2 Stamina), axe (1), Punch (0). */
function rig(): { ctx: Ctx; w: number; z: number } {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
  const w = ctx.state.units[0]!
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

describe('the attack of opportunity is a special free attack: the state agrees with the log, and no Stamina moves', () => {
  it('no Stamina is spent — the state agrees with the log, nothing is written back', () => {
    // was: 'stamina is spent for real' — the cheapest legal melee (axe, 1) chosen and paid, one stamina.spent line
    const { ctx, w, z } = rig()
    const u = ctx.state.units[w]!
    const before = u.stamina
    expect(attackOfOpportunity(ctx, w, z)).toBe(true)
    const provoked = ctx.events.find((e) => e.type === 'aoo.provoked')!
    expect(provoked['attackId']).toBe('attack.test-warrior.massive')   // the row's first attack — its basic attack — not the cheapest
    expect(u.stamina).toBe(before)
    expect(ctx.events.filter((e) => e.type === 'stamina.spent' && e['actor'] === w)).toEqual([])
    expect(staminaFromLog(ctx, w, before)).toBe(u.stamina)
  })

  it('an exhausted holder still swings — a free attack asks for no Stamina', () => {
    // was: 'an exhausted holder does not swing — the skip names it'
    const { ctx, w, z } = rig()
    ctx.state.units[w]!.stamina = 0
    expect(attackOfOpportunity(ctx, w, z)).toBe(true)
    expect(ctx.events.some((e) => e.type === 'aoo.skipped')).toBe(false)
    expect(ctx.events.find((e) => e.type === 'aoo.provoked')!['attackId']).toBe('attack.test-warrior.massive')
    expect(ctx.events.some((e) => e.type === 'stamina.spent')).toBe(false)
    expect(ctx.state.units[w]!.stamina).toBe(0)
  })

  it('the choice is the basic attack whatever the holder could afford: at 1 Stamina and at 2 it is the same swing', () => {
    // was: 'the choice is among the LEGAL attacks: with 1 stamina the axe (1) is legal and massive (2) is not'
    for (const stamina of [1, 2]) {
      const { ctx, w, z } = rig()
      ctx.state.units[w]!.stamina = stamina
      attackOfOpportunity(ctx, w, z)
      expect(ctx.events.find((e) => e.type === 'aoo.provoked')!['attackId'], `at ${stamina} Stamina`).toBe('attack.test-warrior.massive')
      expect(ctx.state.units[w]!.stamina).toBe(stamina)
    }
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

  it('a cooldown set by the reaction is real: the golem\'s Slam (cooldown 2) reacts once; the next provocation takes its next melee attack, free of its 4 Stamina', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }, { type: 'test-zombie', hex: hexId(6, 5) }])
    const g = ctx.state.units[0]!
    g.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    // leave the golem exactly one melee with a cooldown, listed first, and one that costs 4 Stamina it does not have
    for (const a of ['attack.test-ram.slam', 'attack.test-ram.overhead', 'power.move']) expect(g.actions).toContain(a)
    g.actions = ['attack.test-ram.slam', 'attack.test-ram.overhead', 'power.move']
    g.stamina = 0
    ctx.state.turn = 2   // past Overhead's warmup: its Stamina is the only thing the golem lacks for it
    beginActivation(ctx, 1, 'test')
    expect(attackOfOpportunity(ctx, 0, 1)).toBe(true)
    expect(ctx.events.find((e) => e.type === 'aoo.provoked')!['attackId']).toBe('attack.test-ram.slam')
    expect(ctx.events.some((e) => e.type === 'cooldown.set' && e['actionId'] === 'attack.test-ram.slam' && e['actor'] === 0)).toBe(true)
    expect(g.cooldowns['attack.test-ram.slam']).toBe(ctx.state.turn + 3)
    // the second mover: Slam is on cooldown, so the free attack is the golem's next own melee — Overhead — and its 4 Stamina is not asked for
    // (was: 'Overhead costs 4 the golem does not have — no legal attack', an aoo.skipped 'not legal')
    beginActivation(ctx, 2, 'test')
    attackOfOpportunity(ctx, 0, 2)   // whether it lands is the dice's; that it is swung is the rule
    expect(ctx.events.filter((e) => e.type === 'aoo.skipped')).toEqual([])
    expect(ctx.events.filter((e) => e.type === 'aoo.provoked').at(-1)!['attackId']).toBe('attack.test-ram.overhead')
    expect(g.stamina).toBe(0)
    expect(ctx.events.some((e) => e.type === 'stamina.spent' && e['actor'] === 0)).toBe(false)
  })

  it('when no melee attack of its own is legal the skip names it: both on cooldown', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const g = ctx.state.units[0]!
    g.actions = g.actions.filter((a) => a === 'attack.test-ram.slam' || a === 'power.move')
    g.cooldowns['attack.test-ram.slam'] = ctx.state.turn + 3
    beginActivation(ctx, 1, 'test')
    expect(attackOfOpportunity(ctx, 0, 1)).toBe(false)
    expect(ctx.events.filter((e) => e.type === 'aoo.skipped').at(-1)!['reason']).toBe('not legal')
    expect(ctx.events.some((e) => e.type === 'aoo.provoked' || e.type === 'attack.declared' || e.type === 'stamina.spent')).toBe(false)
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

  it('an enemy holder (no stamina bar) swings its own first attack, and no stamina line of any amount is logged', () => {
    // was: 'pays nothing and is still legal' — every stamina.spent line of the swing had amount 0; now there is none
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(5, 6) }])
    const z = ctx.state.units[1]!
    z.mods.push({ stat: 'accuracy', op: 'add', value: 100, source: 'test', scope: 'unit' })
    beginActivation(ctx, 0, 'test')
    expect(attackOfOpportunity(ctx, 1, 0)).toBe(true)
    expect(z.stamina).toBe(0)
    expect(ctx.events.filter((e) => e.type === 'stamina.spent' && e['actor'] === 1)).toEqual([])
  })
})
