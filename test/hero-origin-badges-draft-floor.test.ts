// content.hero-origin-badges (engine item, 2026-10-05; engine/DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the
// heroes …': "3, yes."). FOUND by that landing: a base hero's row carries its origin badges now, so the Forest Fey - Health 6
// on her row - is fielded at Health 2 (her Pilgrim's Habit, and Frail). The draft held a rolled point at the Crucible's
// floor (Health 1) against the ROW's number alone, so a rolled loss of 2 left her at 0 and the engine refused to field her.
// The engine's rule now also holds a LOSS at the floor against the hero as fielded (engine SWITCHES.md originBadgeDraftFloor);
// the run's draft hands the engine that fielded value (the engine's own preview of the row), as its own dice roll.
import { describe, it, expect } from 'vitest'
import OPENING from '../../progression/OPENING-PARTY.json'
import { draftBaseOf, handDraftedOf } from '../src/core/opening.js'
import { fieldedPreviewOf } from '../src/core/seam.js'
import { heroRowOf } from '../src/content/heroes.js'
import { makeRng, rootSeedOf, rollBelow, roll100 } from '../../engine/src/core/rng.js'

const FEY = 'hero.base.ranger-nature'
const rollerOf = (seed: number) => { const rng = makeRng(rootSeedOf(0, 0, seed)); return { below: (n: number, ...keys: number[]) => rollBelow(rng, n, 'draft', ...keys), d100: (...keys: number[]) => roll100(rng, 'draft', ...keys) } }

describe('a drafted hero can always be fielded: a rolled loss is held at its floor against the hero as fielded', () => {
  it('the draft\'s base for a row gives the row\'s number, and - as fielded - the engine\'s preview of that row', () => {
    const row = heroRowOf(FEY), base = draftBaseOf(row), bare = fieldedPreviewOf(row).now
    expect(base('health')).toBe(6)
    expect(base.fielded!('health')).toBe(bare.maxHp)
    expect(bare.maxHp).toBe(2)
    expect(base.fielded!('itemSlots')).toBe(row.itemSlots)
  })
  it('the Forest Fey, offered with a Health loss, loses 1 and not 2, and the engine fields her', () => {
    expect([OPENING.crucible.statFloor.health, OPENING.crucible.statStep.health]).toEqual([1, 2])
    const row = heroRowOf(FEY)
    let seen = 0
    for (let seed = 0; seed < 400 && seen < 3; seed++) {
      const d = handDraftedOf(rollerOf(seed), [draftBaseOf(row)], 1, [])[0]!
      const lost = d.rolls.find((r) => r.stat === 'health' && r.amount < 0)
      if (!lost) continue
      seen++
      expect(lost.amount, `seed ${seed}`).toBe(-1)
      const hero = { ...row, badges: [...row.badges, ...d.badges], drafted: d }
      expect(fieldedPreviewOf(hero).now.maxHp, `seed ${seed}`).toBeGreaterThanOrEqual(1)
    }
    expect(seen, 'a roll of seeds 0 to 399 takes Health from her').toBeGreaterThan(0)
  })
})
