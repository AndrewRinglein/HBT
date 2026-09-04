// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// station.accuracy-field (2026-09-03) — AttackDef.accuracy at ACC.SITUATIONAL.
//
// Punch's −5 (ruled 2026-08-27) had no slot, and the converter named it as a
// gap on every hero who carried Punch. Now the row carries it, the station
// applies it, and preview and resolution agree because they are the same
// function (Law 1). Every number here is read off the rows.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { ACC, performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { ATTACKS } from '../src/content/index.js'
import { hexId } from './board16.js'

function golemBoard() {
  const ctx = createCustomBattle(
    [{ type: 'test-arc-golem', hex: hexId(5, 5) }],
    [{ type: 'test-zombie', hex: hexId(5, 6) }],
  )
  const g = ctx.state.units[0]!
  g.stamina = 99
  ctx.state.turn = 5   // past the Overhead's warmup (capability.enemy-action-cooldown, 2026-09-03)
  return { ctx, g, z: ctx.state.units[1]! }
}

describe('the attack\'s own accuracy modifier', () => {
  it('Punch carries −5 on the row now — the converter no longer names it as a gap', () => {
    expect(ATTACKS['attack.punch']!.attack.accuracy).toBeLessThan(0)
  })

  it('preview shows exactly the row\'s modifier less hit chance, with a SITUATIONAL ledger row', () => {
    const { ctx, g, z } = golemBoard()
    const mod = ATTACKS['attack.test-ram.overhead']!.attack.accuracy!
    expect(mod).not.toBe(0)
    expect(ATTACKS['attack.test-ram.slam']!.attack.accuracy).toBeUndefined()   // the control: same body, no modifier
    const withMod = preview(ctx, g.id, z.id, 'attack.test-ram.overhead')
    const without = preview(ctx, g.id, z.id, 'attack.test-ram.slam')
    expect(withMod.accuracy - without.accuracy).toBe(mod)
    const row = withMod.accLedger.find((r) => r.station === ACC.SITUATIONAL)
    expect(row).toBeDefined()
    expect(row!.delta).toBe(mod)
    expect(row!.effectId).toBe('attack.test-ram.overhead')
    expect(without.accLedger.find((r) => r.station === ACC.SITUATIONAL)).toBeUndefined()
  })

  it('resolution uses the same number as the preview', () => {
    const { ctx, g, z } = golemBoard()
    const pv = preview(ctx, g.id, z.id, 'attack.test-ram.overhead')
    beginActivation(ctx, g.id, 'test')
    performAttack(ctx, g.id, z.id, 'attack.test-ram.overhead')
    const declared = ctx.events.find((e) => e.type === 'attack.declared' && e.causeId === 'attack.test-ram.overhead')
    expect(declared?.['hitChance']).toBe(pv.hitChance)
  })

  it('a real hero\'s Punch previews at the row\'s modifier below its other melee attack, all else equal', () => {
    const ctx = createCustomBattle(
      [{ type: 'alpha-oathblade', hex: hexId(5, 5) }],
      [{ type: 'test-zombie', hex: hexId(5, 6) }],
    )
    const h = ctx.state.units[0]!, z = ctx.state.units[1]!
    h.stamina = 99
    const punch = preview(ctx, h.id, z.id, 'attack.punch')
    const row = punch.accLedger.find((r) => r.station === ACC.SITUATIONAL)
    expect(row?.delta).toBe(ATTACKS['attack.punch']!.attack.accuracy)
  })
})
