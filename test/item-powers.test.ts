// The three S31 item powers — capability.item-powers (2026-08-27).
//
// AbilityDef speaks heal / selfGuard / blast damage now (effects lists since fix.one-effect-vocabulary, 2026-10-01), each copied from its
// EXACT authored text: Heal "1 + 2 x Spirit" (partySpirit per GAME-DESIGN §5's
// scaling law), Block "4 + your Armor, lose 5 Dodge for the rest of the
// Battle. Every use costs another 5", Storm "your Magic + 1 to every unit in
// the blast" with no roll and no crit.
import { describe, expect, it } from 'vitest'
import { canUsePower, previewPower, usePower } from '../src/core/ability.js'
import { previewBurst, useBurst } from '../src/core/burst.js'
import { effective } from '../src/core/stats.js'
import { partySpiritSum } from '../src/core/trigger.js'
import { ABILITIES, BURSTS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'

const SC = 'showcase.alpha-team'

describe('the pack carries the three powers, faithfully', () => {
  it('Heal, Block and Storm exist with their authored numbers', () => {
    // Law 10, fix.one-effect-vocabulary (2026-10-01): the Heal is an effects list now — the retired 'heal' shape's
    // numbers are its heal effect's, one ally, unchanged. was: { effect: 'heal', ..., heal: { scale: 'partySpirit', base: 1, mult: 2 } }
    expect(ABILITIES['power.holy-symbol.heal']).toMatchObject({
      range: 6, staminaCost: 1, target: { select: 'unit', side: 'ally' }, effects: [{ kind: 'heal', amount: { scale: 'partySpirit', base: 1, mult: 2 } }],
    })
    // Law 10, 2026-09-23 (v2.shields): Knight Block (selfGuard) retired with item.knight-shield in
    // V2 R1; Osric's kit carries the Kite Shield, whose Lock Shields replaces it here. The claims —
    // authored numbers, self only, live in a real battle — are unchanged.
    expect(ABILITIES['power.kite-shield.shield-wall']).toMatchObject({
      range: 0, staminaCost: 1, cooldown: 3,
      effects: [{ kind: 'statMod', stat: 'block', value: 15, until: 'endOfNextActivation', who: 'self' },
        { kind: 'statMod', stat: 'armor', value: 1, until: 'endOfNextActivation', who: 'self' }],
    })
    expect(BURSTS['power.lightning-staff.storm']).toMatchObject({
      burst: {shape: {kind: 'radius', radius: 1}, side: 'any', packets: [{id: 'base', amount: 1, stat: 'magic', damageType: 'magic'}]},
      range: 4, staminaCost: 3,
    })
  })
})

describe('Heal — one ally within 6, 1 + 2 x party Spirit', () => {
  const rig = () => createBattle({
    ...scenarioOptions(scenarioDef(SC)),
    heroes: ['alpha-lucius', 'alpha-oathblade'], heroHexes: [135, 134],
    enemies: ['unit.zombie'], enemyHexes: [1], enemyCount: 1,
  })

  it('heals the stated amount, clamped at max, and the amount is the §5 party sum', () => {
    const ctx = rig()
    const lucius = ctx.state.units.find((u) => u.typeId === 'alpha-lucius')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    oath.hp = 1 // badly wounded
    const expected = 1 + 2 * partySpiritSum(ctx, 'hero')
    expect(previewPower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal').heal).toBe(expected)
    beginActivation(ctx, lucius.id, 'test')
    usePower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal')
    expect(oath.hp).toBe(Math.min(oath.maxHp, 1 + expected))
    const ev = ctx.events.find((e) => e.type === 'heal.applied' && e.causeId === 'power.holy-symbol.heal')!
    expect(ev['asked']).toBe(expected)
  })

  it('legality: an ally yes, an enemy never, self by the switch', () => {
    const ctx = rig()
    const lucius = ctx.state.units.find((u) => u.typeId === 'alpha-lucius')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    expect(canUsePower(ctx, lucius.id, oath.id, 'power.holy-symbol.heal')).toBe(true)
    expect(canUsePower(ctx, lucius.id, z.id, 'power.holy-symbol.heal')).toBe(false)
    expect(canUsePower(ctx, lucius.id, lucius.id, 'power.holy-symbol.heal'),
      'healIncludesSelf default true').toBe(true)
    ctx.cfg.switches.healIncludesSelf = false
    expect(canUsePower(ctx, lucius.id, lucius.id, 'power.holy-symbol.heal')).toBe(false)
  })
})

// Law 10, 2026-09-23 (v2.shields): Knight Block (selfGuard) retired with item.knight-shield in
// V2 R1; Osric's kit carries the Kite Shield, whose Lock Shields replaces it here. The claims —
// authored numbers, self only, live in a real battle — are unchanged.
describe('Lock Shields — the Kite Shield\'s guard, until the end of the next Activation', () => {
  const rig = () => createBattle({
    ...scenarioOptions(scenarioDef(SC)),
    heroes: ['alpha-osric'], heroHexes: [135],
    enemies: ['unit.zombie'], enemyHexes: [1], enemyCount: 1,
  })

  it('+15 Block and +1 Armor now, and the cooldown is real', () => {
    const ctx = rig()
    const osric = ctx.state.units.find((u) => u.typeId === 'alpha-osric')!
    const block0 = effective(ctx, osric, 'block').value, armor0 = effective(ctx, osric, 'armor').value
    beginActivation(ctx, osric.id, 'test')
    usePower(ctx, osric.id, osric.id, 'power.kite-shield.shield-wall')
    expect(effective(ctx, osric, 'block').value).toBe(block0 + 15)
    expect(effective(ctx, osric, 'armor').value).toBe(armor0 + 1)
    expect(canUsePower(ctx, osric.id, osric.id, 'power.kite-shield.shield-wall')).toBe(false)
  })

  it('legality: self only', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef(SC)),
      heroes: ['alpha-osric', 'alpha-oathblade'], heroHexes: [135, 134],
      enemies: ['unit.zombie'], enemyHexes: [1], enemyCount: 1,
    })
    const osric = ctx.state.units.find((u) => u.typeId === 'alpha-osric')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    expect(canUsePower(ctx, osric.id, osric.id, 'power.kite-shield.shield-wall')).toBe(true)
    expect(canUsePower(ctx, osric.id, oath.id, 'power.kite-shield.shield-wall')).toBe(false)
  })
})

describe('Storm — Magic + 1 to every unit in the blast, no roll, no crit', () => {
  it('strikes every standing unit in the seven hexes, allies included by the authored default', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef(SC)),
      heroes: ['alpha-air-mage', 'alpha-oathblade'], heroHexes: [151, 119],
      // target 118; 119 is adjacent to 118, so the Oathblade stands in the blast
      enemies: ['unit.zombie', 'unit.zombie'], enemyHexes: [118, 102], enemyCount: 2,
    })
    const mage = ctx.state.units.find((u) => u.typeId === 'alpha-air-mage')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    const z1 = ctx.state.units.find((u) => u.hex === 118)!
    const z2 = ctx.state.units.find((u) => u.hex === 102)!
    const struck = previewBurst(ctx, mage.id, z1.hex, 'power.lightning-staff.storm').targets.map(t => t.id)
    expect(struck).toContain(z1.id) // V2 stable UID order, not aimed-unit first
    expect(struck).toContain(z2.id) // 102 is adjacent to 118
    expect(struck, '"to every unit in the blast" — the ally too').toContain(oath.id)
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, z1.hex, 'power.lightning-staff.storm')
    const dmg = 1 + mage.magic // vs zombie armor 0 / resist 0, magic damage
    expect(z1.hp).toBe(z1.maxHp - dmg)
    expect(z2.hp).toBe(z2.maxHp - dmg)
    expect(oath.hp, 'friendly lightning is real lightning').toBeLessThan(oath.maxHp)
    const hits = ctx.events.filter((e) => e.type === 'burst.struck' && e.causeId === 'power.lightning-staff.storm')
    expect(hits.length).toBe(struck.length)
  })

  it('the explicit enemy-side row spares allies', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef(SC)),
      heroes: ['alpha-air-mage', 'alpha-oathblade'], heroHexes: [151, 119],
      enemies: ['unit.zombie'], enemyHexes: [118], enemyCount: 1,
    })
    const storm = BURSTS['power.lightning-staff.storm']!
    ctx.actions = {...ctx.actions, [storm.id]: {...storm, burst: {...storm.burst, side: 'enemy'}}}
    const mage = ctx.state.units.find((u) => u.typeId === 'alpha-air-mage')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    expect(previewBurst(ctx, mage.id, z.hex, 'power.lightning-staff.storm').targets.map(t => t.id)).toEqual([z.id])
    beginActivation(ctx, mage.id, 'test')
    useBurst(ctx, mage.id, z.hex, 'power.lightning-staff.storm')
    expect(oath.hp).toBe(oath.maxHp)
  })
})

describe('they run — no power is dead content in a real battle', () => {
  it('heal and block fire across seeds of showcase.alpha-team', () => {
    const used = new Set<string>()
    // Widened 0..4 -> 0..19 on 2026-09-03 (station.accuracy-field): once the
    // Alpha Team's weapons hit at their authored accuracies the fights got
    // shorter, and Osric's first Block moved from seed <5 to seed 13. The
    // claim (both powers are live) is unchanged; the search is wider. Early
    // exit once both are seen.
    // 2026-09-04 (pack refresh, FINDING 39 fix): the early exit was
    // `used.size < 2`, which assumed only these two powers ever fire. With the
    // Alpha riders back on their owners the fights re-time and Storm fires on
    // seed 1 beside Block — the set hit 2 before the priest's first heal (seed
    // 2) and the loop stopped early. The exit now names the two powers it is
    // looking for. Neither assertion changed.
    // Law 10, 2026-09-23 (v2.shields): Osric's guard is the Kite Shield's now — either of its two powers.
    const guarded = () => used.has('power.kite-shield.shield-wall') || used.has('power.kite-shield.raise-guard')
    const both = () => used.has('power.holy-symbol.heal') && guarded()
    for (let r = 0; r < 20 && !both(); r++) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(SC)), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'power.used') used.add(String(e.causeId))
      }
      expect(ctx.state.outcome, `replicate ${r} must resolve`).not.toBeNull()
    }
    expect(used.has('power.holy-symbol.heal'), 'the priest never healed — dead content').toBe(true)
    expect(guarded(), 'Osric never raised his shield — dead content').toBe(true)
  })

  it('Storm opens showcase.item-powers — the boxed-mage fielding exists for exactly this', () => {
    // A kiting mage holds at bolt range, beyond Storm's 4 — in the open
    // battles it legitimately never storms. This fielding pins him: retreat
    // hexes held by his own line, a clump inside 4, himself outside the blast.
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.item-powers')))
    runBattle(ctx)
    const storm = ctx.events.find((e) => e.type === 'burst.declared' && e.causeId === 'power.lightning-staff.storm')!
    expect(storm, 'the mage must storm').toBeDefined()
    expect(ctx.events.filter(e => e.type === 'burst.struck' && e.causeId === storm.causeId).length, 'the burst catches the clump').toBeGreaterThanOrEqual(2)
    expect(ctx.state.outcome).not.toBeNull()
  })
})
