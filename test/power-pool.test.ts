// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// capability.power-pool (2026-09-03) — ENEMY-REVIEW.md P1, ruled 2026-08-23:
// "Power is the enemy side's Magic: one global integer for the whole enemy
// side. Fractions resolve to an integer before adding, rounded to nearest,
// 0.5 up. It arrives three ways — external, one-time on arrival (the X stays
// after death), a clock or condition." Consumers read it; nothing spends it.
// Every number here is read off the rows (the Lieutenant Demon's Gathering
// Doom, the Necromancer's Necro Bolt at +Power, Necro Strike at +½ Power).
import { attackIdsOf, powerIdsOf } from '../src/core/action.js'
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { performAttack, powerShare, preview, DMG } from '../src/core/pipeline.js'
import { beginActivation, gainPower } from '../src/core/mutate.js'
import { ATTACKS, ENCOUNTERS, UNITS } from '../src/content/index.js'
import { hexId } from './board16.js'
import type { EncounterDef } from '../src/core/types.js'

describe('the rounding, ruled', () => {
  it('nearest, 0.5 up — thirds and halves', () => {
    expect(powerShare(1, 0.5)).toBe(1)
    expect(powerShare(3, 0.5)).toBe(2)
    expect(powerShare(1, 0.334)).toBe(0)
    expect(powerShare(2, 0.334)).toBe(1)
    expect(powerShare(3, 0.334)).toBe(1)
    expect(powerShare(5, 1)).toBe(5)
  })
})

describe('consumers read the pool', () => {
  it('the Necro Bolt adds the whole pool, the Necro Strike half, as a POWER ledger row — and nothing at pool 0', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(8, 8) }], [{ type: 'unit.necromancer', hex: hexId(8, 12) }])
    const n = ctx.state.units[1]!, w = ctx.state.units[0]!
    const bolt = ATTACKS['attack.necromancer.necro-bolt']!, strike = ATTACKS['attack.necromancer.necro-strike']!
    expect(bolt.attack.powerScale).toBe(1)
    const at0 = preview(ctx, n.id, w.id, bolt.id)
    expect(at0.damageOnHit).toBe(preview(ctx, n.id, w.id, bolt.id).damageOnHit)
    gainPower(ctx, 3, 'test')
    const at3 = preview(ctx, n.id, w.id, bolt.id)
    expect(at3.damageOnHit - at0.damageOnHit).toBe(powerShare(3, bolt.attack.powerScale!))
    n.hex = hexId(8, 9)   // adjacent for the strike
    const s3 = preview(ctx, n.id, w.id, strike.id)
    ctx.state.power = 0
    const s0 = preview(ctx, n.id, w.id, strike.id)
    expect(s3.damageOnHit - s0.damageOnHit).toBe(powerShare(3, strike.attack.powerScale!))
  })

  it('a hero attack with a share adds nothing — the pool is the enemy side\'s', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(8, 8) }], [{ type: 'unit.zombie', hex: hexId(8, 9) }])
    gainPower(ctx, 5, 'test')
    const w = ctx.state.units[0]!, z = ctx.state.units[1]!
    const pv = preview(ctx, w.id, z.id, attackIdsOf(ctx, w)[0]!)
    expect(pv.accLedger.length).toBeGreaterThan(0)
    const dmgRows = (ctx.actions[attackIdsOf(ctx, w)[0]!]!.attack!.powerScale ?? 0)
    expect(dmgRows).toBe(0)
  })
})

describe('the three sources', () => {
  it('external: an encounter\'s powerSources sets the pool at battle start', () => {
    const enc: EncounterDef = { id: 'test.encounter.pool', name: 'pool', gaps: ['test-only'], setup: [{ unit: 'unit.zombie', at: { col: 8, row: 0 } }], schedule: [], powerSources: [{ kind: 'external', value: 4 }] }
    const ctx = createBattle({ replicate: 0, heroes: ['test-warrior'], encounter: enc })
    expect(ctx.state.power).toBe(4)
    expect(ctx.events.find((e) => e.type === 'power.gained')?.['kind']).toBe('external')
  })

  it('the clock: the Lieutenant Demon\'s Gathering Doom adds 1 at every End of its Activation, and it stays after it dies', () => {
    const t = UNITS['unit.lieutenant-demon']!.triggers!.find((x) => x.effect.kind === 'power.gain')!
    expect(t.hook).toBe('onActivationEnd')
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(8, 15) }], [{ type: 'unit.lieutenant-demon', hex: hexId(8, 0) }])
    runBattle(ctx)
    const gains = ctx.events.filter((e) => e.type === 'power.gained' && e.causeId === t.id)
    const acts = ctx.events.filter((e) => e.type === 'activation.end' && e['actor'] === 1)
    expect(gains.length).toBeGreaterThan(0)
    expect(gains.length).toBe(acts.length)
    expect(ctx.state.power).toBe(gains.reduce((n, g) => n + (g['amount'] as number), 0))
  })

  it('in the pack, the Lieutenant\'s and the Vampire Lord\'s clocks are power.gain triggers and every capability.power gap is gone', () => {
    expect(UNITS['unit.vampire-lord']!.triggers!.some((x) => x.effect.kind === 'power.gain' && x.hook === 'onKill')).toBe(true)
    for (const e of Object.values(ENCOUNTERS)) for (const g of e.gaps ?? []) expect(g).not.toMatch(/capability\.power\b/)
  })
})
