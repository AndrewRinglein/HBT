// ISC-065 — the reward draw is tiered at the ruled odds: over many draws on
// cup.reward the classes fall 25/25/20/10/10/10 within tolerance; every weapon
// or armor drawn is tier 3, every other class tier 1; three are revealed and one
// kept.
// 7-KINGDOM-SETTLED.md 2026-09-02 (rewards) · GEAR-DESIGN.md §7
import { describe, it, expect } from 'vitest'
import { loadFixture, toBattle, panelResult, decide } from './walk.js'
import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { listRewardOffers, performTakeReward, resolveRewardDraw } from '../src/core/rewards.js'
import { spendUse } from '../src/core/waystation.js'
import { REWARDS, REWARD_ODDS, REWARD_DRAW, rewardOf } from '../src/content/rewards.js'
import { itemOf } from '../src/content/items.js'

const RULED: Record<string, number> = { weapon: 25, armor: 25, trinket: 20, idol: 10, bloodrune: 10, relic: 10 }
const TIER: Record<string, number> = { weapon: 3, armor: 3, trinket: 1, idol: 1, bloodrune: 1, relic: 1 }

describe('ISC-065 — the tiered draw', () => {
  it('the odds table is the ruled one and the pool is shaped by it: tier-3 weapons and armor, tier-1 everything else', () => {
    expect(Object.fromEntries(REWARD_ODDS.map((o) => [o.itemClass, o.pct]))).toEqual(RULED)
    expect(Object.fromEntries(REWARD_ODDS.map((o) => [o.itemClass, o.tier]))).toEqual(TIER)
    expect(REWARD_ODDS.reduce((s, o) => s + o.pct, 0)).toBe(100)
    expect(REWARDS.length).toBeGreaterThan(100)                       // the codex's rows, not a hand list
    for (const r of REWARDS) {
      const row = itemOf(r.id)
      expect(TIER[row.itemClass]).toBeDefined()
      expect(row.tier).toBe(TIER[row.itemClass])
    }
    for (const cls of Object.keys(RULED)) expect(REWARDS.some((r) => itemOf(r.id).itemClass === cls)).toBe(true)
  })
  it('over 4000 draws the classes fall at the ruled odds within 2 points, and every drawn row is at its class tier', () => {
    const ctx = loadFixture()
    const seen: Record<string, number> = {}
    let cards = 0
    for (let i = 0; i < 4000; i++) {
      const drawn = resolveRewardDraw(ctx.campaign, `engagement.test.${i}`)
      expect(drawn.length).toBe(REWARD_DRAW)
      expect(new Set(drawn).size).toBe(drawn.length)                  // three distinct cards
      for (const id of drawn) {
        const row = itemOf(id)
        expect(row.tier).toBe(TIER[row.itemClass])
        seen[row.itemClass] = (seen[row.itemClass] ?? 0) + 1
        cards++
      }
    }
    for (const [cls, pct] of Object.entries(RULED)) {
      const got = (100 * (seen[cls] ?? 0)) / cards
      expect(Math.abs(got - pct)).toBeLessThanOrEqual(2)
    }
  })
  it('keyed by the Engagement: the same battle always draws the same three', () => {
    const ctx = loadFixture()
    expect(resolveRewardDraw(ctx.campaign, 'engagement.test.a')).toEqual(resolveRewardDraw(ctx.campaign, 'engagement.test.a'))
    expect(resolveRewardDraw(ctx.campaign, 'engagement.test.a')).not.toEqual(resolveRewardDraw(ctx.campaign, 'engagement.test.b'))
  })
  it('three revealed, one kept, two burned — and what was spent in the battle is whole before the cards are seen', () => {
    const ctx = toBattle(loadFixture((c) => { c.stash = ['item.healing-potion'] }))
    const e = ctx.campaign.cursor.engagement!
    spendUse(ctx, 'item.healing-potion', 'test')
    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
    applyBattleResult(ctx, e, result, reckoning)
    performExitBattle(ctx, 'test')
    expect(ctx.campaign.cursor.step).toBe('rewards')
    expect(ctx.campaign.cursor.spent).toEqual([])
    const restocked = ctx.events.findIndex((ev) => ev.type === 'item.restocked')
    const shown = ctx.events.findIndex((ev) => ev.type === 'cursor.moved' && (ev['to'] as { step: string }).step === 'rewards')
    expect(restocked).toBeGreaterThanOrEqual(0)
    expect(restocked).toBeLessThan(shown)
    const offers = listRewardOffers(ctx.campaign)
    expect(offers.length).toBe(3)
    for (const o of offers) expect(rewardOf(o.id).tier).toBe(TIER[itemOf(o.id).itemClass])
    const stash = ctx.campaign.stash.length
    performTakeReward(ctx, offers[2]!.id, 'test')
    expect(ctx.campaign.stash.length).toBe(stash + 1)
    expect(ctx.campaign.stash.at(-1)).toBe(offers[2]!.id)
    const taken = ctx.events.find((ev) => ev.type === 'reward.taken')!
    expect((taken['burned'] as string[]).length).toBe(2)
  })
})
