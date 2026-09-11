// V2 Week: Field (Conquest → Defense → due quests), then unordered City.
import type { CampaignState, Engagement, TerritoryId } from './campaign.js'
import { type Ctx, emit, setCursor, setFoughtThisWeek } from './mutate.js'
import { rollOf } from './rng.js'
import { STAGES, FIELD_STEPS, stageRowOf, type StageRow } from '../content/stages.js'
import { CUP_IDS } from '../content/cups.js'
import { SWITCHES } from '../content/switches.js'
import { beginCombatPrep } from './prep.js'
import { listConquerable, resolveThreat, performLose } from './map.js'
import { performExpireAbsences } from './absence.js'
import { tickAssignments } from './assignments.js'
import { performResolveMend } from './mend.js'
import { performAdvanceOpening } from './opening.js'
import { closeEquipSession } from './equip-session.js'
import { tickQuests, tickQuestClocks, listDueQuests } from './quests.js'
export { listConquerable } from './map.js'

// ── reading ─────────────────────────────────────────────────────────────────

export const weekOf = (campaign: CampaignState): number => campaign.week
export const stageOf = (campaign: CampaignState): StageRow => {
  const row = stageRowOf(campaign.cursor.stage)
  return row.spends === 'assignments' ? { ...row, ...FIELD_STEPS.find((s) => s.key === campaign.cursor.fieldStep) } : row
}
export const cursorOf = (campaign: CampaignState) => campaign.cursor

/** The Stage may be left: only from its open step — never mid-prep, mid-battle or before the writer. */
export function canAdvance(campaign: CampaignState): boolean {
  return campaign.cursor.step === 'open' && !(campaign.cursor.attack && campaign.territories[campaign.cursor.attack]?.kingdom)
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
  if (row.offers === 'city') performExpireAbsences(ctx, causeId)
  setCursor(ctx, { stage: row.id, fieldStep: row.spends === 'assignments' ? FIELD_STEPS[0]!.key : null,
    conquestAttempted: row.spends === 'assignments' ? false : ctx.campaign.cursor.conquestAttempted,
    step: 'open', prepStep: null, engagement: null, attack: null, fought: 0, battle: null }, causeId)
  emit(ctx, 'stage.begun', causeId, { stageId: row.id, week: ctx.campaign.week, attack: null })
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
  if (stageOf(ctx.campaign).offers === 'city') performResolveMend(ctx, `${ctx.campaign.cursor.stage}.week-${ctx.campaign.week}`)
  emit(ctx, 'stage.ended', causeId, { stageId: ctx.campaign.cursor.stage, week: ctx.campaign.week })
}

export function beginWeek(ctx: Ctx, causeId: string): void {
  const first = STAGES[0]
  if (!first) throw new Error('src/content/stages.ts declares no Stages')
  emit(ctx, 'week.begun', causeId, { week: ctx.campaign.week })
  beginStage(ctx, first.id, causeId)
}

/** The Week boundary: what ticks between one Week and the next — Assignments, quests, the Week's absences. Wounds join when they exist. */
export function tickWeek(ctx: Ctx, causeId: string): void {
  tickAssignments(ctx, causeId)
  tickQuestClocks(ctx, ctx.campaign.week + 1, causeId)
  setFoughtThisWeek(ctx, [], causeId)
  setCursor(ctx, { week: ctx.campaign.week + 1, recruited: 0, sold: [] }, causeId)
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
  if (ctx.campaign.cursor.fieldStep === 'quests' && listDueQuests(ctx.campaign).length) {
    tickQuests(ctx, causeId)
    return
  }
  // leaving the Stage with the roster's equip session open commits it — "once you leave that screen, it's saved"
  if (ctx.campaign.cursor.equipSession?.where === 'roster') closeEquipSession(ctx, causeId)
  // Week 0 is the opening's: no Stages, just drafts and the five battles, until the Kingdom Territory is taken
  if (ctx.campaign.cursor.prologue !== null) { performAdvanceOpening(ctx, causeId); return }
  const fieldAt = FIELD_STEPS.findIndex((s) => s.key === ctx.campaign.cursor.fieldStep)
  const nextField = FIELD_STEPS[fieldAt + 1]
  if (stageRowOf(ctx.campaign.cursor.stage).spends === 'assignments' && nextField) {
    // Leaving a non-castle attack unanswered concedes its land. Castle refusal
    // is blocked by canAdvance before any mutation, including equip close.
    if (ctx.campaign.cursor.attack) performLose(ctx, ctx.campaign.cursor.attack, causeId)
    const attack = nextField.targets === 'rolled' ? resolveThreat(ctx.campaign, ctx.campaign.week, !ctx.campaign.cursor.conquestAttempted) : null
    setCursor(ctx, { fieldStep: nextField.key, attack, fought: 0, engagement: null }, causeId)
    if (nextField.offers === 'quest-results') tickQuests(ctx, causeId)
    return
  }
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
  setCursor(ctx, { engagement: e, attack: null, conquestAttempted: c.cursor.conquestAttempted || row.targets === 'conquerable' }, causeId)
  emit(ctx, 'engagement.offered', causeId, { engagementId: e.id, kind: e.kind, territoryId: t.id })
  beginCombatPrep(ctx, causeId)
  return e
}
