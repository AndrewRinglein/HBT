// ISC-024 — an Article slot opens at Renown 10 and every 5 thereafter; 1–9 is
// the free spine and opens none.
// KINGDOM-DESIGN.md §3A
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { articleSlotsOf, canPurchase, whyNotPurchase, performPurchase, articlesHeldOf, purchasesFreeOf } from '../src/core/charter.js'

const at = (renown: number) => loadFixture((c) => { c.renown = renown; c.unlocks = [] })

describe('ISC-024 — Article slots on the fives', () => {
  it('none below 10; one at 10–14; two at 15; three at 20', () => {
    for (const r of [0, 1, 5, 9]) expect(articleSlotsOf(at(r).campaign), `renown ${r}`).toBe(0)
    for (const r of [10, 11, 14]) expect(articleSlotsOf(at(r).campaign), `renown ${r}`).toBe(1)
    expect(articleSlotsOf(at(15).campaign)).toBe(2)
    expect(articleSlotsOf(at(19).campaign)).toBe(2)
    expect(articleSlotsOf(at(20).campaign)).toBe(3)
  })
  it('at 10 the first Article may be taken — or banked; a second needs 15; the four between are Provisions', () => {
    const ctx = at(10)
    expect(canPurchase(ctx.campaign, 'unlock.field-size.5')).toBe(true)
    performPurchase(ctx, 'unlock.field-size.5', 'test')
    expect(articlesHeldOf(ctx.campaign)).toBe(1)
    expect(purchasesFreeOf(ctx.campaign)).toBe(0)
    ctx.campaign.renown = 14                                                        // four more wins: four Provisions, no second Article
    expect(purchasesFreeOf(ctx.campaign)).toBe(4)
    expect(whyNotPurchase(ctx.campaign, 'unlock.roster.10')).toMatch(/no Article slot open — the next opens at Renown 15/)
    for (const p of ['unlock.civilians.1', 'unlock.pact.1', 'unlock.origins.1', 'unlock.muster.1']) performPurchase(ctx, p, 'test')
    expect(purchasesFreeOf(ctx.campaign)).toBe(0)
    ctx.campaign.renown = 15
    expect(canPurchase(ctx.campaign, 'unlock.roster.10')).toBe(true)
    performPurchase(ctx, 'unlock.roster.10', 'test')
    expect(articlesHeldOf(ctx.campaign)).toBe(2)
    // banking: at 10 with no Article taken, the slot waits
    const bank = at(12)
    performPurchase(bank, 'unlock.civilians.1', 'test'); performPurchase(bank, 'unlock.pact.1', 'test')
    expect(purchasesFreeOf(bank.campaign)).toBe(1)
    expect(canPurchase(bank.campaign, 'unlock.field-size.5')).toBe(true)
  })
})
