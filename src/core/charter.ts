// The Charter — KINGDOM-DESIGN.md §3A, 7-KINGDOM-SETTLED.md: Renown is the
// entire budget. Every Renown past the free spine buys exactly one thing;
// Articles need an open slot (one at 10, one more every 5); a track's rung N
// needs rung N−1; nothing repeats. No currency is looked at — Law 29: the
// Charter grants rights, buildings provide services.

import type { CampaignState } from './campaign.js'
import { type Ctx, applyUnlock } from './mutate.js'
import { UNLOCKS, unlockRowOf, FIRST_ARTICLE_AT, ARTICLE_EVERY, FREE_SPINE, BASE_ROSTER_CAP, type UnlockRow } from '../content/charter.js'
import { REWARD_DRAW } from '../content/rewards.js'
import { BASE_DEPLOY_LIMIT } from '../content/prep.js'

export const hasUnlock = (campaign: CampaignState, id: string): boolean => campaign.unlocks.includes(id)
export const listUnlocks = (campaign: CampaignState): UnlockRow[] => [...campaign.unlocks].sort().map(unlockRowOf)

/** Article slots the clock has opened: none below 10, one at 10, one more every 5. */
export function articleSlotsOf(campaign: CampaignState): number {
  if (campaign.renown < FIRST_ARTICLE_AT) return 0
  return 1 + Math.floor((campaign.renown - FIRST_ARTICLE_AT) / ARTICLE_EVERY)
}

/** Purchases the Renown affords in all: one per point past the free spine. */
export const purchasesOf = (campaign: CampaignState): number => Math.max(0, campaign.renown - FREE_SPINE)
export const purchasesSpentOf = (campaign: CampaignState): number => campaign.unlocks.length
export const purchasesFreeOf = (campaign: CampaignState): number => purchasesOf(campaign) - purchasesSpentOf(campaign)
export const articlesHeldOf = (campaign: CampaignState): number => listUnlocks(campaign).filter((u) => u.tier === 'article').length

export function whyNotPurchase(campaign: CampaignState, id: string): string | null {
  const row = UNLOCKS.find((u) => u.id === id)
  if (!row) return 'no such unlock'
  if (hasUnlock(campaign, id)) return 'already held — everything is bought once'
  if (purchasesFreeOf(campaign) < 1) return `no Renown to spend — ${campaign.renown} earned, ${purchasesSpentOf(campaign)} spent, the first nine buy nothing`
  if (row.rung > 1 && !hasUnlock(campaign, UNLOCKS.find((u) => u.track === row.track && u.rung === row.rung - 1)!.id)) return `needs ${row.track} rung ${row.rung - 1} first`
  if (row.tier === 'article' && articlesHeldOf(campaign) >= articleSlotsOf(campaign)) return `no Article slot open — the next opens at Renown ${articleSlotsOf(campaign) === 0 ? FIRST_ARTICLE_AT : FIRST_ARTICLE_AT + articleSlotsOf(campaign) * ARTICLE_EVERY}`
  return null
}

export const canPurchase = (campaign: CampaignState, id: string): boolean => whyNotPurchase(campaign, id) === null

export function performPurchase(ctx: Ctx, id: string, causeId: string): void {
  const why = whyNotPurchase(ctx.campaign, id)
  if (why) throw new Error(`performPurchase refused (${id}): ${why}`)
  applyUnlock(ctx, id, unlockRowOf(id).tier, causeId)
}

// ── what the rights make true ───────────────────────────────────────────────

const effectSum = (campaign: CampaignState, kind: NonNullable<UnlockRow['effect']>['kind']) =>
  listUnlocks(campaign).reduce((s, u) => s + (u.effect?.kind === kind ? u.effect.amount : 0), 0)

/** The field: 4, plus a slot per Field Article (GAME-ARCHITECTURE.md §2.3 axis 1). */
export const deployLimitOf = (campaign: CampaignState): number => BASE_DEPLOY_LIMIT + effectSum(campaign, 'field-size')
/** The roster's room: 8, plus two per Roster Article. */
export const rosterCapOf = (campaign: CampaignState): number => BASE_ROSTER_CAP + effectSum(campaign, 'roster')
/** The reward draw: 3, plus one per Spoils Provision — always keep 1. */
export const rewardDrawOf = (campaign: CampaignState): number => REWARD_DRAW + effectSum(campaign, 'reward-draw')
