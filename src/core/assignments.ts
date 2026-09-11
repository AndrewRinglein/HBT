// V2: one exclusive assignment, or fighting throughout the Field half.
import type { CampaignState, HeroId, Assignment } from './campaign.js'
import { type Ctx, applyCommit, applyRelease } from './mutate.js'
import { WOUND_UNAVAILABLE } from '../content/wounds.js'
import { EXHAUSTED_BADGE } from '../content/recovery.js'
import { stageRowOf } from '../content/stages.js'

export type Slot = 'field' | 'city'
export type Commitment = 'free' | 'onQuest' | 'committed' | 'wounded' | 'unavailable' | 'captured' | 'dead' | 'exhausted'

export function commitmentOf(campaign: CampaignState, heroId: HeroId, slot: Slot, recovery = false): Commitment {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  if (h.lifeState === 'dead') return 'dead'
  if (campaign.captured.includes(heroId)) return 'captured'
  if (!recovery && h.wound >= WOUND_UNAVAILABLE) return 'wounded'
  if (campaign.unavailable.some((a) => a.heroId === heroId)) return 'unavailable'
  const a = campaign.assignments[heroId]
  if (a?.kind === 'quest') return 'onQuest'
  if (a || (slot === 'city' && campaign.foughtThisWeek.includes(heroId))) return 'committed'
  if (!recovery && h.badges.includes(EXHAUSTED_BADGE)) return 'exhausted'
  return 'free'
}

/** The activity asked about; this is not a second saved assignment slot. */
export function slotsOf(kind: Assignment['kind']): Slot[] {
  switch (kind) {
    case 'engagement': return ['field']
    case 'quest': return ['city']
    default: return ['city']
  }
}

/** The single legality check, including recovery exceptions and weekly participation. */
export function canCommit(campaign: CampaignState, heroId: HeroId, assignment: Assignment): boolean {
  if (!campaign.roster[heroId]) return false
  if (!Number.isInteger(assignment.weeks) || assignment.weeks < 1) return false
  return slotsOf(assignment.kind).every((slot) => commitmentOf(campaign, heroId, slot, assignment.kind === 'rest' || assignment.kind === 'heal') === 'free')
}

export function performCommit(ctx: Ctx, heroId: HeroId, assignment: Assignment, causeId: string): void {
  if (!canCommit(ctx.campaign, heroId, assignment)) {
    const why = slotsOf(assignment.kind).map((s) => `${s}: ${ctx.campaign.roster[heroId] ? commitmentOf(ctx.campaign, heroId, s) : 'no such hero'}`).join(', ')
    throw new Error(`performCommit refused for '${heroId}' (${assignment.kind} → ${assignment.target}): ${why}`)
  }
  for (const slot of slotsOf(assignment.kind)) applyCommit(ctx, heroId, slot, assignment, causeId)
}

export function performRelease(ctx: Ctx, heroId: HeroId, slot: Slot, causeId: string): void {
  if (!ctx.campaign.assignments[heroId]) throw new Error(`performRelease refused: '${heroId}' holds nothing in the ${slot} slot`)
  if (ctx.campaign.assignments[heroId]!.kind === 'quest') throw new Error('performRelease refused: a quest returns only at Field resolution')
  applyRelease(ctx, heroId, slot, causeId)
}

/** Who a Stage may still send: free in the slot the Stage row spends. Sorted by id (Law 6). */
export function listAvailable(campaign: CampaignState, stageId: string): HeroId[] {
  const row = stageRowOf(stageId)
  const slot: Slot | null = row.spends === 'assignments' ? 'field' : row.spends === 'city-assignments' ? 'city' : null
  if (!slot) return []
  return Object.keys(campaign.roster).filter((id) => commitmentOf(campaign, id, slot) === 'free').sort()
}

/** Quest clocks belong to Field resolution; weekly work expires at the boundary. */
export function tickAssignments(ctx: Ctx, causeId: string): void {
  for (const heroId of Object.keys(ctx.campaign.assignments).sort()) {
    const a = ctx.campaign.assignments[heroId]!
    if (a.kind === 'quest') continue
    const slot = slotsOf(a.kind)[0]!
    if (a.weeks <= 1) applyRelease(ctx, heroId, slot, causeId)
    else applyCommit(ctx, heroId, slot, { ...a, weeks: a.weeks - 1 }, causeId)
  }
}
