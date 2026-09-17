// COMBAT-V2-DESIGN §§4/7/15/18 supersede the legacy area-attack lifecycle.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { executeAction } from '../src/core/commands.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { isAttack } from '../src/core/action.js'

const rig = () => createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))

describe('V2 bursts replace area attacks', () => {
  it('the existing authored cleave is a burst, not an attack profile', () => {
    const ctx = rig()
    expect(isAttack(ctx.actions['attack.test-arc.sweep']!)).toBe(false)
    expect(ctx.actions['attack.test-arc.sweep']).toMatchObject({
      burst: { shape: { kind: 'arc' }, side: 'any' },
    })
  })

  it('accepts a legal empty centre hex through the shared command path', () => {
    const ctx = rig(), actor = ctx.state.units.find(u => u.typeId === 'test-arc-golem')!
    beginActivation(ctx, actor.id, 'test')
    const centre = ctx.geo.neighboursOf(actor.hex).find(h => !ctx.state.units.some(u => u.hex === h))!
    expect(centre).toBeDefined()
    expect(executeAction(ctx, { actor: actor.id, actionId: 'attack.test-arc.sweep', centre })).toEqual({ ok: true })
    expect(ctx.events.some(e => e.type === 'burst.declared' && e['centre'] === centre)).toBe(true)
  })

  it('rejects a unit-target request for a burst without changing state, events or RNG', () => {
    const ctx = rig(), actor = ctx.state.units.find(u => u.typeId === 'test-arc-golem')!
    const target = ctx.state.units.find(u => u.hex === 118)!
    beginActivation(ctx, actor.id, 'test')
    const before = JSON.stringify({ state: ctx.state, events: ctx.events, rng: ctx.rng })
    expect(executeAction(ctx, { actor: actor.id, actionId: 'attack.test-arc.sweep', target: target.id }).ok).toBe(false)
    expect(JSON.stringify({ state: ctx.state, events: ctx.events, rng: ctx.rng })).toBe(before)
  })

  it('automatic fielding resolves the authored burst without any attack hooks for that action', () => {
    const ctx = rig()
    runBattle(ctx)
    const own = ctx.events.filter(e => e.causeId === 'attack.test-arc.sweep')
    expect(own.some(e => e.type === 'burst.declared')).toBe(true)
    expect(own.some(e => e.type.startsWith('attack.'))).toBe(false)
    expect(ctx.events.some(e => e.type === 'trigger.rolled' && e['source'] === 'unit.test-arc-golem' && e['hook'] === 'onAttack')).toBe(false)
  })
})
