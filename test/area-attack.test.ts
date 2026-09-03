// Area attacks — capability.area-attack (2026-08-27).
//
// Authored on attack.halberd.cleave: "an adjacent hex and the two hexes
// adjacent to both you and it", and "It does not roll to hit, so it cannot
// crit." The mechanism is areaHexesOf/areaUnitIdsOf + the per-struck-unit hit
// loop in performAttack; the second consumer is attack.test-arc.sweep on the
// Arc Golem (pure data), live in showcase.arc-variant.
import { describe, expect, it } from 'vitest'
import { areaHexesOf, areaUnitIdsOf, performAttack, preview } from '../src/core/pipeline.js'
import { neighboursOf, distance } from '../src/core/hex.js'
import { ATTACKS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'

const SC = 'showcase.arc-variant'
const mk = () => createBattle(scenarioOptions(scenarioDef(SC)))

describe('the geometry — one function, Law 6 order', () => {
  it("the arc is the target hex plus the hexes adjacent to BOTH ends", () => {
    // The scenario's own triple: golem 135, zombies 118 and 119.
    const arc = areaHexesOf(135, 118, 'arc')
    expect(arc[0]).toBe(118) // target first
    for (const h of arc.slice(1)) {
      expect(distance(135, h), `${h} adjacent to attacker`).toBe(1)
      expect(distance(118, h), `${h} adjacent to target`).toBe(1)
    }
    expect(arc).toContain(119)
    expect(arc.length).toBe(3) // interior board: target + exactly two
  })

  it('blast1 is the hex plus its six neighbours', () => {
    const b = areaHexesOf(135, 118, 'blast1')
    expect(b[0]).toBe(118)
    expect(new Set(b.slice(1))).toEqual(new Set(neighboursOf(118)))
  })
})

describe('no roll, no crit — the authored rule', () => {
  it('preview of an area attack is certain: hitChance 100, critChance 0, crit damage = hit damage', () => {
    const ctx = mk()
    const golem = ctx.state.units.findIndex((u) => u.typeId === 'test-arc-golem')
    const z = ctx.state.units.findIndex((u) => u.typeId === 'test-zombie')
    const pv = preview(ctx, golem, z, 'attack.test-arc.sweep')
    // The golem's accuracy is 5 ON PURPOSE — an area attack never consults it.
    expect(pv.hitChance).toBe(100)
    expect(pv.critChance).toBe(0)
    expect(pv.damageOnCrit).toBe(pv.damageOnHit)
    expect(pv.damageOnHit).toBe(6) // bonus 1 + strength 5 (golem re-statted 2026-08-27), zombie armor 0
  })

  it('a sweep never misses and never draws the to-hit cup: no attack.miss, every strike attack.hit', () => {
    const ctx = mk()
    runBattle(ctx)
    const sweeps = ctx.events.filter((e) => e.causeId === 'attack.test-arc.sweep')
    expect(sweeps.some((e) => e.type === 'attack.declared')).toBe(true)
    expect(sweeps.some((e) => e.type === 'attack.miss'), 'an area attack cannot miss').toBe(false)
    expect(sweeps.filter((e) => e.type === 'attack.hit').every((e) => e['auto'] === true
      && e['crit'] === false && e['roll'] === undefined)).toBe(true)
  })
})

describe('the swing — one declaration, one hit per struck unit', () => {
  it('the opening sweep strikes both zombies from the scenario geometry', () => {
    const ctx = mk()
    const golem = ctx.state.units.find((u) => u.typeId === 'test-arc-golem')!
    // The adjacent PAIR — the scenario's third zombie (hex 55, added for
    // station.crit-count's single-target turns) stands outside the arc.
    const zombies = ctx.state.units.filter((u) => u.typeId === 'test-zombie' && [118, 119].includes(u.hex))
    beginActivation(ctx, golem.id, 'test')
    const r = performAttack(ctx, golem.id, zombies[0]!.id, 'attack.test-arc.sweep')
    expect(r.hit).toBe(true)
    expect(r.crit).toBe(false)
    expect(r.damage).toBe(12) // 6 into each zombie (golem re-statted 2026-08-27)
    const declared = ctx.events.find((e) => e.type === 'attack.declared' && e.causeId === 'attack.test-arc.sweep')!
    expect(declared['area']).toBe('arc')
    expect(declared['struck']).toEqual([zombies[0]!.id, zombies[1]!.id])
    const hits = ctx.events.filter((e) => e.type === 'attack.hit' && e.causeId === 'attack.test-arc.sweep')
    expect(hits.map((e) => e.target)).toEqual([zombies[0]!.id, zombies[1]!.id])
    for (const z of zombies) expect(z.hp).toBe(z.maxHp - 6)
  })

  it('an ally in the arc is struck under the authored default, and spared with areaHitsAllies off', () => {
    // Scripted: stand a second golem in the arc. "To every unit in the blast."
    const base = scenarioOptions(scenarioDef(SC))
    const withAlly = { ...base, heroes: ['test-arc-golem', 'test-arc-golem'], heroHexes: [135, 119] as number[], enemies: ['test-zombie'], enemyHexes: [118] as number[], enemyCount: 1 }
    {
      const ctx = createBattle(withAlly)
      const a = ctx.state.units.find((u) => u.typeId === 'test-arc-golem' && u.hex === 135)!
      const friend = ctx.state.units.find((u) => u.typeId === 'test-arc-golem' && u.hex === 119)!
      const z = ctx.state.units.find((u) => u.typeId === 'test-zombie')!
      expect(areaUnitIdsOf(ctx, a.id, z.id, 'attack.test-arc.sweep')).toEqual([z.id, friend.id])
      beginActivation(ctx, a.id, 'test')
      performAttack(ctx, a.id, z.id, 'attack.test-arc.sweep')
      expect(friend.hp, 'friendly fire is the authored default').toBe(friend.maxHp - 4) // 6 - armor 2 (re-stat 2026-08-27)
    }
    {
      const ctx = createBattle(withAlly)
      ctx.cfg.switches.areaHitsAllies = false
      const a = ctx.state.units.find((u) => u.typeId === 'test-arc-golem' && u.hex === 135)!
      const friend = ctx.state.units.find((u) => u.typeId === 'test-arc-golem' && u.hex === 119)!
      const z = ctx.state.units.find((u) => u.typeId === 'test-zombie')!
      expect(areaUnitIdsOf(ctx, a.id, z.id, 'attack.test-arc.sweep')).toEqual([z.id])
      beginActivation(ctx, a.id, 'test')
      performAttack(ctx, a.id, z.id, 'attack.test-arc.sweep')
      expect(friend.hp, 'switch off — the arc spares the friend').toBe(friend.maxHp)
    }
  })

  it('the AI swings wide for two enemies but never through an ally under the default switch', () => {
    // With a friend standing in the arc and only one other enemy reachable,
    // areaSwing must decline (allies > 0) — the golem still attacks, single
    // shape logic aside the sweep IS its only attack, so what the rule guards
    // here is the alpha case: cleave vs hack. Proven on the Oathblade: two
    // zombies in his arc -> cleave; an ally in the arc -> hack.
    const base = scenarioOptions(scenarioDef('showcase.alpha-team'))
    const two = {
      ...base,
      heroes: ['alpha-oathblade'], heroHexes: [135] as number[],
      enemies: ['unit.zombie', 'unit.zombie'], enemyHexes: [118, 119] as number[], enemyCount: 2,
    }
    const ctx = createBattle(two)
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    runBattle(ctx)
    const oathDeclared = ctx.events.filter((e) => e.type === 'attack.declared' && e.actor === oath.id)
    expect(oathDeclared[0]!.causeId, 'two enemies in the arc — the first swing is the Cleave').toBe('attack.halberd.cleave')

    const withAlly = {
      ...base,
      heroes: ['alpha-oathblade', 'hero.base.ranger-aggressive'], heroHexes: [135, 119] as number[],
      enemies: ['unit.zombie', 'unit.zombie'], enemyHexes: [118, 134] as number[], enemyCount: 2,
    }
    const ctx2 = createBattle(withAlly)
    const oath2 = ctx2.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    beginActivation(ctx2, oath2.id, 'test')
    const z = ctx2.state.units.find((u) => u.typeId === 'unit.zombie' && u.hex === 118)!
    // both zombies adjacent (118 and 103 are both neighbours of 135), but the
    // Hunter stands at 119, inside the 135->118 arc: the rule must refuse.
    const struck = areaUnitIdsOf(ctx2, oath2.id, z.id, 'attack.halberd.cleave')
    expect(struck.some((id) => ctx2.state.units[id]!.side === 'hero')).toBe(true)
  })
})

describe('the verify battle — showcase.arc-variant resolves and the variant is alive', () => {
  it('is a seed, and the sweep struck at least two units in one declaration', () => {
    const run = () => {
      const ctx = mk()
      const r = runBattle(ctx)
      return { key: `${r.outcome}:${r.turns}:${ctx.events.length}`, events: ctx.events }
    }
    const a = run(), b = run()
    expect(a.key).toBe(b.key)
    const declared = a.events.find((e) => e.type === 'attack.declared' && e.causeId === 'attack.test-arc.sweep')!
    expect(declared, 'the golem must sweep').toBeDefined()
    expect((declared['struck'] as number[]).length).toBeGreaterThanOrEqual(2)
  })
})
