// v2.loadout, kingdom half (engine 2026-09-24). COMBAT-V2 §11.1 (ruled 2026-09-07): only
// what is in the hands grants; a weapon or shield past the hands rides in an item slot as
// swap fodder. The kingdom hands the engine both lists — heroItems and heroStowed — and the
// retired SWITCHES.spareWeapons ('left-behind') is gone (COMBAT-V2 §18).
import { describe, it, expect } from 'vitest'
import { battleOptionsOf, type EngagementSpec } from '../src/core/seam.js'
import { fieldedItemsOf } from '../src/core/loadout.js'
import { SWITCHES } from '../src/content/switches.js'
import { createBattle } from '../src/engine.js'

const DWARF = 'hero.base.warrior-iron'

describe('v2.loadout — the stowed ride into battle and grant nothing', () => {
  it('a kite shield beside a greatsword is stowed, handed to the engine, and grants no Block', () => {
    const { fielded, stowed } = fieldedItemsOf(['item.greatsword', 'item.kite-shield'])
    const spec: EngagementSpec = { id: 'test.v2-loadout', mapId: 'map.open', seed: 3, heroes: [DWARF], enemies: ['unit.zombie'], heroItems: [fielded], heroStowed: [stowed] }
    const opts = battleOptionsOf(spec)
    expect(opts.heroStowed).toEqual([['item.kite-shield']])
    const withShield = createBattle(opts).state.units.find((u) => u.side === 'hero')!
    const { heroStowed: _, ...bare } = opts
    const without = createBattle(bare).state.units.find((u) => u.side === 'hero')!
    expect(withShield.block ?? 0).toBe(without.block ?? 0)
    expect(withShield.loadout?.stowed.map((i) => i.itemId)).toEqual(['item.kite-shield'])
    expect(withShield.loadout?.hands.map((i) => i.itemId)).toEqual(['item.greatsword'])
  })

  it('the retired spareWeapons switch is gone', () => {
    expect('spareWeapons' in SWITCHES).toBe(false)
  })
})
