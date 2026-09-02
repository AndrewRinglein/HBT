// The Reckoning's tail — GAME-ARCHITECTURE.md §7: reckoning → rewards → level-up
// → back to the Week. §2.6: listRewardOffers / canTakeReward / performTakeReward;
// canLevelUp / performLevelUp.
//
// The reward draft (7-KINGDOM-SETTLED.md): "3 → 4 → 5 drawn, keep 1. Keep-2
// was proposed and rejected: it dissolves the draft." Drawn on cup.reward,
// keyed by the Engagement (Law 4) — a reload shows the same three. Only a WON
// battle offers one; a loss "costs wounds and pays no Salvage" and no draft.
//
// Level-up: thresholds from the ruled soft curve (src/content/levels.ts); a
// level is +1 and nothing else until specialties arrive.

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, setRewardOffer, applyTakeReward, applyLevel, setCursor } from './mutate.js'
import { pickOf } from './rng.js'
import { REWARDS, REWARD_DRAW, rewardOf, type RewardRow } from '../content/rewards.js'
import { CUP_IDS } from '../content/cups.js'
import { xpForLevel } from '../content/levels.js'

/** The draw for an Engagement — pure, so the same battle always offers the same three. */
export function resolveRewardDraw(campaign: CampaignState, engagementId: string): string[] {
  return pickOf(campaign, CUP_IDS.reward, [engagementId], REWARDS, REWARD_DRAW).map((r) => r.id)
}

export function listRewardOffers(campaign: CampaignState): RewardRow[] {
  return (campaign.cursor.rewardOffer ?? []).map(rewardOf)
}

export function canTakeReward(campaign: CampaignState, itemId: string): boolean {
  return campaign.cursor.step === 'rewards' && (campaign.cursor.rewardOffer ?? []).includes(itemId)
}

export function performTakeReward(ctx: Ctx, itemId: string, causeId: string): void {
  if (!canTakeReward(ctx.campaign, itemId)) throw new Error(`performTakeReward refused: '${itemId}' is not on offer at step '${ctx.campaign.cursor.step}' — ${(ctx.campaign.cursor.rewardOffer ?? []).join(', ') || 'nothing is'}`)
  applyTakeReward(ctx, itemId, causeId)
  const next = listLevelUps(ctx.campaign).length ? 'levelUp' : 'open'
  setCursor(ctx, next === 'open' ? { step: 'open', engagement: null, battle: null } : { step: next }, causeId)
}

// ── levels ──────────────────────────────────────────────────────────────────

export function canLevelUp(campaign: CampaignState, heroId: HeroId): boolean {
  const h = campaign.roster[heroId]
  if (!h || h.lifeState !== 'alive') return false
  const need = xpForLevel(h.level + 1)
  return need !== null && h.xp >= need
}

/** Everyone who may level now. Sorted by id (Law 6). */
export function listLevelUps(campaign: CampaignState): HeroId[] {
  return Object.keys(campaign.roster).filter((id) => canLevelUp(campaign, id)).sort()
}

export function performLevelUp(ctx: Ctx, heroId: HeroId, causeId: string): void {
  if (!canLevelUp(ctx.campaign, heroId)) {
    const h = ctx.campaign.roster[heroId]
    throw new Error(`performLevelUp refused for '${heroId}': ${h ? `${h.xp} xp at level ${h.level}, needs ${xpForLevel(h.level + 1) ?? 'a curve past the ruled one'}` : 'no such hero'}`)
  }
  applyLevel(ctx, heroId, causeId)
}

/** Leave the level-up step for the Week, levelled or not — a level waits; XP is never lost. */
export function performLeaveLevelUp(ctx: Ctx, causeId: string): void {
  if (ctx.campaign.cursor.step !== 'levelUp') throw new Error(`performLeaveLevelUp refused: the cursor is at '${ctx.campaign.cursor.step}'`)
  setCursor(ctx, { step: 'open', engagement: null, battle: null }, causeId)
}

/** After the writer: a won battle offers its draft; then whoever can level; then the Week. */
export function performExitReckoning(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.step !== 'reckoning') throw new Error(`performExitReckoning refused: the cursor is at '${c.cursor.step}', not the Reckoning`)
  if (c.cursor.rewardOffer) { setCursor(ctx, { step: 'rewards' }, causeId); return }
  setCursor(ctx, { step: listLevelUps(c).length ? 'levelUp' : 'open' }, causeId)
}
