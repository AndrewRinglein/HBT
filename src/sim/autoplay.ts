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
import { viewBattle } from '../view/battle.js'
import type { EngagementResult } from '../core/seam.js'

export type Decisions = {
  /** Which offered Territory to attack, or null to decline. Default: the first. */
  target: (campaign: CampaignState, offers: TerritoryId[]) => TerritoryId | null
  /** Which offered tactic to take, or null to skip. Default: the first. */
  tactic: (campaign: CampaignState, offers: string[]) => string | null
  /** Who to deploy, in order. Default: the first three deployable. */
  deploy: (campaign: CampaignState, deployable: string[]) => string[]
  /** What the battle decided. Default: won, every enemy dead, five turns. */
  outcome: (campaign: CampaignState, blank: EngagementResult) => EngagementResult
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
}

/** Play the Engagement on the cursor through prep, the panel, the writer and out. */
export function playEngagement(ctx: Ctx, d: Decisions, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.step !== 'prep') throw new Error(`playEngagement: the cursor is at '${c.cursor.step}', not prep`)
  while (c.cursor.step === 'prep') {
    const step = prepStepOf(c)
    if (step === 'council') performCouncil(ctx, d.tactic(c, listCouncilOptions(c).map((t) => t.id)), causeId)
    if (step === 'deploy') for (const h of d.deploy(c, listDeployable(c))) performDeploy(ctx, h, causeId)
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
}

/** Advance one Stage, taking what it offers first if the decisions say so. */
export function playStage(ctx: Ctx, d: Decisions, causeId: string): void {
  const c = ctx.campaign
  if (c.cursor.step === 'prep') playEngagement(ctx, d, causeId)
  if (c.cursor.step === 'open') {
    const offers = listStageOffers(c)
    const pick = offers.length ? d.target(c, offers) : null
    if (pick) { performChooseEngagement(ctx, pick, causeId); playEngagement(ctx, d, causeId) }
  }
  if (!canAdvance(c)) throw new Error(`playStage: cannot advance from step '${c.cursor.step}'`)
  performAdvance(ctx, causeId)
}

/** Play whole Weeks, from wherever the cursor is, until the Week number has advanced `weeks` times. */
export function playWeeks(ctx: Ctx, weeks: number, decisions: Partial<Decisions> = {}, causeId = 'autoplay'): Ctx {
  const d: Decisions = { ...DEFAULTS, ...decisions }
  const target = ctx.campaign.week + weeks
  let guard = 0
  while (ctx.campaign.week < target) {
    playStage(ctx, d, causeId)
    if (++guard > weeks * 12) throw new Error(`playWeeks: ${guard} Stages advanced and the Week did not reach ${target} — the machine is not moving`)
  }
  return ctx
}

export { makeCtx }
