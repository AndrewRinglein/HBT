// Mend — the city Stage. KINGDOM-DESIGN.md §3, 7-KINGDOM-SETTLED.md "The Mend
// labours": a hero assigned to a labour takes the city slot for the Week and,
// when the Stage ends, produces `base + perNode × owned nodes of that type` —
// yields flow through people, never passively. Heal lowers a wound one level
// and produces nothing; Rest produces nothing.

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, applyGrant, setWound } from './mutate.js'
import { commitmentOf, performCommit } from './assignments.js'
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
  if (!campaign.roster[heroId]) return false
  const row = LABOURS.find((l) => l.key === key)
  if (!row) return false
  if (row.kind === 'heal' && campaign.roster[heroId]!.wound === 0) return false
  return commitmentOf(campaign, heroId, 'city') === 'free'
}

export function performAssignLabour(ctx: Ctx, heroId: HeroId, key: string, causeId: string): void {
  if (!canAssignLabour(ctx.campaign, heroId, key)) throw new Error(`performAssignLabour refused: '${heroId}' cannot ${key} — ${ctx.campaign.roster[heroId] ? commitmentOf(ctx.campaign, heroId, 'city') : 'no such hero'}`)
  const row = labourOf(key)
  performCommit(ctx, heroId, { kind: row.kind, target: row.key, weeks: 1 }, causeId)
}

/**
 * The Stage's end: every city Assignment of the Week resolves — grants for the
 * labours, one level for Heal, nothing for Rest. Heroes in id order (Law 6);
 * every grant names the hero and the labour as its cause (Law 12).
 */
export function performResolveMend(ctx: Ctx, causeId: string): void {
  const c = ctx.campaign
  for (const heroId of Object.keys(c.assignments).sort()) {
    const a = c.assignments[heroId]?.city
    if (!a) continue
    const row = LABOURS.find((l) => l.key === a.target)
    if (!row) continue
    if (row.kind === 'labour') {
      const y = yieldOf(c, row.key)
      if (y && y.amount > 0) applyGrant(ctx, y.currency, y.amount, `${causeId}:${row.key}:${heroId}`)
    } else if (row.kind === 'heal') {
      const h = c.roster[heroId]!
      if (h.wound > 0) setWound(ctx, heroId, h.wound - 1, `${causeId}:${row.key}:${heroId}`)
    }
  }
}
