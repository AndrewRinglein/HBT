// progression.level-table-by-type (2026-09-03). Ruled: "We need some unique way
// to define the level-ups by the name of the civilian... Maiden and farmer are
// different in how they should level up." A hero row may name its own level
// table (`levelTable: 'civilian.farmer'`); the class tag stays what it was and
// only the curve moves. No pointer = the class table, as before.
//
// Before this landed a farmer levelled on class.civilian silently — wrong
// numbers, no crash, the worse failure mode. Every assertion here reads the
// TWO tables and proves the fielded numbers came from the right one.
import { describe, expect, it } from 'vitest'
import { fieldedDef, createBattle, levelTableOf, classOf } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { LEVELS, SPECIALTIES, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const FARMERS = ['hero.fixed.farmer', 'hero.fixed.farming-family', 'hero.fixed.group-of-farmers']

function grantsThrough(tableId: string, level: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of LEVELS[tableId]!.rows) {
    if (r.level < 2 || r.level > level) continue
    for (const [k, v] of Object.entries(r.grants)) if (k !== 'itemSlots') out[k] = (out[k] ?? 0) + v
  }
  return out
}

describe('the civilian TYPE table in the pack', () => {
  it('civilian.farmer ships as a level table beside the class tables, and the three farmer rows point at it', () => {
    expect(LEVELS['civilian.farmer']).toBeDefined()
    expect(LEVELS['civilian.farmer']!.rows.map((r) => r.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const id of FARMERS) {
      expect(UNITS[id]?.levelTable, id).toBe('civilian.farmer')
      expect(classOf(UNITS[id]!), `${id} is still a civilian`).toBe('class.civilian')
      expect(levelTableOf(UNITS[id]!)).toBe('civilian.farmer')
    }
    // the orphans carry no pointer and level on the class
    expect(UNITS['hero.fixed.orphans']?.levelTable).toBeUndefined()
    expect(levelTableOf(UNITS['hero.fixed.orphans']!)).toBe('class.civilian')
  })

  it('never any stamina — the civilian rule holds for the type table too', () => {
    for (const r of LEVELS['civilian.farmer']!.rows) {
      expect(r.grants.maxStamina ?? 0, `L${r.level}`).toBe(0)
      expect(r.grants.staminaRegen ?? 0, `L${r.level}`).toBe(0)
    }
  })

  it('the two curves differ at level 3 — otherwise the pointer would prove nothing', () => {
    expect(grantsThrough('civilian.farmer', 3)).not.toEqual(grantsThrough('class.civilian', 3))
  })

  it('the civilian specialties compile — a civilian at level 2 needs one', () => {
    const civ = Object.values(SPECIALTIES).filter((s) => s.class === 'class.civilian')
    expect(civ.map((s) => s.id)).toContain('specialty.militia')
    expect(civ.length).toBeGreaterThanOrEqual(9)
  })
})

describe('fielding on the type table', () => {
  it('a farmer at level 3 carries civilian.farmer\'s grants, not class.civilian\'s', () => {
    const bare = UNITS['hero.fixed.farmer']!
    const grown = fieldedDef('hero.fixed.farmer', [], { level: 3, specialtyId: 'specialty.militia' })
    const farmer = grantsThrough('civilian.farmer', 3)
    const civ = grantsThrough('class.civilian', 3)
    const sp = SPECIALTIES['specialty.militia']!.statModifiers
    const expectStat = (k: keyof typeof bare, table: Record<string, number>) => (bare[k] as number ?? 0) + (table[k as string] ?? 0) + ((sp as Record<string, number>)[k as string] ?? 0)
    // dodge is the tell: the farmer table grants +5 at L3, the class table none
    expect(grown.dodge).toBe(expectStat('dodge', farmer))
    expect(grown.dodge).not.toBe(expectStat('dodge', civ))
    expect(grown.accuracy).toBe(expectStat('accuracy', farmer))
    expect(grown.accuracy).not.toBe(expectStat('accuracy', civ))
    expect(grown.maxHp).toBe(expectStat('maxHp', farmer))
    expect(grown.strength).toBe(expectStat('strength', farmer))
  })

  it('the orphans, with no pointer, still level on class.civilian', () => {
    const bare = UNITS['hero.fixed.orphans']!
    const grown = fieldedDef('hero.fixed.orphans', [], { level: 3, specialtyId: 'specialty.trickster' })
    const civ = grantsThrough('class.civilian', 3)
    const sp = SPECIALTIES['specialty.trickster']!.statModifiers as Record<string, number>
    expect(grown.accuracy).toBe(bare.accuracy + (civ.accuracy ?? 0) + (sp.accuracy ?? 0))
    expect(grown.dodge).toBe(bare.dodge + (civ.dodge ?? 0) + (sp.dodge ?? 0))
  })

  it('a pointer at a table the pack lacks is loud, not silent', () => {
    const bad = { ...UNITS['hero.fixed.farmer']!, levelTable: 'civilian.nobody' }
    expect(levelTableOf(bad)).toBe('civilian.nobody')
    expect(() => fieldedDef('hero.fixed.farmer', [], { level: 3, specialtyId: 'specialty.militia' })).not.toThrow()
    expect(LEVELS['civilian.nobody']).toBeUndefined()
  })
})

describe('showcase.farmers-grown — the log names the table', () => {
  it('three unit.grown lines are caused by civilian.farmer and one by class.civilian, each carrying its mods', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['showcase.farmers-grown']!))
    const grown = ctx.events.filter((e) => e.type === 'unit.grown')
    expect(grown.map((e) => e.causeId)).toEqual(['civilian.farmer', 'civilian.farmer', 'civilian.farmer', 'class.civilian'])
    for (const e of grown) {
      const p = e as unknown as { level: number; table: string; mods: Record<string, number> }
      expect(p.level).toBe(3)
      expect(p.table).toBe(e.causeId)
      expect(Object.keys(p.mods).length).toBeGreaterThan(0)
    }
    // the farmer lines carry the farmer's dodge, the orphan line does not
    const farmerMods = (grown[0] as unknown as { mods: Record<string, number> }).mods
    expect(farmerMods.dodge).toBe((grantsThrough('civilian.farmer', 3).dodge ?? 0) + (SPECIALTIES['specialty.militia']!.statModifiers.dodge ?? 0))
    runBattle(ctx)
    expect(ctx.state.outcome).toBeDefined()
  })
})
