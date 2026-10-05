// kingdom.rewards-derived-rows-offered — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'rewards: one of his bases carrying one
// of his attributes is his; the Flaming Longsword stays battle 2's reward': asked "should a row made of one of your bases
// carrying one of your attributes count as yours", and "does the Flaming Longsword stay as battle 2's reward" — "1 yes 2 yes").
//
// Expect: "Across 200 seeded reward draws every card is a row on the list or a row whose base and attribute are both on it;
// armor is dealt; no row with a base or an attribute off the list is dealt; no draw throws; the pool's size is the worker's
// counted number (49 expected - say the number found); the Lumberjack House still offers the Flaming Longsword."
//
// The switch is kingdom SWITCHES.md rewards.derivedRowsOffered, on as the ruled side (src/content/switches.ts); the pool that
// reads it is src/content/rewards.ts (isOnRewardList, rewardPoolOf). The pool's size is not typed here — Andrew's marks move
// rows on and off the list (src/content/authored-items.ts) — it is counted from the list and the items, and said in
// SWITCHES.md and the landing note as counted on the day.
import { describe, it, expect } from 'vitest'
import { AUTHORED_ITEMS } from '../src/content/authored-items.js'
import { ITEMS, itemOf, type ItemRow } from '../src/content/items.js'
import { REWARDS, REWARD_ODDS, REWARD_DRAW, rewardPoolOf, isOnRewardList, isRewardRow } from '../src/content/rewards.js'
import { SWITCHES } from '../src/content/switches.js'
import { ENCOUNTER_REWARDS } from '../src/content/encounter-rewards.js'
import { HERO_POOL } from '../src/content/heroes.js'
import { resolveRewardDraw, resolveBattleOffer } from '../src/core/rewards.js'
import { rewardDrawOf } from '../src/core/charter.js'
import { makeNewCampaign } from '../src/core/opening.js'
import type { CampaignState } from '../src/core/campaign.js'

const LISTED = new Set(AUTHORED_ITEMS.map((r) => r.id))
/** Made of his rows: a base on the list carrying an attribute on the list. */
const madeOfHis = (r: ItemRow): boolean => r.base !== null && LISTED.has(r.base) && r.enchant !== null && LISTED.has(r.enchant)
const his = (r: ItemRow): boolean => LISTED.has(r.id) || madeOfHis(r)
/** Of the pool's shape: a class the odds name, at that class's tier, not the Waystation's. */
const ofShape = (r: ItemRow): boolean => REWARD_ODDS.some((o) => o.itemClass === r.itemClass && o.tier === r.tier) && (r.waystationBand === null || SWITCHES.rewardsIncludeWaystation)
const runDrawing = (seed: number, size: number): CampaignState => {
  const c = makeNewCampaign(seed)
  c.unlocks = ['unlock.spoils.1', 'unlock.spoils.2'].slice(0, size - REWARD_DRAW)
  expect(rewardDrawOf(c)).toBe(size)
  return c
}

describe('kingdom.rewards-derived-rows-offered — the pool', () => {
  it('the switch is on, as ruled: the pool is the rows on the list and the rows made of a listed base carrying a listed attribute', () => {
    expect(SWITCHES.rewardsDerivedRowsOffered, 'kingdom SWITCHES.md rewards.derivedRowsOffered — ruled on, 2026-10-04').toBe(true)
    const want = ITEMS.filter((r) => ofShape(r) && his(r)).map((r) => r.id).sort()
    expect(REWARDS.map((r) => r.id)).toEqual(want)
    expect(rewardPoolOf({ undecided: false, derived: true }).map((r) => r.id)).toEqual(want)
    // the rows the ruling brought in are apart from the list's own, and the pool is the two together
    const listed = REWARDS.filter((r) => LISTED.has(r.id)), made = REWARDS.filter((r) => !LISTED.has(r.id))
    expect(listed.map((r) => r.id)).toEqual(rewardPoolOf({ undecided: false, derived: false }).map((r) => r.id))
    expect(made.length).toBeGreaterThan(0)
    for (const r of made) expect(madeOfHis(itemOf(r.id)), `${r.id}: its base ${itemOf(r.id).base} and its attribute ${itemOf(r.id).enchant} are both on the list`).toBe(true)
    expect(REWARDS.length).toBe(listed.length + made.length)
  })

  it('armor has rows again — his armor carrying his attributes — and weapons more; the classes with no row of his still have none', () => {
    const classes = (rows: readonly { id: string }[]) => [...new Set(rows.map((r) => itemOf(r.id).itemClass as string))].sort()
    const before = rewardPoolOf({ undecided: false, derived: false })
    expect(classes(before)).not.toContain('armor')
    expect(classes(REWARDS)).toContain('armor')
    for (const r of REWARDS.filter((x) => itemOf(x.id).itemClass === 'armor')) expect(madeOfHis(itemOf(r.id)), `${r.id} is his armor carrying his attribute`).toBe(true)
    expect(REWARDS.filter((r) => itemOf(r.id).itemClass === 'weapon').length).toBeGreaterThan(before.filter((r) => itemOf(r.id).itemClass === 'weapon').length)
    // a class is in the pool exactly when a row of his — listed, or made of listed rows — is of its shape
    for (const o of REWARD_ODDS) expect(classes(REWARDS).includes(o.itemClass), `${o.itemClass}`).toBe(ITEMS.some((r) => r.itemClass === o.itemClass && ofShape(r) && his(r)))
  })

  it('a row whose base or whose attribute is not on the list is still not dealt — and a base with no attribute is not a row made of his', () => {
    const shaped = ITEMS.filter((r) => ofShape(r) && r.base !== null && !LISTED.has(r.id))
    const baseOnly = shaped.filter((r) => LISTED.has(r.base!) && r.enchant !== null && !LISTED.has(r.enchant))
    const attributeOnly = shaped.filter((r) => !LISTED.has(r.base!) && r.enchant !== null && LISTED.has(r.enchant))
    const neither = shaped.filter((r) => !LISTED.has(r.base!) && r.enchant !== null && !LISTED.has(r.enchant))
    expect(baseOnly.length, 'his base, a chat\'s attribute').toBeGreaterThan(0)
    expect(attributeOnly.length, 'a chat\'s base, his attribute').toBeGreaterThan(0)
    expect(neither.length).toBeGreaterThan(0)
    for (const r of [...baseOnly, ...attributeOnly, ...neither]) {
      expect(isRewardRow(r), `${r.id} (base ${r.base}, attribute ${r.enchant})`).toBe(false)
      expect(REWARDS.some((x) => x.id === r.id)).toBe(false)
    }
    // the ruling is of a base CARRYING an attribute: a listed base's masterwork carries none
    const masterworks = ITEMS.filter((r) => r.base !== null && LISTED.has(r.base) && r.enchant === null && !LISTED.has(r.id))
    expect(masterworks.length).toBeGreaterThan(0)
    for (const r of masterworks) expect(isOnRewardList(r, { undecided: false, derived: true }), `${r.id} carries no attribute`).toBe(false)
  })
})

describe('kingdom.rewards-derived-rows-offered — the draw', () => {
  it('across 200 seeded draws at each size of the draw (3, 4, 5) every card is a row on the list or a row whose base and attribute are both on it; armor is dealt; no draw throws', () => {
    const dealt: Record<string, number> = {}
    let made = 0, listed = 0
    for (const size of [REWARD_DRAW, REWARD_DRAW + 1, REWARD_DRAW + 2]) {
      for (let seed = 1; seed <= 200; seed++) {
        const c = runDrawing(seed, size)
        let drawn: string[] = []
        expect(() => { drawn = resolveRewardDraw(c, `engagement.test.${seed}`) }, `seed ${seed}, ${size} cards`).not.toThrow()
        expect(drawn.length, `seed ${seed}: ${size} cards dealt (${drawn.join(', ')})`).toBe(size)
        expect(new Set(drawn).size).toBe(drawn.length)
        for (const id of drawn) {
          const row = itemOf(id)
          expect(his(row), `seed ${seed}, ${size} cards: ${id} is neither on the list nor made of a listed base (${row.base}) and a listed attribute (${row.enchant})`).toBe(true)
          // no row with a base or an attribute off the list is dealt
          if (row.base !== null && !LISTED.has(id)) { expect(LISTED.has(row.base), `${id}: base ${row.base}`).toBe(true); expect(row.enchant !== null && LISTED.has(row.enchant), `${id}: attribute ${row.enchant}`).toBe(true) }
          expect(row.tier).toBe(REWARD_ODDS.find((o) => o.itemClass === row.itemClass)!.tier)
          dealt[row.itemClass] = (dealt[row.itemClass] ?? 0) + 1
          if (LISTED.has(id)) listed++; else made++
        }
      }
    }
    expect(dealt['armor'] ?? 0, 'armor is dealt').toBeGreaterThan(0)
    expect(made, 'rows made of his rows are dealt').toBeGreaterThan(0)
    expect(listed, 'rows on the list are still dealt').toBeGreaterThan(0)
    // every class that has a row was dealt, and no other
    expect(Object.keys(dealt).sort()).toEqual([...new Set(REWARDS.map((r) => itemOf(r.id).itemClass as string))].sort())
  })
})

describe('kingdom.rewards-derived-rows-offered — the Flaming Longsword stays the Lumberjack House\'s reward', () => {
  it('the Lumberjack House still offers the Flaming Longsword, as its row names it — it is not a row made of his (its base is a chat\'s), so the draw never deals it', () => {
    const row = ENCOUNTER_REWARDS.find((r) => r.encounterId === 'encounter.opening.lumberjack')!
    expect(row.offer).toEqual({ kind: 'item', itemId: 'item.longsword.flaming', takers: ['class.warrior', 'class.paladin'] })
    const sword = itemOf('item.longsword.flaming')
    expect(LISTED.has(sword.enchant!), 'its attribute is his').toBe(true)
    expect(LISTED.has(sword.base!), 'its base, the Long Sword, is not on the list').toBe(false)
    expect(REWARDS.some((r) => r.id === sword.id), 'named by its battle, never drawn').toBe(false)
    const warrior = HERO_POOL.find((h) => h.id === 'hero.base.warrior-iron')!
    for (let seed = 1; seed <= 20; seed++) {
      const c = makeNewCampaign(seed); c.roster[warrior.id] = structuredClone(warrior)
      expect(resolveBattleOffer(c, row.encounterId)).toEqual([sword.id])
    }
  })
})
