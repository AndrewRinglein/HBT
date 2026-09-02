// Quests — GAME-ARCHITECTURE.md §2.6 QUESTS: "Dispatch heroes on quests. They
// leave for N Weeks and resolve without you." A quest takes BOTH of a hero's
// slots (GLOSSARY.md: "questing costs two actions, fighting costs one"); the
// requirement slots are §2.3's floor. The one row is src/content/quests.ts.
//
// canX asks, performX does and refuses loudly; listX is sorted; the Week
// boundary (week.ts) ticks the clock and calls resolve.

import type { CampaignState, HeroId } from './campaign.js'
import { type Ctx, applyCommit, applyGrant, setQuestInFlight, setQuestWeeksLeft, setQuestResolved } from './mutate.js'
import { canCommit, slotsOf } from './assignments.js'
import { rollOf } from './rng.js'
import { CUP_IDS } from '../content/cups.js'
import { QUESTS, questRowOf, type QuestRow } from '../content/quests.js'
import { stageRowOf } from '../content/stages.js'

// ── reading ─────────────────────────────────────────────────────────────────

/** What the Quest Stage puts up: every quest not in flight, by id. Empty anywhere else. */
export function listQuestOffers(campaign: CampaignState): string[] {
  if (campaign.cursor.step !== 'open' || stageRowOf(campaign.cursor.stage).offers !== 'quests') return []
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
  setQuestInFlight(ctx, { id: questId, heroes: [...heroIds].sort(), weeksLeft: row.weeks }, causeId)
}

/**
 * The Week boundary: every quest's clock ticks; one that has run out comes
 * home and pays. The heroes' Assignments run out on the same tick
 * (tickAssignments) — the two clocks were set together and stay together.
 */
export function tickQuests(ctx: Ctx, causeId: string): void {
  for (const id of Object.keys(ctx.campaign.quests).sort()) {
    const q = ctx.campaign.quests[id]!
    if (q.weeksLeft > 1) { setQuestWeeksLeft(ctx, id, q.weeksLeft - 1, causeId); continue }
    const row = questRowOf(id)
    const won = resolveQuestOdds(ctx.campaign, id, ctx.campaign.week - (row.weeks - 1))
    if (won) for (const cur of Object.keys(row.reward).sort()) applyGrant(ctx, cur, row.reward[cur]!, `${id}.week-${ctx.campaign.week}`)
    setQuestResolved(ctx, id, won, causeId)
  }
}
