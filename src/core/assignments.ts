// Assignments — the roster-pressure engine. GAME-ARCHITECTURE.md §2.3, amended
// Law 17 (SKELETON-SETTLED.md:102): two slots per hero per Week — one in the
// FIELD (quest · defend · conquer), one in the CITY (a Mend labour, a building
// service, healing) — and a quest takes both, because the hero is away.
//
// "One hero, one thing, one Week. This is the constraint the whole strategic
// layer exists to create, so it gets one function and one field, and nothing
// else in the codebase is allowed to have an opinion about hero availability."
// commitmentOf is that function; tools/scan.mjs one-availability is the teeth
// (ISC-010): the words it answers with appear nowhere else in src/core.
//
//   commitmentOf(campaign, heroId, slot)
//     → 'free' | 'onQuest' | 'committed' | 'wounded' | 'unavailable' | 'captured' | 'dead'
//
// The channels, in the order they are answered: dead (the roster keeps the
// dead for the Memorial) · captured · Severe wound (KINGDOM-DESIGN.md §9 —
// Wounded and Badly Wounded still deploy, with the penalty) · the Week's
// unavailability roll (§3 — "a third availability channel", ruled 2026-08-23 as
// a third return value, not a second question) · on a quest, whichever slot
// you ask about · committed in the slot asked about · free.
//
// canCommit is the only legality check; performCommit calls it and refuses
// loudly. Assignments hold for `weeks` and are released at the Week boundary
// by tickAssignments.

import type { CampaignState, HeroId, Assignment } from './campaign.js'
import { type Ctx, applyCommit, applyRelease } from './mutate.js'
import { WOUND_UNAVAILABLE } from '../content/wounds.js'
import { stageRowOf } from '../content/stages.js'

export type Slot = 'field' | 'city'
export type Commitment = 'free' | 'onQuest' | 'committed' | 'wounded' | 'unavailable' | 'captured' | 'dead'

export function commitmentOf(campaign: CampaignState, heroId: HeroId, slot: Slot): Commitment {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  if (h.lifeState === 'dead') return 'dead'
  if (campaign.captured.includes(heroId)) return 'captured'
  if (h.wound >= WOUND_UNAVAILABLE) return 'wounded'
  if (campaign.unavailable.some((a) => a.heroId === heroId)) return 'unavailable'
  const a = campaign.assignments[heroId]
  if (a?.field?.kind === 'quest' || a?.city?.kind === 'quest') return 'onQuest'
  if (a?.[slot]) return 'committed'
  return 'free'
}

/** Which slot an Assignment kind takes — a quest takes both. */
export function slotsOf(kind: Assignment['kind']): Slot[] {
  switch (kind) {
    case 'engagement': return ['field']
    case 'quest': return ['field', 'city']
    default: return ['city']
  }
}

/** The only legality check: every slot the Assignment needs must be free. */
export function canCommit(campaign: CampaignState, heroId: HeroId, assignment: Assignment): boolean {
  if (!campaign.roster[heroId]) return false
  if (!Number.isInteger(assignment.weeks) || assignment.weeks < 1) return false
  return slotsOf(assignment.kind).every((slot) => commitmentOf(campaign, heroId, slot) === 'free')
}

export function performCommit(ctx: Ctx, heroId: HeroId, assignment: Assignment, causeId: string): void {
  if (!canCommit(ctx.campaign, heroId, assignment)) {
    const why = slotsOf(assignment.kind).map((s) => `${s}: ${ctx.campaign.roster[heroId] ? commitmentOf(ctx.campaign, heroId, s) : 'no such hero'}`).join(', ')
    throw new Error(`performCommit refused for '${heroId}' (${assignment.kind} → ${assignment.target}): ${why}`)
  }
  for (const slot of slotsOf(assignment.kind)) applyCommit(ctx, heroId, slot, assignment, causeId)
}

export function performRelease(ctx: Ctx, heroId: HeroId, slot: Slot, causeId: string): void {
  if (!ctx.campaign.assignments[heroId]?.[slot]) throw new Error(`performRelease refused: '${heroId}' holds nothing in the ${slot} slot`)
  applyRelease(ctx, heroId, slot, causeId)
}

/** Who a Stage may still send: free in the slot the Stage row spends. Sorted by id (Law 6). */
export function listAvailable(campaign: CampaignState, stageId: string): HeroId[] {
  const row = stageRowOf(stageId)
  const slot: Slot | null = row.spends === 'assignments' ? 'field' : row.spends === 'city-assignments' ? 'city' : null
  if (!slot) return []
  return Object.keys(campaign.roster).filter((id) => commitmentOf(campaign, id, slot) === 'free').sort()
}

/** The Week boundary: every Assignment's clock ticks; one that has run out is released. */
export function tickAssignments(ctx: Ctx, causeId: string): void {
  for (const heroId of Object.keys(ctx.campaign.assignments).sort()) {
    for (const slot of ['field', 'city'] as const) {
      const a = ctx.campaign.assignments[heroId]?.[slot]
      if (!a) continue
      if (a.weeks <= 1) applyRelease(ctx, heroId, slot, causeId)
      else applyCommit(ctx, heroId, slot, { ...a, weeks: a.weeks - 1 }, causeId)
    }
  }
}
