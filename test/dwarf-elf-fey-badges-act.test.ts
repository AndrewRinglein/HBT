// content.dwarf-elf-fey-badges-act (2026-10-05). Ruled 2026-10-05 (Andrew, DECISIONS.md 'a prone unit only stands; … Dwarf,
// Elf and Fey act; …'): asked whether the Dwarf, Elf and Fey badges' numbers should act or stay names only - "6. They should
// act." content.hero-origin-badges had put the three on the heroes' rows as names that did nothing: the data held numbers for
// them and the Codex's effect line was empty.
//
// The numbers, as the data holds them: Dwarf -1 Movement, +2 Health; Elf +3 Vision, +2 Luck; Fey +10 Surge. Each hero whose row
// carries one fights with them, and the badge's own line says them.
import { describe, expect, it } from 'vitest'
import { createCustomBattle, fieldedDef } from '../src/core/setup.js'
import { applyBadges } from '../src/core/items.js'
import { runBattle } from '../src/core/battle.js'
import { effective } from '../src/core/stats.js'
import { BADGES, UNITS } from '../src/content/index.js'

const THE_THREE: Record<string, Record<string, number>> = {
  'badge.dwarf': { movement: -1, maxHp: 2 },
  'badge.elf': { vision: 3, luck: 2 },
  'badge.fey': { surge: 10 },
}
// the heroes whose rows carry one (the Codex's origin badges, content.hero-origin-badges)
const WEARERS: Record<string, string> = {
  'hero.base.warrior-iron': 'badge.dwarf', 'hero.base.warrior-brawler': 'badge.dwarf', 'hero.base.warrior-barbarian': 'badge.dwarf',
  'hero.base.ranger-ranger': 'badge.elf', 'hero.base.ranger-scantily': 'badge.elf',
  'hero.base.ranger-nature': 'badge.fey',
}
/** The hero as it would be fielded if its row did not carry `badge`: the same row, the same kit, every other badge. */
function without(typeId: string, badge: string): Record<string, number> {
  const all = fieldedDef(typeId) as unknown as Record<string, number>
  const out: Record<string, number> = { ...all }
  for (const [k, v] of Object.entries(BADGES[badge]!.statModifiers)) out[k] = (all[k] ?? 0) - (v as number)
  return out
}

describe('the three rows', () => {
  it('Dwarf, Elf and Fey carry the data\'s numbers and nothing waits: -1 Movement +2 Health; +3 Vision +2 Luck; +10 Surge', () => {
    for (const [id, mods] of Object.entries(THE_THREE)) {
      const b = BADGES[id]!
      expect(b, id).toBeTruthy()
      expect(b.statModifiers, id).toEqual(mods)
      expect(b.gaps ?? [], id).toEqual([])
      expect(b.grants, id).toEqual([])
    }
  })
  it('exactly six heroes carry one: three Dwarves, two Elves, one Fey', () => {
    const found: Record<string, string> = {}
    for (const [id, u] of Object.entries(UNITS)) for (const b of u.badges ?? []) if (b in THE_THREE && id.startsWith('hero.')) found[id] = b
    expect(found).toEqual(WEARERS)
  })
})

describe('each acts on a fielded hero', () => {
  it('the badge is folded into the hero at fielding: applyBadges puts the numbers on, under the badge\'s name', () => {
    for (const [badge, mods] of Object.entries(THE_THREE)) {
      const typeId = Object.keys(WEARERS).find((k) => WEARERS[k] === badge)!
      const bare = UNITS[typeId]!
      const withIt = applyBadges(bare, [badge], BADGES, 'test').def as unknown as Record<string, number>
      for (const [k, v] of Object.entries(mods)) expect(withIt[k] ?? 0, `${badge} ${k}`).toBe(((bare as unknown as Record<string, number>)[k] ?? 0) + v)
    }
  })

  it('a Dwarf on the board: 2 more Health and 1 less Movement than the same hero without the badge - the Iron Dwarf, the Dwarven Brawler, the Mountain Berserker', () => {
    for (const typeId of ['hero.base.warrior-iron', 'hero.base.warrior-brawler', 'hero.base.warrior-barbarian']) {
      const was = without(typeId, 'badge.dwarf')
      const ctx = createCustomBattle([{ type: typeId, hex: 85 }], [{ type: 'test-zombie', hex: 181 }])
      const u = ctx.state.units[0]!
      expect(u.badges).toContain('badge.dwarf')
      expect([u.maxHp, u.hp], typeId).toEqual([was['maxHp']! + 2, was['maxHp']! + 2])
      expect(effective(ctx, u, 'movement').value, typeId).toBe(was['movement']! - 1)
      const line = ctx.events.find((e) => e.type === 'unit.badged' && e.actor === u.id && e.causeId === 'badge.dwarf')!
      expect([line['mods'], line['gaps'] ?? []], typeId).toEqual([{ movement: -1, maxHp: 2 }, []])
    }
  })

  it('an Elf on the board: 3 more Vision and 2 more Luck - the Ancient Elf, the Forest Elf', () => {
    for (const typeId of ['hero.base.ranger-ranger', 'hero.base.ranger-scantily']) {
      const was = without(typeId, 'badge.elf')
      const ctx = createCustomBattle([{ type: typeId, hex: 85 }], [{ type: 'test-zombie', hex: 181 }])
      const u = ctx.state.units[0]!
      expect(effective(ctx, u, 'vision').value, typeId).toBe((was['vision'] ?? 0) + 3)
      expect(effective(ctx, u, 'luck').value, typeId).toBe((was['luck'] ?? 0) + 2)
      const line = ctx.events.find((e) => e.type === 'unit.badged' && e.actor === u.id && e.causeId === 'badge.elf')!
      expect([line['mods'], line['gaps'] ?? []], typeId).toEqual([{ vision: 3, luck: 2 }, []])
    }
  })

  it('the Fey on the board: Surge 10 - it rolls a Surge check at 10 more each Activation, where it rolled none', () => {
    const was = without('hero.base.ranger-nature', 'badge.fey')
    const ctx = createCustomBattle([{ type: 'hero.base.ranger-nature', hex: 85 }], [{ type: 'test-zombie', hex: 181 }])
    const u = ctx.state.units[0]!
    expect(u.surge).toBe((was['surge'] ?? 0) + 10)
    // Restated 2026-10-06 (rule.surge-is-at-least-level; ruled 2026-10-06: "Everyone gains surge equal to level, at the very
    // least" - the Fey's +10 is on top of her level's 1, "11 at level 1"). The badge still gives exactly 10 (the line above).
    // The lines were:
    //   expect(u.surge).toBe(10)
    //   expect([checks[0]!['surge'], checks[0]!['chance']]).toEqual([10, 10])
    //   if (checks.length > 1 && !checks[0]!['hit']) expect(checks[1]!['chance']).toBe(20)   // the pool: what was not spent is kept
    expect(u.surge).toBe(11)
    const line = ctx.events.find((e) => e.type === 'unit.badged' && e.actor === u.id && e.causeId === 'badge.fey')!
    expect([line['mods'], line['gaps'] ?? []]).toEqual([{ surge: 10 }, []])
    runBattle(ctx)
    const checks = ctx.events.filter((e) => e.type === 'surge.checked' && e.actor === u.id)
    expect(checks.length).toBeGreaterThan(0)
    expect([checks[0]!['surge'], checks[0]!['chance']]).toEqual([11, 11])
    if (checks.length > 1 && !checks[0]!['hit']) expect(checks[1]!['chance']).toBe(22)   // the pool: what was not spent is kept
  })
})
