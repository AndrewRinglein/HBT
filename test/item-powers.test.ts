// The three S31 item powers — capability.item-powers (2026-08-27).
//
// AbilityDef speaks heal / selfGuard / blast damage now, each copied from its
// EXACT authored text: Heal "1 + 2 x Spirit" (partySpirit per GAME-DESIGN §5's
// scaling law), Block "4 + your Armor, lose 5 Dodge for the rest of the
// Battle. Every use costs another 5", Storm "your Magic + 1 to every unit in
// the blast" with no roll and no crit.
import { describe, expect, it } from 'vitest'
import { canUsePower, powerBlastIdsOf, previewPower, usePower } from '../src/core/ability.js'
import { effective } from '../src/core/stats.js'
import { partySpiritSum } from '../src/core/trigger.js'
import { ABILITIES, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { beginActivation } from '../src/core/mutate.js'

const SC = 'showcase.alpha-team'

describe('the pack carries the three powers, faithfully', () => {
  it('Heal, Block and Storm exist with their authored numbers', () => {
    expect(ABILITIES['power.holy-symbol.heal']).toMatchObject({
      effect: 'heal', range: 6, staminaCost: 1, heal: { scale: 'partySpirit', base: 1, mult: 2 },
    })
    expect(ABILITIES['power.knight-shield.block']).toMatchObject({
      effect: 'selfGuard', range: 0, staminaCost: 1, cooldown: 3,
      guard: { protectionBase: 4, protectionPerArmor: 1, dodgeLoss: 5 },
    })
    expect(ABILITIES['power.lightning-staff.storm']).toMatchObject({
      effect: 'damage', stat: 'magic', bonus: 1, damageType: 'magic',
      range: 4, staminaCost: 3, area: 'blast1',
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

describe('Block — protection now, a permanent Dodge price, escalating', () => {
  const rig = () => createBattle({
    ...scenarioOptions(scenarioDef(SC)),
    heroes: ['alpha-osric'], heroHexes: [135],
    enemies: ['unit.zombie'], enemyHexes: [1], enemyCount: 1,
  })

  it('grants 4 + effective Armor protection and docks 5 Dodge for the battle, stacking per use', () => {
    const ctx = rig()
    const osric = ctx.state.units.find((u) => u.typeId === 'alpha-osric')!
    const dodge0 = effective(ctx, osric, 'dodge').value
    const expectProt = 4 + effective(ctx, osric, 'armor').value
    beginActivation(ctx, osric.id, 'test')
    usePower(ctx, osric.id, osric.id, 'power.knight-shield.block')
    expect(osric.statuses.find((s) => s.id === 'status.protection')?.value).toBe(expectProt)
    expect(effective(ctx, osric, 'dodge').value).toBe(dodge0 - 5)
    // "Every use costs another 5 Dodge" — no counter needed, it applies again.
    ctx.state.turn += 3 // past the cooldown
    osric.primaryUsed = false
    osric.stamina = osric.maxStamina
    usePower(ctx, osric.id, osric.id, 'power.knight-shield.block')
    expect(effective(ctx, osric, 'dodge').value).toBe(dodge0 - 10)
    // and the cooldown is real
    expect(canUsePower(ctx, osric.id, osric.id, 'power.knight-shield.block')).toBe(false)
  })

  it('legality: self only', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef(SC)),
      heroes: ['alpha-osric', 'alpha-oathblade'], heroHexes: [135, 134],
      enemies: ['unit.zombie'], enemyHexes: [1], enemyCount: 1,
    })
    const osric = ctx.state.units.find((u) => u.typeId === 'alpha-osric')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    expect(canUsePower(ctx, osric.id, osric.id, 'power.knight-shield.block')).toBe(true)
    expect(canUsePower(ctx, osric.id, oath.id, 'power.knight-shield.block')).toBe(false)
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
    const struck = powerBlastIdsOf(ctx, mage.id, z1.id, 'power.lightning-staff.storm')
    expect(struck[0]).toBe(z1.id)
    expect(struck).toContain(z2.id) // 102 is adjacent to 118
    expect(struck, '"to every unit in the blast" — the ally too').toContain(oath.id)
    beginActivation(ctx, mage.id, 'test')
    usePower(ctx, mage.id, z1.id, 'power.lightning-staff.storm')
    const dmg = 1 + mage.magic // vs zombie armor 0 / resist 0, magic damage
    expect(z1.hp).toBe(z1.maxHp - dmg)
    expect(z2.hp).toBe(z2.maxHp - dmg)
    expect(oath.hp, 'friendly lightning is real lightning').toBeLessThan(oath.maxHp)
    const hits = ctx.events.filter((e) => e.type === 'power.hit' && e.causeId === 'power.lightning-staff.storm')
    expect(hits.length).toBe(struck.length)
  })

  it('the switch spares allies when off', () => {
    const ctx = createBattle({
      ...scenarioOptions(scenarioDef(SC)),
      heroes: ['alpha-air-mage', 'alpha-oathblade'], heroHexes: [151, 119],
      enemies: ['unit.zombie'], enemyHexes: [118], enemyCount: 1,
    })
    ctx.cfg.switches.areaHitsAllies = false
    const mage = ctx.state.units.find((u) => u.typeId === 'alpha-air-mage')!
    const z = ctx.state.units.find((u) => u.typeId === 'unit.zombie')!
    const oath = ctx.state.units.find((u) => u.typeId === 'alpha-oathblade')!
    expect(powerBlastIdsOf(ctx, mage.id, z.id, 'power.lightning-staff.storm')).toEqual([z.id])
    beginActivation(ctx, mage.id, 'test')
    usePower(ctx, mage.id, z.id, 'power.lightning-staff.storm')
    expect(oath.hp).toBe(oath.maxHp)
  })
})

describe('they run — no power is dead content in a real battle', () => {
  it('heal and block fire across seeds of showcase.alpha-team', () => {
    const used = new Set<string>()
    for (const r of [0, 1, 2, 3, 4]) {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef(SC)), replicate: r })
      runBattle(ctx)
      for (const e of ctx.events) {
        if (e.type === 'power.used') used.add(String(e.causeId))
      }
      expect(ctx.state.outcome, `replicate ${r} must resolve`).not.toBeNull()
    }
    expect(used.has('power.holy-symbol.heal'), 'the priest never healed — dead content').toBe(true)
    expect(used.has('power.knight-shield.block'), 'Osric never blocked — dead content').toBe(true)
  })

  it('Storm opens showcase.item-powers — the boxed-mage fielding exists for exactly this', () => {
    // A kiting mage holds at bolt range, beyond Storm's 4 — in the open
    // battles it legitimately never storms. This fielding pins him: retreat
    // hexes held by his own line, a clump inside 4, himself outside the blast.
    const ctx = createBattle(scenarioOptions(scenarioDef('showcase.item-powers')))
    runBattle(ctx)
    const storm = ctx.events.find((e) => e.type === 'power.used' && e.causeId === 'power.lightning-staff.storm')!
    expect(storm, 'the mage must storm').toBeDefined()
    expect((storm['struck'] as number[]).length, 'the blast catches the clump').toBeGreaterThanOrEqual(2)
    expect(ctx.state.outcome).not.toBeNull()
  })
})
