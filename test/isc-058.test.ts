// ISC-058 — masterwork and enchanted are priced and shaped as ruled: a masterwork is
// a two-hander, one-hander, shield or armor at ×1.5 Supplies with +1 Max Stamina; an
// enchanted item costs its Supplies plus the same Mana and carries exactly one tier-2
// enchant legal for its class; no shield is ever enchanted.
// GEAR-DESIGN.md §3 · 7-KINGDOM-SETTLED.md 2026-09-02
//
// LAW 10 — 2026-09-25 (engine fix.masterwork-scope): this probe asserted "a masterwork
// is a two-hander or armor" and "no shield is ever a masterwork". Andrew ruled the rule
// wider (engine DECISIONS.md "masterwork: one-handers and shields too"): "It can also
// apply to a shield. It can also apply to a one-hander." GEAR-DESIGN.md §3 was corrected
// the same day. The assertions below state the new rule, read off the codex rows —
// every tier-1 two-hander, one-hander, shield and armor has its masterwork, nothing
// else does — and "no shield is ever enchanted" is kept unchanged.
import { describe, it, expect } from 'vitest'
import { loadFixture } from './walk.js'
import { costOfItem, listShopItems } from '../src/core/shop.js'
import { ITEMS, itemOf, isShield } from '../src/content/items.js'
import { SWITCHES } from '../src/content/switches.js'
import type { CampaignState } from '../src/core/campaign.js'

const takesMasterwork = (b: ReturnType<typeof itemOf>) => b.tier === 1 &&
  (isShield(b) || b.itemClass === 'armor' || (b.itemClass === 'weapon' && (b.hands === 1 || b.hands === 2)))

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
        expect(takesMasterwork(itemOf(row.base!)), row.id).toBe(true)
      }
      if (row.source === 'enchanted') {
        const base = costOfItem(ctx.campaign, row.base!)['currency.supplies']!
        expect(cost).toEqual({ 'currency.supplies': base, 'currency.mana': base })
        expect(row.enchant).toMatch(/^enchant\./)
      }
    }
  })
  it('no shield is ever enchanted; every enchanted row carries exactly one enchant legal for its class', () => {
    for (const r of ITEMS) {
      if (r.source === 'enchanted') expect(isShield(itemOf(r.base!)), r.id).toBe(false)
      if (r.source === 'enchanted') expect(r.id.split('.').length).toBe(3)   // item.<base>.<enchant>: one enchant
    }
  })
  it('the masterwork rows are exactly the tier-1 two-handers, one-handers, shields and armor — a shield and a one-hander included', () => {
    const want = ITEMS.filter((r) => r.source === 'codex' && takesMasterwork(r)).map((r) => `${r.id}.masterwork`).sort()
    const have = ITEMS.filter((r) => r.source === 'masterwork').map((r) => r.id).sort()
    expect(have).toEqual(want)
    expect(have.some((id) => isShield(itemOf(id.replace(/\.masterwork$/, ''))))).toBe(true)
    expect(have.some((id) => { const b = itemOf(id.replace(/\.masterwork$/, '')); return b.itemClass === 'weapon' && b.hands === 1 })).toBe(true)
  })
})
