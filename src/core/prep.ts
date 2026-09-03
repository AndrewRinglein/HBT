// Combat Prep — one screen running four steps back to back, and the order is
// the design: Reveal → War Council → Deploy → Equip. GAME-ARCHITECTURE.md §4.
//
// The steps are rows (src/content/prep.ts); this machine walks the list and
// names no step. The three kinds of Engagement are rows too
// (src/content/engagements.ts) — a quest's roster is fixed because its row
// says so, not because this file knows what a quest is.
//
// GLOSSARY.md prefixes throughout: canX asks, performX does (and calls canX
// first, refusing loudly); viewX builds the one read-model a screen may use;
// listX is sorted with a tiebreaker.

import type { CampaignState, HeroId, PrepStep } from './campaign.js'
import { type Ctx, engagementOf, setCouncilOffer, setTactic, applyDeploy, applyUndeploy, setCursor } from './mutate.js'
import { openEquipSession, closeEquipSession } from './equip-session.js'
import { pickOf } from './rng.js'
import { PREP_STEP_ROWS, COUNCIL_OFFER_SIZE } from '../content/prep.js'
import { deployLimitOf } from './charter.js'
import { TACTICS, tacticOf, type TacticRow } from '../content/tactics.js'
import { engagementKindOf } from '../content/engagements.js'
import { commitmentOf } from './assignments.js'

// ── reading ─────────────────────────────────────────────────────────────────

export function prepStepOf(campaign: CampaignState): PrepStep {
  if (campaign.cursor.step !== 'prep' || !campaign.cursor.prepStep) {
    throw new Error(`not in Combat Prep — the cursor is at step '${campaign.cursor.step}'`)
  }
  return campaign.cursor.prepStep
}

/** 4, plus a slot per Field Article (§2.3 axis 1); tactics may move it later. */
export { deployLimitOf } from './charter.js'

/** Sorted by id — never insertion order (Law 6). */
export function listCouncilOptions(campaign: CampaignState): TacticRow[] {
  const e = engagementOf(campaign)
  return e.councilOffer.map(tacticOf).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function canDeploy(campaign: CampaignState, heroId: HeroId): boolean {
  if (campaign.cursor.step !== 'prep' || campaign.cursor.prepStep !== 'deploy') return false
  const e = engagementOf(campaign)
  if (engagementKindOf(e.kind).rosterFixed) return false
  // The one availability question (§2.3): dead, captured, severely wounded,
  // already committed — all answered there, never re-derived here.
  if (!campaign.roster[heroId] || commitmentOf(campaign, heroId, 'field') !== 'free') return false
  return e.deployed.length < deployLimitOf(campaign)
}

export function canUndeploy(campaign: CampaignState, heroId: HeroId): boolean {
  if (campaign.cursor.step !== 'prep' || campaign.cursor.prepStep !== 'deploy') return false
  const e = engagementOf(campaign)
  if (engagementKindOf(e.kind).rosterFixed) return false
  return e.deployed.includes(heroId)
}

/** Who could still be sent: alive, not yet deployed. Sorted by id. */
export function listDeployable(campaign: CampaignState): HeroId[] {
  const e = engagementOf(campaign)
  return Object.values(campaign.roster)
    .filter((h) => !e.deployed.includes(h.id) && commitmentOf(campaign, h.id, 'field') === 'free')
    .map((h) => h.id)
    .sort()
}

/** May the cursor leave the current prep step? Reads the step's row. */
export function canAdvancePrep(campaign: CampaignState): boolean {
  const step = prepStepOf(campaign)
  const row = PREP_STEP_ROWS.find((r) => r.step === step)
  if (!row) throw new Error(`prep step '${step}' has no row in src/content/prep.ts`)
  if (row.skippable) return true
  // The one non-skippable step is the one that fields units: nobody sent, no battle.
  return engagementOf(campaign).deployed.length > 0
}

export type CombatPrepView = {
  step: PrepStep
  stepTitle: string
  engagementId: string
  kind: string
  territoryId: string | null
  mapId: string
  /** What the Reveal shows: every enemy unit typeId, in the Engagement's order. */
  enemies: string[]
  condition: string | null
  /** Empty until the council step has been entered. */
  councilOffer: TacticRow[]
  tactic: string | null
  deployed: HeroId[]
  deployable: HeroId[]
  deployLimit: number
  canAdvance: boolean
}

/** The one read-model the prep screen renders from. Pure. */
export function viewCombatPrep(campaign: CampaignState): CombatPrepView {
  const step = prepStepOf(campaign)
  const e = engagementOf(campaign)
  const row = PREP_STEP_ROWS.find((r) => r.step === step)!
  return {
    step, stepTitle: row.title,
    engagementId: e.id, kind: e.kind, territoryId: e.territoryId, mapId: e.mapId,
    enemies: [...e.enemies],
    condition: e.condition,
    councilOffer: listCouncilOptions(campaign),
    tactic: e.tactic,
    deployed: [...e.deployed],
    deployable: listDeployable(campaign),
    deployLimit: deployLimitOf(campaign),
    canAdvance: canAdvancePrep(campaign),
  }
}

// ── doing ───────────────────────────────────────────────────────────────────

/**
 * Enter a prep step. A step whose row draws from a cup rolls its offer on
 * entry, once, keyed by the Engagement — so a reload shows the same three.
 */
function beginPrepStep(ctx: Ctx, step: PrepStep, causeId: string): void {
  setCursor(ctx, { step: 'prep', prepStep: step }, causeId)
  const row = PREP_STEP_ROWS.find((r) => r.step === step)
  const e = engagementOf(ctx.campaign)
  if (row?.drawsFrom && e.councilOffer.length === 0) {
    const offer = pickOf(ctx.campaign, row.drawsFrom, [e.id], TACTICS, COUNCIL_OFFER_SIZE)
    setCouncilOffer(ctx, offer.map((t) => t.id), causeId)
  }
  // the step whose row equips opens the equip session — costs paid here refund until the step is left (G5)
  if (row?.equips && !ctx.campaign.cursor.equipSession) openEquipSession(ctx, 'prep', causeId)
}

/** Put a Campaign whose cursor holds an Engagement onto the first prep step. */
export function beginCombatPrep(ctx: Ctx, causeId: string): void {
  engagementOf(ctx.campaign)
  const first = PREP_STEP_ROWS[0]
  if (!first) throw new Error('src/content/prep.ts declares no steps')
  beginPrepStep(ctx, first.step, causeId)
}

export function performCouncil(ctx: Ctx, tacticId: string | null, causeId: string): void {
  if (prepStepOf(ctx.campaign) !== 'council') throw new Error(`performCouncil refused: the cursor is at prep step '${ctx.campaign.cursor.prepStep}'`)
  const e = engagementOf(ctx.campaign)
  if (tacticId !== null && !e.councilOffer.includes(tacticId)) {
    throw new Error(`performCouncil refused: '${tacticId}' was not offered — the offer is ${e.councilOffer.join(', ')}`)
  }
  setTactic(ctx, tacticId, causeId)
}

export function performDeploy(ctx: Ctx, heroId: HeroId, causeId: string): void {
  if (!canDeploy(ctx.campaign, heroId)) {
    const e = engagementOf(ctx.campaign)
    throw new Error(`performDeploy refused for '${heroId}': ${e.deployed.length}/${deployLimitOf(ctx.campaign)} deployed at prep step '${ctx.campaign.cursor.prepStep}'`)
  }
  applyDeploy(ctx, heroId, causeId)
}

export function performUndeploy(ctx: Ctx, heroId: HeroId, causeId: string): void {
  if (!canUndeploy(ctx.campaign, heroId)) throw new Error(`performUndeploy refused for '${heroId}'`)
  applyUndeploy(ctx, heroId, causeId)
}

/** Leave the current step for the next row — or, after the last, for the battle. */
export function performAdvancePrep(ctx: Ctx, causeId: string): void {
  const step = prepStepOf(ctx.campaign)
  if (!canAdvancePrep(ctx.campaign)) throw new Error(`performAdvancePrep refused at '${step}': nothing chosen and the step is not skippable`)
  const at = PREP_STEP_ROWS.findIndex((r) => r.step === step)
  const next = PREP_STEP_ROWS[at + 1]
  // leaving the equip step commits what it paid — "once you leave that screen, it's saved"
  if (PREP_STEP_ROWS[at]?.equips && ctx.campaign.cursor.equipSession) closeEquipSession(ctx, causeId)
  if (next) beginPrepStep(ctx, next.step, causeId)
  else setCursor(ctx, { step: 'battle', prepStep: null, battle: { resultSet: false } }, causeId)
}
