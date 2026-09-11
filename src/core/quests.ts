// V2 quests: explicit staffing, deterministic saved outcomes, and one completion per run.
import type { CampaignState, HeroId, QuestInFlight, QuestOutcome, Engagement, QuestReward } from './campaign.js'
import { type Ctx, applyCommit, applyRelease, applyGrant, applyXp, applyRescue, setQuestInFlight, setQuestWeeksLeft, setQuestResolved, setQuestOutcome, setCursor } from './mutate.js'
import { canCommit } from './assignments.js'
import { rollOf } from './rng.js'
import { CUP_IDS } from '../content/cups.js'
import { QUESTS, questRowOf, type QuestRow } from '../content/quests.js'
import { CIVILIANS, heroRowOf } from '../content/heroes.js'
import { groupOf } from '../content/classes.js'
import { canUseActivity } from './activity.js'
import { beginCombatPrep } from './prep.js'
import { listLevelUps } from './rewards.js'
import { engagementKindOf } from '../content/engagements.js'

/** Authored order: the two opening quests, then the retained Escort. */
export function listQuestOffers(c: CampaignState): string[] {
  return canUseActivity(c, 'quests') ? QUESTS.filter(q => !c.quests[q.id]).map(q => q.id) : []
}
export function whyNotRequirements(c: CampaignState, row: QuestRow, ids: readonly HeroId[], lead: HeroId | null = null): string | null {
  if (row.staffing.kind === 'people') {
    if (ids.length < row.staffing.min || (row.staffing.max !== null && ids.length > row.staffing.max)) return `needs ${row.staffing.min}${row.staffing.max === null ? ' or more' : row.staffing.max === row.staffing.min ? ' exactly' : ' to ' + row.staffing.max} people`
    if (lead !== null) return 'this quest has no designated lead'
  } else {
    if (!lead || !ids.includes(lead) || !c.roster[lead] || groupOf(c.roster[lead]!.classes) !== 'hero') return 'needs a designated hero lead in the party'
    if (ids.length > row.staffing.maxEscorts + 1) return `at most ${row.staffing.maxEscorts} escorts`
  }
  return null
}
export function whyNotSendQuest(c: CampaignState, id: string, ids: readonly HeroId[], lead: HeroId | null = null): string | null {
  if (!listQuestOffers(c).includes(id)) return c.quests[id] ? `'${id}' is already in flight` : `'${id}' is not offered at ${c.cursor.stage}`
  if (new Set(ids).size !== ids.length) return 'a person is named twice'
  const row = questRowOf(id)
  for (const h of ids) if (!canCommit(c, h, { kind: 'quest', target: id, weeks: row.weeks })) return `'${h}' cannot take a quest this Week`
  return whyNotRequirements(c, row, ids, lead)
}
export const canSendQuest = (c: CampaignState, id: string, ids: readonly HeroId[], lead: HeroId | null = null): boolean => whyNotSendQuest(c, id, ids, lead) === null
export function resolveQuestOdds(c: CampaignState, id: string, sentWeek: number): boolean {
  return rollOf(c, CUP_IDS.quest, [id, sentWeek, 'success']) % 100 < questRowOf(id).odds
}
export function performSendQuest(ctx: Ctx, id: string, ids: readonly HeroId[], cause: string, lead: HeroId | null = null): void {
  const why = whyNotSendQuest(ctx.campaign, id, ids, lead)
  if (why) throw new Error(`performSendQuest refused: ${why}`)
  const row = questRowOf(id), sentWeek = ctx.campaign.week
  for (const h of [...ids].sort()) applyCommit(ctx, h, 'city', { kind: 'quest', target: id, weeks: row.weeks }, cause)
  setQuestInFlight(ctx, { id, runId: `${id}.week-${sentWeek}`, leadHeroId: lead, heroes: [...ids].sort(), weeksLeft: row.weeks, sentWeek, dueWeek: sentWeek + row.weeks, outcome: null }, cause)
}
/** The integer percentile boundary, separate from the named seeded draw. */
export function questCombatAt(row: QuestRow, escorts: number, percentile: number): boolean {
  return !!row.encounter && escorts < row.encounter.safeEscorts && percentile < row.encounter.pct
}
export function resolveQuestOutcome(c: CampaignState, q: QuestInFlight): QuestOutcome {
  const row = questRowOf(q.id), enc = row.encounter
  if (enc && questCombatAt(row, q.heroes.length - 1, rollOf(c, CUP_IDS.quest, [q.runId, 'combat']) % 100)) {
    return { kind: 'battle', engagement: { id: `${q.runId}.battle`, questRunId: q.runId, kind: enc.kind, territoryId: null, mapId: enc.mapId,
      enemies: [...enc.enemies], condition: null, councilOffer: [], tactic: null, deployed: [...q.heroes].sort(), seed: rollOf(c, CUP_IDS.battle, [q.runId]) } }
  }
  const won = resolveQuestOdds(c, q.id, q.sentWeek)
  const pool = [...CIVILIANS].sort((a, b) => a.id.localeCompare(b.id))
  if (won && row.rescueCivilian && !pool.length) throw new Error('quest rescue pool is empty')
  const template = won && row.rescueCivilian ? pool[rollOf(c, CUP_IDS.quest, [q.runId, 'civilian']) % pool.length]! : null
  const rescued = template ? { id: `${q.runId}.civilian`, templateId: template.id } : null
  return { kind: 'report', won, rescued }
}
export function listDueQuests(c: CampaignState): QuestInFlight[] {
  return QUESTS.flatMap(row => c.quests[row.id] && c.quests[row.id]!.dueWeek <= c.week ? [c.quests[row.id]!] : [])
}
/** A supplied kind cannot erase the ownership established by the cursor or pending run. */
export function resolveBattleQuest(c: CampaignState, e: Engagement): QuestInFlight | null {
  const pending = Object.values(c.quests).some(q => q.outcome?.kind === 'battle' && q.outcome.engagement.id === e.id)
  const cursorQuest = c.cursor.engagement?.id === e.id && engagementKindOf(c.cursor.engagement.kind).rewards === 'quest'
  return pending || cursorQuest || e.questRunId !== undefined || engagementKindOf(e.kind).rewards === 'quest' ? questForEngagement(c, e) : null
}
/** Verify ownership before ANY battle or report mutations. A quest keeps its assignment until completion. */
export function questForEngagement(c: CampaignState, e: Engagement): QuestInFlight {
  const q = Object.values(c.quests).find(q => q.runId === e.questRunId)
  if (!q || q.outcome?.kind !== 'battle' || q.outcome.engagement.id !== e.id || q.dueWeek > c.week || c.cursor.fieldStep !== 'quests') throw new Error('quest battle has no matching pending due run')
  if (JSON.stringify(e.deployed) !== JSON.stringify(q.heroes) || e.kind !== q.outcome.engagement.kind || e.mapId !== q.outcome.engagement.mapId || JSON.stringify(e.enemies) !== JSON.stringify(q.outcome.engagement.enemies)) throw new Error('quest battle party or encounter differs from its dispatched run')
  validateQuestCompletion(c, q)
  return q
}
function validateQuestParty(c: CampaignState, q: QuestInFlight): void {
  if (c.quests[q.id] !== q || !Array.isArray(q.heroes) || new Set(q.heroes).size !== q.heroes.length || !q.heroes.length) throw new Error('quest completion has no valid pending run')
  const row = questRowOf(q.id)
  const why = whyNotRequirements(c, row, q.heroes, q.leadHeroId)
  if (why) throw new Error(`quest party: ${why}`)
  for (const h of q.heroes) if (!c.roster[h] || c.assignments[h]?.kind !== 'quest' || c.assignments[h]?.target !== q.id) throw new Error('quest party no longer owns its assignment')
}
function validateQuestCompletion(c: CampaignState, q: QuestInFlight): void {
  validateQuestParty(c, q)
  if (!q.outcome) throw new Error('quest completion has no prepared outcome')
  const row = questRowOf(q.id)
  for (const [cur, n] of Object.entries(row.reward)) if (!(cur in c.purse) || !Number.isInteger(n) || n < 0) throw new Error('invalid quest payout')
  if (q.outcome.kind === 'report') {
    const out = q.outcome
    if (typeof out.won !== 'boolean') throw new Error('invalid quest report result')
    if (out.won && row.rescueCivilian) {
      const r = out.rescued
      if (!r || Object.keys(r).sort().join(',') !== 'id,templateId' || r.id !== `${q.runId}.civilian` || !CIVILIANS.some(h => h.id === r.templateId)) throw new Error('invalid quest rescue identity; body comes only from authored content')
      if (c.roster[r.id]) throw new Error('quest rescue identity already exists')
    } else if (out.rescued !== null) throw new Error('unexpected quest rescue identity')
  }
}
/** Only the report acknowledgment and battle writer call this completion. */
export function performCompleteQuest(ctx: Ctx, q: QuestInFlight, won: boolean, cause: string): QuestReward {
  validateQuestCompletion(ctx.campaign, q)
  const row = questRowOf(q.id), reward: QuestReward = { runId: q.runId, fixedXp: [], grants: [] }
  if (won) {
    for (const cur of Object.keys(row.reward).sort()) {
      applyGrant(ctx, cur, row.reward[cur]!, q.runId)
      reward.grants.push({ currency: cur, amount: row.reward[cur]! })
    }
    const recipients = row.xp.recipient === 'lead' ? [q.leadHeroId!] : q.heroes
    for (const id of recipients) if (row.xp.amount > 0 && ctx.campaign.roster[id]!.lifeState === 'alive') {
      applyXp(ctx, id, row.xp.amount, q.runId)
      reward.fixedXp.push({ heroId: id, amount: row.xp.amount })
    }
    if (q.outcome?.kind === 'report' && q.outcome.rescued) {
      const r = q.outcome.rescued
      applyRescue(ctx, { ...heroRowOf(r.templateId), id: r.id, templateId: r.templateId }, q.runId)
    }
  }
  for (const h of q.heroes) applyRelease(ctx, h, 'city', cause)
  setQuestResolved(ctx, q.id, won, cause)
  return reward
}
/** Prepare at most one due outcome; its saved report or battle blocks City. */
export function tickQuests(ctx: Ctx, cause: string): void {
  const c = ctx.campaign
  if (c.cursor.fieldStep !== 'quests' || c.cursor.step !== 'open') throw new Error('tickQuests refused: finish the current Field outcome first')
  const q = listDueQuests(c)[0]
  if (!q) return
  if (!q.outcome) setQuestOutcome(ctx, q.id, resolveQuestOutcome(c, q), cause)
  validateQuestCompletion(c, q)
  if (q.outcome!.kind === 'report') setCursor(ctx, { step: 'questReport', questReport: q.runId }, cause)
  else {
    setCursor(ctx, { engagement: structuredClone(q.outcome!.engagement), questReport: null }, cause)
    beginCombatPrep(ctx, cause)
  }
}
export function viewQuestReport(c: CampaignState): QuestInFlight & { outcome: Extract<QuestOutcome, { kind: 'report' }> } {
  const q = Object.values(c.quests).find(q => q.runId === c.cursor.questReport)
  if (c.cursor.step !== 'questReport' || c.cursor.fieldStep !== 'quests' || !q || q.outcome?.kind !== 'report' || q.dueWeek > c.week) throw new Error('quest report refused: no pending due report')
  validateQuestCompletion(c, q)
  return q as QuestInFlight & { outcome: Extract<QuestOutcome, { kind: 'report' }> }
}
export function performAcknowledgeQuest(ctx: Ctx, cause: string): void {
  const q = viewQuestReport(ctx.campaign)
  performCompleteQuest(ctx, q, q.outcome.won, cause)
  setCursor(ctx, { questReport: null, step: listLevelUps(ctx.campaign).length ? 'levelUp' : 'open' }, cause)
}
export function tickQuestClocks(ctx: Ctx, nextWeek: number, cause: string): void {
  for (const q of Object.values(ctx.campaign.quests)) setQuestWeeksLeft(ctx, q.id, Math.max(0, q.dueWeek - nextWeek), cause)
}

/** Saves must retain the dispatched ownership and any pending outcome; no V1 defaults. */
export function validateQuestSave(c: CampaignState): void {
  if (!c.quests || typeof c.quests !== 'object' || Array.isArray(c.quests)) throw new Error('save has invalid quests')
  for (const [id, q] of Object.entries(c.quests)) {
    if (!q || q.id !== id || !Number.isInteger(q.sentWeek) || q.sentWeek < 0 || q.runId !== `${id}.week-${q.sentWeek}` || !Number.isInteger(q.dueWeek) || q.dueWeek <= q.sentWeek || !Number.isInteger(q.weeksLeft) || q.weeksLeft < 0 || !(q.leadHeroId === null || typeof q.leadHeroId === 'string') || !('outcome' in q)) throw new Error('save has an invalid quest run')
    validateQuestParty(c, q)
    if (JSON.stringify(q.heroes) !== JSON.stringify([...q.heroes].sort())) throw new Error('save has an unordered quest party')
    if (q.outcome !== null) {
      if (q.dueWeek > c.week || !q.outcome || !['report', 'battle'].includes(q.outcome.kind)) throw new Error('save has an invalid quest outcome')
      validateQuestCompletion(c, q)
      if (q.outcome.kind === 'battle') {
        const e = q.outcome.engagement
        if (!e || e.questRunId !== q.runId || e.id !== `${q.runId}.battle` || JSON.stringify(e.deployed) !== JSON.stringify(q.heroes) || engagementKindOf(e.kind).rewards !== 'quest') throw new Error('save has an invalid quest encounter')
      }
    }
  }
  if (c.cursor.step === 'questReport') viewQuestReport(c)
  else if (c.cursor.questReport !== null) throw new Error('save has a quest report outside its report step')
  if (c.cursor.engagement && (c.cursor.step === 'prep' || c.cursor.step === 'battle')) resolveBattleQuest(c, c.cursor.engagement)
}
