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
  // was: 'the six positions carry the ruled cadence, level 1, and the sword from the Bridge on' — Law 10,
  // fix.opening-first-level (2026-09-29): the level-1 rule was SWITCHES.md openingPartyLevel, overturned
  // by Andrew 2026-09-28 ("They need to be leveling up"; the Orphanage pays 20 XP). Levels are asserted in
  // test/opening-first-level.test.ts.
  it('the six positions carry the ruled cadence and the sword from the Bridge on', () => {
    // Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2." · "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read
    //   ['encounter.opening.orphanage', 1], ['encounter.opening.lumberjack', 3], ['encounter.opening.bridge', 4],
    //   ['encounter.opening.cavern-trail', 5], ['encounter.opening.gates', 6], ['encounter.opening.cathedral', 6]])
    // — the 2026-08-23 cadence (two drafts after battle 1). The ruled cadence is one after every battle.
    expect(OPENING_POSITIONS.map((p) => [p.encounterId, p.drafted])).toEqual([
      ['encounter.opening.orphanage', 1], ['encounter.opening.lumberjack', 2], ['encounter.opening.bridge', 3],
      ['encounter.opening.cavern-trail', 4], ['encounter.opening.gates', 5], ['encounter.opening.cathedral', 6]])
    expect(OPENING_POSITIONS.map((p) => p.carried.includes(SWORD))).toEqual([false, false, true, true, true, true])
  })

  // Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2." · "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read
  //   it('the Orphanage fields one drafted hero with the Orphan Child and the School Teacher; the Lumberjack three; the Cavern Trail five', …
  //     ['test.opening-lumberjack', 3, …], ['test.opening-cavern-trail', 5, []],
  // — the old cadence's parties. The Lumberjack House fields two, the Cavern Trail four; the civilians are as they were.
  it('the Orphanage fields one drafted hero with the Orphan Child and the School Teacher; the Lumberjack two; the Cavern Trail four', () => {
    for (const [s, n, civilians] of [
      ['test.opening-orphanage', 1, ['hero.fixed.orphans', 'hero.fixed.school-teacher']],
      ['test.opening-lumberjack', 2, ['hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife']],
      ['test.opening-cavern-trail', 4, []],
    ] as const) {
      const ctx = createBattle(scenarioOptions(scenarioDef(s)))
      const side = ctx.state.units.filter((u) => u.side === 'hero')
      const drafted = side.filter((u) => OPENING.pool.includes(u.typeId))
      expect(drafted, s).toHaveLength(n)
      expect(side.filter((u) => !OPENING.pool.includes(u.typeId)).map((u) => u.typeId).sort(), s).toEqual([...civilians].sort())
    }
  })

  // Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2." · "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read
  //   it('the Bridge fields four, the Gates six, the Cathedral six', () => { … .toEqual([4, 6, 6]) })
  it('the Bridge fields three, the Gates five, the Cathedral six', () => {
    expect([3, 5, 6].map((p) => openingPartyOf(p, 0).heroes.length)).toEqual([3, 5, 6])
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
        // Law 10, fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're only supposed to have one draft between battles 1 and 2." · "One, yes." — a party of 1, 2, 3, 4, 5, 6): this read
        //   expect(holders).toHaveLength(p.position >= 3 ? 1 : 0)
        // — true while the Bridge fielded four heroes, among whom these replicates always drafted a Warrior or a Paladin.
        // With three at the Bridge a replicate may hold neither, and the rule is the one the builder and the kingdom state
        // (DECISIONS.md 2026-09-28 "it only is going to help the paladin or the warrior"; 2026-10-03 'the Flaming Longsword
        // waits for its taker'): from the Bridge on ONE hero carries it when the party holds a taker — and that hero is a
        // taker — and nobody carries it while the party holds none (openingHolderOf); by the Cathedral, six heroes of six
        // classes, it is always carried.
        const takers = heroes.map((id, i) => (OPENING.takers[SWORD].some((c: string) => UNITS[id]!.tags!.includes(c)) ? i : -1)).filter((i) => i >= 0)
        expect(holders, `replicate ${r}, battle ${p.position}`).toHaveLength(p.position >= 3 && takers.length ? 1 : 0)
        for (const i of holders) expect(takers, `replicate ${r}, battle ${p.position}: the holder is a Warrior or a Paladin`).toContain(i)
        if (p.position === 6) expect(holders, `replicate ${r}: at the Cathedral the sword is carried`).toHaveLength(1)
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
    // Law 10, encounter.opening.bridge-ai (2026-09-30): the Bridge joins as battle 3 (position 3), fielded like the others — the list grows, every assertion below runs on it too.
    // was: expect(opening.map((s) => s.id).sort()).toEqual(['test.opening-cavern-trail', 'test.opening-lumberjack', 'test.opening-orphanage'])
    // Law 10, encounter.opening.gates (817b21d, 2026-10-01): Gates joins as battle 5, fielded like the others — the list grows, every assertion below runs on it too.
    // was: expect(opening.map((s) => s.id).sort()).toEqual(['test.opening-bridge', 'test.opening-cavern-trail', 'test.opening-lumberjack', 'test.opening-orphanage'])
    // Law 10, encounter.opening.cathedral (2026-10-01): the Cathedral joins as battle 6, fielded like the others — the list grows, every assertion below runs on it too.
    // was: expect(opening.map((s) => s.id).sort()).toEqual(['test.opening-bridge', 'test.opening-cavern-trail', 'test.opening-gates', 'test.opening-lumberjack', 'test.opening-orphanage'])
    expect(opening.map((s) => s.id).sort()).toEqual(['test.opening-bridge', 'test.opening-cathedral', 'test.opening-cavern-trail', 'test.opening-gates', 'test.opening-lumberjack', 'test.opening-orphanage'])
    for (const s of opening) {
      expect(s.openingPosition, s.id).toBeGreaterThan(0)
      expect(s.heroes).toEqual([])
      for (let r = 0; r < 5; r++) expect(scenarioOptions(s, r).heroes.some((h) => h.startsWith('alpha-')), s.id).toBe(false)
    }
  })
})
