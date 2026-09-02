// ISC-023 — one Renown buys exactly one purchase; Renown is the entire Charter
// budget and no currency can buy a Charter purchase.
// SKELETON-SETTLED.md:106
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { purchasesOf, purchasesFreeOf, canPurchase, whyNotPurchase, performPurchase, hasUnlock, deployLimitOf, rosterCapOf, rewardDrawOf } from '../src/core/charter.js'
import { UNLOCKS } from '../src/content/charter.js'

describe('ISC-023 — one Renown, one purchase, no currency', () => {
  it('nine Renown buy nothing; the tenth buys one; a rich purse buys none; a track climbs one rung at a time', () => {
    const rich = loadFixture((c) => { c.renown = 9; for (const k of Object.keys(c.purse)) c.purse[k] = 999 })
    expect(purchasesOf(rich.campaign)).toBe(0)
    expect(canPurchase(rich.campaign, 'unlock.civilians.1')).toBe(false)
    expect(whyNotPurchase(rich.campaign, 'unlock.civilians.1')).toMatch(/no Renown to spend/)
    expect(() => performPurchase(rich, 'unlock.civilians.1', 'test')).toThrow(/refused/)

    const ctx = loadFixture((c) => { c.renown = 11; for (const k of Object.keys(c.purse)) c.purse[k] = 0 })
    expect(purchasesOf(ctx.campaign)).toBe(2)
    expect(purchasesFreeOf(ctx.campaign)).toBe(2)
    expect(whyNotPurchase(ctx.campaign, 'unlock.civilians.2')).toMatch(/needs civilians rung 1 first/)
    performPurchase(ctx, 'unlock.civilians.1', 'test')
    expect(hasUnlock(ctx.campaign, 'unlock.civilians.1')).toBe(true)
    expect(purchasesFreeOf(ctx.campaign)).toBe(1)
    expect(whyNotPurchase(ctx.campaign, 'unlock.civilians.1')).toMatch(/already held/)
    performPurchase(ctx, 'unlock.civilians.2', 'test')
    expect(purchasesFreeOf(ctx.campaign)).toBe(0)
    expect(canPurchase(ctx.campaign, 'unlock.civilians.3')).toBe(false)
    expect(Object.values(ctx.campaign.purse).every((v) => v === 0)).toBe(true)       // nothing was spent from the purse
    expect(ctx.events.filter((e) => e.type === 'unlock.purchased').map((e) => e['unlockId'])).toEqual(['unlock.civilians.1', 'unlock.civilians.2'])
    expect(ctx.events.some((e) => e.type === 'resource.spent')).toBe(false)
  })
  it('the rights make things true: a Field Article widens the field, a Roster Article the roster, a Spoils Provision the draw', () => {
    const ctx = loadFixture((c) => { c.renown = 20; c.unlocks = [] })
    expect(deployLimitOf(ctx.campaign)).toBe(4); expect(rosterCapOf(ctx.campaign)).toBe(8); expect(rewardDrawOf(ctx.campaign)).toBe(3)
    performPurchase(ctx, 'unlock.field-size.5', 'test')
    performPurchase(ctx, 'unlock.roster.10', 'test')
    performPurchase(ctx, 'unlock.spoils.1', 'test')
    expect(deployLimitOf(ctx.campaign)).toBe(5); expect(rosterCapOf(ctx.campaign)).toBe(10); expect(rewardDrawOf(ctx.campaign)).toBe(4)
    expect(UNLOCKS.filter((u) => u.tier === 'article').length).toBe(8)
  })
})
