// kingdom.rewards-only-authored — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'reported on the Item Ledger: items that do
// things the game has no mechanic for, authored by a chat and not by him': "I guess we could just ignore all the items not
// authored by me to start with." — and, asked whether the set-aside items should also stop appearing as battle rewards,
// "One yes. Stop appearing as battle rewards.").
//
// Expect: "Across 200 seeded reward draws at every tier of the odds table, every card dealt is one of the 98 ids on the
// checked-in list and no draw throws; a draw whose rolled class has no listed row deals a card of another class; the reward
// screen after an opening battle shows only listed items (or the battle's own named reward); a hero's kit, an enemy's
// weapons and the shop's stock are the same as before; a test names any id on the list that is not an item in the game. The
// landing note lists every named (not drawn) reward that is not on the list."
//
// The list is src/content/authored-items.ts; the pool that reads it is src/content/rewards.ts; the draw is
// src/core/rewards.ts. The choices nobody ruled are kingdom SWITCHES.md 'kingdom.rewards-only-authored'.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { loadFixture } from './walk.js'
import { AUTHORED_ITEMS, AUTHORSHIP_UNDECIDED } from '../src/content/authored-items.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import * as POOL from '../src/content/rewards.js'
import { REWARDS, REWARD_ODDS, REWARD_DRAW, isRewardRow } from '../src/content/rewards.js'
import { SWITCHES } from '../src/content/switches.js'
import { ENCOUNTER_REWARDS } from '../src/content/encounter-rewards.js'
import { QUESTS } from '../src/content/quests.js'
import { HERO_POOL, CIVILIANS, RESCUABLE_CIVILIANS } from '../src/content/heroes.js'
import { CUP_IDS } from '../src/content/cups.js'
import * as DRAW from '../src/core/rewards.js'
import { resolveRewardDraw, resolveBattleOffer, listRewardOffers, canTakeReward, performTakeReward } from '../src/core/rewards.js'
import { rewardDrawOf } from '../src/core/charter.js'
import { rollOf } from '../src/core/rng.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { campaignOf, saveOf, type CampaignState } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { listShopItems, poolOf, tradeCategoryOf } from '../src/core/shop.js'
import { listCatalog } from '../src/core/waystation.js'
import { rewardsScreen } from '../src/ui/after.js'
import { UNITS, ITEMS as ENGINE_ITEMS } from '../src/engine.js'

const LISTED = new Set(AUTHORED_ITEMS.map((r) => r.id))
// Law 10, 2026-10-04 (kingdom.rewards-derived-rows-offered; engine/DECISIONS.md 2026-10-04 'rewards: one of his bases carrying
// one of his attributes is his; the Flaming Longsword stays battle 2's reward' — Andrew, asked "should a row made of one of
// your bases carrying one of your attributes count as yours": "1 yes"). As this item landed, a row was his only when its own
// id was on the list, and the tests below held the pool as exactly those rows (8), every dealt card and every card on a
// reward screen as an id on the list, and the switch rewards.derivedRowsOffered as off. All of that pinned his bases carrying
// his attributes as set aside, so it is stale by the ruling and is rewritten as the rule now stands: a row is his when its id
// is on the list OR its base and its attribute are both on the list (HIS, below), and the switch is on. Nothing else is
// changed: a row whose base or attribute is off the list is still set aside, the classes he has no row in are still not
// rolled, and what the list does not touch is still untouched. The ruling's own probe is test/rewards-derived-rows-offered.test.ts.
/** Is this row his: on the list, or one of his bases carrying one of his attributes. */
const HIS = (id: string): boolean => { const r = itemOf(id); return LISTED.has(id) || (r.base !== null && LISTED.has(r.base) && r.enchant !== null && LISTED.has(r.enchant)) }
const classOf = (id: string) => itemOf(id).itemClass
/** The class a card's roll lands on when every class of the odds table is rolled — the draw as it stood before this item. */
const classOnFullTable = (c: CampaignState, engagementId: string, i: number): string => {
  let at = 0
  const r = rollOf(c, CUP_IDS.reward, [engagementId, 'class', i]) % 100
  for (const o of REWARD_ODDS) { at += o.pct; if (r < at) return o.itemClass }
  throw new Error('the odds table does not sum to 100')
}
/** A run with the reward draw widened to `size` cards by the Charter's Spoils Provisions (3 → 4 → 5). */
const runDrawing = (seed: number, size: number): CampaignState => {
  const c = makeNewCampaign(seed)
  c.unlocks = ['unlock.spoils.1', 'unlock.spoils.2'].slice(0, size - REWARD_DRAW)
  expect(rewardDrawOf(c)).toBe(size)
  return c
}
/** A set-aside row the pool would hold but for the list: of the odds table's class and tier, and not his. */
const SET_ASIDE = ITEMS.filter((r) => REWARD_ODDS.some((o) => o.itemClass === r.itemClass && o.tier === r.tier) && r.waystationBand === null && !HIS(r.id))

describe('kingdom.rewards-only-authored — the list', () => {
  it('every id on the list is in the game — an item, or an Enchantment or attribute some item carries; no id twice, each with the review\'s why', () => {
    const carried = new Set(ITEMS.flatMap((r) => (r.enchant ? [r.enchant] : [])))
    const notInGame = AUTHORED_ITEMS.map((r) => r.id).filter((id) => !ITEMS.some((r) => r.id === id) && !carried.has(id))
    expect(notInGame, `on src/content/authored-items.ts and not in the game: ${notInGame.join(', ')}`).toEqual([])
    expect(AUTHORED_ITEMS.length).toBeGreaterThan(0)
    expect(LISTED.size, 'an id is listed twice').toBe(AUTHORED_ITEMS.length)
    for (const r of AUTHORED_ITEMS) expect(r.why.trim().length, `${r.id} has the review's why line`).toBeGreaterThan(0)
  })

  // Law 10, 2026-10-04 (kingdom.rewards-hell-tcg-rows-his; engine/DECISIONS.md 2026-10-04 'every dead line on his items is a
  // feature that is needed; his items stay in rewards; the six Hell-TCG items are his' — Andrew, asked whether the six Hell-TCG
  // items that came over unchanged count as his: "1. Yes" — "So all of these are in."). This test held the rows the review
  // could not class — Hell-TCG's six and the three relics with no known author — as kept apart and off the list, under the one
  // switch rewards.hellTcgRowsOffered. That pinned the six as off the list, so it is stale by the ruling: the six are rows of
  // the list (held by test/rewards-hell-tcg-rows-his.test.ts), and what is still kept apart is the three relics, which were
  // not asked about, under the switch that is left — rewards.unknownAuthorRowsOffered, off. The same assertions, on those rows.
  it('the rows the review could not class and he has not ruled on (the relics with no known author) are in the game, are kept apart, and are not on the list', () => {
    expect(AUTHORSHIP_UNDECIDED.length).toBeGreaterThan(0)
    for (const r of AUTHORSHIP_UNDECIDED) {
      expect(ITEMS.some((x) => x.id === r.id), `${r.id} is an item`).toBe(true)
      expect(LISTED.has(r.id), `${r.id} is not on the list`).toBe(false)
    }
    expect(SWITCHES.rewardsUnknownAuthorRowsOffered).toBe(false)
  })
})

describe('kingdom.rewards-only-authored — the pool', () => {
  it('the pool is his rows of the odds table\'s classes at their tiers — on the list, or one of his bases carrying one of his attributes — and nothing else', () => {
    const want = ITEMS.filter((r) => HIS(r.id) && REWARD_ODDS.some((o) => o.itemClass === r.itemClass && o.tier === r.tier) && (r.waystationBand === null || SWITCHES.rewardsIncludeWaystation)).map((r) => r.id).sort()
    expect(REWARDS.map((r) => r.id)).toEqual(want)
    expect(REWARDS.length).toBeGreaterThan(0)
    expect(SET_ASIDE.length, 'there are set-aside rows to keep out').toBeGreaterThan(0)
    for (const r of SET_ASIDE) expect(isRewardRow(r), `${r.id} is set aside`).toBe(false)
    for (const r of AUTHORSHIP_UNDECIDED) expect(REWARDS.some((x) => x.id === r.id), `${r.id} waits for his word`).toBe(false)
  })

  it('each list switch is a pool the same code builds: the unclassed rows offered (off); a listed base carrying a listed attribute offered (ruled on) — and its other side, the list\'s own ids alone', () => {
    const poolOfList = (POOL as unknown as { rewardPoolOf?: (o: { undecided: boolean; derived: boolean }) => { id: string }[] }).rewardPoolOf
    expect(typeof poolOfList, 'src/content/rewards.ts rewardPoolOf').toBe('function')
    expect(poolOfList!({ undecided: false, derived: true }).map((r) => r.id)).toEqual(REWARDS.map((r) => r.id))
    // the other side of rewards.derivedRowsOffered, as this item landed it: only the rows whose own id is on the list
    const listOnly = poolOfList!({ undecided: false, derived: false }).map((r) => r.id)
    expect(listOnly.length).toBeGreaterThan(0)
    for (const id of listOnly) expect(LISTED.has(id), `${id} is on the list`).toBe(true)
    expect(listOnly).toEqual(REWARDS.map((r) => r.id).filter((id) => LISTED.has(id)))
    const undecided = poolOfList!({ undecided: true, derived: false }).map((r) => r.id).filter((id) => !listOnly.includes(id))
    expect(undecided.length).toBeGreaterThan(0)
    for (const id of undecided) expect(AUTHORSHIP_UNDECIDED.some((r) => r.id === id), `${id} is one of the unclassed rows`).toBe(true)
    const derived = poolOfList!({ undecided: false, derived: true }).map((r) => r.id).filter((id) => !listOnly.includes(id))
    expect(derived.length).toBeGreaterThan(0)
    for (const id of derived) {
      const row = itemOf(id)
      expect(row.base !== null && LISTED.has(row.base), `${id}: its base ${row.base} is listed`).toBe(true)
      expect(row.enchant !== null && LISTED.has(row.enchant), `${id}: its attribute ${row.enchant} is listed`).toBe(true)
    }
    expect(SWITCHES.rewardsDerivedRowsOffered).toBe(true)
  })
})

describe('kingdom.rewards-only-authored — the draw', () => {
  it('across 200 seeded draws at each size of the draw (3, 4, 5) every card dealt is his — on the list, or his base carrying his attribute — at its class\'s tier, no card twice, and no draw throws', () => {
    const seenClass = new Set<string>(), seenTier = new Set<number>()
    for (const size of [REWARD_DRAW, REWARD_DRAW + 1, REWARD_DRAW + 2]) {
      for (let seed = 1; seed <= 200; seed++) {
        const c = runDrawing(seed, size)
        let drawn: string[] = []
        expect(() => { drawn = resolveRewardDraw(c, `engagement.test.${seed}`) }, `seed ${seed}, ${size} cards`).not.toThrow()
        expect(drawn.length, `seed ${seed}: ${size} cards dealt (${drawn.join(', ')})`).toBe(Math.min(size, REWARDS.length))
        expect(new Set(drawn).size).toBe(drawn.length)
        for (const id of drawn) {
          expect(HIS(id), `seed ${seed}, ${size} cards: ${id} is not on the list and is not made of a listed base and a listed attribute`).toBe(true)
          const row = itemOf(id)
          expect(row.tier).toBe(REWARD_ODDS.find((o) => o.itemClass === row.itemClass)!.tier)
          seenClass.add(row.itemClass); seenTier.add(row.tier)
        }
      }
    }
    // every tier of the odds table that has a row of his was dealt, and every class that has one
    expect([...seenTier].sort()).toEqual([...new Set(REWARDS.map((r) => r.tier))].sort())
    expect([...seenClass].sort()).toEqual([...new Set(REWARDS.map((r) => classOf(r.id)))].sort())
  })

  it('a card whose roll lands on a class with no row of his is dealt from another class — one that has a row', () => {
    const live = new Set<string>(REWARDS.map((r) => classOf(r.id)))
    const empty = REWARD_ODDS.map((o) => o.itemClass as string).filter((cls) => !live.has(cls))
    expect(empty.length, 'the list leaves a class of the odds table with no row').toBeGreaterThan(0)
    let landedOnEmpty = 0
    for (let seed = 1; seed <= 200; seed++) {
      const c = makeNewCampaign(seed), id = `engagement.test.${seed}`
      const drawn = resolveRewardDraw(c, id)
      expect(drawn.length).toBe(REWARD_DRAW)
      drawn.forEach((card, i) => {
        if (!empty.includes(classOnFullTable(c, id, i))) return
        landedOnEmpty++
        expect(live.has(classOf(card)), `seed ${seed}, card ${i + 1}: the roll lands on ${classOnFullTable(c, id, i)}, which has no row; dealt ${card}`).toBe(true)
        expect(HIS(card)).toBe(true)
      })
    }
    expect(landedOnEmpty, 'the 200 draws rolled an empty class at least once').toBeGreaterThan(0)
  })

  it('the class roll: the empty classes\' share is spread over the rest in proportion, on the same table and the same roll; the other side leaves the card out', () => {
    const classOfRoll = (DRAW as unknown as { rewardClassOf?: (roll: number, hasRow: (cls: string) => boolean, emptyClass?: 'spread' | 'left-out') => string | null }).rewardClassOf
    expect(typeof classOfRoll, 'src/core/rewards.ts rewardClassOf').toBe('function')
    const all = () => true
    // every class has a row: the table as ruled — a roll of 0–99 walks 25 / 25 / 20 / 10 / 10 / 10
    const walked: string[] = []
    for (let r = 0; r < 100; r++) walked.push(classOfRoll!(r, all)!)
    for (const o of REWARD_ODDS) expect(walked.filter((cls) => cls === o.itemClass).length, `${o.itemClass} of 100`).toBe(o.pct)
    expect(classOfRoll!(100 + 3, all)).toBe(walked[3])
    // some classes have none: the rest keep their weights against each other, and every roll lands on one of them
    const [first, , third] = REWARD_ODDS
    const two = (cls: string) => cls === first!.itemClass || cls === third!.itemClass
    const total = first!.pct + third!.pct
    const spread: string[] = []
    for (let r = 0; r < total * 4; r++) spread.push(classOfRoll!(r, two, 'spread')!)
    expect(spread.filter((cls) => cls === first!.itemClass).length).toBe(first!.pct * 4)
    expect(spread.filter((cls) => cls === third!.itemClass).length).toBe(third!.pct * 4)
    // no class has a row: no class, and no throw
    expect(classOfRoll!(7, () => false, 'spread')).toBeNull()
    // the other side of the switch: the roll is made on the whole table, and a card that lands on an empty class is left out
    for (let r = 0; r < 100; r++) expect(classOfRoll!(r, two, 'left-out')).toBe(two(walked[r]!) ? walked[r] : null)
    expect(SWITCHES.rewardsEmptyClass).toBe('spread')
  })

  it('the run\'s own draw is still keyed by the battle: the same battle deals the same cards, another battle other cards', () => {
    const c = makeNewCampaign(5)
    expect(resolveRewardDraw(c, 'engagement.test.a')).toEqual(resolveRewardDraw(c, 'engagement.test.a'))
    const dealt = new Set<string>()
    for (let i = 0; i < 20; i++) dealt.add(resolveRewardDraw(c, `engagement.test.${i}`).join(' '))
    expect(dealt.size).toBeGreaterThan(1)
  })
})

describe('kingdom.rewards-only-authored — the reward screen after an opening battle', () => {
  const WARRIOR = HERO_POOL.find((h) => h.id === 'hero.base.warrior-iron')!
  const run = (seed: number) => { const c = makeNewCampaign(seed); c.roster[WARRIOR.id] = structuredClone(WARRIOR); return c }
  const cardsOn = (html: string) => [...html.matchAll(/class="reward-card face-down"[^>]*\bdata-id="([^"]+)"/g)].map((m) => m[1]!)

  it('a battle paid by the draw shows only his items; a battle that names its own reward shows that item, as its row says', () => {
    const drawRows = ENCOUNTER_REWARDS.filter((r) => r.offer.kind === 'draw'), named = ENCOUNTER_REWARDS.filter((r) => r.offer.kind === 'item')
    expect(drawRows.length).toBeGreaterThan(0); expect(named.length).toBeGreaterThan(0)
    for (let seed = 1; seed <= 20; seed++) {
      for (const row of drawRows) {
        const c = run(seed), offer = resolveBattleOffer(c, row.encounterId)!
        expect(offer.length).toBe(REWARD_DRAW)
        c.cursor.step = 'rewards'; c.cursor.rewardOffer = [...offer]
        const shown = cardsOn(rewardsScreen(c, [], null))
        expect(shown).toEqual(offer)
        for (const id of shown) expect(HIS(id), `${row.encounterId}, seed ${seed}: the screen shows ${id}, which is not on the list and is not made of a listed base and a listed attribute`).toBe(true)
        expect(listRewardOffers(c).map((o) => o.id)).toEqual(offer)
      }
      for (const row of named) {
        if (row.offer.kind !== 'item') continue
        const c = run(seed)
        expect(resolveBattleOffer(c, row.encounterId), `${row.encounterId} offers the item its row names`).toEqual([row.offer.itemId])
        c.cursor.step = 'rewards'; c.cursor.rewardOffer = [row.offer.itemId]
        expect(cardsOn(rewardsScreen(c, [], null))).toEqual([row.offer.itemId])
      }
    }
  })

  it('the named (not drawn) rewards that are not his are left as they are — and are these: the Flaming Longsword, which he ruled stays', () => {
    const named = ENCOUNTER_REWARDS.flatMap((r) => (r.offer.kind === 'item' ? [{ battle: r.encounterId, itemId: r.offer.itemId }] : []))
    for (const n of named) expect(ITEMS.some((r) => r.id === n.itemId), `${n.itemId} is still an item`).toBe(true)
    // the whole of the landing note's list: one battle, one item. A new named reward off the list fails here until it is named there too.
    // ruled 2026-10-04 (Andrew, asked "does the Flaming Longsword stay as battle 2's reward": "2 yes") — its attribute is his, its base a chat's row
    expect(named.filter((n) => !HIS(n.itemId))).toEqual([{ battle: 'encounter.opening.lumberjack', itemId: 'item.longsword.flaming' }])
    // a quest names no item: its reward is currencies
    for (const q of QUESTS) for (const k of Object.keys(q.reward)) expect(k.startsWith('currency.'), `${q.id} pays ${k}`).toBe(true)
  })
})

describe('kingdom.rewards-only-authored — what the list does not touch', () => {
  it('only the reward pool reads the list: no other source file imports it', () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}/${d.name}`) : d.name.endsWith('.ts') ? [`${dir}/${d.name}`] : []))
    const readers = files('src').filter((f) => f !== 'src/content/authored-items.ts' && /from '[^']*authored-items.js'/.test(readFileSync(f, 'utf8')))
    expect(readers).toEqual(['src/content/rewards.ts'])
  })

  it('a hero\'s kit and an enemy\'s weapons are as they were: the kits still hold items that are not on the list, and every kit item is still an item', () => {
    const kits = [...HERO_POOL, ...CIVILIANS, ...RESCUABLE_CIVILIANS].flatMap((h) => h.equipped)
    expect(kits.length).toBeGreaterThan(0)
    for (const id of kits) expect(() => itemOf(id), `${id} in a kit`).not.toThrow()
    expect(kits.some((id) => !HIS(id)), 'a kit holds a set-aside item').toBe(true)
    // the engine's own rows — the kit a unit row is fielded with, hero or enemy — are the engine's; the kingdom's items are still every one of them
    expect(ITEMS.length).toBe(Object.keys(ENGINE_ITEMS).length)
    const fieldedWith = Object.values(UNITS).flatMap((u) => [...(u.defaultItems ?? [])])
    expect(fieldedWith.length).toBeGreaterThan(0)
    for (const id of fieldedWith) expect(id in ENGINE_ITEMS, `${id} on a unit row`).toBe(true)
    expect(fieldedWith.some((id) => !HIS(id)), 'a unit row is fielded with a set-aside item').toBe(true)
  })

  it('the Forge\'s shelf, its trade-in and the Waystation\'s catalog are as they were: they sell and pay out rows that are not on the list', () => {
    const forge = (c: CampaignState) => {
      const t = c.territories['territory.ruined-kingdom.ridge']!; t.owned = true; t.claimedOnce = true
      const b = t.buildings.find((x) => x.id === 'building.forge')!
      b.nodes = ['repair', 'blades', 'bows', 'shields', 'light', 'mail', 'exotic-arms', 'plate', 'masterworks', 'enchanted']; b.level = b.nodes.length; b.damaged = false
      const s = c.territories['territory.ruined-kingdom.sanctuary']!
      s.buildings = [...s.buildings.filter((x) => x.id !== 'building.waystation'), { id: 'building.waystation', level: 1, damaged: false, nodes: ['repair'] }]
      c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
    }
    const shelf: string[] = []
    for (let week = 1; week <= 6; week++) shelf.push(...listShopItems(loadFixture((c) => { forge(c); c.week = week }).campaign).map((r) => r.id))
    expect(shelf.length).toBeGreaterThan(0)
    expect(shelf.some((id) => !HIS(id)), `the shelf over six Weeks sells a set-aside item (${[...new Set(shelf)].join(', ')})`).toBe(true)
    // the trade-in pays from every row of the category at the tier, listed or not
    for (const o of REWARD_ODDS.filter((x) => x.itemClass === 'weapon' || x.itemClass === 'armor')) {
      const pays = poolOf(o.itemClass, o.tier).map((r) => r.id)
      expect(pays).toEqual(ITEMS.filter((r) => tradeCategoryOf(r) === o.itemClass && r.tier === o.tier).map((r) => r.id).sort())
      expect(pays.some((id) => !HIS(id)), `the trade-in's tier-${o.tier} ${o.itemClass} rows hold a set-aside item`).toBe(true)
    }
    const catalog = listCatalog(loadFixture(forge).campaign).map((r) => r.id)
    expect(catalog.length).toBeGreaterThan(0)
    expect([...catalog].sort()).toEqual(ITEMS.filter((r) => r.waystationBand === 1).map((r) => r.id).sort())
  })

  it('a save that already holds a set-aside item keeps it: in the stash, on a hero, and on a reward step already offered', () => {
    const aside = SET_ASIDE[0]!.id, other = SET_ASIDE[1]!.id
    const ctx = makeCtx(makeNewCampaign(9)), c = ctx.campaign
    const hero = structuredClone(HERO_POOL.find((h) => h.equipped.some((id) => !HIS(id)))!)
    c.roster[hero.id] = hero
    c.stash = [aside]
    c.cursor.step = 'rewards'; c.cursor.rewardOffer = [other, REWARDS[0]!.id]
    const back = makeCtx(campaignOf(saveOf(c)))
    expect(back.campaign.stash).toEqual([aside])
    expect(back.campaign.roster[hero.id]!.equipped).toEqual(hero.equipped)
    expect(back.campaign.cursor.rewardOffer).toEqual([other, REWARDS[0]!.id])
    // the offer the save holds is shown as it was made, and the set-aside card can still be kept
    expect(listRewardOffers(back.campaign).map((o) => o.id)).toEqual([other, REWARDS[0]!.id])
    expect(listRewardOffers(back.campaign)[0]!.name).toBe(itemOf(other).name)
    expect(canTakeReward(back.campaign, other)).toBe(true)
    performTakeReward(back, other, 'test')
    expect(back.campaign.stash).toEqual([aside, other])
  })
})
