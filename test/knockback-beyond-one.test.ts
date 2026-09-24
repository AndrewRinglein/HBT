// fix.knockback-beyond-one (2026-09-04). Angela: "We want to be able to have
// knockback that is greater than one." STATE.md had listed "knockback 2" as
// unbuilt by choice; that choice is reversed. FINDING 34: the mechanism never
// capped the distance — executeKnockback walks the row's value hex by hex and
// stops only at a wall, a body or the board's edge — so this landing is the
// proof, the log line (asked / hexes / stoppedBy) and the content row, not a
// new rule.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'
import { performAttack } from '../src/core/pipeline.js'
import { executeKnockback } from '../src/core/movement.js'
import { UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { hexId, colOf, rowOf } from './board16.js'

const SHOVE = 'trigger.test-ram.shove'

describe('a push greater than one', () => {
  it('the test body carries a knockback of 2 beside the sweep\'s 1 — same mechanism, different data', () => {
    const t = (UNITS['test-arc-golem']!.triggers ?? []).find((x) => x.id === SHOVE)!
    expect(t.effect).toEqual({ kind: 'knockback', value: 2 })
    expect((UNITS['test-arc-golem']!.triggers ?? []).find((x) => x.id === 'trigger.test-ram.knockback')!.effect).toEqual({ kind: 'knockback', value: 1 })
  })

  it('an Overhead that lands shoves the target TWO hexes straight away, and the line says asked 2, hexes 2', () => {
    const ctx = createCustomBattle([{ type: 'test-arc-golem', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }])
    const g = ctx.state.units[0]!, z = ctx.state.units[1]!
    g.mods.push({ stat: 'accuracy', op: 'add', value: 200, source: 'test', scope: 'unit' })
    z.hp = 99; z.maxHp = 99
    ctx.state.turn = 2   // past the overhead's warmup
    beginActivation(ctx, g.id, 'test')
    performAttack(ctx, g.id, z.id, 'attack.test-ram.overhead')
    expect([colOf(z.hex), rowOf(z.hex)]).toEqual([8, 5])
    const k = ctx.events.find((e) => e.type === 'knocked' && e.causeId === SHOVE) as unknown as { asked: number; hexes: number; stoppedBy?: string }
    expect(k.asked).toBe(2)
    expect(k.hexes).toBe(2)
    expect(k.stoppedBy).toBeUndefined()
  })

  // v2.knockback-collisions (2026-09-23, Law 10 — the rule changed): the push cut short is a
  // collision now (COMBAT-V2 §9.3) — the line also names the body it struck and the points left,
  // and the mover pays 1 (a unit's value) x 2 remaining in true damage; the struck zombie nothing.
  it('a push cut short travels what it can, names what stopped it, and the mover pays for the rest', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(6, 5) }, { type: 'test-zombie', hex: hexId(8, 5) }])
    const z = ctx.state.units[1]!, struck = ctx.state.units[2]!
    const [zhp, shp] = [z.hp, struck.hp]
    expect(executeKnockback(ctx, 0, z.id, 3, 'test')).toBe(1)
    expect([colOf(z.hex), rowOf(z.hex)]).toEqual([7, 5])
    const k = ctx.events.find((e) => e.type === 'knocked') as unknown as { asked: number; hexes: number; stoppedBy?: string; remaining: number; blocker: number }
    expect(k.asked).toBe(3)
    expect(k.hexes).toBe(1)
    expect(k.stoppedBy).toBe('occupied')
    expect(k.remaining).toBe(2)
    expect(k.blocker).toBe(struck.id)
    expect(zhp - z.hp).toBe(2)
    expect(struck.hp).toBe(shp)
  })

  it('live — the shove fires in the arc-variant scenario and moves its target two', () => {
    let seen = 0
    for (let r = 0; r < 12 && !seen; r++) {
      const ctx = createBattle({ ...scenarioOptions(SCENARIOS['showcase.arc-variant']!), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) if (e.type === 'knocked' && e.causeId === SHOVE) { seen++; expect((e as unknown as { asked: number }).asked).toBe(2) }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
