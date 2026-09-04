// capability.enemy-action-cooldown (2026-09-03) — ENEMY-REVIEW P10, ruled
// 2026-08-23 as "probably just permission to use the same fields": an attack
// carries cooldown and warmup like a power, tracked in the unit's one
// cooldowns map. The Ghoul's Devour (cooldown 3) is the first authored row;
// the golem's Slam (cooldown 2, test lane) is the second, and it shows in a
// real battle where Devour — never the AI's first choice — does not yet.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canAttack, performAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { ATTACKS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { hexId } from './board16.js'

describe('an attack on cooldown', () => {
  it('Devour: legal, used, then refused until Turn now + cooldown', () => {
    const cd = ATTACKS['attack.ghoul.devour']!.cooldown!
    expect(cd).toBeGreaterThan(0)
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.ghoul', hex: hexId(5, 6) }])
    const g = ctx.state.units[1]!, w = ctx.state.units[0]!
    w.hp = 99; w.maxHp = 99
    ctx.state.turn = 1
    beginActivation(ctx, g.id, 'test')
    expect(canAttack(ctx, g.id, w.id, 'attack.ghoul.devour')).toBe(true)
    performAttack(ctx, g.id, w.id, 'attack.ghoul.devour')
    expect(g.cooldowns['attack.ghoul.devour']).toBe(1 + cd)
    expect(ctx.events.some((e) => e.type === 'cooldown.set' && e['attackId'] === 'attack.ghoul.devour')).toBe(true)
    for (let t = 2; t <= cd; t++) { ctx.state.turn = t; beginActivation(ctx, g.id, 'test'); expect(canAttack(ctx, g.id, w.id, 'attack.ghoul.devour'), `turn ${t}`).toBe(false) }
    ctx.state.turn = 1 + cd; beginActivation(ctx, g.id, 'test')
    expect(canAttack(ctx, g.id, w.id, 'attack.ghoul.devour')).toBe(true)
  })

  it('warmup: an attack with warmup is not ready until Turn warmup + 1', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'unit.iron-colossus', hex: hexId(5, 6) }])
    // the colossus is weaponless (its moves are a named gap) — the mechanism is checked on the map itself
    const u = ctx.state.units[1]!
    for (const [id, ready] of Object.entries(u.cooldowns)) expect(ready).toBe((ATTACKS[id]?.warmup ?? ctx.abilities[id]?.warmup ?? 0) + 1)
  })

  it('in a real battle the golem slams every other Turn — the Slam is on cooldown between, and the log says so', () => {
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.arc-variant')))
    runBattle(ctx)
    const golem = ctx.state.units.find((u) => u.typeId === 'test-arc-golem')!
    const slams = ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === golem.id && e.causeId === 'attack.test-ram.slam')
    expect(slams.length).toBeGreaterThan(0)
    const turns = slams.map((e) => e.turn)
    for (let i = 1; i < turns.length; i++) expect(turns[i]! - turns[i - 1]!).toBeGreaterThanOrEqual(ATTACKS['attack.test-ram.slam']!.cooldown!)
    expect(ctx.events.some((e) => e.type === 'cooldown.set' && e['attackId'] === 'attack.test-ram.slam')).toBe(true)
  })
})
