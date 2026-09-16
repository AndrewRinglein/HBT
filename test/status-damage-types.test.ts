// Law10 / V2 sections8.2 and18 (2026-09-07): named elemental defense supersedes
// magic Resist for Burn/Poison. Preserve exact tick/decay assertions under the new stat.
// Typed status ticks — fix.status-damage-types (2026-08-27).
//
// RULED: "Status damage from poison and burn is magic damage. It should be
// blue. It gets reduced by resist. Bleed damage is true damage. Thorns damage
// that is dealt is true damage." The tick's type is a STATUS ROW field
// (tickDamageType); magic ticks are resist-reduced — the same arithmetic the
// 2026-08-20 tickMitigatedByResist flag carried — and true ticks are flat.
import { describe, expect, it } from 'vitest'
import { STATUSES } from '../src/content/statuses.js'
import { UNITS } from '../src/content/index.js'
import { applyStatus, tickUnitStatuses } from '../src/core/status.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const rig = () => createBattle({
  ...scenarioOptions(scenarioDef('showcase.alpha-team')),
  heroes: ['alpha-oathblade'], heroHexes: [135],
  enemies: ['unit.zombie'], enemyHexes: [1], enemyCount: 1,
})

describe('the rows carry their types', () => {
  it('poison and burn tick their elements; bleed ticks TRUE; nothing carries the old flag', () => {
    expect(STATUSES['status.poison']!.tickDamageType).toBe('poison')
    expect(STATUSES['status.burn']!.tickDamageType).toBe('fire')
    expect(STATUSES['status.bleed']!.tickDamageType).toBe('true')
    for (const s of Object.values(STATUSES)) {
      expect('tickMitigatedByResist' in s, `${s.id} still carries the retired flag`).toBe(false)
    }
  })
})

describe('the tick — type on the event, mitigation by the type', () => {
  it('a poison tick says POISON and Poison Resist reduces it', () => {
    const ctx = rig()
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    oath.mods.push({ stat: 'poisonResist', op: 'add', value: 2, source: 'test', scope: 'unit' })
    applyStatus(ctx, oath.id, 'status.poison', 5, 'test')
    const hpBefore = oath.hp
    tickUnitStatuses(ctx, oath.id)
    const tick = ctx.events.find((e) => e.type === 'damage.applied' && e.causeId === 'status.poison')!
    expect(tick['damageType'], 'V2 poison element').toBe('poison')
    expect(tick['resisted'], '"it gets reduced by resist"').toBe(2)
    expect(tick['amount']).toBe(3) // 5 − resist 2
    expect(oath.hp).toBe(hpBefore - 3)
  })

  it('a bleed tick says TRUE and resist never touches it', () => {
    const ctx = rig()
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    oath.mods.push({ stat: 'resist', op: 'add', value: 99, source: 'test', scope: 'unit' })
    applyStatus(ctx, oath.id, 'status.bleed', 3, 'test')
    const hpBefore = oath.hp
    tickUnitStatuses(ctx, oath.id)
    const tick = ctx.events.find((e) => e.type === 'damage.applied' && e.causeId === 'status.bleed')!
    expect(tick['damageType'], '"Bleed damage is true damage"').toBe('true')
    expect(tick['resisted']).toBeUndefined()
    // LAW 10 — 2026-09-02 (fix.bleed-magnitude): the tick is the value (3),
    // not the retired flat 2 — Codex S41. The claim under test — TRUE, and
    // resist 99 changes nothing — is unchanged.
    expect(tick['amount'], 'the value, resist 99 notwithstanding').toBe(3)
    expect(oath.hp).toBe(hpBefore - 3)
  })
})

describe('thorns — retaliation damage is TRUE', () => {
  it('the test golem\'s hide deals 1 TRUE back to its attacker, live in the scenario', () => {
    expect((UNITS['test-arc-golem']!.triggers ?? []).some((t) =>
      t.id === 'trigger.test-thorns' && t.effect.kind === 'damage'
      && (t.effect as { damageType: string }).damageType === 'true')).toBe(true)
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))
    runBattle(ctx)
    const thorns = ctx.events.filter((e) => e.type === 'damage.applied' && e.causeId === 'trigger.test-thorns')
    expect(thorns.length, 'zombies bite the golem — the hide answers').toBeGreaterThan(0)
    for (const t of thorns) expect(t['damageType']).toBe('true')
  })
})

describe('still a seed', () => {
  it('typed ticks change nothing about determinism', () => {
    const run = () => {
      const ctx = createBattle(scenarioOptions(scenarioDef('showcase.alpha-team')))
      const r = runBattle(ctx)
      return `${r.outcome}:${r.turns}:${ctx.events.length}`
    }
    expect(run()).toBe(run())
  })
})
