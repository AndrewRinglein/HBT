// V2 chapel work resolves at City close. Rest removes both fatigue badges; Prayer grants Faith.
// Wound-service pricing and durations remain the interim V1 values until the recovery stage.
import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, applyGrant, setWound, setHeroBadges } from './mutate.js'
import { commitmentOf, performCommit, canCommit } from './assignments.js'
import { canUseActivity } from './activity.js'
import { RECOVERY_BADGES } from '../content/recovery.js'
import { LABOURS, labourOf, type LabourRow, type NodeType } from '../content/labours.js'

/** How many owned Territories carry this node. */
export function nodeCountOf(campaign: CampaignState, node: NodeType): number {
  return Object.values(campaign.territories).filter((t) => t.owned && t.node === node).length
}

/** What one hero on this labour would produce this Week. Pure. */
export function yieldOf(campaign: CampaignState, key: string): { currency: string; amount: number } | null {
  const row = labourOf(key)
  if (!row.currency || !row.node) return null
  return { currency: row.currency, amount: row.base + row.perNode * nodeCountOf(campaign, row.node) }
}

export function listLabours(): readonly LabourRow[] { return LABOURS }

export function canAssignLabour(campaign: CampaignState, heroId: HeroId, key: string): boolean {
  if (!canUseActivity(campaign, 'chapel') || !campaign.roster[heroId]) return false
  const row = LABOURS.find((l) => l.key === key)
  if (!row) return false
  if (row.kind === 'heal' && campaign.roster[heroId]!.wound === 0) return false
  return canCommit(campaign, heroId, { kind: row.kind, target: row.key, weeks: 1 })
}

export function performAssignLabour(ctx: Ctx, heroId: HeroId, key: string, causeId: string): void {
  if (!canAssignLabour(ctx.campaign, heroId, key)) throw new Error(`performAssignLabour refused: '${heroId}' cannot ${key} — ${ctx.campaign.roster[heroId] ? commitmentOf(ctx.campaign, heroId, 'city') : 'no such hero'}`)
  const row = labourOf(key)
  performCommit(ctx, heroId, { kind: row.kind, target: row.key, weeks: 1 }, causeId)
}

/**
 * The Stage's end: every completed City assignment resolves — Faith for Prayer,
 * the interim wound service for Heal, fatigue-badge removal for Rest. Heroes in id order (Law 6);
 * every grant names the hero and the labour as its cause (Law 12).
 */
export function performResolveMend(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  for (const heroId of Object.keys(c.assignments).sort()) {
    const a = c.assignments[heroId]
    if (!a || a.weeks > 1) continue
    const row = LABOURS.find((l) => l.key === a.target)
    if (!row) continue
    if (row.kind === 'labour') {
      const y = yieldOf(c, row.key)
      if (y && y.amount > 0) applyGrant(ctx, y.currency, y.amount, `${causeId}:${row.key}:${heroId}`)
    } else if (row.kind === 'rest') {
      setHeroBadges(ctx, heroId, c.roster[heroId]!.badges.filter((b) => !RECOVERY_BADGES.some((r) => r === b)), `${causeId}:${row.key}:${heroId}`)
    } else if (row.kind === 'heal') {
      const h = c.roster[heroId]!
      if (h.wound > 0) setWound(ctx, heroId, h.wound - 1, `${causeId}:${row.key}:${heroId}`)
    }
  }
}
