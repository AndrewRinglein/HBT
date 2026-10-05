// kingdom.rewards-hell-tcg-rows-his — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'every dead line on his items is a feature
// that is needed; his items stay in rewards; the six Hell-TCG items are his': asked whether the six Hell-TCG items that came
// over unchanged count as his — "1. Yes" — and, asked whether that meant the six are his, "So all of these are in.").
//
// Expect: "The six ids are on the list and a test names any that is not an item in the game; across 200 seeded draws the cards
// dealt are rows on the list or made of listed rows, and one of the six (or a row made of one) appears among them where its
// tier is dealt; the three unknown relics are never dealt; the landing note gives the pool's size and its count per class."
//
// The six are rows of the list now (src/content/authored-items.ts), by ruling — no switch. The three relics with no known
// author were not asked about and stay off, under the switch that is left: kingdom SWITCHES.md rewards.unknownAuthorRowsOffered
// (the one switch rewards.hellTcgRowsOffered covered both groups and is split).
import { describe, it, expect } from 'vitest'
import { AUTHORED_ITEMS, AUTHORSHIP_UNDECIDED } from '../src/content/authored-items.js'
import { ITEMS, itemOf, type ItemRow } from '../src/content/items.js'
import { REWARDS, REWARD_ODDS, REWARD_DRAW, rewardPoolOf } from '../src/content/rewards.js'
import { SWITCHES } from '../src/content/switches.js'
import { resolveRewardDraw } from '../src/core/rewards.js'
import { rewardDrawOf } from '../src/core/charter.js'
import { makeNewCampaign } from '../src/core/opening.js'
import type { CampaignState } from '../src/core/campaign.js'

/** The six the ruling names: Shadow Dagger, Twin Talon Bow, Pharaoh's Gauntlets, Silkweave Armor, Scorpion Carapace, Wraithform Cloak. */
const SIX = ['item.shadow-dagger', 'item.twin-talon-bow', 'item.pharaohs-gauntlets', 'item.silkweave-armor', 'item.scorpion-carapace', 'item.wraithform-cloak']
/** The three relics with no known author, not asked about: Tracker's Eyeglass, Censer of the High Choir, Gravedigger's Lantern. */
const RELICS = ['item.trackers-eyeglass', 'item.censer-of-the-high-choir', 'item.gravediggers-lantern']

const LISTED = new Set(AUTHORED_ITEMS.map((r) => r.id))
const madeOfHis = (r: ItemRow): boolean => r.base !== null && LISTED.has(r.base) && r.enchant !== null && LISTED.has(r.enchant)
const his = (r: ItemRow): boolean => LISTED.has(r.id) || madeOfHis(r)
const ofShape = (r: ItemRow): boolean => REWARD_ODDS.some((o) => o.itemClass === r.itemClass && o.tier === r.tier) && (r.waystationBand === null || SWITCHES.rewardsIncludeWaystation)
/** One of the six, or a row made of one of them (its base) carrying one of his attributes. */
const ofTheSix = (r: ItemRow): boolean => SIX.includes(r.id) || (r.base !== null && SIX.includes(r.base) && madeOfHis(r))
const runDrawing = (seed: number, size: number): CampaignState => {
  const c = makeNewCampaign(seed)
  c.unlocks = ['unlock.spoils.1', 'unlock.spoils.2'].slice(0, size - REWARD_DRAW)
  expect(rewardDrawOf(c)).toBe(size)
  return c
}

describe('kingdom.rewards-hell-tcg-rows-his — the list', () => {
  it('the six Hell-TCG items are on the list, each with a why line that says it was ruled his — and every one is an item in the game', () => {
    const notInGame = SIX.filter((id) => !ITEMS.some((r) => r.id === id))
    expect(notInGame, `named by the ruling and not an item in the game: ${notInGame.join(', ')}`).toEqual([])
    for (const id of SIX) {
      const row = AUTHORED_ITEMS.find((r) => r.id === id)
      expect(row, `${id} (${itemOf(id).name}) is on src/content/authored-items.ts`).toBeTruthy()
      expect(row!.why, `${id}: its why line`).toContain('from Hell-TCG as it was; ruled his 2026-10-04')
      expect(AUTHORSHIP_UNDECIDED.some((r) => r.id === id), `${id} is no longer among the rows waiting for his word`).toBe(false)
    }
    expect(LISTED.size, 'no id is listed twice').toBe(AUTHORED_ITEMS.length)
  })

  it('the three relics with no known author were not asked about: they stay off the list, kept apart, under the switch that is left — off', () => {
    expect(AUTHORSHIP_UNDECIDED.map((r) => r.id).sort()).toEqual([...RELICS].sort())
    for (const id of RELICS) {
      expect(ITEMS.some((r) => r.id === id), `${id} is an item`).toBe(true)
      expect(LISTED.has(id), `${id} is not on the list`).toBe(false)
      expect(itemOf(id).itemClass).toBe('relic')
    }
    const switches = SWITCHES as unknown as Record<string, unknown>
    expect(switches['rewardsUnknownAuthorRowsOffered'], 'kingdom SWITCHES.md rewards.unknownAuthorRowsOffered — the relics\' switch, off').toBe(false)
    expect('rewardsHellTcgRowsOffered' in switches, 'the one switch that covered both groups is split: the six are rows of the list, by ruling').toBe(false)
  })
})

describe('kingdom.rewards-hell-tcg-rows-his — the pool and the draw', () => {
  it('the pool deals the six at the tiers it deals, and a row made of one of them carrying one of his attributes; none of the three relics', () => {
    const sixInPool = REWARDS.filter((r) => SIX.includes(r.id)).map((r) => r.id)
    expect(sixInPool, 'those of the six that are of a class and tier the odds table deals').toEqual(SIX.filter((id) => ofShape(itemOf(id))).sort())
    expect(sixInPool.length).toBeGreaterThan(0)
    const madeOfSix = ITEMS.filter((r) => ofShape(r) && !SIX.includes(r.id) && ofTheSix(r)).map((r) => r.id).sort()
    expect(madeOfSix.length, 'rows made of one of the six carrying one of his attributes').toBeGreaterThan(0)
    for (const id of madeOfSix) expect(REWARDS.some((r) => r.id === id), `${id} (base ${itemOf(id).base}, attribute ${itemOf(id).enchant}) is in the pool`).toBe(true)
    // the pool is still exactly his rows of the odds table's shape
    expect(REWARDS.map((r) => r.id)).toEqual(ITEMS.filter((r) => ofShape(r) && his(r)).map((r) => r.id).sort())
    for (const id of RELICS) expect(REWARDS.some((r) => r.id === id || itemOf(r.id).base === id), `${id} is not dealt, nor a row made of it`).toBe(false)
  })

  it('the other side of the switch that is left brings in the relics and nothing else', () => {
    const more = rewardPoolOf({ undecided: true, derived: true }).map((r) => r.id).filter((id) => !REWARDS.some((r) => r.id === id))
    expect(more.length).toBeGreaterThan(0)
    for (const id of more) expect(RELICS.includes(id) || RELICS.includes(itemOf(id).base ?? ''), `${id} is one of the three relics, or made of one`).toBe(true)
  })

  it('across 200 seeded draws at each size of the draw (3, 4, 5) every card is a row on the list or made of listed rows; one of the six, or a row made of one, is dealt; the three relics never are; no draw throws', () => {
    let fromTheSix = 0
    const seenOfSix = new Set<string>()
    for (const size of [REWARD_DRAW, REWARD_DRAW + 1, REWARD_DRAW + 2]) {
      for (let seed = 1; seed <= 200; seed++) {
        const c = runDrawing(seed, size)
        let drawn: string[] = []
        expect(() => { drawn = resolveRewardDraw(c, `engagement.test.${seed}`) }, `seed ${seed}, ${size} cards`).not.toThrow()
        expect(drawn.length).toBe(size)
        expect(new Set(drawn).size).toBe(drawn.length)
        for (const id of drawn) {
          const row = itemOf(id)
          expect(his(row), `seed ${seed}, ${size} cards: ${id} is neither on the list nor made of a listed base (${row.base}) and a listed attribute (${row.enchant})`).toBe(true)
          expect(RELICS.includes(id) || RELICS.includes(row.base ?? ''), `seed ${seed}: ${id} is one of the three relics with no known author`).toBe(false)
          expect(row.tier).toBe(REWARD_ODDS.find((o) => o.itemClass === row.itemClass)!.tier)
          if (ofTheSix(row)) { fromTheSix++; seenOfSix.add(SIX.includes(id) ? id : row.base!) }
        }
      }
    }
    expect(fromTheSix, 'one of the six, or a row made of one, is dealt').toBeGreaterThan(0)
    // each of the six that the draw can reach — by its own id, or as the base of a row in the pool — was dealt
    const reachable = SIX.filter((id) => REWARDS.some((r) => r.id === id || itemOf(r.id).base === id))
    expect([...seenOfSix].sort()).toEqual([...reachable].sort())
  })
})
