import { describe, it, expect } from 'vitest'
import { UNITS } from '../src/content/index.js'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack } from '../src/core/pipeline.js'
import { settle } from '../src/core/settle.js'
import { applyDamage } from '../src/core/mutate.js'
import { valueOf as statusValueOf } from '../src/core/status.js'
import {
  HOOKS, SELECTORS, validateTrigger, triggersFrom, resolveTriggerChance,
  partyMagicSum, valueOf, fireTriggers, selectOf,
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
    [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
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
        [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
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
        [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open', replicate: r })
      const w = ctx.state.units[0]!
      w.triggers = triggersFrom([T({ hook: 'onAttack', chance: 100, select: 'self',
        effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } })])
      ctx.state.units[1]!.hp = 99
      const res = performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
      expect(hooksSeen(ctx)).toContain('onAttack')
      res.hit ? hit++ : miss++
    }
    expect(hit).toBeGreaterThan(0)
    expect(miss).toBeGreaterThan(0)   // and onAttack fired in both cases
  })

  it('onHit fires even when armor absorbs everything; onDamage does not', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const w = ctx.state.units[0]!
    w.triggers = triggersFrom([
      T({ id: 'trigger.h', hook: 'onHit', chance: 100, source: 'h' }),
      T({ id: 'trigger.d', hook: 'onDamage', chance: 100, source: 'd' }),
    ])
    ctx.state.units[1]!.armor = 99      // absorbs the lot
    ctx.state.units[1]!.hp = 99
    ctx.state.units[0]!.accuracy = 999  // guarantee the hit
    performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
    const seen = hooksSeen(ctx)
    expect(seen).toContain('onHit')
    expect(seen).not.toContain('onDamage')
  })

  it('onMiss and onHit are exclusive', () => {
    for (let r = 0; r < 30; r++) {
      const ctx = createCustomBattle(
        [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open', replicate: r })
      ctx.state.units[0]!.triggers = triggersFrom([
        T({ id: 'trigger.m', hook: 'onMiss', chance: 100, select: 'self', source: 'm' }),
        T({ id: 'trigger.h', hook: 'onHit', chance: 100, source: 'h' }),
      ])
      ctx.state.units[1]!.hp = 99
      performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
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
      [{ type: 'test-mage', hex: hexId(5, 5) }, { type: 'test-mage', hex: hexId(4, 5) }],
      [{ type: 'test-zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const m = ctx.state.units[0]!
    expect(m.magic).toBe(2)
    expect(partyMagicSum(ctx, 'hero')).toBe(4)   // two mages
  })

  it('a Magic-scaled value uses the party total, and rounds as stated', () => {
    const one = createCustomBattle([{ type: 'test-mage', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const two = createCustomBattle(
      [{ type: 'test-mage', hex: hexId(5, 5) }, { type: 'test-mage', hex: hexId(4, 5) }],
      [{ type: 'test-zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    const spec = { scale: 'partyMagic', div: 5, round: 'up' } as const
    // one Mage: ceil(2/5) = 1.  Two Mages: ceil(4/5) = 1.  Three would be ceil(6/5) = 2.
    expect(valueOf(one, one.state.units[0]!, spec)).toBe(1)
    expect(valueOf(two, two.state.units[0]!, spec)).toBe(1)
    two.state.units[1]!.magic = 4                  // party total 6
    expect(valueOf(two, two.state.units[0]!, spec)).toBe(2)
  })

  it('the dead do not contribute to the party sum', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-mage', hex: hexId(5, 5) }, { type: 'test-mage', hex: hexId(4, 5) }],
      [{ type: 'test-zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
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

describe('triggers — every trigger on the board is declared content', () => {
  // Until 2026-08-20 this asserted that NO unit carried a trigger — the mechanism
  // was built before any content used it, and the guard proved inertness. The
  // warrior's second-wind (status.regeneration's scaffolding source) is the first
  // real carrier, so the guard is rewritten as the rule it was protecting: a
  // trigger appears on a unit only because the unit's DEF declared it. No trigger
  // arrives from anywhere else.
  it('units carry exactly the triggers their defs declare, copied not shared', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
    for (const u of ctx.state.units) {
      const declared = (UNITS[u.typeId]?.triggers ?? []).map((t) => t.id)
      expect(u.triggers.map((t) => t.id)).toEqual(declared)
    }
    expect(SELECTORS).toEqual(['self', 'target'])
  })
})

// ─── the sequence itself, as an assertion ───────────────────────────────────
describe('COMBAT-SEQUENCE.md per-hit order', () => {
  // Angela, 2026-08-15: "On Attack happens the second the attack starts. It has
  // nothing to do with hitting or missing." The document had it at step 6, after
  // Apply, where a miss could never reach it. The code happened to be right and the
  // document wrong — which is luck, not correctness, so the ORDER is asserted here.
  const order = (ctx: ReturnType<typeof duel>) =>
    ctx.events
      .filter((e) => e.type === 'trigger.rolled' || e.type === 'attack.hit' ||
                     e.type === 'attack.miss' || e.type === 'damage.applied')
      .map((e) => (e.type === 'trigger.rolled' ? String(e['hook']) : e.type))

  function swing(replicate: number) {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
      { mapId: 'map.open', replicate })
    ctx.state.units[0]!.triggers = triggersFrom([
      T({ id: 'trigger.a', hook: 'onAttack', chance: 100, select: 'self', source: 'a',
          effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }),
      T({ id: 'trigger.m', hook: 'onMiss', chance: 100, select: 'self', source: 'm',
          effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }),
      T({ id: 'trigger.h', hook: 'onHit', chance: 100, select: 'target', source: 'h' }),
      T({ id: 'trigger.d', hook: 'onDamage', chance: 100, select: 'target', source: 'd' }),
    ])
    ctx.state.units[1]!.hp = 99
    performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
    return order(ctx)
  }

  it('onAttack is FIRST — before the to-hit roll is even known', () => {
    for (let r = 0; r < 40; r++) expect(swing(r)[0]).toBe('onAttack')
  })

  it('a miss runs onAttack then onMiss, and nothing else', () => {
    const missed = Array.from({ length: 60 }, (_, r) => swing(r)).find((o) => o.includes('attack.miss'))!
    expect(missed).toEqual(['onAttack', 'attack.miss', 'onMiss'])
  })

  it('a hit runs the full tail in Angela\'s stated order', () => {
    // "On attack triggers, roll to hit, on hit or on miss trigger, a variety of
    //  things happen with damage application. If damage is applied on damage
    //  triggers, then on taking damage triggers, then on kill triggers if there's
    //  a kill." — 2026-08-15
    const hit = Array.from({ length: 60 }, (_, r) => swing(r)).find((o) => o.includes('attack.hit'))!
    expect(hit).toEqual(['onAttack', 'attack.hit', 'onHit', 'damage.applied', 'onDamage'])
  })

  it('onTakingDamage belongs to the VICTIM and fires after onDamage', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
      { mapId: 'map.open' })
    const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    w.accuracy = 999
    z.hp = 99
    w.triggers = triggersFrom([T({ id: 'trigger.d', hook: 'onDamage', chance: 100, source: 'd' })])
    // the zombie's own trigger — it fires because the zombie was hit, not because
    // it swung, and it aims back at whoever hit it
    z.triggers = triggersFrom([T({ id: 'trigger.t', hook: 'onTakingDamage', chance: 100,
      select: 'target', source: 't',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 2 } })])
    performAttack(ctx, 0, 1, 'attack.test-warrior.axe')

    const seq = ctx.events.filter((e) => e.type === 'trigger.rolled').map((e) => String(e['hook']))
    expect(seq).toEqual(['onDamage', 'onTakingDamage'])
    // the retaliation landed on the ATTACKER (2), and the attacker's own onDamage
    // landed on the victim (1) — each trigger aimed from its own owner
    expect(statusValueOf(w, 'status.poison')).toBe(2)
    expect(statusValueOf(z, 'status.poison')).toBe(1)
  })

  it('onKill fires last, and only on a kill', () => {
    const mk = (hp: number) => {
      const ctx = createCustomBattle(
        [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open' })
      const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
      w.accuracy = 999
      z.hp = hp
      w.triggers = triggersFrom([
        T({ id: 'trigger.d', hook: 'onDamage', chance: 100, source: 'd' }),
        T({ id: 'trigger.k', hook: 'onKill', chance: 100, select: 'self', source: 'k',
            effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } }),
      ])
      performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
      return ctx.events.filter((e) => e.type === 'trigger.rolled').map((e) => String(e['hook']))
    }
    expect(mk(99)).toEqual(['onDamage'])                 // survived
    expect(mk(1)).toEqual(['onDamage', 'onKill'])        // died — onKill last
  })
})

// ─── onDeath — the victim's, and it fires from settle ───────────────────────
describe('onDeath', () => {
  it('fires for the unit that died, whose owner is dead by definition', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
      { mapId: 'map.open' })
    const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    w.accuracy = 999
    z.hp = 1
    // the zombie's parting shot: poison whoever is nearby when it dies
    z.triggers = triggersFrom([T({ id: 'trigger.rot', hook: 'onDeath', chance: 100, source: 'z',
      select: { select: 'area', side: 'enemy', radius: 2, origin: 'self' },
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 3 } })])
    performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
    settle(ctx, 'test')
    expect(z.lifeState).toBe('dead')
    expect(ctx.events.some((e) => e.type === 'trigger.rolled' && e['hook'] === 'onDeath')).toBe(true)
    expect(statusValueOf(w, 'status.poison')).toBe(3)   // the corpse got its revenge
  })

  it('also fires when death comes from a status tick, not an attack', () => {
    // This is why onDeath lives in settle: a hook wired only into performAttack
    // would miss every poison death and every bleed-out.
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
      { mapId: 'map.open' })
    const z = ctx.state.units[1]!
    z.hp = 1
    z.triggers = triggersFrom([T({ id: 'trigger.rot', hook: 'onDeath', chance: 100, select: 'self',
      source: 'z', effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 } })])
    applyDamage(ctx, z.id, 5, 'status.poison', { actor: null })
    settle(ctx, 'status.poison')
    expect(z.lifeState).toBe('dead')
    const d = ctx.events.filter((e) => e.type === 'trigger.rolled' && e['hook'] === 'onDeath')
    expect(d.length).toBe(1)
    expect(d[0]!.causeId).toBe('trigger.rot')
  })

  it('a dead unit fires nothing ELSE — only onDeath is excepted', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
      { mapId: 'map.open' })
    const z = ctx.state.units[1]!
    z.lifeState = 'dead'
    z.triggers = triggersFrom([T({ id: 'trigger.x', hook: 'onDamage', chance: 100, select: 'self', source: 'z' })])
    fireTriggers(ctx, 'onDamage', { ownerId: z.id, targetId: 0, causeId: 't', ordinal: 1 })
    expect(ctx.events.some((e) => e.type === 'trigger.rolled')).toBe(false)
  })

  it('onDeath has no target, so select:"target" is a load error', () => {
    expect(() => validateTrigger(T({ hook: 'onDeath', select: 'target' }))).toThrow(/has no target/)
    expect(() => validateTrigger(T({ hook: 'onDeath', select: 'self' }))).not.toThrow()
  })
})

describe('onCrit', () => {
  it('fires the instant a crit is confirmed, before damage', () => {
    let sawCrit = 0, sawOrder = 0
    for (let r = 0; r < 400 && sawCrit < 3; r++) {
      const ctx = createCustomBattle(
        [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
        { mapId: 'map.open', replicate: r })
      const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
      ctx.cfg.switches.critEnabled = true
      w.accuracy = 160          // surplus accuracy above 100 becomes crit chance
      z.hp = 99
      w.triggers = triggersFrom([T({ id: 'trigger.c', hook: 'onCrit', chance: 100, source: 'c' })])
      performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
      const hit = ctx.events.find((e) => e.type === 'attack.hit')
      if (!hit?.['crit']) continue
      sawCrit++
      const seq = ctx.events
        .filter((e) => e.type === 'trigger.rolled' || e.type === 'damage.applied')
        .map((e) => (e.type === 'trigger.rolled' ? String(e['hook']) : e.type))
      // onCrit precedes the damage it modifies nothing about
      expect(seq.indexOf('onCrit')).toBeGreaterThanOrEqual(0)
      expect(seq.indexOf('onCrit')).toBeLessThan(seq.indexOf('damage.applied'))
      sawOrder++
    }
    expect(sawCrit).toBeGreaterThan(0)
    expect(sawOrder).toBe(sawCrit)
  })

  it('does not fire when the attack does not crit', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }],
      { mapId: 'map.open' })
    const [w, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
    ctx.cfg.switches.critEnabled = false     // crit system off entirely
    w.accuracy = 999; z.hp = 99
    w.triggers = triggersFrom([T({ id: 'trigger.c', hook: 'onCrit', chance: 100, source: 'c' })])
    performAttack(ctx, 0, 1, 'attack.test-warrior.axe')
    expect(ctx.events.some((e) => e.type === 'trigger.rolled' && e['hook'] === 'onCrit')).toBe(false)
  })
})

describe('area origin — TRIGGER-NOTES Q2, answered explicitly', () => {
  it('origin:self is a whirlwind; origin:target is a cleave', () => {
    const ctx = createCustomBattle(
      [{ type: 'test-warrior', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(6, 5) },     // 1 — adjacent to the warrior
       { type: 'test-zombie', hex: hexId(8, 5) },     // 2 — adjacent to unit 1's far side
       { type: 'test-zombie', hex: hexId(7, 5) }],    // 3 — between them
      { mapId: 'map.open' })
    const w = ctx.state.units[0]!
    const whirl = { select: 'area', side: 'enemy', radius: 1, origin: 'self' } as const
    const cleave = { select: 'area', side: 'enemy', radius: 1, origin: 'target' } as const
    w.triggers = triggersFrom([T({ id: 'trigger.w', hook: 'onHit', chance: 100, select: whirl, source: 'w' })])
    expect(selectOf(ctx, w.triggers[0]!, { ownerId: 0, targetId: 3, causeId: 't', ordinal: 1 }))
      .toEqual([1])                              // around the WARRIOR
    w.triggers = triggersFrom([T({ id: 'trigger.c', hook: 'onHit', chance: 100, select: cleave, source: 'c' })])
    expect(selectOf(ctx, w.triggers[0]!, { ownerId: 0, targetId: 3, causeId: 't', ordinal: 1 }))
      // around the TARGET at (7,5): units 1, 2 and 3 are all within 1 of it.
      // I first wrote [2,3] and forgot the zombie on the near side — the engine
      // was right and the expectation was sloppy.
      .toEqual([1, 2, 3])
  })

  it('origin only means something for an area', () => {
    expect(() => validateTrigger(T({ select: { select: 'unit', side: 'enemy', origin: 'self' } as never })))
      .toThrow(/origin only/)
  })
})
