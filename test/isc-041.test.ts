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
  it('no shelf until the Forge is repaired; then weapons and tier-1 armors for Supplies; then equipped at prep', () => {
    const ctx = loadFixture((c) => { c.purse['currency.salvage'] = 10; c.purse['currency.supplies'] = SWITCHES.shopSupplies * 2; c.territories[RIDGE]!.owned = true; c.territories[RIDGE]!.claimedOnce = true })
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
    expect(shelf.every((r) => r.tier <= 1)).toBe(true)
    expect(shelf.some((r) => r.slot === 'weapon')).toBe(true)
    expect(shelf.some((r) => r.slot === 'armor' && r.tier === 1)).toBe(true)
    expect(costOfItem('item.longsword')).toEqual({ 'currency.supplies': SWITCHES.shopSupplies })
    performBuyItem(ctx, 'item.longsword', 'test')
    performBuyItem(ctx, 'item.silkweave-armor', 'test')
    expect(ctx.campaign.stash).toEqual(['item.longsword', 'item.silkweave-armor'])
    expect(ctx.campaign.purse['currency.supplies']).toBe(0)
    expect(canBuyItem(ctx.campaign, 'item.halberd')).toBe(false)               // short
    expect(() => performBuyItem(ctx, 'item.halberd', 'test')).toThrow(/short of Supplies/)
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
    expect(ctx.campaign.roster[hero]!.equipped).toEqual(['item.longsword'])
    expect(ctx.campaign.stash).toEqual(['item.silkweave-armor'])
    expect(ctx.events.filter((e) => e.type === 'item.bought').length).toBe(2)
    expect(ctx.events.filter((e) => e.type === 'item.equipped').map((e) => [e['heroId'], e['itemId']])).toEqual([[hero, 'item.longsword']])
  })
})
