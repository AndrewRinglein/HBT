// ISC-019 — the reward draft draws 3 and keeps 1.
// 7-KINGDOM-SETTLED.md — The reward draft
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { listRewardOffers, canTakeReward, performTakeReward, resolveRewardDraw } from '../src/core/rewards.js'
import { campaignOf, saveOf } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { REWARDS, REWARD_DRAW } from '../src/content/rewards.js'

describe('ISC-019 — three drawn, one kept', () => {
  it('a won battle offers three distinct items from the pool; one goes to the stash, two are burned, the same three on reload', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
    applyBattleResult(ctx, e, result, reckoning)
    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('rewards')
    const offers = listRewardOffers(ctx.campaign)
    expect(REWARD_DRAW).toBe(3)
    expect(offers.length).toBe(3)
    expect(new Set(offers.map((o) => o.id)).size).toBe(3)
    for (const o of offers) expect(REWARDS.some((r) => r.id === o.id)).toBe(true)
    expect(REWARDS.length).toBeGreaterThan(3)
    expect(resolveRewardDraw(ctx.campaign, e.id)).toEqual(offers.map((o) => o.id))    // keyed by the Engagement
    const reloaded = makeCtx(campaignOf(saveOf(ctx.campaign)))
    expect(listRewardOffers(reloaded.campaign)).toEqual(offers)
    const notOffered = REWARDS.find((r) => !offers.some((o) => o.id === r.id))!
    expect(canTakeReward(ctx.campaign, notOffered.id)).toBe(false)
    expect(() => performTakeReward(ctx, notOffered.id, 'test')).toThrow(/not on offer/)
    const stash = ctx.campaign.stash.length
    performTakeReward(ctx, offers[1]!.id, 'test')
    expect(ctx.campaign.stash.length).toBe(stash + 1)
    expect(ctx.campaign.stash.at(-1)).toBe(offers[1]!.id)
    expect(ctx.campaign.cursor.rewardOffer).toBeNull()
    expect(ctx.events.filter((ev) => ev.type === 'reward.offered').length).toBe(1)
    const taken = ctx.events.find((ev) => ev.type === 'reward.taken')!
    expect(taken['itemId']).toBe(offers[1]!.id)
    expect((taken['burned'] as string[]).sort()).toEqual([offers[0]!.id, offers[2]!.id].sort())
    expect(['levelUp', 'open']).toContain(ctx.campaign.cursor.step)
  })
  it('a lost battle offers nothing', () => {
    const ctx = toBattle(loadFixture())
    const e = ctx.campaign.cursor.engagement!
    const { result, reckoning } = decide(ctx, panelResult(ctx, false))
    applyBattleResult(ctx, e, result, reckoning)
    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor.rewardOffer).toBeNull()
    expect(ctx.campaign.cursor.step).not.toBe('rewards')
    expect(ctx.events.some((ev) => ev.type === 'reward.offered')).toBe(false)
  })
})
