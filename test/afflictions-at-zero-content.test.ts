// content.afflictions-at-zero (2026-10-01) — the content half of DECISIONS.md 2026-10-01 'the afflictions at 0 Health'
// and 'bleed-out is a stat on every player unit, 5; Rotting Flesh +5'.
//
// The pack carries badge.fragile (−1 maximum Health; its stacking a named gap until rule.afflictions-at-zero) and
// Rotting Flesh's +5 bleed-out (5 to 10); the four affliction rows keep every 2026-09-29 stat and deploy cost ("let's
// leave in"), and each names what happens at 0 Health as a gap the engine half closes. A plain hero bleeds out over 5.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { bleedOutCounterOf } from '../src/core/settle.js'
import { BADGES } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const mods = (id: string) => BADGES[id]!.statModifiers as Record<string, number>
const gaps = (id: string) => BADGES[id]!.gaps ?? []

describe('Fragile and Rotting Flesh in the pack', () => {
  // Law 10, rule.afflictions-at-zero (2026-10-02): the stacking was a named gap until the engine half built it; the row now
  // carries it as data (`stacks: true`) and the gap is gone. was: gaps('badge.fragile') names 'stacks with no limit'.
  it('badge.fragile is −1 maximum Health, and it stacks with no limit', () => {
    expect(mods('badge.fragile')).toEqual({ maxHp: -1 })
    expect(BADGES['badge.fragile']!.stacks).toBe(true)
    expect(gaps('badge.fragile').some((g) => /stacks with no limit/.test(g))).toBe(false)
  })

  it('Rotting Flesh carries +5 bleed-out beside its 2026-09-29 numbers', () => {
    expect(mods('badge.rotting-flesh')).toEqual({ maxHp: 8, armor: 1, movement: -2, accuracy: -10, poisonResist: 1, bleedOutTurns: 5 })
    expect(BADGES['badge.rotting-flesh']!.deathbedFighting).toBe(20)
  })
})

describe('the four afflictions keep every 2026-09-29 stat and deploy cost, and name what happens at 0 Health', () => {
  it('stats, grants and Deathbed points are unchanged', () => {
    expect(mods('badge.vampirism')).toEqual({ strength: 2, precision: 1, maxHp: 3, resist: 1, magic: 1, spirit: -1 })
    expect(BADGES['badge.vampirism']!.grants).toEqual(['power.flight-vampiric'])
    expect(BADGES['badge.vampirism']!.deathbedFighting).toBe(15)
    expect(mods('badge.lycanthropy')).toEqual({ strength: 2, movement: 2, maxStamina: 2, crit: -5, spirit: -1 })
    expect(mods('badge.possession')).toEqual({ magic: 2, resist: 1, vision: 3, surge: -10 })
    expect(BADGES['badge.possession']!.deathbedFighting).toBe(-10)
  })

  it('the deploy costs and drawbacks the engine cannot yet act on stay named', () => {
    expect(gaps('badge.vampirism')).toEqual(expect.arrayContaining(['deploying the hero costs 3 Faith', 'the hero gains half experience']))
    expect(gaps('badge.lycanthropy')).toEqual(expect.arrayContaining(['deploying the hero costs 2 Supplies']))
    expect(gaps('badge.possession')).toEqual(expect.arrayContaining(['deploying the hero costs 3 Mana']))
  })

  // Law 10, rule.afflictions-at-zero (2026-10-02): what each row does at 0 Health was a named gap ('at 0 Health: …
  // (rule.afflictions-at-zero)') until the engine half built it. The rows now carry it as data the engine reads (`atZero`),
  // and the gap is gone. was: atZero(id) matched the gap text, e.g. /transforms into a Vampire.*rolls Luck.*/.
  it('each row says what happens at 0 Health, as data the engine reads', () => {
    const atZeroGap = (id: string) => gaps(id).find((g) => g.startsWith('at 0 Health:'))
    for (const id of ['badge.vampirism', 'badge.lycanthropy', 'badge.possession', 'badge.rotting-flesh']) expect(atZeroGap(id)).toBeUndefined()
    // Law 10, fix.affliction-pop-up-words (2026-10-04; DECISIONS.md 2026-10-03 "the affliction pop-up's 0-Health words and its
    // drawbacks come from the engine"): these four read `expect(BADGES[…]!.atZero).toEqual({ deathbedFighting: …, … })` — the
    // structured facts and nothing else, while the ruled wording stayed on the Codex row. The row's `text` rides the
    // compiled rule now, so each is held as: exactly those structured facts, and beside them the ruled text, a sentence
    // (test/affliction-pop-up-words.test.ts holds it word for word to the Codex).
    const facts = (id: string) => { const { text, ...rest } = BADGES[id]!.atZero as unknown as Record<string, unknown>; expect(typeof text, id + ': the ruled text').toBe('string'); return rest }
    expect(facts('badge.vampirism')).toEqual({ deathbedFighting: false, transformsInto: 'unit.vampire', luckRoll: true })
    expect(facts('badge.lycanthropy')).toEqual({ deathbedFighting: false, transformsInto: 'unit.werewolf', luckRoll: true })
    expect(facts('badge.possession')).toEqual({ deathbedFighting: false, raises: 'unit.ghost', raisedSide: 'enemy' })
    expect(facts('badge.rotting-flesh')).toEqual({ deathbedFighting: true, gains: 'badge.fragile' })
  })
})

describe('fielded: bleed-out is a stat on every player unit, standard 5', () => {
  it('the Rotting Flesh warrior bleeds out over 10, the Fragile warrior has 1 less maximum Health, a plain warrior bleeds out over 5', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.afflictions-at-zero']!))
    const [rotting, fragile] = ctx.state.units.filter((u) => u.side === 'hero')
    expect(rotting!.badges).toContain('badge.rotting-flesh')
    expect(bleedOutCounterOf(rotting!)).toBe(10)
    expect(fragile!.badges).toContain('badge.fragile')
    expect(bleedOutCounterOf(fragile!)).toBe(5)
    // the same fielding with no badges
    const plain = createBattle({ mapId: 'map.open', heroes: ['test-warrior', 'test-warrior'], heroHexes: [85, 100], enemies: ['test-zombie', 'test-zombie'], enemyHexes: [86, 101], enemyCount: 2, replicate: 0 })
    const bare = plain.state.units.filter((u) => u.side === 'hero')[1]!
    expect(fragile!.maxHp).toBe(bare.maxHp - 1)
    expect(bleedOutCounterOf(bare)).toBe(5)
  })
})
