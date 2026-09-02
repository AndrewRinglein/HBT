// The mutator module — Law 3: every state change goes through a mutator, and
// every mutator emits an event. Nothing outside this file writes to a
// CampaignState. GLOSSARY.md: `applyX()` / `setX()` are the mutator facade,
// and nothing outside mutate.ts may define one.
//
// Mirrors the engine's shape: the plain-data Campaign is the save; everything
// unserializable — the event log — lives beside it in a Ctx.

import type { CampaignState, Cursor, Assignment } from './campaign.js'
import type { KingdomEventType } from './events.js'
import type { EngagementResult } from './seam.js'
import type { Reckoning } from './reckoning.js'

export type KingdomEvent = {
  seq: number
  week: number
  stage: string
  type: KingdomEventType
  /** Who or what caused this — every line names its cause (Law 12). */
  causeId: string
  [k: string]: unknown
}

export type Ctx = {
  campaign: CampaignState
  events: KingdomEvent[]
}

export function makeCtx(campaign: CampaignState): Ctx {
  return { campaign, events: [] }
}

export function emit(ctx: Ctx, type: KingdomEventType, causeId: string, fields: Record<string, unknown> = {}): KingdomEvent {
  const e: KingdomEvent = {
    seq: ctx.events.length,
    week: ctx.campaign.week,
    stage: ctx.campaign.cursor.stage,
    type, causeId,
    ...fields,
  }
  ctx.events.push(e)
  return e
}

/** The Engagement on the cursor, or a loud refusal (Law 9). */
export function engagementOf(campaign: CampaignState) {
  const e = campaign.cursor.engagement
  if (!e) throw new Error(`no Engagement on the cursor at week ${campaign.week}, step ${campaign.cursor.step}`)
  return e
}

/** The War Council's draw, written to the Engagement so a reload shows the same three. */
export function setCouncilOffer(ctx: Ctx, offer: readonly string[], causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.councilOffer = [...offer]
  emit(ctx, 'council.offered', causeId, { engagementId: e.id, offer: [...offer] })
}

/** The pick — one of the offer, or null for a skip. */
export function setTactic(ctx: Ctx, tacticId: string | null, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.tactic = tacticId
  emit(ctx, 'council.taken', causeId, { engagementId: e.id, tacticId })
}

/** An Assignment into a slot — the one write of campaign.assignments. */
export function applyCommit(ctx: Ctx, heroId: string, slot: 'field' | 'city', assignment: Assignment, causeId: string): void {
  const a = (ctx.campaign.assignments[heroId] ??= {})
  a[slot] = { ...assignment }
  emit(ctx, 'hero.committed', causeId, { heroId, slot, kind: assignment.kind, target: assignment.target, weeks: assignment.weeks })
}

export function applyRelease(ctx: Ctx, heroId: string, slot: 'field' | 'city', causeId: string): void {
  const a = ctx.campaign.assignments[heroId]
  if (!a?.[slot]) return
  const was = a[slot]!
  delete a[slot]
  if (!a.field && !a.city) delete ctx.campaign.assignments[heroId]
  emit(ctx, 'hero.released', causeId, { heroId, slot, kind: was.kind, target: was.target })
}

/** A hero into the field for this Engagement — the field slot, for the Week. */
export function applyDeploy(ctx: Ctx, heroId: string, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.deployed.push(heroId)
  applyCommit(ctx, heroId, 'field', { kind: 'engagement', target: e.id, weeks: 1 }, causeId)
}

export function applyUndeploy(ctx: Ctx, heroId: string, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.deployed = e.deployed.filter((h) => h !== heroId)
  applyRelease(ctx, heroId, 'field', causeId)
}


/**
 * What the outcome panel SET — the result and the Reckoning proposed from it —
 * written to the cursor as plain data so a reload lands on the tally. The
 * writer (applyBattleResult) reads it from here and nowhere else.
 */
export function setBattleOutcome(ctx: Ctx, result: EngagementResult, reckoning: Reckoning, causeId: string): void {
  if (ctx.campaign.cursor.step !== 'battle') throw new Error(`setBattleOutcome refused: the cursor is at step '${ctx.campaign.cursor.step}', not the battle`)
  ctx.campaign.cursor.battle = { resultSet: true, result, reckoning }
  emit(ctx, 'battle.decided', causeId, { engagementId: result.id, outcome: result.outcome })
}

// ── what the one writer says as it writes ───────────────────────────────────

function heroOrThrow(campaign: CampaignState, heroId: string) {
  const h = campaign.roster[heroId]
  if (!h) throw new Error(`no hero '${heroId}' on the roster`)
  return h
}

export function applyXp(ctx: Ctx, heroId: string, amount: number, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  h.xp += amount
  emit(ctx, 'xp.gained', causeId, { heroId, amount, xp: h.xp })
}

/** A wound is a LEVEL, replaced not accumulated (GAME-ARCHITECTURE.md §4.2). */
export function setWound(ctx: Ctx, heroId: string, level: number, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  const from = h.wound
  h.wound = level
  emit(ctx, 'hero.wounded', causeId, { heroId, from, to: level })
}

export function setHeroDead(ctx: Ctx, heroId: string, causeId: string): void {
  const h = heroOrThrow(ctx.campaign, heroId)
  if (h.lifeState === 'dead') return
  h.lifeState = 'dead'
  emit(ctx, 'hero.died', causeId, { heroId })
}

export function applyGrant(ctx: Ctx, currencyId: string, amount: number, causeId: string): void {
  if (!(currencyId in ctx.campaign.purse)) throw new Error(`no currency '${currencyId}' in the purse — currencies are named at makeCampaign: ${Object.keys(ctx.campaign.purse).join(', ')}`)
  ctx.campaign.purse[currencyId]! += amount
  emit(ctx, 'resource.gained', causeId, { currencyId, amount, balance: ctx.campaign.purse[currencyId] })
}

export function applySpend(ctx: Ctx, currencyId: string, amount: number, causeId: string): void {
  if (!(currencyId in ctx.campaign.purse)) throw new Error(`no currency '${currencyId}' in the purse`)
  if (amount > ctx.campaign.purse[currencyId]!) throw new Error(`applySpend refused: ${amount} ${currencyId} from a purse holding ${ctx.campaign.purse[currencyId]}`)
  ctx.campaign.purse[currencyId]! -= amount
  emit(ctx, 'resource.spent', causeId, { currencyId, amount, balance: ctx.campaign.purse[currencyId] })
}

export function applyRenown(ctx: Ctx, amount: number, causeId: string): void {
  ctx.campaign.renown += amount
  emit(ctx, 'renown.gained', causeId, { amount, renown: ctx.campaign.renown })
}

/** The Engagement is over, won or lost; a loss counts (SKELETON-NOTES.md: −5 per loss). */
export function setEngagementResolved(ctx: Ctx, engagementId: string, won: boolean, causeId: string): void {
  if (!won) ctx.campaign.losses += 1
  const kind = ctx.campaign.cursor.engagement?.id === engagementId ? ctx.campaign.cursor.engagement.kind : null
  emit(ctx, 'engagement.resolved', causeId, { engagementId, kind, won, losses: ctx.campaign.losses })
}

export function applyClaim(ctx: Ctx, territoryId: string, causeId: string): void {
  const t = ctx.campaign.territories[territoryId]
  if (!t) throw new Error(`no Territory '${territoryId}' on the map`)
  t.owned = true
  const first = !t.claimedOnce
  t.claimedOnce = true
  emit(ctx, 'territory.claimed', causeId, { territoryId, first, buildings: t.buildings.map((b) => b.id) })
}

export function applyLose(ctx: Ctx, territoryId: string, causeId: string): void {
  const t = ctx.campaign.territories[territoryId]
  if (!t) throw new Error(`no Territory '${territoryId}' on the map`)
  if (t.kingdom) throw new Error(`the Kingdom Territory '${territoryId}' cannot be lost (SKELETON-SETTLED.md:81)`)
  t.owned = false
  emit(ctx, 'territory.lost', causeId, { territoryId })
}

/**
 * Move the cursor. One mutator for every cursor change, so a reload always
 * lands where an event says the save was (§2.2: the autosave writes on every
 * endStage — the emit is what a save can be keyed to).
 */
export function setCursor(ctx: Ctx, next: Partial<Cursor>, causeId: string): void {
  const before = { ...ctx.campaign.cursor }
  Object.assign(ctx.campaign.cursor, next)
  if (next.week !== undefined) ctx.campaign.week = next.week
  emit(ctx, 'cursor.moved', causeId, { from: before, to: { ...ctx.campaign.cursor } })
}
