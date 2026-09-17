// V2 sections 4/7/15/18 replace the former area-attack lifecycle.
// Retain geometry, exact damage, friendly fire, AI and complete determinism.
import { describe, expect, it } from 'vitest'
import { burstHexes, previewBurst, useBurst } from '../src/core/burst.js'
import { BURSTS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { runActivation } from '../src/ai/modes.js'
const sweep = 'attack.test-arc.sweep'
const mk = () => createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))
describe('authored burst geometry and lifecycle', () => {
  it('retains exactly the three-hex arc and seven-hex radius-one disk', () => {
    const ctx = mk(), arc = burstHexes(ctx, 135, 118, BURSTS[sweep]!)
    expect(arc).toEqual([118, 119, 134])
    for (const h of arc.filter(h => h !== 118)) {
      expect(ctx.geo.distance(135, h)).toBe(1); expect(ctx.geo.distance(118, h)).toBe(1)
    }
    expect(burstHexes(ctx, 135, 118, BURSTS['power.lightning-staff.storm']!))
      .toEqual([118, ...ctx.geo.neighboursOf(118)].sort((a, b) => a - b))
  })
  it('retains exact damage and targets without any hit or crit rolls', () => {
    const ctx = mk(), golem = ctx.state.units.find(u => u.typeId === 'test-arc-golem')!
    const pv = previewBurst(ctx, golem.id, 118, sweep)
    expect(pv.damage).toBe(12); expect(pv.targets.map(t => t.damage)).toEqual([6, 6])
    expect(pv).not.toHaveProperty('hitChance'); expect(pv).not.toHaveProperty('critChance')
    const before = structuredClone(ctx.rng)
    beginActivation(ctx, golem.id, 'test'); useBurst(ctx, golem.id, 118, sweep)
    expect(ctx.rng).toEqual(before)
    expect(ctx.events.filter(e => e.causeId === sweep && e.type === 'burst.declared')).toHaveLength(1)
    expect(ctx.events.filter(e => e.causeId === sweep && e.type === 'burst.struck').map(e => e.target)).toEqual(pv.targets.map(t => t.id))
    for (const t of pv.targets) expect(ctx.state.units[t.id]!.hp).toBe(ctx.state.units[t.id]!.maxHp - 6)
    expect(ctx.events.some(e => e.causeId === sweep && e.type.startsWith('attack.'))).toBe(false)
  })
  for (const side of ['any', 'enemy'] as const) it(`uses the authored ${side} filter for allies in the wedge`, () => {
    const ctx = createBattle({...scenarioOptions(scenarioDef('showcase.arc-variant')),
      heroes: ['test-arc-golem', 'test-arc-golem'], heroHexes: [135, 119], enemies: ['test-zombie'], enemyHexes: [118], enemyCount: 1})
    const actor = ctx.state.units.find(u => u.hex === 135)!, friend = ctx.state.units.find(u => u.hex === 119)!
    const a = BURSTS[sweep]!
    ctx.actions = {...ctx.actions, [sweep]: {...a, burst: {...a.burst, side}}}
    expect(previewBurst(ctx, actor.id, 118, sweep).targets.some(t => t.id === friend.id)).toBe(side === 'any')
    beginActivation(ctx, actor.id, 'test'); useBurst(ctx, actor.id, 118, sweep)
    expect(friend.hp).toBe(friend.maxHp - (side === 'any' ? 4 : 0))
  })
  it('AI chooses a useful multi-enemy burst and refuses harmful friendly fire', () => {
    const base = scenarioOptions(scenarioDef('showcase.alpha-team'))
    for (const friend of [false, true]) {
      const ctx = createBattle({...base, heroes: friend ? ['alpha-oathblade', 'hero.base.ranger-aggressive'] : ['alpha-oathblade'],
        heroHexes: friend ? [135, 119] : [135], enemies: ['unit.zombie', 'unit.zombie'], enemyHexes: friend ? [118, 134] : [118, 119], enemyCount: 2})
      const actor = ctx.state.units.find(u => u.typeId === 'alpha-oathblade')!
      beginActivation(ctx, actor.id, 'test'); runActivation(ctx, actor.id)
      const bursts = ctx.events.filter(e => e.actor === actor.id && e.type === 'burst.declared')
      if (!friend) expect(bursts[0]?.causeId).toBe('attack.halberd.cleave')
      else for (const e of ctx.events.filter(e => e.actor === actor.id && e.type === 'burst.struck')) expect(ctx.state.units[e.target!]!.side).toBe('enemy')
      expect(ctx.events.some(e => e.actor === actor.id && ['attack.declared', 'burst.declared'].includes(e.type))).toBe(true)
    }
  })
  it('the verify battle is fully deterministic and really strikes multiple victims', () => {
    const a = mk(), b = mk(); expect(runBattle(a)).toEqual(runBattle(b))
    expect(a.state).toEqual(b.state); expect(a.events).toEqual(b.events); expect(a.rng).toEqual(b.rng)
    const declaration = a.events.findIndex(e => e.type === 'burst.declared' && e.causeId === sweep)
    expect(declaration).toBeGreaterThan(-1)
    const next = a.events.findIndex((e, i) => i > declaration && e.type === 'burst.declared')
    expect(a.events.slice(declaration, next < 0 ? undefined : next).filter(e => e.type === 'burst.struck' && e.causeId === sweep).length).toBeGreaterThanOrEqual(2)
  })
})
