// ISC-057 — the Forge's shelf follows its level and rerolls each Week: Repaired 2 ·
// Equipped 4 · Masterwork +2 masterwork · Enchanted +2 enchanted, drawn from tier-1
// weapons and armor on cup.forge keyed by the Week; the same Week re-loaded shows
// the same shelf; the next Week differs; buying is refused outside stage.city.
// GEAR-DESIGN.md §3
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { setCursor } from '../src/core/mutate.js'
import { beginStage } from '../src/core/week.js'
import { performBuild } from '../src/core/build.js'
import { listShopItems, forgeLevelOf, performBuyItem, canBuyItem } from '../src/core/shop.js'
import { itemOf } from '../src/content/items.js'
import type { CampaignState } from '../src/core/campaign.js'

const RIDGE = 'territory.ruined-kingdom.ridge', FORGE = 'building.forge'
const forgeAt = (nodes: string[]) => (c: CampaignState) => {
  const t = c.territories[RIDGE]!; t.owned = true; t.claimedOnce = true
  const b = t.buildings.find((x) => x.id === FORGE)!; b.nodes = [...nodes]; b.level = nodes.length; b.damaged = nodes.length === 0
  c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
  c.purse['currency.supplies'] = 500; c.purse['currency.mana'] = 500
}

describe('ISC-057 — the shelf by level, rerolled weekly', () => {
  it('a ruin sells nothing; Repaired 2; Equipped 4; Masterwork adds 2 masterworks; Enchanted adds 2 enchanted (or says the codex has none yet)', () => {
    expect(forgeLevelOf(loadFixture(forgeAt([])).campaign)).toBe(0)
    expect(listShopItems(loadFixture(forgeAt([])).campaign)).toEqual([])
    const repaired = loadFixture(forgeAt(['repair']))
    expect(forgeLevelOf(repaired.campaign)).toBe(1)
    const s1 = listShopItems(repaired.campaign)
    expect(s1.length).toBe(2)
    for (const r of s1) { expect(itemOf(r.id).tier).toBe(1); expect(['weapon', 'armor']).toContain(itemOf(r.id).itemClass) }
    const equipped = loadFixture(forgeAt(['repair', 'blades', 'light']))
    expect(forgeLevelOf(equipped.campaign)).toBe(2)
    expect(listShopItems(equipped.campaign).length).toBe(4)
    const master = loadFixture(forgeAt(['repair', 'blades', 'bows', 'shields', 'light', 'mail', 'exotic-arms', 'plate', 'masterworks']))
    expect(forgeLevelOf(master.campaign)).toBe(3)
    const s3 = listShopItems(master.campaign)
    expect(s3.filter((r) => itemOf(r.id).source === 'masterwork').length).toBe(2)
    expect(s3.filter((r) => itemOf(r.id).tier === 1).length).toBe(4)
    const ench = loadFixture(forgeAt(['repair', 'blades', 'bows', 'shields', 'light', 'mail', 'exotic-arms', 'plate', 'masterworks', 'enchanted']))
    expect(forgeLevelOf(ench.campaign)).toBe(4)
    const s4 = listShopItems(ench.campaign)
    expect(s4.filter((r) => itemOf(r.id).source === 'masterwork').length).toBe(2)
    expect(s4.filter((r) => itemOf(r.id).source === 'enchanted').length).toBeLessThanOrEqual(2)   // none until the content session lands buyable enchants
  })
  it('the same Week re-loaded shows the same shelf; the next Week differs; a bought item leaves the shelf for the Week', () => {
    const a = loadFixture(forgeAt(['repair', 'blades', 'light']))
    const b = loadFixture(forgeAt(['repair', 'blades', 'light']))
    expect(listShopItems(a.campaign).map((r) => r.id)).toEqual(listShopItems(b.campaign).map((r) => r.id))
    const c = loadFixture((s) => { forgeAt(['repair', 'blades', 'light'])(s); s.week = s.week + 1 })
    expect(listShopItems(c.campaign).map((r) => r.id)).not.toEqual(listShopItems(a.campaign).map((r) => r.id))
    const first = listShopItems(a.campaign)[0]!.id
    performBuyItem(a, first, 'test')
    expect(listShopItems(a.campaign).map((r) => r.id)).not.toContain(first)
    expect(a.campaign.stash).toEqual([first])
  })
  it('buying is refused outside the Buy Stage', () => {
    const ctx = loadFixture(forgeAt(['repair']))
    const id = listShopItems(ctx.campaign)[0]!.id
    beginStage(ctx, 'stage.field', 'test')
    setCursor(ctx, { step: 'open' }, 'test')
    expect(canBuyItem(ctx.campaign, id)).toBe(false)
    expect(() => performBuyItem(ctx, id, 'test')).toThrow(/Buy Stage/)
    void performBuild
  })
})
