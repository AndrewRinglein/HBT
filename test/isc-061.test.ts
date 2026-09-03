// ISC-061 — used items restock after the battle: a one-use item spent in a battle
// (as the result reports) is whole again after performExitBattle; nothing is
// deleted from the stash or the hero.
// 2-ACTIONS-SETTLED.md 2026-09-02 "used-up items are replaced. They're restocked after the battle."
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult } from './walk.js'
import { setBattleOutcome } from '../src/core/mutate.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { usesLeftOf, spendUse, isSpent } from '../src/core/waystation.js'
import { itemOf } from '../src/content/items.js'

const POTION = 'item.healing-potion', TORCH = 'item.torch'

describe('ISC-061 — restock', () => {
  it('a one-use row has uses; a permanent one does not; spending is recorded on the Campaign, not on the item', () => {
    expect(itemOf(POTION).uses).toBe(1)
    expect(itemOf(TORCH).uses).toBeNull()
    const ctx = loadFixture((c) => { c.stash = [POTION, TORCH] })
    expect(usesLeftOf(ctx.campaign, POTION)).toBe(1)
    spendUse(ctx, POTION, 'test')
    expect(usesLeftOf(ctx.campaign, POTION)).toBe(0)
    expect(isSpent(ctx.campaign, POTION)).toBe(true)
    expect(isSpent(ctx.campaign, TORCH)).toBe(false)                      // permanent items are never spent
    expect(() => spendUse(ctx, TORCH, 'test')).toThrow(/refused/)
    expect(ctx.campaign.stash).toEqual([POTION, TORCH])                   // nothing is deleted
  })
  it('leaving the battle restocks everything spent, and says so', () => {
    const ctx = toBattle(loadFixture((c) => { c.stash = [POTION] }), 3)
    spendUse(ctx, POTION, 'test')
    const r = panelResult(ctx, true)
    const k = resolveReckoning(ctx.campaign, ctx.campaign.cursor.engagement!, r)
    setBattleOutcome(ctx, r, k, 'test')
    applyBattleResult(ctx, ctx.campaign.cursor.engagement!, r, k)
    expect(isSpent(ctx.campaign, POTION)).toBe(true)                      // still spent through the Reckoning
    performExitBattle(ctx, 'test')
    expect(isSpent(ctx.campaign, POTION)).toBe(false)
    expect(usesLeftOf(ctx.campaign, POTION)).toBe(1)
    expect(ctx.events.filter((e) => e.type === 'item.restocked').map((e) => e['itemId'])).toEqual([POTION])
  })
})
