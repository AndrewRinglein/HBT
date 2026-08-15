import { describe, it, expect } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack } from '../src/core/pipeline.js'
import { valueOf as statusValueOf } from '../src/core/status.js'
import {
  HOOKS, SELECTORS, validateTrigger, triggersFrom, resolveTriggerChance,
  partyMagicSum, valueOf, fireTriggers,
} from '../src/core/trigger.js'
import type { Trigger } from '../src/core/trigger.js'
import { hexId } from '../src/core/hex.js'

const T = (over: Partial<Trigger> = {}): Trigger => ({
  id: 'trigger.test.rot', hook: 'onDamage', chance: 20, select: 'target',
  effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 },
  source: 'unit.test', ...over,
})

// `replicate` must vary or every battle draws the SAME key and returns the same
// roll — which is the engine working correctly, and made a rate test read 0%.
function duel(over: Partial<Trigger>[] = [], replicate = 0) {
  const ctx = createCustomBattle(
    [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }],
    { mapId: 'map.open', replicate })
  ctx.state.units[0]!.triggers = triggersFrom(over.map((o) => T(o)))
  return ctx
}

// ─── validation: §5 says the engine errors loudly on bad authoring ───────────
describe('triggers — a content typo fails at load, not silently at runtime', () => {
  it('rejects an unknown hook and an unknown selector', () => {
    expect(() => validateTrigger(T({ hook: 'turnEnd' as never }))).toThrow(/unknown hook/)
    expect(() => validateTrigger(T({ select: 'evryone' as never }))).toThrow(/unknown selector/)
  })

  it('rejects `target` on a hook that has no target — the silent-self-target bug', () => {
    // Hell TCG resolved an unrecognised target to the trigger's owner, so every typo
    // became a self-target. §5: "The new engine errors loudly on unknown targets."
    expect(() => validateTrigger(T({ hook: 'onActivationEnd', select: 'target' })))
      .toThrow(/has no target/)
    expect(() => validateTrigger(T({ hook: 'onActivationEnd', select: 'self' }))).not.toThrow()
  })

  it('rejects a non-integer or out-of-range chance (Law 7)', () => {
    for (const c of [-1, 101, 20.5, NaN]) expect(() => validateTrigger(T({ chance: c }))).toThrow(/chance/)
  })

  it('requires a source — §5 stacks by source, so an unnamed one cannot stack', () => {
    expect(() => validateTrigger(T({ source: '' }))).toThrow(/source/)
  })

  it('turnEnd is not a hook; onActivationEnd is', () => {
    expect(HOOKS).toContain('onActivationEnd')
    expect(HOOKS as readonly string[]).not.toContain('turnEnd')
  })
})

describe('triggers — every unit gets its own copy', () => {
  it('two units carrying the same trigger do not share one mutable entry', () => {
    // Hell TCG pushed triggers by reference; two units with the same badge shared
    // the entry, so writing to one wrote to both.
    const defs = [T()]
    const a = triggersFrom(defs), b = triggersFrom(defs)
    expect(a[0]).not.toBe(b[0])
    expect(Object.isFrozen(a[0])).toBe(true)
    expect(() => { (a[0] as { chance: number }).chance = 99 }).toThrow()
    expect(b[0]!.chance).toBe(20)
  })
})

// ─── the cup: the whole reason this needs its own stream ────────────────────
describe('triggers — two triggers on the same hit roll INDEPENDENTLY', () => {
  it('two identical 20% triggers do not fire together', () => {
    // If both rolled with the same key they would return a bit-identical value and
    // ALWAYS fire together — two 20% triggers behaving as one. That is the
    // correlated-stream bug this RNG exists to prevent, arriving through the front
    // door. Expect ~4% both, not ~20%.
    let both = 0, either = 0, one = 0, n = 0
    for (let r = 0; r < 1200; r++) {
      const ctx = createCustomBattle(
        [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open', replicate: r })
      const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
      w.triggers = triggersFrom([
        T({ id: 'trigger.a', source: 'a', effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }),
        T({ id: 'trigger.b', source: 'b', effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }),
      ])
      z.hp = 99
      fireTriggers(ctx, 'onDamage', { ownerId: w.id, targetId: z.id, causeId: 'test', ordinal: 1 })
      const fired = ctx.events.filter((e) => e.type === 'trigger.rolled' && e['fired'] === true).length
      n++
      if (fired === 2) both++
      if (fired >= 1) either++
      if (fired === 1) one++
    }
    const pct = (x: number) => (100 * x) / n
    // independent 20% x 20%: both 4%, either 36%, exactly one 32%
    expect(pct(both)).toBeGreaterThan(1.5)
    expect(pct(both)).toBeLessThan(8)
    expect(pct(one)).toBeGreaterThan(24)      // would be ~0 if perfectly correlated
    expect(pct(either)).toBeGreaterThan(28)
    expect(pct(either)).toBeLessThan(44)
  })

  it('a 20% trigger fires about 20% of the time across seeds', () => {
    let fired = 0, n = 0
    for (let r = 0; r < 1500; r++) {
      const ctx = duel([{ chance: 20 }], r)
      const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
      z.hp = 99
      fireTriggers(ctx, 'onDamage', { ownerId: w.id, targetId: z.id, causeId: 't', ordinal: 1 })
      n++
      if (ctx.events.some((e) => e.type === 'trigger.rolled' && e['fired'] === true)) fired++
    }
    expect((100 * fired) / n).toBeGreaterThan(15)
    expect((100 * fired) / n).toBeLessThan(26)
  })
})

// ─── the log ────────────────────────────────────────────────────────────────
describe('triggers — a roll that fails still leaves a trace', () => {
  it('every roll logs, fired or not', () => {
    const ctx = duel([{ chance: 0 }])
    const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    fireTriggers(ctx, 'onDamage', { ownerId: w.id, targetId: z.id, causeId: 't', ordinal: 1 })
    const rolled = ctx.events.filter((e) => e.type === 'trigger.rolled')
    expect(rolled.length).toBe(1)
    expect(rolled[0]!['fired']).toBe(false)
    expect(rolled[0]!.causeId).toBe('trigger.test.rot')
    // a 0% trigger that leaves no line is indistinguishable from one that is not
    // wired in at all — the activation.idle lesson
    expect(ctx.events.some((e) => e.type === 'trigger.fired')).toBe(false)
  })

  it('a trigger that fires says what it did', () => {
    const ctx = duel([{ chance: 100 }])
    const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    fireTriggers(ctx, 'onDamage', { ownerId: w.id, targetId: z.id, causeId: 't', ordinal: 1 })
    const f = ctx.events.find((e) => e.type === 'trigger.fired')!
    expect(f['statusId']).toBe('status.poison')
    expect(f['value']).toBe(1)
    expect(statusValueOf(z, 'status.poison')).toBe(1)
  })
})

// ─── §5's hook order ────────────────────────────────────────────────────────
describe('triggers — §5 firing order', () => {
  const hooksSeen = (ctx: ReturnType<typeof duel>) =>
    ctx.events.filter((e) => e.type === 'trigger.rolled').map((e) => e['hook'])

  it('onAttack fires on every swing, hit or miss', () => {
    let miss = 0, hit = 0
    for (let r = 0; r < 40; r++) {
      const ctx = createCustomBattle(
        [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open', replicate: r })
      const w = ctx.state.units[0]!
      w.triggers = triggersFrom([T({ hook: 'onAttack', chance: 100, select: 'self',
        effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } })])
      ctx.state.units[1]!.hp = 99
      const res = performAttack(ctx, 0, 1, 'attack.warrior.axe')
      expect(hooksSeen(ctx)).toContain('onAttack')
      res.hit ? hit++ : miss++
    }
    expect(hit).toBeGreaterThan(0)
    expect(miss).toBeGreaterThan(0)   // and onAttack fired in both cases
  })

  it('onHit fires even when armor absorbs everything; onDamage does not', () => {
    const ctx = createCustomBattle(
      [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const w = ctx.state.units[0]!
    w.triggers = triggersFrom([
      T({ id: 'trigger.h', hook: 'onHit', chance: 100, source: 'h' }),
      T({ id: 'trigger.d', hook: 'onDamage', chance: 100, source: 'd' }),
    ])
    ctx.state.units[1]!.armor = 99      // absorbs the lot
    ctx.state.units[1]!.hp = 99
    ctx.state.units[0]!.accuracy = 999  // guarantee the hit
    performAttack(ctx, 0, 1, 'attack.warrior.axe')
    const seen = hooksSeen(ctx)
    expect(seen).toContain('onHit')
    expect(seen).not.toContain('onDamage')
  })

  it('onMiss and onHit are exclusive', () => {
    for (let r = 0; r < 30; r++) {
      const ctx = createCustomBattle(
        [{ type: 'warrior', hex: hexId(5, 5) }], [{ type: 'zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open', replicate: r })
      ctx.state.units[0]!.triggers = triggersFrom([
        T({ id: 'trigger.m', hook: 'onMiss', chance: 100, select: 'self', source: 'm' }),
        T({ id: 'trigger.h', hook: 'onHit', chance: 100, source: 'h' }),
      ])
      ctx.state.units[1]!.hp = 99
      performAttack(ctx, 0, 1, 'attack.warrior.axe')
      const seen = hooksSeen(ctx)
      expect(seen.includes('onMiss') && seen.includes('onHit')).toBe(false)
      expect(seen.includes('onMiss') || seen.includes('onHit')).toBe(true)
    }
  })
})

// ─── §5's scaling law ───────────────────────────────────────────────────────
describe('triggers — Magic scales off the PARTY-WIDE sum', () => {
  it('partyMagicSum totals the side, not the caster', () => {
    const ctx = createCustomBattle(
      [{ type: 'mage', hex: hexId(5, 5) }, { type: 'mage', hex: hexId(4, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const m = ctx.state.units[0]!
    expect(m.magic).toBe(2)
    expect(partyMagicSum(ctx, 'hero')).toBe(4)   // two mages
  })

  it('a Magic-scaled value uses the party total, and rounds as stated', () => {
    const one = createCustomBattle([{ type: 'mage', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const two = createCustomBattle(
      [{ type: 'mage', hex: hexId(5, 5) }, { type: 'mage', hex: hexId(4, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const spec = { scale: 'partyMagic', div: 5, round: 'up' } as const
    // one Mage: ceil(2/5) = 1.  Two Mages: ceil(4/5) = 1.  Three would be ceil(6/5) = 2.
    expect(valueOf(one, one.state.units[0]!, spec)).toBe(1)
    expect(valueOf(two, two.state.units[0]!, spec)).toBe(1)
    two.state.units[1]!.magic = 4                  // party total 6
    expect(valueOf(two, two.state.units[0]!, spec)).toBe(2)
  })

  it('the dead do not contribute to the party sum', () => {
    const ctx = createCustomBattle(
      [{ type: 'mage', hex: hexId(5, 5) }, { type: 'mage', hex: hexId(4, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    expect(partyMagicSum(ctx, 'hero')).toBe(4)
    ctx.state.units[1]!.lifeState = 'dead'
    expect(partyMagicSum(ctx, 'hero')).toBe(2)
  })
})

describe('triggers — the chance is a resolvable number', () => {
  it('resolves with a ledger, and clamps', () => {
    const ctx = duel([])
    const r = resolveTriggerChance(ctx, ctx.state.units[0]!, T({ chance: 20 }))
    expect(r.value).toBe(20)
    expect(r.ledger[0]!.name).toBe('BASE')
  })

  it('resolving is PURE — it emits nothing and rolls nothing', () => {
    const ctx = duel([{ chance: 50 }])
    const before = ctx.events.length
    const rollsBefore = ctx.rng.log.length
    for (let i = 0; i < 20; i++) resolveTriggerChance(ctx, ctx.state.units[0]!, T())
    expect(ctx.events.length).toBe(before)
    expect(ctx.rng.log.length).toBe(rollsBefore)
  })
})

describe('triggers — the mechanism is inert until content uses it', () => {
  it('no unit in a normal battle carries a trigger yet', () => {
    const ctx = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    for (const u of ctx.state.units) expect(u.triggers).toEqual([])
    expect(SELECTORS).toEqual(['self', 'target'])
  })
})
