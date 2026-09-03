// ISC-060 — the Waystation sells its catalog by band, unlimited: each band opens
// its rows (Pickaxe, Torch, Cure Poison, Rations at the first); every row has a
// Supplies or Mana price; a second copy can be bought; a row above the band is
// refused. GEAR-DESIGN.md §4 · 2-ACTIONS-SETTLED.md 2026-09-02
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { listCatalog, waystationLevelOf, canBuyCatalog, whyNotBuyCatalog, performBuyCatalog, priceOf } from '../src/core/waystation.js'
import { ITEMS, itemOf } from '../src/content/items.js'
import type { CampaignState } from '../src/core/campaign.js'

const SANCTUARY = 'territory.ruined-kingdom.sanctuary', WAY = 'building.waystation'
const at = (nodes: string[]) => (c: CampaignState) => {
  const t = c.territories[SANCTUARY]!
  t.buildings = [...t.buildings.filter((b) => b.id !== WAY), { id: WAY, level: nodes.length, damaged: nodes.length === 0, nodes: [...nodes] }]
  c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
  c.purse['currency.supplies'] = 500; c.purse['currency.mana'] = 500
}
const BAND1 = ['item.pickaxe', 'item.torch', 'item.cure-poison', 'item.rations']

describe('ISC-060 — the Waystation catalog', () => {
  it('a ruin sells nothing; the first band opens the four; each band adds its own, and every row is priced', () => {
    expect(listCatalog(loadFixture(at([])).campaign)).toEqual([])
    const b1 = loadFixture(at(['repair']))
    expect(waystationLevelOf(b1.campaign)).toBe(1)
    expect(listCatalog(b1.campaign).map((r) => r.id).sort()).toEqual([...BAND1].sort())
    const b2 = loadFixture(at(['repair', 'light-and-remedies']))
    expect(waystationLevelOf(b2.campaign)).toBe(2)
    expect(listCatalog(b2.campaign).length).toBeGreaterThan(listCatalog(b1.campaign).length)
    const b4 = loadFixture(at(['repair', 'light-and-remedies', 'bombs-and-oils', 'quest-range']))
    expect(listCatalog(b4.campaign).length).toBe(ITEMS.filter((r) => r.waystationBand !== null).length)
    for (const r of listCatalog(b4.campaign)) {
      const p = priceOf(r.id)
      expect(Object.keys(p).length).toBe(1)
      expect(['currency.supplies', 'currency.mana']).toContain(Object.keys(p)[0])
      expect(itemOf(r.id).tier).toBe(0)
    }
  })
  it('buy as many as you like, at the Buy Stage, if the band is high enough and the purse allows', () => {
    const ctx = loadFixture(at(['repair']))
    performBuyCatalog(ctx, 'item.torch', 'test')
    performBuyCatalog(ctx, 'item.torch', 'test')
    expect(ctx.campaign.stash.filter((id) => id === 'item.torch').length).toBe(2)
    expect(ctx.campaign.purse['currency.supplies']).toBe(500 - 2 * priceOf('item.torch')['currency.supplies']!)
    expect(canBuyCatalog(ctx.campaign, 'item.healing-potion')).toBe(false)                 // band 2
    expect(whyNotBuyCatalog(ctx.campaign, 'item.healing-potion')).toMatch(/band/)
    expect(() => performBuyCatalog(ctx, 'item.healing-potion', 'test')).toThrow(/refused/)
    const poor = loadFixture((c) => { at(['repair'])(c); c.purse['currency.mana'] = 0 })
    expect(whyNotBuyCatalog(poor.campaign, 'item.cure-poison')).toMatch(/Mana/)
    const elsewhere = loadFixture((c) => { at(['repair'])(c); c.cursor.stage = 'stage.build' })
    expect(whyNotBuyCatalog(elsewhere.campaign, 'item.torch')).toMatch(/Buy Stage/)
  })
})
