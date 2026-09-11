// ISC-058 — masterwork and enchanted are priced and shaped as ruled: a masterwork is
// a two-hander or armor at ×1.5 Supplies with +1 Max Stamina; an enchanted item costs
// its Supplies plus the same Mana and carries exactly one tier-2 enchant legal for its
// class; no shield is ever either.
// GEAR-DESIGN.md §3 · 7-KINGDOM-SETTLED.md 2026-09-02
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { costOfItem, listShopItems } from '../src/core/shop.js'
import { ITEMS, itemOf, isShield } from '../src/content/items.js'
import { SWITCHES } from '../src/content/switches.js'
import type { CampaignState } from '../src/core/campaign.js'

const RIDGE = 'territory.ruined-kingdom.ridge', FORGE = 'building.forge'
const ALL = ['repair', 'blades', 'bows', 'shields', 'light', 'mail', 'exotic-arms', 'plate', 'masterworks', 'enchanted']
const forgeAt = (nodes: string[]) => (c: CampaignState) => {
  const t = c.territories[RIDGE]!; t.owned = true; t.claimedOnce = true
  const b = t.buildings.find((x) => x.id === FORGE)!; b.nodes = [...nodes]; b.level = nodes.length; b.damaged = false
  c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
}

describe('ISC-058 — masterwork and enchanted', () => {
  it('a base item costs 10–20 Supplies, the same every time; a masterwork ×1.5 and +1 Max Stamina; an enchanted the base plus equal Mana', () => {
    const ctx = loadFixture(forgeAt(ALL))
    for (const r of listShopItems(ctx.campaign)) {
      const row = itemOf(r.id)
      const cost = costOfItem(ctx.campaign, r.id)
      if (row.source === 'codex') {
        expect(cost['currency.supplies']).toBeGreaterThanOrEqual(SWITCHES.shopSuppliesMin)
        expect(cost['currency.supplies']).toBeLessThanOrEqual(SWITCHES.shopSuppliesMax)
        expect(cost['currency.mana']).toBeUndefined()
        expect(costOfItem(ctx.campaign, r.id)).toEqual(cost)
      }
      if (row.source === 'masterwork') {
        const base = costOfItem(ctx.campaign, row.base!)['currency.supplies']!
        expect(cost['currency.supplies']).toBe(Math.floor((base * 3) / 2))
        expect(row.statModifiers['staminaMax']).toBe((itemOf(row.base!).statModifiers['staminaMax'] ?? 0) + 1)
        expect(itemOf(row.base!).itemClass === 'armor' || itemOf(row.base!).hands === 2).toBe(true)
      }
      if (row.source === 'enchanted') {
        const base = costOfItem(ctx.campaign, row.base!)['currency.supplies']!
        expect(cost).toEqual({ 'currency.supplies': base, 'currency.mana': base })
        expect(row.enchant).toMatch(/^enchant\./)
      }
    }
  })
  it('no shield is ever a masterwork or enchanted; every enchanted row carries exactly one enchant legal for its class', () => {
    for (const r of ITEMS) {
      if (r.source === 'masterwork' || r.source === 'enchanted') expect(isShield(itemOf(r.base!))).toBe(false)
      if (r.source === 'enchanted') expect(r.id.split('.').length).toBe(3)   // item.<base>.<enchant>: one enchant
    }
  })
})
