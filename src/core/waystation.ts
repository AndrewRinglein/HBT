// The Waystation — the common items' catalog, and the uses they spend. GEAR-DESIGN.md
// §4, ruled 2026-09-02: "Waystation stock is a fixed catalog. Always buy as many as you
// like, but let's have items unlock with the Waystation levels." Every row is the
// codex's (`waystationBand`, `price`, `uses`); this file counts bands, checks the purse
// and the Stage, and remembers what a Battle spent so it can be restocked.
//
// The catalog is FIXED — no roll, no reroll, no sold-out. That is the whole difference
// from the Forge's shelf, and the reason the two are separate files.

import type { CampaignState } from './campaign.js'
import { type Ctx, applyBuyItem, applySpendUse } from './mutate.js'
import { canAfford, performSpend, type Cost } from './purse.js'
import { listBuildings } from './build.js'
import { bandOf } from './forge.js'
import { ITEMS, itemOf, type ItemRow } from '../content/items.js'
import { canUseActivity } from './activity.js'

/** The held building whose rows the catalog belongs to — the one items name by band. */
export function waystationOf(campaign: CampaignState) {
  return listBuildings(campaign).find((b) => b.held && b.row.bands && ITEMS.some((r) => r.waystationBand !== null) && b.row.id.endsWith('waystation')) ?? null
}

export function waystationLevelOf(campaign: CampaignState): number {
  const w = waystationOf(campaign)
  return w ? bandOf(w) : 0
}

/** What the Waystation charges for a row. The codex's price; empty when it does not sell it. */
export const priceOf = (itemId: string): Cost => ({ ...itemOf(itemId).price })

/** The catalog at this Waystation's band — every row it has opened, sorted by band then id (Law 6). */
export function listCatalog(campaign: CampaignState): ItemRow[] {
  const band = waystationLevelOf(campaign)
  if (band < 1) return []
  return ITEMS.filter((r) => r.waystationBand !== null && r.waystationBand <= band)
    .sort((a, b) => a.waystationBand! - b.waystationBand! || (a.id < b.id ? -1 : 1))
}

const atBuy = (campaign: CampaignState) => canUseActivity(campaign, 'market')

export function whyNotBuyCatalog(campaign: CampaignState, itemId: string): string | null {
  const row = itemOf(itemId)
  if (row.waystationBand === null) return `the Waystation does not sell '${itemId}'`
  if (!atBuy(campaign)) return 'not the Buy Stage'
  const band = waystationLevelOf(campaign)
  if (band < 1) return 'the Waystation is a ruin'
  if (row.waystationBand > band) return `'${row.name}' opens at Waystation band ${row.waystationBand}; it stands at ${band}`
  const cost = priceOf(itemId)
  if (!canAfford(campaign, cost)) return `short of ${Object.entries(cost).filter(([c, n]) => (campaign.purse[c] ?? 0) < n).map(([c]) => c.replace('currency.', '')).map((c) => c[0]!.toUpperCase() + c.slice(1)).join(', ')}`
  return null
}

export const canBuyCatalog = (campaign: CampaignState, itemId: string): boolean => whyNotBuyCatalog(campaign, itemId) === null

/** Buy one — as many times as you like; the catalog never runs out. */
export function performBuyCatalog(ctx: Ctx, itemId: string, causeId: string): void {
  const why = whyNotBuyCatalog(ctx.campaign, itemId)
  if (why) throw new Error(`performBuyCatalog refused for '${itemId}': ${why}`)
  const cost = priceOf(itemId)
  performSpend(ctx, cost, causeId)
  applyBuyItem(ctx, itemId, cost, causeId)
}

// ── uses, and the restock ───────────────────────────────────────────────────

/** How many uses of this item are left in the Battle being fought. A permanent item has none to spend. */
export function usesLeftOf(campaign: CampaignState, itemId: string): number {
  const uses = itemOf(itemId).uses
  if (uses === null) return 0
  return Math.max(0, uses - campaign.cursor.spent.filter((id) => id === itemId).length)
}

export const isSpent = (campaign: CampaignState, itemId: string): boolean => itemOf(itemId).uses !== null && usesLeftOf(campaign, itemId) === 0

/** Spend one use — the Battle's record, not the item's; performExitBattle restocks it. */
export function spendUse(ctx: Ctx, itemId: string, causeId: string): void {
  const row = itemOf(itemId)
  if (row.uses === null) throw new Error(`spendUse refused: '${itemId}' is not a one-use item — it has no uses to spend`)
  if (usesLeftOf(ctx.campaign, itemId) <= 0) throw new Error(`spendUse refused: '${itemId}' has no uses left this Battle`)
  applySpendUse(ctx, itemId, causeId)
}
