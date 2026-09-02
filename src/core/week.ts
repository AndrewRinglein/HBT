// The Week — GAME-ARCHITECTURE.md §2.1, §2.2, §2.6 LIFECYCLE.
//
//   Week N ─▶ Buy ─▶ Quest ─▶ Defend ─▶ Conquer ─▶ Build ─▶ Mend ─▶ Week N+1
//
// Six Stages, fixed order, every Week — the order is the Stage rows
// (src/content/stages.ts) and this machine names none of them. A Stage may
// resolve to nothing; it still begins and ends, and says so (stage.begun,
// stage.ended), "because a Stage that is sometimes skipped is a Stage the flow
// forgets to leave." The cursor is the one field a load restores to; every move
// of it is an event.
//
// A Stage that offers an Engagement (its row says which kind) puts the choice
// in front of the player; choosing hands off to Combat Prep, the battle, the
// writer, and the exit lands back here at the same Stage, step 'open', to
// advance from. Conquer is always optional (§2.5 — "guided, not scripted").
// Defend's weekly roll is M6's; until then the Stage offers nothing.

import type { CampaignState, Engagement, TerritoryId } from './campaign.js'
import { type Ctx, emit, setCursor } from './mutate.js'
import { rollOf } from './rng.js'
import { STAGES, stageRowOf, type StageRow } from '../content/stages.js'
import { CUP_IDS } from '../content/cups.js'
import { SWITCHES } from '../content/switches.js'
import { beginCombatPrep } from './prep.js'
import { listConquerable, resolveThreat, performLose } from './map.js'
import { tickAssignments } from './assignments.js'
import { performResolveMend } from './mend.js'
import { performAdvanceOpening } from './opening.js'
export { listConquerable } from './map.js'

// ── reading ─────────────────────────────────────────────────────────────────

export const weekOf = (campaign: CampaignState): number => campaign.week
export const stageOf = (campaign: CampaignState): StageRow => stageRowOf(campaign.cursor.stage)
export const cursorOf = (campaign: CampaignState) => campaign.cursor

/** The Stage may be left: only from its open step — never mid-prep, mid-battle or before the writer. */
export function canAdvance(campaign: CampaignState): boolean {
  return campaign.cursor.step === 'open'
}

/** What this Stage puts in front of the player right now — the row says where its targets come from. Pure. */
export function listStageOffers(campaign: CampaignState): TerritoryId[] {
  const row = stageOf(campaign)
  if (row.offers !== 'engagement' || campaign.cursor.step !== 'open' || campaign.cursor.engagement) return []
  if (campaign.cursor.fought >= SWITCHES.engagementsPerStage) return []
  if (row.targets === 'conquerable') return listConquerable(campaign)
  // 'rolled' — the Week's attack, if the defend roll fired and it is still unanswered
  return campaign.cursor.attack ? [campaign.cursor.attack] : []
}

export function canChooseEngagement(campaign: CampaignState, territoryId: TerritoryId): boolean {
  return listStageOffers(campaign).includes(territoryId)
}

// ── doing ───────────────────────────────────────────────────────────────────

export function beginStage(ctx: Ctx, stageId: string, causeId: string): void {
  const row = stageRowOf(stageId)
  // A Stage whose targets are rolled rolls on entry — once, keyed by the Week,
  // so a reload lands on the same attack.
  const attack = row.targets === 'rolled' ? resolveThreat(ctx.campaign) : null
  setCursor(ctx, { stage: row.id, step: 'open', prepStep: null, engagement: null, attack, fought: 0, battle: null }, causeId)
  emit(ctx, 'stage.begun', causeId, { stageId: row.id, week: ctx.campaign.week, attack })
}

export function endStage(ctx: Ctx, causeId: string): void {
  if (!canAdvance(ctx.campaign)) throw new Error(`endStage refused: the cursor is at step '${ctx.campaign.cursor.step}' of ${ctx.campaign.cursor.stage}`)
  // An attack left unanswered at the end of the Stage is a Territory lost
  // (SKELETON-SETTLED.md:80) — or, for the Kingdom Territory, its stakes cost.
  const attack = ctx.campaign.cursor.attack
  if (attack) {
    performLose(ctx, attack, causeId)
    setCursor(ctx, { attack: null }, causeId)
  }
  // the Stage whose row offers the labours pays them out as it closes
  if (stageOf(ctx.campaign).offers === 'labours') performResolveMend(ctx, `${ctx.campaign.cursor.stage}.week-${ctx.campaign.week}`)
  emit(ctx, 'stage.ended', causeId, { stageId: ctx.campaign.cursor.stage, week: ctx.campaign.week })
}

export function beginWeek(ctx: Ctx, causeId: string): void {
  const first = STAGES[0]
  if (!first) throw new Error('src/content/stages.ts declares no Stages')
  emit(ctx, 'week.begun', causeId, { week: ctx.campaign.week })
  beginStage(ctx, first.id, causeId)
}

/** The Week boundary: what ticks between one Week and the next. Quests and wounds join here when they exist. */
export function tickWeek(ctx: Ctx, causeId: string): void {
  tickAssignments(ctx, causeId)
  setCursor(ctx, { week: ctx.campaign.week + 1, recruited: 0 }, causeId)
}

export function endWeek(ctx: Ctx, causeId: string): void {
  emit(ctx, 'week.ended', causeId, { week: ctx.campaign.week })
  tickWeek(ctx, causeId)
  beginWeek(ctx, causeId)
}

/** Leave this Stage for the next row — or, after the last, for the next Week. */
export function performAdvance(ctx: Ctx, causeId: string): void {
  if (!canAdvance(ctx.campaign)) throw new Error(`performAdvance refused: the cursor is at step '${ctx.campaign.cursor.step}' — finish the Engagement first`)
  if (ctx.campaign.ended) throw new Error('performAdvance refused: the Campaign has ended')
  // Week 0 is the opening's: no Stages, just drafts and the five battles, until the Kingdom Territory is taken
  if (ctx.campaign.cursor.prologue !== null) { performAdvanceOpening(ctx, causeId); return }
  endStage(ctx, causeId)
  const at = STAGES.findIndex((s) => s.id === ctx.campaign.cursor.stage)
  const next = STAGES[at + 1]
  if (next) beginStage(ctx, next.id, causeId)
  else endWeek(ctx, causeId)
}

/**
 * Take what the Stage offers: an Engagement on a Territory, fielded from the
 * Territory's own row, seeded by what it is (the Territory, the Week — Law 4),
 * and handed to Combat Prep.
 */
export function performChooseEngagement(ctx: Ctx, territoryId: TerritoryId, causeId: string): Engagement {
  const c = ctx.campaign
  if (!canChooseEngagement(c, territoryId)) throw new Error(`performChooseEngagement refused: '${territoryId}' is not offered at ${c.cursor.stage} — ${listStageOffers(c).join(', ') || 'nothing is'}`)
  const row = stageOf(c)
  const t = c.territories[territoryId]!
  const e: Engagement = {
    id: `${row.engagementKind}.${t.id.split('.').pop()}.week-${c.week}`,
    kind: row.engagementKind!,
    territoryId: t.id,
    mapId: t.mapId,
    enemies: [...t.enemies],
    condition: null,
    councilOffer: [],
    tactic: null,
    deployed: [],
    seed: rollOf(c, CUP_IDS.battle, [t.id, c.week]) % 1000,
  }
  // taking the field against the Week's attack answers it — whatever the battle then decides
  setCursor(ctx, { engagement: e, attack: null }, causeId)
  emit(ctx, 'engagement.offered', causeId, { engagementId: e.id, kind: e.kind, territoryId: t.id })
  beginCombatPrep(ctx, causeId)
  return e
}
