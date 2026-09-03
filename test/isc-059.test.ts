// ISC-059 — the trade-in is three for one, one tier up, same category, at Enchanted:
// with the Forge at Enchanted, three stash items of one category and one tier become
// one item of that category one tier up (weapons/armor from 3, others from 1);
// refused below Enchanted, across categories, or with two.
// 7-KINGDOM-SETTLED.md 2026-09-02 (the trade-in, "let's just do it in Forge")
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { whyNotTradeIn, canTradeIn, performTradeIn } from '../src/core/shop.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import type { CampaignState } from '../src/core/campaign.js'

const RIDGE = 'territory.ruined-kingdom.ridge', FORGE = 'building.forge'
const ALL = ['repair', 'blades', 'bows', 'shields', 'light', 'mail', 'exotic-arms', 'plate', 'masterworks', 'enchanted']
const forgeAt = (nodes: string[], stash: string[]) => (c: CampaignState) => {
  const t = c.territories[RIDGE]!; t.owned = true; t.claimedOnce = true
  const b = t.buildings.find((x) => x.id === FORGE)!; b.nodes = [...nodes]; b.level = nodes.length; b.damaged = false
  c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
  c.stash = [...stash]
}
const idols1 = ITEMS.filter((r) => r.itemClass === 'idol' && r.tier === 1).map((r) => r.id)
const idols2 = ITEMS.filter((r) => r.itemClass === 'idol' && r.tier === 2)

describe('ISC-059 — the trade-in', () => {
  it('three tier-1 idols become one tier-2 idol; the three are gone; the result is drawn on the cup', () => {
    expect(idols1.length).toBeGreaterThanOrEqual(3); expect(idols2.length).toBeGreaterThan(0)
    const three = idols1.slice(0, 3)
    const ctx = loadFixture(forgeAt(ALL, [...three, 'item.dagger']))
    expect(canTradeIn(ctx.campaign, three)).toBe(true)
    const got = performTradeIn(ctx, three, 'test')
    expect(itemOf(got).itemClass).toBe('idol'); expect(itemOf(got).tier).toBe(2)
    expect(ctx.campaign.stash).toEqual(['item.dagger', got])
    const ev = ctx.events.filter((e) => e.type === 'item.traded')
    expect(ev.length).toBe(1); expect(ev[0]!['burned']).toEqual(three); expect(ev[0]!['itemId']).toBe(got)
    // the same three on the same Week draw the same result
    const again = loadFixture(forgeAt(ALL, [...three]))
    expect(performTradeIn(again, three, 'test')).toBe(got)
  })
  it('refused below Enchanted, across categories, across tiers, with two, or when no row exists a tier up', () => {
    const three = idols1.slice(0, 3)
    expect(whyNotTradeIn(loadFixture(forgeAt(ALL.slice(0, 9), three)).campaign, three)).toMatch(/Enchanted/)
    const mixed = [three[0]!, three[1]!, 'item.dagger']
    expect(whyNotTradeIn(loadFixture(forgeAt(ALL, mixed)).campaign, mixed)).toMatch(/category/)
    expect(whyNotTradeIn(loadFixture(forgeAt(ALL, three)).campaign, three.slice(0, 2))).toMatch(/three/)
    const weapons3 = ITEMS.filter((r) => r.itemClass === 'weapon' && r.tier === 3).slice(0, 3).map((r) => r.id)
    expect(weapons3.length).toBe(3)
    expect(whyNotTradeIn(loadFixture(forgeAt(ALL, weapons3)).campaign, weapons3)).toMatch(/tier 4/)   // no tier-4 rows exist yet
    const t1w = ITEMS.filter((r) => r.itemClass === 'weapon' && r.tier === 1 && r.source === 'codex').slice(0, 3).map((r) => r.id)
    expect(whyNotTradeIn(loadFixture(forgeAt(ALL, t1w)).campaign, t1w)).toMatch(/tier 3/)             // weapons climb from 3, not 1
    expect(() => performTradeIn(loadFixture(forgeAt(ALL, t1w)), t1w, 'test')).toThrow(/refused/)
  })
})
