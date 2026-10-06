// fix.opening-draft-one-rule (2026-10-04) — found landing kingdom.opening-draft-modifiers (2026-10-03, kingdom
// SWITCHES.md openingDraftRuleKingdomSide): the opening draft's rule lived twice. The engine (src/content/
// opening-party.ts, fix.opening-draft) exported only openingHeroesOf(replicate, count) — the whole draft at once —
// and kept private the two things a played run needs: the first hero's bonuses for the hero the PLAYER chose, and
// each of three offered heroes as the Crucible rolls it. So the kingdom ran the same procedure a second time
// (kingdom/src/core/draft-modifiers.ts), held to the engine's by a parity test.
//
// Rulings (DECISIONS.md): 2026-09-28 'no Health minimum … the first hero gets Leadership and a random positive badge;
// the draft pick is weighted' — "You get the leadership badge. You get a random positive badge. 25% chance of another
// positive badge. +2 health. One stat point from the Crucible's randomness, a 30% chance of another stat point." — and
// 2026-10-03 'the opening run, audited': "the first hero is chosen from 3".
//
// One rule, one home: the engine exports the first hero's bonuses for a chosen hero, and a hand's rolls for given
// heroes and a given stream; its own draft is those same functions on its own stream; the kingdom calls them through
// its one door and holds no procedure of its own. What openingHeroesOf returns does not move.
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as opening from '../src/content/opening-party.js'
import { OPENING_POSITIONS, draftScoreOf, openingHeroesOf, openingPartyOf } from '../src/content/opening-party.js'
import { UNITS } from '../src/content/index.js'
import { makeRng, roll100, rollBelow, rootSeedOf } from '../src/core/rng.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }

type Rolled = { stat: string; amount: number }
type Roller = { below(n: number, ...keys: number[]): number; d100(...keys: number[]): number }
type BaseOf = (stat: string) => number
type Draft = { badges: readonly string[]; rolls: readonly Rolled[]; mods: { stats?: readonly { stat: string; add: number; source: string }[] }; unfielded: readonly Rolled[] }
/** The two exported functions, read loosely so this file compiles before they exist. */
const firstHeroDraftOf = (opening as unknown as { firstHeroDraftOf?: (roller: Roller, baseOf: BaseOf) => Draft }).firstHeroDraftOf
const draftHandOf = (opening as unknown as { draftHandOf?: (roller: Roller, bases: readonly BaseOf[], ordinal: number, carried: readonly string[]) => Draft[] }).draftHandOf

const frozen = JSON.parse(readFileSync(new URL('./fixtures/opening-draft-one-rule.json', import.meta.url), 'utf8')) as {
  drafted: number; position: number; replicates: { replicate: number; heroes: string; party: string }[]; whole: { replicate: number; heroes: unknown }[]
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const STAT_OF = OPENING.crucible.statOf as Record<string, string>
// Law 10, 2026-10-05 — content.hero-origin-badges (DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …': "3, yes."; SWITCHES.md originBadgeDraftFloor): this read
//   const baseOfRow = (id: string): BaseOf => (stat) => ((UNITS[id] as unknown as Record<string, number | undefined>)[STAT_OF[stat] ?? stat]) ?? 0
// - this file's own copy of what the engine's draft reads, the row's number. The engine's base also says the hero as fielded
// now (a rolled loss is held at its floor against that too), so the tests below hand the two functions the engine's own base
// (exported for the played run's draft) - and hold here that its number is still the row's own.
/** A row's own value of a stat in the Crucible's word, and the hero as fielded — what the engine's own draft reads. */
const baseOfRow = (id: string): BaseOf => (opening as unknown as { baseOfRow: (id: string) => BaseOf }).baseOfRow(id)
const rowNumber = (id: string, stat: string) => ((UNITS[id] as unknown as Record<string, number | undefined>)[STAT_OF[stat] ?? stat]) ?? 0
/** The engine's own draft stream for a replicate, as a roller. */
const engineRoller = (replicate: number): Roller => {
  const rng = makeRng(rootSeedOf(0, 0, replicate))
  return { below: (n, ...keys) => rollBelow(rng, n, 'draft', ...keys), d100: (...keys) => roll100(rng, 'draft', ...keys) }
}
/** Another stream altogether — a caller's own dice (the kingdom's run rolls on its own cup): deterministic in what the roll is. */
const otherRoller = (salt: number): Roller => {
  const of = (keys: number[]) => parseInt(createHash('sha256').update(JSON.stringify([salt, ...keys])).digest('hex').slice(0, 8), 16)
  return { below: (n, ...keys) => of([n, ...keys]) % n, d100: (...keys) => (of([100, ...keys]) % 100) + 1 }
}
const POOL = (OPENING.pool as string[]).filter((id) => UNITS[id])

describe('what openingHeroesOf returns did not move', () => {
  it('every replicate\'s drafted party is byte for byte what it was before this item — rows, badges, rolls, mods, hands and scores', () => {
    expect(frozen.replicates).toHaveLength(100)
    // Law 10, 2026-10-05 — content.hero-origin-badges (DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …': "3, yes."; SWITCHES.md originBadgeDraftFloor): this loop read
    //   expect(hash(openingHeroesOf(row.replicate, frozen.drafted)), …).toBe(row.heroes)
    //   expect(hash(openingPartyOf(frozen.position, row.replicate)), …).toBe(row.party)
    // for every one of the hundred. A rolled LOSS is now held at its floor against the hero as fielded: the Forest Fey, fielded
    // at Health 2 with Frail on her row, loses 1 Health where she lost 2 (and stood at 0, which the engine refused to field).
    // Two of the hundred replicates offer her with that loss - 12 (offered at drafts 5 and 6, not taken: one score moves) and 17
    // (taken at draft 5: her roll, her mod, and so the party). Those two are held at what they are now; the other 98 are byte
    // for byte what the fixture froze, and nothing else may move.
    const MOVED: Record<number, { heroes: string; party?: string }> = {
      12: { heroes: '77458f86e4275914a36f332930afdfeb029e5eaf0ed020131e3ae535223dd246' },
      17: { heroes: 'ba7051d51117002da3c96f61748c6f5864bc6e4ac98cb25d735ea2881e3f222a', party: '87ed70c171657e3e1d866ebfa52adfd6ce78a4014909dfb01acf67ba3c8ceac0' },
    }
    // Law 10, 2026-10-05 — kingdom.gift-roll-leaves-out-own-badges (DECISIONS.md 2026-10-05 'a prone unit only stands; …; no gift
    // doubles a hero's own badge; …', asked whether a hero's own badges should be left out of its gift roll: "7, yes."; SWITCHES.md
    // giftRollOwnAgain). Until now the loop below held the other 98 at what the fixture froze, and the three whole replicates read
    //   for (const w of frozen.whole) expect(JSON.parse(JSON.stringify(openingHeroesOf(w.replicate, frozen.drafted))), …).toEqual(w.heroes)
    // A roll that lands on a badge the hero's own row already has is now made again, so an offered hero that HELD such a badge
    // (the Mountain Berserker's Huge, the Ancient Elf's Mystic, the Forest Fey's or the Crimson Sorceress's Frail) is offered
    // another — and its score, and so sometimes who is taken, moves. Thirteen more of the hundred replicates hold such an
    // offer; each is held at what it is now, and in each one of those four heroes is on offer. In six of them the party of
    // six itself is another (a taken hero's badge, or who was taken); in seven only an untaken offer's score. The other 85 are
    // byte for byte what the fixture froze. (All 200 of replicates 0-199: test/gift-roll-leaves-out-own-badges.test.ts — 25 moved.)
    const OWN_BADGE: Record<number, { heroes: string; party?: string }> = {
      9: { heroes: '6a9fe6b5b3a5ea4be47e4829ae8597bd9300aa25467f2d3682d66c7a4a389e75' },
      11: { heroes: '45fd851578b836585cdc781a33ce1f5d70f8c9050c10bc83841065d3e2e14042', party: '8a09c6ee61a64eed0c32008b599a4316c58ea5088fc2be7f387247d78ee44373' },
      23: { heroes: '5e0a431cb5a6779c462136d52d65401ebea96a064976c0e97c4bd28adbbf1761', party: '501c8bd569a021e5b2e423a8f088eb3fa9de174cf71a2fbf026c4b85ee332a6f' },
      35: { heroes: '932762d6cbd43c1a0e04963db079cb5e1b2b8d8a850b7822a1e96a60098d0754' },
      41: { heroes: '89dd8a31d6135e868321aded0a09ca70e17f32fadc308efd02b2233ff8b09ebe', party: '626873d031c83982c974ed69523508cf69394778d385182ece1f5ad46ae337f2' },
      43: { heroes: 'e35583e2bb6e59d68ea7b9a1fd8cfb4d010399900b2fab08f192e2d9f755e13f' },
      54: { heroes: '33e2223c28bb58751af7c78bdb5bd2d52dd509d46bceb490a066bb4d639c9cd7', party: '4580f9151e5a717045745d373b5664e9819915379e338a08da0f5085ba971820' },
      58: { heroes: 'c2f23ba02bb1996bc41c2bc271a2538971b66eafd186ce88730d0ce88ae1db1d' },
      69: { heroes: '0df33e50403f543b2f168bb79321cd824a7bb73e164a108379ca0e4c79da9ee4', party: 'ce4b6eed29b8c92801fb9d4553138fe2606e912147e6fcad5c3701780a4d3f14' },
      77: { heroes: '3ba7980688fea5c20be67878ba18ec43ec8fc20c4b0c4d4726b42c292754bb5a' },
      86: { heroes: 'd5c3a0b887074b2c6a821877c54a9b7a3a73c028910b6c262cd99f260ac3fe79', party: 'a2496e175e65a172368125049ed95c1397e99b8972bafc5d25f5142899a03bee' },
      97: { heroes: '95e7170135f8702a07f444633672925fe353a2063998165c8d34d5286b829c93' },
      99: { heroes: '22e9795e0c1dcd4a5c7571f08933d770e113d89dd886ece4d668a7d8d17c1fe4' },
    }
    const GIFT_OF_OWN = ['hero.base.warrior-barbarian', 'hero.base.ranger-ranger', 'hero.base.ranger-nature', 'hero.base.mage-sexy']
    expect(Object.keys(MOVED).filter((r) => r in OWN_BADGE)).toEqual([])
    for (const row of frozen.replicates) {
      const moved = MOVED[row.replicate], own = OWN_BADGE[row.replicate], now = moved ?? own
      const heroes = openingHeroesOf(row.replicate, frozen.drafted)
      expect(hash(heroes), `replicate ${row.replicate}: the drafted heroes`).toBe(now?.heroes ?? row.heroes)
      expect(hash(openingPartyOf(frozen.position, row.replicate)), `replicate ${row.replicate}: the party fielded at position ${frozen.position}`).toBe(now?.party ?? row.party)
      if (now) expect(now.heroes, `replicate ${row.replicate}: it did move`).not.toBe(row.heroes)
      if (moved) expect(heroes.some((h) => h.offered.includes('hero.base.ranger-nature')), `replicate ${row.replicate}: the Forest Fey is offered`).toBe(true)
      if (own) expect(heroes.some((h) => h.offered.some((id) => GIFT_OF_OWN.includes(id))), `replicate ${row.replicate}: a hero whose own badge is one the roll gives is on offer`).toBe(true)
      // and no hero of any replicate carries a rolled badge its own row has
      for (const h of heroes) for (const b of h.badges) expect((UNITS[h.id]!.badges ?? []).includes(b), `replicate ${row.replicate}: ${h.id} rolled ${b}`).toBe(false)
    }
    // replicate 17, said out: she is taken, and her one Health loss is 1 - every other roll of the party is a whole step
    const fey = openingHeroesOf(17, frozen.drafted).find((h) => h.id === 'hero.base.ranger-nature')!
    expect(fey.rolls.filter((r) => r.stat === 'health')).toEqual([{ stat: 'health', amount: -1 }])
    // the three whole replicates: 0 and 1 are what the fixture froze. Replicate 11, said out: its first five heroes are what the
    // fixture froze; at the sixth draft the Mountain Berserker was offered with Frail and Huge - Huge is on its own row - and
    // was taken on Huge's score (4.9); offered now with another badge in Huge's place it scores 0.4, and the Iron Dwarf beside it
    // (1.5, as before) is taken
    for (const w of frozen.whole) {
      const whole = JSON.parse(JSON.stringify(openingHeroesOf(w.replicate, frozen.drafted))) as { id: string; badges: string[]; offered: string[]; scores: number[] }[], was = w.heroes as typeof whole
      if (w.replicate !== 11) { expect(whole, `replicate ${w.replicate}, whole`).toEqual(was); continue }
      expect(whole.slice(0, 5), 'replicate 11: its first five heroes').toEqual(was.slice(0, 5))
      expect([was[5]!.id, was[5]!.badges, was[5]!.scores]).toEqual(['hero.base.warrior-barbarian', ['badge.frail', 'badge.huge'], [1.5, 4.9, 1]])
      expect(whole[5]!.offered).toEqual(was[5]!.offered)
      expect([whole[5]!.id, whole[5]!.badges]).toEqual(['hero.base.warrior-iron', ['badge.spiritual', 'badge.many-pockets']])
      expect(whole[5]!.scores[0]).toBe(1.5); expect(whole[5]!.scores[2]).toBe(1); expect(whole[5]!.scores[1]).toBeCloseTo(0.4, 9)
    }
    expect(frozen.position).toBe(OPENING_POSITIONS[OPENING_POSITIONS.length - 1]!.position)
  })
})

describe('the engine exports what a played run needs', () => {
  it('the first hero\'s bonuses for a chosen hero, and a hand\'s rolls for given heroes and a given stream', () => {
    expect(typeof firstHeroDraftOf).toBe('function')
    expect(typeof draftHandOf).toBe('function')
  })

  it('the engine\'s own draft IS those functions on its own stream: every badge, point, mod and score, sixty replicates', () => {
    for (const id of POOL) for (const stat of ['health', 'strength', 'dodge', 'accuracy']) expect(baseOfRow(id)(stat), `${id} ${stat}: the base's number is the row's`).toBe(rowNumber(id, stat))
    for (let replicate = 1; replicate <= 60; replicate++) {
      const roller = engineRoller(replicate)
      const engine = openingHeroesOf(replicate, 6)
      const first = firstHeroDraftOf!(roller, baseOfRow(engine[0]!.id))
      expect({ badges: first.badges, rolls: first.rolls, mods: first.mods, unfielded: first.unfielded }, `replicate ${replicate}: the first hero`)
        .toEqual({ badges: engine[0]!.badges, rolls: engine[0]!.rolls, mods: engine[0]!.mods, unfielded: engine[0]!.unfielded })
      for (let ordinal = 1; ordinal < engine.length; ordinal++) {
        const taken = engine[ordinal]!, party = engine.slice(0, ordinal)
        const hand = draftHandOf!(roller, taken.offered.map(baseOfRow), ordinal, party.flatMap((h) => h.badges))
        expect(hand).toHaveLength(OPENING.offer)
        expect(hand.map((d, j) => draftScoreOf(taken.offered[j]!, d.rolls, d.badges, party.map((h) => h.id))), `replicate ${replicate}, draft ${ordinal + 1}: every offer's score`).toEqual(taken.scores)
        const mine = hand[taken.offered.indexOf(taken.id)]!
        expect({ badges: mine.badges, rolls: mine.rolls, mods: mine.mods, unfielded: mine.unfielded }, `replicate ${replicate}, draft ${ordinal + 1}: the one taken`)
          .toEqual({ badges: taken.badges, rolls: taken.rolls, mods: taken.mods, unfielded: taken.unfielded })
      }
    }
  })

  it('the first hero, for ANY hero the player chooses, on a caller\'s own stream: Leadership, a positive badge (and the chance of another), +2 Health, a Crucible point (and the chance of another)', () => {
    const F = OPENING.firstHero, favourable = new Set((OPENING.crucible.badges.favourable as { id: string }[]).map((b) => b.id))
    let twoBadges = 0, twoPoints = 0
    for (let salt = 0; salt < 120; salt++) {
      const id = POOL[salt % POOL.length]!
      const d = firstHeroDraftOf!(otherRoller(salt), baseOfRow(id))
      expect(d.badges.slice(0, F.badges.length), `${id}: the rule's own badges first`).toEqual(F.badges)
      const positives = d.badges.slice(F.badges.length)
      expect(positives.length === F.positiveBadges || positives.length === F.positiveBadges + 1, `${id}: ${positives.length} positive badges`).toBe(true)
      expect(positives.every((b) => favourable.has(b)), `${id}: every extra badge is a favourable one`).toBe(true)
      expect(new Set(d.badges).size).toBe(d.badges.length)
      expect(d.mods.stats![0], `${id}: the +Health first`).toEqual({ stat: 'maxHp', add: F.health, source: F.healthSource })
      expect(d.rolls.length <= F.statPoints + 1).toBe(true)
      expect(d.rolls.every((r) => r.amount > 0), `${id}: the first hero only gains`).toBe(true)
      if (positives.length > F.positiveBadges) twoBadges++
      if (d.rolls.length > F.statPoints) twoPoints++
      // the same dice, the same hero: the same bonuses
      expect(firstHeroDraftOf!(otherRoller(salt), baseOfRow(id))).toEqual(d)
    }
    // the two chances are live on a caller's stream: sometimes, not always, not never (25% and 30% over 120)
    expect(twoBadges).toBeGreaterThan(0); expect(twoBadges).toBeLessThan(120)
    expect(twoPoints).toBeGreaterThan(0); expect(twoPoints).toBeLessThan(120)
  })

  it('a hand on a caller\'s own stream: one roll set per offered hero, in offer order; a hero\'s first badge is never one the party carries or an earlier hero\'s first', () => {
    for (let salt = 0; salt < 60; salt++) {
      const ids = [POOL[salt % POOL.length]!, POOL[(salt + 7) % POOL.length]!, POOL[(salt + 13) % POOL.length]!]
      const carried = ['badge.leadership', (OPENING.crucible.badges.favourable as { id: string }[])[salt % 5]!.id]
      const hand = draftHandOf!(otherRoller(salt), ids.map(baseOfRow), 1 + (salt % 5), carried)
      expect(hand).toHaveLength(3)
      const firsts = hand.map((d) => d.badges[0]).filter((b): b is string => b !== undefined)
      expect(new Set(firsts).size, 'first badges unique across the hand').toBe(firsts.length)
      for (const b of firsts) expect(carried, 'a first badge the party does not carry').not.toContain(b)
      for (const d of hand) {
        expect(d.badges.length).toBeLessThanOrEqual(3)
        expect(new Set(d.rolls.map((r) => r.stat)).size, 'a stat is never rolled twice').toBe(d.rolls.length)
        expect((d.mods.stats ?? []).length + d.unfielded.length, 'every roll is a mod or named unfielded').toBe(d.rolls.length)
      }
      expect(draftHandOf!(otherRoller(salt), ids.map(baseOfRow), 1 + (salt % 5), carried)).toEqual(hand)
    }
  })

  it('what the base is, is the caller\'s: a point is held at the stat\'s floor against the base the caller hands in', () => {
    // a base of 0 everywhere and a base far above every floor give different rolled amounts only where a floor bites — never different stats
    const low = draftHandOf!(otherRoller(3), [() => 0, () => 0, () => 0], 2, [])
    const high = draftHandOf!(otherRoller(3), [() => 50, () => 50, () => 50], 2, [])
    expect(low.map((d) => d.badges)).toEqual(high.map((d) => d.badges))
    for (const d of high) for (const r of d.rolls) expect(r.amount).not.toBe(0)
    for (const d of low) for (const r of d.rolls) expect(r.amount).toBeGreaterThan(0)   // nothing below its floor from a base of 0
  })
})

describe('the kingdom holds no rolling procedure of its own', () => {
  const kingdom = (path: string) => readFileSync(fileURLToPath(new URL('../../kingdom/' + path, import.meta.url)), 'utf8')
  const code = (text: string) => text.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')

  it('kingdom/src/engine.ts, the one door, hands out the engine\'s two functions', () => {
    const door = code(kingdom('src/engine.ts'))
    expect(door).toMatch(/export \{[^}]*\bfirstHeroDraftOf\b[^}]*\} from '..\/..\/engine\/src\/content\/opening-party\.js'/)
    expect(door).toMatch(/export \{[^}]*\bdraftHandOf\b[^}]*\} from '..\/..\/engine\/src\/content\/opening-party\.js'/)
  })

  it('kingdom/src/core/draft-modifiers.ts calls them, and rolls nothing itself', () => {
    const src = code(kingdom('src/core/draft-modifiers.ts'))
    expect(src).toMatch(/import \{[^}]*\bfirstHeroDraftOf\b[^}]*\} from '..\/engine\.js'/)
    expect(src).toMatch(/import \{[^}]*\bdraftHandOf\b[^}]*\} from '..\/engine\.js'/)
    expect(src).toMatch(/firstHeroDraftOf\(/)
    expect(src).toMatch(/draftHandOf\(/)
    // no dice thrown here, and none of the Crucible's tables read here
    expect(src).not.toMatch(/\.below\(|\.d100\(/)
    expect(src).not.toMatch(/statPool|modTypes|badgeCount|rarityWeight|favourablePercent|repeatAttempts|anotherBadgePercent|anotherPointPercent|statStep|statFloor/)
    expect(src).not.toMatch(/from '..\/content\/crucible\.js'/)
  })
})
