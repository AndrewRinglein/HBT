import { canUseActivity } from '../core/activity.js'
// Autoplay — the Campaign walked with no human input. The core of the
// cold-start run (ISC-001: "from a new save, with no human input, the run
// advances Week by Week…") and of tools/probe.mts. Mirrors the engine's
// src/sim: a harness over the same functions the screens call, never a second
// path through the rules.
//
// Every decision is a default a caller may replace: which Territory to attack,
// which tactic to take, who to deploy, what the battle decided. The defaults
// are the dullest honest ones — the first offer, the first three deployable,
// a win with every enemy dead — so what the run proves is the MACHINE, not a
// strategy.

import type { CampaignState, TerritoryId } from '../core/campaign.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../core/mutate.js'
import { performAdvance, listStageOffers, performChooseEngagement, canAdvance } from '../core/week.js'
import { prepStepOf, performAdvancePrep, listCouncilOptions, performCouncil, listDeployable, performDeploy, canAdvancePrep } from '../core/prep.js'
import { makeBlankResult, withUnitFate, validateResult } from '../core/result.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../core/reckoning.js'
import { listRewardOffers, performTakeReward, listLevelUps, performLevelUp, performLeaveLevelUp, viewLevelUp } from '../core/rewards.js'
import { viewBattle } from '../view/battle.js'
import type { EngagementResult } from '../core/seam.js'
import { listAvailable } from '../core/assignments.js'
import { stageOf } from '../core/week.js'
import { listLabours, canAssignLabour, performAssignLabour } from '../core/mend.js'
import { listBuildings, whyNotBuild, performBuild } from '../core/build.js'
import { listShopItems, canBuyItem, performBuyItem, canEquip, performEquip } from '../core/shop.js'
import { listDraftOffers, performDraft } from '../core/opening.js'
import { UNLOCKS } from '../content/charter.js'
import { canPurchase, performPurchase } from '../core/charter.js'
import { listQuestOffers, canSendQuest, performSendQuest } from '../core/quests.js'

export type Decisions = {
  /** Which offered Territory to attack, or null to decline. Default: the first. */
  target: (campaign: CampaignState, offers: TerritoryId[]) => TerritoryId | null
  /** Which offered tactic to take, or null to skip. Default: the first. */
  tactic: (campaign: CampaignState, offers: string[]) => string | null
  /** Who to deploy, in order. Default: the first three deployable. */
  deploy: (campaign: CampaignState, deployable: string[]) => string[]
  /** What the battle decided. Default: won, every enemy dead, five turns. */
  outcome: (campaign: CampaignState, blank: EngagementResult) => EngagementResult
  /** Which of the three rewards to keep. Default: the first. */
  reward: (campaign: CampaignState, offers: string[]) => string
  /** The specialty at the first level-up, from the class's offers. Default: the first by id. */
  specialty: (campaign: CampaignState, heroId: string, offers: string[]) => string | undefined
  /** The level-5 pick, an index into the row's options. Default: the first. */
  levelPick: (campaign: CampaignState, heroId: string, options: number) => number
  /** Who works what at Mend. Default: every free hero, cycling through the labours that yield. */
  labours: (campaign: CampaignState, free: string[]) => [string, string][]
  /** Which node to build, of those buildable, or null. Default: the cheapest. */
  build: (campaign: CampaignState, buildable: { territoryId: string; buildingId: string; key: string; salvage: number }[]) => { territoryId: string; buildingId: string; key: string } | null
  /** Which shelf item to buy, or null. Default: the first affordable. */
  buy: (campaign: CampaignState, shelf: string[]) => string | null
  /** Which of the three draftees to take. Default: the first. */
  draft: (campaign: CampaignState, offers: string[]) => string
  /** Which Charter purchase to make, of those purchasable, or null. Default: the first in row order. */
  purchase: (campaign: CampaignState, purchasable: string[]) => string | null
  /** Which offered quest to send, and whom, or null. Default: the first quest, the last free hero — if four or more are free, so the field is not stripped. */
  quest: (campaign: CampaignState, offers: string[], free: string[]) => { questId: string; heroIds: string[] } | null
}

export const DEFAULTS: Decisions = {
  target: (_c, offers) => offers[0] ?? null,
  tactic: (_c, offers) => offers[0] ?? null,
  deploy: (_c, deployable) => deployable.slice(0, 3),
  outcome: (_c, blank) => {
    let r = blank
    blank.units.filter((u) => u.side === 'enemy').forEach((u) => { r = withUnitFate(r, 'enemy', u.index, { lifeState: 'dead' }) })
    return { ...r, outcome: 'heroClear', turns: 5, heroPhases: 5, enemyPhases: 4 }
  },
  reward: (_c, offers) => offers[0]!,
  specialty: (_c, _h, offers) => offers[0],
  levelPick: () => 0,
  labours: (_c, free) => {
    const keys = listLabours().filter((l) => l.currency).map((l) => l.key)
    return free.map((h, i) => [h, keys[i % keys.length]!] as [string, string])
  },
  // spread the Salvage: the building with the fewest nodes bought first, then its cheapest
  build: (c, buildable) => {
    const bought = (id: string) => listBuildings(c).filter((b) => b.building.id === id).reduce((s, b) => s + b.building.nodes.filter((k) => (b.row.nodes.find((n) => n.key === k)?.salvage ?? 0) > 0).length, 0)
    return [...buildable].sort((a, b) => bought(a.buildingId) - bought(b.buildingId) || a.salvage - b.salvage || a.key.localeCompare(b.key))[0] ?? null
  },
  buy: (_c, shelf) => shelf[0] ?? null,
  draft: (_c, offers) => offers[0]!,
  purchase: (_c, purchasable) => purchasable[0] ?? null,
  quest: (_c, offers, free) => (offers[0] && free.length >= 4 ? { questId: offers[0], heroIds: [free[free.length - 1]!] } : null),
}

/** Play the Engagement on the cursor through prep, the panel, the writer and out. */
export function playEngagement(ctx: Ctx, d: Decisions, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.step !== 'prep') throw new Error(`playEngagement: the cursor is at '${c.cursor.step}', not prep`)
  while (c.cursor.step === 'prep') {
    const step = prepStepOf(c)
    if (step === 'council') performCouncil(ctx, d.tactic(c, listCouncilOptions(c).map((t) => t.id)), causeId)
    if (step === 'deploy') for (const h of d.deploy(c, listDeployable(c))) performDeploy(ctx, h, causeId)
    if (step === 'equip') for (const item of [...c.stash]) { const h = c.cursor.engagement!.deployed.find((x) => canEquip(c, x, item)); if (h) performEquip(ctx, h, item, causeId) }
    if (!canAdvancePrep(c)) throw new Error(`playEngagement: stuck at prep step '${step}' — nothing deployed and the step is not skippable`)
    performAdvancePrep(ctx, causeId)
  }
  const e = c.cursor.engagement!
  const v = viewBattle(c)
  const heroes = v.units.filter((u) => u.side === 'hero').map((u) => ({ typeId: u.typeId, name: u.name }))
  const enemies = v.units.filter((u) => u.side === 'enemy').map((u) => ({ typeId: u.typeId, name: u.name }))
  const result = validateResult(d.outcome(c, makeBlankResult(e.id, 'heroClear', heroes, enemies)), { heroes: heroes.length, enemies: enemies.length, id: e.id })
  const reckoning = resolveReckoning(c, e, result)
  setBattleOutcome(ctx, result, reckoning, causeId)
  applyBattleResult(ctx, e, result, reckoning)
  performExitBattle(ctx, causeId)
  if (c.cursor.step === 'rewards') performTakeReward(ctx, d.reward(c, listRewardOffers(c).map((r) => r.id)), causeId)
  if (c.cursor.step === 'levelUp') {
    for (const h of listLevelUps(c)) {
      const v = viewLevelUp(c, h)
      const choice: { specialtyId?: string; pick?: number } = {}
      const sp = v.needsSpecialty ? d.specialty(c, h, v.specialtyOffers.map((s) => s.id)) : undefined
      if (sp) choice.specialtyId = sp
      if (v.pickOptions) choice.pick = d.levelPick(c, h, v.pickOptions.length)
      performLevelUp(ctx, h, causeId, choice)
    }
    performLeaveLevelUp(ctx, causeId)
  }
}

/** Advance one Stage — or one step of the opening — taking what it offers first if the decisions say so. */
export function playStage(ctx: Ctx, d: Decisions, causeId: string): void {
  const c = ctx.campaign
  if (c.ended) throw new Error(`playStage: the Campaign ended in week ${c.ended.week} — ${c.ended.reason}`)
  if (c.cursor.step === 'draft') performDraft(ctx, d.draft(c, listDraftOffers(c).map((h) => h.id)), causeId)
  if (c.cursor.step === 'prep') playEngagement(ctx, d, causeId)
  if (c.cursor.step === 'open') {
    const offers = listStageOffers(c)
    const pick = offers.length ? d.target(c, offers) : null
    if (pick) { performChooseEngagement(ctx, pick, causeId); playEngagement(ctx, d, causeId) }
    if (canUseActivity(c, 'build')) {
      // keep buying while something is buildable — one node a pass, cheapest first
      for (let i = 0; i < 20; i++) {
        const buildable = listBuildings(c).flatMap((b) => b.row.nodes.filter((n) => whyNotBuild(c, b.territoryId, b.building.id, n.key) === null).map((n) => ({ territoryId: b.territoryId, buildingId: b.building.id, key: n.key, salvage: n.salvage })))
        const pick = buildable.length ? d.build(c, buildable) : null
        if (!pick) break
        performBuild(ctx, pick.territoryId, pick.buildingId, pick.key, causeId)
      }
    }
    // the Charter: spend every Renown as it comes — Articles first when a slot is open, then Provisions, in row order
    for (let i = 0; i < 10; i++) {
      const purchasable = UNLOCKS.filter((u) => canPurchase(c, u.id)).map((u) => u.id)
      const pick = purchasable.length ? d.purchase(c, purchasable) : null
      if (!pick) break
      performPurchase(ctx, pick, causeId)
    }
    if (canUseActivity(c, 'market')) {
      const shelf = listShopItems(c).filter((r) => canBuyItem(c, r.id)).map((r) => r.id)
      const pick = shelf.length ? d.buy(c, shelf) : null
      if (pick) performBuyItem(ctx, pick, causeId)
    }
    if (canUseActivity(c, 'quests')) {
      const pick = d.quest(c, listQuestOffers(c), listAvailable(c, c.cursor.stage))
      if (pick && canSendQuest(c, pick.questId, pick.heroIds)) performSendQuest(ctx, pick.questId, pick.heroIds, causeId)
    }
    if (canUseActivity(c, 'chapel')) {
      for (const [heroId, key] of d.labours(c, listAvailable(c, c.cursor.stage))) if (canAssignLabour(c, heroId, key)) performAssignLabour(ctx, heroId, key, causeId)
    }
  }
  if (c.ended) return
  if (!canAdvance(c)) throw new Error(`playStage: cannot advance from step '${c.cursor.step}'`)
  performAdvance(ctx, causeId)
}

/** Play the opening from a new Campaign until the Week machine takes over (or the run ends). */
export function playOpening(ctx: Ctx, decisions: Partial<Decisions> = {}, causeId = 'autoplay'): Ctx {
  const d: Decisions = { ...DEFAULTS, ...decisions }
  let guard = 0
  while (ctx.campaign.cursor.prologue !== null && !ctx.campaign.ended) {
    playStage(ctx, d, causeId)
    if (++guard > 60) throw new Error('playOpening: sixty steps and the opening has not finished')
  }
  return ctx
}

/** Play whole Weeks, from wherever the cursor is, until the Week number has advanced `weeks` times. */
export function playWeeks(ctx: Ctx, weeks: number, decisions: Partial<Decisions> = {}, causeId = 'autoplay'): Ctx {
  const d: Decisions = { ...DEFAULTS, ...decisions }
  const target = ctx.campaign.week + weeks
  let guard = 0
  while (ctx.campaign.week < target && !ctx.campaign.ended) {
    playStage(ctx, d, causeId)
    if (++guard > weeks * 12) throw new Error(`playWeeks: ${guard} Stages advanced and the Week did not reach ${target} — the machine is not moving`)
  }
  return ctx
}

export { makeCtx }
