// kingdom.gift-roll-leaves-out-own-badges — ruled 2026-10-05 (Andrew, DECISIONS.md 'a prone unit only stands; Stand Up is its one
// move; a set counts everything carried; Dwarf, Elf and Fey act; no gift doubles a hero's own badge; …'): told that the draft
// can roll a hero a gift badge its row already has (the Berserker rolled Huge, the Fey rolled Frail), which then adds nothing,
// and asked whether a hero's own badges should be left out of its gift roll — "7, yes."
//
// Wanted: "when a hero's gifts are rolled (the first-hero pick, every later draft …), any badge the hero's own row already
// carries - its origin badges and any other badge on the row - is not among the badges the roll can give that hero, so every
// rolled badge is one it did not have. The roll stays on the run's dice and stays keyed as it is, so a saved run shows the same
// offers except where an offer held a doubled badge." Expect: "Across replicates 0-199 no hero is ever rolled a gift badge its
// own row already carries (a test walks them); a hero with no badge of its own rolls from the same badges as before; the
// Berserker never rolls Huge and the Forest Fey never rolls Frail; the report says how many drafts changed and which
// recordings moved."
//
// The engine's half: ONE RULE in the one procedure both drafts call (src/content/opening-party.ts pickBadge, through
// firstHeroDraftOf and draftHandOf), told a hero's own badges on the hero's base (DraftBase.own; baseOfRow reads the row's).
// The kingdom's half is kingdom/test/gift-roll-leaves-out-own-badges.test.ts (its draft hands the same in on its own base).
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { baseOfRow, draftHandOf, firstHeroDraftOf, openingHeroesOf, type DraftBase, type DraftRoller } from '../src/content/opening-party.js'
import { UNITS } from '../src/content/index.js'
import { makeRng, roll100, rollBelow, rootSeedOf } from '../src/core/rng.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }

const POOL = (OPENING.pool as string[]).filter((id) => UNITS[id])
const GIFTS = [...(OPENING.crucible.badges.favourable as { id: string }[]), ...(OPENING.crucible.badges.flawed as { id: string }[])].map((b) => b.id)
const ownOf = (id: string): readonly string[] => UNITS[id]!.badges ?? []
/** the engine's own draft stream for a replicate, as a roller (opening-party.ts rollerOf) */
const engineRoller = (replicate: number): DraftRoller => {
  const rng = makeRng(rootSeedOf(0, 0, replicate))
  return { below: (n, ...keys) => rollBelow(rng, n, 'draft', ...keys), d100: (...keys) => roll100(rng, 'draft', ...keys) }
}
/** another stream altogether — a caller's own dice (the kingdom's run rolls on its own cup) */
const otherRoller = (salt: number): DraftRoller => {
  const of = (keys: number[]) => parseInt(createHash('sha256').update(JSON.stringify([salt, ...keys])).digest('hex').slice(0, 8), 16)
  return { below: (n, ...keys) => of([n, ...keys]) % n, d100: (...keys) => (of([100, ...keys]) % 100) + 1 }
}
/** the same hero's base told nothing of its own badges: the roll as it was before this item */
const asBefore = (id: string): DraftBase => { const b = baseOfRow(id), bare = ((stat: string) => b(stat)) as DraftBase & { fielded?: (stat: string) => number }; bare.fielded = b.fielded!; return bare }
const BERSERKER = 'hero.base.warrior-barbarian', FEY = 'hero.base.ranger-nature'
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)

describe('a hero\'s own badges are left out of its gift roll', () => {
  it('the heroes\' rows carry badges of their own, and three of those are badges the gift roll gives: Huge (the Berserker), Frail (the Forest Fey, the Crimson Sorceress), Mystic (the Ancient Elf)', () => {
    expect(UNITS[BERSERKER]!.name).toBe('Mountain Berserker'); expect(UNITS[FEY]!.name).toBe('Forest Fey'); expect(UNITS['hero.base.mage-sexy']!.name).toBe('Crimson Sorceress'); expect(UNITS['hero.base.ranger-ranger']!.name).toBe('Ancient Elf')
    expect(ownOf(BERSERKER)).toContain('badge.huge'); expect(ownOf(FEY)).toContain('badge.frail')
    const reach = Object.fromEntries(POOL.map((id) => [id, ownOf(id).filter((b) => GIFTS.includes(b))]).filter(([, own]) => (own as string[]).length))
    expect(reach).toEqual({ 'hero.base.warrior-barbarian': ['badge.huge'], 'hero.base.mage-sexy': ['badge.frail'], 'hero.base.ranger-nature': ['badge.frail'], 'hero.base.ranger-ranger': ['badge.mystic'] })
    // the engine's own base says them (the played run's base says the same of its hero: the kingdom's test)
    for (const id of POOL) expect(baseOfRow(id).own, id).toEqual(ownOf(id))
  })

  it('across replicates 0-199 no drafted hero is rolled a badge its own row already carries — and no offered hero is, taken or not, at any draft', () => {
    let drafted = 0, offered = 0
    for (let replicate = 0; replicate < 200; replicate++) {
      const party = openingHeroesOf(replicate, 6), roller = engineRoller(replicate)
      for (const h of party) { drafted++
        for (const b of h.badges) expect(ownOf(h.id).includes(b), `replicate ${replicate}: ${h.id} was rolled ${b}, which its row has`).toBe(false) }
      // every hand as it was rolled, the heroes not taken too: the engine's own procedure on its own stream
      party.forEach((h, ordinal) => {
        if (ordinal === 0) return
        const carried = party.slice(0, ordinal).flatMap((p) => [...p.badges])
        const hand = draftHandOf(roller, h.offered.map(baseOfRow), ordinal, carried)
        h.offered.forEach((id, j) => { offered++
          for (const b of hand[j]!.badges) expect(ownOf(id).includes(b), `replicate ${replicate}, draft ${ordinal + 1}: ${id} was offered with ${b}, which its row has`).toBe(false) })
        // (and the hand rolled here is the hand the draft took from)
        expect(hand[h.offered.indexOf(h.id)]!.badges, `replicate ${replicate}, draft ${ordinal + 1}`).toEqual([...h.badges])
      })
    }
    expect(drafted).toBe(1200); expect(offered).toBe(200 * 5 * OPENING.offer)
  })

  it('the Berserker never rolls Huge and the Forest Fey never rolls Frail — as the first hero or at any later draft, on any dice; before this they did', () => {
    let huge = 0, frail = 0, hugeBefore = 0, frailBefore = 0, rolls = 0
    for (let salt = 0; salt < 3000; salt++) {
      const roller = otherRoller(salt)
      const first = firstHeroDraftOf(roller, baseOfRow(BERSERKER)); rolls++
      if (first.badges.includes('badge.huge')) huge++
      if (firstHeroDraftOf(roller, asBefore(BERSERKER)).badges.includes('badge.huge')) hugeBefore++
      for (const ordinal of [1, 3, 5]) {
        const hand = draftHandOf(roller, [baseOfRow(BERSERKER), baseOfRow(FEY), baseOfRow('hero.base.mage-sexy')], ordinal, []), was = draftHandOf(roller, [asBefore(BERSERKER), asBefore(FEY), asBefore('hero.base.mage-sexy')], ordinal, [])
        rolls += 3
        if (hand[0]!.badges.includes('badge.huge')) huge++; if (hand[1]!.badges.includes('badge.frail') || hand[2]!.badges.includes('badge.frail')) frail++
        if (was[0]!.badges.includes('badge.huge')) hugeBefore++; if (was[1]!.badges.includes('badge.frail') || was[2]!.badges.includes('badge.frail')) frailBefore++
      }
    }
    expect(hugeBefore, 'before: the Berserker was rolled Huge').toBeGreaterThan(50); expect(frailBefore, 'before: the Fey or the Crimson Sorceress was rolled Frail').toBeGreaterThan(50)
    expect(huge, `the Berserker rolled Huge, of ${rolls} rolls`).toBe(0); expect(frail, 'the Forest Fey or the Crimson Sorceress rolled Frail').toBe(0)
  })

  it('a hero with no badge of its own among the gifts rolls exactly as before; and a hero with one rolls as before wherever the roll did not land on it', () => {
    let same = 0, moved = 0, kept = 0
    for (let salt = 0; salt < 600; salt++) {
      const roller = otherRoller(1000 + salt)
      for (const id of POOL) {
        const now = firstHeroDraftOf(roller, baseOfRow(id)), was = firstHeroDraftOf(roller, asBefore(id))
        const doubled = was.badges.some((b) => ownOf(id).includes(b))
        if (!ownOf(id).some((b) => GIFTS.includes(b))) { expect(now, `${id}, dice ${salt}: none of its own badges is a gift`).toEqual(was); same++ }
        else if (!doubled) { expect(now, `${id}, dice ${salt}: the roll did not land on its own badge`).toEqual(was); kept++ }
        else { moved++
          // only the doubled badge is given anew: the stat points are the same, the other badges the same, and the new one is a badge it did not have
          expect(now.rolls).toEqual(was.rolls); expect(now.badges.length, `${id}: as many badges as before`).toBe(was.badges.length)
          was.badges.forEach((b, i) => { if (!ownOf(id).includes(b) && !now.badges.slice(0, i).some((x, k) => x !== was.badges[k])) expect(now.badges[i], `${id}: a badge before the doubled one is the same`).toBe(b) })
          for (const b of now.badges) expect(ownOf(id).includes(b)).toBe(false)
          expect(new Set(now.badges).size, 'and no badge twice').toBe(now.badges.length) }
      }
      // a later draft's hand: the same
      const three = [POOL[salt % POOL.length]!, POOL[(salt * 7 + 3) % POOL.length]!, POOL[(salt * 13 + 11) % POOL.length]!]
      if (three.every((id) => !ownOf(id).some((b) => GIFTS.includes(b)))) { expect(draftHandOf(roller, three.map(baseOfRow), 1 + (salt % 5), []), three.join(' ')).toEqual(draftHandOf(roller, three.map(asBefore), 1 + (salt % 5), [])); same++ }
    }
    expect(same).toBeGreaterThan(10000); expect(kept).toBeGreaterThan(500); expect(moved, 'rolls that landed on an own badge and were made again').toBeGreaterThan(20)
  })

  it('the badge given instead is drawn by rarity among the others of its kind: the first hero\'s is still a favourable one, and each is given about as often as its weight says', () => {
    const favourable = (OPENING.crucible.badges.favourable as { id: string; rarity: string }[]), weight = (b: { rarity: string }) => (OPENING.crucible.rarityWeight as Record<string, number>)[b.rarity] ?? OPENING.crucible.rarityDefault
    const got: Record<string, number> = {}
    let n = 0
    for (let salt = 0; salt < 60000 && n < 1500; salt++) {
      const roller = otherRoller(50000 + salt)
      const was = firstHeroDraftOf(roller, asBefore(BERSERKER)); if (was.badges[1] !== 'badge.huge') continue
      const now = firstHeroDraftOf(roller, baseOfRow(BERSERKER)); n++
      expect(now.badges[0]).toBe('badge.leadership'); expect(favourable.some((b) => b.id === now.badges[1]), now.badges[1]).toBe(true)
      got[now.badges[1]!] = (got[now.badges[1]!] ?? 0) + 1
    }
    expect(n).toBeGreaterThan(400)
    const others = favourable.filter((b) => b.id !== 'badge.huge'), total = others.reduce((s, b) => s + weight(b), 0)
    expect(got['badge.huge']).toBeUndefined()
    // every other favourable badge is among them, each within a wide band of its share by weight
    for (const b of others) { const share = weight(b) / total, seen = (got[b.id] ?? 0) / n
      expect(seen, `${b.id}: ${(seen * 100).toFixed(1)}% of the badges given instead, ${(share * 100).toFixed(1)}% by weight`).toBeGreaterThan(share * .4); expect(seen).toBeLessThan(share * 1.9 + .01) }
  })

  it('how many of replicates 0-199 changed: the drafts frozen before this item, against the drafts now', () => {
    const before = JSON.parse(readFileSync(new URL('./fixtures/gift-roll-own-badges-before.json', import.meta.url), 'utf8')) as { note: string; drafted: number; hashes: string[]; doubled: number[] }
    expect(before.hashes).toHaveLength(200)
    const changed: number[] = []
    for (let replicate = 0; replicate < 200; replicate++) if (hash(openingHeroesOf(replicate, before.drafted)) !== before.hashes[replicate]) changed.push(replicate)
    // every replicate in which a drafted hero HELD a doubled badge changed; and the others that changed are those in which an
    // offered hero not taken held one (its score moved, or which badge the next hero's first could be)
    for (const r of before.doubled) expect(changed, `replicate ${r}: a drafted hero held a badge its row has`).toContain(r)
    expect(changed).toEqual(CHANGED)
    expect(before.doubled).toEqual(DOUBLED)
  })
})
/** replicates 0-199 whose drafted party of six is not what it was (frozen 2026-10-05 before the change: tools/capture-gift-roll-own-badges.mts) */
const CHANGED: number[] = [9, 11, 23, 35, 41, 43, 54, 58, 69, 77, 86, 97, 99, 106, 113, 115, 116, 119, 120, 133, 135, 138, 185, 189, 194]
/** of those, the replicates in which a hero the draft TOOK held a badge its own row has */
const DOUBLED: number[] = [11, 23, 54, 69, 86, 106, 113, 115, 116, 189, 194]
