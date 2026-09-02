// The mutator module — Law 3: every state change goes through a mutator, and
// every mutator emits an event. Nothing outside this file writes to a
// CampaignState. GLOSSARY.md: `applyX()` / `setX()` are the mutator facade,
// and nothing outside mutate.ts may define one.
//
// Mirrors the engine's shape: the plain-data Campaign is the save; everything
// unserializable — the event log — lives beside it in a Ctx.

import type { CampaignState, Cursor } from './campaign.js'
import type { KingdomEventType } from './events.js'

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

/** A hero into the field for this Engagement. */
export function applyDeploy(ctx: Ctx, heroId: string, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.deployed.push(heroId)
  emit(ctx, 'hero.committed', causeId, { heroId, engagementId: e.id, slot: 'field' })
}

export function applyUndeploy(ctx: Ctx, heroId: string, causeId: string): void {
  const e = engagementOf(ctx.campaign)
  e.deployed = e.deployed.filter((h) => h !== heroId)
  emit(ctx, 'hero.released', causeId, { heroId, engagementId: e.id, slot: 'field' })
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
