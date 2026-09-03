// ISC-041 — with the Forge's repair node built, listShopItems offers the
// starting weapons and tier-1 armors; performBuyItem spends Supplies into the
// stash; performEquip at the equip step puts the item on a deployed hero.
// THIN-SLICE-REVIEW.md §G2 — "the Forge is in… starting weapons plus tier-1 armors"
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginWeek, beginStage, listStageOffers, performChooseEngagement, stageOf } from '../src/core/week.js'
import { performBuild } from '../src/core/build.js'
import { isShopOpen, listShopItems, canBuyItem, performBuyItem, costOfItem, canEquip, performEquip } from '../src/core/shop.js'
import { performAdvancePrep, performDeploy, listDeployable, prepStepOf } from '../src/core/prep.js'
import { playStage, DEFAULTS } from '../src/sim/autoplay.js'
import { SWITCHES } from '../src/content/switches.js'

const RIDGE = 'territory.ruined-kingdom.ridge', FORGE = 'building.forge'

describe('ISC-041 — the shelf, and the equip step', () => {
  // Law 10 note, 2026-09-02 (forge.shelf, G6): the shelf became a WEEKLY ROLL sized by the
  // Forge's band (Repaired: two items) at a rolled price of 10–20 Supplies — so this probe
  // buys what the shelf offers this Week rather than two named items at a flat switch. The
  // rule it holds — no shelf until repaired, tier-1 weapons and armor for Supplies, then
  // equipped at prep — is unchanged.
  it('no shelf until the Forge is repaired; then weapons and tier-1 armors for Supplies; then equipped at prep', () => {
    const ctx = loadFixture((c) => { c.purse['currency.salvage'] = 10; c.purse['currency.supplies'] = SWITCHES.shopSuppliesMax * 2; c.territories[RIDGE]!.owned = true; c.territories[RIDGE]!.claimedOnce = true })
    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
    beginWeek(ctx, 'test')                                                   // Buy
    expect(isShopOpen(ctx.campaign)).toBe(false)
    expect(listShopItems(ctx.campaign)).toEqual([])
    expect(() => performBuyItem(ctx, 'item.longsword', 'test')).toThrow(/not repaired/)
    beginStage(ctx, 'stage.build', 'test')
    performBuild(ctx, RIDGE, FORGE, 'repair', 'test')
    expect(isShopOpen(ctx.campaign)).toBe(true)
    expect(canBuyItem(ctx.campaign, 'item.longsword')).toBe(false)             // not the Buy Stage
    beginStage(ctx, 'stage.buy', 'test')
    const shelf = listShopItems(ctx.campaign)
    expect(shelf.length).toBe(2)                                                // Repaired sells two
    expect(shelf.every((r) => r.tier <= 1)).toBe(true)
    expect(shelf.every((r) => r.slot === 'weapon' || r.slot === 'off-hand' || r.slot === 'armor')).toBe(true)
    const [first, second] = shelf.map((r) => r.id) as [string, string]
    const price = costOfItem(ctx.campaign, first)['currency.supplies']!
    expect(price).toBeGreaterThanOrEqual(SWITCHES.shopSuppliesMin); expect(price).toBeLessThanOrEqual(SWITCHES.shopSuppliesMax)
    performBuyItem(ctx, first, 'test')
    performBuyItem(ctx, second, 'test')
    expect(ctx.campaign.stash).toEqual([first, second])
    expect(listShopItems(ctx.campaign)).toEqual([])                             // sold out for the Week
    ctx.campaign.purse['currency.supplies'] = 0
    ctx.campaign.cursor.sold = []                                               // the shelf is back, the purse is not
    expect(canBuyItem(ctx.campaign, first)).toBe(false)                         // short
    expect(() => performBuyItem(ctx, first, 'test')).toThrow(/short of Supplies/)
    ctx.campaign.stash.push('item.longsword', 'item.silkweave-armor')          // the rest of the probe fits the longsword
    // to a conquest, and the equip step
    while (stageOf(ctx.campaign).targets !== 'conquerable') playStage(ctx, { ...DEFAULTS, target: () => null }, 'test')
    performChooseEngagement(ctx, listStageOffers(ctx.campaign)[0]!, 'test')
    performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
    const [hero, other] = listDeployable(ctx.campaign) as [string, string]
    performDeploy(ctx, hero, 'test')
    expect(canEquip(ctx.campaign, hero, 'item.longsword')).toBe(false)         // not the equip step yet
    performAdvancePrep(ctx, 'test')
    expect(prepStepOf(ctx.campaign)).toBe('equip')
    expect(canEquip(ctx.campaign, other, 'item.longsword')).toBe(false)        // not deployed
    expect(canEquip(ctx.campaign, hero, 'item.halberd')).toBe(false)           // not in the stash
    performEquip(ctx, hero, 'item.longsword', 'test')
    // Law 10 (2026-09-02): heroes enter WEARING their content kit (G3), so the bought longsword joins the kit rather than being the only thing worn
    expect(ctx.campaign.roster[hero]!.equipped.slice(-1)).toEqual(['item.longsword'])
    expect(ctx.campaign.roster[hero]!.equipped.length).toBeGreaterThan(1)
    expect(ctx.campaign.stash).toEqual([first, second, 'item.silkweave-armor'])
    expect(ctx.events.filter((e) => e.type === 'item.bought').length).toBe(2)
    expect(ctx.events.filter((e) => e.type === 'item.equipped').map((e) => [e['heroId'], e['itemId']])).toEqual([[hero, 'item.longsword']])
  })
})
