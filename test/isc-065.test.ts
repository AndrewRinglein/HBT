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
import { ITEMS, itemOf } from '../src/content/items.js'
import { AUTHORED_ITEMS } from '../src/content/authored-items.js'

const RULED: Record<string, number> = { weapon: 25, armor: 25, trinket: 20, idol: 10, bloodrune: 10, relic: 10 }
const TIER: Record<string, number> = { weapon: 3, armor: 3, trinket: 1, idol: 1, bloodrune: 1, relic: 1 }
// Law 10, 2026-10-04 (kingdom.rewards-only-authored; engine/DECISIONS.md 2026-10-04, Andrew: "I guess we could just ignore all
// the items not authored by me to start with." — "One yes. Stop appearing as battle rewards."). The first two tests below held
// the pool as EVERY row of the odds table's classes at their tiers (more than 100 rows, a row in every class) and the draw as
// the six classes at 25/25/20/10/10/10. Both pinned set-aside rows as dealt cards, so both are stale by that ruling and are
// rewritten as the rule now stands: the pool is those rows that are on his list (src/content/authored-items.ts), a class has
// a row exactly when the list gives it one, and a class with none is not rolled — its share of the odds goes to the classes
// that have a row, in proportion (kingdom SWITCHES.md rewards.emptyClass). The table itself, the tiers, the three distinct
// cards and the 2-point tolerance are as they were.
//
// Law 10, 2026-10-04, later the same day (kingdom.rewards-derived-rows-offered; engine/DECISIONS.md 2026-10-04 'rewards: one of
// his bases carrying one of his attributes is his; …' — Andrew, asked "should a row made of one of your bases carrying one of
// your attributes count as yours": "1 yes"). The rewrite above read "on his list" as the row's own id being listed, which left
// armor with no row and held every pool row as a listed id. That pinned his bases carrying his attributes as set aside, so it
// is stale by this ruling: a row is his when its id is on the list or its base and its attribute both are (HIS). Armor has
// rows again, and the same two tests hold the pool and the odds on that reading.
const LISTED = new Set(AUTHORED_ITEMS.map((r) => r.id))
/** Is this row his: on the list, or one of his bases carrying one of his attributes. */
const HIS = (r: { id: string; base: string | null; enchant: string | null }): boolean => LISTED.has(r.id) || (r.base !== null && LISTED.has(r.base) && r.enchant !== null && LISTED.has(r.enchant))
/** The classes of the odds table he has a row in — read from the items and the list, not from the pool. */
const WITH_A_ROW = Object.keys(RULED).filter((cls) => ITEMS.some((r) => r.itemClass === cls && r.tier === TIER[cls] && r.waystationBand === null && HIS(r)))

describe('ISC-065 — the tiered draw', () => {
  it('the odds table is the ruled one and the pool is shaped by it: tier-3 weapons and armor, tier-1 everything else — of the rows Andrew authored', () => {
    expect(Object.fromEntries(REWARD_ODDS.map((o) => [o.itemClass, o.pct]))).toEqual(RULED)
    expect(Object.fromEntries(REWARD_ODDS.map((o) => [o.itemClass, o.tier]))).toEqual(TIER)
    expect(REWARD_ODDS.reduce((s, o) => s + o.pct, 0)).toBe(100)
    expect(REWARDS.length).toBeGreaterThan(REWARD_DRAW)                // more rows than one draw deals
    for (const r of REWARDS) {
      const row = itemOf(r.id)                                        // the codex's rows, not a hand list: every pool row is an item row
      expect(TIER[row.itemClass]).toBeDefined()
      expect(row.tier).toBe(TIER[row.itemClass])
      expect(HIS(row), `${r.id} is his: on the list, or his base carrying his attribute`).toBe(true)
    }
    expect(WITH_A_ROW.length).toBeGreaterThan(0)
    expect(WITH_A_ROW, 'weapons and armor, the two tier-3 classes of the table, both have rows of his').toEqual(expect.arrayContaining(['weapon', 'armor']))
    for (const cls of Object.keys(RULED)) expect(REWARDS.some((r) => itemOf(r.id).itemClass === cls), `${cls} has a row in the pool exactly when the list gives it one`).toBe(WITH_A_ROW.includes(cls))
  })
  it('over 4000 draws the classes that have a row fall at the ruled odds, the empty classes\' share spread in proportion, within 2 points; a class with no row is never dealt; every drawn row is at its class tier', () => {
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
    const share = WITH_A_ROW.reduce((s, cls) => s + RULED[cls]!, 0)
    for (const [cls, pct] of Object.entries(RULED)) {
      const got = (100 * (seen[cls] ?? 0)) / cards
      if (!WITH_A_ROW.includes(cls)) { expect(seen[cls] ?? 0, `${cls} has no row and is never dealt`).toBe(0); continue }
      expect(Math.abs(got - (100 * pct) / share), `${cls}: ${got.toFixed(1)}% of the cards, ruled ${pct} of the ${share} left`).toBeLessThanOrEqual(2)
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
