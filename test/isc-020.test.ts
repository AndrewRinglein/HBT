// ISC-020 — the difficulty number equals Σ(hero levels, civilians ÷2 ⌊⌋) +
// 2×week − 5×losses + 3×corruption, counting everyone alive.
// SKELETON-NOTES.md:675 · SKELETON-SETTLED.md:117-118
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { resolveDifficulty } from '../src/core/reckoning.js'

describe('ISC-020 — the difficulty number', () => {
  it('matches the hand sum on three authored rosters', () => {
    // the fixture: FIVE heroes at level 1 (the alpha four were removed 2026-09-02 and the
    // pool holds five until the engine fields the Eve 24), one civilian at level 1 (÷2 → 0),
    // week 3, no losses, no corruption. Law 10: the sum is re-derived by hand for the new roster.
    const a = loadFixture()
    expect(resolveDifficulty(a.campaign)).toBe(5 + 0 + 2 * 3 - 0 + 0)

    // levelled, a civilian at 3 (→1), two losses, corruption 2 on one hero, week 7
    const b = loadFixture((c) => {
      c.week = 7; c.losses = 2
      c.roster['hero.base.warrior-iron']!.level = 4
      c.roster['hero.fixed.orphans']!.level = 3
      c.roster['hero.base.priest-armored']!.corruption = 2
    })
    // six rows since the alpha four left (2026-09-02): one hero at 4, the civilian at 3 (→1), four heroes at 1
    expect(resolveDifficulty(b.campaign)).toBe((4 + 1 + 1 + 1 + 1 + 1) + 2 * 7 - 5 * 2 + 3 * 2)

    // the dead do not count — levels or corruption
    const d = loadFixture((c) => { c.roster['hero.base.warrior-iron']!.level = 9; c.roster['hero.base.warrior-iron']!.corruption = 5; c.roster['hero.base.warrior-iron']!.lifeState = 'dead' })
    expect(resolveDifficulty(d.campaign)).toBe(4 + 0 + 2 * 3)   // four living heroes of five
  })
})
