// fix.opening-first-level (2026-09-29): the Orphanage pays 20 XP no matter what, so the first hero is
// level 2 from the Lumberjack on. Ruled 2026-09-28 (Andrew, DECISIONS.md 'the Orphanage pays 20 XP no
// matter what'): "Make it so they get 20 XP no matter what, so they get a level, and then we'll do the
// level." The curve is DECISIONS.md 'levels by XP at 20, 50, 100, 170, 270, 400'. The level reaches the
// battle through heroProgress and applyProgress (the class table's grants, the specialty at level 2).
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { OPENING_POSITIONS, openingPartyOf } from '../src/content/opening-party.js'
import { UNITS } from '../src/content/index.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }

describe('fix.opening-first-level — the first hero is level 2 after the Orphanage', () => {
  it('the Orphanage pays 20 XP to whoever fought it, and 20 XP reaches level 2 on the ruled curve', () => {
    expect(OPENING.battleXp).toEqual({ 1: 20 })
    expect(OPENING.levelXp).toEqual([20, 50, 100, 170, 270, 400])
    // Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read
    //   .toEqual([[0], [20, 0, 0], [20, 0, 0, 0], [20, 0, 0, 0, 0], [20, 0, 0, 0, 0, 0], [20, 0, 0, 0, 0, 0]])
    // — one XP entry per hero of the old cadence's parties (1, 3, 4, 5, 6, 6). The rule is unchanged — the Orphanage's 20
    // is the first hero's, everyone drafted after it carries none — over the ruled parties.
    expect(OPENING_POSITIONS.map((p) => p.xp)).toEqual([[0], [20, 0], [20, 0, 0], [20, 0, 0, 0], [20, 0, 0, 0, 0], [20, 0, 0, 0, 0, 0]])
    expect(OPENING_POSITIONS.map((p) => p.levels[0])).toEqual([1, 2, 2, 2, 2, 2])
    expect(OPENING_POSITIONS.every((p) => p.levels.slice(1).every((l) => l === 1))).toBe(true)
  })

  it('from the Lumberjack on, the first hero fields at level 2 with its class specialty; everyone else at level 1', () => {
    for (let r = 0; r < 6; r++) {
      expect(openingPartyOf(1, r).heroProgress).toEqual([undefined])
      for (const p of OPENING_POSITIONS.slice(1)) {
        const { heroes, heroProgress } = openingPartyOf(p.position, r)
        const cls = (UNITS[heroes[0]!]!.tags ?? []).find((t) => t.startsWith('class.'))!
        expect(heroProgress[0]).toEqual({ level: 2, specialtyId: OPENING.specialties[cls as keyof typeof OPENING.specialties], powers: [] })
        expect(heroProgress.slice(1).every((x) => x === undefined)).toBe(true)
      }
    }
  })

  it('in the battle the level-2 hero is stronger than the same row at level 1 — the class table and specialty fold', () => {
    const S = scenarioDef('test.opening-lumberjack')
    const opts = scenarioOptions(S)
    const leveled = createBattle(opts).state.units[0]!
    const bare = createBattle({ ...opts, heroProgress: opts.heroes.map(() => undefined) }).state.units[0]!
    expect(leveled.typeId).toBe(bare.typeId)
    const stats = ['maxHp', 'armor', 'resist', 'dodge', 'accuracy', 'strength', 'precision', 'magic', 'spirit', 'crit', 'movement', 'maxStamina'] as const
    expect(stats.some((k) => leveled[k] !== bare[k]), 'level 2 changes a stat').toBe(true)
    const e = createBattle(opts).events.filter((x) => x.actor === 0 || x.target === 0).map((x) => JSON.stringify(x))
    expect(e.some((x) => x.includes('specialty.')), 'the specialty is named in the log').toBe(true)
  })
})
