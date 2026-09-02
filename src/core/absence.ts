// The unavailability roll — KINGDOM-DESIGN.md §3, "a third availability
// channel, alongside Assignments and wounds, and it is the one that makes a big
// roster cost something to hold." Rolled once on entry to the Stage whose row
// says `absencesBefore`, keyed by the Week (Law 4) — a reload lands on the same
// absences — and cleared at the Week boundary.
//
// This file has no opinion about availability: it decides WHO IS KEPT HOME and
// writes it; commitmentOf (assignments.ts) is the only place that reads it.

import type { CampaignState, Absence, HeroId } from './campaign.js'
import { type Ctx, setUnavailable, applyXp } from './mutate.js'
import { rollOf } from './rng.js'
import { CUP_IDS } from '../content/cups.js'
import { ABSENCES, ABSENCE_WEIGHTS, ABSENCE_WEIGHT_BASE, ABSENCE_FRENZY_XP, absencesFor } from '../content/absences.js'

/** A hero's weight on the roll: the base, scaled by each badge the table names; responsible is zero and stays zero. */
export function absenceWeightOf(badges: readonly string[]): number {
  let w = ABSENCE_WEIGHT_BASE
  for (const b of [...badges].sort()) {
    const k = ABSENCE_WEIGHTS[b]
    if (k === undefined) continue
    w = Math.floor((w * k) / ABSENCE_WEIGHT_BASE)
  }
  return w
}

/**
 * Who does not turn up this Week. Pure: the same Campaign always answers the
 * same. Weighted draws without replacement over the living roster, sorted by
 * id (Law 6), each keyed by the Week and the draw's ordinal.
 */
export function resolveAbsences(campaign: CampaignState): Absence[] {
  const alive = Object.values(campaign.roster).filter((h) => h.lifeState !== 'dead').map((h) => h.id).sort()
  const n = absencesFor(alive.length)
  const pool = alive.map((id) => ({ id, weight: absenceWeightOf(campaign.roster[id]!.badges) })).filter((p) => p.weight > 0)
  const out: Absence[] = []
  for (let i = 0; i < n && pool.length > 0; i++) {
    const total = pool.reduce((s, p) => s + p.weight, 0)
    let r = rollOf(campaign, CUP_IDS.unavailability, [campaign.week, 'who', i]) % total
    let at = 0
    while (r >= pool[at]!.weight) { r -= pool[at]!.weight; at++ }
    const [picked] = pool.splice(at, 1)
    const story = ABSENCES[rollOf(campaign, CUP_IDS.unavailability, [campaign.week, 'story', picked!.id]) % ABSENCES.length]!
    out.push({ heroId: picked!.id, story: story.story })
  }
  return out
}

/** Roll the Week's absences and write them, enacting the one story with a number. */
export function performRollAbsences(ctx: Ctx, causeId: string): Absence[] {
  const absences = resolveAbsences(ctx.campaign)
  setUnavailable(ctx, absences, causeId)
  for (const a of absences) {
    const row = ABSENCES.find((r) => r.story === a.story)!
    if (row.effect === 'xp5') applyXp(ctx, a.heroId, ABSENCE_FRENZY_XP, causeId)
  }
  return absences
}

/** The story a kept-home hero was given this Week, or null. Pure. */
export function absenceOf(campaign: CampaignState, heroId: HeroId): string | null {
  return campaign.unavailable.find((a) => a.heroId === heroId)?.story ?? null
}
