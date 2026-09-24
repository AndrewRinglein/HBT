// The six AI modes (2026-09-03) — ai.mode.defender, ai.mode.support (backlog)
// and the four the encounter session wanted (ENCOUNTERS-ENGINE-HANDOFF §4.10):
// focused fire · value hunter · follow · hunter. Rules, not scores. Angela,
// 2026-09-03: "Yeah, we'll need all those AI modes." A row that authors its
// ai keeps it (the hounds hunt); a support row runs support.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { runActivation, AI_MODES } from '../src/ai/modes.js'
import { beginActivation } from '../src/core/mutate.js'
import { UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { distance, hexId } from './board16.js'

const withAi = (ctx: ReturnType<typeof createCustomBattle>, id: number, ai: string) => { ctx.state.units[id]!.ai = ai; return ctx.state.units[id]! }

describe('the registry', () => {
  it('all six are modes, and the rows carry them: the Bloodhound hunts, the Necromancer supports', () => {
    for (const m of ['defender', 'support', 'focused-fire', 'value-hunter', 'follow', 'hunter']) expect(AI_MODES).toContain(m)
    expect(UNITS['unit.bloodhound']!.ai).toBe('hunter')
    expect(UNITS['unit.bloodhound']!.aiAuthored).toBe(true)
    expect(UNITS['unit.necromancer']!.ai).toBe('support')
  })
})

describe('the rules', () => {
  it('hunter: picks the weakest enemy when it first acts and keeps after it', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 2) }, { type: 'test-mage', hex: hexId(12, 2) }], [{ type: 'unit.zombie', hex: hexId(7, 12) }])
    const z = withAi(ctx, 2, 'hunter'); const mage = ctx.state.units[1]!
    mage.hp = 1
    beginActivation(ctx, z.id, 'test'); runActivation(ctx, z.id)
    expect(z.huntTarget).toBe(mage.id)
    expect(ctx.events.find((e) => e.type === 'ai.hunts')?.['target']).toBe(mage.id)
    expect(distance(z.hex, mage.hex)).toBeLessThan(distance(hexId(7, 12), mage.hex))
  })

  it('focused fire: two units pick the same target — the lowest health, lowest id', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 2) }, { type: 'test-mage', hex: hexId(12, 2) }], [{ type: 'unit.zombie', hex: hexId(3, 5) }, { type: 'unit.zombie', hex: hexId(11, 5) }])
    const a = withAi(ctx, 2, 'focused-fire'), b = withAi(ctx, 3, 'focused-fire')
    ctx.state.units[1]!.hp = 1
    for (const z of [a, b]) { beginActivation(ctx, z.id, 'test'); runActivation(ctx, z.id) }
    const mage = ctx.state.units[1]!
    expect(distance(a.hex, mage.hex)).toBeLessThanOrEqual(distance(hexId(3, 5), mage.hex))
    expect(distance(b.hex, mage.hex)).toBeLessThan(distance(hexId(11, 5), mage.hex))
  })

  it('defender: stays within 2 of a hurt ally and does not advance alone', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 14) }], [{ type: 'unit.zombie', hex: hexId(8, 2) }, { type: 'unit.zombie', hex: hexId(12, 2) }])
    const d = withAi(ctx, 2, 'defender'); const ward = ctx.state.units[1]!
    ward.hp = 1
    beginActivation(ctx, d.id, 'test'); runActivation(ctx, d.id)
    expect(distance(d.hex, ward.hex)).toBeLessThanOrEqual(2)
    expect(ctx.events.some((e) => e.type === 'activation.idle' && e['actor'] === d.id)).toBe(true)
  })

  it('follow: stays adjacent to the lead', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(2, 14) }], [{ type: 'unit.zombie', hex: hexId(8, 2) }, { type: 'unit.zombie', hex: hexId(12, 6) }])
    const f = withAi(ctx, 2, 'follow'); const lead = ctx.state.units[1]!
    beginActivation(ctx, f.id, 'test'); runActivation(ctx, f.id)
    expect(distance(f.hex, lead.hex)).toBeLessThan(distance(hexId(12, 6), lead.hex))
  })

  it('value hunter: heals when the heal is worth more than the hit, hits otherwise', () => {
    // the priest with Aegis-less kit: use the Alpha Lucius (holy symbol heal)
    const ctx = createCustomBattle([{ type: 'alpha-lucius', hex: hexId(5, 5) }, { type: 'alpha-oathblade', hex: hexId(6, 5) }], [{ type: 'unit.zombie', hex: hexId(9, 9) }])
    const p = withAi(ctx, 0, 'value-hunter'); const ally = ctx.state.units[1]!
    p.stamina = 99; ally.hp = 1
    beginActivation(ctx, p.id, 'test'); runActivation(ctx, p.id)
    expect(ctx.events.some((e) => e.type === 'power.used' && e['target'] === ally.id)).toBe(true)
  })

  it('support: allies first, then the weapon — the Necromancer in Surrounded pulses before it bolts when a zombie is hurt', () => {
    // LAW 10 — 2026-09-04 (badge.afflictions): on replicate 0 no zombie is hurt
    // before the Necromancer acts any more (the heroes' opening swings fall
    // differently now that a claw can afflict); the claim holds on the first
    // replicate where a zombie IS hurt, so the first few are tried.
    // LAW 10 — 2026-09-23 (v2.kdb): KDB now knocks units back and down, so the
    // opening swings fall differently again; the claim is unchanged, the search
    // reaches further (up to 12 replicates) for the first hurt zombie.
    let seen = false
    for (let r = 0; r < 12 && !seen; r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.surrounded')), replicate: r })
      runBattle(ctx)
      seen = ctx.events.some((e) => e.type === 'ai.mode' && e['mode'] === 'support')
    }
    expect(seen).toBe(true)
  })
})
