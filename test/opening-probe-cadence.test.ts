// fix.opening-probe-cadence (2026-10-04) — ruled 2026-10-03 (Andrew, DECISIONS.md "one draft after every battle; the yellow
// focus border goes; …"): "We're only supposed to have one draft between battles 1 and 2. I was getting two drafts." · asked
// "Should the cadence change to one draft after every battle (party of 1, 2, 3, 4, 5, 6), replacing the 2026-08-23 ruling of
// two drafts after battle 1?" — "One, yes."
//
// The kingdom's run follows it since kingdom.opening-draft-cadence. The engine's own opening party — what its probes, its
// recordings and its tests field — still drafted 1, +2, +1 (a party of 1, 3, 4, 5, 6, 6): a party the player never has.
// The count per battle is one number in one place, the published numbers file progression/OPENING-PARTY.json (written by
// progression/build-schedule.mjs; the engine reads `positions[].drafted`, and types no count of its own): its cadence row
// is now { first: 1, afterEach: 1, until: 6 } and the positions say 1, 2, 3, 4, 5, 6.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }
import { OPENING_POSITIONS, openingDraftOf, openingHeroesOf, openingPartyOf } from '../src/content/opening-party.js'
import { createBattle } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const SCENARIOS = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral'].map((k) => `test.opening-${k}`)
const RULED = [1, 2, 3, 4, 5, 6]
const CADENCE = OPENING.cadence as Record<string, number>

describe('the numbers file: one draft before battle 1 and one after each battle, to six', () => {
  it('the cadence row is { first: 1, afterEach: 1, until: 6 } — the two drafts after battle 1 are gone', () => {
    expect(CADENCE).toEqual({ first: 1, afterEach: 1, until: 6 })
    expect('afterFirst' in CADENCE).toBe(false)
  })

  it('the six positions hold 1, 2, 3, 4, 5, 6 drafted heroes — each the cadence row\'s own arithmetic', () => {
    expect(OPENING.positions.map((p) => p.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(OPENING.positions.map((p) => p.drafted)).toEqual(RULED)
    for (const p of OPENING.positions) {
      expect(p.drafted, `battle ${p.position}`).toBe(Math.min(CADENCE['until']!, CADENCE['first']! + (p.position - 1) * CADENCE['afterEach']!))
      // one XP entry and one level per drafted hero, in draft order: the first hero has fought every battle before this one
      expect([p.xp.length, p.levels.length], `battle ${p.position}`).toEqual([p.drafted, p.drafted])
    }
    // the Orphanage's 20 XP is the first hero's alone: everybody else joined after it
    expect(OPENING.positions.map((p) => p.xp)).toEqual([[0], [20, 0], [20, 0, 0], [20, 0, 0, 0], [20, 0, 0, 0, 0], [20, 0, 0, 0, 0, 0]])
    expect(OPENING.positions.map((p) => p.levels)).toEqual([[1], [2, 1], [2, 1, 1], [2, 1, 1, 1], [2, 1, 1, 1, 1], [2, 1, 1, 1, 1, 1]])
  })

  it('the builder types the cadence once and the engine types no count: it reads the file', () => {
    const builder = readFileSync('../progression/build-schedule.mjs', 'utf8')
    expect(builder).toMatch(/const OPENING_CADENCE = \{ first: 1, afterEach: 1, until: 6 \}/)
    expect(builder, 'no second arithmetic for "after the first battle"').not.toMatch(/afterFirst/)
    const engine = readFileSync('src/content/opening-party.ts', 'utf8')
    expect(engine).toContain("import OPENING from '../../../progression/OPENING-PARTY.json'")
    expect(engine).toContain('export const OPENING_POSITIONS: readonly OpeningPosition[] = OPENING.positions')
    expect(engine, 'the engine holds no cadence of its own').not.toMatch(/afterFirst|afterEach|\+2 after it/)
  })
})

describe('the engine\'s opening party for battle N holds the heroes the ruled cadence gives', () => {
  it('OPENING_POSITIONS is the file\'s: 1, 2, 3, 4, 5, 6 at the Orphanage, the Lumberjack House, the Bridge, the Cavern Trail, the Gates, the Cathedral', () => {
    expect(OPENING_POSITIONS.map((p) => [p.encounterId, p.drafted])).toEqual([
      ['encounter.opening.orphanage', 1], ['encounter.opening.lumberjack', 2], ['encounter.opening.bridge', 3],
      ['encounter.opening.cavern-trail', 4], ['encounter.opening.gates', 5], ['encounter.opening.cathedral', 6]])
  })

  it('openingPartyOf(position) fields that many, each battle\'s party the one before it and one more — over ten replicates', () => {
    for (let r = 0; r < 10; r++) {
      const six = openingDraftOf(r, 6)
      expect(new Set(six).size, `replicate ${r}: six different heroes`).toBe(6)
      for (const p of OPENING.positions) {
        const party = openingPartyOf(p.position, r)
        expect(party.heroes.length, `replicate ${r}, battle ${p.position}`).toBe(RULED[p.position - 1])
        expect(party.heroes, `replicate ${r}, battle ${p.position}: the first ${p.drafted} of the replicate's draft`).toEqual(six.slice(0, p.drafted))
      }
      expect(openingHeroesOf(r, 6).map((h) => h.id)).toEqual(six)
    }
  })

  it('a battle of each opening scenario begins with that many drafted heroes on the board', () => {
    for (const [i, s] of SCENARIOS.entries()) {
      for (const replicate of [0, 3]) {
        const ctx = createBattle({ ...scenarioOptions(scenarioDef(s), replicate), replicate } as Parameters<typeof createBattle>[0])
        const drafted = ctx.state.units.filter((u) => u.side === 'hero' && OPENING.pool.includes(u.typeId))
        expect(drafted.length, `${s}, replicate ${replicate}`).toBe(RULED[i])
      }
    }
  })
})
