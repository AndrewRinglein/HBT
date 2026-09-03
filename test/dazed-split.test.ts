// fix.dazed-split (2026-09-02) — Dazed is two things. Andrew, asked which of
// his two rulings Dazed is: "This is a problem with just ambiguity. It does two
// different things: there is a critical effect, and then there is a status
// effect. Do we need to disambiguate this right now, or can you account for
// that?" Accounted for: two ids.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canUsePower } from '../src/core/ability.js'
import { rollCritEffect } from '../src/core/crit.js'
import { applyStatus, tickUnitStatuses, valueOf } from '../src/core/status.js'
import { CRIT_CHART } from '../src/content/index.js'
import { STATUSES } from '../src/content/statuses.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const rig = (heroes: string[], heroHexes: number[], enemies: string[], enemyHexes: number[]) =>
  createBattle({ ...scenarioOptions(scenarioDef('showcase.alpha-team')), heroes, heroHexes, enemies, enemyHexes, enemyCount: enemies.length })

describe('two ids, two meanings', () => {
  it('the chart\'s Dazed row applies status.powers-locked, which locks class powers; status.dazed locks nothing', () => {
    const ctx = rig(['alpha-lucius', 'alpha-oathblade'], [135, 134], ['unit.zombie'], [118])
    const lucius = ctx.state.units.find((u) => u.typeId === 'alpha-lucius')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    oath.hp = 1
    // the Codex status: applied, carried, and it locks NOTHING in the engine
    applyStatus(ctx, lucius.id, 'status.dazed', 2, 'test')
    expect(valueOf(lucius, 'status.dazed')).toBe(2)
    expect(canUsePower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal'), 'Dazed the status hands control to the AI — it does not lock powers').toBe(true)
    // the chart's row
    ;(ctx as { critChart: typeof CRIT_CHART }).critChart = [CRIT_CHART.find((r) => r.key === 'dazed')!]
    rollCritEffect(ctx, z.id, lucius.id, 1, 'attack.zombie.claw')
    expect(valueOf(lucius, 'status.powers-locked')).toBe(3)
    expect(canUsePower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal'), '"loses access to class powers"').toBe(false)
    const applied = ctx.events.find((e) => e.type === 'status.applied' && e['statusId'] === 'status.powers-locked')!
    expect(applied, 'the chart row is the cause').toBeDefined()
  })
  it('both rows are declared with the meaning the Codex gives them, and the flags are data', () => {
    expect(STATUSES['status.powers-locked']!.locksPowers).toBe(true)
    expect(STATUSES['status.powers-locked']!.aiControlled).toBeUndefined()
    expect(STATUSES['status.dazed']!.aiControlled).toBe(true)
    expect(STATUSES['status.dazed']!.locksPowers).toBeUndefined()
    expect(CRIT_CHART.find((r) => r.key === 'dazed')!.name, 'the chart row keeps its dictated name').toBe('Dazed')
  })
  it('status.dazed decays and expires like any counter — it is recorded, not inert', () => {
    const ctx = rig(['alpha-lucius'], [135], ['unit.zombie'], [118])
    const lucius = ctx.state.units[0]!
    applyStatus(ctx, lucius.id, 'status.dazed', 1, 'test')
    tickUnitStatuses(ctx, lucius.id)
    expect(lucius.statuses.find((s) => s.id === 'status.dazed')).toBeUndefined()
    expect(ctx.events.some((e) => e.type === 'status.expired' && e['statusId'] === 'status.dazed')).toBe(true)
  })
})

describe('in real battles', () => {
  it('the chart lands Powers Locked somewhere in the standard battle\'s first 60 seeds, and never Dazed (no source applies it yet)', () => {
    let locked = 0, dazed = 0
    for (let r = 0; r < 60; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 }); runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'status.applied' && e['statusId'] === 'status.powers-locked') locked++
        if (e.type === 'status.applied' && e['statusId'] === 'status.dazed') dazed++
      }
    }
    expect(locked).toBeGreaterThan(0)
    expect(dazed, 'nothing in the standard battle applies the Codex Dazed yet — when a source lands, this number is the finding').toBe(0)
  })
})
