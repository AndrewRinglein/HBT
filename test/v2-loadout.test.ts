// v2.loadout — V2 R6 part 1 (COMBAT-V2-DESIGN-2026-09-07 §11.1, ruled 2026-09-07:
// "A weapon sitting in an item slot grants nothing … It is swap fodder and nothing
// else"; §15.2: "unit.equipped now means in hand"). A fielded hero carries its
// loadout as plain data — hands and stowed, each an item instance with a
// battle-unique instanceId — so the swap (v2.swap) has something to swap.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { ITEMS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const base = scenarioOptions(scenarioDef('showcase.prologue-party'))
const WARRIOR = 'hero.base.warrior-iron'
const one = (heroItems: string[], heroStowed?: string[]) =>
  createBattle({ ...base, heroes: [WARRIOR], heroHexes: [247], heroItems: [heroItems], ...(heroStowed ? { heroStowed: [heroStowed] } : {}) })

describe('v2.loadout — only what is in the hands grants', () => {
  it('a stowed kite shield grants no Block and no powers, and rides in the loadout as an instance', () => {
    const kite = ITEMS['item.kite-shield']!
    const bare = one(['item.longsword']).state.units[0]!
    const ctx = one(['item.longsword'], ['item.kite-shield'])
    const u = ctx.state.units[0]!
    expect(u.block ?? 0).toBe(bare.block ?? 0)
    for (const p of kite.abilities) expect(u.actions).not.toContain(p)
    expect(u.loadout?.hands.map((i) => i.itemId)).toEqual(['item.longsword'])
    expect(u.loadout?.stowed.map((i) => i.itemId)).toEqual(['item.kite-shield'])
    expect(typeof u.loadout?.stowed[0]?.instanceId).toBe('string')
    // the log: unit.equipped means in hand; the stowed instance is named on unit.enter
    const eq = ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === u.id)
    expect(eq.map((e) => e.causeId)).toEqual(['item.longsword'])
    expect(eq[0]!.instanceId).toBe(u.loadout!.hands[0]!.instanceId)
    const enter = ctx.events.find((e) => e.type === 'unit.enter' && e.actor === u.id)!
    expect(enter.stowed).toEqual(u.loadout!.stowed)
  })

  it('two longswords are two instances with distinct ids, and fold Block twice', () => {
    const one1 = one(['item.longsword']).state.units[0]!
    const u = one(['item.longsword', 'item.longsword']).state.units[0]!
    const b = ITEMS['item.longsword']!.statModifiers.block ?? 0
    expect(b).toBeGreaterThan(0)
    expect((u.block ?? 0) - (one1.block ?? 0)).toBe(b)
    const ids = u.loadout!.hands.map((i) => i.instanceId)
    expect(u.loadout!.hands.map((i) => i.itemId)).toEqual(['item.longsword', 'item.longsword'])
    expect(new Set(ids).size).toBe(2)
  })

  it('a third hand is still refused', () => {
    expect(() => one(['item.longsword', 'item.longsword', 'item.kite-shield'])).toThrow(/more than two hands/)
  })

  it('a trinket or an unknown id in heroStowed is refused and names the unit', () => {
    const trinket = Object.values(ITEMS).find((i) => i.itemClass === 'trinket')!
    expect(() => one(['item.longsword'], [trinket.id])).toThrow(new RegExp(`${WARRIOR}.*${trinket.id.replace(/\./g, '\\.')}.*weapon or shield`))
    expect(() => one(['item.longsword'], ['item.no-such-thing'])).toThrow(/not an item in the registry/)
  })

  it('instanceIds are unique across the battle and survive a JSON round trip', () => {
    const ctx = createBattle({ ...base, heroes: [WARRIOR, WARRIOR], heroHexes: [247, 248],
      heroItems: [['item.longsword'], ['item.longsword']], heroStowed: [['item.kite-shield'], ['item.kite-shield']] })
    const all = ctx.state.units.flatMap((u) => [...(u.loadout?.hands ?? []), ...(u.loadout?.stowed ?? [])].map((i) => i.instanceId))
    expect(all.length).toBe(4)
    expect(new Set(all).size).toBe(4)
    expect(JSON.parse(JSON.stringify(ctx.state))).toEqual(ctx.state)
  })

  it('heroStowed must match the heroes', () => {
    expect(() => createBattle({ ...base, heroes: [WARRIOR], heroHexes: [247], heroStowed: [[], []] })).toThrow(/1 heroes but 2 stowed lists/)
  })

  it('an enemy carries no loadout', () => {
    const ctx = one(['item.longsword'])
    for (const u of ctx.state.units.filter((x) => x.side === 'enemy')) expect(u.loadout).toBeUndefined()
  })
})
