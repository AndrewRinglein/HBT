// V2 post-battle participant unavailability. Durations are story data; all writes emit.
import type { CampaignState, Absence, HeroId } from './campaign.js'
import { type Ctx, setUnavailable, applyXp } from './mutate.js'
import { rollOf } from './rng.js'
import { CUP_IDS } from '../content/cups.js'
import { ABSENCES, ABSENCE_WEIGHTS, ABSENCE_WEIGHT_BASE, ABSENCE_FRENZY_XP, ABSENCE_CHANCE } from '../content/absences.js'

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

/** Participant-only independent rolls; each hero keeps their own deterministic draw. */
export function resolveAbsences(campaign: CampaignState, participants: readonly HeroId[], battleId: string): Absence[] {
  const out: Absence[] = []
  for (const id of [...new Set(participants)].sort()) {
    const h = campaign.roster[id]
    if (!h || h.lifeState === 'dead') continue
    const chance = Math.min(100, Math.floor(ABSENCE_CHANCE * absenceWeightOf(h.badges) / ABSENCE_WEIGHT_BASE))
    if (rollOf(campaign, CUP_IDS.unavailability, [campaign.week, battleId, 'who', id]) % 100 >= chance) continue
    const story = ABSENCES[rollOf(campaign, CUP_IDS.unavailability, [campaign.week, battleId, 'story', id]) % ABSENCES.length]!
    out.push({ heroId: id, story: story.story, returnWeek: campaign.week + story.weeks })
  }
  return out
}

/** Called once by the result writer, after deaths. A second battle never clears the first pull. */
export function performRollAbsences(ctx: Ctx, participants: readonly HeroId[], causeId: string): Absence[] {
  const absences = resolveAbsences(ctx.campaign, participants, causeId)
  if (!absences.length) return absences
  const merged = new Map(ctx.campaign.unavailable.map((a) => [a.heroId, a]))
  for (const a of absences) merged.set(a.heroId, a)
  setUnavailable(ctx, [...merged.values()].sort((a, b) => a.heroId.localeCompare(b.heroId)), causeId)
  for (const a of absences) {
    const row = ABSENCES.find((r) => r.story === a.story)!
    if (row.effect === 'xp5') applyXp(ctx, a.heroId, ABSENCE_FRENZY_XP, causeId)
  }
  return absences
}

/** Absences expire after the due Week's Field, ensuring even the last battle's pull blocks the next Field. */
export function performExpireAbsences(ctx: Ctx, causeId: string): void {
  const remaining = ctx.campaign.unavailable.filter((a) => a.returnWeek !== undefined && a.returnWeek > ctx.campaign.week)
  if (remaining.length !== ctx.campaign.unavailable.length) setUnavailable(ctx, remaining, causeId)
}

/** The story a kept-home hero was given this Week, or null. Pure. */
export function absenceOf(campaign: CampaignState, heroId: HeroId): string | null {
  return campaign.unavailable.find((a) => a.heroId === heroId)?.story ?? null
}
