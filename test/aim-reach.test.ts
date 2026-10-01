// fix.aim-reach (2026-10-01; DECISIONS.md 2026-10-01, Andrew: "the red arrow should only extend as far as whatever its range
// is. If I click someone who has a punch, it should have range 1"): actionReach is reachOf for an attack — the same number
// the rules use — read from the hex asked, the row's range for anything else, null for a move or an unknown action.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { actionReach } from '../src/core/forecast.js'
import { reachOf } from '../src/core/pipeline.js'
import { isAttack, isMove } from '../src/core/action.js'

const fielded = () => createBattle({ ...scenarioOptions(scenarioDef('test.caravan-aftermath'), 0), replicate: 0 } as Parameters<typeof createBattle>[0])

describe('actionReach', () => {
  it('is reachOf for every attack every unit holds, a punch one hex, a bow further', () => {
    const ctx = fielded()
    let attacks = 0, ones = 0, longer = 0
    for (const u of ctx.state.units) for (const id of u.actions) {
      const a = ctx.actions[id]!
      if (!isAttack(a)) continue
      const r = actionReach(ctx, u.id, id)
      expect(r, `${u.typeId} ${id}`).toBe(reachOf(ctx, u, a)); attacks++
      if (r === 1) ones++; if (r! > 1) longer++
    }
    expect(attacks).toBeGreaterThan(8); expect(ones).toBeGreaterThan(0); expect(longer).toBeGreaterThan(0)
  })
  it('is read from the hex asked, not only where the unit stands', () => {
    const ctx = fielded(), u = ctx.state.units.find((x) => x.side === 'hero')!
    const id = u.actions.find((x) => isAttack(ctx.actions[x]!))!, a = ctx.actions[id]!
    for (const h of [u.hex, 0, ctx.geo.hexCount - 1]) expect(actionReach(ctx, u.id, id, h)).toBe(reachOf(ctx, { ...u, hex: h }, a as never))
  })
  it('a move has no reach; an unknown action or unit has none', () => {
    const ctx = fielded(), u = ctx.state.units[0]!, mv = u.actions.find((x) => isMove(ctx.actions[x]!))!
    expect(actionReach(ctx, u.id, mv)).toBeNull()
    expect(actionReach(ctx, u.id, 'attack.no-such')).toBeNull()
    expect(actionReach(ctx, 9999, mv)).toBeNull()
  })
})
