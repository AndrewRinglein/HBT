// The map — GAME-ARCHITECTURE.md §2.6 TERRITORIES and THREAT.
//
//   listTerritories · isOwned · listConquerable
//   resolveThreat(campaign) → TerritoryId | null      the weekly defend roll
//   performLose(ctx, territoryId)                     a counterattack not answered
//
// The defend roll — THIN-SLICE-REVIEW.md §G2, Andrew: "one roll per Week, 6%
// per owned Territory, all in one roll — at most one defense per Week." One
// draw on cup.threat keyed by the Week (Law 4), compared with 6 × owned; if it
// fires, a second draw picks WHICH owned Territory. Both are pure: the same
// Week always rolls the same attack, so a reload cannot re-roll it.
//
// Losing — SKELETON-SETTLED.md:80-81: "A Territory that is counterattacked and
// not defended is lost and must be retaken… The Kingdom centre cannot be lost.
// A failed defence of it costs resources and wounded heroes instead — stakes
// data on that Territory." The costs are the Territory row's.

import type { CampaignState, TerritoryId, Territory } from './campaign.js'
import { type Ctx, applyLose, applySpend } from './mutate.js'
import { rollOf } from './rng.js'
import { CUP_IDS } from '../content/cups.js'
import { SWITCHES } from '../content/switches.js'
import { territoryRowOf } from '../content/territories.js'

/** Every Territory, sorted by id (Law 6). */
export function listTerritories(campaign: CampaignState, filter?: (t: Territory) => boolean): Territory[] {
  return Object.values(campaign.territories).filter(filter ?? (() => true)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function isOwned(campaign: CampaignState, territoryId: TerritoryId): boolean {
  const t = campaign.territories[territoryId]
  if (!t) throw new Error(`no Territory '${territoryId}' on the map`)
  return t.owned
}

/** Unclaimed Territories adjacent to one you hold — what a Conquer may attack. */
export function listConquerable(campaign: CampaignState): TerritoryId[] {
  const out = new Set<TerritoryId>()
  for (const t of listTerritories(campaign, (x) => x.owned)) for (const a of t.adjacent) { const n = campaign.territories[a]; if (n && !n.owned) out.add(n.id) }
  return [...out].sort()
}

/**
 * The weekly defend roll. At most one attack a Week; the chance is
 * `defend.chancePerTerritory` × owned Territories, in whole percent; the
 * target is one of the owned, by a second draw. Pure — keyed by the Week.
 */
export function resolveThreat(campaign: CampaignState, week = campaign.week): TerritoryId | null {
  const owned = listTerritories(campaign, (t) => t.owned).map((t) => t.id)
  if (owned.length === 0) return null
  const chance = SWITCHES.defendChancePerTerritory * owned.length
  const fired = rollOf(campaign, CUP_IDS.threat, ['fires', week]) % 100 < chance
  if (!fired) return null
  return owned[rollOf(campaign, CUP_IDS.threat, ['where', week]) % owned.length]!
}

/**
 * A counterattack not defended. An ordinary Territory is lost; the Kingdom
 * Territory cannot be, and its row says what the failure costs instead.
 */
export function performLose(ctx: Ctx, territoryId: TerritoryId, causeId: string): void {
  const t = ctx.campaign.territories[territoryId]
  if (!t) throw new Error(`performLose: no Territory '${territoryId}'`)
  if (!t.owned) throw new Error(`performLose refused: '${territoryId}' is not held`)
  if (!t.kingdom) { applyLose(ctx, territoryId, causeId); return }
  const costs = territoryRowOf(territoryId).lostDefenceCosts ?? {}
  for (const [currency, amount] of Object.entries(costs).sort()) {
    // the purse cannot go below zero — a failed defence takes what there is
    applySpend(ctx, currency, Math.min(amount, ctx.campaign.purse[currency] ?? 0), causeId)
  }
}
