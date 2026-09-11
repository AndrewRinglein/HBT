// V2 quests dispatch in City and remain exclusive through their due Field battles.
// Current report rewards resolve together with party release; authored V2 encounters follow separately.
import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, applyCommit, applyRelease, applyGrant, setQuestInFlight, setQuestWeeksLeft, setQuestResolved } from './mutate.js'
import { canCommit, slotsOf } from './assignments.js'
import { rollOf } from './rng.js'
import { CUP_IDS } from '../content/cups.js'
import { QUESTS, questRowOf, type QuestRow } from '../content/quests.js'
import { stageRowOf } from '../content/stages.js'
import { canUseActivity } from './activity.js'

// ── reading ─────────────────────────────────────────────────────────────────

/** What the Quest Stage puts up: every quest not in flight, by id. Empty anywhere else. */
export function listQuestOffers(campaign: CampaignState): string[] {
  if (!canUseActivity(campaign, 'quests')) return []
  return QUESTS.filter((q) => !campaign.quests[q.id]).map((q) => q.id).sort()
}

/** Does a party satisfy a row's requirement slots? A slot accepts a class id, or 'any'. Pure. */
export function whyNotRequirements(campaign: CampaignState, row: QuestRow, heroIds: readonly HeroId[]): string | null {
  const unclaimed = [...heroIds]
  for (const slot of row.requires) {
    let filled = 0
    for (let i = 0; i < unclaimed.length && filled < slot.min; ) {
      const h = campaign.roster[unclaimed[i]!]
      if (h && (slot.accepts === 'any' || h.classes.includes(slot.accepts))) { unclaimed.splice(i, 1); filled++ } else i++
    }
    if (filled < slot.min) return `needs ${slot.min} × ${slot.accepts}, has ${filled}`
  }
  return null
}

export function whyNotSendQuest(campaign: CampaignState, questId: string, heroIds: readonly HeroId[]): string | null {
  if (!listQuestOffers(campaign).includes(questId)) {
    return campaign.quests[questId] ? `'${questId}' is already in flight` : `'${questId}' is not offered at ${campaign.cursor.stage}`
  }
  const row = questRowOf(questId)
  if (new Set(heroIds).size !== heroIds.length) return 'a hero is named twice'
  for (const id of heroIds) {
    for (const slot of slotsOf('quest')) {
      if (!canCommit(campaign, id, { kind: 'quest', target: questId, weeks: row.weeks })) return `'${id}' cannot take a quest in the ${slot} slot`
    }
  }
  return whyNotRequirements(campaign, row, heroIds)
}

export const canSendQuest = (campaign: CampaignState, questId: string, heroIds: readonly HeroId[]): boolean => whyNotSendQuest(campaign, questId, heroIds) === null

/** Whether a quest comes home: its row's odds against a roll keyed by the quest and the Week it was sent. Pure. */
export function resolveQuestOdds(campaign: CampaignState, questId: string, sentWeek: number): boolean {
  const row = questRowOf(questId)
  return rollOf(campaign, CUP_IDS.quest, [questId, sentWeek]) % 100 < row.odds
}

// ── doing ───────────────────────────────────────────────────────────────────

export function performSendQuest(ctx: Ctx, questId: string, heroIds: readonly HeroId[], causeId: string): void {
  const why = whyNotSendQuest(ctx.campaign, questId, heroIds)
  if (why) throw new Error(`performSendQuest refused: ${why}`)
  const row = questRowOf(questId)
  for (const id of [...heroIds].sort()) {
    for (const slot of slotsOf('quest')) applyCommit(ctx, id, slot, { kind: 'quest', target: questId, weeks: row.weeks }, causeId)
  }
  setQuestInFlight(ctx, { id: questId, heroes: [...heroIds].sort(), weeksLeft: row.weeks, sentWeek: ctx.campaign.week, dueWeek: ctx.campaign.week + row.weeks }, causeId)
}

/** Due Field reports pay and release together, after Conquest and Defense. */
export function tickQuests(ctx: Ctx, causeId: string): void {
  if (ctx.campaign.cursor.fieldStep !== 'quests' || stageRowOf(ctx.campaign.cursor.stage).spends !== 'assignments') throw new Error('tickQuests refused: reports resolve only in the due Field quest step')
  for (const id of Object.keys(ctx.campaign.quests).sort()) {
    const q = ctx.campaign.quests[id]!
    if (ctx.campaign.week < q.dueWeek) continue
    const row = questRowOf(id)
    const won = resolveQuestOdds(ctx.campaign, id, q.sentWeek)
    if (won) for (const cur of Object.keys(row.reward).sort()) applyGrant(ctx, cur, row.reward[cur]!, `${id}.week-${ctx.campaign.week}`)
    for (const heroId of q.heroes) applyRelease(ctx, heroId, 'city', causeId)
    setQuestResolved(ctx, id, won, causeId)
  }
}

/** Display clocks tick without releasing a quest's exclusive assignment. */
export function tickQuestClocks(ctx: Ctx, nextWeek: number, causeId: string): void {
  for (const q of Object.values(ctx.campaign.quests)) setQuestWeeksLeft(ctx, q.id, Math.max(0, q.dueWeek - nextWeek), causeId)
}
