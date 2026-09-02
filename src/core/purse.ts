// The purse — GAME-ARCHITECTURE.md §2.6 PURSE; Law 18, four domains, no
// overlap (7-KINGDOM-SETTLED.md). A cost names its currencies; canAfford is
// false when any named currency is short, whatever the others hold — nothing
// substitutes for anything. The currency rows (src/content/currencies.ts) are
// what exists; the purse is a Record keyed by them.

import type { CampaignState, CurrencyId } from './campaign.js'
import { type Ctx, applySpend } from './mutate.js'

export type Cost = Readonly<Record<CurrencyId, number>>

export function balanceOf(campaign: CampaignState, currencyId: CurrencyId): number {
  const b = campaign.purse[currencyId]
  if (b === undefined) throw new Error(`no currency '${currencyId}' in the purse — the currencies are ${Object.keys(campaign.purse).join(', ')}`)
  return b
}

export function canAfford(campaign: CampaignState, cost: Cost): boolean {
  return Object.entries(cost).every(([c, n]) => n >= 0 && balanceOf(campaign, c) >= n)
}

/** Spend a cost, currency by currency in id order (Law 6), refusing before the first coin moves. */
export function performSpend(ctx: Ctx, cost: Cost, causeId: string): void {
  if (!canAfford(ctx.campaign, cost)) {
    const short = Object.entries(cost).filter(([c, n]) => balanceOf(ctx.campaign, c) < n).map(([c, n]) => `${n} ${c} (have ${balanceOf(ctx.campaign, c)})`)
    throw new Error(`performSpend refused: short of ${short.join(', ')}`)
  }
  for (const [c, n] of Object.entries(cost).sort()) if (n > 0) applySpend(ctx, c, n, causeId)
}
