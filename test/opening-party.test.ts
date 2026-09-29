// fix.opening-party (2026-09-29): the opening is tested with the party the player has at that point,
// not the Alpha Team. Ruled 2026-09-28 (Andrew, DECISIONS.md same title): "Opening battles should be
// tested with a party the player should have at that point. We need to move away from these alpha
// heroes." The rules are progression/OPENING-PARTY.json's (GAME-ARCHITECTURE.md §2.5 cadence: 1
// before battle 1, +2 after it, +1 after each until six; the Flaming Longsword after battle 2); the
// draft is drawn per replicate by src/content/opening-party.ts.
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { OPENING_POSITIONS, openingDraftOf, openingPartyOf } from '../src/content/opening-party.js'
import { UNITS } from '../src/content/index.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }

const SWORD = 'item.longsword.flaming'
const itemsOf = (u: { loadout?: { hands: { itemId: string }[]; stowed: { itemId: string }[]; worn?: { itemId: string }[] } }) =>
  [...(u.loadout?.hands ?? []), ...(u.loadout?.stowed ?? []), ...(u.loadout?.worn ?? [])].map((i) => i.itemId).sort()

describe('fix.opening-party — the opening fields the drafted party', () => {
  it('the six positions carry the ruled cadence, level 1, and the sword from the Bridge on', () => {
    expect(OPENING_POSITIONS.map((p) => [p.encounterId, p.drafted])).toEqual([
      ['encounter.opening.orphanage', 1], ['encounter.opening.lumberjack', 3], ['encounter.opening.bridge', 4],
      ['encounter.opening.cavern-trail', 5], ['encounter.opening.gates', 6], ['encounter.opening.cathedral', 6]])
    expect(OPENING_POSITIONS.every((p) => p.level === 1)).toBe(true)
    expect(OPENING_POSITIONS.map((p) => p.carried.includes(SWORD))).toEqual([false, false, true, true, true, true])
  })

  it('the Orphanage fields one drafted hero with the Orphan Child and the School Teacher; the Lumberjack three; the Cavern Trail five', () => {
    for (const [s, n, civilians] of [
      ['test.opening-orphanage', 1, ['hero.fixed.orphans', 'hero.fixed.school-teacher']],
      ['test.opening-lumberjack', 3, ['hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife']],
      ['test.opening-cavern-trail', 5, []],
    ] as const) {
      const ctx = createBattle(scenarioOptions(scenarioDef(s)))
      const side = ctx.state.units.filter((u) => u.side === 'hero')
      const drafted = side.filter((u) => OPENING.pool.includes(u.typeId))
      expect(drafted, s).toHaveLength(n)
      expect(side.filter((u) => !OPENING.pool.includes(u.typeId)).map((u) => u.typeId).sort(), s).toEqual([...civilians].sort())
    }
  })

  it('the Bridge fields four, the Gates six, the Cathedral six', () => {
    expect([3, 5, 6].map((p) => openingPartyOf(p, 0).heroes.length)).toEqual([4, 6, 6])
  })

  it('every fielded hero is a pool row on its own kit, and from the Bridge on one carries the Flaming Longsword', () => {
    for (let r = 0; r < 5; r++) {
      for (const p of OPENING_POSITIONS) {
        const { heroes, heroItems } = openingPartyOf(p.position, r)
        expect(new Set(heroes).size).toBe(heroes.length)
        for (const id of heroes) {
          expect(OPENING.pool).toContain(id)
          expect(UNITS[id]!.side).toBe('hero')
          expect(UNITS[id]!.defaultItems?.length, `${id} has a kit`).toBeGreaterThan(0)
        }
        const holders = heroItems.flatMap((items, i) => (items?.includes(SWORD) ? [i] : []))
        expect(holders).toHaveLength(p.position >= 3 ? 1 : 0)
        // everyone else enters on the row's own kit (no list handed in = the Codex default kit)
        expect(heroItems.filter((items, i) => !holders.includes(i) && items !== undefined)).toEqual([])
      }
    }
    // in the battle itself: the holder wields it, the others wear exactly their kit
    const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-cavern-trail')))
    const drafted = ctx.state.units.filter((u) => u.side === 'hero' && OPENING.pool.includes(u.typeId))
    const holder = drafted.filter((u) => u.loadout?.hands.some((i) => i.itemId === SWORD))
    expect(holder).toHaveLength(1)
    for (const u of drafted.filter((x) => !holder.includes(x))) expect(itemsOf(u)).toEqual([...UNITS[u.typeId]!.defaultItems!].sort())
  })

  it('the same replicate drafts the same party, different replicates different ones, and each battle\'s party extends the last', () => {
    expect(openingDraftOf(3, 6)).toEqual(openingDraftOf(3, 6))
    const parties = new Set(Array.from({ length: 10 }, (_, r) => openingDraftOf(r, 6).join(',')))
    expect(parties.size).toBeGreaterThan(1)
    for (let r = 0; r < 10; r++) {
      const six = openingDraftOf(r, 6)
      for (const p of OPENING_POSITIONS) expect(openingPartyOf(p.position, r).heroes).toEqual(six.slice(0, p.drafted))
    }
    const a = scenarioOptions(scenarioDef('test.opening-lumberjack'), 0).heroes
    const differs = Array.from({ length: 10 }, (_, r) => scenarioOptions(scenarioDef('test.opening-lumberjack'), r).heroes.join(',')).some((h) => h !== a.join(','))
    expect(differs).toBe(true)
  })

  it('no opening scenario names an Alpha hero', () => {
    const opening = Object.values(SCENARIOS).filter((s) => s.id.startsWith('test.opening-') && s.encounterId?.startsWith('encounter.opening.'))
    expect(opening.map((s) => s.id).sort()).toEqual(['test.opening-cavern-trail', 'test.opening-lumberjack', 'test.opening-orphanage'])
    for (const s of opening) {
      expect(s.openingPosition, s.id).toBeGreaterThan(0)
      expect(s.heroes).toEqual([])
      for (let r = 0; r < 5; r++) expect(scenarioOptions(s, r).heroes.some((h) => h.startsWith('alpha-')), s.id).toBe(false)
    }
  })
})
