// content.immune-one-is-resist (2026-09-29, Andrew, DECISIONS.md 'the Ghost as the bestiary has it; Cold Resist;
// "Immune X 1" is a resistance of 1'): "What does the '1' in 'Immune Frost 1', 'Immune poison 1' and 'Immune fire 1'
// mean: a resistance of 1, or something else?" — "Yes." Frost is Cold's status, so Immune Frost 1 is +1 Cold Resist.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { flatDamage } from '../src/core/mitigation.js'
import { effective } from '../src/core/stats.js'
import { BADGES } from '../src/content/index.js'

const fielded = (badges: string[]) => {
  const ctx = createBattle({ replicate: 0, mapId: 'map.open', heroes: ['test-warrior'], heroHexes: [85], enemies: ['test-zombie'], enemyHexes: [140], enemyCount: 1, heroBadges: [badges] })
  return { ctx, w: ctx.state.units[0]! }
}

describe('"Immune <element> 1" is a resistance of 1', () => {
  it('the rows compile to their element\'s resistance; a status with no element (Weak) stays named', () => {
    expect(BADGES['badge.frost-resistant']!.statModifiers).toEqual({ coldResist: 1 })
    expect(BADGES['badge.poison-resistant']!.statModifiers).toEqual({ poisonResist: 1 })
    expect(BADGES['badge.fire-resistant']!.statModifiers).toEqual({ fireResist: 1 })
    expect(BADGES['badge.dragon-slayer']!.statModifiers).toEqual({ maxHp: 2, fireResist: 1 })   // "immunen to fire 1", as authored
    expect(BADGES['badge.curse-resistant']!.gaps).toEqual(['Immune weak 1'])
    for (const id of ['badge.frost-resistant', 'badge.poison-resistant', 'badge.fire-resistant']) expect(BADGES[id]!.gaps).toBeUndefined()
  })
  it('fielded with Frost Resistant, a hero carries 1 Cold Resist and takes 1 less cold damage; Fire Resistant does the same for fire', () => {
    const plain = fielded([]), frost = fielded(['badge.frost-resistant']), fire = fielded(['badge.fire-resistant'])
    expect(effective(frost.ctx, frost.w, 'coldResist').value).toBe(1)
    expect(flatDamage(frost.ctx, frost.w, 5, 'cold').value).toBe(flatDamage(plain.ctx, plain.w, 5, 'cold').value - 1)
    expect(flatDamage(frost.ctx, frost.w, 5, 'fire').value).toBe(flatDamage(plain.ctx, plain.w, 5, 'fire').value)
    expect(flatDamage(fire.ctx, fire.w, 5, 'fire').value).toBe(flatDamage(plain.ctx, plain.w, 5, 'fire').value - 1)
  })
})
