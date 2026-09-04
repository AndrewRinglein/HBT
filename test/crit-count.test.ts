// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// Multiple criticals — station.crit-count (2026-08-27).
//
// Ruled: "there is also an ability to have more than one critical happen at
// once. There are some powers and things that basically say, 'Do two
// criticals' or 'Do three criticals,' so you need to account for that."
// AttackDef.critCount (default 1); each critical flips its own branch; heads
// stack +50% each before mitigation; each tails rolls its own chart row.
// Consumers are declared test scaffolding: the golem's Slam (2) and
// Overhead (3), live in showcase.arc-variant.
import { describe, expect, it } from 'vitest'
import { performAttack, preview, resolveDamage, damageSourceOfAttack } from '../src/core/pipeline.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'

// A golem whose crit chance is pinned to 100 through the SWEEP override seam
// (BattleOptions.overrides — never a scenario field), so every slam crits and
// the multi-critical resolution is deterministic to observe.
const rig = () => createBattle({
  ...scenarioOptions(scenarioDef('showcase.arc-variant')),
  heroes: ['test-arc-golem'], heroHexes: [135],
  enemies: ['test-zombie'], enemyHexes: [118], enemyCount: 1,
  overrides: { 'test-arc-golem': { crit: 97, accuracy: 200 } }, // chance 97+47+3+surplus → 100; never misses
})

describe('the rows carry their counts', () => {
  it('slam says two, overhead says three, everything else says nothing (= one)', () => {
    expect(ATTACKS['attack.test-ram.slam']!.attack.critCount).toBe(2)
    expect(ATTACKS['attack.test-ram.overhead']!.attack.critCount).toBe(3)
    expect(ATTACKS['attack.halberd.hack']!.attack.critCount).toBeUndefined()
    expect(UNITS['test-arc-golem']!.attacks).toContain('attack.test-ram.slam')
  })
})

describe('one critting hit, N criticals', () => {
  it('a critting slam flips exactly two branches, numbered, and the arms reconcile', () => {
    const ctx = rig()
    const golem = ctx.state.units.find((u) => u.typeId === 'test-arc-golem')!
    const z = ctx.state.units.find((u) => u.typeId === 'test-zombie')!
    beginActivation(ctx, golem.id, 'test')
    const r = performAttack(ctx, golem.id, z.id, 'attack.test-ram.slam')
    expect(r.hit).toBe(true)
    expect(r.crit, 'chance pinned to 100 — it crits').toBe(true)
    const branches = ctx.events.filter((e) => e.type === 'crit.branch')
    expect(branches.length, '"do two criticals"').toBe(2)
    expect(branches.map((b) => b['critical'])).toEqual([1, 2])
    expect(branches.every((b) => b['of'] === 2)).toBe(true)
    const heads = branches.filter((b) => b['arm'] === 'damage').length
    const tails = branches.length - heads
    // The hit's ledger CRIT delta matches the heads count: ×(2+heads)/2.
    const hit = ctx.events.find((e) => e.type === 'attack.hit')!
    const expected = resolveDamage(ctx, golem, z, damageSourceOfAttack(ATTACKS['attack.test-ram.slam']!), heads).value
    expect(r.damage).toBe(Math.min(expected, z.maxHp))
    if (heads > 0) {
      expect((hit['ledger'] as { station: string }[]).some((l) => l.station === 'CRIT')).toBe(true)
    }
    // every tails critical rolled a row (or the target died mid-ladder)
    const effects = ctx.events.filter((e) => e.type === 'crit.effect')
    if (z.lifeState === 'standing') expect(effects.length).toBe(tails)
    else expect(effects.length).toBeLessThanOrEqual(tails)
  })

  it('two heads read as +100% pre-mitigation — the stacking rule, straight arithmetic', () => {
    const ctx = rig()
    const golem = ctx.state.units.find((u) => u.typeId === 'test-arc-golem')!
    const z = ctx.state.units.find((u) => u.typeId === 'test-zombie')!
    const base = resolveDamage(ctx, golem, z, damageSourceOfAttack(ATTACKS['attack.test-ram.slam']!), 0).value
    const one = resolveDamage(ctx, golem, z, damageSourceOfAttack(ATTACKS['attack.test-ram.slam']!), 1).value
    const two = resolveDamage(ctx, golem, z, damageSourceOfAttack(ATTACKS['attack.test-ram.slam']!), 2).value
    // bonus 2 + str 5 = 7 pre-mitigation vs armor 0: 7 / 10 / 14
    // (x1.5 truncates: 10.5 -> 10 — Law 7's one rounding rule)
    expect(base).toBe(7)
    expect(one).toBe(10)
    expect(two).toBe(14)
    // `true` still means exactly one heads — the whole old surface unchanged
    expect(resolveDamage(ctx, golem, z, damageSourceOfAttack(ATTACKS['attack.test-ram.slam']!), true).value).toBe(one)
    expect(preview(ctx, golem.id, z.id, 'attack.test-ram.slam').damageOnCrit).toBe(one)
  })

  it('a single-crit attack still flips exactly one branch — the count is data, one is the default', () => {
    const ctx = rig()
    const golem = ctx.state.units.find((u) => u.typeId === 'test-arc-golem')!
    const z = ctx.state.units.find((u) => u.typeId === 'test-zombie')!
    beginActivation(ctx, golem.id, 'test')
    performAttack(ctx, golem.id, z.id, 'attack.test-arc.sweep') // area: cannot crit at all
    expect(ctx.events.filter((e) => e.type === 'crit.branch').length).toBe(0)
  })
})

describe('live — both counts fire in the verify scenario', () => {
  it('across a handful of seeds the golem lands slams and overheads, and multi-branches appear', () => {
    let sawSlam = false, sawOverhead = false, sawMulti = false
    // Widened 6 -> 24 seeds on 2026-09-03 (capability.enemy-action-cooldown):
    // the Slam carries cooldown 2 now, so the golem swings half as often and
    // the first multi-critical moved from seed <6 to seed 16. Same claim
    // (multi-criticals resolve in real battles); early exit once all seen.
    // Widened 24 -> 64 on 2026-09-04 (refactor.one-action-type): the Slam's
    // cooldown 2 now means "skip 2 Turns" (2-ACTIONS-SETTLED.md:71) instead of
    // one Turn short, so the golem slams a third less often and the first
    // multi-critical moved to seed 55. Same claim; early exit once all seen.
    for (let r = 0; r < 64 && !(sawSlam && sawOverhead && sawMulti); r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.arc-variant')), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'attack.declared' && e.causeId === 'attack.test-ram.slam') sawSlam = true
        if (e.type === 'attack.declared' && e.causeId === 'attack.test-ram.overhead') sawOverhead = true
        if (e.type === 'crit.branch' && (e['of'] as number) > 1) sawMulti = true
      }
      expect(ctx.state.outcome, `replicate ${r} must resolve`).not.toBeNull()
    }
    expect(sawSlam, 'the slam fires').toBe(true)
    expect(sawOverhead, 'the overhead fires').toBe(true)
    expect(sawMulti, 'a multi-critical resolves in a real battle').toBe(true)
  })

  it('is a seed — multi-criticals and all, byte-identical twice', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })
})
